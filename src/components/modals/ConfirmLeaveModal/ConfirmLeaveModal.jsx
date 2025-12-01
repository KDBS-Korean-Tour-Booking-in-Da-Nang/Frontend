import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X } from 'lucide-react';
import styles from './ConfirmLeaveModal.module.css';

const ConfirmLeaveModal = ({ open, onCancel, onConfirm }) => {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className={styles['clm-overlay']} role="dialog" aria-modal="true" onClick={onCancel}>
      <div className={styles['clm-modal']} onClick={(e) => e.stopPropagation()}>
        <button className={styles['clm-close']} onClick={onCancel} aria-label="Close">
          <X size={20} strokeWidth={2} />
        </button>
        <div className={styles['clm-content']}>
          <div className={styles['clm-icon-wrapper']}>
            <AlertCircle size={32} strokeWidth={1.5} />
          </div>
          <h3 className={styles['clm-title']}>{t('common.modal.confirmLeave.title')}</h3>
          <p className={styles['clm-message']}>{t('common.modal.confirmLeave.message')}</p>
        </div>
        <div className={styles['clm-actions']}>
          <button type="button" className={`${styles['clm-btn']} ${styles['clm-btn-cancel']}`} onClick={onCancel}>
            {t('common.modal.confirmLeave.stay')}
          </button>
          <button type="button" className={`${styles['clm-btn']} ${styles['clm-btn-danger']}`} onClick={onConfirm}>
            {t('common.modal.confirmLeave.leave')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLeaveModal;


