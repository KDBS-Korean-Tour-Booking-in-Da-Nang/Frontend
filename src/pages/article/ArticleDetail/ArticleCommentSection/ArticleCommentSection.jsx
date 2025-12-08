import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { getAvatarUrl } from '../../../../config/api';
import { Send, MessageCircle } from 'lucide-react';
import articleCommentService from '../../../../services/articleCommentService';
import styles from './ArticleCommentSection.module.css';

const ArticleCommentSection = ({ articleId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load comments for article: filter parent comments only and sort by newest first
  const loadComments = useCallback(async () => {
    if (!articleId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await articleCommentService.getCommentsByArticleId(articleId);
      const parentComments = data.filter(comment => !comment.parentCommentId);
      parentComments.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
      });
      setComments(parentComments);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError(err.message || 'Không thể tải bình luận');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  // Fetch comments when articleId changes
  useEffect(() => {
    if (articleId) {
      loadComments();
    }
  }, [articleId, loadComments]);

  // Format relative time (just now, X minutes/hours/days ago)
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('forum.post.justNow', { defaultValue: 'Vừa xong' });
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('forum.post.minutes', { defaultValue: 'phút' })} ${t('forum.post.ago', { defaultValue: 'trước' })}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('forum.post.hours', { defaultValue: 'giờ' })} ${t('forum.post.ago', { defaultValue: 'trước' })}`;
    return `${Math.floor(diffInMinutes / 1440)} ${t('forum.post.days', { defaultValue: 'ngày' })} ${t('forum.post.ago', { defaultValue: 'trước' })}`;
  };

  // Handle submit new comment
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user || !articleId) return;

    setIsSubmitting(true);
    try {
      await articleCommentService.createComment({
        articleId: articleId,
        content: commentText.trim(),
      });
      
      setCommentText('');
      await loadComments();
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError(err.message || 'Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);
  const hasMoreComments = comments.length > 3;

  return (
    <div className={styles['comment-section']}>
      {/* Comment Input */}
      {user && (
        <div className={styles['comment-input-container']}>
          <img 
            src={getAvatarUrl(user.avatar)} 
            alt={user.name || user.username}
            className={styles['comment-user-avatar']}
          />
          <form onSubmit={handleSubmitComment} className={styles['comment-form']}>
            <input
              type="text"
              placeholder={t('article.comments.placeholder', { defaultValue: 'Viết bình luận...' })}
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
              {isSubmitting ? t('article.comments.submitting', { defaultValue: 'Đang gửi...' }) : t('article.comments.submit', { defaultValue: 'Gửi' })}
            </button>
          </form>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className={styles['empty-comments']}>
          <p className={styles['empty-text']}>
            {t('article.comments.loading', { defaultValue: 'Đang tải bình luận...' })}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={styles['empty-comments']}>
          <p className={styles['empty-text']} style={{ color: '#ef4444' }}>
            {error}
          </p>
        </div>
      )}

      {/* Comments List */}
      {!loading && !error && displayedComments.length > 0 && (
        <div className={styles['comments-list']}>
          <div className={styles['comments-header']}>
            <MessageCircle className={styles['comments-icon']} />
            <span className={styles['comments-count']}>
              {comments.length} {t('article.comments.count', { defaultValue: 'bình luận' })}
            </span>
          </div>
          
          {displayedComments.map((comment) => (
            <div key={comment.articleCommentId} className={styles['comment-item']}>
              <div className={styles['comment-left']}>
                <img 
                  src={getAvatarUrl(comment.userAvatar)} 
                  alt={comment.username}
                  className={styles['comment-avatar']}
                />
              </div>
              
              <div className={styles['comment-right']}>
                <div className={styles['comment-bubble']}>
                  <div className={styles['comment-header']}>
                    <span className={styles['comment-username']}>{comment.username || comment.userEmail}</span>
                    <span className={styles['comment-time']}>{formatTime(comment.createdAt)}</span>
                  </div>
                  <div className={styles['comment-text']}>{comment.content}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show More Comments */}
      {hasMoreComments && !showAllComments && (
        <div className={styles['show-more-container']}>
          <button
            onClick={() => setShowAllComments(true)}
            className={styles['show-more-btn']}
          >
            {t('article.comments.showMore', { defaultValue: 'Xem thêm bình luận' })} ({comments.length - 3})
          </button>
        </div>
      )}

      {/* Show Less Comments */}
      {showAllComments && hasMoreComments && (
        <div className={styles['show-more-container']}>
          <button
            onClick={() => setShowAllComments(false)}
            className={styles['show-more-btn']}
          >
            {t('article.comments.showLess', { defaultValue: 'Ẩn bớt bình luận' })}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && comments.length === 0 && (
        <div className={styles['empty-comments']}>
          <MessageCircle className={styles['empty-icon']} />
          <p className={styles['empty-text']}>
            {t('article.comments.empty', { defaultValue: 'Chưa có bình luận nào. Hãy là người đầu tiên bình luận!' })}
          </p>
        </div>
      )}
    </div>
  );
};

export default ArticleCommentSection;

