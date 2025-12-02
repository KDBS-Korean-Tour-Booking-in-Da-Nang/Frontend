import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';
import styles from './ConfirmLeaveModal.module.css';

const ConfirmLeaveModal = ({ open, onCancel, onConfirm }) => {
  const { t } = useTranslation();
  const modalContainerRef = useRef(null);
  const bodyOverflowRef = useRef('');

  // Resolve portal container once on mount
  useEffect(() => {
    if (!modalContainerRef.current) {
      const root = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
      modalContainerRef.current = root || (typeof document !== 'undefined' ? document.body : null);
    }
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!modalContainerRef.current || typeof document === 'undefined') return;
    if (open) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = bodyOverflowRef.current || '';
      };
    }
  }, [open]);

  if (!open) return null;

  const modalNode = (
    <div className={styles['clm-overlay']} role="dialog" aria-modal="true" onClick={onCancel}>
      <div className={styles['clm-modal']} onClick={(e) => e.stopPropagation()}>
        <button className={styles['clm-close']} onClick={onCancel} aria-label={t('common.close')}>
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

  if (!modalContainerRef.current) return modalNode;
  return createPortal(modalNode, modalContainerRef.current);
};

export default ConfirmLeaveModal;


