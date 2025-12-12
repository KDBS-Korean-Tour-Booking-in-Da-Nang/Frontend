import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, getTourImageUrl } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import TourCard from '../TourCard/TourCard';
import styles from './TourBehaviorSuggestion.module.css';

// Cache helper functions
const getCacheKey = (userId) => `tourBehaviorSuggestion_${userId || 'guest'}`;
const getCacheTimestampKey = (userId) => `tourBehaviorSuggestion_timestamp_${userId || 'guest'}`;

// Get cached tours if available and not expired (24 hours)
const getCachedTours = (userId) => {
  try {
    const cacheKey = getCacheKey(userId);
    const timestampKey = getCacheTimestampKey(userId);
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(timestampKey);
    
    if (cachedData && cachedTimestamp) {
      const cacheAge = Date.now() - Number.parseInt(cachedTimestamp, 10);
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      
      // Use cache if less than 24 hours old (matching backend logic)
      if (cacheAge < ONE_DAY_MS) {
        return JSON.parse(cachedData);
      } else {
        // Cache expired, remove it
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
      }
    }
  } catch (err) {
    console.error('[TourBehaviorSuggestion] Error reading cache:', err);
  }
  return null;
};

// Save tours to cache
const saveToursToCache = (userId, toursData) => {
  try {
    const cacheKey = getCacheKey(userId);
    const timestampKey = getCacheTimestampKey(userId);
    localStorage.setItem(cacheKey, JSON.stringify(toursData));
    localStorage.setItem(timestampKey, String(Date.now()));
  } catch (err) {
    console.error('[TourBehaviorSuggestion] Error saving cache:', err);
  }
};

