import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import PostModal from './components/PostModal/PostModal';
import PostCard from './components/PostCard/PostCard';
import SearchSidebar from './components/SearchSidebar/SearchSidebar';
import UserSidebar from './components/UserSidebar/UserSidebar';
import SavedPostsModal from './components/SavedPostsModal/SavedPostsModal';
import MyPostsModal from './components/MyPostsModal/MyPostsModal';
import './forum.css';

const Forum = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [showSavedPostsModal, setShowSavedPostsModal] = useState(false);
  const [showMyPostsModal, setShowMyPostsModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [singlePost, setSinglePost] = useState(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const showSinglePost = async (postId) => {
    console.log('showSinglePost called with postId:', postId, 'type:', typeof postId);
    setSelectedPostId(postId);
    try {
      const response = await fetch(`http://localhost:8080/api/posts/${postId}`);
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
    console.log('Forum: useEffect triggered with:', { searchKeyword, selectedHashtags, currentPage }); // Debug log
    fetchPosts();
  }, [searchKeyword, selectedHashtags, currentPage]);

  const fetchPosts = async () => {
    try {
      console.log('Forum: fetchPosts called with:', { searchKeyword, selectedHashtags, currentPage }); // Debug log
      setIsLoading(true);
      
      let url = `http://localhost:8080/api/posts/search?page=${currentPage}&size=10&sort=createdAt,desc`;
      
      if (searchKeyword) {
        url += `&keyword=${encodeURIComponent(searchKeyword)}`;
      }
      
      if (selectedHashtags.length > 0) {
        selectedHashtags.forEach(tag => {
          url += `&hashtags=${encodeURIComponent(tag)}`;
        });
      }

      console.log('Forum: Fetching URL:', url); // Debug log
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Forum: Received data:', data); // Debug log
        
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
    console.log('Forum: handleSearch called with:', keyword); // Debug log
    // Clear hashtag filter first, then set search keyword
    setSelectedHashtags([]);
    setSearchKeyword(keyword);
    setCurrentPage(0);
    setIsSearchMode(true); // Set search mode
    
    // Save to localStorage
    localStorage.setItem('forum-selected-hashtags', JSON.stringify([]));
    localStorage.setItem('forum-search-keyword', keyword);
    localStorage.setItem('forum-search-mode', 'true');
  };

  const handleHashtagFilter = (hashtags) => {
    console.log('Forum: handleHashtagFilter called with:', hashtags); // Debug log
    // Clear search keyword first, then set hashtag filter
    setSearchKeyword('');
    // Handle both single hashtag (string) and array of hashtags
    const hashtagArray = Array.isArray(hashtags) ? hashtags : [hashtags];
    setSelectedHashtags(hashtagArray);
    setCurrentPage(0);
    setIsSearchMode(false); // Set filter mode
    
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
    
    // Clear localStorage
    localStorage.removeItem('forum-selected-hashtags');
    localStorage.removeItem('forum-search-keyword');
    localStorage.removeItem('forum-search-mode');
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

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
    <div className="forum-container">
      {/* Only show create post section if user is logged in */}
      {user ? (
        <div className="forum-header">
          <div className="create-post-section">
            <div className="create-post-input" onClick={() => setShowPostModal(true)}>
              <img 
                src={user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:8080${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`) : '/default-avatar.png'} 
                alt={user?.username}
                className="user-avatar-small"
              />
              <span className="create-post-text">{t('forum.createPost.placeholder')}</span>
            </div>
            <div className="header-buttons">
              <button 
                className="saved-posts-btn"
                onClick={() => setShowSavedPostsModal(true)}
              >
                {t('forum.sidebar.savedPosts')}
              </button>
              <button 
                className="my-posts-btn"
                onClick={() => setShowMyPostsModal(true)}
              >
                {t('forum.sidebar.myPosts')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="forum-header guest-notice">
          <div className="guest-message">
            <p>{t('forum.guest.welcome')} <a href="/login">{t('forum.guest.loginLink')}</a> {t('forum.guest.loginPrompt')}</p>
            <p className="guest-features">{t('forum.guest.searchAndFilter')}</p>
          </div>
        </div>
      )}

      <div className="forum-content">
      {/* Left Sidebar - Search */}
        <div className="forum-sidebar left">
      <SearchSidebar 
            onSearch={handleSearch}
            onHashtagFilter={handleHashtagFilter}
            selectedHashtags={selectedHashtags}
          />
        </div>

        {/* Main Content - Posts Feed */}
        <div className="forum-main">
          {/* Filter Status Bar - Only show for hashtag filters */}
          {!isSearchMode && selectedHashtags.length > 0 && (
            <div className="filter-status-bar">
              <div className="filter-info">
                {selectedHashtags.map((tag, index) => (
                  <span key={index} className="filter-tag hashtag-tag">
                    #{tag}
                  </span>
                ))}
              </div>
              <button 
                className="clear-filters-btn"
                onClick={clearAllFilters}
                title={t('forum.filter.clearAll')}
              >
                ✕ {t('forum.filter.clearAll')}
              </button>
            </div>
          )}

          {/* Search Results Header - Only show for search mode */}
          {isSearchMode && searchKeyword && (
            <div className="search-results-header">
              <div className="search-info">
                <span className="search-icon">🔍</span>
                <span className="search-text">
                  Kết quả tìm kiếm cho: <strong>"{searchKeyword}"</strong>
                </span>
                <span className="search-count">
                  ({posts.length} {posts.length === 1 ? 'bài viết' : 'bài viết'})
                </span>
              </div>
              <button 
                className="back-to-forum-btn"
                onClick={clearAllFilters}
                title={t('forum.search.backToForum')}
              >
                ← {t('forum.search.backToForum')}
              </button>
            </div>
          )}
          
          {isLoading && currentPage === 0 ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>{t('forum.post.loading')}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="no-posts">
              {isSearchMode ? (
                <>
                  <h3>🔍 {t('forum.search.noResults')}</h3>
                  <p>{t('forum.search.noResultsDesc', { keyword: searchKeyword })}</p>
                </>
              ) : (
                <>
                  <h3>{t('forum.post.noPosts')}</h3>
                  <p>{t('forum.post.noPostsDesc')}</p>
                  {user && (
                    <button 
                      onClick={() => setShowPostModal(true)}
                      className="create-first-post-btn"
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
              <div className="single-post-view">
                <div className="back-button-container">
                  <button className="back-button" onClick={backToAllPosts}>
                    {t('forum.post.backToList')}
                  </button>
                </div>
                <div className="posts-feed">
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
              <div className="posts-feed">
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
            
            {!selectedPostId && hasMorePosts && (
              <div className="load-more-container">
                <button 
                    onClick={handleLoadMore}
                  className="load-more-btn"
                    disabled={isLoading}
                >
                    {isLoading ? t('forum.post.loadingMore') : t('forum.post.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

        {/* Right Sidebar - User Suggestions */}
        <div className="forum-sidebar right">
      <UserSidebar />
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

      {/* My Posts Modal - Only show if user is logged in */}
      {user && (
        <MyPostsModal 
          isOpen={showMyPostsModal}
          onClose={() => setShowMyPostsModal(false)}
          onPostClick={showSinglePost}
        />
      )}
    </div>
  );
};

export default Forum;
