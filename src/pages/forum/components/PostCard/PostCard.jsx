import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { API_ENDPOINTS, getImageUrl, createAuthHeaders, FrontendURL, getApiPath, BaseURL } from '../../../../config/api';
import { useNavigate } from 'react-router-dom';
import { checkAndHandle401 } from '../../../../utils/apiErrorHandler';
import CommentSection from '../CommentSection/CommentSection';
import ImageViewerModal from '../ImageViewerModal/ImageViewerModal';
import ReportModal from '../ReportModal/ReportModal';
import ReportSuccessModal from '../ReportSuccessModal/ReportSuccessModal';
import UserHoverCard from '../UserHoverCard/UserHoverCard';
import { DeleteConfirmModal, LoginRequiredModal } from '../../../../components';
import BanReasonModal from '../../../../components/modals/BanReasonModal/BanReasonModal';
import {
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  Edit3,
  Trash2,
  Flag,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ShieldOff
} from 'lucide-react';
import styles from './PostCard.module.css';

const PostCard = memo(({ post, onPostDeleted, onEdit, onHashtagClick, isFirstPost = false, highlightPostId = null, highlightCommentId = null, isAdminStaffView = false }) => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const postMenuRef = useRef(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(
    post.reactions?.likeCount ?? 0
  );
  const [dislikeCount, setDislikeCount] = useState(
    post.reactions?.dislikeCount ?? 0
  );
  const [commentCount, setCommentCount] = useState(post.comments?.length || 0);
  const [openViewer, setOpenViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(post.saveCount || 0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [showAdminDeleteModal, setShowAdminDeleteModal] = useState(false);
  const [tourLinkPreview, setTourLinkPreview] = useState(null);
  const [isLoadingTourPreview, setIsLoadingTourPreview] = useState(false);
  const userInfoRef = useRef(null);
  const imageContainerRef = useRef(null);
  const [imagesInViewport, setImagesInViewport] = useState(isFirstPost);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [showTranslated, setShowTranslated] = useState(false);
  const [translateError, setTranslateError] = useState('');
  const [showAllHashtags, setShowAllHashtags] = useState(false);

  // Cache cho resolved image URLs để tránh repeated processing: sử dụng Map để cache resolved URLs
  const imageUrlCache = useRef(new Map());

  // Resolve image URL helper function: trim dấu / ở đầu nếu có (fix lỗi Backend normalize URL Azure), check cache trước, normalize path và resolve bằng getImageUrl, cache resolved URL
  const resolveImageUrl = (imgPath) => {
    if (!imgPath) return '';
    if (typeof imgPath !== 'string') return '';

    const trimmed = imgPath.trim();
    if (trimmed.startsWith('/https://') || trimmed.startsWith('/http://')) {
      return trimmed.substring(1);
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

    if (imageUrlCache.current.has(imgPath)) {
      return imageUrlCache.current.get(imgPath);
    }

    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const resolvedUrl = getImageUrl(normalized);

    imageUrlCache.current.set(imgPath, resolvedUrl);
    return resolvedUrl;
  };

  // Resolve image URLs immediately on mount to avoid re-render delay
  const initialImageSources = useMemo(() => {
    if (post.images && post.images.length > 0) {
      return post.images.map((img) => {
        const imgPath = typeof img === 'string' ? img : img.imgPath;
        return resolveImageUrl(imgPath);
      }).filter(Boolean);
    }
    return [];
  }, [post.images]);

  const [imageSources, setImageSources] = useState(initialImageSources);

  // Update image sources khi post images thay đổi (ví dụ sau khi edit): sync imageSources với initialImageSources
  useEffect(() => {
    setImageSources(initialImageSources);
  }, [initialImageSources]);

  // Update state values khi post data thay đổi (ví dụ sau khi edit): update likeCount, dislikeCount, saveCount, commentCount từ post data
  useEffect(() => {
    if (post.reactions?.likeCount !== undefined && post.reactions.likeCount !== null) {
      setLikeCount(post.reactions.likeCount);
    }
    if (post.reactions?.dislikeCount !== undefined && post.reactions.dislikeCount !== null) {
      setDislikeCount(post.reactions.dislikeCount);
    }

    if (post.saveCount !== undefined && post.saveCount !== null) {
      setSaveCount(post.saveCount);
    }

    if (post.comments !== undefined) {
      setCommentCount(post.comments.length || 0);
    }
  }, [post.reactions?.likeCount, post.reactions?.dislikeCount, post.saveCount, post.comments?.length]);

  // Reset translation state khi post content thay đổi (ví dụ sau khi edit): clear translatedText, showTranslated, translateError
  useEffect(() => {
    setTranslatedText('');
    setShowTranslated(false);
    setTranslateError('');
  }, [post.content]);

  // Load reaction summary và user data: sử dụng initial data từ API response nếu có, chỉ fetch nếu missing, set user reaction từ initial data nếu có, fetch save count nếu không có trong initial data, check user-specific data (saved, reported) nếu user logged in (defer với requestIdleCallback)
  useEffect(() => {
    const hasReactionData = post.reactions && (
      (post.reactions.likeCount !== undefined && post.reactions.likeCount !== null) ||
      (post.reactions.dislikeCount !== undefined && post.reactions.dislikeCount !== null)
    );

    if (!hasReactionData || (user && !post.reactions?.userReaction)) {
      fetchReactionSummary();
    } else if (post.reactions?.userReaction && user) {
      setIsLiked(post.reactions.userReaction === 'LIKE');
      setIsDisliked(post.reactions.userReaction === 'DISLIKE');
    }

    if (post.saveCount === undefined || post.saveCount === null) {
      fetchSaveCount();
    }

    if (user) {
      const fetchUserData = () => {
        checkIfSaved();
        checkIfReported();
      };

      if (window.requestIdleCallback) {
        window.requestIdleCallback(fetchUserData, { timeout: 2000 });
      } else {
        setTimeout(fetchUserData, 100);
      }
    }
  }, [post.forumPostId, user?.email]);

  // Intersection Observer for preloading images - images are already resolved, just preload
  useEffect(() => {
    if (isFirstPost || imagesInViewport) {
      // For first post or already loaded, preload images immediately
      if (initialImageSources.length > 0) {
        initialImageSources.forEach((url) => {
          if (url) {
            const imagePreload = new Image();
            imagePreload.src = url;
          }
        });
        setImagesInViewport(true);
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (initialImageSources.length > 0) {
              initialImageSources.forEach((url) => {
                if (url) {
                  const imagePreload = new Image();
                  imagePreload.src = url;
                }
              });
              setImageSources(initialImageSources);
            }
            setImagesInViewport(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '500px', // Start loading earlier for better UX
        threshold: 0.01
      }
    );

    if (imageContainerRef.current) {
      observer.observe(imageContainerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [isFirstPost, imagesInViewport, initialImageSources]);

  // Extract tour ID immediately on mount (synchronous, no delay)
  const tourId = useMemo(() => {
    try {
      const meta = post.metadata || post.meta || null;
      let match = null;
      if (meta && meta.linkType === 'TOUR' && (meta.linkRefId || meta.linkUrl)) {
        const urlStr = String(meta.linkUrl || '');
        const idFromMeta = meta.linkRefId ||
          urlStr.match(/\/tour\/detail[?&]id=(\d+)/)?.[1] ||
          urlStr.match(/\/tour\/(\d+)/)?.[1];
        if (idFromMeta) return idFromMeta;
      }
      const text = String(post.content || '');
      const escapedBase = FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regexOld = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/(\\d+)(?:[\\s\\?&#]|$)`, 'i');
      const regexNew = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/detail[?&]id=(\\d+)(?:[\\s&#]|$)`, 'i');
      match = text.match(regexNew) || text.match(regexOld);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }, [post.content, post.metadata]);

  // Set loading state ngay nếu tour ID tồn tại (cho skeleton display): set isLoadingTourPreview = true nếu có tourId, nếu không thì clear tourLinkPreview
  useEffect(() => {
    if (tourId) {
      setIsLoadingTourPreview(true);
    } else {
      setIsLoadingTourPreview(false);
      setTourLinkPreview(null);
    }
  }, [tourId]);

  // Load tour preview ngay nếu tour ID được detect: gọi TOUR_PREVIEW_BY_ID endpoint, preload tour preview image ngay, cho first post hoặc posts trong viewport thì load ngay, cho posts khác thì load trong next microtask
  useEffect(() => {
    if (!tourId) return;

    const loadTourPreview = () => {
      fetch(API_ENDPOINTS.TOUR_PREVIEW_BY_ID(tourId))
        .then(r => (r.ok ? r.json() : Promise.reject()))
        .then(data => {
          const imageUrl = getImageUrl(data.thumbnailUrl || data.tourImgPath);
          const preview = {
            id: tourId,
            title: data.title || data.tourName,
            summary: data.summary || data.tourDescription,
            image: imageUrl
          };

          if (imageUrl) {
            const img = new Image();
            img.src = imageUrl;
          }

          setTourLinkPreview(preview);
        })
        .catch(() => setTourLinkPreview(null))
        .finally(() => setIsLoadingTourPreview(false));
    };

    if (isFirstPost || imagesInViewport) {
      loadTourPreview();
    } else {
      Promise.resolve().then(loadTourPreview);
    }
  }, [tourId, isFirstPost, imagesInViewport]);

  // Preload images immediately for visible posts
  useEffect(() => {
    if (initialImageSources.length > 0 && (isFirstPost || imagesInViewport)) {
      initialImageSources.forEach((url) => {
        if (url) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = url;
          document.head.appendChild(link);
        }
      });
    }
  }, [initialImageSources, isFirstPost, imagesInViewport]);

  // Đóng menu khi click outside: lắng nghe mousedown event trên document, check nếu click không phải trong postMenuRef thì đóng menu
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

  // Check if user can manage forum reports (admin/staff)
  const canManageForumReports = user?.role === 'ADMIN' ||
    (user?.role === 'STAFF' && user?.staffTask === 'FORUM_REPORT_AND_BOOKING_COMPLAINT');

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
        const response = await fetch(API_ENDPOINTS.REACTIONS_ADD, {
          method: 'POST',
          headers: createAuthHeaders(token, { 'Content-Type': 'application/json' }),
          body: JSON.stringify(reactionRequest),
        });

        if (!response.ok && response.status === 401) {
          await checkAndHandle401(response);
          return;
        }

        if (response.ok) {
          setIsLiked(true);
          if (isDisliked) {
            setIsDisliked(false);
            setDislikeCount(prev => Math.max(0, prev - 1));
          }
          setLikeCount(prev => prev + 1);
        }
      }
    } catch (error) {
      // Silently handle error
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

        if (!response.ok && response.status === 401) {
          await checkAndHandle401(response);
          return;
        }

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
      // Silently handle error
    }
  };

  const handleCommentAdded = (comment) => {
    setCommentCount(prev => prev + 1);
  };

  const handleCommentCountChange = (count) => {
    setCommentCount(count);
  };

  // Fetch reaction summary từ API: gọi REACTIONS_POST_SUMMARY endpoint (không cần authentication cho public summary), set likeCount, dislikeCount, set user reaction status nếu user logged in
  const fetchReactionSummary = async () => {
    try {
      const userEmail = user?.email || null;
      const response = await fetch(API_ENDPOINTS.REACTIONS_POST_SUMMARY(post.forumPostId, userEmail));
      if (response.ok) {
        const summary = await response.json();
        setLikeCount(summary.likeCount || 0);
        setDislikeCount(summary.dislikeCount || 0);

        // Set user's reaction status if logged in
        if (user && summary.userReaction) {
          setIsLiked(summary.userReaction === 'LIKE');
          setIsDisliked(summary.userReaction === 'DISLIKE');
        }
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Check nếu post đã được save: gọi SAVED_POSTS_CHECK endpoint, set isSaved state
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
      // Silently handle error
    }
  };

  // Fetch save count từ API: gọi SAVED_POSTS_COUNT endpoint (không cần authentication cho public count), set saveCount state
  const fetchSaveCount = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.SAVED_POSTS_COUNT(post.forumPostId));
      if (response.ok) {
        const data = await response.json();
        setSaveCount(data.result || 0);
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Check nếu post đã được report: gọi REPORTS_CHECK endpoint với targetType=POST và targetId, set hasReported state
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
      // Silently handle error
    }
  };

  // Xử lý save post: nếu isSaved = true thì unsave (gọi SAVED_POSTS_UNSAVE với DELETE), nếu false thì save (gọi SAVED_POSTS_SAVE với POST), update isSaved và saveCount state, dispatch 'post-unsaved' event nếu unsave, handle 401
  const handleSavePost = async () => {
    if (!user) {
      return;
    }

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

        if (!response.ok && response.status === 401) {
          await checkAndHandle401(response);
          return;
        }

        if (response.ok) {
          setIsSaved(false);
          setSaveCount(prev => Math.max(0, prev - 1));
        }
      } else {
        const response = await fetch(API_ENDPOINTS.SAVED_POSTS_SAVE, {
          method: 'POST',
          headers: createAuthHeaders(token, { 'User-Email': email }),
          body: JSON.stringify({
            postId: post.forumPostId,
            note: ''
          })
        });

        // Handle 401 if token expired
        if (!response.ok && response.status === 401) {
          await checkAndHandle401(response);
          return;
        }

        if (response.ok) {
          setIsSaved(true);
          setSaveCount(prev => prev + 1);
        }
      }
    } catch (error) {
      // Silently handle error
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
        throw new Error('Failed to delete post');
      }
    } catch (error) {
      // Silently handle error deleting post
      alert(t('forum.post.deleteError'));
    }
  };

  // Handle ban user (admin/staff only)
  const handleBan = () => {
    setBanModalOpen(true);
    setShowMenu(false);
  };

  const handleBanConfirm = async (banReason) => {
    if (!post?.userId || !user) return;

    try {
      const token = getToken();
      const response = await fetch(`${BaseURL}/api/staff/ban-user/${post.userId}`, {
        method: 'PUT',
        headers: createAuthHeaders(token),
        body: JSON.stringify({
          ban: true,
          banReason: banReason || null
        })
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        alert(t('admin.customerManagement.banSuccess') || 'Đã ban người dùng thành công');
        setBanModalOpen(false);
      } else {
        const errorText = await response.text();
        alert(t('admin.customerManagement.banError', { error: errorText }) || 'Có lỗi xảy ra khi ban người dùng');
      }
    } catch (error) {
      alert(t('admin.customerManagement.banError') || 'Có lỗi xảy ra khi ban người dùng');
    }
  };

  // Handle delete post (admin/staff only)
  const handleAdminDelete = () => {
    setShowAdminDeleteModal(true);
    setShowMenu(false);
  };

  const handleMenuClick = () => {
    // Guests should be prompted to log in instead of being unable to open the menu
    if (!user) {
      setShowMenu(false);
      setShowLoginRequiredModal(true);
      return;
    }
    setShowMenu((prev) => !prev);
  };

  const handleAdminDeleteConfirm = async () => {
    if (!post || !user) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_ENDPOINTS.POST_BY_ID(post.forumPostId)}?userEmail=${encodeURIComponent(user.email)}`, {
        method: 'DELETE',
        headers: createAuthHeaders(token),
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        onPostDeleted(post.forumPostId);
        setShowAdminDeleteModal(false);
        alert(t('forum.post.deleteSuccess') || 'Đã xóa bài viết thành công');
      } else {
        alert(t('forum.post.deleteError') || 'Có lỗi xảy ra khi xóa bài viết');
      }
    } catch (error) {
      alert(t('forum.post.deleteError') || 'Có lỗi xảy ra khi xóa bài viết');
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

      // Update reported status
      setHasReported(true);

      // Show success modal
      setShowReportSuccess(true);

    } catch (error) {
      // Silently handle error reporting post
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

  const defaultAvatar = '/default-avatar.png';

  const allHashtags = Array.isArray(post.hashtags) ? post.hashtags : [];
  const MAX_VISIBLE_HASHTAGS = 6;
  const visibleHashtags = showAllHashtags ? allHashtags : allHashtags.slice(0, MAX_VISIBLE_HASHTAGS);
  const hasMoreHashtags = allHashtags.length > MAX_VISIBLE_HASHTAGS;

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

  const handleTranslateClick = async () => {
    if (!post?.content || isTranslating) return;

    // Nếu đã có bản dịch rồi thì chỉ toggle hiển thị
    if (translatedText && showTranslated) {
      setShowTranslated(false);
      return;
    }
    
    // Nếu đã có bản dịch nhưng đang ẩn, hiển thị lại
    if (translatedText && !showTranslated) {
      setShowTranslated(true);
      return;
    }

    try {
      setIsTranslating(true);
      setTranslateError('');
      // Reset translation state trước khi fetch mới
      setTranslatedText('');
      setShowTranslated(false);

      const response = await fetch(
        getApiPath('/api/gemini/translate'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          body: JSON.stringify({ text: post.content }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translate failed with status ${response.status}: ${errorText}`);
      }

      // Spring trả về String sẽ được serialize thành JSON string, cần parse
      // Lấy response text trước (vì body chỉ đọc được một lần)
      const responseText = await response.text();
      let translatedContent = '';
      
      try {
        // Thử parse JSON trước (Spring thường trả về JSON string)
        const jsonData = JSON.parse(responseText);
        translatedContent = typeof jsonData === 'string' ? jsonData : (jsonData.text || jsonData.result || String(jsonData));
      } catch {
        // Nếu không phải JSON hợp lệ, sử dụng text trực tiếp
        translatedContent = responseText;
      }

      // Loại bỏ quotes nếu có (Spring serialize String thành JSON string)
      translatedContent = String(translatedContent).trim();
      if ((translatedContent.startsWith('"') && translatedContent.endsWith('"')) || 
          (translatedContent.startsWith("'") && translatedContent.endsWith("'"))) {
        translatedContent = translatedContent.slice(1, -1).trim();
      }

      // Loại bỏ escape characters
      translatedContent = translatedContent.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\t/g, '\t');

      if (!translatedContent) {
        throw new Error('Empty translation response');
      }

      setTranslatedText(translatedContent);
      setShowTranslated(true);
    } catch {
      setTranslateError('Không thể dịch nội dung. Vui lòng thử lại sau.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Helper function to filter out tour URLs from content
  const filterTourUrlsFromContent = (content) => {
    if (!content) return '';
    
    const escapedBase = FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match format 1: /tour/123 or http://domain/tour/123 (có thể ở đầu hoặc giữa dòng)
    const regexOld = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/\\d+(?:[\\s\\?&#]|$)`, 'gi');
    // Match format 2: /tour/detail?id=123 or http://domain/tour/detail?id=123 (có thể ở đầu hoặc giữa dòng)
    const regexNew = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/detail[?&]id=\\d+(?:[\\s&#]|$)`, 'gi');
    
    let filteredContent = String(content);
    
    // Loại bỏ các tour URL khỏi content
    filteredContent = filteredContent.replace(regexOld, '').replace(regexNew, '');
    
    // Loại bỏ các dòng chỉ chứa URL hoặc rỗng
    return filteredContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        // Kiểm tra lại xem dòng có chứa tour URL không
        return !trimmed.match(regexOld) && !trimmed.match(regexNew);
      })
      .join('\n')
      .trim();
  };

  const handleTranslateTourClick = async () => {
    if (!post?.content || isTranslating) return;

    // Nếu đã có bản dịch rồi thì chỉ toggle hiển thị
    if (translatedText && showTranslated) {
      setShowTranslated(false);
      return;
    }
    
    // Nếu đã có bản dịch nhưng đang ẩn, hiển thị lại
    if (translatedText && !showTranslated) {
      setShowTranslated(true);
      return;
    }

    try {
      setIsTranslating(true);
      setTranslateError('');
      // Reset translation state trước khi fetch mới
      setTranslatedText('');
      setShowTranslated(false);

      // Filter out tour URLs from content before translating
      const contentToTranslate = filterTourUrlsFromContent(post.content);
      
      if (!contentToTranslate || !contentToTranslate.trim()) {
        setTranslateError('Không có nội dung để dịch.');
        setIsTranslating(false);
        return;
      }

      const response = await fetch(
        getApiPath('/api/gemini/translate'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          body: JSON.stringify({ text: contentToTranslate }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translate failed with status ${response.status}: ${errorText}`);
      }

      // Xử lý response - Spring trả về String sẽ được serialize thành JSON string
      // Lấy response text trước (vì body chỉ đọc được một lần)
      const responseText = await response.text();
      let translatedContent = '';
      
      try {
        // Thử parse JSON trước (Spring thường trả về JSON string)
        const jsonData = JSON.parse(responseText);
        translatedContent = typeof jsonData === 'string' ? jsonData : (jsonData.text || jsonData.result || String(jsonData));
      } catch {
        // Nếu không phải JSON hợp lệ, sử dụng text trực tiếp
        translatedContent = responseText;
      }

      // Clean up response - loại bỏ quotes nếu có và trim
      translatedContent = String(translatedContent).trim();
      
      // Loại bỏ quotes ở đầu và cuối nếu response bị wrap trong quotes
      if ((translatedContent.startsWith('"') && translatedContent.endsWith('"')) || 
          (translatedContent.startsWith("'") && translatedContent.endsWith("'"))) {
        translatedContent = translatedContent.slice(1, -1).trim();
      }
      
      // Loại bỏ các escape characters nếu có
      translatedContent = translatedContent.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\t/g, '\t');

      // Đảm bảo không có tour URL trong bản dịch (double check)
      const escapedBase = FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const urlRegex = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/(?:detail[?&]id=|)\\d+`, 'gi');
      translatedContent = translatedContent.replace(urlRegex, '').trim();

      if (!translatedContent) {
        throw new Error('Empty translation response');
      }

      setTranslatedText(translatedContent);
      setShowTranslated(true);
    } catch {
      setTranslateError('Không thể dịch nội dung. Vui lòng thử lại sau.');
    } finally {
      setIsTranslating(false);
    }
  };

  const renderImages = () => {
    // Show tour preview (with skeleton if loading) or normal images
    // If tour ID exists, show tour preview area (either loading skeleton or actual preview)
    if (tourId) {
      // Show loading skeleton while fetching
      if (isLoadingTourPreview || !tourLinkPreview) {
        return (
          <div className={styles['pc-link-card']} style={{ cursor: 'default' }}>
            <div className={styles['pc-link-thumb']}>
              <div className={styles['pc-link-thumb-placeholder']} style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
                <div style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0', borderRadius: '8px' }}></div>
              </div>
            </div>
            <div className={styles['pc-link-meta']}>
              <div className={styles['pc-link-title']} style={{ backgroundColor: '#f0f0f0', height: '20px', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
              <div className={styles['pc-link-desc']} style={{ backgroundColor: '#f0f0f0', height: '16px', borderRadius: '4px', marginTop: '8px', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
            </div>
          </div>
        );
      }

      // Show actual tour preview
      if (tourLinkPreview) {
        return (
          <div className={styles['pc-link-card']} onClick={() => navigate(`/tour/detail?id=${tourLinkPreview.id}`)} style={{ cursor: 'pointer' }}>
            <div className={styles['pc-link-thumb']}>
              {tourLinkPreview.image ? (
                <img
                  src={tourLinkPreview.image}
                  alt={tourLinkPreview.title}
                  loading={isFirstPost ? "eager" : "lazy"}
                  decoding="async"
                  onError={(e) => {
                    e.target.src = '/default-Tour.jpg';
                  }}
                />
              ) : (
                <div className={styles['pc-link-thumb-placeholder']}>LINK</div>
              )}
            </div>
            <div className={styles['pc-link-meta']}>
              <div className={styles['pc-link-title']}>
                {tourLinkPreview.title}
              </div>
              <div className={styles['pc-link-desc']}>
                {tourLinkPreview.summary}
              </div>
            </div>
          </div>
        );
      }
    }
    if (!post.images || post.images.length === 0) return null;

    // Use resolved image sources (already resolved in useMemo)
    const imgs = imageSources.length > 0 ? imageSources : initialImageSources;
    const count = imgs.length;

    if (count === 1) {
      const shouldEagerLoad = isFirstPost || imagesInViewport;
      return (
        <div className={`${styles['pc-images']} ${styles['one']}`} ref={imageContainerRef}>
          {imgs[0] ? (
            <img
              src={imgs[0]}
              alt="Post image"
              className={`${styles['pc-img']} ${styles['main']}`}
              loading={shouldEagerLoad ? "eager" : undefined}
              fetchPriority={shouldEagerLoad && isFirstPost ? "high" : "auto"}
              decoding="async"
              onClick={() => { setViewerIndex(0); setOpenViewer(true); }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
        </div>
      );
    }

    if (count === 2) {
      const shouldEagerLoad = isFirstPost || imagesInViewport;
      return (
        <div className={`${styles['pc-images']} ${styles['two']}`} ref={imageContainerRef}>
          {imgs[0] ? (
            <img
              src={imgs[0]}
              alt="Post image 1"
              className={styles['pc-img']}
              loading={shouldEagerLoad ? "eager" : undefined}
              fetchPriority={shouldEagerLoad && isFirstPost ? "high" : "auto"}
              decoding="async"
              onClick={() => { setViewerIndex(0); setOpenViewer(true); }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
          {imgs[1] ? (
            <img
              src={imgs[1]}
              alt="Post image 2"
              className={styles['pc-img']}
              loading={shouldEagerLoad ? "eager" : undefined}
              decoding="async"
              onClick={() => { setViewerIndex(1); setOpenViewer(true); }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
        </div>
      );
    }

    // 3 or more: one big on top, three small below (like collage)
    const rest = imgs.slice(1, 4);
    const remaining = count - 4;
    const shouldEagerLoad = isFirstPost || imagesInViewport;
    return (
      <div className={`${styles['pc-images']} ${styles['collage']}`} ref={imageContainerRef}>
        {imgs[0] ? (
          <img
            src={imgs[0]}
            alt="Post image main"
            className={`${styles['pc-img']} ${styles['main']}`}
            loading={shouldEagerLoad ? "eager" : undefined}
            fetchPriority={shouldEagerLoad && isFirstPost ? "high" : "auto"}
            decoding="async"
            onClick={() => { setViewerIndex(0); setOpenViewer(true); }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : null}
        <div className={styles['pc-thumbs']}>
          {rest.map((src, idx) => (
            src ? (
              <div key={idx} className={styles['pc-thumb-wrap']}>
                <img
                  src={src}
                  alt={`Post image ${idx + 2}`}
                  className={`${styles['pc-img']} ${styles['thumb']}`}
                  loading={shouldEagerLoad ? "eager" : undefined}
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
            ) : null
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={styles['post-card']} id={`post-${post.forumPostId}`} data-highlight={highlightPostId && String(highlightPostId) === String(post.forumPostId) ? 'true' : 'false'} data-admin-staff-view={isAdminStaffView ? 'true' : 'false'}>
        <div className={styles['post-header']}>
          <div className={styles['post-user-info']} ref={userInfoRef}>
            <img
              src={resolveImageUrl(post.userAvatar) || defaultAvatar}
              alt={post.username}
              className={styles['user-avatar']}
            />
            <div className={styles['user-details']}>
              <div className={styles['username']}>{post.username}</div>
              <div className={styles['post-time']}>{formatTime(post.createdAt)}</div>
            </div>
            <UserHoverCard
              user={{
                username: post.username,
                userAvatar: post.userAvatar,
                userEmail: post.userEmail,
                userId: post.userId
              }}
              triggerRef={userInfoRef}
              position="bottom"
            />
          </div>

          <div className={styles['post-actions-header']}>
            <div className={styles['save-section']}>
              {user ? (
                <button
                  onClick={handleSavePost}
                  className={`${styles['save-btn']} ${isSaved ? styles['saved'] : ''}`}
                  title={isSaved ? t('forum.post.unsave') : t('forum.post.save')}
                >
                  {isSaved ? (
                    <BookmarkCheck className={styles['bookmark-icon']} strokeWidth={1.6} />
                  ) : (
                    <Bookmark className={styles['bookmark-icon']} strokeWidth={1.6} />
                  )}
                </button>
              ) : (
                <div
                  className={styles['save-btn-disabled']}
                  title={t('forum.guest.loginToSave')}
                  onClick={() => setShowLoginRequiredModal(true)}
                >
                  <Bookmark className={styles['bookmark-icon']} strokeWidth={1.6} />
                </div>
              )}
              <span className={styles['save-count']}>{saveCount}</span>
            </div>

            <div className={styles['post-menu']} ref={postMenuRef}>
              <button
                className={styles['menu-btn']}
                onClick={handleMenuClick}
              >
                <MoreHorizontal className={styles['menu-icon']} strokeWidth={1.7} />
              </button>

              {showMenu && (
                <div className={styles['menu-dropdown']}>
                  {(() => {
                    // Admin/Staff view: show Ban and Delete post
                    if (isAdminStaffView && canManageForumReports) {
                      return (
                        <>
                          <button className={`${styles['menu-item']} ${styles['ban-item']}`}
                            onClick={(e) => { e.stopPropagation(); handleBan(); }}>
                            <ShieldOff className={styles['menu-item-icon']} strokeWidth={1.6} />
                            {t('admin.customerManagement.actions.banUser') || 'Ban user'}
                          </button>
                          <button className={`${styles['menu-item']} ${styles['delete']}`}
                            onClick={(e) => { e.stopPropagation(); handleAdminDelete(); }}>
                            <Trash2 className={styles['menu-item-icon']} strokeWidth={1.6} />
                            {t('forum.post.delete')}
                          </button>
                        </>
                      );
                    }

                    // Normal user view: show edit/delete for owner, report for others
                    if (isOwnPost) {
                      return (
                        <>
                          <button onClick={handleEdit} className={styles['menu-item']}>
                            <Edit3 className={styles['menu-item-icon']} strokeWidth={1.6} />
                            {t('forum.post.edit')}
                          </button>
                          <button onClick={handleDelete} className={`${styles['menu-item']} ${styles['delete']}`}>
                            <Trash2 className={styles['menu-item-icon']} strokeWidth={1.6} />
                            {t('forum.post.delete')}
                          </button>
                        </>
                      );
                    }

                    return (
                      <button
                        onClick={handleReport}
                        className={`${styles['menu-item']} ${hasReported ? styles['reported'] : ''}`}
                        disabled={hasReported}
                      >
                        {hasReported ? (
                          <>
                            <CheckCircle2 className={styles['menu-item-icon']} strokeWidth={1.6} />
                            {t('forum.modals.report.success')}
                          </>
                        ) : (
                          <>
                            <Flag className={styles['menu-item-icon']} strokeWidth={1.6} />
                            {t('forum.post.report')}
                          </>
                        )}
                      </button>
                    );
                  })()}
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
                .filter(line => {
                  const escapedBase = FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
                  // Match format 1: /tour/123 or http://domain/tour/123
                  const regexOld = new RegExp(`^(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/\\d+(?:[\\s\\?&#]|$)`);
                  // Match format 2: /tour/detail?id=123 or http://domain/tour/detail?id=123
                  const regexNew = new RegExp(`^(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/detail[?&]id=\\d+(?:[\\s&#]|$)`);
                  return !line.trim().match(regexOld) && !line.trim().match(regexNew);
                })
                .join('\n')
            )}
          </p>
          {showTranslated && translatedText && (
            <div className={styles['post-translate-text']}>
              {translatedText}
            </div>
          )}
          {post.content && !tourId && (
            <div className={styles['post-translate-row']}>
              <button
                type="button"
                className={styles['post-translate-link']}
                onClick={handleTranslateClick}
                disabled={isTranslating}
              >
                {isTranslating
                  ? t('forum.post.translating')
                  : showTranslated && translatedText
                    ? t('forum.post.hideTranslation')
                    : t('forum.post.translate')}
              </button>
            </div>
          )}
          {post.content && tourId && (
            <div className={styles['post-translate-row']}>
              <button
                type="button"
                className={styles['post-translate-link']}
                onClick={handleTranslateTourClick}
                disabled={isTranslating}
              >
                {isTranslating
                  ? t('forum.post.translating')
                  : showTranslated && translatedText
                    ? t('forum.post.hideTranslation')
                    : t('forum.post.translate')}
              </button>
            </div>
          )}
          {translateError && (
            <div className={styles['post-translate-error']}>
              {translateError}
            </div>
          )}

          {allHashtags.length > 0 && (
            <div className={styles['post-hashtags']}>
              {visibleHashtags.map((tag, index) => (
                <span
                  key={index}
                  className={styles['hashtag']}
                  onClick={() => onHashtagClick && onHashtagClick(tag.content)}
                  title={t('forum.hashtag.clickToFilter')}
                >
                  #{tag.content}
                </span>
              ))}
              {!showAllHashtags && hasMoreHashtags && (
                <button
                  type="button"
                  className={styles['hashtag-more']}
                  onClick={() => setShowAllHashtags(true)}
                >
                  ...
                </button>
              )}
              {showAllHashtags && hasMoreHashtags && (
                <button
                  type="button"
                  className={styles['hashtag-more']}
                  onClick={() => setShowAllHashtags(false)}
                >
                  {t('forum.hashtag.showLess') || 'Thu gọn'}
                </button>
              )}
            </div>
          )}

          {renderImages()}
        </div>

        <div className={styles['post-actions']}>
          {user ? (
            <>
              <button
                className={`${styles['action-btn']} ${styles['like-btn']} ${isLiked ? styles['active'] : ''}`}
                onClick={handleLike}
              >
                <ThumbsUp className={styles['action-icon']} strokeWidth={1.7} />
                <span className={styles['action-text']}>
                  {t('forum.post.like')} ({likeCount})
                </span>
              </button>
              <button
                className={`${styles['action-btn']} ${styles['dislike-btn']} ${isDisliked ? styles['active'] : ''}`}
                onClick={handleDislike}
              >
                <ThumbsDown className={styles['action-icon']} strokeWidth={1.7} />
                <span className={styles['action-text']}>
                  {t('forum.post.dislike')} ({dislikeCount})
                </span>
              </button>

              <button
                className={`${styles['action-btn']} ${styles['comment-btn']}`}
                onClick={() => setShowCommentInput(!showCommentInput)}
              >
                <MessageCircle className={styles['action-icon']} strokeWidth={1.7} />
                <span className={styles['action-text']}>
                  {t('forum.post.comment')} ({commentCount})
                </span>
              </button>
            </>
          ) : (
            <div className={styles['guest-actions']}>
              <div
                className={`${styles['action-btn-disabled']} ${styles['like-btn-disabled']}`}
                title={t('forum.guest.loginToReact')}
                onClick={() => setShowLoginRequiredModal(true)}
              >
                <ThumbsUp className={styles['action-icon']} strokeWidth={1.7} />
                <span className={styles['action-text']}>
                  {t('forum.post.like')} ({likeCount})
                </span>
              </div>
              <div
                className={`${styles['action-btn-disabled']} ${styles['dislike-btn-disabled']}`}
                title={t('forum.guest.loginToReact')}
                onClick={() => setShowLoginRequiredModal(true)}
              >
                <ThumbsDown className={styles['action-icon']} strokeWidth={1.7} />
                <span className={styles['action-text']}>
                  {t('forum.post.dislike')} ({dislikeCount})
                </span>
              </div>
              <div
                className={`${styles['action-btn-disabled']} ${styles['comment-btn-disabled']}`}
                title={t('forum.guest.loginToComment')}
                onClick={() => setShowLoginRequiredModal(true)}
              >
                <MessageCircle className={styles['action-icon']} strokeWidth={1.7} />
                <span className={styles['action-text']}>
                  {t('forum.post.comment')} ({commentCount})
                </span>
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
          highlightCommentId={highlightCommentId}
          onCommentInputToggle={setShowCommentInput}
          isAdminStaffView={isAdminStaffView}
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
        // Sử dụng text đa ngôn ngữ mặc định trong common.deleteConfirm.*
        itemName={t('forum.post.title')}
      />

      {/* Ban Reason Modal for admin/staff */}
      {isAdminStaffView && canManageForumReports && (
        <BanReasonModal
          isOpen={banModalOpen}
          onClose={() => setBanModalOpen(false)}
          customer={{ userId: post?.userId, name: post?.username, email: post?.userEmail }}
          onConfirm={handleBanConfirm}
        />
      )}

      {/* Delete Post Modal for admin/staff */}
      {isAdminStaffView && canManageForumReports && (
        <DeleteConfirmModal
          isOpen={showAdminDeleteModal}
          onClose={() => setShowAdminDeleteModal(false)}
          onConfirm={handleAdminDeleteConfirm}
          title={t('forum.post.deleteConfirm') || 'Xóa bài viết'}
          message={t('forum.post.deleteConfirmMessage') || 'Bạn có chắc chắn muốn xóa bài viết này?'}
          itemName={t('forum.post.title') || 'bài viết'}
          confirmText={t('forum.post.delete') || 'Xóa'}
          cancelText={t('forum.post.cancel') || 'Hủy'}
          danger={true}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Return true if props are equal (skip re-render), false if different (re-render)
  if (prevProps.post.forumPostId !== nextProps.post.forumPostId) return false;
  if (prevProps.isFirstPost !== nextProps.isFirstPost) return false;

  // Compare post content fields (important for edit updates)
  if (prevProps.post.title !== nextProps.post.title) return false;
  if (prevProps.post.content !== nextProps.post.content) return false;

  // Compare hashtags
  const prevHashtags = prevProps.post.hashtags || [];
  const nextHashtags = nextProps.post.hashtags || [];
  if (prevHashtags.length !== nextHashtags.length) return false;
  const prevHashtagContents = prevHashtags.map(h => h.content || h).sort().join(',');
  const nextHashtagContents = nextHashtags.map(h => h.content || h).sort().join(',');
  if (prevHashtagContents !== nextHashtagContents) return false;

  // Compare metadata (for link previews)
  const prevMetadata = prevProps.post.metadata || prevProps.post.meta;
  const nextMetadata = nextProps.post.metadata || nextProps.post.meta;
  if (JSON.stringify(prevMetadata) !== JSON.stringify(nextMetadata)) return false;

  // Compare images
  const prevImages = prevProps.post.images || [];
  const nextImages = nextProps.post.images || [];
  if (prevImages.length !== nextImages.length) return false;
  const prevImagePaths = prevImages.map(img => typeof img === 'string' ? img : img.imgPath).sort().join(',');
  const nextImagePaths = nextImages.map(img => typeof img === 'string' ? img : img.imgPath).sort().join(',');
  if (prevImagePaths !== nextImagePaths) return false;

  // Compare reactions
  const prevReactions = prevProps.post.reactions;
  const nextReactions = nextProps.post.reactions;
  if (prevReactions?.likeCount !== nextReactions?.likeCount) return false;
  if (prevReactions?.dislikeCount !== nextReactions?.dislikeCount) return false;

  // Compare save count
  if (prevProps.post.saveCount !== nextProps.post.saveCount) return false;

  // Compare comment count (approximate)
  const prevCommentCount = prevProps.post.comments?.length || 0;
  const nextCommentCount = nextProps.post.comments?.length || 0;
  if (prevCommentCount !== nextCommentCount) return false;

  // Props are equal, skip re-render
  return true;
});

PostCard.displayName = 'PostCard';

export default PostCard;
