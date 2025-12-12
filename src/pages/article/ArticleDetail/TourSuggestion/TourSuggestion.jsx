import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { API_ENDPOINTS, getTourImageUrl } from '../../../../config/api';
import { checkAndHandle401 } from '../../../../utils/apiErrorHandler';
import TourCard from '../../../tour/TourCard/TourCard';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import styles from './TourSuggestion.module.css';
import articleStyles from '../ArticleDetail.module.css';

const TourSuggestion = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sliderRef = useRef(null);
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
    // Chỉ fetch khi user đã đăng nhập và có userId trong URL params
    const userIdFromUrl = searchParams.get('userId');
    
    if (!user || !userIdFromUrl) {
      setLoading(false);
      setTours([]);
      setError(null);
      hasFetchedRef.current = false;
      lastUserIdRef.current = null;
      return;
    }

    // Parse userId
    const parsedUserId = Number.parseInt(userIdFromUrl, 10);
    if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
      setError(t('articleDetail.tourSuggestion.errorInvalidUser', { defaultValue: 'Không thể xác định người dùng.' }));
      setLoading(false);
      return;
    }

    // Chỉ fetch nếu userId thay đổi hoặc chưa fetch lần nào
    if (hasFetchedRef.current && lastUserIdRef.current === parsedUserId) {
      return; // Đã fetch rồi, không fetch lại
    }

    // Đánh dấu đã fetch và lưu userId
    hasFetchedRef.current = true;
    lastUserIdRef.current = parsedUserId;

    // Reset state khi userId thay đổi
    setLoading(true);
    setError(null);
    setTours([]);

    const fetchSuggestedTours = async () => {
      try {
        // Build URL
        const url = API_ENDPOINTS.TOURS_SUGGEST_BY_ARTICLE(parsedUserId);
        
        // Get token for authentication
        const token = localStorage.getItem('token') || 
                     localStorage.getItem('token_ADMIN') || 
                     localStorage.getItem('token_STAFF') ||
                     sessionStorage.getItem('token') ||
                     sessionStorage.getItem('token_ADMIN') ||
                     sessionStorage.getItem('token_STAFF');

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
          // Handle 401 with global error handler
          if (await checkAndHandle401(response)) {
            setError(t('articleDetail.tourSuggestion.errorSession', { defaultValue: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }));
            setLoading(false);
            return;
          }
          
          // Nếu lỗi 500, kiểm tra xem có phải AI hết quota không
          if (response.status === 500) {
            const errorText = await response.text().catch(() => 'Server error');
            console.error('[TourSuggestion] Server error (500):', errorText);
            
            // Nếu là lỗi quota của Gemini, giữ loading state (không hiển thị error)
            if (errorText.includes('Quota exceeded') || errorText.includes('429') || errorText.includes('quota')) {
              // Giữ loading state để người dùng tự hiểu là AI hết quota
              return;
            }
            
            // Nếu là lỗi server khác, hiển thị error message
            setError(t('articleDetail.tourSuggestion.errorServer', { defaultValue: 'Lỗi server khi tải tour gợi ý. Vui lòng thử lại sau.' }));
            setLoading(false);
            return;
          }
          
          // Với các lỗi HTTP khác (400, 404, v.v.), hiển thị error message
          setError(t('articleDetail.tourSuggestion.errorHttp', { status: response.status, defaultValue: `Lỗi khi tải tour gợi ý (${response.status}). Vui lòng thử lại sau.` }));
          setLoading(false);
          return;
        }

        const data = await response.json();
        
        // Transform tours to match TourCard format
        const transformedTours = Array.isArray(data) 
          ? data.map(transformTour).filter(tour => tour.id) 
          : [];

        // Chỉ set loading = false và tours khi có data thành công
        setTours(transformedTours);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('[TourSuggestion] Error fetching suggested tours:', err);
        // Nếu là lỗi network hoặc lỗi không xác định, hiển thị error message
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          setError(t('articleDetail.tourSuggestion.errorNetwork', { defaultValue: 'Lỗi kết nối. Vui lòng kiểm tra kết nối internet và thử lại.' }));
        } else {
          setError(t('articleDetail.tourSuggestion.errorUnknown', { defaultValue: 'Có lỗi xảy ra khi tải tour gợi ý. Vui lòng thử lại sau.' }));
        }
        setLoading(false);
      }
    };

    fetchSuggestedTours();
  }, [user, searchParams, t]);

  // Slick carousel settings - chỉ dùng carousel khi có từ 4 tours trở lên
  const settings = {
    dots: false,
    infinite: tours.length >= 4, // Chỉ infinite khi có >= 4 tours
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: false,
    draggable: false, // Tắt kéo để di chuyển carousel
    swipe: false, // Tắt swipe trên mobile
    touchMove: false, // Tắt touch move
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: tours.length >= 4,
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
          infinite: tours.length >= 4,
          draggable: false,
          swipe: false,
          touchMove: false,
        }
      }
    ]
  };

  const goToPrev = () => {
    // Chỉ cho phép di chuyển khi có từ 4 tours trở lên
    if (tours.length >= 4) {
      sliderRef.current?.slickPrev();
    }
  };

  const goToNext = () => {
    // Chỉ cho phép di chuyển khi có từ 4 tours trở lên
    if (tours.length >= 4) {
      sliderRef.current?.slickNext();
    }
  };

  // Chỉ hiển thị khi user đã đăng nhập và có userId trong URL params
  const userIdFromUrl = searchParams.get('userId');
  if (!user || !userIdFromUrl) {
    return null;
  }

  // Luôn hiển thị component khi có userId trong URL
  // Hiển thị error message nếu có lỗi
  if (error) {
    return (
      <div className={`${articleStyles.contentWrap} pt-6`}>
        <div className={articleStyles.card}>
          <div className="p-8">
            <div className={styles.header}>
              <h2 className={styles.title}>{t('articleDetail.tourSuggestion.title')}</h2>
            </div>
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <p className={styles.errorText}>{error}</p>
              <p className={styles.errorSubtext}>{t('articleDetail.tourSuggestion.errorSubtext')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị loading state nếu đang loading hoặc chưa có tours
  if (loading || tours.length === 0) {
    return (
      <div className={`${articleStyles.contentWrap} pt-6`}>
        <div className={articleStyles.card}>
          <div className="p-8">
            <div className={styles.header}>
              <h2 className={styles.title}>{t('articleDetail.tourSuggestion.title')}</h2>
            </div>
            <div className={styles.loadingContainer}>
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-primary mx-auto"></div>
              <p className={styles.loadingText}>{t('articleDetail.tourSuggestion.loading')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine grid class based on number of tours
  let gridClass = styles.toursGrid;
  if (tours.length === 1) {
    gridClass += ` ${styles.singleCard}`;
  } else if (tours.length === 2) {
    gridClass += ` ${styles.twoCards}`;
  }

  return (
    <div className={`${articleStyles.contentWrap} pt-6`}>
      <div className={articleStyles.card}>
        <div className="p-8">
          <div className={styles.header}>
            <h2 className={styles.title}>{t('articleDetail.tourSuggestion.title')}</h2>
            {/* Chỉ hiển thị nút điều hướng khi có từ 4 tours trở lên */}
            {tours.length >= 4 && (
              <div className={styles.navigationButtons}>
                <button 
                  className={styles.navButton} 
                  onClick={goToPrev}
                  aria-label={t('articleDetail.tourSuggestion.previous')}
                >
                  <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  className={`${styles.navButton} ${styles.navButtonNext}`} 
                  onClick={goToNext}
                  aria-label={t('articleDetail.tourSuggestion.next')}
                >
                  <svg className={styles.navIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Hiển thị grid khi có <= 3 tours, carousel khi có >= 4 tours */}
          {tours.length <= 3 ? (
            <div className={gridClass}>
              {tours.map((tour) => (
                <div key={tour.id} className={styles.tourCardWrapper}>
                  <TourCard tour={tour} />
                </div>
              ))}
            </div>
          ) : tours.length >= 4 ? (
            <div className={styles.carouselContainer} style={{ zIndex: 1 }}>
              <Slider ref={sliderRef} {...settings}>
                {tours.map((tour) => (
                  <div key={tour.id} className={styles.slide}>
                    <div style={{ zIndex: 2, willChange: 'transform' }}>
                      <TourCard tour={tour} />
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TourSuggestion;

