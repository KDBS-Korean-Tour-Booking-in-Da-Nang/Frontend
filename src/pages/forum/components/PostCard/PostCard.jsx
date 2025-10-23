import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { BaseURL, API_ENDPOINTS, getImageUrl, createAuthHeaders, FrontendURL } from '../../../../config/api';
import { useNavigate } from 'react-router-dom';
import CommentSection from '../CommentSection/CommentSection';
import ImageViewerModal from '../ImageViewerModal/ImageViewerModal';
import ReportModal from '../ReportModal/ReportModal';
import ReportSuccessModal from '../ReportSuccessModal/ReportSuccessModal';
import { DeleteConfirmModal, LoginRequiredModal } from '../../../../components';
import styles from './PostCard.module.css';

const PostCard = ({ post, onPostDeleted, onEdit, onHashtagClick }) => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const postMenuRef = useRef(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.reactions?.likeCount || 0);
  const [dislikeCount, setDislikeCount] = useState(0);
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
  const [tourLinkPreview, setTourLinkPreview] = useState(null);
  const [isLoadingTourPreview, setIsLoadingTourPreview] = useState(false);

  useEffect(() => {
    // Always fetch reaction count, dislike count and save count for all users (including guests)
    fetchReactionCount();
    fetchDislikeCount();
    fetchSaveCount();
    
    // Only check user-specific data if user is logged in
    if (user) {
      checkUserReaction();
      checkIfSaved();
      checkIfReported();
    }
  }, [post.forumPostId, user?.email]);

  // Detect tour link via metadata first, fallback to parsing content
  useEffect(() => {
    const fetchTourPreview = () => {
      try {
        const meta = post.metadata || post.meta || null;
        let match = null;
        if (meta && meta.linkType === 'TOUR' && (meta.linkRefId || meta.linkUrl)) {
          const idFromMeta = meta.linkRefId || (String(meta.linkUrl || '').match(/\/tour\/(\d+)/)?.[1]);
          if (idFromMeta) match = [null, idFromMeta];
        }
        if (!match) {
          const text = String(post.content || '');
          const escapedBase = FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`(?:${escapedBase})?/tour/(\\d+)`);
          match = text.match(regex);
        }
        if (match && match[1]) {
          const tourId = match[1];
          setIsLoadingTourPreview(true);
          // Use requestIdleCallback to avoid blocking main thread
          if (window.requestIdleCallback) {
            window.requestIdleCallback(() => {
              fetch(API_ENDPOINTS.TOUR_PREVIEW_BY_ID(tourId))
                .then(r => (r.ok ? r.json() : Promise.reject()))
                .then(data => {
                  setTourLinkPreview({
                    id: tourId,
                    title: data.title || data.tourName,
                    summary: data.summary || data.tourDescription,
                    image: getImageUrl(data.thumbnailUrl || data.tourImgPath)
                  });
                })
                .catch(() => setTourLinkPreview(null))
                .finally(() => setIsLoadingTourPreview(false));
            });
          } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
              fetch(API_ENDPOINTS.TOUR_PREVIEW_BY_ID(tourId))
                .then(r => (r.ok ? r.json() : Promise.reject()))
                .then(data => {
                  setTourLinkPreview({
                    id: tourId,
                    title: data.title || data.tourName,
                    summary: data.summary || data.tourDescription,
                    image: getImageUrl(data.thumbnailUrl || data.tourImgPath)
                  });
                })
                .catch(() => setTourLinkPreview(null))
                .finally(() => setIsLoadingTourPreview(false));
            }, 0);
          }
        } else {
          setTourLinkPreview(null);
          setIsLoadingTourPreview(false);
        }
      } catch (_) { 
        setTourLinkPreview(null);
        setIsLoadingTourPreview(false);
      }
    };

    // Debounce the fetch to avoid multiple rapid calls
    const timeoutId = setTimeout(fetchTourPreview, 200);
    return () => clearTimeout(timeoutId);
  }, [post.forumPostId, post.content, post.metadata]);

  // Preload first few images for better performance
  useEffect(() => {
    if (post.images && post.images.length > 0) {
      const firstFewImages = post.images.slice(0, 3);
      firstFewImages.forEach((img) => {
        const imgPath = typeof img === 'string' ? img : img.imgPath;
        if (imgPath) {
          const resolvedUrl = resolveImageUrl(imgPath);
          if (resolvedUrl) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = resolvedUrl;
            document.head.appendChild(link);
          }
        }
      });
    }
  }, [post.images]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showMenu) return;
      if (postMenuRef.current && !postMenuRef.current.contains(event.target)) {
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
      const token = getToken();
      const email = user?.email || localStorage.getItem('email') || '';
      const reactionRequest = {
        targetId: post.forumPostId,
        targetType: 'POST',
        reactionType: 'LIKE',
        userEmail: email
      };

      if (isLiked) {
        // Remove reaction
        const removeRequest = {
          targetId: post.forumPostId,
          targetType: 'POST',
          reactionType: 'LIKE',
          userEmail: email
        };
        await fetch(API_ENDPOINTS.REACTIONS_DELETE, {
          method: 'POST',
          headers: createAuthHeaders(token),
          body: JSON.stringify(removeRequest)
        });
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        // Add reaction (legacy spec)
        const response = await fetch(API_ENDPOINTS.REACTIONS_ADD, {
          method: 'POST',
          headers: createAuthHeaders(token, { 'Content-Type': 'application/json' }),
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
      const token = getToken();
      const email = user?.email || localStorage.getItem('email') || '';
      const reactionRequest = {
        targetId: post.forumPostId,
        targetType: 'POST',
        reactionType: 'DISLIKE',
        userEmail: email
      };

      if (isDisliked) {
        const removeRequest = {
          targetId: post.forumPostId,
          targetType: 'POST',
          reactionType: 'DISLIKE',
          userEmail: email
        };
        await fetch(API_ENDPOINTS.REACTIONS_DELETE, {
          method: 'POST',
          headers: createAuthHeaders(token),
          body: JSON.stringify(removeRequest)
        });
        setIsDisliked(false);
        setDislikeCount(prev => Math.max(0, prev - 1));
      } else {
        const response = await fetch(API_ENDPOINTS.REACTIONS_ADD, {
          method: 'POST',
          headers: createAuthHeaders(token, { 'Content-Type': 'application/json' }),
          body: JSON.stringify(reactionRequest),
        });
        if (response.ok) {
          setIsDisliked(true);
          setDislikeCount(prev => prev + 1);
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

  const fetchDislikeCount = async () => {
    try {
      // No authentication required for public dislike count
      const response = await fetch(API_ENDPOINTS.REACTIONS_POST_DISLIKE_COUNT(post.forumPostId));
      if (response.ok) {
        const count = await response.json();
        setDislikeCount(count);
      }
    } catch (error) {
      console.error('Error fetching dislike count:', error);
    }
  };

  const checkIfSaved = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const email = user?.email || localStorage.getItem('email') || '';
      
      const response = await fetch(API_ENDPOINTS.SAVED_POSTS_CHECK(post.forumPostId), {
        headers: {
          'User-Email': email,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.result || false);
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
    const token = getToken();
    const email = user?.email || localStorage.getItem('email') || '';
    
    if (!email) {
      alert(t('forum.errors.unauthorized'));
      return;
    }
    
    try {
      if (isSaved) {
        // Unsave post
        const response = await fetch(API_ENDPOINTS.SAVED_POSTS_UNSAVE(post.forumPostId), {
          method: 'DELETE',
          headers: createAuthHeaders(token, { 'User-Email': email })
        });
        
        if (response.ok) {
          setIsSaved(false);
          setSaveCount(prev => Math.max(0, prev - 1));
        }
      } else {
        // Save post
        const response = await fetch(API_ENDPOINTS.SAVED_POSTS_SAVE, {
          method: 'POST',
          headers: createAuthHeaders(token, { 'User-Email': email }),
          body: JSON.stringify({
            postId: post.forumPostId,
            note: ''
          })
        });
        
        if (response.ok) {
          setIsSaved(true);
          setSaveCount(prev => prev + 1);
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
      const token = getToken();
      const response = await fetch(`${API_ENDPOINTS.POST_BY_ID(post.forumPostId)}?userEmail=${encodeURIComponent(user.email)}`, {
        method: 'DELETE',
        headers: createAuthHeaders(token)
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
      const token = getToken();
      const email = user?.email || localStorage.getItem('email') || '';
      
      if (!email) {
        throw new Error(t('forum.errors.unauthorized'));
      }

      const response = await fetch(`${API_ENDPOINTS.REPORTS_CREATE}?userEmail=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: createAuthHeaders(token),
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

  // Cache for resolved image URLs to avoid repeated processing
  const imageUrlCache = useRef(new Map());
  
  const resolveImageUrl = (imgPath) => {
    if (!imgPath) return '';
    if (typeof imgPath !== 'string') return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
    
    // Check cache first
    if (imageUrlCache.current.has(imgPath)) {
      return imageUrlCache.current.get(imgPath);
    }
    
    const normalized = imgPath.startsWith('/') ? imgPath : `/${imgPath}`;
    const resolvedUrl = getImageUrl(normalized);
    
    // Cache the resolved URL
    imageUrlCache.current.set(imgPath, resolvedUrl);
    return resolvedUrl;
  };

  const defaultAvatar = '/default-avatar.png';

  // Function to render content with clickable links
  const renderContentWithLinks = (content) => {
    if (!content) return '';
    
    return content.split(/(\s+)/).map((part, index) => {
      const isUrl = /^https?:\/\/.+/.test(part.trim());
      if (isUrl) {
        return (
          <a 
            key={index}
            href={part.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className={styles['content-link']}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const renderImages = () => {
    // Show loading skeleton for tour link preview
    if (isLoadingTourPreview) {
      return (
        <div className={styles['pc-link-card']} style={{cursor: 'default'}}>
          <div className={styles['pc-link-thumb']}>
            <div className={styles['pc-link-thumb-placeholder']} style={{animation: 'pulse 1.5s ease-in-out infinite'}}>
              <div style={{width: '100%', height: '100%', backgroundColor: '#f0f0f0', borderRadius: '8px'}}></div>
            </div>
          </div>
          <div className={styles['pc-link-meta']}>
            <div className={styles['pc-link-title']} style={{backgroundColor: '#f0f0f0', height: '20px', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite'}}></div>
            <div className={styles['pc-link-desc']} style={{backgroundColor: '#f0f0f0', height: '16px', borderRadius: '4px', marginTop: '8px', animation: 'pulse 1.5s ease-in-out infinite'}}></div>
          </div>
        </div>
      );
    }
    
    // If there is a tour link preview, show it as a link card before normal images
    if (tourLinkPreview) {
      return (
        <div className={styles['pc-link-card']} onClick={() => navigate(`/tour/${tourLinkPreview.id}`)} style={{cursor: 'pointer'}}>
          <div className={styles['pc-link-thumb']}>
            {tourLinkPreview.image ? (
              <img 
                src={tourLinkPreview.image} 
                alt={tourLinkPreview.title}
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className={styles['pc-link-thumb-placeholder']}>LINK</div>
            )}
          </div>
          <div className={styles['pc-link-meta']}>
            <div className={styles['pc-link-title']}>{tourLinkPreview.title}</div>
            <div className={styles['pc-link-desc']}>{tourLinkPreview.summary}</div>
          </div>
        </div>
      );
    }
    if (!post.images || post.images.length === 0) return null;
    const imgs = post.images.map((img) => {
      // Handle both object format {imgPath: "..."} and string format
      const imgPath = typeof img === 'string' ? img : img.imgPath;
      const resolvedUrl = resolveImageUrl(imgPath);
      return resolvedUrl;
    }).filter(Boolean);
    const count = imgs.length;

    if (count === 1) {
      return (
        <div className={`${styles['pc-images']} ${styles['one']}`}>
          <img 
            src={imgs[0]} 
            alt="Post image" 
            className={`${styles['pc-img']} ${styles['main']}`} 
            loading="eager"
            decoding="async"
            onClick={() => { setViewerIndex(0); setOpenViewer(true); }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className={`${styles['pc-images']} ${styles['two']}`}>
          <img 
            src={imgs[0]} 
            alt="Post image 1" 
            className={styles['pc-img']} 
            loading="eager"
            decoding="async"
            onClick={() => { setViewerIndex(0); setOpenViewer(true); }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <img 
            src={imgs[1]} 
            alt="Post image 2" 
            className={styles['pc-img']} 
            loading="eager"
            decoding="async"
            onClick={() => { setViewerIndex(1); setOpenViewer(true); }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // 3 or more: one big on top, three small below (like collage)
    const rest = imgs.slice(1, 4);
    const remaining = count - 4;
    return (
      <div className={`${styles['pc-images']} ${styles['collage']}`}>
        <img 
          src={imgs[0]} 
          alt="Post image main" 
          className={`${styles['pc-img']} ${styles['main']}`} 
          loading="eager"
          decoding="async"
          onClick={() => { setViewerIndex(0); setOpenViewer(true); }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div className={styles['pc-thumbs']}>
          {rest.map((src, idx) => (
            <div key={idx} className={styles['pc-thumb-wrap']}>
              <img 
                src={src} 
                alt={`Post image ${idx + 2}`} 
                className={`${styles['pc-img']} ${styles['thumb']}`} 
                loading={idx < 2 ? "eager" : "lazy"}
                decoding="async"
                onClick={() => { setViewerIndex(idx + 1); setOpenViewer(true); }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {idx === rest.length - 1 && remaining > 0 && (
                <div className={styles['pc-more-overlay']}>+{remaining}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
    <div className={styles['post-card']} id={`post-${post.postId}`}>
      <div className={styles['post-header']}>
        <div className={styles['post-user-info']}>
          <img 
            src={resolveImageUrl(post.userAvatar) || defaultAvatar} 
            alt={post.username}
            className={styles['user-avatar']}
          />
          <div className={styles['user-details']}>
            <div className={styles['username']}>{post.username}</div>
            <div className={styles['post-time']}>{formatTime(post.createdAt)}</div>
          </div>
        </div>
        
        <div className={styles['post-actions-header']}>
          <div className={styles['save-section']}>
            {user ? (
              <button 
                onClick={handleSavePost} 
                className={`${styles['save-btn']} ${isSaved ? styles['saved'] : ''}`}
                title={isSaved ? t('forum.post.unsave') : t('forum.post.save')}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  className={styles['bookmark-icon']}
                >
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </button>
            ) : (
              <div 
                className={styles['save-btn-disabled']} 
                title={t('forum.guest.loginToSave')}
                onClick={() => setShowLoginRequiredModal(true)}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  className={styles['bookmark-icon']}
                >
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
            )}
            <span className={styles['save-count']}>{saveCount}</span>
          </div>
          
          <div className={styles['post-menu']} ref={postMenuRef}>
            <button 
              className={styles['menu-btn']}
              onClick={() => setShowMenu(!showMenu)}
            >
              ⋯
            </button>
            
            {showMenu && (
              <div className={styles['menu-dropdown']}>
                {isOwnPost ? (
                  <>
                    <button onClick={handleEdit} className={styles['menu-item']}>
                      ✏️ {t('forum.post.edit')}
                    </button>
                    <button onClick={handleDelete} className={`${styles['menu-item']} ${styles['delete']}`}>
                      🗑️ {t('forum.post.delete')}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleReport} 
                    className={`${styles['menu-item']} ${hasReported ? styles['reported'] : ''}`}
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

      <div className={styles['post-content']}>
        {post.title && (
          <h3 className={styles['post-title']}>{post.title}</h3>
        )}
         <p className={styles['post-text']}>
           {renderContentWithLinks(
             String(post.content || '')
               .split(/\n+/)
               .filter(line => !line.trim().match(new RegExp(`^(?:${BaseURL.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')})?/tour/\\d+$`)))
               .join('\n')
           )}
         </p>
        
        {post.hashtags && post.hashtags.length > 0 && (
          <div className={styles['post-hashtags']}>
            {post.hashtags.map((tag, index) => (
              <span 
                key={index} 
                className={styles['hashtag']}
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

      <div className={styles['post-stats']}>
        <div className={styles['stat-item']}>
          <span className={styles['stat-count']}>{likeCount} {t('forum.post.like')}</span>
        </div>
        <div className={styles['stat-item']}>
          <span className={styles['stat-count']}>{dislikeCount} {t('forum.post.dislike')}</span>
        </div>
        <div className={styles['stat-item']}>
          <span className={styles['stat-count']}>{commentCount} {t('forum.post.comments')}</span>
        </div>
      </div>

      <div className={styles['post-actions']}>
        {user ? (
          <>
            <button 
              className={`${styles['action-btn']} ${styles['like-btn']} ${isLiked ? styles['active'] : ''}`}
              onClick={handleLike}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className={styles['action-icon']}
              >
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
              </svg>
              <span className={styles['action-text']}>{t('forum.post.like')}</span>
            </button>
            <button 
              className={`${styles['action-btn']} ${styles['dislike-btn']} ${isDisliked ? styles['active'] : ''}`}
              onClick={handleDislike}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className={styles['action-icon']}
              >
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
              </svg>
              <span className={styles['action-text']}>{t('forum.post.dislike')}</span>
            </button>
            
            <button 
              className={`${styles['action-btn']} ${styles['comment-btn']}`}
              onClick={() => setShowCommentInput(!showCommentInput)}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className={styles['action-icon']}
              >
                <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"/>
              </svg>
              <span className={styles['action-text']}>{t('forum.post.comment')}</span>
            </button>
          </>
        ) : (
          <div className={styles['guest-actions']}>
            <div 
              className={`${styles['action-btn-disabled']} ${styles['like-btn-disabled']}`} 
              title={t('forum.guest.loginToReact')}
              onClick={() => setShowLoginRequiredModal(true)}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className={styles['action-icon']}
              >
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
              </svg>
              <span className={styles['action-text']}>{t('forum.post.like')}</span>
            </div>
            <div 
              className={`${styles['action-btn-disabled']} ${styles['dislike-btn-disabled']}`} 
              title={t('forum.guest.loginToReact')}
              onClick={() => setShowLoginRequiredModal(true)}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className={styles['action-icon']}
              >
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
              </svg>
              <span className={styles['action-text']}>{t('forum.post.dislike')}</span>
            </div>
            <div 
              className={`${styles['action-btn-disabled']} ${styles['comment-btn-disabled']}`} 
              title={t('forum.guest.loginToComment')}
              onClick={() => setShowLoginRequiredModal(true)}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className={styles['action-icon']}
              >
                <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"/>
              </svg>
              <span className={styles['action-text']}>{t('forum.post.comment')}</span>
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
      title={"Xác nhận xóa bài viết"}
      message={"Bạn có chắc chắn muốn xóa bài viết này?"}
    />
    </>
  );
};

export default PostCard;
