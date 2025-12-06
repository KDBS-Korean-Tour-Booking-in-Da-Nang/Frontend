import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { API_ENDPOINTS, getAvatarUrl, createAuthHeaders } from '../../../../config/api';
import { checkAndHandle401 } from '../../../../utils/apiErrorHandler';
import CommentReportModal from './CommentReportModal';
import CommentReportSuccessModal from './CommentReportSuccessModal';
import UserHoverCard from '../UserHoverCard/UserHoverCard';
import DeleteConfirmModal from '../../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
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
  CheckCircle2
} from 'lucide-react';

const CommentSection = ({ post, onCommentAdded, onCountChange, onLoginRequired, showCommentInput, onCommentInputToggle }) => {
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

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [post.forumPostId]);

  // Load reported comments after comments are loaded
  useEffect(() => {
    if (comments.length > 0 && user) {
      loadReportedComments();
    }
  }, [comments.length, user?.email]);

  // Load reported comments from backend
  const loadReportedComments = async (commentList = comments) => {
    if (!user || !commentList || commentList.length === 0) return;
    
    try {
      // Get all comment IDs from provided comments
      const allCommentIds = [];
      
      // Add top-level comments
      commentList.forEach(comment => {
        allCommentIds.push(comment.forumCommentId);
      });
      
      // Add reply comments
      const loadRepliesForComments = async (commentList) => {
        for (const comment of commentList) {
          try {
            const response = await fetch(API_ENDPOINTS.COMMENT_REPLIES(comment.forumCommentId));
            if (response.ok) {
              const replies = await response.json();
              replies.forEach(reply => allCommentIds.push(reply.forumCommentId));
            }
          } catch (error) {
            // Silently handle error loading replies
          }
        }
      };
      
      await loadRepliesForComments(commentList);
      
      // Check which comments are already reported
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
          // Silently handle error checking report status
        }
      }
      
      setReportedComments(prev => new Set([...prev, ...reportedIds]));
    } catch (error) {
      // Silently handle error loading reported comments
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.COMMENTS_BY_POST(post.forumPostId));
      if (response.ok) {
        const data = await response.json();
        // Only show top-level comments (no parentCommentId)
        const topLevelComments = data.filter(comment => !comment.parentCommentId);
        setComments(topLevelComments);
        // Load reported status for these comments
        if (user && topLevelComments.length > 0) {
          loadReportedComments(topLevelComments);
        }
        if (onCountChange) {
          onCountChange(data.length);
        }
      }
    } catch (error) {
      // Silently handle error loading comments
    }
  };

  // Submit new comment
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

      // Handle 401 if token expired
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

  // Format time helper
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('forum.post.justNow');
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('forum.post.minutes')} ${t('forum.post.ago')}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('forum.post.hours')} ${t('forum.post.ago')}`;
    return `${Math.floor(diffInMinutes / 1440)} ${t('forum.post.days')} ${t('forum.post.ago')}`;
  };

  // Check if user owns comment
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

  // Handle comment deletion
  const handleCommentDeleted = (commentId) => {
    setComments(prev => prev.filter(comment => comment.forumCommentId !== commentId));
  };

  // Submit report
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

      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Add comment to reported list
        const newReportedComments = new Set([...reportedComments, reportData.targetId]);
        setReportedComments(newReportedComments);
        
        setShowReportModal(false);
        setShowReportSuccessModal(true);
        setReportTarget(null);
      } else if (response.status === 400) {
        // Handle already reported error
        const errorData = await response.json();
        if (errorData.code === 1022) {
          // Already reported - add to reported list but don't show success modal
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
      // Silently handle error submitting report
      alert('Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại.');
    }
  };

  const displayedComments = showAllComments 
    ? comments
    : comments.slice(0, 3);

  const hasMoreComments = comments.length > 3;

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
      
      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }
      
      if (response.ok) {
        if (!deleteTarget.parentCommentId) {
          setComments(prev => prev.filter(c => c.forumCommentId !== deleteTarget.forumCommentId));
        }
        if (onCountChange) onCountChange(prev => prev - 1);
      } else {
        alert('Có lỗi xảy ra khi xóa bình luận. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
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
              reportedComments={reportedComments}
              setReportedComments={setReportedComments}
            />
          ))}
        </div>
      )}

      {/* Show More Comments */}
      {hasMoreComments && (
        <div className={styles['show-more-comments']}>
          <button 
            onClick={() => setShowAllComments(!showAllComments)}
            className={styles['show-more-btn']}
          >
            {showAllComments 
              ? t('forum.comments.hideComments') 
              : `${t('forum.comments.showMore')} ${comments.length - 3} ${t('forum.post.comments')}`
            }
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
const CommentItem = ({ comment, user, t, formatTime, isCommentOwner, isCommentReported, onLoginRequired, onCountChange, post, isReply = false, onCommentDeleted, onReportComment, onRequestDelete, reportedComments, setReportedComments }) => {
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

  const dropdownRef = useRef(null);
  const userInfoRef = useRef(null);

  // Load replies count on mount
  useEffect(() => {
    loadReplies();
    loadReaction();
  }, [comment.forumCommentId]);

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

  const loadReplies = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.COMMENT_REPLIES(comment.forumCommentId));
      if (response.ok) {
        const data = await response.json();
        setReplies(data);
        
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
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  // Handle reply
  const handleReply = () => {
    setShowReplyInput(!showReplyInput);
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
        setReplyText('');
        setShowReplyInput(false);
        if (onCountChange) {
          onCountChange(prev => prev + 1);
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
        // Cập nhật list ở component cha (top-level hoặc replies)
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
    } catch (error) {
      console.error('Error deleting comment:', error);
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

  return (
    <div className={`${styles['comment-item']} ${isReply ? styles['reply-item'] : ''}`}>
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
            <div className={styles['comment-text']}>{comment.content}</div>
          )}
        </div>

        {/* Meta row: chỉ còn actions (like/dislike/reply) */}
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

        {/* Replies toggle */}
        {replies.length > 0 && (
          <div className={styles['reply-toggle-row']}>
            <button className={styles['show-more-btn']} onClick={() => setShowReplies(!showReplies)}>
              {showReplies ? t('forum.post.hideReplies') : `${t('forum.post.showReplies')} ${replies.length}`}
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
                }}
                onReportComment={onReportComment}
                reportedComments={reportedComments}
                setReportedComments={setReportedComments}
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
              className={styles['comment-input']}
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
    </div>
  );
};

export default CommentSection;