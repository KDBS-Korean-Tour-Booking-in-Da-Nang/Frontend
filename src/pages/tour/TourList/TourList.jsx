import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToursAPI } from '../../../hooks/useToursAPI';
import { useAuth } from '../../../contexts/AuthContext';
import TourCard from '../TourCard/TourCard';
import styles from './TourList.module.css';

const TourList = () => {
  const { 
    tours,
    loading, 
    error, 
    fetchTours,
    getToursByCategory,
    searchTours,
    searchToursServer
  } = useToursAPI();

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [currentCategory, setCurrentCategory] = useState('all');
  const [filteredTours, setFilteredTours] = useState([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const debounceRef = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    fetchTours();
  }, []);

  // Initial load and when base tours change (non-search mode)
  useEffect(() => {
    if (!isSearchMode) {
      const base = getToursByCategory(currentCategory);
      setFilteredTours(base);
    }
  }, [tours, currentCategory, isSearchMode]);

  // Debounced server-side search (Hybrid part A)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const query = localSearchQuery.trim();
    if (!query) {
      if (controllerRef.current) controllerRef.current.abort();
      setIsSearchMode(false);
      setPage(0);
      setTotalPages(0);
      setFilteredTours(getToursByCategory(currentCategory));
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsSearchMode(true);
      const res = await searchToursServer(query, 0, 20, controller.signal);
      const items = (res.items || []).filter(tour => 
        currentCategory === 'all' || tour.category === currentCategory
      );
      setFilteredTours(items);
      setPage(res.pageNumber || 0);
      setTotalPages(res.totalPages || 0);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [localSearchQuery, currentCategory]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
  };

  const handleCategoryChange = (category) => {
    setCurrentCategory(category);
    // If in search mode, re-run current search immediately for new category
    const query = localSearchQuery.trim();
    if (query) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsSearchMode(true);
      searchToursServer(query, 0, 20, controller.signal).then((res) => {
        const items = (res.items || []).filter(tour => 
          category === 'all' || tour.category === category
        );
        setFilteredTours(items);
        setPage(res.pageNumber || 0);
        setTotalPages(res.totalPages || 0);
      });
    }
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submit/page reload
      const query = localSearchQuery.trim();
      if (!query) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsSearchMode(true);
      const res = await searchToursServer(query, 0, 20, controller.signal);
      const items = (res.items || []).filter(tour => 
        currentCategory === 'all' || tour.category === currentCategory
      );
      setFilteredTours(items);
      setPage(res.pageNumber || 0);
      setTotalPages(res.totalPages || 0);
    }
  };

  const handleLoadMore = async () => {
    if (!isSearchMode) return; // Only load more in search mode
    if (page + 1 >= totalPages) return;
    const nextPage = page + 1;
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const res = await searchToursServer(localSearchQuery.trim(), nextPage, 20, controller.signal);
    const items = (res.items || []).filter(tour => 
      currentCategory === 'all' || tour.category === currentCategory
    );
    setFilteredTours(prev => [...prev, ...items]);
    setPage(res.pageNumber || nextPage);
    setTotalPages(res.totalPages || totalPages);
  };

  const handleHistoryBooking = () => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/login');
      return;
    }
    // Navigate to booking history page
    navigate('/user/booking-history');
  };


  const categories = [
    { id: 'all', name: t('tourList.categories.all'), icon: '🏠' },
    { id: 'domestic', name: t('tourList.categories.domestic'), icon: '🇻🇳' },
    { id: 'international', name: t('tourList.categories.international'), icon: '✈️' },
    { id: 'day-tour', name: t('tourList.categories.dayTour'), icon: '🌅' }
  ];

  if (error) {
    return (
      <div className={styles['error-container']}>
        <div className={styles['error-message']}>
          <h3>{t('tourList.error.title')}</h3>
          <p>{error}</p>
          <button onClick={() => fetchTours()} className={styles['retry-btn']}>
            {t('tourList.error.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['tour-list-container']}>
      {/* Hero Section */}
      <div className={styles['tour-hero']}>
        <div className={styles['hero-content']}>
          <h1 className={styles['hero-title']}>
            {t('tourList.hero.title')}
          </h1>
          <p className={styles['hero-description']}>
            {t('tourList.hero.desc')}
          </p>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className={styles['search-filter-section']}>
        <div className={styles['container']}>
          <div className={styles['search-bar']}>
            <div className={styles['search-input-wrapper']}>
              <svg className={styles['search-icon']} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t('tourList.search.placeholder')}
                value={localSearchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                className={styles['search-input']}
              />
            </div>
            
            {/* History Booking Button */}
            <button 
              className={styles['history-booking-btn']}
              onClick={handleHistoryBooking}
            >
              <svg className={styles['history-icon']} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t('tourList.historyBooking.title')}</span>
            </button>
          </div>

          <div className={styles['category-filters']}>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`${styles['category-btn']} ${currentCategory === category.id ? styles['active'] : ''}`}
                onClick={() => {
                  handleCategoryChange(category.id);
                }}
              >
                <span className={styles['category-icon']}>{category.icon}</span>
                <span className={styles['category-name']}>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tours Grid */}
      <div className={styles['tours-section']}>
        <div className={styles['container']}>
          {loading ? (
            <div className={styles['loading-container']}>
              <div className={styles['loading-spinner']}></div>
              <p>{t('tourList.loading')}</p>
            </div>
          ) : (
            <>
              <div className={styles['tours-grid']}>
                {filteredTours.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                  />
                ))}
              </div>

              {filteredTours.length === 0 && !loading && (
                <div className={styles['no-tours']}>
                  <div className={styles['no-tours-content']}>
                    <svg className={styles['no-tours-icon']} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
                    </svg>
                    <h3>{t('tourList.empty.title')}</h3>
                    <p>{t('tourList.empty.desc')}</p>
                  </div>
                </div>
              )}

              {filteredTours.length > 0 && isSearchMode && (
                <div className={styles['load-more-section']}>
                  <button 
                    className={styles['load-more-btn']}
                    onClick={handleLoadMore}
                    disabled={loading || page + 1 >= totalPages}
                  >
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
