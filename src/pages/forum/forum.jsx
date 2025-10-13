import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { BaseURL, API_ENDPOINTS, getAvatarUrl } from '../../config/api';
import PostModal from './components/PostModal/PostModal';
import PostCard from './components/PostCard/PostCard';
import SearchSidebar from './components/SearchSidebar/SearchSidebar';
import SavedPostsModal from './components/SavedPostsModal/SavedPostsModal';
import styles from './forum.module.css';

const Forum = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [showSavedPostsModal, setShowSavedPostsModal] = useState(false);
  const [isMyPostsMode, setIsMyPostsMode] = useState(false);
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

  const showSinglePost = async (postId) => {
    setSelectedPostId(postId);
    try {
      const response = await fetch(API_ENDPOINTS.POST_BY_ID(postId));
      if (response.ok) {
        const data = await response.json();
        setSinglePost(data);
      } else {
        console.error('Failed to fetch single post');
        // Fallback: find post in current posts list
        const post = posts.find(p => p.forumPostId === postId);
        if (post) {
          setSinglePost(post);
        }
      }
    } catch (error) {
      console.error('Error fetching single post:', error);
      // Fallback: find post in current posts list
      const post = posts.find(p => p.forumPostId === postId);
      if (post) {
        setSinglePost(post);
      }
    }
  };

  const backToAllPosts = () => {
    setSelectedPostId(null);
    setSinglePost(null);
  };

  // Load saved filters on component mount
  useEffect(() => {
    const savedHashtags = localStorage.getItem('forum-selected-hashtags');
    const savedSearchKeyword = localStorage.getItem('forum-search-keyword');
    const savedSearchMode = localStorage.getItem('forum-search-mode') === 'true';
    
    if (savedHashtags) {
      try {
        const parsedHashtags = JSON.parse(savedHashtags);
        setSelectedHashtags(parsedHashtags);
      } catch (error) {
        console.error('Error parsing saved hashtags:', error);
      }
    }
    
    if (savedSearchKeyword) {
      setSearchKeyword(savedSearchKeyword);
    }
    
    setIsSearchMode(savedSearchMode);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [searchKeyword, selectedHashtags, currentPage, isMyPostsMode]);

  // Cleanup Intersection Observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Cache for posts to avoid unnecessary refetches
  const postsCache = useRef(new Map());
  
  const fetchPosts = async () => {
    try {
      // Set loading state based on whether it's initial load or loading more
      if (currentPage === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      let url;
      
      // Check if we're in My Posts mode
      if (isMyPostsMode && user) {
        url = `${API_ENDPOINTS.MY_POSTS}?page=${currentPage}&size=10`;
      } else {
        url = `${API_ENDPOINTS.POST_SEARCH}?page=${currentPage}&size=10&sort=createdAt,desc`;
        
        if (searchKeyword) {
          url += `&keyword=${encodeURIComponent(searchKeyword)}`;
        }
        
        if (selectedHashtags.length > 0) {
          selectedHashtags.forEach(tag => {
            url += `&hashtags=${encodeURIComponent(tag)}`;
          });
        }
      }

      // Check cache first for initial page load
      const cacheKey = `${url}_${currentPage}`;
      if (currentPage === 0 && postsCache.current.has(cacheKey)) {
        const cachedData = postsCache.current.get(cacheKey);
        setPosts(cachedData.content || []);
        setHasMorePosts(!cachedData.last);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      const headers = {};
      if (isMyPostsMode && user) {
        headers['User-Email'] = user.email;
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      
      const response = await fetch(url, { headers });
      
      if (response.ok) {
        const data = await response.json();
        
        // Cache the response for initial page loads
        if (currentPage === 0) {
          postsCache.current.set(cacheKey, data);
        }
        
        if (currentPage === 0) {
          setPosts(data.content || []);
        } else {
          setPosts(prev => [...prev, ...(data.content || [])]);
        }
        
        setHasMorePosts(!data.last);
      } else {
        throw new Error('Failed to fetch posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Fallback to mock data for development
      if (currentPage === 0) {
        setPosts(getMockPosts());
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const getMockPosts = () => {
    return [
      {
        forumPostId: 1,
        title: t('forum.mockPosts.ai.title'),
        content: t('forum.mockPosts.ai.content'),
        username: 'Nguyễn Văn A',
        userAvatar: '/default-avatar.png',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        hashtags: [
          { content: 'ai' },
          { content: 'technology' },
          { content: 'innovation' }
        ],
        images: [
          { imgPath: '/uploads/posts/images/ai-tech.jpg' }
        ],
        reactions: { likeCount: 45, commentCount: 12 },
        comments: [
          {
            forumCommentId: 1,
            content: t('forum.mockPosts.ai.comment'),
            username: 'Trần Thị B',
            userAvatar: '/default-avatar.png',
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        forumPostId: 2,
        title: t('forum.mockPosts.startup.title'),
        content: t('forum.mockPosts.startup.content'),
        username: 'Lê Văn C',
        userAvatar: '/default-avatar.png',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        hashtags: [
          { content: 'startup' },
          { content: 'business' },
          { content: 'success' }
        ],
        images: [],
        reactions: { likeCount: 23, commentCount: 8 },
        comments: []
      },
      {
        forumPostId: 3,
        title: t('forum.mockPosts.marketing.title'),
        content: t('forum.mockPosts.marketing.content'),
        username: 'Phạm Thị D',
        userAvatar: '/default-avatar.png',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        hashtags: [
          { content: 'marketing' },
          { content: 'digital' },
          { content: 'strategy' }
        ],
        images: [
          { imgPath: '/uploads/posts/images/digital-marketing.jpg' },
          { imgPath: '/uploads/posts/images/marketing-tools.jpg' }
        ],
        reactions: { likeCount: 67, commentCount: 15 },
        comments: []
      }
    ];
  };

  const handleCreatePost = (post) => {
    if (editingPost) {
      // Update existing post
      setPosts(prev => 
        prev.map(p => 
          p.forumPostId === post.forumPostId ? post : p
        )
      );
      setEditingPost(null);
    } else {
      // Add new post
      setPosts(prev => [post, ...prev]);
    }
    // notify sidebar to refresh popular hashtags
    window.dispatchEvent(new Event('refresh-popular-hashtags'));
  };


  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(post => post.forumPostId !== postId));
  };

  const handleSearch = (keyword) => {
    // Clear hashtag filter first, then set search keyword
    setSelectedHashtags([]);
    setSearchKeyword(keyword);
    setCurrentPage(0);
    setIsSearchMode(true); // Set search mode
    setIsMyPostsMode(false); // Exit My Posts mode
    
    // Save to localStorage
    localStorage.setItem('forum-selected-hashtags', JSON.stringify([]));
    localStorage.setItem('forum-search-keyword', keyword);
    localStorage.setItem('forum-search-mode', 'true');
  };

  const handleHashtagFilter = (hashtags) => {
    // Clear search keyword first, then set hashtag filter
    setSearchKeyword('');
    // Handle both single hashtag (string) and array of hashtags
    const hashtagArray = Array.isArray(hashtags) ? hashtags : [hashtags];
    setSelectedHashtags(hashtagArray);
    setCurrentPage(0);
    setIsSearchMode(false); // Set filter mode
    setIsMyPostsMode(false); // Exit My Posts mode
    
    // Save to localStorage
    localStorage.setItem('forum-selected-hashtags', JSON.stringify(hashtagArray));
    localStorage.setItem('forum-search-keyword', '');
    localStorage.setItem('forum-search-mode', 'false');
  };

  const clearAllFilters = () => {
    setSearchKeyword('');
    setSelectedHashtags([]);
    setCurrentPage(0);
    setIsSearchMode(false); // Reset to normal mode
    setIsMyPostsMode(false); // Exit My Posts mode
    
    // Clear localStorage
    localStorage.removeItem('forum-selected-hashtags');
    localStorage.removeItem('forum-search-keyword');
    localStorage.removeItem('forum-search-mode');
  };

  const handleMyPostsClick = () => {
    setIsMyPostsMode(true);
    setIsSearchMode(false);
    setSearchKeyword('');
    setSelectedHashtags([]);
    setCurrentPage(0);
    
    // Clear localStorage
    localStorage.removeItem('forum-selected-hashtags');
    localStorage.removeItem('forum-search-keyword');
    localStorage.removeItem('forum-search-mode');
  };

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

  const openEditModal = (post) => {
    setEditingPost(post);
    setShowPostModal(true);
  };

  const closePostModal = () => {
    setShowPostModal(false);
    setEditingPost(null);
  };

  const handleCommentAdded = (comment) => {
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
  };

  return (
    <div className={styles['forum-container']}>
      {/* Only show create post section if user is logged in */}
      {user ? (
        <div className={styles['forum-header']}>
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
                onClick={() => setShowSavedPostsModal(true)}
              >
                {t('forum.sidebar.savedPosts')}
              </button>
              <button 
                className={styles['my-posts-btn']}
                onClick={handleMyPostsClick}
              >
                {t('forum.sidebar.myPosts')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${styles['forum-header']} ${styles['guest-notice']}`}>
          <div className={styles['guest-message']}>
            <p>{t('forum.guest.welcome')} <a href="/login">{t('forum.guest.loginLink')}</a> {t('forum.guest.loginPrompt')}</p>
            <p className={styles['guest-features']}>{t('forum.guest.searchAndFilter')}</p>
          </div>
        </div>
      )}

      <div className={styles['forum-content']}>
      {/* Left Sidebar - Search */}
        <div className={`${styles['forum-sidebar']} ${styles['left']}`}>
      <SearchSidebar 
            onSearch={handleSearch}
            onHashtagFilter={handleHashtagFilter}
            selectedHashtags={selectedHashtags}
          />
        </div>

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
                    <span key={index} className={`${styles['filter-tag']} ${styles['hashtag-tag']}`}>
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
                  <PostCard 
                    key={singlePost.forumPostId}
                    post={singlePost}
                    onPostUpdated={handleCreatePost}
                    onPostDeleted={handlePostDeleted}
                    onEdit={openEditModal}
                    onHashtagClick={handleHashtagFilter}
                  />
                </div>
              </div>
            ) : (
              <div className={styles['posts-feed']}>
                {posts.map((post) => (
                  <PostCard 
                    key={post.forumPostId}
                    post={post}
                    onPostUpdated={handleCreatePost}
                    onPostDeleted={handlePostDeleted}
                    onEdit={openEditModal}
                    onHashtagClick={handleHashtagFilter}
                  />
                ))}
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
          editPost={editingPost}
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

    </div>
  );
};

export default Forum;
