import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './Homepage.module.css';

const Homepage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');
  const timerRef = useRef(null);

  // Close success message
  const closeSuccessMessage = useCallback(() => {
    setSuccessMessage('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Check for success message from navigation state or localStorage
  useEffect(() => {
    const oauthMessage = localStorage.getItem('oauth_success_message');
    if (oauthMessage) {
      setSuccessMessage(oauthMessage);
      localStorage.removeItem('oauth_success_message');
    }

    if (location.state?.message && location.state?.type === 'success') {
      setSuccessMessage(location.state.message);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

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

  // GSAP animations
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    // slide in from left for lead line
    tl.fromTo(`.${styles['hero-lead']}`, { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9 })
      // then emphasized line from further left
      .fromTo(`.${styles['hero-emph']}`, { x: -100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9 }, '-=0.5')
      // description fades up slightly after
      .fromTo(`.${styles['hero-desc']}`, { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8 }, '-=0.5');

    gsap.utils.toArray(`.${styles.tourCard}`).forEach((el, idx) => {
      gsap.fromTo(
        el,
        { y: 40, opacity: 0, rotateX: -8 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.8,
          ease: 'power2.out',
          delay: idx * 0.08,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
          },
        }
      );
    });
  }, []);

  const tours = [
    { src: '/tour1.jpg', title: 'Đà Nẵng City' },
    { src: '/tour2.jpg', title: 'Hội An Ancient' },
    { src: '/tour3.jpg', title: 'Bà Nà Hills' },
  ];

  const tourCards = tours.map((tItem, i) => (
    <div key={i} className={styles.tourCard}>
      <img src={tItem.src} alt={tItem.title} className={styles.tourImg} />
      <div className={styles.tourInfo}>
        <h3 className={styles.tourTitle}>{tItem.title}</h3>
      </div>
    </div>
  ));

  return (
    <div className={styles['homepage-root']}>
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

      {/* ✅ Hero Section */}
      <div className={styles['hero']}>
        <img src="/TourDaNangBackground.jpg" alt="Da Nang" className={styles['hero-bg']} />
        <div className={styles['hero-overlay']} />
        <div className={styles['hero-inner']}>
          <div className={styles['hero-content']}>
            <h1 className={styles['hero-title']}>
              <span className={styles['hero-lead']}>{t('home.hero.titleLead')}</span>
              <span className={styles['hero-emph']}>{t('home.hero.titleEmph')}</span>
            </h1>
            <p className={styles['hero-desc']}>{t('home.hero.desc')}</p>
             {/* Buttons removed per request */}
          </div>
        </div>
      </div>

      {/* ✅ Tours showcase */}
      <section className={styles['tours']}>
        <div className={styles.toursGrid}>{tourCards}</div>
      </section>

      {/* ✅ Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-primary font-semibold tracking-wide uppercase">
              {t('home.features.sectionTitle')}
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              {t('home.features.headline')}
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">{t('home.features.blurb')}</p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              {/* Feature 1 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 
                    002-2v-6a2 2 0 
                    00-2-2H6a2 2 0 
                    00-2 2v6a2 2 0 
                    002 2zm10-10V7a4 4 0 
                    00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                  {t('home.features.securityTitle')}
                </p>
                <p className="mt-2 ml-16 text-base text-gray-500">{t('home.features.securityDesc')}</p>
              </div>

              {/* Feature 2 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                  {t('home.features.speedTitle')}
                </p>
                <p className="mt-2 ml-16 text-base text-gray-500">{t('home.features.speedDesc')}</p>
              </div>

              {/* Feature 3 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 
                    11.955 0 0112 2.944a11.955 11.955 0 
                    01-8.618 3.04A12.02 12.02 0 003 
                    9c0 5.591 3.824 10.29 9 
                    11.622 5.176-1.332 9-6.03 
                    9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                  {t('home.features.reliableTitle')}
                </p>
                <p className="mt-2 ml-16 text-base text-gray-500">{t('home.features.reliableDesc')}</p>
              </div>

              {/* Feature 4 */}
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 
                    000 6.364L12 20.364l7.682-7.682a4.5 
                    4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 
                    4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                  {t('home.features.friendlyTitle')}
                </p>
                <p className="mt-2 ml-16 text-base text-gray-500">{t('home.features.friendlyDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ CTA Section */}
      <div className="bg-primary">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">{t('home.cta.title1')}</span>
            <span className="block">{t('home.cta.title2')}</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-white">{t('home.cta.desc')}</p>
          <Link
            to="/register"
            className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-white hover:bg-secondary sm:w-auto"
          >
            {t('home.cta.btn')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
