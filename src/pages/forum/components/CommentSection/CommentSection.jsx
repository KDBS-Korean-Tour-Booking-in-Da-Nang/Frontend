import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { API_ENDPOINTS, getAvatarUrl, createAuthHeaders, getApiPath, BaseURL } from '../../../../config/api';
import { checkAndHandle401 } from '../../../../utils/apiErrorHandler';
import CommentReportModal from './CommentReportModal/CommentReportModal';
import CommentReportSuccessModal from './CommentReportSuccessModal/CommentReportSuccessModal';
import UserHoverCard from '../UserHoverCard/UserHoverCard';
import DeleteConfirmModal from '../../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import BanReasonModal from '../../../../components/modals/BanReasonModal/BanReasonModal';
import styles from './CommentSection.module.css';
import {
  Send,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Edit3,
  Trash2,
  Flag,
  CheckCircle2,
  ShieldOff
} from 'lucide-react';

const CommentSection = ({ post, onCommentAdded, onCountChange, onLoginRequired, showCommentInput, onCommentInputToggle, highlightCommentId = null, isAdminStaffView = false }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Main states
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  
  // Report modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportSuccessModal, setShowReportSuccessModal] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportedComments, setReportedComments] = useState(new Set());

  // Delete modal states
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load comments khi mount: gọi loadComments khi post.forumPostId thay đổi
  useEffect(() => {
    loadComments();
  }, [post.forumPostId]);

  // Load reported comments sau khi comments được load: gọi loadReportedComments nếu comments.length > 0 và user có giá trị
  useEffect(() => {
    if (comments.length > 0 && user) {
      loadReportedComments();
    }
  }, [comments.length, user?.email]);

  // Load reported comments from backend
  const loadReportedComments = async (commentList = comments) => {
    if (!user || !commentList || commentList.length === 0) return;
    
    try {
      const allCommentIds = [];
      
      commentList.forEach(comment => {
        allCommentIds.push(comment.forumCommentId);
      });
      
      const loadRepliesForComments = async (commentList) => {
        for (const comment of commentList) {
          try {
            const response = await fetch(API_ENDPOINTS.COMMENT_REPLIES(comment.forumCommentId));
            if (response.ok) {
              const replies = await response.json();
              replies.forEach(reply => allCommentIds.push(reply.forumCommentId));
            }
          } catch (error) {
            // Silently handle error
          }
        }
      };
      
      await loadRepliesForComments(commentList);
      
      const reportedIds = [];
      for (const commentId of allCommentIds) {
        try {
          const response = await fetch(`${API_ENDPOINTS.REPORTS_CHECK}?userEmail=${encodeURIComponent(user.email)}&targetType=COMMENT&targetId=${commentId}`);
          if (response.ok) {
            const isReported = await response.json();
            if (isReported) {
              reportedIds.push(commentId);
            }
          }
        } catch (error) {
          // Silently handle error
        }
      }
      
      setReportedComments(prev => new Set([...prev, ...reportedIds]));
    } catch (error) {
      // Silently handle error
    }
  };

  // Load comments từ API: gọi COMMENTS_BY_POST endpoint, filter chỉ top-level comments (không có parentCommentId), load reported status cho comments, call onCountChange với total comments count
  const loadComments = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.COMMENTS_BY_POST(post.forumPostId));
      if (response.ok) {
        const data = await response.json();
        const topLevelComments = data.filter(comment => !comment.parentCommentId);
        setComments(topLevelComments);
        if (user && topLevelComments.length > 0) {
          loadReportedComments(topLevelComments);
        }
        if (onCountChange) {
          onCountChange(data.length);
        }
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Submit comment mới: validate commentText và user, gọi COMMENTS endpoint với POST, clear commentText, reload comments sau khi thành công, call onCommentAdded callback
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      const body = {
        userEmail: user.email,
        forumPostId: post.forumPostId,
        content: commentText.trim(),
        // BE yêu cầu @NotBlank cho imgPath, dùng giá trị placeholder khi không có ảnh
        imgPath: 'NO_IMAGE',
      };

      const response = await fetch(API_ENDPOINTS.COMMENTS, {
        method: 'POST',
        headers: createAuthHeaders(token),
        body: JSON.stringify(body),
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const newComment = await response.json();
        setComments(prev => [newComment, ...prev]);
        setCommentText('');
        if (onCommentAdded) onCommentAdded(newComment);
        if (onCommentInputToggle) onCommentInputToggle(false);
        if (onCountChange) onCountChange(comments.length + 1);
      }
    } catch (error) {
      // Silently handle error submitting comment
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time helper: tính diffInMinutes, < 1 phút = "Vừa xong", < 60 phút = "X phút trước", < 1440 phút = "X giờ trước", >= 1440 phút = "X ngày trước"
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('forum.post.justNow');
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('forum.post.minutes')} ${t('forum.post.ago')}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('forum.post.hours')} ${t('forum.post.ago')}`;
    return `${Math.floor(diffInMinutes / 1440)} ${t('forum.post.days')} ${t('forum.post.ago')}`;
  };

  // Kiểm tra user có sở hữu comment không: check user.email === comment.userEmail
  const isCommentOwner = (comment) => {
    if (!user || !comment) {
      return false;
    }
    
    const isOwner = user.email === comment.userEmail;
    return isOwner;
  };

  // Check if comment has been reported
  const isCommentReported = (commentId) => {
    return reportedComments.has(commentId);
  };

  // Xử lý comment deletion: filter comment khỏi comments array
  const handleCommentDeleted = (commentId) => {
    setComments(prev => prev.filter(comment => comment.forumCommentId !== commentId));
  };

  // Submit report: gọi REPORTS_CREATE endpoint với targetType, targetId, reasons, description, add comment vào reportedComments Set, show success modal, handle 401, handle already reported error
  const submitReport = async (reportData) => {
    if (!user) return;
    
    try {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      const url = `${API_ENDPOINTS.REPORTS_CREATE}?userEmail=${encodeURIComponent(user.email)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: createAuthHeaders(token),
        body: JSON.stringify({
          targetType: reportData.targetType,
          targetId: reportData.targetId,
          reasons: reportData.reasons,
          description: reportData.description
        }),
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const newReportedComments = new Set([...reportedComments, reportData.targetId]);
        setReportedComments(newReportedComments);
        
        setShowReportModal(false);
        setShowReportSuccessModal(true);
        setReportTarget(null);
      } else if (response.status === 400) {
        const errorData = await response.json();
        if (errorData.code === 1022) {
          const newReportedComments = new Set([...reportedComments, reportData.targetId]);
          setReportedComments(newReportedComments);
          
          setShowReportModal(false);
          setReportTarget(null);
          // Don't show success modal for already reported items
        } else {
          alert('Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại.');
        }
      } else {
        alert('Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại.');
      }
    } catch (error) {
      alert('Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại.');
    }
  };

  const displayedComments = showAllComments 
    ? comments
    : comments.slice(0, 1); // Only show 1 parent comment initially

  const hasMoreComments = comments.length > 1; // Show "View more" if more than 1 parent comment

  const requestDeleteComment = (comment) => {
    setDeleteTarget(comment);
    setDeleteOpen(true);
  };

  const confirmDeleteComment = async () => {
    if (!deleteTarget || !user) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.COMMENTS + `/${deleteTarget.forumCommentId}?userEmail=${user.email}`, {
        method: 'DELETE',
        headers: createAuthHeaders(token),
      });
      
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }
      
      if (response.ok) {
        await loadComments();
        if (onCountChange) {
          // Reload to get accurate count
          const countResponse = await fetch(API_ENDPOINTS.COMMENTS_BY_POST(post.forumPostId));
          if (countResponse.ok) {
            const allComments = await countResponse.json();
            onCountChange(allComments.length);
          } else {
            onCountChange(prev => prev - 1);
          }
        }
      } else {
        alert('Có lỗi xảy ra khi xóa bình luận. Vui lòng thử lại.');
      }
    } catch {
      alert('Có lỗi xảy ra khi xóa bình luận. Vui lòng thử lại.');
    } finally {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className={styles['comment-section']}>
      {/* Comment Input */}
      {user && showCommentInput && (
        <div className={styles['comment-input-container']}>
          <img 
            src={user.avatar ? user.avatar : '/default-avatar.png'} 
            alt={user.username}
            className={styles['comment-user-avatar']}
          />
          <form onSubmit={handleSubmitComment} className={styles['comment-form']}>
            <input
              type="text"
              placeholder={t('forum.comments.placeholder')}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className={styles['comment-input']}
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              className={styles['comment-submit-btn']}
              disabled={isSubmitting || !commentText.trim()}
            >
              <Send className={styles['submit-icon']} strokeWidth={1.8} />
              {isSubmitting ? t('forum.comments.submitting') : t('forum.comments.submit')}
            </button>
          </form>
        </div>
      )}

      {/* Comments List */}
      {displayedComments.length > 0 && (
        <div className={styles['comments-list']}>
          {displayedComments.map((comment, index) => (
            <CommentItem 
              key={comment.forumCommentId || index} 
              comment={comment}
              user={user}
              t={t}
              formatTime={(d) => {
                const date = new Date(d);
                const now = new Date();
                const diffInMinutes = Math.floor((now - date) / (1000 * 60));
                if (diffInMinutes < 1) return t('forum.post.justNow');
                if (diffInMinutes < 60) return `${diffInMinutes} ${t('forum.post.minutes')} ${t('forum.post.ago')}`;
                if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('forum.post.hours')} ${t('forum.post.ago')}`;
                return `${Math.floor(diffInMinutes / 1440)} ${t('forum.post.days')} ${t('forum.post.ago')}`;
              }}
              isCommentOwner={(c) => user && c && user.email === c.userEmail}
              isCommentReported={(id) => reportedComments.has(id)}
              onLoginRequired={onLoginRequired}
              onCountChange={onCountChange}
              post={post}
              onCommentDeleted={(commentId) => setComments(prev => prev.filter(c => c.forumCommentId !== commentId))}
              onReportComment={(c) => { setReportTarget(c); setShowReportModal(true); }}
              onRequestDelete={requestDeleteComment}
              onReloadComments={loadComments}
              reportedComments={reportedComments}
              setReportedComments={setReportedComments}
              highlightCommentId={highlightCommentId}
              isAdminStaffView={isAdminStaffView}
            />
          ))}
        </div>
      )}

      {/* Show More Comments - Only show button when not showing all comments yet */}
      {!showAllComments && hasMoreComments && (
        <div className={styles['show-more-comments']}>
          <button 
            onClick={() => setShowAllComments(true)}
            className={styles['show-more-btn']}
          >
            {t('forum.comments.showMore')} {comments.length - 1} {t('forum.post.comments')}
          </button>
        </div>
      )}

      {/* No Comments Message */}
      {comments.length === 0 && (
        <div className={styles['no-comments']}>
          <p>{t('forum.comments.noComments')}</p>
        </div>
      )}

      {/* Report Modals */}
      <CommentReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onReport={async (data) => { await submitReport(data); }}
        comment={reportTarget}
      />
      <CommentReportSuccessModal
        isOpen={showReportSuccessModal}
        onClose={() => setShowReportSuccessModal(false)}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={confirmDeleteComment}
        title={t('forum.comments.deleteConfirm')}
        message={deleteTarget ? t('forum.comments.deleteConfirm') : ''}
        itemName={t('forum.comments.deleteConfirm')}
        confirmText={t('forum.comments.delete')}
        cancelText={t('forum.comments.cancel')}
      />
    </div>
  );
};

// Individual Comment Component
const CommentItem = ({ comment, user, t, formatTime, isCommentOwner, isCommentReported, onLoginRequired, onCountChange, post, isReply = false, onCommentDeleted, onReportComment, onRequestDelete, onReloadComments, reportedComments, setReportedComments, highlightCommentId = null, isAdminStaffView = false }) => {
  const { user: authUser } = useAuth();
  
  // Check if user can manage forum reports (admin or staff with FORUM_REPORT_AND_BOOKING_COMPLAINT task)
  const canManageForumReports = authUser?.role === 'ADMIN' || 
    (authUser?.role === 'STAFF' && authUser?.staffTask === 'FORUM_REPORT_AND_BOOKING_COMPLAINT');
  
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [reaction, setReaction] = useState({ likeCount: 0, dislikeCount: 0, userReaction: null });
  const [showDropdown, setShowDropdown] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [localDeleteOpen, setLocalDeleteOpen] = useState(false);
  const [hasUserAddedReply, setHasUserAddedReply] = useState(false); // Track if user has added replies in this session
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [showTranslated, setShowTranslated] = useState(false);
  const [translateError, setTranslateError] = useState('');
  const [totalRepliesCount, setTotalRepliesCount] = useState(0); // Total replies including nested
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [deleteCommentModalOpen, setDeleteCommentModalOpen] = useState(false);

  const dropdownRef = useRef(null);
  const userInfoRef = useRef(null);

  // Load replies count on mount
  useEffect(() => {
    loadReplies();
    loadReaction();
  }, [comment.forumCommentId]);

  // Reset translation state when comment content changes (e.g., after edit)
  useEffect(() => {
    setTranslatedText('');
    setShowTranslated(false);
    setTranslateError('');
  }, [comment.content]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showDropdown) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Recursive function to count all replies including nested ones
  const countAllReplies = async (commentId) => {
    try {
      const response = await fetch(API_ENDPOINTS.COMMENT_REPLIES(commentId));
      if (response.ok) {
        const directReplies = await response.json();
        let total = directReplies.length;
        
        // Recursively count nested replies
        for (const reply of directReplies) {
          const nestedCount = await countAllReplies(reply.forumCommentId);
          total += nestedCount;
        }
        
        return total;
      }
    } catch (error) {
      // Silently handle error
    }
    return 0;
  };

  const loadReplies = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.COMMENT_REPLIES(comment.forumCommentId));
      if (response.ok) {
        const data = await response.json();
        setReplies(data);
        
        // Count total replies including nested ones
        const totalCount = await countAllReplies(comment.forumCommentId);
        setTotalRepliesCount(totalCount);
        
        // Auto-show replies if user has added replies in this session
        // Otherwise, keep showReplies state as is (will show "Show replies" button if false)
        if (data.length > 0 && hasUserAddedReply) {
          setShowReplies(true);
        }
        
        // Load reported status for replies if user is logged in
        if (user && data.length > 0) {
          loadReportedStatusForReplies(data);
        }
      }
    } catch (error) {
      // Silently handle error loading replies
    }
  };

  // Load reported status for replies
  const loadReportedStatusForReplies = async (replyList) => {
    if (!user || !replyList || replyList.length === 0) return;
    
    try {
      const reportedIds = [];
      for (const reply of replyList) {
        try {
          const response = await fetch(`${API_ENDPOINTS.REPORTS_CHECK}?userEmail=${encodeURIComponent(user.email)}&targetType=COMMENT&targetId=${reply.forumCommentId}`);
          if (response.ok) {
            const isReported = await response.json();
            if (isReported) {
              reportedIds.push(reply.forumCommentId);
            }
          }
        } catch (error) {
          // Silently handle error checking report status for reply
        }
      }
      
      // Update reported comments state
      if (reportedIds.length > 0) {
        setReportedComments(prev => new Set([...prev, ...reportedIds]));
      }
    } catch (error) {
      // Silently handle error loading reported status for replies
    }
  };

  const loadReaction = async () => {
    try {
      const email = user?.email || localStorage.getItem('userEmail') || localStorage.getItem('email');
      const response = await fetch(API_ENDPOINTS.REACTIONS_COMMENT_SUMMARY(comment.forumCommentId, email));
      if (response.ok) {
        const data = await response.json();
        setReaction({
          likeCount: data.likeCount || 0,
          dislikeCount: data.dislikeCount || 0,
          userReaction: data.userReaction || null
        });
      }
    } catch (error) {
      // Silently handle error loading reaction
    }
  };

  // Handle reaction
  const handleReaction = async (type) => {
    if (!user) {
      if (onLoginRequired) onLoginRequired();
      return;
    }


    try {
      const email = user?.email || localStorage.getItem('userEmail') || localStorage.getItem('email');
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      
      const headers = createAuthHeaders(token);

      // Toggle off if same reaction
      if (reaction.userReaction === type) {
        const removeRequest = {
          targetId: comment.forumCommentId,
          targetType: 'COMMENT',
          reactionType: type,
          userEmail: email
        };
        const response = await fetch(API_ENDPOINTS.REACTIONS_DELETE, { 
          method: 'POST', 
          headers,
          body: JSON.stringify(removeRequest)
        });
        if (response.ok) {
          setReaction(prev => ({
            ...prev,
            userReaction: null,
            likeCount: type === 'LIKE' ? Math.max(0, prev.likeCount - 1) : prev.likeCount,
            dislikeCount: type === 'DISLIKE' ? Math.max(0, prev.dislikeCount - 1) : prev.dislikeCount
          }));
        }
        return;
      }

      // Add new reaction
      const body = { 
        targetId: comment.forumCommentId, 
        targetType: 'COMMENT', 
        reactionType: type,
        userEmail: email
      };
      const response = await fetch(API_ENDPOINTS.REACTIONS_ADD, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(body) 
      });
      
      if (response.ok) {
        setReaction(prev => {
          const newReaction = { ...prev, userReaction: type };
          if (type === 'LIKE') {
            newReaction.likeCount = prev.likeCount + 1;
            if (prev.userReaction === 'DISLIKE') {
              newReaction.dislikeCount = Math.max(0, prev.dislikeCount - 1);
            }
          } else {
            newReaction.dislikeCount = prev.dislikeCount + 1;
            if (prev.userReaction === 'LIKE') {
              newReaction.likeCount = Math.max(0, prev.likeCount - 1);
            }
          }
          return newReaction;
        });
      }
    } catch {
      // Failed to handle reaction, silently continue
    }
  };

  // Handle reply
  const handleReply = () => {
    setShowReplyInput(!showReplyInput);
    // Auto-show replies when user clicks reply button (if replies exist)
    if (!showReplyInput && replies.length > 0) {
      setShowReplies(true);
    }
  };

  // Handle Enter key for reply input
  const handleReplyKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (replyText.trim() && !isSubmittingReply) {
        handleSubmitReply();
      }
    }
  };

  // Submit reply
  const handleSubmitReply = async () => {
    if (!replyText.trim() || !user) return;

    setIsSubmittingReply(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      const body = {
        userEmail: user.email,
        forumPostId: post.forumPostId,
        content: replyText.trim(),
        // BE yêu cầu @NotBlank cho imgPath, dùng giá trị placeholder khi không có ảnh
        imgPath: 'NO_IMAGE',
        parentCommentId: comment.forumCommentId
      };

      const response = await fetch(API_ENDPOINTS.COMMENTS, {
        method: 'POST',
        headers: createAuthHeaders(token),
        body: JSON.stringify(body)
      });

      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const newReply = await response.json();
        setReplies(prev => [newReply, ...prev]);
        setTotalRepliesCount(prev => prev + 1);
        setReplyText('');
        setShowReplyInput(false);
        // Auto-show replies after user submits a reply
        setShowReplies(true);
        setHasUserAddedReply(true);
        if (onCountChange) {
          onCountChange(prev => prev + 1);
        }
        // If this is a nested reply, reload parent's replies to update total count
        if (onReloadComments) {
          await onReloadComments();
        }
      } else {
        // Handle error response
        alert('Có lỗi xảy ra khi gửi phản hồi. Vui lòng thử lại.');
      }
    } catch (error) {
      // Silently handle error submitting reply
      alert('Có lỗi xảy ra khi gửi phản hồi. Vui lòng thử lại.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Handle show/hide replies
  const handleToggleReplies = () => {
    setShowReplies(!showReplies);
  };

  // Handle edit
  const handleEdit = () => {
    setEditing(true);
    setEditText(comment.content);
    setShowDropdown(false);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editText.trim()) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.COMMENTS + `/${comment.forumCommentId}`, {
        method: 'PUT',
        headers: createAuthHeaders(token),
        body: JSON.stringify({
          content: editText.trim(),
          userEmail: user.email
        }),
      });

      if (response.ok) {
        // Update comment content locally
        comment.content = editText.trim();
        setEditing(false);
        setEditText('');
        setShowDropdown(false);
      } else {
        alert('Có lỗi xảy ra khi cập nhật bình luận. Vui lòng thử lại.');
      }
    } catch (error) {
      // Silently handle error updating comment
      alert('Có lỗi xảy ra khi cập nhật bình luận. Vui lòng thử lại.');
    }
  };

  // Handle delete (top-level uses parent modal, replies use local modal)
  const handleDelete = () => {
    if (onRequestDelete) {
      onRequestDelete(comment);
      setShowDropdown(false);
      return;
    }

    // Reply or comment without parent-provided delete handler
    setLocalDeleteOpen(true);
    setShowDropdown(false);
  };

  const confirmLocalDelete = async () => {
    if (!comment || !user) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.COMMENTS + `/${comment.forumCommentId}?userEmail=${user.email}`, {
        method: 'DELETE',
        headers: createAuthHeaders(token),
      });

      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // After deletion, backend reassigns child comments to the deleted comment's parent
        // We need to reload to get the updated structure
        // Always reload replies to ensure we see reassigned comments in the correct place
        await loadReplies();
        
        // If parent component has reload callback, use it to reload all comments
        // This ensures top-level comments are also refreshed and totalRepliesCount is updated
        if (onReloadComments) {
          await onReloadComments();
        }
        
        // Remove from local state as fallback
        if (onCommentDeleted) {
          onCommentDeleted(comment.forumCommentId);
        }
        
        // Cập nhật tổng số comment phía post card
        if (onCountChange) {
          onCountChange(prev => prev - 1);
        }
      } else {
        alert('Có lỗi xảy ra khi xóa bình luận. Vui lòng thử lại.');
      }
    } catch {
      alert('Có lỗi xảy ra khi xóa bình luận. Vui lòng thử lại.');
    } finally {
      setLocalDeleteOpen(false);
    }
  };

  // Handle report
  const handleReport = () => {
    // Check if already reported
    if (reportedComments && reportedComments.has(comment.forumCommentId)) {
      setShowDropdown(false);
      return;
    }
    
    if (onReportComment) {
      onReportComment(comment);
    }
    setShowDropdown(false);
  };

  // Handle ban user (admin/staff only)
  const handleBan = () => {
    setBanModalOpen(true);
    setShowDropdown(false);
  };

  const handleBanConfirm = async (banReason) => {
    if (!comment?.userId || !authUser) return;
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      const response = await fetch(`${BaseURL}/api/staff/ban-user/${comment.userId}`, {
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

  // Handle delete comment (admin/staff only)
  const handleAdminDelete = () => {
    setDeleteCommentModalOpen(true);
    setShowDropdown(false);
  };

  const handleAdminDeleteConfirm = async () => {
    if (!comment || !authUser) return;
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.COMMENTS}/${comment.forumCommentId}?userEmail=${authUser.email}`, {
        method: 'DELETE',
        headers: createAuthHeaders(token),
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Reload comments after deletion
        if (onReloadComments) {
          await onReloadComments();
        }
        if (onCommentDeleted) {
          onCommentDeleted(comment.forumCommentId);
        }
        if (onCountChange) {
          onCountChange(prev => prev - 1);
        }
        setDeleteCommentModalOpen(false);
        alert(t('forum.comments.deleteSuccess') || 'Đã xóa bình luận thành công');
      } else {
        alert(t('forum.comments.deleteError') || 'Có lỗi xảy ra khi xóa bình luận');
      }
    } catch (error) {
      alert(t('forum.comments.deleteError') || 'Có lỗi xảy ra khi xóa bình luận');
    }
  };

  // Handle translate comment
  const handleTranslateClick = async () => {
    if (!comment?.content || isTranslating) return;

    // Nếu đã có bản dịch rồi thì chỉ toggle hiển thị
    if (translatedText) {
      setShowTranslated(prev => !prev);
      return;
    }

    try {
      setIsTranslating(true);
      setTranslateError('');

      const response = await fetch(
        getApiPath('/api/gemini/translate'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: comment.content }),
        }
      );

      if (!response.ok) {
        throw new Error(`Translate failed with status ${response.status}`);
      }

      const text = await response.text();
      setTranslatedText(text || '');
      setShowTranslated(true);
    } catch (error) {
      // Silently handle error translating comment content
      setTranslateError('Không thể dịch nội dung. Vui lòng thử lại sau.');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className={`${styles['comment-item']} ${isReply ? styles['reply-item'] : ''}`} id={`comment-${comment.forumCommentId}`} data-highlight={highlightCommentId && String(highlightCommentId) === String(comment.forumCommentId) ? 'true' : 'false'} data-admin-staff-view={isAdminStaffView ? 'true' : 'false'}>
      {/* LEFT: Avatar only (hover on avatar) */}
      <div className={styles['comment-left']} ref={userInfoRef}>
        <img 
          src={getAvatarUrl(comment.userAvatar)} 
          alt={comment.username}
          className={styles['comment-avatar']}
        />
        <UserHoverCard 
          user={{
            username: comment.username,
            userAvatar: comment.userAvatar,
            userEmail: comment.userEmail,
            userId: comment.userId
          }}
          triggerRef={userInfoRef}
          position="bottom"
        />
      </div>

      {/* RIGHT: Bubble + actions/meta */}
      <div className={styles['comment-right']}>
        {/* Bubble: header (username • time • menu) + content */}
        <div className={styles['comment-bubble']}>
          <div className={styles['comment-header']}>
            <span className={styles['comment-username']}>{comment.username}</span>
            <div className={styles['comment-header-right']}>
              <span className={styles['comment-time']}>{formatTime(comment.createdAt)}</span>
              {user && (
                <div className={styles['comment-actions-menu']} ref={dropdownRef}>
                  <button
                    className={styles['comment-more-btn']}
                    onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
                  >
                    <MoreHorizontal strokeWidth={1.6} />
                  </button>
                  {showDropdown && (
                    <div className={`${styles['comment-dropdown']} ${styles['show']}`}>
                      {(() => {
                        // Admin/Staff view: show Ban and Delete comment
                        if (isAdminStaffView && canManageForumReports) {
                          return (
                            <>
                              <button className={`${styles['dropdown-item']} ${styles['ban-item']}`}
                                      onClick={(e) => { e.stopPropagation(); handleBan(); }}>
                                <ShieldOff className={styles['dropdown-icon']} strokeWidth={1.6} />
                                {t('admin.customerManagement.actions.banUser') || 'Ban'}
                              </button>
                              <button className={`${styles['dropdown-item']} ${styles['delete-item']}`}
                                      onClick={(e) => { e.stopPropagation(); handleAdminDelete(); }}>
                                <Trash2 className={styles['dropdown-icon']} strokeWidth={1.6} />
                                {t('forum.comments.delete')}
                              </button>
                            </>
                          );
                        }
                        
                        // Normal user view: show edit/delete for owner, report for others
                        const isOwner = isCommentOwner(comment);
                        const isReported = reportedComments && reportedComments.has(comment.forumCommentId);
                        return isOwner ? (
                          <>
                            <button className={`${styles['dropdown-item']} ${styles['edit-item']}`}
                                    onClick={(e) => { e.stopPropagation(); handleEdit(); }}>
                              <Edit3 className={styles['dropdown-icon']} strokeWidth={1.6} />
                              {t('forum.comments.edit')}
                            </button>
                            <button className={`${styles['dropdown-item']} ${styles['delete-item']}`}
                                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}>
                              <Trash2 className={styles['dropdown-icon']} strokeWidth={1.6} />
                              {t('forum.comments.delete')}
                            </button>
                          </>
                        ) : isReported ? (
                          <div className={`${styles['dropdown-item']} ${styles['report-item-disabled']}`}>
                            <CheckCircle2 className={styles['dropdown-icon']} strokeWidth={1.6} />
                            {t('forum.comments.reported')}
                          </div>
                        ) : (
                          <button className={`${styles['dropdown-item']} ${styles['report-item']}`}
                                  onClick={(e) => { e.stopPropagation(); handleReport(); }}>
                            <Flag className={styles['dropdown-icon']} strokeWidth={1.6} />
                            {t('forum.comments.report')}
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {editing ? (
            <div className={styles['edit-comment-form']}>
              <textarea
                className={styles['edit-comment-input']}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder={t('forum.comments.editPlaceholder')}
              />
              <div className={styles['edit-comment-actions']}>
                <button className={styles['save-edit-btn']} onClick={handleSaveEdit}>
                  {t('forum.comments.update')}
                </button>
                <button className={styles['cancel-edit-btn']} onClick={() => setEditing(false)}>
                  {t('forum.comments.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles['comment-text']}>{comment.content}</div>
              {showTranslated && translatedText && (
                <div className={styles['comment-translate-text']}>
                  {translatedText}
                </div>
              )}
              {comment.content && (
                <div className={styles['comment-translate-row']}>
                  <button
                    type="button"
                    className={styles['comment-translate-link']}
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
              {translateError && (
                <div className={styles['comment-translate-error']}>
                  {translateError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Meta row: chỉ còn actions (like/dislike/reply) - Hide for admin/staff view */}
        {!isAdminStaffView && (
          <div className={styles['comment-meta-row']}>
            {user ? (
              <div className={styles['comment-actions']}>
                <button 
                  className={`${styles['comment-action-btn']} ${styles['like-btn']} ${reaction.userReaction === 'LIKE' ? styles['active'] : ''}`}
                  onClick={() => handleReaction('LIKE')}
                >
                  <ThumbsUp className={styles['action-icon']} strokeWidth={1.6} />
                  <span className={styles['action-text']}>{t('forum.post.like')}</span>
                </button>
                <button 
                  className={`${styles['comment-action-btn']} ${styles['dislike-btn']} ${reaction.userReaction === 'DISLIKE' ? styles['active'] : ''}`}
                  onClick={() => handleReaction('DISLIKE')}
                >
                  <ThumbsDown className={styles['action-icon']} strokeWidth={1.6} />
                  <span className={styles['action-text']}>{t('forum.post.dislike')}</span>
                </button>
                <button className={styles['comment-action-btn']} onClick={handleReply}>
                  <MessageCircle className={styles['action-icon']} strokeWidth={1.6} />
                  <span className={styles['action-text']}>{t('forum.post.reply')}</span>
                </button>
              </div>
            ) : (
              <div className={styles['comment-actions']}>
                <div 
                  className={`${styles['comment-action-btn-disabled']} ${styles['like-btn-disabled']}`} 
                  title={t('forum.guest.loginToReact')} 
                  onClick={() => onLoginRequired && onLoginRequired()}
                >
                  <ThumbsUp className={styles['action-icon']} strokeWidth={1.6} />
                  <span className={styles['action-text']}>{t('forum.post.like')}</span>
                </div>
                <div 
                  className={`${styles['comment-action-btn-disabled']} ${styles['dislike-btn-disabled']}`} 
                  title={t('forum.guest.loginToReact')} 
                  onClick={() => onLoginRequired && onLoginRequired()}
                >
                  <ThumbsDown className={styles['action-icon']} strokeWidth={1.6} />
                  <span className={styles['action-text']}>{t('forum.post.dislike')}</span>
                </div>
                <div 
                  className={styles['comment-action-btn-disabled']} 
                  title={t('forum.guest.loginToComment')} 
                  onClick={() => onLoginRequired && onLoginRequired()}
                >
                  <MessageCircle className={styles['action-icon']} strokeWidth={1.6} />
                  <span className={styles['action-text']}>{t('forum.post.reply')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Replies toggle - Only show when replies exist and user hasn't added replies in this session */}
        {totalRepliesCount > 0 && !hasUserAddedReply && (
          <div className={styles['reply-toggle-row']}>
            <button className={styles['show-more-btn']} onClick={() => setShowReplies(!showReplies)}>
              {showReplies ? t('forum.post.hideReplies') : `${t('forum.post.showReplies')} ${totalRepliesCount}`}
            </button>
          </div>
        )}

        {/* Replies list */}
        {showReplies && (
          <div className={styles['replies-container']}>
            {replies.map((reply) => (
              <CommentItem 
                key={reply.forumCommentId}
                comment={reply}
                user={user}
                t={t}
                formatTime={formatTime}
                isCommentOwner={isCommentOwner}
                isCommentReported={isCommentReported}
                onLoginRequired={onLoginRequired}
                onCountChange={onCountChange}
                post={post}
                isReply={true}
                onCommentDeleted={(commentId) => {
                  setReplies(prev => prev.filter(reply => reply.forumCommentId !== commentId));
                  // Reload replies to update totalRepliesCount
                  loadReplies();
                }}
                onReportComment={onReportComment}
                onReloadComments={async () => {
                  // Reload replies of the current comment to get updated structure
                  await loadReplies();
                }}
                reportedComments={reportedComments}
                setReportedComments={setReportedComments}
                highlightCommentId={highlightCommentId}
                isAdminStaffView={isAdminStaffView}
              />
            ))}
          </div>
        )}

        {/* Reply input */}
        {showReplyInput && (
          <div className={styles['reply-input-row']}>
            <input
              type="text"
              value={replyText}
              placeholder={t('forum.comments.replyPlaceholder')}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              className={styles['comment-input']}
              disabled={isSubmittingReply}
            />
            <button 
              className={styles['comment-submit-btn']} 
              onClick={handleSubmitReply}
              disabled={isSubmittingReply || !replyText.trim()}
            >
              <Send className={styles['submit-icon']} strokeWidth={1.8} />
              {isSubmittingReply ? t('forum.comments.submitting') : t('forum.comments.submit')}
            </button>
          </div>
        )}
      </div>
      {/* Local Delete Confirm Modal for replies (when parent không quản lý xóa) */}
      <DeleteConfirmModal
        isOpen={localDeleteOpen}
        onClose={() => setLocalDeleteOpen(false)}
        onConfirm={confirmLocalDelete}
        title={t('forum.comments.deleteConfirm')}
        message={comment ? t('forum.comments.deleteConfirm') : ''}
        itemName={t('forum.comments.deleteConfirm')}
        confirmText={t('forum.comments.delete')}
        cancelText={t('forum.comments.cancel')}
      />
      {/* Ban Reason Modal for admin/staff */}
      {isAdminStaffView && canManageForumReports && (
        <BanReasonModal
          isOpen={banModalOpen}
          onClose={() => setBanModalOpen(false)}
          customer={{ userId: comment?.userId, name: comment?.username, email: comment?.userEmail }}
          onConfirm={handleBanConfirm}
        />
      )}
      {/* Delete Comment Modal for admin/staff */}
      {isAdminStaffView && canManageForumReports && (
        <DeleteConfirmModal
          isOpen={deleteCommentModalOpen}
          onClose={() => setDeleteCommentModalOpen(false)}
          onConfirm={handleAdminDeleteConfirm}
          title={t('forum.comments.deleteConfirm') || 'Xóa bình luận'}
          message={t('forum.comments.deleteConfirmMessage') || 'Bạn có chắc chắn muốn xóa bình luận này?'}
          itemName={t('forum.comments.comment') || 'bình luận'}
          confirmText={t('forum.comments.delete') || 'Xóa'}
          cancelText={t('forum.comments.cancel') || 'Hủy'}
          danger={true}
        />
      )}
    </div>
  );
};

export default CommentSection;