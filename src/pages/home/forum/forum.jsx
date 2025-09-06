import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import PostModal from './components/PostModal/PostModal';
import PostCard from './components/PostCard/PostCard';
import SearchSidebar from './components/SearchSidebar/SearchSidebar';
import UserSidebar from './components/UserSidebar/UserSidebar';
import SavedPostsModal from './components/SavedPostsModal/SavedPostsModal';
import ReactionsModal from './components/ReactionsModal/ReactionsModal';
import './forum.css';

const Forum = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [showSavedPostsModal, setShowSavedPostsModal] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [singlePost, setSinglePost] = useState(null);

  const showSinglePost = async (postId) => {
    setSelectedPostId(postId);
    try {
      const response = await fetch(`http://localhost:8080/api/posts/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setSinglePost(data);
      } else {
        console.error('Failed to fetch single post');
        // Fallback: find post in current posts list
        const post = posts.find(p => p.postId === postId);
        if (post) {
          setSinglePost(post);
        }
      }
    } catch (error) {
      console.error('Error fetching single post:', error);
      // Fallback: find post in current posts list
      const post = posts.find(p => p.postId === postId);
      if (post) {
        setSinglePost(post);
      }
    }
  };

  const backToAllPosts = () => {
    setSelectedPostId(null);
    setSinglePost(null);
  };

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
  };

  const handleHashtagFilter = (hashtags) => {
    console.log('Forum: handleHashtagFilter called with:', hashtags); // Debug log
    // Clear search keyword first, then set hashtag filter
    setSearchKeyword('');
    setSelectedHashtags(hashtags);
    setCurrentPage(0);
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
                className="reactions-btn"
                onClick={() => setShowReactionsModal(true)}
              >
                {t('forum.sidebar.reactions')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="forum-header guest-notice">
          <div className="guest-message">
            <p>{t('forum.guest.welcome')} <a href="/login">{t('forum.guest.loginLink')}</a> {t('forum.guest.loginPrompt')}</p>
          </div>
        </div>
      )}

      <div className="forum-content">
      {/* Left Sidebar - Search */}
        <div className="forum-sidebar left">
      <SearchSidebar 
            onSearch={handleSearch}
            onHashtagFilter={handleHashtagFilter}
          />
        </div>

        {/* Main Content - Posts Feed */}
        <div className="forum-main">
          {isLoading && currentPage === 0 ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>{t('forum.post.loading')}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="no-posts">
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

      {/* Reactions Modal - Only show if user is logged in */}
      {user && (
        <ReactionsModal 
          isOpen={showReactionsModal}
          onClose={() => setShowReactionsModal(false)}
          onPostClick={showSinglePost}
        />
      )}
    </div>
  );
};

export default Forum;
