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
  DocumentTextIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { previewCancelBooking, cancelBooking } from '../../../../services/bookingAPI';
import styles from './BookingHistoryCard.module.css';

const STATUS_KEYS = {
  PENDING_PAYMENT: 'pendingPayment',
  PENDING_DEPOSIT_PAYMENT: 'pendingDepositPayment',       // NEW
  PENDING_BALANCE_PAYMENT: 'pendingBalancePayment',       // NEW
  WAITING_FOR_APPROVED: 'waitingForApproved',
  WAITING_FOR_UPDATE: 'waitingForUpdate',
  BOOKING_REJECTED: 'bookingRejected',
  BOOKING_FAILED: 'bookingFailed',
  BOOKING_BALANCE_SUCCESS: 'bookingBalanceSuccess',       // NEW
  BOOKING_SUCCESS_PENDING: 'bookingSuccessPending',
  BOOKING_SUCCESS_WAIT_FOR_CONFIRMED: 'bookingSuccessWaitForConfirmed',
  BOOKING_UNDER_COMPLAINT: 'bookingUnderComplaint',
  BOOKING_SUCCESS: 'bookingSuccess',
  BOOKING_CANCELLED: 'bookingCancelled'                   // NEW
};

const statusColorMap = {
  // Thanh toán chờ: cam đậm
  [STATUS_KEYS.PENDING_PAYMENT]: '#F97316',              // Orange
  [STATUS_KEYS.PENDING_DEPOSIT_PAYMENT]: '#EA580C',      // Orange darker (riêng biệt)
  [STATUS_KEYS.PENDING_BALANCE_PAYMENT]: '#F59E0B',      // Amber
  [STATUS_KEYS.WAITING_FOR_APPROVED]: '#3B82F6',         // Blue
  [STATUS_KEYS.WAITING_FOR_UPDATE]: '#8B5CF6',           // Purple
  [STATUS_KEYS.BOOKING_REJECTED]: '#EF4444',             // Red
  [STATUS_KEYS.BOOKING_FAILED]: '#DC2626',               // Red darker
  // Đã duyệt nhưng chờ tour diễn ra: teal
  [STATUS_KEYS.BOOKING_BALANCE_SUCCESS]: '#14B8A6',      // Teal
  [STATUS_KEYS.BOOKING_SUCCESS_PENDING]: '#06B6D4',      // Cyan (riêng biệt)
  [STATUS_KEYS.BOOKING_SUCCESS_WAIT_FOR_CONFIRMED]: '#2563EB', // Blue darker
  // Đang khiếu nại: vàng tươi
  [STATUS_KEYS.BOOKING_UNDER_COMPLAINT]: '#EAB308',      // Yellow
  [STATUS_KEYS.BOOKING_SUCCESS]: '#10B981',              // Green
  [STATUS_KEYS.BOOKING_CANCELLED]: '#9CA3AF'             // Gray
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
    CANCELLED: STATUS_KEYS.BOOKING_CANCELLED,
    FAILED: STATUS_KEYS.BOOKING_FAILED,
    SUCCESS: STATUS_KEYS.BOOKING_SUCCESS
  };

  // Thêm mapping cho status mới
  const newStatusMap = {
    PENDING_DEPOSIT_PAYMENT: STATUS_KEYS.PENDING_DEPOSIT_PAYMENT,
    PENDING_BALANCE_PAYMENT: STATUS_KEYS.PENDING_BALANCE_PAYMENT,
    BOOKING_BALANCE_SUCCESS: STATUS_KEYS.BOOKING_BALANCE_SUCCESS,
    BOOKING_CANCELLED: STATUS_KEYS.BOOKING_CANCELLED,
  };

  if (newStatusMap[raw]) {
    return newStatusMap[raw];
  }

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

// Statuses that allow cancellation
const CANCELLABLE_STATUSES = [
  'WAITING_FOR_APPROVED',
  'WAITING_FOR_UPDATE',
  'PENDING_BALANCE_PAYMENT',
  'BOOKING_BALANCE_SUCCESS'
];

// Format currency helper
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(Number(value || 0));
};

// Format VND to KRW (VND / 18)
const formatKRW = (vndValue) => {
  if (vndValue === null || vndValue === undefined) return '0 KRW';
  const krwValue = Math.round(Number(vndValue || 0) / 18);
  return new Intl.NumberFormat('ko-KR').format(krwValue) + ' KRW';
};

