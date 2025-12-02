import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import styles from './DeleteConfirmModal.module.css';

/**
 * Reusable confirmation modal for destructive or generic actions.
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: () => void | Promise<void>
 * - title?: string
 * - message?: string
 * - itemName?: string
 * - confirmText?: string (default: 'Xóa')
 * - cancelText?: string (default: 'Hủy')
 * - icon?: ReactNode (default: ⚠️)
 * - danger?: boolean (apply danger style to confirm button)
 * - disableBackdropClose?: boolean (default: false)
 * - children?: ReactNode (optional extra content below message)
 */
const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmText,
  cancelText,
  icon = '⚠️',
  danger = true,
  disableBackdropClose = false,
  children
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const confirmBtnRef = useRef(null);
  const modalContainerRef = useRef(null);
  const bodyOverflowRef = useRef('');

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        // Chỉ auto-focus nút xác nhận nếu hiện tại chưa có element nào khác đang được focus
        // (tránh trường hợp người dùng đã click vào input/textarea trong children, bị giật focus lại)
        if (typeof document !== 'undefined') {
          const activeElement = document.activeElement;
          if (activeElement && activeElement !== document.body) {
            return;
          }
        }
        confirmBtnRef.current?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

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
    if (isOpen) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = bodyOverflowRef.current || '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdrop = () => {
    if (!disableBackdropClose && !submitting) onClose?.();
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') handleBackdrop();
    if (e.key === 'Enter') void doConfirm();
  };

  const doConfirm = async () => {
    if (!onConfirm || submitting) return;
    try {
      const maybePromise = onConfirm();
      if (maybePromise && typeof maybePromise.then === 'function') {
        setSubmitting(true);
        await maybePromise;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const modalNode = (
    <div className={`${styles['modal-overlay']} ${styles['kdbs-modal']}`} onClick={(e) => { if (e.target === e.currentTarget) handleBackdrop(); }} onKeyDown={handleKey} tabIndex={-1}>
      <div className={styles['delete-confirm-modal']} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className={styles['modal-panel']}>
          <button
            type="button"
            className={styles['modal-close']}
            aria-label={t('common.close')}
            onClick={onClose}
            disabled={submitting}
          >
            <X size={20} strokeWidth={2} />
          </button>
          
          <div className={styles['modal-content']}>
            <div className={styles['icon-wrapper']}>
              <AlertTriangle size={36} strokeWidth={1.5} />
            </div>
            <h2 id="confirm-title" className={styles['modal-title']}>
              {title || t('common.deleteConfirm.title')}
            </h2>
            <div className={styles['message-wrapper']}>
              <p className={styles['confirm-message']}>
                {message || t('common.deleteConfirm.message', { item: itemName || t('common.item') })}
              </p>
              {danger && <p className={styles['warning-text']}>{t('common.deleteConfirm.warning')}</p>}
              {children}
            </div>
          </div>

          <div className={styles['modal-actions']}>
            <button 
              type="button" 
              onClick={onClose} 
              className={styles['btn-cancel']}
              disabled={submitting}
            >
              {cancelText || t('common.cancel')}
            </button>
            <button 
              type="button" 
              onClick={doConfirm} 
              className={danger ? styles['btn-delete'] : styles['btn-primary']}
              disabled={submitting}
              ref={confirmBtnRef}
            >
              {submitting ? t('common.processing') : (confirmText || t('common.delete'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;
  if (!modalContainerRef.current) return modalNode; // very early mount fallback
  return createPortal(modalNode, modalContainerRef.current);
};

export default DeleteConfirmModal;