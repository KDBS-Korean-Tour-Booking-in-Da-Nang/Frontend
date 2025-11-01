import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ConfirmLeaveModal.module.css';

const ConfirmLeaveModal = ({ open, onCancel, onConfirm }) => {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className={styles['clm-overlay']} role="dialog" aria-modal="true">
      <div className={styles['clm-modal']}>
        <h3 className={styles['clm-title']}>{t('common.modal.confirmLeave.title')}</h3>
        <p className={styles['clm-message']}>{t('common.modal.confirmLeave.message')}</p>
        <div className={styles['clm-actions']}>
          <button type="button" className={`${styles['clm-btn']} ${styles['clm-btn-cancel']}`} onClick={onCancel}>{t('common.modal.confirmLeave.stay')}</button>
          <button type="button" className={`${styles['clm-btn']} ${styles['clm-btn-danger']}`} onClick={onConfirm}>{t('common.modal.confirmLeave.leave')}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLeaveModal;


