import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  MapPinIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import styles from './TourCardStep4.module.css';

const TourCardStep4 = ({ tour, onClick, showActions = false }) => {
  const { t } = useTranslation();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const getImageSrc = (thumbnail) => {
    if (!thumbnail) return '';
    
    if (thumbnail instanceof File) {
      return URL.createObjectURL(thumbnail);
    }
    
    return thumbnail;
  };

  const formatDuration = (duration) => {
    if (!duration) return '';
    return duration;
  };

  const localizeDeparturePoint = (value) => {
    if (!value) return t('common.departurePoints.daNang');
    return value;
  };

  return (
    <div className={styles['tour-card']} onClick={showActions ? onClick : undefined}>
      {/* Tour Image */}
      <div className={styles['tour-image-container']}>
        {tour.thumbnail ? (
          <img 
            src={getImageSrc(tour.thumbnail)} 
            alt={tour.tourName}
            className={styles['tour-image']}
            onError={(e) => {
              if (!(tour.thumbnail instanceof File)) {
                e.target.src = '/default-Tour.jpg';
              }
            }}
          />
        ) : (
          <div className={styles['tour-image-placeholder']}>
            <div className={styles['placeholder-icon']}>🏞️</div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className={`${styles['status-badge']} ${styles[tour.tourStatus?.toLowerCase() || 'active']}`}>
          {tour.tourStatus === 'ACTIVE' ? t('tourManagement.statusBadge.ACTIVE') :
           tour.tourStatus === 'INACTIVE' ? t('tourManagement.statusBadge.INACTIVE') :
           tour.tourStatus === 'NOT_APPROVED' ? t('tourManagement.statusBadge.NOT_APPROVED') :
           tour.tourStatus === 'DRAFT' ? t('tourManagement.statusBadge.DRAFT') : (t('tourManagement.statusBadge.UNKNOWN') || tour.tourStatus)}
        </div>
      </div>

      {/* Tour Info */}
      <div className={styles['tour-info']}>
        <h3 className={styles['tour-name']}>{tour.tourName}</h3>
        
        <div className={styles['tour-price']}>
          <span className={styles['price-label']}>{t('tourManagement.card.priceLabel') || 'Giá'}</span>
          <span className={styles['price-value']}>{formatPrice(tour.adultPrice)}₫</span>
        </div>

        <div className={styles['tour-details']}>
          <div className={styles['detail-item']}>
            <ClockIcon className={styles['detail-icon']} />
            <span className={styles['detail-value']}>{formatDuration(tour.tourDuration) || 'N/A'}</span>
          </div>
          {tour.amount && (
            <div className={styles['detail-item']}>
              <UserGroupIcon className={styles['detail-icon']} />
              <span className={styles['detail-value']}>{tour.amount} {t('tourManagement.card.capacityUnit') || 'người'}</span>
            </div>
          )}
          {tour.tourDeparturePoint && (
            <div className={styles['detail-item']}>
              <MapPinIcon className={styles['detail-icon']} />
              <span className={styles['detail-value']}>{localizeDeparturePoint(tour.tourDeparturePoint)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TourCardStep4;
