import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './ComplaintModal.module.css';

/**
 * Modal nhập nội dung khiếu nại cho booking
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: (message: string) => void | Promise<void>
 * - bookingId?: number|string
 */
const ComplaintModal = ({ isOpen, onClose, onConfirm, bookingId }) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const modalContainerRef = useRef(null);
  const bodyOverflowRef = useRef('');
  const textareaRef = useRef(null);

  // Khởi tạo container cho portal ngay từ lần render đầu tiên
  if (!modalContainerRef.current && typeof document !== 'undefined') {
    const root = document.getElementById('modal-root');
    modalContainerRef.current = root || document.body;
  }



  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 0);
      return () => clearTimeout(t);
    } else {
      setMessage('');
    }
  }, [isOpen]);

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

    const trimmed = message.trim();

    if (!trimmed) return;

    try {

      const maybePromise = onConfirm(trimmed);

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

      onClick={(e) => {

        if (e.target === e.currentTarget) handleBackdrop();

      }}

      onKeyDown={handleKey}

      tabIndex={-1}

    >

      <div

        className={styles['complaint-modal']}

        onClick={(e) => e.stopPropagation()}

        role="dialog"

        aria-modal="true"

        aria-labelledby="complaint-modal-title"

      >

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

              <MessageCircle size={32} strokeWidth={1.6} />

            </div>

            <h2 id="complaint-modal-title" className={styles['modal-title']}>
              {t('complaintModal.title')}
            </h2>

            {bookingId && (
              <p className={styles['booking-id']}>
                {t('complaintModal.bookingIdLabel')} <strong>#{bookingId}</strong>
              </p>
            )}

            <p className={styles['instruction-text']}>
              {t('complaintModal.instruction')}
            </p>

            <textarea

              ref={textareaRef}

              className={styles['message-textarea']}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('complaintModal.placeholder')}
              disabled={submitting}
            />

          </div>



          <div className={styles['modal-actions']}>

            <button
              type="button"
              onClick={onClose}
              className={styles['btn-cancel']}
              disabled={submitting}
            >
              {t('complaintModal.actions.close')}
            </button>

            <button
              type="button"
              onClick={doConfirm}
              className={styles['btn-primary']}
              disabled={submitting || !message.trim()}
            >
              {submitting ? t('common.processing') : t('complaintModal.actions.submit')}
            </button>

          </div>

        </div>

      </div>

    </div>

  );



  if (!modalContainerRef.current) return modalNode;

  return createPortal(modalNode, modalContainerRef.current);

};



export default ComplaintModal;

