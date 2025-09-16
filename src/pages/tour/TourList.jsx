import React, { useEffect, useState } from 'react';
import { useToursAPI } from '../../hooks/useToursAPI';
import TourCard from './TourCard';
import './TourList.css';

const TourList = () => {
  const { 
    tours,
    loading, 
    error, 
    fetchTours,
    getToursByCategory,
    searchTours
  } = useToursAPI();

  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [currentCategory, setCurrentCategory] = useState('all');
  const [filteredTours, setFilteredTours] = useState([]);

  useEffect(() => {
    fetchTours();
  }, []);

  // Update filtered tours when tours or category changes
  useEffect(() => {
    let filtered = getToursByCategory(currentCategory);
    if (localSearchQuery.trim()) {
      filtered = searchTours(localSearchQuery).filter(tour => 
        currentCategory === 'all' || tour.category === currentCategory
      );
    }
    setFilteredTours(filtered);
  }, [tours, currentCategory, localSearchQuery]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
  };

  const handleCategoryChange = (category) => {
    setCurrentCategory(category);
  };


  const categories = [
    { id: 'all', name: 'Tất cả tour', icon: '🏠' },
    { id: 'domestic', name: 'Tour trong nước', icon: '🇻🇳' },
    { id: 'international', name: 'Tour nước ngoài', icon: '✈️' },
    { id: 'day-tour', name: 'Tour trong ngày', icon: '🌅' }
  ];

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h3>Đã xảy ra lỗi</h3>
          <p>{error}</p>
          <button onClick={() => fetchTours()} className="retry-btn">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tour-list-container">
      {/* Hero Section */}
      <div className="tour-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Tour du lịch Đà Nẵng trong nước và quốc tế các điểm hấp dẫn
          </h1>
          <p className="hero-description">
            Đà Nẵng Xanh sẽ mang đến du khách chuyến tour du lịch tốt nhất đảm bảo về chất lượng với chi phí hợp lý du khách sẽ có chuyến du lịch đích thực.
          </p>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="search-filter-section">
        <div className="container">
          <div className="search-bar">
            <div className="search-input-wrapper">
              <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm tour..."
                value={localSearchQuery}
                onChange={handleSearchChange}
                className="search-input"
              />
            </div>
          </div>

          <div className="category-filters">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`category-btn ${currentCategory === category.id ? 'active' : ''}`}
                onClick={() => {
                  handleCategoryChange(category.id);
                }}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tours Grid */}
      <div className="tours-section">
        <div className="container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Đang tải danh sách tour...</p>
            </div>
          ) : (
            <>
              <div className="tours-grid">
                {filteredTours.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                  />
                ))}
              </div>

              {filteredTours.length === 0 && !loading && (
                <div className="no-tours">
                  <div className="no-tours-content">
                    <svg className="no-tours-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
                    </svg>
                    <h3>Không tìm thấy tour nào</h3>
                    <p>Hãy thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác.</p>
                  </div>
                </div>
              )}

              {filteredTours.length > 0 && (
                <div className="load-more-section">
                  <button className="load-more-btn">
                    Xem thêm
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TourList;