const TourBehaviorSuggestion = () => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const lastUserIdRef = useRef(null);

  // Transform tour from backend to TourCard format
  const transformTour = (tour) => {
    return {
      id: tour.tourId || tour.id,
      title: tour.tourName || '',
      tourName: tour.tourName,
      duration: tour.tourDuration || '',
      price: tour.adultPrice ? Number(tour.adultPrice) : 0,
      image: getTourImageUrl(tour.tourImgPath),
      description: tour.tourDescription || '',
      featured: tour.tourStatus === 'PUBLIC'
    };
  };

  useEffect(() => {
    const userId = user?.userId || user?.id || 0;
    
    // Kiểm tra xem userId có thay đổi không
    if (hasFetchedRef.current && lastUserIdRef.current === userId) {
      return;
    }
    
    // Kiểm tra cache trước khi fetch
    const cachedTours = getCachedTours(userId);
    
    // Nếu có cache hợp lệ, load ngay
    if (cachedTours && cachedTours.length > 0) {
      setTours(cachedTours);
      setLoading(false);
      // Vẫn fetch trong background để cập nhật cache
    } else {
      // Không có cache, cần loading state
      setLoading(true);
    }
    
    // Đánh dấu đã fetch cho userId này
    hasFetchedRef.current = true;
    lastUserIdRef.current = userId;

    const fetchSuggestedTours = async () => {
      try {
        const url = API_ENDPOINTS.TOURS_SUGGEST_VIA_BEHAVIOR(userId);
        
        const token = getToken?.();
        const headers = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          // Re-check cache in case it was updated
          const currentCachedTours = getCachedTours(userId);
          
          // Handle 401 with global error handler
          const is401 = await checkAndHandle401(response);
          if (is401) {
            // Nếu có cache, dùng cache thay vì hiển thị lỗi
            if (currentCachedTours && currentCachedTours.length > 0) {
              setTours(currentCachedTours);
              setLoading(false);
              return;
            }
            // Không có cache, giữ loading state thay vì hiển thị lỗi
            if (!currentCachedTours || currentCachedTours.length === 0) {
              // Giữ loading state, không set error
              // Component sẽ hiển thị loading thay vì error
              return;
            }
            return;
          }
          
          // Nếu lỗi 500, kiểm tra xem có phải AI hết quota không
          if (response.status === 500) {
            const errorText = await response.text().catch(() => 'Server error');
            console.error('[TourBehaviorSuggestion] Server error (500):', errorText);
            
            // Luôn dùng cache nếu có (bất kể loại lỗi)
            if (currentCachedTours && currentCachedTours.length > 0) {
              setTours(currentCachedTours);
              setLoading(false);
              return;
            }
            
            // Nếu là lỗi quota của Gemini và không có cache, giữ loading state
            if (errorText.includes('Quota exceeded') || errorText.includes('429') || errorText.includes('quota')) {
              // Không có cache, giữ loading state
              return;
            }
            
            // Không có cache, giữ loading state thay vì hiển thị lỗi
            if (!currentCachedTours || currentCachedTours.length === 0) {
              // Giữ loading state, không set error
              return;
            }
            return;
          }
          
          // Với các lỗi HTTP khác (400, 404, v.v.), dùng cache nếu có
          if (currentCachedTours && currentCachedTours.length > 0) {
            setTours(currentCachedTours);
            setLoading(false);
            return;
          }
          
          // Không có cache, giữ loading state thay vì hiển thị lỗi
          if (!currentCachedTours || currentCachedTours.length === 0) {
            // Giữ loading state, không set error
            return;
          }
          return;
        }

        const data = await response.json();
        
        // Transform tours to match TourCard format và chỉ lấy 3 tours đầu tiên
        const transformedTours = Array.isArray(data) 
          ? data.slice(0, 3).map(transformTour).filter(tour => tour.id) 
          : [];

        // Lưu vào cache
        if (transformedTours.length > 0) {
          saveToursToCache(userId, transformedTours);
        }

        setTours(transformedTours);
        setLoading(false);
      } catch (err) {
        console.error('[TourBehaviorSuggestion] Error fetching suggested tours:', err);
        
        // Nếu có cache, dùng cache thay vì hiển thị lỗi
        const currentCachedTours = getCachedTours(userId);
        if (currentCachedTours && currentCachedTours.length > 0) {
          setTours(currentCachedTours);
          setLoading(false);
          return;
        }
        
        // Không có cache, giữ loading state thay vì hiển thị lỗi
        // Component sẽ hiển thị loading thay vì error
        if (!currentCachedTours || currentCachedTours.length === 0) {
          // Giữ loading state, không set error
          return;
        }
      }
    };

    fetchSuggestedTours();
  }, [user, getToken, t]);

  // Vì chỉ có 3 tours nên không cần carousel, chỉ cần grid
  // Nút điều hướng sẽ không hoạt động vì không có carousel
  const goToPrev = () => {
    // Không có carousel nên không cần xử lý
  };

  const goToNext = () => {
    // Không có carousel nên không cần xử lý
  };

  // Hiển thị loading nếu đang loading hoặc chưa có tours (giống TourSuggestion)
  if (loading || tours.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('tourList.behaviorSuggestion.title')}</h2>
        </div>
        <div className={styles.loadingContainer}>
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-primary mx-auto"></div>
          <p className={styles.loadingText}>{t('tourList.behaviorSuggestion.loading')}</p>
        </div>
      </div>
    );
  }

  // Không hiển thị error - chỉ hiển thị loading hoặc tours
  // Error sẽ được xử lý bằng cách dùng cache hoặc tiếp tục loading

  // Không cần grid class đặc biệt vì đã dùng CSS grid
  const gridClass = styles.toursGrid;

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('tourList.behaviorSuggestion.title')}</h2>
        </div>

        <div className={styles.carouselWrapper}>
          {/* Nút điều hướng bên trái */}
          {tours.length > 0 && (
            <button 
              className={styles.navButtonLeft} 
              onClick={goToPrev}
              aria-label={t('tourList.behaviorSuggestion.previous')}
            >
              <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Carousel - luôn hiển thị grid vì chỉ có 3 tours */}
          <div className={styles.carouselContainer}>
            <div className={gridClass}>
              {tours.map((tour) => (
                <div key={tour.id} className={styles.tourCardWrapper}>
                  <TourCard tour={tour} />
                </div>
              ))}
            </div>
          </div>

          {/* Nút điều hướng bên phải */}
          {tours.length > 0 && (
            <button 
              className={styles.navButtonRight} 
              onClick={goToNext}
              aria-label={t('tourList.behaviorSuggestion.next')}
            >
              <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Separator line */}
      <div className={styles.separator}>
        <div className={styles.separatorLine}></div>
        <div className={styles.separatorText}>
          {t('tourList.allTours.title')}
        </div>
        <div className={styles.separatorLine}></div>
      </div>
    </>
  );
};

export default TourBehaviorSuggestion;

