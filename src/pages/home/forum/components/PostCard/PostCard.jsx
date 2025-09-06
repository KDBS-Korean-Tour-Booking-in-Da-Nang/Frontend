import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import CommentSection from '../CommentSection/CommentSection';
import ImageViewerModal from '../ImageViewerModal/ImageViewerModal';
import ReportModal from '../ReportModal/ReportModal';
import ReportSuccessModal from '../ReportSuccessModal/ReportSuccessModal';
import './PostCard.css';

const PostCard = ({ post, onPostUpdated, onPostDeleted, onEdit }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.reactions?.likeCount || 0);
  const [commentCount, setCommentCount] = useState(post.comments?.length || 0);
  const [openViewer, setOpenViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  useEffect(() => {
    // Always fetch reaction count and save count for all users (including guests)
    fetchReactionCount();
    fetchSaveCount();
    
    // Only check user-specific data if user is logged in
    if (user) {
      checkUserReaction();
      checkIfSaved();
      checkIfReported();
    }
  }, [user, post.forumPostId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.post-menu')) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Listen for unsave events from SavedPostsModal
  useEffect(() => {
    const handlePostUnsaved = (event) => {
      if (event.detail.postId === post.forumPostId) {
        setIsSaved(false);
        setSaveCount(prev => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('post-unsaved', handlePostUnsaved);
    return () => window.removeEventListener('post-unsaved', handlePostUnsaved);
  }, [post.forumPostId]);

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
      // No authentication required for public reaction count
      const response = await fetch(`http://localhost:8080/api/reactions/post/${post.forumPostId}/count`);
      if (response.ok) {
        const count = await response.json();
        setLikeCount(count);
      }
    } catch (error) {
      console.error('Error fetching reaction count:', error);
    }
  };

  const checkIfSaved = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const email = user?.email || localStorage.getItem('email') || '';
      
      console.log('Checking if post is saved:', post.forumPostId, email);
      const response = await fetch(`http://localhost:8080/api/saved-posts/check/${post.forumPostId}`, {
        headers: {
          'User-Email': email,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      console.log('Check saved response:', response.status, response.statusText);
      if (response.ok) {
        const data = await response.json();
        console.log('Check saved data:', data);
        setIsSaved(data.result || false);
      } else {
        const errorText = await response.text();
        console.error('Failed to check if saved:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error checking if saved:', error);
    }
  };

  const fetchSaveCount = async () => {
    try {
      // No authentication required for public save count
      const response = await fetch(`http://localhost:8080/api/saved-posts/count/${post.forumPostId}`);
      if (response.ok) {
        const data = await response.json();
        setSaveCount(data.result || 0);
      }
    } catch (error) {
      console.error('Error fetching save count:', error);
    }
  };

  const checkIfReported = async () => {
    try {
      const email = user?.email || localStorage.getItem('email') || '';
      if (!email) return;

      const response = await fetch(
        `http://localhost:8080/api/reports/check?userEmail=${encodeURIComponent(email)}&targetType=POST&targetId=${post.forumPostId}`
      );
      
      if (response.ok) {
        const hasReportedResult = await response.json();
        setHasReported(hasReportedResult);
      }
    } catch (error) {
      console.error('Error checking if reported:', error);
    }
  };

  const handleSavePost = async () => {
    if (!user) {
      console.log('No user found');
      return;
    }
    
    // Get authentication token
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const email = user?.email || localStorage.getItem('email') || '';
    
    console.log('Save button clicked:', {
      postId: post.forumPostId,
      isSaved,
      userEmail: email,
      hasToken: !!token,
      token: token ? token.substring(0, 20) + '...' : 'none',
      user: user
    });
    
    if (!email) {
      console.error('No user email found');
      alert(t('forum.errors.unauthorized'));
      return;
    }
    
    try {
      if (isSaved) {
        // Unsave post
        console.log('Attempting to unsave post...');
        const response = await fetch(`http://localhost:8080/api/saved-posts/unsave/${post.forumPostId}`, {
          method: 'DELETE',
          headers: {
            'User-Email': email,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        
        console.log('Unsave response:', response.status, response.statusText);
        
        if (response.ok) {
          setIsSaved(false);
          setSaveCount(prev => Math.max(0, prev - 1));
          console.log('Post unsaved successfully');
        } else {
          const errorText = await response.text();
          console.error('Failed to unsave post:', response.status, errorText);
        }
      } else {
        // Save post
        console.log('Attempting to save post...');
        const response = await fetch('http://localhost:8080/api/saved-posts/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Email': email,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            postId: post.forumPostId,
            note: ''
          })
        });
        
        console.log('Save response:', response.status, response.statusText);
        
        if (response.ok) {
          setIsSaved(true);
          setSaveCount(prev => prev + 1);
          console.log('Post saved successfully');
        } else {
          const errorText = await response.text();
          console.error('Failed to save post:', response.status, errorText);
        }
      }
    } catch (error) {
      console.error('Error saving/unsaving post:', error);
    }
  };

  const handleEdit = () => {
    onEdit && onEdit(post);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (window.confirm(t('forum.post.deleteConfirm'))) {
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
        alert(t('forum.post.deleteError'));
      }
    }
    setShowMenu(false);
  };

  const handleReport = () => {
    if (hasReported) {
      alert(t('forum.modals.report.error'));
      setShowMenu(false);
      return;
    }
    setShowReportModal(true);
    setShowMenu(false);
  };

  const handleReportSubmit = async (reportData) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const email = user?.email || localStorage.getItem('email') || '';
      
      if (!email) {
        throw new Error(t('forum.errors.unauthorized'));
      }

      const response = await fetch(`http://localhost:8080/api/reports/create?userEmail=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${t('forum.modals.report.error')}: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Report submitted successfully:', result);
      
      // Update reported status
      setHasReported(true);
      
      // Show success modal
      setShowReportSuccess(true);
      
    } catch (error) {
      console.error('Error reporting post:', error);
      throw error;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('forum.post.justNow');
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('forum.post.minutes')} ${t('forum.post.ago')}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('forum.post.hours')} ${t('forum.post.ago')}`;
    return `${Math.floor(diffInMinutes / 1440)} ${t('forum.post.days')} ${t('forum.post.ago')}`;
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
    <div className="post-card" id={`post-${post.postId}`}>
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
        
        <div className="post-actions-header">
          <div className="save-section">
            {user ? (
              <button 
                onClick={handleSavePost} 
                className={`save-btn ${isSaved ? 'saved' : ''}`}
                title={isSaved ? t('forum.post.unsave') : t('forum.post.save')}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  className="bookmark-icon"
                >
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </button>
            ) : (
              <div className="save-btn-disabled" title={t('forum.guest.loginToSave')}>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  className="bookmark-icon"
                >
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
            )}
            <span className="save-count">{saveCount}</span>
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
                      ✏️ {t('forum.post.edit')}
                    </button>
                    <button onClick={handleDelete} className="menu-item delete">
                      🗑️ {t('forum.post.delete')}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleReport} 
                    className={`menu-item ${hasReported ? 'reported' : ''}`}
                    disabled={hasReported}
                  >
                    {hasReported ? `✅ ${t('forum.modals.report.success')}` : `⚠️ ${t('forum.post.report')}`}
                  </button>
                )}
              </div>
            )}
          </div>
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
          <span className="stat-count">{likeCount} {t('forum.post.like')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-count">{commentCount} {t('forum.post.comments')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-count">{saveCount} {t('forum.post.save')}</span>
        </div>
      </div>

      <div className="post-actions">
        {user ? (
          <>
            <button 
              className={`action-btn ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              <span className="action-icon">👍</span>
              <span className="action-text">{t('forum.post.like')}</span>
            </button>
            <button 
              className={`action-btn ${isDisliked ? 'liked' : ''}`}
              onClick={handleDislike}
            >
              <span className="action-icon">👎</span>
              <span className="action-text">{t('forum.post.unlike')}</span>
            </button>
            
            <button 
              className="action-btn"
              onClick={() => document.querySelector('.comment-input')?.focus()}
            >
              <span className="action-icon">💬</span>
              <span className="action-text">{t('forum.post.comment')}</span>
            </button>
          </>
        ) : (
          <div className="guest-actions">
            <div className="action-btn-disabled" title={t('forum.guest.loginToReact')}>
              <span className="action-icon">👍</span>
              <span className="action-text">{t('forum.post.like')}</span>
            </div>
            <div className="action-btn-disabled" title={t('forum.guest.loginToReact')}>
              <span className="action-icon">👎</span>
              <span className="action-text">{t('forum.post.unlike')}</span>
            </div>
            <div className="action-btn-disabled" title={t('forum.guest.loginToComment')}>
              <span className="action-icon">💬</span>
              <span className="action-text">{t('forum.post.comment')}</span>
            </div>
          </div>
        )}
      </div>

      {user && (
        <CommentSection 
          post={post}
          onCommentAdded={handleCommentAdded}
          onCountChange={handleCommentCountChange}
        />
      )}
    </div>
    <ImageViewerModal open={openViewer} onClose={() => setOpenViewer(false)} post={post} initialIndex={viewerIndex} />
    
    <ReportModal 
      isOpen={showReportModal}
      onClose={() => setShowReportModal(false)}
      onReport={handleReportSubmit}
      post={post}
    />
    
    <ReportSuccessModal 
      isOpen={showReportSuccess}
      onClose={() => setShowReportSuccess(false)}
    />
    </>
  );
};

export default PostCard;
