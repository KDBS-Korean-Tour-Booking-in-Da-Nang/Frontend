import React from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, X, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './PaymentConfirmModal.module.css';

const PaymentConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    modalKey = 'wizard', // 'wizard' or 'bookingDetail'
    title,
    message,
    confirmText,
    cancelText,
    loading = false
}) => {
    const { t } = useTranslation();
    
    // Get translations based on modalKey
    const modalTitle = title || t(`bookingWizard.paymentModal.${modalKey}.title`);
    const modalMessage = message || t(`bookingWizard.paymentModal.${modalKey}.message`);
    const modalConfirmText = confirmText || t(`bookingWizard.paymentModal.${modalKey}.confirm`);
    const modalCancelText = cancelText || t(`bookingWizard.paymentModal.${modalKey}.cancel`);
    const processingText = t('common.processing', 'Đang xử lý...');
    
    if (!isOpen) return null;

    return createPortal(
        <div className={styles['modal-overlay']} onClick={onClose}>
            <div
                className={styles['modal-container']}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Close button */}
                <button
                    className={styles['close-btn']}
                    onClick={onClose}
                    disabled={loading}
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                {/* Icon */}
                <div className={styles['icon-container']}>
                    <CreditCard size={32} strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h3 className={styles['modal-title']}>{modalTitle}</h3>

                {/* Message */}
                <p className={styles['modal-message']}>{modalMessage}</p>

                {/* Actions */}
                <div className={styles['modal-actions']}>
                    <button
                        className={styles['cancel-btn']}
                        onClick={onClose}
                        disabled={loading}
                    >
                        {modalCancelText}
                    </button>
                    <button
                        className={styles['confirm-btn']}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className={styles['spinner']} />
                                {processingText}
                            </>
                        ) : (
                            <>
                                <CheckCircle size={18} />
                                {modalConfirmText}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PaymentConfirmModal;
