import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { BaseURL, API_ENDPOINTS, getAvatarUrl, getImageUrl } from '../../../../../config/api';
import CommentSection from '../CommentSection/CommentSection';
import ImageViewerModal from '../ImageViewerModal/ImageViewerModal';
import ReportModal from '../ReportModal/ReportModal';
import ReportSuccessModal from '../ReportSuccessModal/ReportSuccessModal';
import DeleteConfirmModal from '../../../../../components/DeleteConfirmModal/DeleteConfirmModal';
import LoginRequiredModal from '../../../../../components/LoginRequiredModal/LoginRequiredModal';
import './PostCard.css';

const PostCard = ({ post, onPostUpdated, onPostDeleted, onEdit, onHashtagClick }) => {
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
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);

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
        targetId: post.forumPostId,
        targetType: 'POST',
        reactionType: 'LIKE'
      };

      if (isLiked) {
        // Remove reaction (legacy spec)
        await fetch(API_ENDPOINTS.REACTIONS_POST(post.forumPostId), {
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
        const response = await fetch(API_ENDPOINTS.REACTIONS_ADD, {
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
        targetId: post.forumPostId,
        targetType: 'POST',
        reactionType: 'DISLIKE'
      };

      if (isDisliked) {
        await fetch(API_ENDPOINTS.REACTIONS_POST(post.forumPostId), {
          method: 'POST',
          headers: {
            'User-Email': email,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        setIsDisliked(false);
      } else {
        const response = await fetch(API_ENDPOINTS.REACTIONS_ADD, {
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
      const response = await fetch(API_ENDPOINTS.REACTIONS_POST_USER(post.forumPostId, user.email), {
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
      const response = await fetch(API_ENDPOINTS.REACTIONS_POST_COUNT(post.forumPostId));
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
      const response = await fetch(API_ENDPOINTS.SAVED_POSTS_CHECK(post.forumPostId), {
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
      const response = await fetch(API_ENDPOINTS.SAVED_POSTS_COUNT(post.forumPostId));
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
        `${API_ENDPOINTS.REPORTS_CHECK}?userEmail=${encodeURIComponent(email)}&targetType=POST&targetId=${post.forumPostId}`
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
        const response = await fetch(API_ENDPOINTS.SAVED_POSTS_UNSAVE(post.forumPostId), {
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
        const response = await fetch(API_ENDPOINTS.SAVED_POSTS_SAVE, {
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

  const handleDelete = () => {
    setShowDeleteConfirmModal(true);
    setShowMenu(false);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(`${API_ENDPOINTS.POST_BY_ID(post.forumPostId)}?userEmail=${encodeURIComponent(user.email)}`, {
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
  };

  const handleReport = () => {
    // Check if user is logged in
    if (!user) {
      setShowLoginRequiredModal(true);
      setShowMenu(false);
      return;
    }
    
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

      const response = await fetch(`${API_ENDPOINTS.REPORTS_CREATE}?userEmail=${encodeURIComponent(email)}`, {
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
    return getImageUrl(normalized);
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
              <div 
                className="save-btn-disabled" 
                title={t('forum.guest.loginToSave')}
                onClick={() => setShowLoginRequiredModal(true)}
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
              <span 
                key={index} 
                className="hashtag"
                onClick={() => onHashtagClick && onHashtagClick(tag.content)}
                title={t('forum.hashtag.clickToFilter')}
              >
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
              className={`action-btn like-btn ${isLiked ? 'active' : ''}`}
              onClick={handleLike}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="action-icon"
              >
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
              </svg>
              <span className="action-text">{t('forum.post.like')}</span>
            </button>
            <button 
              className={`action-btn dislike-btn ${isDisliked ? 'active' : ''}`}
              onClick={handleDislike}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="action-icon"
              >
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
              </svg>
              <span className="action-text">{t('forum.post.dislike')}</span>
            </button>
            
            <button 
              className="action-btn comment-btn"
              onClick={() => setShowCommentInput(!showCommentInput)}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="action-icon"
              >
                <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"/>
              </svg>
              <span className="action-text">{t('forum.post.comment')}</span>
            </button>
          </>
        ) : (
          <div className="guest-actions">
            <div 
              className="action-btn-disabled like-btn-disabled" 
              title={t('forum.guest.loginToReact')}
              onClick={() => setShowLoginRequiredModal(true)}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="action-icon"
              >
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
              </svg>
              <span className="action-text">{t('forum.post.like')}</span>
            </div>
            <div 
              className="action-btn-disabled dislike-btn-disabled" 
              title={t('forum.guest.loginToReact')}
              onClick={() => setShowLoginRequiredModal(true)}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="action-icon"
              >
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
              </svg>
              <span className="action-text">{t('forum.post.dislike')}</span>
            </div>
            <div 
              className="action-btn-disabled comment-btn-disabled" 
              title={t('forum.guest.loginToComment')}
              onClick={() => setShowLoginRequiredModal(true)}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className="action-icon"
              >
                <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"/>
              </svg>
              <span className="action-text">{t('forum.post.comment')}</span>
            </div>
          </div>
        )}
      </div>

      <CommentSection 
        post={post}
        onCommentAdded={handleCommentAdded}
        onCountChange={handleCommentCountChange}
        onLoginRequired={() => setShowLoginRequiredModal(true)}
        showCommentInput={showCommentInput}
        onCommentInputToggle={setShowCommentInput}
      />
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
    
    <LoginRequiredModal 
      isOpen={showLoginRequiredModal}
      onClose={() => setShowLoginRequiredModal(false)}
      title={t('auth.loginRequired.title')}
      message={t('auth.loginRequired.message')}
      returnTo="/forum"
    />
    
    <DeleteConfirmModal 
      isOpen={showDeleteConfirmModal}
      onClose={() => setShowDeleteConfirmModal(false)}
      onConfirm={confirmDelete}
      itemName={t('forum.post.post')}
    />
    </>
  );
};

export default PostCard;
