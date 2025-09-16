import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToursAPI } from '../../hooks/useToursAPI';
import './TourDetailPage.css';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const TourDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchTourById, loading, error } = useToursAPI();
  const [tour, setTour] = useState(null);

  // Build itinerary data from API (contents or tourSchedule from Step 2)
  const getItineraryFromTour = (tourData) => {
    if (!tourData) return [];
    if (Array.isArray(tourData.contents) && tourData.contents.length > 0) {
      return tourData.contents.map((item, index) => ({
        dayTitle: item.tourContentTitle || `Ngày ${index + 1}`,
        description: item.tourContentDescription || '',
        images: item.images || []
      }));
    }
    try {
      const parsed = JSON.parse(tourData.tourSchedule || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  useEffect(() => {
    const loadTour = async () => {
      try {
        const tourData = await fetchTourById(parseInt(id));
        setTour(tourData);
      } catch (err) {
        console.error('Error loading tour:', err);
        navigate('/tour');
      }
    };

    if (id) {
      loadTour();
    }
  }, [id, navigate]);

  if (loading || !tour) {
    return (
      <div className="tour-detail-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải thông tin tour...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tour-detail-error">
        <h3>Đã xảy ra lỗi</h3>
        <p>{error}</p>
        <button onClick={() => navigate('/tour')} className="back-btn">
          Quay lại danh sách tour
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
    // TODO: Implement booking functionality
    alert('Tính năng đặt tour sẽ được phát triển!');
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
              Quay lại danh sách
            </button>
            
            <div className="hero-info">
              <div className="hero-badge">
                <span>Tour du lịch</span>
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
                <h2>Tổng quan tour</h2>
                <div
                  className="tour-description-html"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(tour.descriptionHtml || tour.description || '') }}
                />
                {(tour.tourDeparturePoint || tour.tourVehicle) && (
                  <p>
                    Khởi hành từ {tour.tourDeparturePoint || '...'} bằng {tour.tourVehicle || 'phương tiện phù hợp'}.
                  </p>
                )}
                <div style={{marginTop: '10px'}}>
                  <ul style={{color: '#6b7280', lineHeight: 1.8}}>
                    {typeof tour.amount === 'number' && (
                      <li>Số chỗ: {tour.amount}</li>
                    )}
                    {typeof tour.childrenPrice === 'number' && tour.childrenPrice > 0 && (
                      <li>Giá trẻ em: {formatPrice(tour.childrenPrice)}</li>
                    )}
                    {typeof tour.babyPrice === 'number' && tour.babyPrice > 0 && (
                      <li>Giá em bé: {formatPrice(tour.babyPrice)}</li>
                    )}
                    {Array.isArray(tour.availableDates) && tour.availableDates.length > 0 && (
                      <li>Ngày khởi hành: {tour.availableDates.join(', ')}</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Tour Highlights */}
              <div className="tour-highlights">
                <h2>Điểm nổi bật của tour</h2>
                <div className="highlights-grid">
                  <div className="highlight-item">
                    <div className="highlight-icon">🏛️</div>
                    <h3>Tham quan di tích lịch sử</h3>
                    <p>Khám phá những di tích lịch sử nổi tiếng với hướng dẫn viên chuyên nghiệp</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">🍽️</div>
                    <h3>Ẩm thực địa phương</h3>
                    <p>Thưởng thức những món ăn đặc sản nổi tiếng của vùng đất này</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">📸</div>
                    <h3>Chụp ảnh kỷ niệm</h3>
                    <p>Ghi lại những khoảnh khắc đáng nhớ tại các điểm check-in nổi tiếng</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">🎁</div>
                    <h3>Mua sắm quà lưu niệm</h3>
                    <p>Thời gian tự do để mua sắm những món quà lưu niệm ý nghĩa</p>
                  </div>
                </div>
              </div>

              {/* Tour Itinerary */}
              <div className="tour-itinerary">
                <div className="itinerary-header">
                  <h2>ĐIỂM ĐẾN VÀ HÀNH TRÌNH</h2>
                </div>
                <div className="itinerary-list">
                  {itinerary.length === 0 ? (
                    <div className="itinerary-item">
                      <div className="itinerary-content">
                        <p className="activity">Lịch trình đang được cập nhật.</p>
                      </div>
                    </div>
                  ) : (
                    itinerary.map((day, index) => {
                      const titleFromAPI = day.dayTitle || day.tourContentTitle || '';
                      const headerTitle = titleFromAPI && titleFromAPI.trim().length > 0
                        ? titleFromAPI
                        : `Ngày ${index + 1}`;
                      return (
                      <div className="itinerary-item" key={index}>
                        <div className="itinerary-day-header">
                          <span className="day-destination">{headerTitle}</span>
                        </div>
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
                      </div>
                    );})
                  )}
                </div>
              </div>

              {/* Tour Gallery */}
              <div className="tour-gallery">
                <h2>Hình ảnh tour</h2>
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
                    <span className="price-label">Giá tour</span>
                    <span className="price-amount">{formatPrice(tour.price)}</span>
                  </div>
                  <div className="price-note">
                    <span>Giá đã bao gồm thuế và phí dịch vụ</span>
                  </div>
                </div>

                <div className="booking-actions">
                  <button className="book-now-btn" onClick={handleBookNow}>
                    Đặt tour ngay
                  </button>
                  <button className="contact-btn">
                    Liên hệ tư vấn
                  </button>
                </div>

                <div className="booking-info">
                  <h4>Thông tin đặt tour</h4>
                  <ul>
                    <li>✓ Hỗ trợ đặt tour 24/7</li>
                    <li>✓ Thanh toán an toàn</li>
                    <li>✓ Hủy tour miễn phí 24h trước khởi hành</li>
                    <li>✓ Bảo hiểm du lịch miễn phí</li>
                    <li>✓ Hướng dẫn viên chuyên nghiệp</li>
                    <li>✓ Xe du lịch tiện nghi</li>
                  </ul>
                </div>

                <div className="contact-info">
                  <h4>Liên hệ đặt tour</h4>
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
