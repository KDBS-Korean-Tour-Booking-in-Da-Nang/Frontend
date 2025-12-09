import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  UserGroupIcon,
  UserIcon,
  PhoneIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import styles from './BookingHistoryCard.module.css';

const STATUS_KEYS = {
  PENDING_PAYMENT: 'pendingPayment',
  WAITING_FOR_APPROVED: 'waitingForApproved',
  WAITING_FOR_UPDATE: 'waitingForUpdate',
  BOOKING_REJECTED: 'bookingRejected',
  BOOKING_FAILED: 'bookingFailed',
  BOOKING_SUCCESS_PENDING: 'bookingSuccessPending',
  BOOKING_SUCCESS_WAIT_FOR_CONFIRMED: 'bookingSuccessWaitForConfirmed',
  BOOKING_UNDER_COMPLAINT: 'bookingUnderComplaint',
  BOOKING_SUCCESS: 'bookingSuccess'
};

const statusColorMap = {
  // Thanh toán chờ: cam đậm
  [STATUS_KEYS.PENDING_PAYMENT]: '#F97316',
  [STATUS_KEYS.WAITING_FOR_APPROVED]: '#3B82F6',
  [STATUS_KEYS.WAITING_FOR_UPDATE]: '#8B5CF6',
  [STATUS_KEYS.BOOKING_REJECTED]: '#EF4444',
  [STATUS_KEYS.BOOKING_FAILED]: '#DC2626',
  // Đã duyệt nhưng chờ tour diễn ra: teal
  [STATUS_KEYS.BOOKING_SUCCESS_PENDING]: '#14B8A6',
  [STATUS_KEYS.BOOKING_SUCCESS_WAIT_FOR_CONFIRMED]: '#2563EB',
  // Đang khiếu nại: vàng tươi
  [STATUS_KEYS.BOOKING_UNDER_COMPLAINT]: '#EAB308',
  [STATUS_KEYS.BOOKING_SUCCESS]: '#10B981'
};

const normalizeStatus = (status) => {
  if (status === null || status === undefined) {
    return STATUS_KEYS.PENDING_PAYMENT;
  }

  if (typeof status === 'number') {
    if (status === 1) return STATUS_KEYS.BOOKING_SUCCESS;
    if (status === 2) return STATUS_KEYS.BOOKING_REJECTED;
    return STATUS_KEYS.PENDING_PAYMENT;
  }

  const raw = String(status).trim().toUpperCase();

  if (raw === '0') return STATUS_KEYS.PENDING_PAYMENT;
  if (raw === '1') return STATUS_KEYS.BOOKING_SUCCESS;
  if (raw === '2') return STATUS_KEYS.BOOKING_REJECTED;

  if (STATUS_KEYS[raw]) {
    return STATUS_KEYS[raw];
  }

  const legacyMap = {
    PURCHASED: STATUS_KEYS.BOOKING_SUCCESS,
    CONFIRMED: STATUS_KEYS.WAITING_FOR_APPROVED,
    PENDING: STATUS_KEYS.PENDING_PAYMENT,
    CANCELLED: STATUS_KEYS.BOOKING_REJECTED,
    FAILED: STATUS_KEYS.BOOKING_FAILED,
    SUCCESS: STATUS_KEYS.BOOKING_SUCCESS
  };

  return legacyMap[raw] || STATUS_KEYS.PENDING_PAYMENT;
};

const normalizeTransaction = (trx) => {
  if (!trx && typeof trx !== 'number') return undefined;
  if (typeof trx === 'number') {
    return trx === 1 ? 'SUCCESS' : trx === 2 ? 'FAILED' : trx === 3 ? 'CANCELLED' : 'PENDING';
  }
  return String(trx || '').toUpperCase();
};

const getStatusColor = (statusKey) => statusColorMap[statusKey] || '#6B7280';

const getTransactionStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':
      return '#10B981';
    case 'PENDING':
      return '#F59E0B';
    case 'FAILED':
      return '#EF4444';
    case 'CANCELLED':
      return '#DC2626';
    default:
      return '#6B7280';
  }
};

