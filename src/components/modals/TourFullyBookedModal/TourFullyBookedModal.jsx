import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './TourFullyBookedModal.module.css';

const TourFullyBookedModal = ({
    isOpen,
    onClose,
    message
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    const modalTitle = t('bookingWizard.tourFullyBookedModal.title', 'Tour đã hết chỗ');
    const modalMessage = message || t('bookingWizard.tourFullyBookedModal.message', 'Tour này đã hết chỗ. Vui lòng chọn tour khác.');
    const closeText = t('bookingWizard.tourFullyBookedModal.close', 'Đóng');
    
    const handleClose = () => {
        if (onClose) {
            onClose();
        }
        navigate('/tour');
    };
    
    if (!isOpen) return null;

    return createPortal(
        <div className={styles['modal-overlay']} onClick={handleClose}>
            <div
                className={styles['modal-container']}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Close button */}
                <button
                    className={styles['close-btn']}
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                {/* Icon */}
                <div className={styles['icon-container']}>
                    <AlertCircle size={32} strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h3 className={styles['modal-title']}>{modalTitle}</h3>

                {/* Message */}
                <p className={styles['modal-message']}>{modalMessage}</p>

                {/* Actions */}
                <div className={styles['modal-actions']}>
                    <button
                        className={styles['close-button']}
                        onClick={handleClose}
                    >
                        {closeText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TourFullyBookedModal;

