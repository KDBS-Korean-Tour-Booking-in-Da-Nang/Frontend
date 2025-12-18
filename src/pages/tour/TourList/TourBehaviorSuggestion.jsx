import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, getTourImageUrl } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import TourCard from '../TourCard/TourCard';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import styles from './TourBehaviorSuggestion.module.css';

const getCacheKey = (userId) => `tourBehaviorSuggestion_${userId || 'guest'}`;
const getCacheTimestampKey = (userId) => `tourBehaviorSuggestion_timestamp_${userId || 'guest'}`;

// Lấy tour đã cache từ localStorage
// Cache có thời hạn 1 ngày, nếu hết hạn thì xóa và trả về null
const getCachedTours = (userId) => {
  try {
    const cacheKey = getCacheKey(userId);
    const timestampKey = getCacheTimestampKey(userId);
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(timestampKey);
    
    if (cachedData && cachedTimestamp) {
      const cacheAge = Date.now() - Number.parseInt(cachedTimestamp, 10);
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      
      // Nếu cache còn trong thời hạn (dưới 1 ngày), trả về dữ liệu
      if (cacheAge < ONE_DAY_MS) {
        return JSON.parse(cachedData);
      } else {
        // Cache hết hạn, xóa khỏi localStorage
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
      }
      }
    } catch {
    }
  return null;
};

// Lưu tour vào cache với timestamp để kiểm tra thời hạn sau
const saveToursToCache = (userId, toursData) => {
  try {
    const cacheKey = getCacheKey(userId);
    const timestampKey = getCacheTimestampKey(userId);
    localStorage.setItem(cacheKey, JSON.stringify(toursData));
    localStorage.setItem(timestampKey, String(Date.now()));
  } catch {
  }
};

const TourBehaviorSuggestion = () => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const lastUserIdRef = useRef(null);
  const sliderRef = useRef(null);

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

  // Effect fetch tour suggestion: chỉ fetch khi userId thay đổi
  // Sử dụng cache để hiển thị ngay, sau đó fetch từ API
  useEffect(() => {
    const userId = user?.userId || user?.id || 0;
    
    // Tránh fetch trùng lặp nếu đã fetch cho userId này
    if (hasFetchedRef.current && lastUserIdRef.current === userId) {
      return;
    }
    
    // Lấy tour từ cache trước để hiển thị ngay
    const cachedTours = getCachedTours(userId);
    
    if (cachedTours && cachedTours.length > 0) {
      setTours(cachedTours);
      setLoading(false);
    } else {
      setLoading(true);
    }
    
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
          const currentCachedTours = getCachedTours(userId);
          
          // Xử lý lỗi 401: nếu có cache thì dùng cache, nếu không thì giữ loading state
          const is401 = await checkAndHandle401(response);
          if (is401) {
            if (currentCachedTours && currentCachedTours.length > 0) {
              setTours(currentCachedTours);
              setLoading(false);
              return;
            }
            if (!currentCachedTours || currentCachedTours.length === 0) {
              return;
            }
            return;
          }
          
          // Xử lý lỗi 500: fallback về cache nếu có
          // Nếu là quota exceeded (429) thì không fallback, giữ loading state
          if (response.status === 500) {
            const errorText = await response.text().catch(() => 'Server error');
            
            if (currentCachedTours && currentCachedTours.length > 0) {
              setTours(currentCachedTours);
              setLoading(false);
              return;
            }
            
            // Nếu là quota exceeded, không fallback về cache (giữ loading state)
            if (errorText.includes('Quota exceeded') || errorText.includes('429') || errorText.includes('quota')) {
              return;
            }
            
            if (!currentCachedTours || currentCachedTours.length === 0) {
              return;
            }
            return;
          }
          
          // Với các lỗi khác: fallback về cache nếu có
          if (currentCachedTours && currentCachedTours.length > 0) {
            setTours(currentCachedTours);
            setLoading(false);
            return;
          }
          
          if (!currentCachedTours || currentCachedTours.length === 0) {
            return;
          }
          return;
        }

        const data = await response.json();
        
        const transformedTours = Array.isArray(data) 
          ? data.slice(0, 3).map(transformTour).filter(tour => tour.id) 
          : [];

        if (transformedTours.length > 0) {
          saveToursToCache(userId, transformedTours);
        }

        setTours(transformedTours);
        setLoading(false);
      } catch {
        const currentCachedTours = getCachedTours(userId);
        if (currentCachedTours && currentCachedTours.length > 0) {
          setTours(currentCachedTours);
          setLoading(false);
          return;
        }
        
        if (!currentCachedTours || currentCachedTours.length === 0) {
          return;
        }
      }
    };

    fetchSuggestedTours();
  }, [user, getToken, t]);

  const settings = {
    dots: false,
    infinite: false, // Không infinite vì chỉ có 3 tours
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: false,
    draggable: false, // Tắt kéo để di chuyển carousel
    swipe: false, // Tắt swipe trên mobile
    touchMove: false, // Tắt touch move
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: false,
          draggable: false,
          swipe: false,
          touchMove: false,
        }
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: false,
          draggable: false,
          swipe: false,
          touchMove: false,
        }
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: false,
          draggable: false,
          swipe: false,
          touchMove: false,
        }
      }
    ]
  };

  const goToPrev = () => {
    sliderRef.current?.slickPrev();
  };

  const goToNext = () => {
    sliderRef.current?.slickNext();
  };

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

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('tourList.behaviorSuggestion.title')}</h2>
        </div>

        <div className={styles.carouselWrapper}>
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

          <div className={styles.carouselContainer} style={{ zIndex: 1, overflow: 'visible' }}>
            <Slider ref={sliderRef} {...settings}>
              {tours.map((tour) => (
                <div key={tour.id} className={styles.slide}>
                  <div 
                    style={{ zIndex: 2, willChange: 'transform' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.zIndex = '10';
                      e.currentTarget.style.position = 'relative';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.zIndex = '2';
                    }}
                  >
                    <TourCard tour={tour} />
                  </div>
                </div>
              ))}
            </Slider>
          </div>

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

