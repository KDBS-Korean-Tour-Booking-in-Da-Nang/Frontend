import React from 'react';
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
      return <XCircleIcon className={styles['status-icon']} style={{ color: iconColor }} />;
      case STATUS_KEYS.WAITING_FOR_APPROVED:
      case STATUS_KEYS.WAITING_FOR_UPDATE:
      return <ClockIcon className={styles['status-icon']} style={{ color: iconColor }} />;
      default:
      return <ClockIcon className={styles['status-icon']} style={{ color: iconColor }} />;
    }
  };

  const statusColor = getStatusColor(effectiveStatus);

  return (
    <div className={styles['booking-card']}>
      <div className={styles['card-header']}>
        <div className={styles['booking-id-section']}>
          <DocumentTextIcon className={styles['id-icon']} />
          <div>
            <div className={styles['booking-id-label']}>{t('bookingHistory.card.bookingId')}</div>
            <div className={styles['booking-id']}>#{booking.bookingId}</div>
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
        <button 
          className={styles['view-details-btn']}
          onClick={handleViewDetails}
        >
          <span>{t('bookingHistory.card.viewDetails')}</span>
          <ArrowRightIcon className={styles['btn-icon']} />
        </button>
      </div>
    </div>
  );
};

export default BookingHistoryCard;
