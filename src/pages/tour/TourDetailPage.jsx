import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useToursAPI } from '../../hooks/useToursAPI';
import './TourDetailPage.css';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

// Adjust color brightness by percentage (negative to darken)
const shadeColor = (hex, percent) => {
  try {
    let color = hex.trim();
    if (!color.startsWith('#')) return color;
    if (color.length === 4) {
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    const num = parseInt(color.slice(1), 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.min(255, Math.max(0, Math.round(r + (percent / 100) * 255)));
    g = Math.min(255, Math.max(0, Math.round(g + (percent / 100) * 255)));
    b = Math.min(255, Math.max(0, Math.round(b + (percent / 100) * 255)));
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return hex;
  }
};

const TourDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchTourById, loading, error } = useToursAPI();
  const { t } = useTranslation();
  const [tour, setTour] = useState(null);

  // Build itinerary data from API (contents or tourSchedule from Step 2)
  const getItineraryFromTour = (tourData) => {
    if (!tourData) return [];
    if (Array.isArray(tourData.contents) && tourData.contents.length > 0) {
      return tourData.contents.map((item, index) => {
        // Check if description is default text and treat as empty
        const defaultTexts = [
          `Hoạt động ngày ${index + 1}`,
          `Activity Day ${index + 1}`,
          `Day ${index + 1} Activity`,
          'Hoạt động ngày 1',
          'Activity Day 1',
          'Day 1 Activity'
        ];
        const isDefaultText = defaultTexts.some(defaultText => 
          item.tourContentDescription === defaultText
        );
        
        return {
          dayTitle: item.tourContentTitle || `Ngày ${index + 1}`,
          description: (isDefaultText || !item.tourContentDescription) ? '' : item.tourContentDescription,
          images: item.images || [],
          // Optional presentation data if present from wizard
          dayColor: item.dayColor || item.color,
          titleAlignment: item.titleAlignment || 'left'
        };
      });
    }
    try {
      const parsed = JSON.parse(tourData.tourSchedule || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const loadTour = async () => {
      try {
        const tourData = await fetchTourById(parseInt(id));
        setTour(tourData);
      } catch (error) {
        // Silently handle error loading tour
        navigate('/tour');
      }
    };

    if (id) {
      loadTour();
    }
  }, [id, navigate]); // Removed fetchTourById from dependencies

  if (loading || !tour) {
    return (
      <div className="tour-detail-loading">
        <div className="loading-spinner"></div>
        <p>{t('tourPage.detail.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tour-detail-error">
        <h3>{t('tourPage.detail.errorTitle')}</h3>
        <p>{error}</p>
        <button onClick={() => navigate('/tour')} className="back-btn">
          {t('tourPage.detail.backToList')}
        </button>
      </div>
    );
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const handleBookNow = () => {
    navigate(`/tour/${id}/booking`);
  };

  const handleBackToList = () => {
    navigate('/tour');
  };

  const itinerary = getItineraryFromTour(tour);

  return (
    <div className="tour-detail-page">
      {/* Hero Section */}
      <div className="tour-hero-section">
        <div className="hero-background">
          <img src={tour.image} alt={tour.title} />
          <div className="hero-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="container">
            <button onClick={handleBackToList} className="back-button">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('tourPage.detail.back')}
            </button>
            
            <div className="hero-info">
              <div className="hero-badge">
                <span>{t('tourPage.detail.badge')}</span>
              </div>
              <h1 className="hero-title">{tour.title}</h1>
              <div className="hero-meta">
                <div className="meta-item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{tour.duration}</span>
                </div>
                <div className="meta-item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{tour.category === 'domestic' ? 'Trong nước' : tour.category === 'international' ? 'Nước ngoài' : 'Trong ngày'}</span>
                </div>
                <div className="meta-item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>4.8/5 (127 đánh giá)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="tour-detail-content">
        <div className="container">
          <div className="tour-detail-grid">
            {/* Left Column - Content */}
            <div className="tour-detail-left">
              {/* Tour Overview */}
              <div className="tour-overview">
                <h2>{t('tourPage.detail.overview.title')}</h2>
                <div
                  className="tour-description-html"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml((tour.descriptionHtml || tour.description || '').replace(/\n/g, '<br/>')) }}
                />
                {(tour.tourDeparturePoint || tour.tourVehicle) && (
                  <p>
                    {t('tourPage.detail.overview.departVehicle', { departure: tour.tourDeparturePoint || '...', vehicle: tour.tourVehicle || '...' })}
                  </p>
                )}
                <div style={{marginTop: '10px'}}>
                  <ul style={{color: '#6b7280', lineHeight: 1.8}}>
                    <li>{t('tourPage.detail.overview.adultPrice')}: {(tour.price ?? 0) > 0 ? formatPrice(tour.price) : t('tourPage.detail.overview.free')}</li>
                    <li>{t('tourPage.detail.overview.childrenPrice')}: {(tour.childrenPrice ?? 0) > 0 ? formatPrice(tour.childrenPrice) : t('tourPage.detail.overview.free')}</li>
                    <li>{t('tourPage.detail.overview.babyPrice')}: {(tour.babyPrice ?? 0) > 0 ? formatPrice(tour.babyPrice) : t('tourPage.detail.overview.free')}</li>
                    {typeof tour.amount === 'number' && (
                      <li>{t('tourPage.detail.overview.amount')}: {tour.amount}</li>
                    )}
                    {Array.isArray(tour.availableDates) && tour.availableDates.length > 0 && (
                      <li>{t('tourPage.detail.overview.availableDates')}: {tour.availableDates.join(', ')}</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Tour Highlights */}
              <div className="tour-highlights">
                <h2>{t('tourPage.detail.highlights.title')}</h2>
                <div className="highlights-grid">
                  <div className="highlight-item">
                    <div className="highlight-icon">🏛️</div>
                    <h3>{t('tourPage.detail.highlights.items.historyTitle')}</h3>
                    <p>{t('tourPage.detail.highlights.items.historyDesc')}</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">🍽️</div>
                    <h3>{t('tourPage.detail.highlights.items.foodTitle')}</h3>
                    <p>{t('tourPage.detail.highlights.items.foodDesc')}</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">📸</div>
                    <h3>{t('tourPage.detail.highlights.items.photoTitle')}</h3>
                    <p>{t('tourPage.detail.highlights.items.photoDesc')}</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">🎁</div>
                    <h3>{t('tourPage.detail.highlights.items.giftTitle')}</h3>
                    <p>{t('tourPage.detail.highlights.items.giftDesc')}</p>
                  </div>
                </div>
              </div>

              {/* Tour Itinerary */}
              <div className="tour-itinerary">
                <div className="itinerary-header">
                  <h2>{t('tourPage.detail.itinerary.header')}</h2>
                </div>
                <div className="itinerary-list">
                  {itinerary.length === 0 ? (
                    <div className="itinerary-item">
                      <div className="itinerary-content">
                        <p className="activity">{t('tourPage.detail.itinerary.updating')}</p>
                      </div>
                    </div>
                  ) : (
                    itinerary.map((day, index) => {
                      const titleFromAPI = day.dayTitle || day.tourContentTitle || '';
                      const headerTitle = titleFromAPI && titleFromAPI.trim().length > 0
                        ? titleFromAPI
                        : t('tourPage.detail.itinerary.day', { index: index + 1 });
                      return (
                      <div className="itinerary-item" key={index}>
                        <div
                          className="itinerary-day-header"
                          style={{
                            background: day.dayColor
                              ? `linear-gradient(135deg, ${day.dayColor}, ${shadeColor(day.dayColor, -20)})`
                              : undefined
                          }}
                        >
                          <span 
                            className="day-destination"
                            style={{
                              textAlign: day.titleAlignment || 'left',
                              display: 'block',
                              width: '100%'
                            }}
                          >
                            {headerTitle}
                          </span>
                        </div>
                        {(day.description || day.tourContentDescription || day.activities) && (
                          <div className="itinerary-content">
                            <div className="time-schedule">
                              <div className="time-item">
                                <span
                                  className="activity"
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(
                                      day.description || day.tourContentDescription || day.activities || ''
                                    )
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );})
                  )}
                </div>
              </div>

              {/* Tour Gallery */}
              <div className="tour-gallery">
                <h2>{t('tourPage.detail.gallery.title')}</h2>
                <div className="gallery-grid">
                  {[tour.image, ...(tour.gallery || [])].filter(Boolean).slice(0,4).map((img, idx) => (
                    <div className="gallery-item" key={idx}>
                      <img src={img} alt={`Gallery ${idx+1}`} />
                      <div className="gallery-overlay">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Booking Info */}
            <div className="tour-detail-right">
              <div className="booking-card">
                <div className="booking-header">
                  <div className="price-section">
                  <span className="price-label">{t('tourPage.detail.booking.price')}</span>
                    <span className="price-amount">{formatPrice(tour.price)}</span>
                  </div>
                  <div className="price-note">
                  <span>{t('tourPage.detail.booking.includedNote')}</span>
                  </div>
                </div>

                <div className="price-breakdown">
                  <div className="price-row"><span>{t('tourPage.detail.booking.children')}</span><span>{(tour.childrenPrice ?? 0) > 0 ? formatPrice(tour.childrenPrice) : t('tourPage.detail.overview.free')}</span></div>
                  <div className="price-row"><span>{t('tourPage.detail.booking.baby')}</span><span>{(tour.babyPrice ?? 0) > 0 ? formatPrice(tour.babyPrice) : t('tourPage.detail.overview.free')}</span></div>
                </div>

                <div className="booking-actions">
                  <button className="book-now-btn" onClick={handleBookNow}>
                    {t('tourPage.detail.booking.bookNow')}
                  </button>
                  <button className="contact-btn">
                    {t('tourPage.detail.booking.contact')}
                  </button>
                </div>

                <div className="booking-info">
                  <h4>{t('tourPage.detail.booking.infoTitle')}</h4>
                  <ul>
                    {t('tourPage.detail.booking.infos', { returnObjects: true }).map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </div>

                <div className="contact-info">
                  <h4>{t('tourPage.detail.booking.contactTitle')}</h4>
                  <div className="contact-item">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>+84 236 247 5555</span>
                  </div>
                  <div className="contact-item">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>kinhdoanh@danangxanh.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourDetailPage;
