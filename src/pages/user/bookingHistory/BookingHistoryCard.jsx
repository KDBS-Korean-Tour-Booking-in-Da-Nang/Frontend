import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, getImageUrl } from '../../../config/api';
import styles from './BookingHistoryCard.module.css';

const BookingHistoryCard = ({ booking }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const normalizeStatus = (status) => {
    // Accept numeric codes 0/1/2 or strings
    if (typeof status === 'number') {
      return status === 1 ? 'PURCHASED' : status === 2 ? 'CANCELLED' : 'PENDING';
    }
    if (status === '0') return 'PENDING';
    if (status === '1') return 'PURCHASED';
    if (status === '2') return 'CANCELLED';
    return String(status || 'PENDING').toUpperCase();
  };

  const normalizeTransaction = (trx) => {
    if (!trx && typeof trx !== 'number') return undefined;
    if (typeof trx === 'number') {
      // Optional mapping if BE uses codes; default unknown
      return trx === 1 ? 'SUCCESS' : trx === 2 ? 'FAILED' : trx === 3 ? 'CANCELLED' : 'PENDING';
    }
    // strings like success/Success
    return String(trx).toUpperCase();
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
      case 'PURCHASED':
        return '#10B981';
      case 'PENDING':
        return '#F59E0B';
      case 'CANCELLED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

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

  const handleViewDetails = () => {
    navigate(`/user/booking/${booking.bookingId}`);
  };

  // Compute effective booking status based on transaction
  const effectiveStatus = (() => {
    const trxRaw = booking?.transactionStatus ?? booking?.latestTransactionStatus;
    const trx = normalizeTransaction(trxRaw);
    if (trx === 'SUCCESS') return 'PURCHASED';
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
          {t(`bookingHistory.status.${effectiveStatus?.toLowerCase() || 'pending'}`)}
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