const BookingHistoryCard = ({ booking, onBookingCancelled }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [hasConfirmedCancel, setHasConfirmedCancel] = useState(false);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Map i18n language to locale
  const getLocale = () => {
    const lang = localStorage.getItem('i18nextLng') || 'vi';
    const localeMap = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR' };
    return localeMap[lang] || 'vi-VN';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(getLocale(), {
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

  // Check if booking can be cancelled
  const canCancelBooking = useMemo(() => {
    const rawStatus = booking?.status ?? booking?.bookingStatus;
    const statusString = String(rawStatus || '').toUpperCase();
    return CANCELLABLE_STATUSES.includes(statusString);
  }, [booking]);

  const getStatusIcon = (iconColor) => {
    switch (effectiveStatus) {
      case STATUS_KEYS.BOOKING_SUCCESS:
      case STATUS_KEYS.BOOKING_BALANCE_SUCCESS:
        return <CheckCircleIcon className={styles['status-icon']} style={{ color: iconColor }} />;
      case STATUS_KEYS.BOOKING_REJECTED:
      case STATUS_KEYS.BOOKING_FAILED:
      case STATUS_KEYS.BOOKING_UNDER_COMPLAINT:
      case STATUS_KEYS.BOOKING_CANCELLED:
        return <XCircleIcon className={styles['status-icon']} style={{ color: iconColor }} />;
      case STATUS_KEYS.WAITING_FOR_APPROVED:
      case STATUS_KEYS.BOOKING_SUCCESS_PENDING:
      case STATUS_KEYS.BOOKING_SUCCESS_WAIT_FOR_CONFIRMED:
      case STATUS_KEYS.WAITING_FOR_UPDATE:
      case STATUS_KEYS.PENDING_DEPOSIT_PAYMENT:
      case STATUS_KEYS.PENDING_BALANCE_PAYMENT:
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

  const handleCancelClick = async (e) => {
    e.stopPropagation();
    setIsLoadingPreview(true);
    setCancelError(null);
    setCancelPreview(null);
    setHasConfirmedCancel(false);
    setShowCancelModal(true); // Open modal immediately

    try {
      const preview = await previewCancelBooking(booking.bookingId);
      setCancelPreview(preview);
    } catch (error) {
      console.error('Error previewing cancel:', error);
      setCancelError(error.message || 'Không thể tải thông tin hoàn tiền. Vui lòng thử lại.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCloseModal = useCallback((e) => {
    if (e) e.stopPropagation();
    setShowCancelModal(false);
    setHasConfirmedCancel(false);
    setCancelPreview(null);
    setCancelError(null);
  }, []);

  const handleConfirmCancel = useCallback(async (e) => {
    e.stopPropagation();
    setIsCancelling(true);
    setCancelError(null);

    try {
      const result = await cancelBooking(booking.bookingId);
      setHasConfirmedCancel(true);

      // Call refresh callback if provided
      if (onBookingCancelled) {
        setTimeout(() => {
          onBookingCancelled();
          handleCloseModal();
        }, 2000); // Show success message for 2 seconds before closing
      } else {
        // Fallback: reload page after 2 seconds
        setTimeout(() => {
          globalThis.location?.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setCancelError(error.message || 'Không thể hủy booking. Vui lòng thử lại.');
    } finally {
      setIsCancelling(false);
    }
  }, [booking.bookingId, onBookingCancelled, handleCloseModal]);

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
                <h3>{t('bookingHistory.cancel.title', 'Xác nhận hủy booking')}</h3>
              </div>

              {isLoadingPreview ? (
                <div className={styles['modal-text']}>
                  <p>{t('bookingHistory.cancel.loading', 'Đang tải thông tin hoàn tiền...')}</p>
                </div>
              ) : cancelError ? (
                <div className={styles['modal-text']}>
                  <p style={{ color: '#EF4444' }}>{cancelError}</p>
                </div>
              ) : cancelPreview ? (
                <>
                  <p className={styles['modal-text']}>
                    {t(
                      'bookingHistory.cancel.message',
                      'Bạn chắc chắn muốn huỷ booking này?'
                    )}
                  </p>
                  <div className={styles['refund-info']}>
                    <div className={styles['refund-item']}>
                      <span>{t('bookingHistory.cancel.refundPercentage', 'Tỷ lệ hoàn tiền')}:</span>
                      <strong>{cancelPreview.refundPercentage || 0}%</strong>
                    </div>
                    <div className={styles['refund-item']}>
                      <span>{t('bookingHistory.cancel.refundAmount', 'Số tiền hoàn lại')}:</span>
                      <strong>{formatKRW(cancelPreview.refundAmount || 0)}</strong>
                    </div>
                    {cancelPreview.payedAmount && (
                      <div className={styles['refund-item']}>
                        <span>{t('bookingHistory.cancel.payedAmount', 'Số tiền đã thanh toán')}:</span>
                        <span>{formatKRW(cancelPreview.payedAmount)}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className={styles['modal-text']}>
                  {t(
                    'bookingHistory.cancel.message',
                    'Bạn chắc chắn muốn huỷ booking này?'
                  )}
                </p>
              )}

              <div className={styles['modal-actions']}>
                <button
                  className={styles['ghost-btn']}
                  onClick={handleCloseModal}
                  type="button"
                  disabled={isCancelling}
                >
                  {t('common.close', 'Đóng')}
                </button>
                <button
                  className={styles['primary-btn']}
                  onClick={handleConfirmCancel}
                  type="button"
                  disabled={isCancelling || isLoadingPreview || !cancelPreview}
                >
                  {isCancelling
                    ? t('bookingHistory.cancel.processing', 'Đang xử lý...')
                    : t('bookingHistory.cancel.confirm', 'Xác nhận hủy')
                  }
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles['modal-header']}>
                <h3>{t('bookingHistory.cancel.successTitle', 'Hủy booking thành công')}</h3>
              </div>
              <p className={styles['modal-text']}>
                {t(
                  'bookingHistory.cancel.successBody',
                  'Yêu cầu huỷ đã được ghi nhận. Khoản hoàn tiền'
                )}{' '}
                {cancelPreview && (
                  <>
                    <strong>{cancelPreview.refundPercentage || 0}%</strong>
                    {' '}(<strong>{formatKRW(cancelPreview.refundAmount || 0)}</strong>)
                  </>
                )}{' '}
                {t('bookingHistory.cancel.successTail', 'sẽ được chuyển theo phương thức thanh toán ban đầu.')}
              </p>
              <div className={styles['modal-actions']}>
                <button className={styles['primary-btn']} onClick={handleCloseModal} type="button">
                  {t('common.close', 'Đóng')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>,
      document.body
    );
  }, [
    showCancelModal,
    hasConfirmedCancel,
    handleCloseModal,
    handleConfirmCancel,
    cancelPreview,
    isLoadingPreview,
    isCancelling,
    cancelError,
    t
  ]);

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

            {/* Show amount to pay based on status */}
            {(effectiveStatus === STATUS_KEYS.PENDING_DEPOSIT_PAYMENT ||
              effectiveStatus === STATUS_KEYS.PENDING_PAYMENT) && (
                <div className={styles['info-item']}>
                  <div className={styles['info-label']}>
                    <BanknotesIcon className={styles['item-icon']} />
                    <span>{t('bookingHistory.card.depositAmount', 'Tiền cọc')}</span>
                  </div>
                  <div className={styles['info-value']} style={{ color: '#EA580C', fontWeight: 600 }}>
                    {formatKRW(booking.depositAmount || booking.deposit || 0)}
                  </div>
                </div>
              )}

            {effectiveStatus === STATUS_KEYS.PENDING_BALANCE_PAYMENT && (
              <div className={styles['info-item']}>
                <div className={styles['info-label']}>
                  <BanknotesIcon className={styles['item-icon']} />
                  <span>{t('bookingHistory.card.balanceAmount', 'Còn lại')}</span>
                </div>
                <div className={styles['info-value']} style={{ color: '#F59E0B', fontWeight: 600 }}>
                  {formatKRW((booking.totalPrice || booking.totalAmount || 0) - (booking.depositAmount || booking.deposit || 0))}
                </div>
              </div>
            )}
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
            {canCancelBooking && (
              <button
                className={styles['cancel-btn']}
                onClick={handleCancelClick}
                type="button"
                disabled={isLoadingPreview}
              >
                {t('bookingHistory.card.cancelBooking', 'Hủy booking')}
              </button>
            )}
            <button
              className={styles['view-details-btn']}
              onClick={handleButtonClick}
              type="button"
            >
              <span>{t('bookingHistory.card.viewDetails', 'Xem chi tiết')}</span>
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
