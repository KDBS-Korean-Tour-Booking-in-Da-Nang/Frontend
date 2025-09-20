import React from 'react';
import { useParams } from 'react-router-dom';
import './TourPreview.css';

const TourPreviewDemo = () => {
  const { id: tourId } = useParams();

  // Demo tour data
  const tour = {
    id: tourId || 'DNX-TQ3',
    title: 'Tour Lệ Giang Shangrila',
    duration: '5 ngày 4 đêm',
    tourDeparturePoint: 'Đà Nẵng',
    tourVehicle: 'Máy bay + Ô tô',
    category: 'Standard',
    image: null
  };

  return (
    <div className="tour-preview">
      <div className="tour-preview-container">
        {/* Tour Image */}
        <div className="tour-preview-image">
          <div className="tour-placeholder">
            <span className="placeholder-icon">🏞️</span>
            <div className="placeholder-text">
              <div className="welcome-text">Explore</div>
              <div className="sub-text">Dream Destination</div>
            </div>
          </div>
        </div>

        {/* Tour Details */}
        <div className="tour-preview-details">
          <h3 className="tour-preview-title">{tour.title}</h3>
          
          <div className="tour-details-list">
            <div className="detail-item">
              <span className="detail-label">Mã Tour:</span>
              <span className="detail-value">{tour.id}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Thời gian:</span>
              <span className="detail-value">{tour.duration}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Điểm khởi hành:</span>
              <span className="detail-value">{tour.tourDeparturePoint}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Phương tiện:</span>
              <span className="detail-value">{tour.tourVehicle}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Hình thức:</span>
              <span className="detail-value">{tour.category}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Lịch trình:</span>
              <span className="detail-value">
                <button className="schedule-btn">Xem chi tiết</button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourPreviewDemo;
