import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import styles from './CommentReportSuccessModal.module.css';

const CommentReportSuccessModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(3);

  useEffect(() => {
    if (!isOpen) return;

    // Reset timer when modal opens
    setTimeLeft(3);

    // Auto close after 3 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    // Countdown timer for display
    const countdown = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className={styles['comment-report-success-overlay']} onClick={onClose}>
      <div className={styles['comment-report-success-modal']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['success-icon']}>
          <CheckCircle2 size={56} strokeWidth={1.5} />
        </div>
        
        <div className={styles['success-content']}>
          <h3>Báo cáo đã được gửi thành công!</h3>
          <p>
            Cảm ơn bạn đã báo cáo bình luận này. Chúng tôi sẽ xem xét và xử lý trong thời gian sớm nhất.
          </p>
          <p className={styles['admin-note']}>
            <strong>Lưu ý:</strong> Đội ngũ quản trị viên sẽ xem xét báo cáo của bạn và thực hiện các biện pháp phù hợp.
          </p>
        </div>
        
        <div className={styles['auto-close-progress']}>
          <div className={styles['progress-bar']}>
            <div 
              className={styles['progress-fill']} 
              style={{ 
                width: `${((3 - timeLeft) / 3) * 100}%`,
                transition: 'width 1s linear'
              }}
            ></div>
          </div>
          <div className={styles['progress-text']}>Tự động đóng sau {timeLeft} giây</div>
        </div>
        
        <div className={styles['success-actions']}>
          <button className={styles['ok-btn']} onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CommentReportSuccessModal;
