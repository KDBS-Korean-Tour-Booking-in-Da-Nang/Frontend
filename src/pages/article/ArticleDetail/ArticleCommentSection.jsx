import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { getAvatarUrl } from '../../../config/api';
import { Send, MessageCircle } from 'lucide-react';
import styles from './ArticleCommentSection.module.css';

const ArticleCommentSection = ({ articleId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  // Mockup data - sẽ thay thế bằng API call sau
  const [comments] = useState([
    {
      id: 1,
      username: 'Nguyễn Văn A',
      userAvatar: null,
      userEmail: 'user1@example.com',
      content: 'Bài viết rất hay và hữu ích! Cảm ơn tác giả đã chia sẻ những thông tin chi tiết về Đà Nẵng.',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      react: 5
    },
    {
      id: 2,
      username: 'Trần Thị B',
      userAvatar: null,
      userEmail: 'user2@example.com',
      content: 'Tôi đã từng đến đây và thực sự ấn tượng với cảnh đẹp. Bài viết mô tả rất chính xác!',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      react: 3
    },
    {
      id: 3,
      username: 'Lê Văn C',
      userAvatar: null,
      userEmail: 'user3@example.com',
      content: 'Có ai biết thêm thông tin về tour này không? Tôi muốn đặt tour vào cuối tuần này.',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      react: 1
    },
    {
      id: 4,
      username: 'Phạm Thị D',
      userAvatar: null,
      userEmail: 'user4@example.com',
      content: 'Rất mong chờ được trải nghiệm những địa điểm này. Cảm ơn bạn đã chia sẻ!',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      react: 0
    },
    {
      id: 5,
      username: 'Hoàng Văn E',
      userAvatar: null,
      userEmail: 'user5@example.com',
      content: 'Bài viết rất chi tiết và có nhiều hình ảnh đẹp. Tôi sẽ lưu lại để tham khảo cho chuyến đi sắp tới.',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      react: 8
    }
  ]);

  const formatTime = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('forum.post.justNow', { defaultValue: 'Vừa xong' });
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('forum.post.minutes', { defaultValue: 'phút' })} ${t('forum.post.ago', { defaultValue: 'trước' })}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('forum.post.hours', { defaultValue: 'giờ' })} ${t('forum.post.ago', { defaultValue: 'trước' })}`;
    return `${Math.floor(diffInMinutes / 1440)} ${t('forum.post.days', { defaultValue: 'ngày' })} ${t('forum.post.ago', { defaultValue: 'trước' })}`;
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    setIsSubmitting(true);
    // Mockup: Simulate API call
    setTimeout(() => {
      // In real implementation, this would be an API call
      // For now, just clear the input
      setCommentText('');
      setIsSubmitting(false);
      // Show success message or add comment to list
    }, 500);
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

      {/* Comments List */}
      {displayedComments.length > 0 && (
        <div className={styles['comments-list']}>
          <div className={styles['comments-header']}>
            <MessageCircle className={styles['comments-icon']} />
            <span className={styles['comments-count']}>
              {comments.length} {t('article.comments.count', { defaultValue: 'bình luận' })}
            </span>
          </div>
          
          {displayedComments.map((comment) => (
            <div key={comment.id} className={styles['comment-item']}>
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
                    <span className={styles['comment-username']}>{comment.username}</span>
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
      {comments.length === 0 && (
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

