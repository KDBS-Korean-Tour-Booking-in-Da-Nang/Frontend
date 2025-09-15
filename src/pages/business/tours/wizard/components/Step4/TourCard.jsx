import React from 'react';
import './TourCard.css';

const TourCard = ({ tour, onClick, showActions = false }) => {
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
    <div className="tour-card" onClick={onClick}>
      {/* Tour Image */}
      <div className="tour-card-image">
        {tour.thumbnail ? (
          <img 
            src={getImageSrc(tour.thumbnail)} 
            alt={tour.tourName}
          />
        ) : (
          <div className="tour-card-placeholder">
            <span className="placeholder-icon">🏞️</span>
            <div className="placeholder-overlay">
              <div className="welcome-text">
                <span className="welcome-w">W</span>
                <span className="welcome-e">E</span>
                <span className="welcome-l">L</span>
                <span className="welcome-c">C</span>
                <span className="welcome-o">O</span>
                <span className="welcome-m">M</span>
                <span className="welcome-e2">E</span>
              </div>
              <div className="sub-text">Explore</div>
              <div className="sub-text-2">Dream Destination</div>
            </div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="featured-badge">
          {tour.tourStatus === 'ACTIVE' ? 'HOẠT ĐỘNG' :
           tour.tourStatus === 'INACTIVE' ? 'TẠM DỪNG' :
           tour.tourStatus === 'NOT_APPROVED' ? 'CHỜ DUYỆT' :
           tour.tourStatus === 'DRAFT' ? 'BẢN NHÁP' : tour.tourStatus}
        </div>
      </div>

      {/* Tour Info */}
      <div className="tour-card-content">
        <h3 className="tour-card-title">{tour.tourName}</h3>
        
        <div className="tour-card-info">
          <div className="tour-duration">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            {tour.tourDuration}
          </div>
          
          <div className="tour-price">
            <div className="price-amount">{formatPrice(tour.adultPrice)}₫</div>
          </div>
        </div>

        <div className="tour-description">
          {tour.tourDeparturePoint || 'Đà Nẵng'} • {tour.amount || '30'} khách
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
          <button className="tour-details-btn">
            Xem Chi Tiết
          </button>
        )}
      </div>
    </div>
  );
};

export default TourCard;
