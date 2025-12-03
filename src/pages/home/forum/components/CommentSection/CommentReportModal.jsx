import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CommentReportModal.module.css';

const CommentReportModal = ({ isOpen, onClose, onReport, comment }) => {
  const { t } = useTranslation();
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportReasons = [
    { value: 'SPAM', label: 'Spam', description: 'Nội dung spam hoặc quảng cáo không mong muốn' },
    { value: 'INAPPROPRIATE', label: 'Nội dung không phù hợp', description: 'Nội dung không phù hợp với cộng đồng' },
    { value: 'VIOLENCE', label: 'Bạo lực', description: 'Nội dung chứa bạo lực hoặc đe dọa' },
    { value: 'HARASSMENT', label: 'Quấy rối', description: 'Quấy rối hoặc bắt nạt người khác' },
    { value: 'HATE_SPEECH', label: 'Ngôn từ thù địch', description: 'Ngôn từ thù địch hoặc phân biệt đối xử' },
    { value: 'FALSE_INFO', label: 'Thông tin sai lệch', description: 'Thông tin sai lệch hoặc gây hiểu lầm' },
    { value: 'COPYRIGHT', label: 'Vi phạm bản quyền', description: 'Vi phạm bản quyền hoặc sở hữu trí tuệ' },
    { value: 'OTHER', label: 'Khác', description: 'Lý do khác không được liệt kê ở trên' }
  ];

  const handleReasonToggle = (reason) => {
    setSelectedReasons(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      alert('Vui lòng chọn ít nhất một lý do báo cáo');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReport({
        targetType: 'COMMENT',
        targetId: comment.forumCommentId,
        reasons: selectedReasons,
        description: description.trim() || null
      });
      
      // Reset form
      setSelectedReasons([]);
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error reporting comment:', error);
      alert('Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReasons([]);
      setDescription('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles['comment-report-modal-overlay']} onClick={handleClose}>
      <div className={styles['comment-report-modal']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['comment-report-modal-header']}>
          <h3>Báo cáo bình luận</h3>
          <button 
            className={styles['close-btn']} 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className={styles['comment-report-modal-content']}>
          <div className={styles['comment-preview']}>
            <div className={styles['comment-author']}>
              <strong>{comment.username}</strong>
            </div>
            <div className={styles['comment-content-preview']}>
              {comment.content.length > 100 
                ? `${comment.content.substring(0, 100)}...` 
                : comment.content
              }
            </div>
          </div>

          <div className={styles['report-reasons']}>
            <h4>Chọn lý do báo cáo</h4>
            <div className={styles['reasons-list']}>
              {reportReasons.map((reason) => (
                <div 
                  key={reason.value}
                  className={`reason-item ${selectedReasons.includes(reason.value) ? 'selected' : ''}`}
                  onClick={() => handleReasonToggle(reason.value)}
                >
                  <div className={styles['reason-checkbox']}>
                    <input 
                      type="checkbox" 
                      checked={selectedReasons.includes(reason.value)}
                      onChange={() => handleReasonToggle(reason.value)}
                    />
                  </div>
                  <div className={styles['reason-content']}>
                    <div className={styles['reason-label']}>{reason.label}</div>
                    <div className={styles['reason-description']}>{reason.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles['report-description']}>
            <label htmlFor="description">Mô tả thêm (tùy chọn)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết về lý do báo cáo..."
              maxLength={500}
              rows={3}
            />
            <div className={styles['char-count']}>{description.length}/500</div>
          </div>
        </div>

        <div className={styles['comment-report-modal-footer']}>
          <button 
            className={styles['cancel-btn']} 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button 
            className={styles['submit-btn']} 
            onClick={handleSubmit}
            disabled={isSubmitting || selectedReasons.length === 0}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentReportModal;
