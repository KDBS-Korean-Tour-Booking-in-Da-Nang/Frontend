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

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return '#10B981';
      case 'PENDING':
        return '#F59E0B';
      case 'CANCELLED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const handleViewDetails = () => {
    navigate(`/tour/${booking.tourId}`);
  };

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
          style={{ backgroundColor: getStatusColor(booking.status) }}
        >
          {t(`bookingHistory.status.${booking.status?.toLowerCase() || 'pending'}`)}
        </div>
        
        <button 
          className={styles['view-details-btn']}
          onClick={handleViewDetails}
        >
          {t('bookingHistory.card.viewDetails')}
        </button>
        
        <button 
          className={styles['feedback-btn']}
          disabled={true}
        >
          {t('bookingHistory.card.alreadyFeedbacked')}
        </button>
      </div>
    </div>
  );
};

export default BookingHistoryCard;
