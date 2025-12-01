import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info, X } from 'lucide-react';
import styles from './Step2InfoModal.module.css';

const Step2InfoModal = ({ open, onClose }) => {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className={styles['sim-overlay']} onClick={onClose}>
      <div className={styles['sim-modal']} onClick={(e) => e.stopPropagation()}>
        <button 
          className={styles['sim-close']}
          onClick={onClose}
          aria-label={t('common.close') || 'Đóng'}
        >
          <X size={20} strokeWidth={2} />
        </button>
        <div className={styles['sim-content']}>
          <div className={styles['sim-icon-wrapper']}>
            <Info size={36} strokeWidth={1.5} />
          </div>
          <h2 className={styles['sim-title']}>
            {t('booking.modal.step2Info.title') || 'Thông tin hành khách'}
          </h2>
          <p className={styles['sim-message']}>
            {t('booking.modal.step2Info.message') || 'Vui lòng điền đầy đủ thông tin cho tất cả các hành khách ở bước 2. Bạn cần nhập lại thông tin cho các hành khách.'}
          </p>
        </div>
        <div className={styles['sim-actions']}>
          <button 
            className={`${styles['sim-btn']} ${styles['sim-btn-primary']}`}
            onClick={onClose}
          >
            {t('common.understand') || 'Đã hiểu'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step2InfoModal;