const BookingHistoryCard = ({ booking }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [hasConfirmedCancel, setHasConfirmedCancel] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewDetails = () => {
    navigate(`/user/booking?id=${booking.bookingId}`);
  };

  // Compute effective booking status based on transaction
  const effectiveStatus = (() => {
    const trxRaw = booking?.transactionStatus ?? booking?.latestTransactionStatus;
    const trx = normalizeTransaction(trxRaw);
    if (trx === 'SUCCESS') return STATUS_KEYS.BOOKING_SUCCESS;
    const rawStatus = booking?.status ?? booking?.bookingStatus;
    return normalizeStatus(rawStatus);
  })();

const getStatusIcon = (iconColor) => {
    switch (effectiveStatus) {
      case STATUS_KEYS.BOOKING_SUCCESS:
      return <CheckCircleIcon className={styles['status-icon']} style={{ color: iconColor }} />;
      case STATUS_KEYS.BOOKING_REJECTED:
      case STATUS_KEYS.BOOKING_FAILED:
      case STATUS_KEYS.BOOKING_UNDER_COMPLAINT:
      return <XCircleIcon className={styles['status-icon']} style={{ color: iconColor }} />;
      case STATUS_KEYS.WAITING_FOR_APPROVED:
      case STATUS_KEYS.BOOKING_SUCCESS_PENDING:
      case STATUS_KEYS.BOOKING_SUCCESS_WAIT_FOR_CONFIRMED:
      case STATUS_KEYS.WAITING_FOR_UPDATE:
      return <ClockIcon className={styles['status-icon']} style={{ color: iconColor }} />;
      default:
      return <ClockIcon className={styles['status-icon']} style={{ color: iconColor }} />;
    }
  };

  const statusColor = getStatusColor(effectiveStatus);

  const handleCardClick = (e) => {
    // Prevent navigation if clicking on the button itself (to avoid double navigation)
    if (e.target.closest(`.${styles['view-details-btn']}`)) {
      return;
    }
    handleViewDetails();
  };

  const handleButtonClick = (e) => {
    e.stopPropagation(); // Prevent card click from firing
    handleViewDetails();
  };

  const handleCancelClick = (e) => {
    e.stopPropagation();
    setHasConfirmedCancel(false);
    setShowCancelModal(true);
  };

  const handleCloseModal = useCallback((e) => {
    if (e) e.stopPropagation();
    setShowCancelModal(false);
    setHasConfirmedCancel(false);
  }, []);

  const handleConfirmCancel = useCallback((e) => {
    e.stopPropagation();
    setHasConfirmedCancel(true);
  }, []);

  const previewRefundPercent = booking?.refundPreviewPercent ?? 80;

  const modalNode = useMemo(() => {
    if (!showCancelModal) return null;
    return createPortal(
      <div className={styles['modal-overlay']} onClick={handleCloseModal} role="presentation">
        <div
          className={styles['modal']}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {!hasConfirmedCancel ? (
            <>
              <div className={styles['modal-header']}>
                <h3>{t('bookingHistory.cancel.title')}</h3>
              </div>
              <p className={styles['modal-text']}>
                {t(
                  'bookingHistory.cancel.message',
                  'Bạn chắc chắn muốn huỷ booking này? Sau khi xác nhận, chúng tôi sẽ tính toán mức hoàn tiền dự kiến theo chính sách hiện tại.'
                )}
              </p>
              <div className={styles['modal-actions']}>
                <button className={styles['ghost-btn']} onClick={handleCloseModal} type="button">
                  {t('common.close')}
                </button>
                <button className={styles['primary-btn']} onClick={handleConfirmCancel} type="button">
                  {t('bookingHistory.cancel.confirm')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles['modal-header']}>
                <h3>{t('bookingHistory.cancel.successTitle')}</h3>
              </div>
              <p className={styles['modal-text']}>
                {t(
                  'bookingHistory.cancel.successBody',
                  'Yêu cầu huỷ đã được ghi nhận. Khoản hoàn tiền tạm tính'
                )}{' '}
                <strong>{previewRefundPercent}%</strong>{' '}
                {t('bookingHistory.cancel.successTail', 'sẽ được chuyển theo phương thức thanh toán ban đầu.')}
              </p>
              <div className={styles['refund-note']}>
                {t(
                  'bookingHistory.cancel.note',
                  'Lưu ý: Đây chỉ là màn thử nghiệm UI, chưa gọi API. Vui lòng kiểm tra chính sách hoàn tiền thực tế của tour.'
                )}
              </div>
              <div className={styles['modal-actions']}>
                <button className={styles['primary-btn']} onClick={handleCloseModal} type="button">
                  {t('common.close')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>,
      document.body
    );
  }, [showCancelModal, hasConfirmedCancel, handleCloseModal, handleConfirmCancel, previewRefundPercent, t]);

  return (
    <>
      <div 
        className={styles['booking-card']}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleViewDetails();
          }
        }}
        aria-label={`View details for booking ${booking.bookingId}`}
      >
      <div className={styles['card-header']}>
        <div className={styles['booking-id-section']}>
          <DocumentTextIcon className={styles['id-icon']} />
          <div>
            <div className={styles['booking-main-row']}>
              <div className={styles['booking-field']}>
                <div className={styles['booking-id-label']}>
                  {t('bookingHistory.card.bookingId')}
                </div>
                <div className={styles['booking-id']}>#{booking.bookingId}</div>
              </div>
              {booking.tourName && (
                <div className={styles['booking-field']}>
                  <div className={styles['booking-tour-label']}>
                    {t('bookingHistory.card.tourName')}
                  </div>
                  <div className={styles['booking-tour-name']}>
                    {booking.tourName}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div
          className={styles['status-badge']}
          style={{
            backgroundColor: `${statusColor}15`,
            color: statusColor,
            border: `1px solid ${statusColor}30`
          }}
        >
          {getStatusIcon(statusColor)}
          <span>{t(`bookingHistory.status.${effectiveStatus || STATUS_KEYS.PENDING_PAYMENT}`)}</span>
        </div>
      </div>

      <div className={styles['booking-content']}>
        <div className={styles['info-grid']}>
          <div className={styles['info-item']}>
            <div className={styles['info-label']}>
              <CalendarIcon className={styles['item-icon']} />
              <span>{t('bookingHistory.card.departureDate')}</span>
            </div>
            <div className={styles['info-value']}>
              {formatDate(booking.departureDate)}
            </div>
          </div>
          
          <div className={styles['info-item']}>
            <div className={styles['info-label']}>
              <UserGroupIcon className={styles['item-icon']} />
              <span>{t('bookingHistory.card.totalGuests')}</span>
            </div>
            <div className={styles['info-value']}>
              {booking.totalGuests} {t('bookingHistory.card.guests')}
            </div>
          </div>
          
          <div className={styles['info-item']}>
            <div className={styles['info-label']}>
              <UserIcon className={styles['item-icon']} />
              <span>{t('bookingHistory.card.contactName')}</span>
            </div>
            <div className={styles['info-value']}>
              {booking.contactName}
            </div>
          </div>
          
          <div className={styles['info-item']}>
            <div className={styles['info-label']}>
              <PhoneIcon className={styles['item-icon']} />
              <span>{t('bookingHistory.card.contactPhone')}</span>
            </div>
            <div className={styles['info-value']}>
              {booking.contactPhone}
            </div>
          </div>
        </div>

        {(booking?.transactionStatus || booking?.latestTransactionStatus) && (
          <div className={styles['transaction-badge']}>
            <span className={styles['transaction-label']}>
              {t('bookingHistory.card.transaction')}:
            </span>
            <span className={styles['transaction-value']}>
              {t(`bookingHistory.transactionStatus.${String(normalizeTransaction(booking.transactionStatus ?? booking.latestTransactionStatus) || 'PENDING').toLowerCase()}`) || normalizeTransaction(booking.transactionStatus ?? booking.latestTransactionStatus)}
            </span>
          </div>
        )}
      </div>

      <div className={styles['card-footer']}>
        <div className={styles['action-buttons']}>
          <button 
            className={styles['cancel-btn']}
            onClick={handleCancelClick}
            type="button"
          >
            {t('bookingHistory.card.cancelBooking')}
          </button>
          <button 
            className={styles['view-details-btn']}
            onClick={handleButtonClick}
            type="button"
          >
            <span>{t('bookingHistory.card.viewDetails')}</span>
            <ArrowRightIcon className={styles['btn-icon']} />
          </button>
        </div>
      </div>
      </div>
      {modalNode}
    </>
  );
};

export default BookingHistoryCard;
