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
  const lastArticleIdRef = useRef(null);

  // Transform tour từ backend sang TourCard format: map tourId/id, tourName, tourDuration, adultPrice, tourImgPath (dùng getTourImageUrl), tourDescription, tourStatus === 'PUBLIC' => featured
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

  // Fetch suggested tours: lấy articleId từ URL params, parse và validate, chỉ fetch nếu articleId thay đổi hoặc chưa fetch lần nào, build URL với TOURS_SUGGEST_BY_ARTICLE, get token từ localStorage/sessionStorage (ADMIN/STAFF/legacy), handle 401 với checkAndHandle401, handle 500 (kiểm tra quota exceeded), transform tours sang TourCard format
  useEffect(() => {
    const articleIdFromUrl = searchParams.get('id');
    
    if (!articleIdFromUrl) {
      setLoading(false);
      setTours([]);
      setError(null);
      hasFetchedRef.current = false;
      lastArticleIdRef.current = null;
      return;
    }

    const parsedArticleId = Number.parseInt(articleIdFromUrl, 10);
    if (Number.isNaN(parsedArticleId) || parsedArticleId <= 0) {
      setError(t('articleDetail.tourSuggestion.errorInvalidArticle', { defaultValue: 'Không thể xác định bài viết.' }));
      setLoading(false);
      return;
    }

    if (hasFetchedRef.current && lastArticleIdRef.current === parsedArticleId) {
      return;
    }

    hasFetchedRef.current = true;
    lastArticleIdRef.current = parsedArticleId;

    setLoading(true);
    setError(null);
    setTours([]);

    const fetchSuggestedTours = async () => {
      try {
        const url = API_ENDPOINTS.TOURS_SUGGEST_BY_ARTICLE(parsedArticleId);
        
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
          if (await checkAndHandle401(response)) {
            setError(t('articleDetail.tourSuggestion.errorSession', { defaultValue: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }));
            setLoading(false);
            return;
          }
          
          if (response.status === 500) {
            const errorText = await response.text().catch(() => 'Server error');
            
            if (errorText.includes('Quota exceeded') || errorText.includes('429') || errorText.includes('quota')) {
              return;
            }
            
            setError(t('articleDetail.tourSuggestion.errorServer', { defaultValue: 'Lỗi server khi tải tour gợi ý. Vui lòng thử lại sau.' }));
            setLoading(false);
            return;
          }
          
          setError(t('articleDetail.tourSuggestion.errorHttp', { status: response.status, defaultValue: `Lỗi khi tải tour gợi ý (${response.status}). Vui lòng thử lại sau.` }));
          setLoading(false);
          return;
        }

        const data = await response.json();
        
        const transformedTours = Array.isArray(data) 
          ? data.map(transformTour).filter(tour => tour.id) 
          : [];

        setTours(transformedTours);
        setLoading(false);
        setError(null);
      } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          setError(t('articleDetail.tourSuggestion.errorNetwork', { defaultValue: 'Lỗi kết nối. Vui lòng kiểm tra kết nối internet và thử lại.' }));
        } else {
          setError(t('articleDetail.tourSuggestion.errorUnknown', { defaultValue: 'Có lỗi xảy ra khi tải tour gợi ý. Vui lòng thử lại sau.' }));
        }
        setLoading(false);
      }
    };

    fetchSuggestedTours();
  }, [searchParams, t]);

  // Slick carousel settings: chỉ dùng carousel khi có từ 4 tours trở lên (infinite, draggable, swipe, touchMove = false), responsive breakpoints (1024: 2 slides, 640: 1 slide)
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

  // Điều hướng carousel: chỉ cho phép di chuyển khi có từ 4 tours trở lên, gọi slickPrev/slickNext
  const goToPrev = () => {
    if (tours.length >= 4) {
      sliderRef.current?.slickPrev();
    }
  };

  const goToNext = () => {
    if (tours.length >= 4) {
      sliderRef.current?.slickNext();
    }
  };

  // Hiển thị error message nếu có lỗi: hiển thị error icon, error text và subtext
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

  // Hiển thị loading state nếu đang loading: hiển thị spinner và loading text
  if (loading) {
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

  // Hiển thị message khi không có tour gợi ý: API trả về mảng rỗng, hiển thị icon và noTours message
  if (tours.length === 0) {
    return (
      <div className={`${articleStyles.contentWrap} pt-6`}>
        <div className={articleStyles.card}>
          <div className="p-8">
            <div className={styles.header}>
              <h2 className={styles.title}>{t('articleDetail.tourSuggestion.title')}</h2>
            </div>
            <div className={styles.loadingContainer}>
              <div className="text-gray-400 text-4xl mb-4">🔍</div>
              <p className={styles.loadingText}>
                {t('articleDetail.tourSuggestion.noTours')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Xác định grid class dựa trên số lượng tours: 1 tour = singleCard, 2 tours = twoCards, >= 3 tours = toursGrid
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

