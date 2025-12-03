import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ReportSuccessModal.module.css';

const ReportSuccessModal = ({ isOpen, onClose }) => {
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

  return (
    <div className={styles['report-success-overlay']} onClick={onClose}>
      <div className={styles['report-success-modal']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['success-icon']}>
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

        <div className={styles['success-content']}>
          <h3>{t('forum.modals.reportSuccess.title')}</h3>
          <p>
            {t('forum.modals.reportSuccess.message')}
          </p>
          <p className={styles['admin-note']}>
            <strong>{t('forum.modals.reportSuccess.adminNote')}</strong>
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
          <div className={styles['progress-text']}>{t('forum.modals.reportSuccess.autoClose', { seconds: timeLeft })}</div>
        </div>

        <div className={styles['success-actions']}>
          <button className={styles['ok-btn']} onClick={onClose}>
            {t('forum.modals.reportSuccess.understood')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportSuccessModal;
