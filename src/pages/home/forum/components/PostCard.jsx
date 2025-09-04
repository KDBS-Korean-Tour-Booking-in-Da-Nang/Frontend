import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import CommentSection from './CommentSection';
import ImageViewerModal from './ImageViewerModal';
import './PostCard.css';

const PostCard = ({ post, onPostUpdated, onPostDeleted, onEdit }) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.reactions?.likeCount || 0);
  const [commentCount, setCommentCount] = useState(post.comments?.length || 0);
  const [openViewer, setOpenViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    if (user) {
      checkUserReaction();
      fetchReactionCount();
    }
  }, [user, post.forumPostId]);

  const isOwnPost = !!user && (
    (post.userEmail && user.email && post.userEmail.toLowerCase() === user.email.toLowerCase()) ||
    (post.username && user.username && post.username.toLowerCase() === user.username.toLowerCase())
  );

  const handleLike = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const email = user?.email || localStorage.getItem('email') || '';
      const reactionRequest = {
        userEmail: email,
        targetId: post.forumPostId,
        targetType: 'POST',
        reactionType: 'LIKE'
      };

      if (isLiked) {
        // Remove reaction (legacy spec)
        await fetch(`http://localhost:8080/api/reactions/POST/${post.forumPostId}`, {
          method: 'POST',
          headers: {
            'User-Email': email,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        // Add reaction (legacy spec)
        const response = await fetch('http://localhost:8080/api/reactions/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Email': email,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(reactionRequest),
        });
        
        if (response.ok) {
          setIsLiked(true);
          if (isDisliked) setIsDisliked(false);
          setLikeCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleDislike = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const email = user?.email || localStorage.getItem('email') || '';
      const reactionRequest = {
        userEmail: email,
        targetId: post.forumPostId,
        targetType: 'POST',
        reactionType: 'DISLIKE'
      };

      if (isDisliked) {
        await fetch(`http://localhost:8080/api/reactions/POST/${post.forumPostId}`, {
          method: 'POST',
          headers: {
            'User-Email': email,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        setIsDisliked(false);
      } else {
        const response = await fetch('http://localhost:8080/api/reactions/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Email': email,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(reactionRequest),
        });
        if (response.ok) {
          setIsDisliked(true);
          if (isLiked) {
            setIsLiked(false);
            setLikeCount(prev => Math.max(0, prev - 1));
          }
        }
      }
    } catch (e) {
      console.error('Error handling dislike:', e);
    }
  };

  const handleCommentAdded = (comment) => {
    setCommentCount(prev => prev + 1);
  };

  const handleCommentCountChange = (count) => {
    setCommentCount(count);
  };

  const checkUserReaction = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:8080/api/reactions/post/${post.forumPostId}/user/${encodeURIComponent(user.email)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      if (response.ok) {
        const hasReacted = await response.json();
        setIsLiked(hasReacted);
      }
    } catch (error) {
      console.error('Error checking user reaction:', error);
    }
  };

  const fetchReactionCount = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:8080/api/reactions/post/${post.forumPostId}/count`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      if (response.ok) {
        const count = await response.json();
        setLikeCount(count);
      }
    } catch (error) {
      console.error('Error fetching reaction count:', error);
    }
  };

  const handleEdit = () => {
    onEdit && onEdit(post);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        const response = await fetch(`http://localhost:8080/api/posts/${post.forumPostId}?userEmail=${encodeURIComponent(user.email)}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });

        if (response.ok) {
          onPostDeleted(post.forumPostId);
        } else {
          const text = await response.text().catch(()=> '');
          console.error('Delete post failed:', response.status, text);
          throw new Error('Failed to delete post');
        }
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('Có lỗi xảy ra khi xóa bài viết');
      }
    }
    setShowMenu(false);
  };

  const handleReport = () => {
    // TODO: Implement report functionality
    alert('Tính năng báo cáo đang được phát triển');
    setShowMenu(false);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`;
    return `${Math.floor(diffInMinutes / 1440)} ngày trước`;
  };

  const resolveImageUrl = (imgPath) => {
    if (!imgPath) return '';
    if (typeof imgPath !== 'string') return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
    const normalized = imgPath.startsWith('/') ? imgPath : `/${imgPath}`;
    return `http://localhost:8080${normalized}`;
  };

  const defaultAvatar = '/default-avatar.png';

  const renderImages = () => {
    if (!post.images || post.images.length === 0) return null;
    const imgs = post.images.map((img) => resolveImageUrl(img.imgPath)).filter(Boolean);
    const count = imgs.length;

    if (count === 1) {
      return (
        <div className="pc-images one">
          <img src={imgs[0]} alt="Post image" className="pc-img main" onClick={() => { setViewerIndex(0); setOpenViewer(true); }} />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="pc-images two">
          <img src={imgs[0]} alt="Post image 1" className="pc-img" onClick={() => { setViewerIndex(0); setOpenViewer(true); }} />
          <img src={imgs[1]} alt="Post image 2" className="pc-img" onClick={() => { setViewerIndex(1); setOpenViewer(true); }} />
        </div>
      );
    }

    // 3 or more: one big on top, three small below (like collage)
    const rest = imgs.slice(1, 4);
    const remaining = count - 4;
    return (
      <div className="pc-images collage">
        <img src={imgs[0]} alt="Post image main" className="pc-img main" onClick={() => { setViewerIndex(0); setOpenViewer(true); }} />
        <div className="pc-thumbs">
          {rest.map((src, idx) => (
            <div key={idx} className="pc-thumb-wrap">
              <img src={src} alt={`Post image ${idx + 2}`} className="pc-img thumb" onClick={() => { setViewerIndex(idx + 1); setOpenViewer(true); }} />
              {idx === rest.length - 1 && remaining > 0 && (
                <div className="pc-more-overlay">+{remaining}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="post-card">
      <div className="post-header">
        <div className="post-user-info">
          <img 
            src={resolveImageUrl(post.userAvatar) || defaultAvatar} 
            alt={post.username}
            className="user-avatar"
          />
          <div className="user-details">
            <div className="username">{post.username}</div>
            <div className="post-time">{formatTime(post.createdAt)}</div>
          </div>
        </div>
        
        <div className="post-menu">
          <button 
            className="menu-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            ⋯
          </button>
          
          {showMenu && (
            <div className="menu-dropdown">
              {isOwnPost ? (
                <>
                  <button onClick={handleEdit} className="menu-item">
                    ✏️ Chỉnh sửa
                  </button>
                  <button onClick={handleDelete} className="menu-item delete">
                    🗑️ Xóa
                  </button>
                </>
              ) : (
                <button onClick={handleReport} className="menu-item">
                  ⚠️ Báo cáo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="post-content">
        {post.title && (
          <h3 className="post-title">{post.title}</h3>
        )}
        <p className="post-text">{post.content}</p>
        
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="post-hashtags">
            {post.hashtags.map((tag, index) => (
              <span key={index} className="hashtag">
                #{tag.content}
              </span>
            ))}
          </div>
        )}
        
        {renderImages()}
      </div>

      <div className="post-stats">
        <div className="stat-item">
          <span className="stat-count">{likeCount} lượt thích</span>
        </div>
        <div className="stat-item">
          <span className="stat-count">{commentCount} bình luận</span>
        </div>
      </div>

      <div className="post-actions">
        <button 
          className={`action-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <span className="action-icon">👍</span>
          <span className="action-text">Thích</span>
        </button>
        <button 
          className={`action-btn ${isDisliked ? 'liked' : ''}`}
          onClick={handleDislike}
        >
          <span className="action-icon">👎</span>
          <span className="action-text">Không thích</span>
        </button>
        
        <button 
          className="action-btn"
          onClick={() => document.querySelector('.comment-input')?.focus()}
        >
          <span className="action-icon">💬</span>
          <span className="action-text">Bình luận</span>
        </button>
      </div>

      <CommentSection 
        post={post}
        onCommentAdded={handleCommentAdded}
        onCountChange={handleCommentCountChange}
      />
    </div>
    <ImageViewerModal open={openViewer} onClose={() => setOpenViewer(false)} post={post} initialIndex={viewerIndex} />
    </>
  );
};

export default PostCard;
