import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useToursAPI } from '../../../../../hooks/useToursAPI';
import {
  Clock4,
  MapPin,
  Bus,
  Tag,
  CalendarClock,
  ScrollText
} from 'lucide-react';
import styles from './TourPreview.module.css';

const TourPreview = ({ createdAt = null }) => {
  const [searchParams] = useSearchParams();
  const tourId = searchParams.get('id');
  const { fetchTourById, loading, error } = useToursAPI();
  const { t, i18n } = useTranslation();
  const [tour, setTour] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const normalize = (s) => (s || '').toString().trim().toLowerCase();

  const getDepartureLabel = (value) => {
    const v = normalize(value);
    if (v === 'da nang' || v === 'đà nẵng' || v === 'danang') {
      return t('common.departurePoints.daNang');
    }
    return value || t('booking.tourPreview.labels.notAvailable');
  };

  const getVehicleLabel = (value) => {
    const v = normalize(value);
    if (v === 'tour bus' || v === 'xe du lịch' || v === 'tourist bus') {
      return t('common.vehicles.tourBus');
    }
    return value || t('booking.tourPreview.labels.notAvailable');
  };

  const getCategoryLabel = (value) => {
    const v = normalize(value);
    if (v === 'standard') return t('booking.tourPreview.categories.standard');
    return value || t('booking.tourPreview.labels.notAvailable');
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadTour = async () => {
      if (!tourId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setHasError(false);
      
      try {
        const tourData = await fetchTourById(parseInt(tourId));
        
        if (isMounted) {
          setTour(tourData);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading tour for preview:', err);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadTour();
    
    return () => {
      isMounted = false;
    };
  }, [tourId]); // eslint-disable-line react-hooks/exhaustive-deps

  // formatPrice function removed as it's not used in this component

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/uploads/tours/thumbnails/${imagePath}`;
  };

  const formatCreatedAt = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    try {
      return new Intl.DateTimeFormat(i18n.language || 'vi', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch {
      return date.toLocaleString();
    }
  };

  const createdAtDisplay = formatCreatedAt(createdAt);

  if (isLoading || loading) {
    return (
      <div className={styles['tour-preview']}>
        <div className={styles['tour-preview-loading']}>
          <div className={styles['loading-spinner']}></div>
          <p>{t('booking.tourPreview.loading')}</p>
        </div>
      </div>
    );
  }

  // Fallback tour data when API fails
  const fallbackTour = {
    id: tourId || 'DNX-TQ3',
    title: t('booking.tourPreview.fallback.title'),
    duration: t('booking.tourPreview.fallback.duration'),
    tourDeparturePoint: t('booking.tourPreview.fallback.departure'),
    tourVehicle: t('booking.tourPreview.fallback.vehicle'),
    category: 'Standard',
    image: null
  };

  const renderDetailItem = (IconComponent, label, value, options = {}) => {
    const { isBlock = false } = options;
    return (
      <div className={styles['detail-item']}>
        <div className={styles['detail-label-wrapper']}>
          <IconComponent className={styles['detail-icon']} />
          <span className={styles['detail-label']}>{label}</span>
        </div>
        <span className={`${styles['detail-value']} ${isBlock ? styles['detail-value-block'] : ''}`}>
          {value}
        </span>
      </div>
    );
  };

  if (hasError || error) {
    // Show fallback data when API fails
    return (
      <div className={styles['tour-preview']}>
        <div className={styles['tour-preview-container']}>
          {/* Tour Image */}
          <div className={styles['tour-preview-image']}>
            <div className={styles['tour-placeholder']}>
              <span className={styles['placeholder-icon']}>🏞️</span>
              <div className={styles['placeholder-text']}>
                <div className={styles['welcome-text']}>{t('booking.tourPreview.placeholder.title')}</div>
                <div className={styles['sub-text']}>{t('booking.tourPreview.placeholder.subtitle')}</div>
              </div>
            </div>
          </div>

          {/* Tour Details */}
          <div className={styles['tour-preview-details']}>
            <h3 className={styles['tour-preview-title']}>{fallbackTour.title}</h3>
            
            <div className={styles['tour-details-list']}>
              {renderDetailItem(Clock4, t('booking.tourPreview.labels.duration'), fallbackTour.duration)}
              {renderDetailItem(MapPin, t('booking.tourPreview.labels.departure'), getDepartureLabel(fallbackTour.tourDeparturePoint))}
              {renderDetailItem(Bus, t('booking.tourPreview.labels.vehicle'), getVehicleLabel(fallbackTour.tourVehicle))}
              {renderDetailItem(Tag, t('booking.tourPreview.labels.category'), getCategoryLabel(fallbackTour.category))}
              {createdAtDisplay &&
                renderDetailItem(CalendarClock, t('booking.tourPreview.labels.createdAt'), createdAtDisplay)}
              {renderDetailItem(
                ScrollText,
                t('booking.tourPreview.labels.schedule'),
                <div className={styles['schedule-content']}>
                  {t('booking.tourPreview.fallback.schedule')}
                </div>,
                { isBlock: true }
              )}
            </div>
            
            <div className={styles['api-error-notice']}>
              <small style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                ⚠️ {t('booking.tourPreview.fallback.apiError')}
              </small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className={styles['tour-preview']}>
        <div className={styles['tour-preview-loading']}>
          <div className={styles['loading-spinner']}></div>
          <p>{t('booking.tourPreview.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['tour-preview']}>
      <div className={styles['tour-preview-container']}>
        {/* Tour Image */}
        <div className={styles['tour-preview-image']}>
          {tour.image ? (
            <img 
              src={getImageUrl(tour.image)} 
              alt={tour.title}
              className={styles['tour-thumbnail']}
              onError={(e) => {
                e.target.src = '/default-Tour.jpg';
              }}
            />
          ) : (
            <div className={styles['tour-placeholder']}>
              <span className={styles['placeholder-icon']}>🏞️</span>
              <div className={styles['placeholder-text']}>
                <div className={styles['welcome-text']}>{t('booking.tourPreview.placeholder.title')}</div>
                <div className={styles['sub-text']}>{t('booking.tourPreview.placeholder.subtitle')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tour Details */}
        <div className={styles['tour-preview-details']}>
          <h3 className={styles['tour-preview-title']}>{tour.title}</h3>
          
          <div className={styles['tour-details-list']}>
            {renderDetailItem(
              Clock4,
              t('booking.tourPreview.labels.duration'),
              (() => {
                const v = (tour.duration || '').toString();
                const vi = v.match(/(\d+)\s*ngày\s*(\d+)\s*đêm/i);
                const en = v.match(/(\d+)\s*days?\s*(\d+)\s*nights?/i);
                const ko = v.match(/(\d+)\s*일\s*(\d+)\s*박/i);
                const m = vi || en || ko;
                if (m) {
                  const days = parseInt(m[1], 10);
                  const nights = parseInt(m[2], 10);
                  return t('booking.tourPreview.durationTemplate', { days, nights });
                }
                return v || t('booking.tourPreview.labels.notAvailable');
              })()
            )}
            {renderDetailItem(MapPin, t('booking.tourPreview.labels.departure'), getDepartureLabel(tour.tourDeparturePoint))}
            {renderDetailItem(Bus, t('booking.tourPreview.labels.vehicle'), getVehicleLabel(tour.tourVehicle))}
            {renderDetailItem(Tag, t('booking.tourPreview.labels.category'), getCategoryLabel(tour.category || 'Standard'))}
            {createdAtDisplay &&
              renderDetailItem(CalendarClock, t('booking.tourPreview.labels.createdAt'), createdAtDisplay)}
            {renderDetailItem(
              ScrollText,
              t('booking.tourPreview.labels.schedule'),
              tour.tourSchedule ? (
                <div className={styles['schedule-content']}>{tour.tourSchedule}</div>
              ) : (
                <span className={styles['no-schedule']}>{t('booking.tourPreview.labels.noSchedule')}</span>
              ),
              { isBlock: true }
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourPreview;
