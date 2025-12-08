import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToursAPI } from '../../../../hooks/useToursAPI';
import { getTourImageUrl } from '../../../../config/api';
import './TourPreview.css';

const TourPreview = () => {
  const { id: tourId } = useParams();
  const { fetchTourById, loading, error } = useToursAPI();
  const [tour, setTour] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        // Silently handle error loading tour for preview
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

  // Use getTourImageUrl from api.js for consistency with other parts of the app
  // This ensures proper URL handling in both local and production environments
  const getImageUrl = (imagePath) => {
    return getTourImageUrl(imagePath);
  };

  if (isLoading || loading) {
    return (
      <div className="tour-preview">
        <div className="tour-preview-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin tour...</p>
        </div>
      </div>
    );
  }

  // Fallback tour data when API fails
  const fallbackTour = {
    id: tourId || 'DNX-TQ3',
    title: 'Tour Lệ Giang Shangrila',
    duration: '5 ngày 4 đêm',
    tourDeparturePoint: 'Đà Nẵng',
    tourVehicle: 'Máy bay + Ô tô',
    category: 'Standard',
    image: null
  };

  if (hasError || error) {
    // Show fallback data when API fails
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
            <h3 className="tour-preview-title">{fallbackTour.title}</h3>
            
            <div className="tour-details-list">
              <div className="detail-item">
                <span className="detail-label">Mã Tour:</span>
                <span className="detail-value">{fallbackTour.id}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Thời gian:</span>
                <span className="detail-value">{fallbackTour.duration}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Điểm khởi hành:</span>
                <span className="detail-value">{fallbackTour.tourDeparturePoint}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Phương tiện:</span>
                <span className="detail-value">{fallbackTour.tourVehicle}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Hình thức:</span>
                <span className="detail-value">{fallbackTour.category}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Lịch trình:</span>
                <span className="detail-value">
                  <button className="schedule-btn">Xem chi tiết</button>
                </span>
              </div>
            </div>
            
            <div className="api-error-notice">
              <small style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                ⚠️ Không thể kết nối API, hiển thị dữ liệu mẫu
              </small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="tour-preview">
        <div className="tour-preview-loading">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin tour...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tour-preview">
      <div className="tour-preview-container">
        {/* Tour Image */}
        <div className="tour-preview-image">
          {tour.image ? (
            <img 
              src={getImageUrl(tour.image)} 
              alt={tour.title}
              className="tour-thumbnail"
            />
          ) : (
            <div className="tour-placeholder">
              <span className="placeholder-icon">🏞️</span>
              <div className="placeholder-text">
                <div className="welcome-text">Explore</div>
                <div className="sub-text">Dream Destination</div>
              </div>
            </div>
          )}
        </div>

        {/* Tour Details */}
        <div className="tour-preview-details">
          <h3 className="tour-preview-title">{tour.title}</h3>
          
          <div className="tour-details-list">
            <div className="detail-item">
              <span className="detail-label">Mã Tour:</span>
              <span className="detail-value">{tour.id || 'N/A'}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Thời gian:</span>
              <span className="detail-value">{tour.duration || 'N/A'}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Điểm khởi hành:</span>
              <span className="detail-value">{tour.tourDeparturePoint || 'N/A'}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Phương tiện:</span>
              <span className="detail-value">{tour.tourVehicle || 'N/A'}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Hình thức:</span>
              <span className="detail-value">{tour.category || 'Standard'}</span>
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

export default TourPreview;
