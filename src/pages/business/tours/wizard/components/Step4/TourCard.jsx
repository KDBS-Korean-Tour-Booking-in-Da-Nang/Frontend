import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TourCard.module.css';

const TourCard = ({ tour, onClick, showActions = false }) => {
  const { t } = useTranslation();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const getImageSrc = (thumbnail) => {
    if (!thumbnail) return '';
    
    // If it's a File object, create object URL
    if (thumbnail instanceof File) {
      return URL.createObjectURL(thumbnail);
    }
    
    // If it's a string path, return as is
    return thumbnail;
  };

  return (
    <div className={styles['tour-card']} onClick={onClick}>
      {/* Tour Image */}
      <div className={styles['tour-card-image']}>
        {tour.thumbnail ? (
          <img 
            src={getImageSrc(tour.thumbnail)} 
            alt={tour.tourName}
          />
        ) : (
          <div className={styles['tour-card-placeholder']}>
            <span className={styles['placeholder-icon']}>🏞️</span>
            <div className={styles['placeholder-overlay']}>
              <div className={styles['welcome-text']}>
                <span className={styles['welcome-w']}>W</span>
                <span className={styles['welcome-e']}>E</span>
                <span className={styles['welcome-l']}>L</span>
                <span className={styles['welcome-c']}>C</span>
                <span className={styles['welcome-o']}>O</span>
                <span className={styles['welcome-m']}>M</span>
                <span className={styles['welcome-e2']}>E</span>
              </div>
              <div className={styles['sub-text']}>{t('tourCard.welcome.explore')}</div>
              <div className={styles['sub-text-2']}>{t('tourCard.welcome.dream')}</div>
            </div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className={styles['featured-badge']}>
          {tour.tourStatus === 'ACTIVE' ? t('tourManagement.statusBadge.ACTIVE') :
           tour.tourStatus === 'INACTIVE' ? t('tourManagement.statusBadge.INACTIVE') :
           tour.tourStatus === 'NOT_APPROVED' ? t('tourManagement.statusBadge.NOT_APPROVED') :
           tour.tourStatus === 'DRAFT' ? t('tourManagement.statusBadge.DRAFT') : (t('tourManagement.statusBadge.UNKNOWN') || tour.tourStatus)}
        </div>
      </div>

      {/* Tour Info */}
      <div className={styles['tour-card-content']}>
        <h3 className={styles['tour-card-title']}>{tour.tourName}</h3>
        
        <div className={styles['tour-card-info']}>
          <div className={styles['tour-duration']}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            {tour.tourDuration}
          </div>
          
          <div className={styles['tour-price']}>
            <div className={styles['price-amount']}>{formatPrice(tour.adultPrice)}₫</div>
          </div>
        </div>

        <div className={styles['tour-description']}>
          {(tour.tourDeparturePoint || t('common.departurePoints.daNang'))} • {(tour.amount || '30')} {t('tourWizard.step1.summary.guests')}
        </div>

        {/* Controls */}
        {showActions ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              ✏️ Chỉnh sửa
            </button>
            
            <button style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#ef4444',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              🗑️ Xóa
            </button>
          </div>
        ) : (
          <button className={styles['tour-details-btn']}>
            {t('tourCard.viewDetails')}
          </button>
        )}
      </div>
    </div>
  );
};

export default TourCard;
