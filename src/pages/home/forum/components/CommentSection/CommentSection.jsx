import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { BaseURL, API_ENDPOINTS, getAvatarUrl } from '../../../../../config/api';
import CommentReportModal from './CommentReportModal';
import CommentReportSuccessModal from './CommentReportSuccessModal';
import './CommentSection.css';

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

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [post.forumPostId]);

  // Load reported comments after comments are loaded
  useEffect(() => {
    if (comments.length > 0 && user) {
      loadReportedComments();
    }
  }, [comments, user]);

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
            console.error('Error loading replies for reported check:', error);
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
          console.error('Error checking report status:', error);
        }
      }
      
      setReportedComments(prev => new Set([...prev, ...reportedIds]));
    } catch (error) {
      console.error('Error loading reported comments:', error);
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.COMMENTS_BY_POST(post.forumPostId));
      if (response.ok) {
        const data = await response.json();
        console.log('All comments from API:', data);
        console.log('Sample comment structure:', data[0]);
        console.log('Comments with parentCommentId:', data.filter(comment => comment.parentCommentId));
        console.log('Comments without parentCommentId:', data.filter(comment => !comment.parentCommentId));
        
        // Only show top-level comments (no parentCommentId)
        const topLevelComments = data.filter(comment => !comment.parentCommentId);
        console.log('Setting top-level comments:', topLevelComments);
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
      console.error('Error loading comments:', error);
    }
  };

  // Submit new comment
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const body = {
        userEmail: user.email,
        forumPostId: post.forumPostId,
        content: commentText.trim(),
        imgPath: null
      };

      const response = await fetch(API_ENDPOINTS.COMMENTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const newComment = await response.json();
        setComments(prev => [newComment, ...prev]);
        setCommentText('');
        if (onCommentAdded) {
        onCommentAdded(newComment);
        }
        if (onCommentInputToggle) {
          onCommentInputToggle(false);
        }
        if (onCountChange) {
          onCountChange(comments.length + 1);
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
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
      console.log('Missing user or comment:', { user: !!user, comment: !!comment });
      return false;
    }
    
    console.log('User object:', user);
    console.log('Comment object:', comment);
    
    const isOwner = user.email === comment.userEmail;
    console.log('Checking comment ownership:', {
      userEmail: user.email,
      commentUserEmail: comment.userEmail,
      isOwner
    });
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
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const url = `${API_ENDPOINTS.REPORTS_CREATE}?userEmail=${encodeURIComponent(user.email)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetType: reportData.targetType,
          targetId: reportData.targetId,
          reasons: reportData.reasons,
          description: reportData.description
        }),
      });

      if (response.ok) {
        // Add comment to reported list
        const newReportedComments = new Set([...reportedComments, reportData.targetId]);
        console.log('Report successful, updating reportedComments:', {
          targetId: reportData.targetId,
          oldSet: Array.from(reportedComments),
          newSet: Array.from(newReportedComments)
        });
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
      console.error('Error submitting report:', error);
      alert('Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại.');
    }
  };

  const displayedComments = showAllComments 
    ? comments
    : comments.slice(0, 3);

  const hasMoreComments = comments.length > 3;

  return (
    <div className="comment-section">
      {/* Comment Input */}
      {user && showCommentInput && (
        <div className="comment-input-container">
          <img 
            src={user.avatar ? user.avatar : '/default-avatar.png'} 
            alt={user.username}
            className="comment-user-avatar"
          />
          <form onSubmit={handleSubmitComment} className="comment-form">
            <input
              type="text"
              placeholder={t('forum.comments.placeholder')}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="comment-input"
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              className="comment-submit-btn"
              disabled={isSubmitting || !commentText.trim()}
            >
              {isSubmitting ? t('forum.comments.submitting') : t('forum.comments.submit')}
            </button>
          </form>
        </div>
      )}

      {/* Comments List */}
      {displayedComments.length > 0 && (
        <div className="comments-list">
          {displayedComments.map((comment, index) => {
            console.log('Rendering comment:', comment.forumCommentId, 'Content:', comment.content, 'ParentCommentId:', comment.parentCommentId);
            return (
              <CommentItem 
                key={comment.forumCommentId || index} 
                comment={comment}
                user={user}
                t={t}
                formatTime={formatTime}
                isCommentOwner={isCommentOwner}
                isCommentReported={isCommentReported}
                onLoginRequired={onLoginRequired}
                onCountChange={onCountChange}
                post={post}
                onCommentDeleted={handleCommentDeleted}
                onReportComment={(comment) => {
                  setReportTarget(comment);
                  setShowReportModal(true);
                }}
                reportedComments={reportedComments}
                setReportedComments={setReportedComments}
              />
            );
          })}
        </div>
      )}

      {/* Show More Comments */}
      {hasMoreComments && (
        <div className="show-more-comments">
          <button 
            onClick={() => setShowAllComments(!showAllComments)}
            className="show-more-btn"
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
        <div className="no-comments">
          <p>{t('forum.comments.noComments')}</p>
        </div>
      )}

      {/* Report Modals */}
      <CommentReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onReport={submitReport}
        comment={reportTarget}
      />
      
      <CommentReportSuccessModal
        isOpen={showReportSuccessModal}
        onClose={() => setShowReportSuccessModal(false)}
      />
    </div>
  );
};

// Individual Comment Component
const CommentItem = ({ comment, user, t, formatTime, isCommentOwner, isCommentReported, onLoginRequired, onCountChange, post, isReply = false, onCommentDeleted, onReportComment, reportedComments, setReportedComments }) => {
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [reaction, setReaction] = useState({ likeCount: 0, dislikeCount: 0, userReaction: null });
  const [showDropdown, setShowDropdown] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

  // Load replies count on mount
  useEffect(() => {
    loadReplies();
    loadReaction();
  }, [comment.forumCommentId]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown) {
        const dropdown = event.target.closest('.comment-actions-menu');
        const dropdownItem = event.target.closest('.dropdown-item');
        
        // Close dropdown if:
        // 1. Click is outside the entire dropdown menu, OR
        // 2. Click is on a disabled item (like "Đã báo cáo")
        if (!dropdown || (dropdownItem && dropdownItem.classList.contains('report-item-disabled'))) {
          setShowDropdown(false);
        }
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
        console.log('Loading replies for comment:', comment.forumCommentId, 'Replies:', data);
        setReplies(data);
        
        // Load reported status for replies if user is logged in
        if (user && data.length > 0) {
          loadReportedStatusForReplies(data);
        }
      }
    } catch (error) {
      console.error('Error loading replies:', error);
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
          console.error('Error checking report status for reply:', error);
        }
      }
      
      // Update reported comments state
      if (reportedIds.length > 0) {
        setReportedComments(prev => new Set([...prev, ...reportedIds]));
      }
    } catch (error) {
      console.error('Error loading reported status for replies:', error);
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
      console.error('Error loading reaction:', error);
    }
  };

  // Handle reaction
  const handleReaction = async (type) => {
    if (!user) {
      if (onLoginRequired) onLoginRequired();
      return;
    }

    console.log('Reaction clicked:', type, 'for comment:', comment.forumCommentId);

    try {
      const email = user?.email || localStorage.getItem('userEmail') || localStorage.getItem('email');
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      const headers = {
        'Content-Type': 'application/json',
        'User-Email': email,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Toggle off if same reaction
      if (reaction.userReaction === type) {
        const response = await fetch(API_ENDPOINTS.REACTIONS_COMMENT(comment.forumCommentId), { 
          method: 'POST', 
          headers 
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
        reactionType: type 
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
    console.log('Reply button clicked for:', comment.forumCommentId);
    setShowReplyInput(!showReplyInput);
  };

  // Submit reply
  const handleSubmitReply = async () => {
    if (!replyText.trim() || !user) return;

    setIsSubmittingReply(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const body = {
        userEmail: user.email,
        forumPostId: post.forumPostId,
        content: replyText.trim(),
        imgPath: null,
        parentCommentId: comment.forumCommentId
      };

      const response = await fetch(API_ENDPOINTS.COMMENTS, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const newReply = await response.json();
        setReplies(prev => [newReply, ...prev]);
        setReplyText('');
        setShowReplyInput(false);
        if (onCountChange) {
          onCountChange(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Handle show/hide replies
  const handleToggleReplies = () => {
    console.log('Toggle replies clicked for:', comment.forumCommentId);
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
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(API_ENDPOINTS.COMMENTS + `/${comment.forumCommentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
        console.log('Comment updated successfully:', comment.forumCommentId);
      } else {
        console.error('Failed to update comment:', response.status);
        alert('Có lỗi xảy ra khi cập nhật bình luận. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Có lỗi xảy ra khi cập nhật bình luận. Vui lòng thử lại.');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(API_ENDPOINTS.COMMENTS + `/${comment.forumCommentId}?userEmail=${user.email}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        console.log('Comment deleted successfully:', comment.forumCommentId);
        setShowDropdown(false);
        
        // Notify parent component to remove this comment
        if (onCommentDeleted) {
          onCommentDeleted(comment.forumCommentId);
        }
        
        if (onCountChange) {
          onCountChange(prev => prev - 1);
        }
      } else {
        console.error('Failed to delete comment:', response.status);
        alert('Có lỗi xảy ra khi xóa bình luận. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Có lỗi xảy ra khi xóa bình luận. Vui lòng thử lại.');
    }
  };

  // Handle report
  const handleReport = () => {
    console.log('handleReport called for comment:', comment.forumCommentId);
    console.log('Current reportedComments:', Array.from(reportedComments || []));
    console.log('Is comment reported?', reportedComments && reportedComments.has(comment.forumCommentId));
    
    // Check if already reported
    if (reportedComments && reportedComments.has(comment.forumCommentId)) {
      console.log('Comment already reported:', comment.forumCommentId);
      setShowDropdown(false);
      return;
    }
    
    if (onReportComment) {
      onReportComment(comment);
    }
    setShowDropdown(false);
  };

  return (
    <div className={`comment-item ${isReply ? 'reply-item' : ''}`}>
      <img 
        src={getAvatarUrl(comment.userAvatar)} 
        alt={comment.username}
        className="comment-avatar"
      />
      <div className="comment-content">
        <div className="comment-header">
          <span className="comment-username">{comment.username}</span>
          <span className="comment-time">{formatTime(comment.createdAt)}</span>
          {user && (
            <div className="comment-actions-menu">
              <button 
                className="comment-more-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
              >
                ⋯
              </button>
              {showDropdown && (
                <div className="comment-dropdown show">
                  {(() => {
                    const isOwner = isCommentOwner(comment);
                    const isReported = reportedComments && reportedComments.has(comment.forumCommentId);
                    console.log('Dropdown render - isOwner:', isOwner, 'isReported:', isReported, 'for comment:', comment.forumCommentId);
                    console.log('reportedComments in dropdown:', Array.from(reportedComments || []));
                    return isOwner ? (
                      <>
                        <button 
                          className="dropdown-item edit-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit();
                          }}
                        >
                          <span className="dropdown-icon">✏️</span>
                          Chỉnh sửa
                        </button>
                        <button 
                          className="dropdown-item delete-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                          }}
                        >
                          <span className="dropdown-icon">🗑️</span>
                          Xóa
                        </button>
                      </>
                    ) : (
                      isReported ? (
                        <div className="dropdown-item report-item-disabled">
                          <span className="dropdown-icon">✅</span>
                          Đã báo cáo
                        </div>
                      ) : (
                        <button 
                          className="dropdown-item report-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReport();
                          }}
                        >
                          <span className="dropdown-icon">⚠️</span>
                          Báo cáo
                        </button>
                      )
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
        
        {editing ? (
          <div className="edit-comment-form">
            <textarea
              className="edit-comment-input"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Chỉnh sửa bình luận..."
            />
            <div className="edit-comment-actions">
              <button className="save-edit-btn" onClick={handleSaveEdit}>
                Lưu
              </button>
              <button className="cancel-edit-btn" onClick={() => setEditing(false)}>
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <div className="comment-text">{comment.content}</div>
        )}
        
        <div className="comment-actions">
          {user ? (
            <>
              <button 
                className={`comment-action-btn ${reaction.userReaction === 'LIKE' ? 'active' : ''}`}
                onClick={() => handleReaction('LIKE')}
              >
                {t('forum.post.like')} ({reaction.likeCount})
              </button>
              <button 
                className={`comment-action-btn ${reaction.userReaction === 'DISLIKE' ? 'active' : ''}`}
                onClick={() => handleReaction('DISLIKE')}
              >
                {t('forum.post.dislike')} ({reaction.dislikeCount})
              </button>
              <button 
                className="comment-action-btn" 
                onClick={handleReply}
              >
                {t('forum.post.reply')}
              </button>
            </>
          ) : (
            <>
              <div 
                className="comment-action-btn-disabled" 
                title={t('forum.guest.loginToReact')}
                onClick={() => onLoginRequired && onLoginRequired()}
              >
                {t('forum.post.like')} ({reaction.likeCount})
              </div>
              <div 
                className="comment-action-btn-disabled" 
                title={t('forum.guest.loginToReact')}
                onClick={() => onLoginRequired && onLoginRequired()}
              >
                {t('forum.post.dislike')} ({reaction.dislikeCount})
              </div>
              <div 
                className="comment-action-btn-disabled" 
                title={t('forum.guest.loginToComment')}
                onClick={() => onLoginRequired && onLoginRequired()}
              >
                {t('forum.post.reply')}
              </div>
            </>
          )}
        </div>

        {/* Show replies button */}
        {replies.length > 0 && (
          <div className="reply-toggle-row">
            <button 
              className="show-more-btn" 
              onClick={handleToggleReplies}
            >
              {showReplies ? t('forum.post.hideReplies') : `${t('forum.post.showReplies')} ${replies.length}`}
            </button>
          </div>
        )}

        {/* Show replies */}
        {showReplies && (
          <div className="replies-container">
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
          <div className="reply-input-row">
            <input
              type="text"
              value={replyText}
              placeholder={t('forum.comments.replyPlaceholder')}
              onChange={(e) => setReplyText(e.target.value)}
              className="comment-input"
            />
            <button 
              className="comment-submit-btn" 
              onClick={handleSubmitReply}
              disabled={isSubmittingReply || !replyText.trim()}
            >
              {isSubmittingReply ? t('forum.comments.submitting') : t('forum.comments.submit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;