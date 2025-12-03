import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

  const { t } = useTranslation();

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
    { id: 'all', name: t('tourList.categories.all'), icon: '🏠' },
    { id: 'domestic', name: t('tourList.categories.domestic'), icon: '🇻🇳' },
    { id: 'international', name: t('tourList.categories.international'), icon: '✈️' },
    { id: 'day-tour', name: t('tourList.categories.dayTour'), icon: '🌅' }
  ];

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h3>{t('tourList.error.title')}</h3>
          <p>{error}</p>
          <button onClick={() => fetchTours()} className="retry-btn">
            {t('tourList.error.retry')}
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
            {t('tourList.hero.title')}
          </h1>
          <p className="hero-description">
            {t('tourList.hero.desc')}
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
                placeholder={t('tourList.search.placeholder')}
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
              <p>{t('tourList.loading')}</p>
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
                    <h3>{t('tourList.empty.title')}</h3>
                    <p>{t('tourList.empty.desc')}</p>
                  </div>
                </div>
              )}

              {filteredTours.length > 0 && (
                <div className="load-more-section">
                  <button className="load-more-btn">
                    {t('tourList.loadMore')}
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
