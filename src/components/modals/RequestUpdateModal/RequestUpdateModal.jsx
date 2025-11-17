import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import styles from './RequestUpdateModal.module.css';

/**
 * Modal for requesting booking update with message
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: (message: string) => void | Promise<void>
 * - bookingId?: number|string
 * - title?: string
 * - message?: string
 */
const RequestUpdateModal = ({
  isOpen,
  onClose,
  onConfirm,
  bookingId,
  title,
  message
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const confirmBtnRef = useRef(null);
  const modalContainerRef = useRef(null);
  const bodyOverflowRef = useRef('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 0);
      return () => clearTimeout(t);
    } else {
      // Reset message when modal closes
      setUpdateMessage('');
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
    if (!submitting) onClose?.();
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') handleBackdrop();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void doConfirm();
    }
  };

  const doConfirm = async () => {
    if (!onConfirm || submitting) return;
    if (!updateMessage.trim()) {
      return;
    }
    try {
      const maybePromise = onConfirm(updateMessage.trim());
      if (maybePromise && typeof maybePromise.then === 'function') {
        setSubmitting(true);
        await maybePromise;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const modalNode = (
    <div 
      className={styles['modal-overlay']} 
      onClick={(e) => { if (e.target === e.currentTarget) handleBackdrop(); }} 
      onKeyDown={handleKey} 
      tabIndex={-1}
    >
      <div 
        className={styles['request-update-modal']} 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="request-update-title"
      >
        <div className={styles['modal-panel']}>
          <div className={styles['modal-header']}>
            <h2 id="request-update-title">
              {title || 'Yêu cầu cập nhật booking'}
            </h2>
            <button
              type="button"
              className={styles['modal-close']}
              aria-label="Đóng"
              onClick={onClose}
              disabled={submitting}
            >
              ×
            </button>
          </div>

          <div className={styles['modal-content']}>
            <div className={styles['message-card']}>
              {bookingId && (
                <p className={styles['booking-id']}>
                  Booking ID: <strong>#{bookingId}</strong>
                </p>
              )}
              <p className={styles['instruction-text']}>
                {message || 'Vui lòng nhập lý do yêu cầu cập nhật booking:'}
              </p>
              <textarea
                ref={textareaRef}
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                placeholder="Ví dụ: Vui lòng cập nhật thông tin khách hàng, ngày khởi hành, hoặc số lượng khách..."
                className={styles['message-textarea']}
                rows={6}
                disabled={submitting}
              />
              {!updateMessage.trim() && (
                <p className={styles['hint-text']}>
                  Vui lòng nhập thông tin yêu cầu cập nhật
                </p>
              )}
            </div>
          </div>

          <div className={styles['modal-actions']}>
            <button 
              type="button" 
              onClick={onClose} 
              className={styles['btn-cancel']}
              disabled={submitting}
            >
              {t('common.cancel') || 'Hủy'}
            </button>
            <button 
              type="button" 
              onClick={doConfirm} 
              className={styles['btn-primary']}
              disabled={submitting || !updateMessage.trim()}
              ref={confirmBtnRef}
            >
              {submitting ? (t('common.processing') || 'Đang xử lý...') : (t('common.confirm') || 'Xác nhận')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;
  if (!modalContainerRef.current) return modalNode;
  return createPortal(modalNode, modalContainerRef.current);
};

export default RequestUpdateModal;

