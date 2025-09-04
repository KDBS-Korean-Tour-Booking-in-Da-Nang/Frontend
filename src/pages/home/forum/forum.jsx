import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import PostModal from './components/PostModal';
import PostCard from './components/PostCard';
import SearchSidebar from './components/SearchSidebar';
import UserSidebar from './components/UserSidebar';
import './forum.css';

const Forum = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [searchKeyword, selectedHashtags, currentPage]);

  const fetchPosts = async () => {
    try {
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

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
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
        title: 'Công nghệ AI mới nhất 2025',
        content: 'AI đang phát triển với tốc độ chóng mặt. Các công nghệ mới như GPT-5, Claude 4 đang thay đổi cách chúng ta làm việc và học tập.',
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
            content: 'Bài viết rất hay! AI thực sự đang thay đổi thế giới.',
            username: 'Trần Thị B',
            userAvatar: '/default-avatar.png',
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        forumPostId: 2,
        title: 'Startup thành công: Bài học từ thất bại',
        content: 'Thất bại không phải là kết thúc, mà là bước đệm để thành công. Hãy cùng chia sẻ những bài học quý giá từ những startup đã thất bại.',
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
        title: 'Marketing số trong thời đại 4.0',
        content: 'Digital marketing đang trở thành xu hướng chính. Các chiến lược marketing truyền thống cần được cập nhật để phù hợp với thời đại số.',
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

  const handleCreatePost = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    // notify sidebar to refresh popular hashtags
    window.dispatchEvent(new Event('refresh-popular-hashtags'));
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts(prev => 
      prev.map(post => 
        post.forumPostId === updatedPost.forumPostId ? updatedPost : post
      )
    );
    setEditingPost(null);
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(post => post.forumPostId !== postId));
  };

  const handleSearch = (keyword) => {
    setSearchKeyword(keyword);
    setCurrentPage(0);
  };

  const handleHashtagFilter = (hashtags) => {
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
      <div className="forum-header">
        <div className="create-post-section">
          <div className="create-post-input" onClick={() => setShowPostModal(true)}>
            <img 
              src={user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:8080${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`) : '/default-avatar.png'} 
              alt={user?.username}
              className="user-avatar-small"
            />
            <span className="create-post-text">Bạn đang nghĩ gì?</span>
          </div>
        </div>
      </div>

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
              <p>Đang tải bài viết...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="no-posts">
              <h3>Không có bài viết nào</h3>
              <p>Hãy là người đầu tiên chia sẻ điều gì đó!</p>
              <button 
                onClick={() => setShowPostModal(true)}
                className="create-first-post-btn"
              >
                Tạo bài viết đầu tiên
              </button>
            </div>
        ) : (
          <>
              <div className="posts-feed">
                {posts.map((post) => (
              <PostCard 
                    key={post.forumPostId}
                post={post}
                    onPostUpdated={handlePostUpdated}
                    onPostDeleted={handlePostDeleted}
                    onEdit={openEditModal}
              />
            ))}
              </div>
            
              {hasMorePosts && (
              <div className="load-more-container">
                <button 
                    onClick={handleLoadMore}
                  className="load-more-btn"
                    disabled={isLoading}
                >
                    {isLoading ? 'Đang tải...' : 'Tải thêm bài viết'}
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

      {/* Post Modal */}
      <PostModal 
        isOpen={showPostModal}
        onClose={closePostModal}
        onPostCreated={handleCreatePost}
        editPost={editingPost}
      />
    </div>
  );
};

export default Forum;
