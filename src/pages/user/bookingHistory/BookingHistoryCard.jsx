import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styles from './BookingHistoryCard.module.css';

const STATUS_KEYS = {
  PENDING_PAYMENT: 'pendingPayment',
  WAITING_FOR_APPROVED: 'waitingForApproved',
  WAITING_FOR_UPDATE: 'waitingForUpdate',
  BOOKING_REJECTED: 'bookingRejected',
  BOOKING_FAILED: 'bookingFailed',
  BOOKING_SUCCESS: 'bookingSuccess'
};

const statusColorMap = {
  [STATUS_KEYS.PENDING_PAYMENT]: '#F59E0B',
  [STATUS_KEYS.WAITING_FOR_APPROVED]: '#3B82F6',
  [STATUS_KEYS.WAITING_FOR_UPDATE]: '#8B5CF6',
  [STATUS_KEYS.BOOKING_REJECTED]: '#EF4444',
  [STATUS_KEYS.BOOKING_FAILED]: '#DC2626',
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewDetails = () => {
    navigate(`/user/booking/${booking.bookingId}`);
  };

  // Compute effective booking status based on transaction
  const effectiveStatus = (() => {
    const trxRaw = booking?.transactionStatus ?? booking?.latestTransactionStatus;
    const trx = normalizeTransaction(trxRaw);
    if (trx === 'SUCCESS') return STATUS_KEYS.BOOKING_SUCCESS;
    const rawStatus = booking?.status ?? booking?.bookingStatus;
    return normalizeStatus(rawStatus);
  })();

  return (
    <div className={styles['booking-card']}>
      <div className={styles['booking-content']}>
        <div className={styles['booking-id']}>
          {t('bookingHistory.card.bookingId')}: {booking.bookingId}
        </div>
        
        <div className={styles['booking-details']}>
          <div className={styles['detail-row']}>
            <span className={styles['detail-label']}>
              {t('bookingHistory.card.departureDate')}
            </span>
            <span className={styles['detail-value']}>
              {formatDate(booking.departureDate)}
            </span>
          </div>
          
          <div className={styles['detail-row']}>
            <span className={styles['detail-label']}>
              {t('bookingHistory.card.totalGuests')}
            </span>
            <span className={styles['detail-value']}>
              {booking.totalGuests} {t('bookingHistory.card.guests')}
            </span>
          </div>
          
          <div className={styles['detail-row']}>
            <span className={styles['detail-label']}>
              {t('bookingHistory.card.contactName')}
            </span>
            <span className={styles['detail-value']}>
              {booking.contactName}
            </span>
          </div>
          
          <div className={styles['detail-row']}>
            <span className={styles['detail-label']}>
              {t('bookingHistory.card.contactPhone')}
            </span>
            <span className={styles['detail-value']}>
              {booking.contactPhone}
            </span>
          </div>
        </div>
      </div>

      <div className={styles['booking-actions']}>
        <div 
          className={styles['status-badge']}
          style={{ backgroundColor: getStatusColor(effectiveStatus) }}
        >
          {t(`bookingHistory.status.${effectiveStatus || STATUS_KEYS.PENDING_PAYMENT}`)}
        </div>
        {(booking?.transactionStatus || booking?.latestTransactionStatus) && (
          <div 
            className={styles['status-badge-secondary']}
            style={{ backgroundColor: getTransactionStatusColor(normalizeTransaction(booking.transactionStatus ?? booking.latestTransactionStatus)) }}
          >
            {t('bookingHistory.card.transaction')}: {t(`bookingHistory.transactionStatus.${String(normalizeTransaction(booking.transactionStatus ?? booking.latestTransactionStatus) || 'PENDING').toLowerCase()}`) || normalizeTransaction(booking.transactionStatus ?? booking.latestTransactionStatus)}
          </div>
        )}
        <button 
          className={styles['view-details-btn']}
          onClick={handleViewDetails}
        >
          {t('bookingHistory.card.viewDetails')}
        </button>
        {String(effectiveStatus).toUpperCase() === 'CANCELLED' && (
          <button 
            className={styles['cancelled-btn']}
            disabled={true}
          >
            {t('bookingHistory.card.cancelled') || 'Đã hủy'}
          </button>
        )}
      </div>
    </div>
  );
};

export default BookingHistoryCard;
