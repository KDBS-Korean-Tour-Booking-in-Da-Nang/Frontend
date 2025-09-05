import React, { useState } from 'react';
import './ReportModal.css';

const ReportModal = ({ isOpen, onClose, onReport, post }) => {
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportReasons = [
    { value: 'SPAM', label: 'Spam', description: 'Nội dung spam hoặc quảng cáo không phù hợp' },
    { value: 'INAPPROPRIATE', label: 'Nội dung không phù hợp', description: 'Nội dung có thể gây khó chịu hoặc không phù hợp' },
    { value: 'VIOLENCE', label: 'Bạo lực', description: 'Nội dung chứa bạo lực hoặc đe dọa' },
    { value: 'HARASSMENT', label: 'Quấy rối', description: 'Quấy rối hoặc bắt nạt người khác' },
    { value: 'HATE_SPEECH', label: 'Ngôn từ thù địch', description: 'Ngôn từ thù địch hoặc phân biệt đối xử' },
    { value: 'FALSE_INFO', label: 'Thông tin sai lệch', description: 'Thông tin sai lệch hoặc gây hiểu lầm' },
    { value: 'COPYRIGHT', label: 'Vi phạm bản quyền', description: 'Vi phạm bản quyền hoặc sở hữu trí tuệ' },
    { value: 'OTHER', label: 'Khác', description: 'Lý do khác' }
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
        targetType: 'POST',
        targetId: post.forumPostId,
        reasons: selectedReasons,
        description: description.trim() || null
      });
      
      // Reset form
      setSelectedReasons([]);
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error reporting post:', error);
      alert('Có lỗi xảy ra khi báo cáo bài viết. Vui lòng thử lại.');
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
    <div className="report-modal-overlay" onClick={handleClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h3>Báo cáo bài viết</h3>
          <button 
            className="close-btn" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="report-modal-content">
          <div className="post-preview">
            <div className="post-author">
              <strong>{post.username}</strong>
            </div>
            <div className="post-content-preview">
              {post.title && <div className="post-title">{post.title}</div>}
              <div className="post-text">
                {post.content.length > 100 
                  ? `${post.content.substring(0, 100)}...` 
                  : post.content
                }
              </div>
            </div>
          </div>

          <div className="report-reasons">
            <h4>Vui lòng chọn lý do báo cáo:</h4>
            <div className="reasons-list">
              {reportReasons.map((reason) => (
                <div 
                  key={reason.value}
                  className={`reason-item ${selectedReasons.includes(reason.value) ? 'selected' : ''}`}
                  onClick={() => handleReasonToggle(reason.value)}
                >
                  <div className="reason-checkbox">
                    <input 
                      type="checkbox" 
                      checked={selectedReasons.includes(reason.value)}
                      onChange={() => handleReasonToggle(reason.value)}
                    />
                  </div>
                  <div className="reason-content">
                    <div className="reason-label">{reason.label}</div>
                    <div className="reason-description">{reason.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="report-description">
            <label htmlFor="description">Mô tả thêm (tùy chọn):</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết về lý do báo cáo..."
              maxLength={500}
              rows={3}
            />
            <div className="char-count">{description.length}/500</div>
          </div>
        </div>

        <div className="report-modal-footer">
          <button 
            className="cancel-btn" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button 
            className="submit-btn" 
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

export default ReportModal;
