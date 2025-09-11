import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TourCard.css';

const TourCard = ({ tour }) => {
  const navigate = useNavigate();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
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
            <span>Nổi bật</span>
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
            <span>{tour.duration}</span>
          </div>
          
          <div className="tour-price">
            <span className="price-amount">{formatPrice(tour.price)}</span>
          </div>
        </div>
        
        <p className="tour-description">{tour.description}</p>
        
        <button 
          className="tour-details-btn"
          onClick={handleViewDetails}
        >
          CHI TIẾT
        </button>
      </div>
    </div>
  );
};

export default TourCard;
