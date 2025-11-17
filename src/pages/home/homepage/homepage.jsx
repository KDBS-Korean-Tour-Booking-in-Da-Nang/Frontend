import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { useToursAPI } from '../../../hooks/useToursAPI';
import { API_ENDPOINTS } from '../../../config/api';

const FALLBACK_GALLERY_IMAGE = '/default-Tour.jpg';

const Homepage = () => {
  const { t, i18n } = useTranslation();
  const { getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');
  const timerRef = useRef(null);
  
  // Tours for TOP DESTINATIONS
  const { tours, loading: toursLoading, error: toursError, fetchTours } = useToursAPI();
  const [pageRatings, setPageRatings] = useState({}); // { tourId: avg }
  const sliderRef = useRef(null);

  const defaultTours = useMemo(() => ([
    {
      id: 'default-tour-1',
      title: t('home.destinations.defaultCards.banaTitle', 'Khám phá Bà Nà Hills'),
      tourDeparturePoint: t('home.destinations.defaultCards.banaDeparture', 'Đà Nẵng'),
      price: 1899000,
      image: '/tour1.jpg',
      rating: 4.8,
      isDefault: true
    },
    {
      id: 'default-tour-2',
      title: t('home.destinations.defaultCards.hoianTitle', 'Dạo bước Hội An cổ kính'),
      tourDeparturePoint: t('home.destinations.defaultCards.hoianDeparture', 'Hội An'),
      price: 1599000,
      image: '/tour2.jpg',
      rating: 4.7,
      isDefault: true
    },
    {
      id: 'default-tour-3',
      title: t('home.destinations.defaultCards.culaoChamTitle', 'Khám phá Cù Lao Chàm'),
      tourDeparturePoint: t('home.destinations.defaultCards.culaoChamDeparture', 'Quảng Nam'),
      price: 1399000,
      image: '/tour3.jpg',
      rating: 4.6,
      isDefault: true
    }
  ]), [i18n.language, t]);

  const vnd = useRef(new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }));
  
  // Gallery images state
  const [galleryImages, setGalleryImages] = useState([
    { src: '/tour1.jpg', alt: 'Left Top', loaded: false, error: false },
    { src: '/tour2.jpg', alt: 'Right Top', loaded: false, error: false },
    { src: '/tour3.jpg', alt: 'Left Bottom', loaded: false, error: false },
    { src: '/TourDaNangBackground.jpg', alt: 'Right Tall', loaded: false, error: false }
  ]);

  // Close success message
  const closeSuccessMessage = useCallback(() => {
    setSuccessMessage('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Handle image load and error
  const handleImageLoad = (index) => {
    setGalleryImages(prev => prev.map((img, i) => 
      i === index ? { ...img, loaded: true, error: false } : img
    ));
  };

  const handleImageError = (index) => {
    setGalleryImages(prev => prev.map((img, i) => {
      if (i !== index) return img;
      // Avoid infinite loops if fallback also fails
      if (img.src === FALLBACK_GALLERY_IMAGE) {
        return { ...img, loaded: false, error: true };
      }
      return { 
        ...img, 
        src: FALLBACK_GALLERY_IMAGE, 
        alt: img.alt || 'Default tour image',
        loaded: false, 
        error: true 
      };
    }));
  };

  // Check for success message from navigation state or localStorage (avoid route replace to prevent flicker)
  useEffect(() => {
    const oauthMessage = localStorage.getItem('oauth_success_message');
    if (oauthMessage) {
      setSuccessMessage(oauthMessage);
      localStorage.removeItem('oauth_success_message');
    }

    if (location.state?.message && location.state?.type === 'success') {
      setSuccessMessage(location.state.message);
      // Clear state without triggering a route change/render cycle
      try {
        window.history.replaceState({}, document.title, location.pathname + location.search);
      } catch (error) {
        console.error('Failed to replace state in history', error);
      }
    }
  }, [location.state, location.pathname, location.search]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setSuccessMessage('');
        timerRef.current = null;
      }, 5000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [successMessage]);


  // Fetch tours for TOP DESTINATIONS
  useEffect(() => {
    fetchTours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prepare tours data for slider
  const toursList = useMemo(() => {
    return Array.isArray(tours) ? tours : [];
  }, [tours]);

  const showingOnlyDefaultTours = useMemo(() => {
    return !toursLoading && (toursList.length === 0 || Boolean(toursError));
  }, [toursError, toursList.length, toursLoading]);

  const displayTours = useMemo(() => {
    if (showingOnlyDefaultTours) {
      return defaultTours;
    }

    const validTours = toursList.filter(Boolean);
    if (validTours.length >= 3) {
      return validTours;
    }

    const neededDefaults = Math.max(0, 3 - validTours.length);
    return [...validTours, ...defaultTours.slice(0, neededDefaults)];
  }, [defaultTours, showingOnlyDefaultTours, toursList]);
  const totalDisplayTours = displayTours.length;

  // Apply padding to slick-list after slider initializes
  useEffect(() => {
    if (totalDisplayTours > 0) {
      const applyStyles = () => {
        const slickList = document.querySelector('.destinations-slider .slick-list');
        if (slickList) {
          slickList.style.paddingTop = '30px';
          slickList.style.paddingBottom = '30px';
        }
      };
      
      // Apply immediately and after delays to ensure slider is initialized
      applyStyles();
      const timer1 = setTimeout(applyStyles, 100);
      const timer2 = setTimeout(applyStyles, 300);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [totalDisplayTours]);

  // Slider navigation handlers
  const handlePrevDest = useCallback(() => {
    if (sliderRef.current) {
      sliderRef.current.slickPrev();
    }
  }, []);

  const handleNextDest = useCallback(() => {
    if (sliderRef.current) {
      sliderRef.current.slickNext();
    }
  }, []);

  // Slider settings
  const sliderSettings = useMemo(() => {
    const totalTours = totalDisplayTours;
    return {
      infinite: totalTours > 3, // Chỉ infinite khi có nhiều hơn 3 tours
      speed: 300, // Giảm tốc độ để bấm nhanh hơn
      slidesToShow: Math.min(3, Math.max(totalTours, 1)), // Hiển thị tối đa 3, hoặc số tours nếu ít hơn
      slidesToScroll: 1,
      arrows: false, // We'll use custom arrows
      dots: false,
      swipe: true,
      touchMove: true,
      autoplay: false, // Tắt autoplay, người dùng tự điều khiển
      pauseOnHover: false, // Tắt pause on hover để bấm nhanh hơn
      cssEase: 'ease-out', // Smooth transition
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: Math.min(2, Math.max(totalTours, 1)),
            slidesToScroll: 1,
            infinite: totalTours > 2,
          }
        },
        {
          breakpoint: 640,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
            infinite: totalTours > 1,
          }
        }
      ]
    };
  }, [totalDisplayTours]);

  // Fetch average rating for all tours
  useEffect(() => {
    const controller = new AbortController();
    const fetchRatings = async () => {
      const ids = toursList.filter((t) => t && t.id).map((t) => t.id);
      if (ids.length === 0) return setPageRatings({});

      // Skip fetching ratings if not authenticated and endpoint requires auth
      const token = getToken && getToken();
      if (!token) {
        setPageRatings({});
        return;
      }
      try {
        const entries = await Promise.all(ids.map(async (id) => {
          const res = await fetch(API_ENDPOINTS.TOUR_RATED_BY_TOUR(id), {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) return [id, null];
          const list = await res.json();
          if (!Array.isArray(list) || list.length === 0) return [id, 0];
          const sum = list.reduce((acc, it) => acc + (Number(it.star) || 0), 0);
          const avg = sum / list.length;
          return [id, Number.isFinite(avg) ? Math.round(avg * 10) / 10 : 0];
        }));
        const map = Object.fromEntries(entries);
        setPageRatings(map);
      } catch {
        // ignore
      }
    };
    fetchRatings();
    return () => controller.abort();
  }, [toursList, getToken]);


  // GSAP animations - optimized for faster initial display (defer to next frame)
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      // Also defer to microtask to avoid colliding with initial paint
      Promise.resolve().then(() => {
      // Hero section animations
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      
      // Animate badge - only if element exists
      const exploreBadge = document.querySelector('.explore-badge');
      if (exploreBadge) {
        heroTl.fromTo(exploreBadge, 
          { y: 30, opacity: 0 }, 
          { 
            y: 0, 
            opacity: 1, 
            duration: 0.6,
            onComplete: () => gsap.set(exploreBadge, { clearProps: 'transform' })
          }
        );
      }
      
      // Animate headline parts - only if elements exist
      const heroTitleSpans = document.querySelectorAll('.hero-title span');
      if (heroTitleSpans.length > 0) {
        heroTl.fromTo(heroTitleSpans, 
          { y: 50, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.15 }, '-=0.4'
        );
      }
      
      // Animate description and button together - only if elements exist
      const heroDesc = document.querySelector('.hero-desc');
      const bookNowBtn = document.querySelector('.book-now-btn');
      
      if (heroDesc && bookNowBtn) {
        // Animate description and button simultaneously
        heroTl.fromTo([heroDesc, bookNowBtn], 
          { y: 30, opacity: 0, scale: 0.9 }, 
          { 
            y: 0, 
            opacity: 1, 
            scale: 1, 
            duration: 0.6,
            stagger: 0.1,
            onComplete: () => {
              gsap.set(heroDesc, { clearProps: 'transform' });
              gsap.set(bookNowBtn, { clearProps: 'transform' });
            }
          }, '-=0.4'
        );
      } else if (heroDesc) {
        // Only animate description if button doesn't exist
        heroTl.fromTo(heroDesc, 
          { y: 30, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.6 }, '-=0.4'
        );
      } else if (bookNowBtn) {
        // Only animate button if description doesn't exist
        heroTl.fromTo(bookNowBtn, 
          { y: 30, opacity: 0, scale: 0.9 }, 
          { 
            y: 0, 
            opacity: 1, 
            scale: 1, 
            duration: 0.6,
            onComplete: () => gsap.set(bookNowBtn, { clearProps: 'transform' })
          }, '-=0.4'
        );
      }

      // Services section animations - animate immediately after hero
      const serviceCards = gsap.utils.toArray('.service-card');
      if (serviceCards.length > 0) {
        // Add service cards animation to hero timeline
        heroTl.fromTo(serviceCards, 
          { y: 60, opacity: 0, scale: 0.9 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.6,
            ease: 'power2.out',
            stagger: 0.12,
            onComplete: () => {
              serviceCards.forEach(el => gsap.set(el, { clearProps: 'transform' }));
            }
          }, '-=0.2' // Start slightly before hero animation ends
        );
      }
      });
    });
    
    return () => {
      cancelAnimationFrame(rafId);
    };

  }, []);


  return (
    <div className="page-gradient">
      <div 
        className="min-h-screen"
        style={{ 
          scrollBehavior: 'smooth',
          transform: 'translateZ(0)', // Force hardware acceleration
          backfaceVisibility: 'hidden', // Prevent flickering during zoom
          position: 'relative',
          zIndex: 1
        }}
      >
      {/* ✅ Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-secondary border border-primary text-primary px-4 py-3 rounded-md shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 
                  00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 
                  00-1.414 1.414l2 2a1 1 0 
                  001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{successMessage}</span>
            </div>
            <button
              onClick={closeSuccessMessage}
              className="ml-4 text-primary hover:text-primary-hover focus:outline-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ✅ Main Content Section - Hero + Services */}
      <div className="relative">
        <div className="relative">
          {/* Hero Section */}
          <div className="py-8 sm:py-12 pb-16 sm:pb-20 px-4 sm:px-6 mt-16">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-16 items-center w-full">
            {/* Left Content */}
            <div className="space-y-4 sm:space-y-6 text-left lg:ml-16">
              {/* Explore Danang Badge */}
              <div className="explore-badge inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-6 py-3 shadow-sm hover:shadow-lg hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <span className="text-gray-700 font-medium text-base">{t('home.hero.badge')}</span>
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>

              {/* Main Headline */}
              <h1 className="hero-title text-3xl sm:text-4xl lg:text-6xl font-bold leading-tight">
                <span className="block text-gray-600">{t('home.hero.titleFrom')}</span>
                <span className="block text-gray-900">{t('home.hero.titleSoutheast')}</span>
                <span className="block text-red-500">{t('home.hero.titleTo')}</span>
              </h1>

              {/* Description */}
              <p className="hero-desc text-sm sm:text-base text-gray-600 max-w-sm leading-relaxed text-left">
                {t('home.hero.desc')}
              </p>

              {/* Book Now Button */}
              <button 
                className="book-now-btn bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-105 cursor-pointer w-full sm:w-auto"
                onClick={() => navigate('/tour')}
              >
                {t('home.hero.btnBookNow')}
              </button>
            </div>

            {/* Right Gallery — responsive */}
            <div className="relative max-w-[500px] min-h-[250px] sm:min-h-[320px] mx-auto lg:mr-8 mt-8 sm:mt-12 lg:mt-0">
              {/* dashed paths + icons (tuỳ chọn, giữ nguyên nếu bạn đã có) */}

              <div className="grid grid-cols-2 gap-[8px_12px] sm:gap-[12px_20px] items-start justify-items-stretch">
                {/* Trái trên — Ô vuông */}
                <figure className="relative overflow-hidden rounded-[15px] shadow-[0_12px_30px_rgba(2,6,23,.12)] bg-[#eef2f7] aspect-[1/1.12] mb-4 hover:scale-105 hover:brightness-110 hover:saturate-110 hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] transition-all duration-300 cursor-pointer">
                  <img 
                    src={galleryImages[0]?.src || FALLBACK_GALLERY_IMAGE} 
                    alt={galleryImages[0]?.alt || 'Tour image'} 
                    className="w-full h-full object-cover block"
                    loading="eager"
                    onLoad={() => handleImageLoad(0)}
                    onError={() => handleImageError(0)}
                  />
                </figure>

                {/* Phải trên — Ô nhỏ ngang (bo tròn lớn) */}
                <figure className="relative overflow-hidden rounded-[18px] shadow-[0_12px_30px_rgba(2,6,23,.12)] bg-[#eef2f7] aspect-[16/11] -mt-[4px] sm:-mt-[8px] translate-y-[-15px] sm:translate-y-[-30px] hover:scale-105 hover:brightness-110 hover:saturate-110 hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] transition-all duration-300 cursor-pointer">
                  <img 
                    src={galleryImages[1]?.src || FALLBACK_GALLERY_IMAGE} 
                    alt={galleryImages[1]?.alt || 'Tour image'} 
                    className="w-full h-full object-cover block"
                    loading="eager"
                    onLoad={() => handleImageLoad(1)}
                    onError={() => handleImageError(1)}
                  />
                </figure>

                {/* Trái dưới — Ô vuông */}
                <figure className="relative overflow-hidden rounded-[15px] shadow-[0_12px_30px_rgba(2,6,23,.12)] bg-[#eef2f7] aspect-[1/1.12] hover:scale-105 hover:brightness-110 hover:saturate-110 hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] transition-all duration-300 cursor-pointer">
                  <img 
                    src={galleryImages[2]?.src || FALLBACK_GALLERY_IMAGE} 
                    alt={galleryImages[2]?.alt || 'Tour image'} 
                    className="w-full h-full object-cover block"
                    loading="eager"
                    onLoad={() => handleImageLoad(2)}
                    onError={() => handleImageError(2)}
                  />
                </figure>

                {/* Phải dưới — Ô CAO chiếm 2 hàng */}
                <figure className="relative overflow-hidden rounded-[18px] shadow-[0_12px_30px_rgba(2,6,23,.12)] bg-[#eef2f7] aspect-[3/4] -mt-[50px] sm:-mt-[35px] translate-y-[-50px] sm:translate-y-[-105px] hover:scale-105 hover:brightness-110 hover:saturate-110 hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] transition-all duration-300 cursor-pointer">
                  <img 
                    src={galleryImages[3]?.src || FALLBACK_GALLERY_IMAGE} 
                    alt={galleryImages[3]?.alt || 'Tour image'} 
                    className="w-full h-full object-cover block"
                    loading="eager"
                    onLoad={() => handleImageLoad(3)}
                    onError={() => handleImageError(3)}
                  />
                </figure>
              </div>
            </div>
          </div>
          </div>

          {/* Services Section */}
          <section className="py-12 sm:py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          {/* Header */}
          <div className="mb-8 sm:mb-12 max-w-5xl mx-auto">
            <h2 className="text-lg sm:text-xl font-semibold text-red-500 uppercase tracking-[0.2em] mb-2 sm:mb-3">
              {t('home.services.sectionTitle')}
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {t('home.services.headline')}
            </h3>
          </div>

          {/* Services Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Card 1 - All You Needs */}
            <div className="service-card bg-white rounded-2xl shadow-lg p-6 sm:p-10 text-center hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer h-auto sm:h-96">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">{t('home.services.card1.title')}</h4>
              <p className="text-gray-600 leading-relaxed">
                {t('home.services.card1.desc')}
              </p>
            </div>

            {/* Card 2 - Flexible Booking */}
            <div className="service-card bg-white rounded-2xl shadow-lg p-6 sm:p-10 text-center hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer h-auto sm:h-96">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">{t('home.services.card2.title')}</h4>
              <p className="text-gray-600 leading-relaxed">
                {t('home.services.card2.desc')}
              </p>
            </div>

            {/* Card 3 - AI Integration */}
            <div className="service-card bg-white rounded-2xl shadow-lg p-6 sm:p-10 text-center hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer h-auto sm:h-96">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-4">{t('home.services.card3.title')}</h4>
              <p className="text-gray-600 leading-relaxed">
                {t('home.services.card3.desc')}
              </p>
            </div>
          </div>
        </div>
        </section>

        {/* TOP DESTINATION Section */}
        <section className="py-16 relative">
          <div className="max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
              <div>
                <h2 className="text-xl font-semibold text-red-500 uppercase tracking-[0.2em] mb-2">
                  {t('home.destinations.sectionTitle')}
                </h2>
                <h3 className="text-4xl font-bold text-gray-900">
                  {t('home.destinations.headline')}
                </h3>
              </div>
              
              {/* Navigation Arrows */}
              <div className="flex gap-3">
                <button 
                  onClick={handlePrevDest} 
                  disabled={totalDisplayTours <= 3} 
                  className="nav-arrow-btn w-12 h-12 bg-white border-2 border-gray-400 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl hover:scale-110 hover:border-blue-500 hover:text-blue-500 transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100 z-10 relative"
                  style={{ zIndex: 10 }}
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  onClick={handleNextDest} 
                  disabled={totalDisplayTours <= 3} 
                  className="nav-arrow-btn w-12 h-12 bg-blue-600 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl hover:scale-110 hover:bg-blue-700 transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100 z-10 relative"
                  style={{ zIndex: 10 }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Destination Carousel with React Slick */}
            <div className="destinations-slider-wrapper mb-8 max-w-5xl mx-auto relative" style={{ zIndex: 1, overflow: 'visible' }}>
              {toursLoading ? (
                <div className="text-center py-12 text-gray-500">{t('home.destinations.loading', 'Đang tải danh sách tour...')}</div>
              ) : totalDisplayTours > 0 ? (
                <Slider ref={sliderRef} {...sliderSettings} className="destinations-slider">
                  {displayTours.map((item) => {
                    const ratingValue = item?.id && pageRatings[item.id] != null
                      ? Number(pageRatings[item.id]).toFixed(1)
                      : item?.rating != null
                        ? Number(item.rating).toFixed(1)
                        : '0.0';

                    return (
                      <div key={item.id} className="px-4">
                        <div
                          className="destination-card bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer h-[28rem] relative"
                          style={{ zIndex: 2, willChange: 'transform' }}
                          onClick={() => {
                            const isDefaultCard = Boolean(item?.isDefault) || String(item?.id || '').startsWith('default-tour-');
                            if (!isDefaultCard && item?.id) {
                              navigate(`/tour/detail?id=${item.id}`);
                            } else {
                              navigate('/tour');
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.zIndex = '10';
                            e.currentTarget.style.position = 'relative';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.zIndex = '2';
                          }}
                        >
                          <div className="relative h-64">
                            <img
                              src={item?.image || '/default-Tour.jpg'}
                              alt={item?.title || 'Tour'}
                              className="w-full h-full object-cover"
                              loading="eager"
                              onError={(e) => {
                                e.target.src = '/default-Tour.jpg';
                              }}
                            />
                            <div className="absolute top-4 left-4">
                              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                {item?.tourDeparturePoint || item?.category || 'Tour'}
                              </span>
                            </div>
                          </div>
                          <div className="p-6">
                            <h4 className="text-xl font-bold text-gray-900 mb-2">{item?.title || ''}</h4>
                            <div className="flex items-center justify-between">
                              <span className="text-blue-600 font-semibold text-lg">{vnd.current.format(Number(item?.price || 0))}</span>
                              <div className="flex items-center gap-1">
                                <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                                <span className="text-gray-700 font-medium text-xl">{ratingValue}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Slider>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {t('home.destinations.empty', 'Hiện chưa có tour khả dụng, vui lòng quay lại sau.')}
                </div>
              )}
            </div>

            {/* See All Button */}
            <div className="text-center">
              <button 
                className="bg-[#1a8eea] hover:bg-[#0f7bd4] text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 inline-flex items-center gap-2"
                onClick={() => navigate('/tour')}
              >
                See All
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* KEY FEATURES Section */}
        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="mb-12 max-w-5xl mx-auto">
              <h2 className="text-xl font-semibold text-red-500 uppercase tracking-[0.2em] mb-2">
                {t('home.features.sectionTitle')}
              </h2>
              <h3 className="text-4xl font-bold text-gray-900">
                {t('home.features.headline')}
              </h3>
              <p className="text-lg text-gray-600 mt-4 max-w-md">
                {t('home.features.desc')}
              </p>
            </div>

            {/* 2 columns - responsive layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* LEFT: feature cards — responsive width and margin */}
              <div className="lg:col-span-5 lg:col-start-2">
                {/* Responsive width and margin */}
                <div className="space-y-6 w-full max-w-[450px] mx-auto lg:mx-0">
                  {/* Card 1 */}
                  <div className="feature-card bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 transition-all duration-500 ease-out cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:scale-110">
                        <svg className="w-6 h-6 text-white transition-all duration-500 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-1 transition-colors duration-300 hover:text-blue-600">{t('home.features.card1.title')}</h4>
                        <p className="text-gray-600 transition-colors duration-300 hover:text-gray-800">{t('home.features.card1.desc')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="feature-card bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 transition-all duration-500 ease-out cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:scale-110">
                        <svg className="w-6 h-6 text-white transition-all duration-500 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-1 transition-colors duration-300 hover:text-orange-600">{t('home.features.card2.title')}</h4>
                        <p className="text-gray-600 transition-colors duration-300 hover:text-gray-800">{t('home.features.card2.desc')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="feature-card bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 transition-all duration-500 ease-out cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:scale-110">
                        <svg className="w-6 h-6 text-white transition-all duration-500 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-1 transition-colors duration-300 hover:text-red-600">{t('home.features.card3.title')}</h4>
                        <p className="text-gray-600 transition-colors duration-300 hover:text-gray-800">{t('home.features.card3.desc')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: 2 ảnh cùng size với animation hover - responsive */}
              <div className="lg:col-span-6 lg:col-start-7 relative lg:pr-6">
                {/* Responsive container for images */}
                <div className="relative w-full max-w-[540px] h-[300px] sm:h-[400px] lg:h-[440px] mx-auto lg:ml-auto lg:translate-x-[64px] lg:-translate-y-[120px] group cursor-pointer">
                  <img
                    src="/TourDaNangBackground.jpg"
                    alt="Colosseum Rome"
                    className="
                      absolute top-[-30px] sm:top-[-40px] left-[5px] sm:left-[10px]
                      w-[140px] h-[180px] sm:w-[200px] sm:h-[260px] lg:w-[260px] lg:h-[340px] object-cover
                      rounded-[22px] shadow-[0_18px_45px_rgba(2,6,23,.15)]
                      transition-all duration-500 ease-out
                      group-hover:scale-105 group-hover:rotate-1
                      group-hover:shadow-[0_25px_60px_rgba(2,6,23,.25)]
                    "
                    loading="eager"
                  />

                  <img
                    src="/TourDaNangBackground.jpg"
                    alt="Dubai City"
                    className="
                      absolute top-[80px] sm:top-[160px] left-[70px] sm:left-[120px]
                      w-[140px] h-[180px] sm:w-[200px] sm:h-[260px] lg:w-[260px] lg:h-[340px] object-cover
                      rounded-[22px] border-[5px] sm:border-[10px] border-white
                      shadow-[0_22px_55px_rgba(2,6,23,.18)] z-10
                      transition-all duration-500 ease-out
                      group-hover:scale-110 group-hover:-rotate-1
                      group-hover:shadow-[0_30px_70px_rgba(2,6,23,.3)]
                      group-hover:border-white/90
                    "
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS Section */}
        <section className="relative py-24 lg:py-28">
          <div className="max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="mb-12 max-w-5xl mx-auto text-center">
              <h2 className="text-xl font-semibold text-red-500 uppercase tracking-[0.2em] mb-3">
                {t('home.testimonials.sectionTitle')}
              </h2>
              <h3 className="text-4xl font-bold text-gray-900">
                {t('home.testimonials.headline')}
              </h3>
            </div>

            {/* === Wrapper 1024px, arrows overlay chạm mép card === */}
            <div className="relative mx-auto max-w-[900px]">
              {/* Card full width */}
              <div
                className="
                  testimonial-card w-full bg-white rounded-2xl shadow-lg
                  p-10 sm:p-12
                  min-h-[460px] md:min-h-[500px]
                  flex flex-col items-center justify-center
                  text-center
                "
              >
                {/* Avatar */}
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">😉</span>
                </div>

                {/* Name & role */}
                <h4 className="text-xl font-bold text-gray-900 mb-1">{t('home.testimonials.name')}</h4>
                <p className="text-gray-600 mb-4">{t('home.testimonials.role')}</p>

                {/* Rating */}
                <div className="flex items-center justify-center gap-1 mb-6">
                  {[...Array(4)].map((_,i)=>(
                    <svg key={i} className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                  <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>

                {/* Review */}
                <p className="text-gray-600 text-lg leading-relaxed max-w-[720px] mx-auto">
                  "{t('home.testimonials.review')}"
                </p>
              </div>

              {/* Left Arrow — to hơn, chạm mép card */}
              <button
                className="nav-arrow-btn absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2
                           w-14 h-14 sm:w-16 sm:h-16 bg-white border-2 border-gray-300 rounded-full
                           shadow-lg flex items-center justify-center
                           hover:shadow-xl hover:scale-110 hover:border-blue-500 hover:text-blue-500
                           transition-all duration-300"
                aria-label="Previous"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Right Arrow — to hơn, chạm mép card */}
              <button
                className="nav-arrow-btn absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2
                           w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full shadow-lg
                           flex items-center justify-center
                           hover:shadow-xl hover:scale-110 hover:bg-blue-700
                           transition-all duration-300"
                aria-label="Next"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Pagination Dots */}
            <div className="flex items-center justify-center gap-2 mt-16">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </section>

        {/* NEWSLETTER SUBSCRIPTION Section */}
        <section className="relative">
          {/* Kéo nguyên panel xám lên gần 3 chấm */}
            <div className="mx-auto max-w-[1000px] px-6 -mt-2 md:-mt-3 lg:-mt-4 xl:-mt-5">
            <div
              className="
                rounded-3xl bg-white/80 backdrop-blur ring-1 ring-black/5
                shadow-[0_20px_60px_rgba(2,6,23,.08)]
                px-8 sm:px-12 lg:px-16
                pt-24 md:pt-28 lg:pt-32
                /*tăng độ dài của panel*/
                pb-44 lg:pb-52
                text-center
              "
            >
              <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold text-red-500 uppercase tracking-[0.2em] mb-3">
                  {t('home.newsletter.sectionTitle')}
                </h2>
                <h3 className="text-4xl font-bold text-gray-900 leading-tight mb-10 text-center">
                  {t('home.newsletter.headline')}
                </h3>

                <form className="mx-auto max-w-2xl mt-16 md:mt-20 lg:mt-28">
                  <div className="relative">
                    <label className="relative block">
                      <span className="sr-only">Email</span>
                      <span className="pointer-events-none absolute inset-y-0 left-0 pl-4 flex items-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                      </span>
                      <input
                        type="email"
                        required
                        placeholder={t('home.newsletter.emailPlaceholder')}
                        className="w-full h-20 pl-12 pr-32 rounded-xl bg-white border border-gray-200
                                   text-gray-900 placeholder-gray-500 focus:outline-none
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        className="absolute top-1/2 right-4 -translate-y-1/2 h-16 px-6 rounded-[20px] font-semibold bg-blue-600 text-white
                                   border-4 border-white hover:bg-blue-700 hover:shadow-lg hover:scale-[1.02] transition-all whitespace-nowrap"
                      >
                        {t('home.newsletter.btnSubscribe')}
                      </button>
                    </label>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Spacing for future sections */}
        <div className="py-20"></div>
        </div>
      </div>
      
      {/* Footer is rendered globally in App.jsx */}
    </div>
    </div>
  );
};

export default Homepage;
