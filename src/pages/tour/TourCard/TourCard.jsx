import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  ClockIcon,
  ShareIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { ShareTourModal, LoginRequiredModal } from '../../../components/modals';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './TourCard.module.css';

const TourCard = ({ tour }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openShare, setOpenShare] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const modalClosingRef = useRef(false);
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
    navigate(`/tour/detail?id=${tour.id}`);
  };

  const handleShare = () => {
    if (!user) { setShowLoginRequired(true); return; }
    setOpenShare(true);
  };

  const handleCardClick = () => {
    // Không navigate nếu modal đang mở hoặc đang trong quá trình đóng
    if (openShare || showLoginRequired || modalClosingRef.current) {
      return;
    }
    navigate(`/tour/detail?id=${tour.id}`);
  };

  const handleButtonClick = (e) => {
    e.stopPropagation(); // Ngăn event bubbling lên card
  };

  return (
    <div className={styles['tour-card']} onClick={handleCardClick}>
      <div className={styles['tour-card-image']}>
        <img 
          src={tour.image || '/default-Tour.jpg'} 
          alt={tour.title} 
          onError={(e) => {
            e.target.src = '/default-Tour.jpg';
          }}
        />
        {tour.featured && (
          <div className={styles['featured-badge']}>
            <span>{t('tourCard.featured')}</span>
          </div>
        )}
      </div>
      
      <div className={styles['tour-card-content']}>
        <h3 className={styles['tour-card-title']}>{tour.title}</h3>
        
        <div className={styles['tour-card-bottom']}>
          <div className={styles['tour-card-info']}>
            <div className={styles['tour-duration']}>
              <ClockIcon className={styles['duration-icon']} />
              <span>{formatDurationLocalized()}</span>
            </div>
            
            <div className={styles['tour-price']}>
              <span className={styles['price-amount']}>{formatPrice(tour.price)}</span>
            </div>
          </div>

          <div className={styles['tour-card-actions']}>
            <button 
              className={styles['tour-details-btn']}
              onClick={(e) => {
                handleButtonClick(e);
                handleViewDetails();
              }}
            >
              <span>{t('tourCard.details')}</span>
              <ArrowRightIcon className={styles['btn-icon']} />
            </button>
            <button 
              className={styles['share-btn']}
              onClick={(e) => {
                handleButtonClick(e);
                handleShare();
              }}
            >
              <ShareIcon className={styles['share-icon']} />
            </button>
          </div>
        </div>
      </div>
      {openShare && createPortal(
        <ShareTourModal 
          isOpen={openShare} 
          onClose={() => {
            modalClosingRef.current = true;
            setOpenShare(false);
            // Reset flag sau một khoảng thời gian ngắn để đảm bảo event đã xử lý xong
            setTimeout(() => {
              modalClosingRef.current = false;
            }, 100);
          }} 
          tourId={tour.id}
          onShared={(post)=>{ 
            // Close modal then navigate to forum like TourDetailPage
            modalClosingRef.current = true;
            setOpenShare(false);
            setTimeout(() => {
              modalClosingRef.current = false;
              navigate('/forum');
            }, 100);
          }}
        />,
        document.body
      )}
      {showLoginRequired && createPortal(
        <LoginRequiredModal
          isOpen={showLoginRequired}
          onClose={() => {
            modalClosingRef.current = true;
            setShowLoginRequired(false);
            // Reset flag sau một khoảng thời gian ngắn để đảm bảo event đã xử lý xong
            setTimeout(() => {
              modalClosingRef.current = false;
            }, 100);
          }}
          title={t('auth.loginRequired.title')}
          message={t('auth.loginRequired.message')}
          returnTo={`/tour/detail?id=${tour.id}`}
        />,
        document.body
      )}
    </div>
  );
};

export default TourCard;
