import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './TourCard.css';

const TourCard = ({ tour }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDurationLocalized = () => {
    const raw = tour.duration || tour.tourDuration || '';
    let days;
    let nights;
    if (typeof tour.duration === 'number' && typeof tour.nights === 'number') {
      days = tour.duration;
      nights = tour.nights;
    } else {
      const match = String(raw).match(/(\d+)\D+(\d+)/);
      if (match) {
        days = parseInt(match[1], 10);
        nights = parseInt(match[2], 10);
      }
    }
    if (Number.isFinite(days) && Number.isFinite(nights)) {
      const daysSuffix = i18n.language.startsWith('en') && days !== 1 ? 's' : '';
      const nightsSuffix = i18n.language.startsWith('en') && nights !== 1 ? 's' : '';
      return t('tourCard.duration.template', { days, nights, daysSuffix, nightsSuffix });
    }
    return raw;
  };

  const handleViewDetails = () => {
    navigate(`/tour/${tour.id}`);
  };

  return (
    <div className="tour-card">
      <div className="tour-card-image">
        <img src={tour.image} alt={tour.title} />
        {tour.featured && (
          <div className="featured-badge">
            <span>{t('tourCard.featured')}</span>
          </div>
        )}
      </div>
      
      <div className="tour-card-content">
        <h3 className="tour-card-title">{tour.title}</h3>
        
        <div className="tour-card-info">
          <div className="tour-duration">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatDurationLocalized()}</span>
          </div>
          
          <div className="tour-price">
            <span className="price-amount">{formatPrice(tour.price)}</span>
          </div>
        </div>

        <div className="tour-card-prices">
          <div className="price-row"><span>{t('tourCard.children')}</span><span>{(tour.childrenPrice ?? 0) > 0 ? formatPrice(tour.childrenPrice) : t('tourPage.detail.overview.free')}</span></div>
          <div className="price-row"><span>{t('tourCard.baby')}</span><span>{(tour.babyPrice ?? 0) > 0 ? formatPrice(tour.babyPrice) : t('tourPage.detail.overview.free')}</span></div>
        </div>

        <button 
          className="tour-details-btn"
          onClick={handleViewDetails}
        >
          {t('tourCard.details')}
        </button>
      </div>
    </div>
  );
};

export default TourCard;
