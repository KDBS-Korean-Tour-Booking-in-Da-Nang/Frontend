import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS, getAvatarUrl } from '../../config/api';
import PostModal from './components/PostModal/PostModal';
import EditPostModal from './components/EditPostModal/EditPostModal';
import SearchSidebar from './components/SearchSidebar/SearchSidebar';
import SavedPostsModal from './components/SavedPostsModal/SavedPostsModal';
import styles from './forum.module.css';

// Lazy load PostCard for better initial load performance
const PostCard = lazy(() => import('./components/PostCard/PostCard'));

// Constants
const STORAGE_KEYS = {
  SELECTED_HASHTAGS: 'forum-selected-hashtags',
  SEARCH_KEYWORD: 'forum-search-keyword',
  SEARCH_MODE: 'forum-search-mode',
};

const FETCH_TIMEOUT = 10000; // 10 seconds
const PREFETCH_DELAY = 1000; // 1 second
const PAGE_SIZE = 10;

const upsertPostInCollection = (collection = [], post, maxItems) => {
  if (!post) return Array.isArray(collection) ? [...collection] : [];
  const list = Array.isArray(collection) ? [...collection] : [];
  const index = list.findIndex(item => item.forumPostId === post.forumPostId);
  if (index !== -1) {
    list[index] = { ...list[index], ...post };
    return maxItems ? list.slice(0, maxItems) : list;
  }
  const updated = [post, ...list];
  return maxItems ? updated.slice(0, maxItems) : updated;
};

