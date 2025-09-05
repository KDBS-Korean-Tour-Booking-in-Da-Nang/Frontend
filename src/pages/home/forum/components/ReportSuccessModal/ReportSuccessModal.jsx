import React, { useEffect, useState } from 'react';
import './ReportSuccessModal.css';

const ReportSuccessModal = ({ isOpen, onClose }) => {
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

  return (
    <div className="report-success-overlay" onClick={onClose}>
      <div className="report-success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon">
          <svg 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" fill="#10b981" />
            <path 
              d="M9 12l2 2 4-4" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        <div className="success-content">
          <h3>Báo cáo đã được gửi thành công!</h3>
          <p>
            Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét và xử lý báo cáo của bạn trong thời gian sớm nhất.
          </p>
          <p className="admin-note">
            <strong>Vui lòng đợi admin xem xét!</strong>
          </p>
        </div>
        
        <div className="auto-close-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${((3 - timeLeft) / 3) * 100}%`,
                transition: 'width 1s linear'
              }}
            ></div>
          </div>
          <div className="progress-text">Tự động đóng sau {timeLeft}s</div>
        </div>
        
        <div className="success-actions">
          <button className="ok-btn" onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportSuccessModal;