const Forum = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [isMyPostsMode, setIsMyPostsMode] = useState(false);
  const [showSavedPostsModal, setShowSavedPostsModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [singlePost, setSinglePost] = useState(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef();
  const lastPostElementRef = useRef();
  const leftSlotRef = useRef(null);
  const headerRef = useRef(null);
  const [fixedSBStyle, setFixedSBStyle] = useState({});
  const [isNarrow, setIsNarrow] = useState(false);
  const isSwitchingModeRef = useRef(false);

  const measure = useCallback(() => {
    if (isNarrow) return;

    const slot = leftSlotRef.current;
    if (!slot) return;

    const slotRect = slot.getBoundingClientRect();
    
    // Find navbar height
    let navbarHeight = 90; // Default height
    const allNavs = document.querySelectorAll('nav');
    for (const nav of allNavs) {
      const styles = window.getComputedStyle(nav);
      const rect = nav.getBoundingClientRect();
      if (styles.position === 'fixed' && Math.abs(rect.top) < 5) {
        navbarHeight = rect.height;
        break;
      }
    }
    
    const top = navbarHeight;
    const SAFE_WIDTH = 280;
    const left = Math.round(slotRect.left);
    const width = Math.round(slotRect.width || SAFE_WIDTH);
    const height = window.innerHeight - top;

    setFixedSBStyle({ position: 'fixed', top, left, width, height });
  }, [isNarrow]);

  // Utility: Find post in current list as fallback
  const findPostInList = useCallback((postId) => {
    return posts.find(p => p.forumPostId === postId);
  }, [posts]);

  const showSinglePost = useCallback(async (postId) => {
    setSelectedPostId(postId);
    try {
      const response = await fetch(API_ENDPOINTS.POST_BY_ID(postId));
      if (response.ok) {
        const data = await response.json();
        setSinglePost(data);
        return;
      }
    } catch (error) {
      // Silently handle error
    }
    
    // Fallback: find post in current posts list
    const post = findPostInList(postId);
    if (post) {
      setSinglePost(post);
    }
  }, [findPostInList]);

  const backToAllPosts = useCallback(() => {
    setSelectedPostId(null);
    setSinglePost(null);
  }, []);

  // Load saved filters on component mount
  useEffect(() => {
    const savedHashtags = localStorage.getItem(STORAGE_KEYS.SELECTED_HASHTAGS);
    const savedSearchKeyword = localStorage.getItem(STORAGE_KEYS.SEARCH_KEYWORD);
    const savedSearchMode = localStorage.getItem(STORAGE_KEYS.SEARCH_MODE) === 'true';
    
    if (savedHashtags) {
      try {
        const parsedHashtags = JSON.parse(savedHashtags);
        setSelectedHashtags(parsedHashtags);
      } catch {
        // Invalid data, ignore
      }
    }
    
    if (savedSearchKeyword) {
      setSearchKeyword(savedSearchKeyword);
    }
    
    setIsSearchMode(savedSearchMode);
  }, []);

  // Detect narrow screen (≤1024px)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Measure and update fixed sidebar position (only on wide screens)
  useEffect(() => {
    if (isNarrow) return;
    const onResize = () => measure();
    const onScroll = () => measure();
    setTimeout(measure, 0);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [measure, isNarrow]);

  // Re-measure when user/login or header changes (only on wide screens)
  useEffect(() => {
    if (isNarrow) return;
    setTimeout(measure, 0);
  }, [user, measure, isNarrow]);

  // Cache for posts to avoid unnecessary refetches
  const postsCache = useRef(new Map());
  
  // Utility: Clear cache and localStorage
  const clearFiltersStorage = useCallback(() => {
    postsCache.current.clear();
    localStorage.removeItem(STORAGE_KEYS.SELECTED_HASHTAGS);
    localStorage.removeItem(STORAGE_KEYS.SEARCH_KEYWORD);
    localStorage.removeItem(STORAGE_KEYS.SEARCH_MODE);
  }, []);

  // Utility: Build API URL
  const buildPostsUrl = useCallback((page) => {
    if (isMyPostsMode && user) {
      return `${API_ENDPOINTS.MY_POSTS}?page=${page}&size=${PAGE_SIZE}`;
    }
    
    let url = `${API_ENDPOINTS.POST_SEARCH}?page=${page}&size=${PAGE_SIZE}&sort=createdAt,desc`;
    
    if (searchKeyword) {
      url += `&keyword=${encodeURIComponent(searchKeyword)}`;
    }
    
    if (selectedHashtags.length > 0) {
      selectedHashtags.forEach(tag => {
        url += `&hashtags=${encodeURIComponent(tag)}`;
      });
    }
    
    return url;
  }, [isMyPostsMode, user, searchKeyword, selectedHashtags]);

  // Utility: Get auth headers
  const getAuthHeaders = useCallback(() => {
    const headers = {};
    if (isMyPostsMode && user) {
      headers['User-Email'] = user.email;
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }, [isMyPostsMode, user]);

  // Utility: Prefetch next page
  const prefetchNextPage = useCallback((url, headers, currentPageNum) => {
    setTimeout(() => {
      const nextPageUrl = url.replace(`page=${currentPageNum}`, `page=${currentPageNum + 1}`);
      fetch(nextPageUrl, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            const nextCacheKey = `${nextPageUrl}_${currentPageNum + 1}`;
            postsCache.current.set(nextCacheKey, data);
          }
        })
        .catch(() => {}); // Silently fail prefetch
    }, PREFETCH_DELAY);
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const url = buildPostsUrl(currentPage);
      const cacheKey = `${url}_${currentPage}`;
      
      // Check cache first for initial page load
      if (currentPage === 0 && postsCache.current.has(cacheKey)) {
        const cachedData = postsCache.current.get(cacheKey);
        setPosts(cachedData.content || []);
        setHasMorePosts(!cachedData.last);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      // Set loading state
      if (isSwitchingModeRef.current) {
        isSwitchingModeRef.current = false;
      } else if (currentPage === 0 && posts.length === 0) {
        setIsLoading(true);
      } else if (currentPage > 0) {
        setIsLoadingMore(true);
      }

      const headers = getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      const response = await fetch(url, { 
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle 401 if token expired (only for authenticated requests)
      if (!response.ok && response.status === 401 && headers['Authorization']) {
        const { checkAndHandle401 } = await import('../../utils/apiErrorHandler');
        await checkAndHandle401(response);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        
        // Cache the response for initial page loads
        if (currentPage === 0) {
          postsCache.current.set(cacheKey, data);
        }
        
        // Update posts - deduplicate to avoid duplicate keys
        const newPosts = (data.content || []).filter(post => post?.forumPostId);
        if (currentPage === 0) {
          setPosts(newPosts);
        } else {
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => p.forumPostId));
            const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.forumPostId));
            return [...prev, ...uniqueNewPosts];
          });
        }
        
        setHasMorePosts(!data.last);
        
        // Prefetch next page if conditions are met
        if (!data.last && currentPage === 0 && !searchKeyword && selectedHashtags.length === 0 && !isMyPostsMode) {
          prefetchNextPage(url, headers, currentPage);
        }
      } else {
        throw new Error('Failed to fetch posts');
      }
    } catch (error) {
      if (error.name !== 'AbortError' && currentPage === 0) {
        // Only show error on initial load, not on pagination
        setPosts([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [currentPage, buildPostsUrl, getAuthHeaders, prefetchNextPage, posts.length, searchKeyword, selectedHashtags.length, isMyPostsMode]);

  // Fetch posts when dependencies change
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Cleanup Intersection Observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleCreatePost = useCallback((post) => {
    if (!post) return;

    setPosts(prev => upsertPostInCollection(prev, post));
    setSinglePost(current => current?.forumPostId === post.forumPostId ? { ...current, ...post } : current);
    setEditingPost(null);

    const cacheKey = `${buildPostsUrl(0)}_0`;
    const cachedPage = postsCache.current.get(cacheKey);
    if (cachedPage) {
      const updatedContent = upsertPostInCollection(cachedPage.content || [], post, PAGE_SIZE);
      postsCache.current.set(cacheKey, {
        ...cachedPage,
        content: updatedContent,
      });
    } else {
      postsCache.current.set(cacheKey, {
        content: [post],
        last: false,
        number: 0,
      });
    }

    window.dispatchEvent(new Event('refresh-popular-hashtags'));
  }, [buildPostsUrl]);

  const handlePostDeleted = useCallback((postId) => {
    // Xóa post khỏi danh sách hiện tại
    setPosts(prev => prev.filter(post => post.forumPostId !== postId));

    // Nếu đang ở chế độ xem single post và đó là post vừa xóa → quay lại list
    setSinglePost(current => (current && current.forumPostId === postId ? null : current));
    setSelectedPostId(currentId => (currentId === postId ? null : currentId));

    // Cập nhật cache trang đầu tiên để tránh tải lại post đã xóa
    const cacheKey = `${buildPostsUrl(0)}_0`;
    const cachedPage = postsCache.current.get(cacheKey);
    if (cachedPage) {
      const updatedContent = (cachedPage.content || []).filter(
        (post) => post?.forumPostId !== postId
      );
      postsCache.current.set(cacheKey, {
        ...cachedPage,
        content: updatedContent,
      });
    }
  }, [buildPostsUrl]);

  // Utility: Reset to default state
  const resetToDefaultState = useCallback(() => {
    setSelectedPostId(null);
    setSinglePost(null);
    isSwitchingModeRef.current = true;
    setSearchKeyword('');
    setSelectedHashtags([]);
    setCurrentPage(0);
    setIsSearchMode(false);
    setIsMyPostsMode(false);
    clearFiltersStorage();
  }, [clearFiltersStorage]);

  const handleSearch = useCallback((keyword) => {
    setSelectedHashtags([]);
    setSearchKeyword(keyword);
    setCurrentPage(0);
    setIsSearchMode(true);
    setIsMyPostsMode(false);
    clearFiltersStorage();
    localStorage.setItem(STORAGE_KEYS.SELECTED_HASHTAGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SEARCH_KEYWORD, keyword);
    localStorage.setItem(STORAGE_KEYS.SEARCH_MODE, 'true');
  }, [clearFiltersStorage]);

  const handleHashtagFilter = useCallback((hashtags) => {
    setSearchKeyword('');
    const hashtagArray = Array.isArray(hashtags) ? hashtags : [hashtags];
    setSelectedHashtags(hashtagArray);
    setCurrentPage(0);
    setIsSearchMode(false);
    setIsMyPostsMode(false);
    clearFiltersStorage();
    localStorage.setItem(STORAGE_KEYS.SELECTED_HASHTAGS, JSON.stringify(hashtagArray));
    localStorage.setItem(STORAGE_KEYS.SEARCH_KEYWORD, '');
    localStorage.setItem(STORAGE_KEYS.SEARCH_MODE, 'false');
  }, [clearFiltersStorage]);

  const clearAllFilters = useCallback(() => {
    resetToDefaultState();
  }, [resetToDefaultState]);

  const handleMyPostsClick = useCallback(() => {
    resetToDefaultState();
    setIsMyPostsMode(true);
    setShowSavedPostsModal(false);
  }, [resetToDefaultState]);

  const handleSavedPostsClick = useCallback(() => {
    resetToDefaultState();
    setShowSavedPostsModal(true);
  }, [resetToDefaultState]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMorePosts) {
      setIsLoadingMore(true);
      setCurrentPage(prev => prev + 1);
    }
  }, [isLoadingMore, hasMorePosts]);

  // Intersection Observer for infinite scroll
  const lastPostElementRefCallback = useCallback((node) => {
    if (isLoadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMorePosts && !isLoadingMore) {
        handleLoadMore();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [isLoadingMore, hasMorePosts, handleLoadMore]);

  const openEditModal = useCallback((post) => {
    setEditingPost(post);
    setShowEditModal(true);
  }, []);

  const closePostModal = useCallback(() => {
    setShowPostModal(false);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingPost(null);
  }, []);

  const handleCommentAdded = useCallback((comment) => {
    // Update comment count in the post
    setPosts(prev => 
      prev.map(post => {
        if (post.forumPostId === comment.postId) {
          return {
            ...post,
            reactions: {
              ...post.reactions,
              commentCount: (post.reactions?.commentCount || 0) + 1
            }
            };
          }
          return post;
        })
      );
  }, []);

  // Memoize posts list rendering to avoid unnecessary re-renders
  // Deduplicate posts and ensure unique keys
  const postsList = useMemo(() => {
    // Deduplicate posts by forumPostId
    const seenIds = new Set();
    const uniquePosts = posts.filter(post => {
      const id = post?.forumPostId;
      if (!id || seenIds.has(id)) {
        return false;
      }
      seenIds.add(id);
      return true;
    });

    return uniquePosts.map((post, index) => (
      <PostCard 
        key={`post-${post.forumPostId}-${index}`}
        post={post}
        onPostUpdated={handleCreatePost}
        onPostDeleted={handlePostDeleted}
        onEdit={openEditModal}
        onHashtagClick={handleHashtagFilter}
        isFirstPost={index === 0}
      />
    ));
  }, [posts, handleCreatePost, handlePostDeleted, openEditModal, handleHashtagFilter]);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageBackground} aria-hidden="true"></div>
      <div className={styles['forum-container']}>
        <div className={styles['forum-content']}>
        {/* Header Section */}
        {user && (
          <div id="forum-header" ref={headerRef} className={styles['forum-header']}>
            <div className={styles['forum-header__inner']}>
              <div className={styles['create-post-section']}>
                <div className={styles['create-post-input']} onClick={() => setShowPostModal(true)}>
                  <img 
                    src={getAvatarUrl(user?.avatar)} 
                    alt={user?.username}
                    className={styles['user-avatar-small']}
                  />
                  <span className={styles['create-post-text']}>{t('forum.createPost.placeholder')}</span>
                </div>
                <div className={styles['header-buttons']}>
                  <button 
                    className={styles['saved-posts-btn']}
                    onClick={handleSavedPostsClick}
                  >
                    <svg
                      className={styles['saved-posts-btn-icon']}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                    {t('forum.sidebar.savedPosts')}
                  </button>
                  <button 
                    className={styles['my-posts-btn']}
                    onClick={handleMyPostsClick}
                  >
                    <svg
                      className={styles['my-posts-btn-icon']}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    {t('forum.sidebar.myPosts')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      {/* Left placeholder for wide screens */}
        {!isNarrow && (
          <div
            className={`${styles['forum-sidebar']} ${styles['left']}`}
            ref={leftSlotRef}
            aria-hidden
            style={{ minHeight: 200 }}
          />
        )}

        {/* Sidebar for narrow screens */}
        {isNarrow && (
          <div className={`${styles['forum-sidebar']} ${styles['left']}`}>
            <SearchSidebar
              mode="static"
              onSearch={handleSearch}
              onHashtagFilter={handleHashtagFilter}
              selectedHashtags={selectedHashtags}
            />
          </div>
        )}

        {/* Main Content - Posts Feed */}
        <div className={styles['forum-main']}>
          {/* Hashtag Filter Header - Only show for hashtag filters */}
          {!isSearchMode && !isMyPostsMode && selectedHashtags.length > 0 && (
            <div className={styles['search-results-header']}>
              <div className={styles['search-info']}>
                <span className={styles['search-text']}>
                  {t('forum.hashtag.headerTitle')}
                </span>
                <span className={styles['search-count']}>
                  ({posts.length} {posts.length === 1 ? t('forum.hashtag.postCount') : t('forum.hashtag.postCount')})
                </span>
                <div className={styles['filter-info']}>
                  {selectedHashtags.map((tag, index) => (
                    <span key={`hashtag-${tag}-${index}`} className={`${styles['filter-tag']} ${styles['hashtag-tag']}`}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <button 
                className={styles['back-to-forum-btn']}
                onClick={clearAllFilters}
                title={t('forum.hashtag.backToForum')}
              >
                ← {t('forum.hashtag.backToForum')}
              </button>
            </div>
          )}

          {/* Search Results Header - Only show for search mode */}
          {isSearchMode && searchKeyword && (
            <div className={styles['search-results-header']}>
              <div className={styles['search-info']}>
                <span className={styles['search-icon']}>🔍</span>
                <span className={styles['search-text']}>
                  {t('forum.search.headerTitle')}: <strong>"{searchKeyword}"</strong>
                </span>
                <span className={styles['search-count']}>
                  ({posts.length} {posts.length === 1 ? t('forum.search.postCount') : t('forum.search.postCount')})
                </span>
              </div>
              <button 
                className={styles['back-to-forum-btn']}
                onClick={clearAllFilters}
                title={t('forum.search.backToForum')}
              >
                ← {t('forum.search.backToForum')}
              </button>
            </div>
          )}

          {/* My Posts Header - Only show for My Posts mode */}
          {isMyPostsMode && (
            <div className={styles['search-results-header']}>
              <div className={styles['search-info']}>
                <span className={styles['search-text']}>
                  {t('forum.myPosts.headerTitle')}
                </span>
                <span className={styles['search-count']}>
                  ({posts.length} {posts.length === 1 ? t('forum.myPosts.postCount') : t('forum.myPosts.postCount')})
                </span>
              </div>
              <button 
                className={styles['back-to-forum-btn']}
                onClick={clearAllFilters}
                title={t('forum.myPosts.backToForum')}
              >
                ← {t('forum.myPosts.backToForum')}
              </button>
            </div>
          )}

          
          {isLoading && currentPage === 0 ? (
            <div className={styles['loading-container']}>
              <div className={styles['loading-spinner']}></div>
              <p>{t('forum.post.loading')}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className={styles['no-posts']}>
              {isSearchMode ? (
                <>
                  <h3>🔍 {t('forum.search.noResults')}</h3>
                  <p>{t('forum.search.noResultsDesc', { keyword: searchKeyword })}</p>
                </>
              ) : isMyPostsMode ? (
                <>
                  <h3>📝 {t('forum.myPosts.empty')}</h3>
                  <p>{t('forum.myPosts.emptyDesc')}</p>
                  <button 
                    onClick={() => setShowPostModal(true)}
                    className={styles['create-first-post-btn']}
                  >
                    {t('forum.post.createFirst')}
                  </button>
                </>
              ) : (
                <>
                  <h3>{t('forum.post.noPosts')}</h3>
                  <p>{t('forum.post.noPostsDesc')}</p>
                  {user && (
                    <button 
                      onClick={() => setShowPostModal(true)}
                      className={styles['create-first-post-btn']}
                    >
                      {t('forum.post.createFirst')}
                    </button>
                  )}
                </>
              )}
            </div>
        ) : (
          <>
            {selectedPostId && singlePost ? (
              <div className={styles['single-post-view']}>
                <div className={styles['back-button-container']}>
                  <button className={styles['back-button']} onClick={backToAllPosts}>
                    {t('forum.post.backToList')}
                  </button>
                </div>
                <div className={styles['posts-feed']}>
                  <Suspense fallback={
                    <div className={styles['loading-container']}>
                      <div className={styles['loading-spinner']}></div>
                      <p>{t('forum.post.loading')}</p>
                    </div>
                  }>
                    <PostCard 
                      key={`single-post-${singlePost?.forumPostId || 'unknown'}`}
                      post={singlePost}
                      onPostUpdated={handleCreatePost}
                      onPostDeleted={handlePostDeleted}
                      onEdit={openEditModal}
                      onHashtagClick={handleHashtagFilter}
                    />
                  </Suspense>
                </div>
              </div>
            ) : (
              <div className={styles['posts-feed']}>
                <Suspense fallback={
                  <div className={styles['loading-container']}>
                    <div className={styles['loading-spinner']}></div>
                    <p>{t('forum.post.loading')}</p>
                  </div>
                }>
                  {postsList}
                </Suspense>
              </div>
            )}
            
            {/* Infinite scroll trigger element */}
            {!selectedPostId && hasMorePosts && (
              <div ref={lastPostElementRefCallback} className={styles['infinite-scroll-trigger']}>
                {isLoadingMore && (
                  <div className={styles['loading-more-container']}>
                    <div className={styles['loading-spinner']}></div>
                    <p>{t('forum.post.loadingMore')}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Show message when no more posts */}
            {!selectedPostId && !hasMorePosts && posts.length > 0 && (
              <div className={styles['no-more-posts']}>
                <p>{t('forum.post.noMorePosts')}</p>
              </div>
            )}
          </>
        )}
      </div>
      </div>

      {/* Post Modal - Only show if user is logged in */}
      {user && (
        <PostModal 
          isOpen={showPostModal}
          onClose={closePostModal}
          onPostCreated={handleCreatePost}
        />
      )}

      {/* Edit Post Modal - Only show if user is logged in */}
      {user && (
        <EditPostModal 
          isOpen={showEditModal}
          onClose={closeEditModal}
          onPostUpdated={handleCreatePost}
          post={editingPost}
        />
      )}

      {/* Saved Posts Modal - Only show if user is logged in */}
      {user && (
        <SavedPostsModal 
          isOpen={showSavedPostsModal}
          onClose={() => setShowSavedPostsModal(false)}
          onPostClick={showSinglePost}
        />
      )}

      {/* Fixed sidebar for wide screens */}
      {!isNarrow && (
        <SearchSidebar
          mode="fixed"
          fixedStyle={fixedSBStyle}
          onSearch={handleSearch}
          onHashtagFilter={handleHashtagFilter}
          selectedHashtags={selectedHashtags}
        />
      )}
      </div>
    </div>
  );
};

export default Forum;
