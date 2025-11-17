import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import { ArrowPathIcon, CalendarIcon } from '@heroicons/react/24/outline';
import articleService from '../../services/articleService';
import { getArticleSummary, extractFirstImageUrl } from '../../utils/htmlConverter';
import styles from './news.module.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const News = () => {
  const { t } = useTranslation();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // Prevent background scroll when mobile categories panel is open
  useEffect(() => {
    if (!showCategories) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [showCategories]);

  useEffect(() => {
    loadApprovedArticles();
  }, []);

  const loadApprovedArticles = async () => {
    setLoading(true);
    try {
      const data = await articleService.getArticlesByStatus('APPROVED');
      setArticles(data || []);
    } catch (error) {
      console.error('Error loading approved articles:', error);
      // Fallback to mock data if API fails
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      // In a real implementation, you would load more articles with pagination
      // For now, we'll just reload the current articles
      await loadApprovedArticles();
    } catch (error) {
      console.error('Error loading more articles:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const heroSlides = [
    {
      title: t('news.hero.title'),
      subtitle: t('news.hero.subtitle'),
      eyebrow: t('news.hero.eyebrow', { defaultValue: 'Travel Journal' }),
      image: '/tour1.jpg'
    },
    {
      title: t('news.hero.slide2Title', { defaultValue: 'Exciting Travel Information' }),
      subtitle: t('news.hero.slide2Subtitle', { defaultValue: 'Discover attractive destinations and curated itineraries designed for soft, effortless journeys.' }),
      eyebrow: t('news.hero.slide2Eyebrow', { defaultValue: 'Destination Highlights' }),
      image: '/tour2.jpg'
    },
    {
      title: t('news.hero.slide3Title', { defaultValue: 'Unique Experiences' }),
      subtitle: t('news.hero.slide3Subtitle', { defaultValue: 'Providing useful tips about activities, events, and cultural moments worth cherishing.' }),
      eyebrow: t('news.hero.slide3Eyebrow', { defaultValue: 'Inspired Moments' }),
      image: '/tour3.jpg'
    }
  ];

  const carouselSettings = {
    dots: true,
    arrows: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: false,
    fade: true,
    cssEase: 'linear'
  };

  return (
    <div className={styles.pageRoot} style={{ marginTop: '5px', paddingTop: '0' }}>
      <div className={styles.pageBackground} aria-hidden="true" />
      <div className={`${styles.pageContainer} mx-auto w-full px-6 lg:px-12`}>
        <div className={`${styles.contentWrap} w-full max-w-none`}>
          {/* Header */}
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen -mt-12">
            <div className={`${styles.heroCanvas} w-full text-center mb-10 md:mb-14`}>
              <div className={styles.heroSliderWrapper}>
                <Slider {...carouselSettings} className={styles.heroSlider}>
                  {heroSlides.map((slide, index) => (
                    <div key={index} className={styles.heroSlide}>
                      <img src={slide.image} alt={slide.title} className={styles.heroSlideImage} />
                      <div className={styles.heroSlideOverlay}>
                        <div className={styles.heroSlideContent}>
                          <p className={styles.heroEyebrow}>{slide.eyebrow}</p>
                          <h1 className={styles.heroHeading}>{slide.title}</h1>
                          <p className={styles.heroDescription}>
                            {slide.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </Slider>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Categories Toggle */}
          <div className="w-full lg:hidden -mt-4 mb-6 px-2 sm:px-4 flex justify-end">
            <button
              onClick={() => setShowCategories(true)}
              className={`${styles.softButton} ${styles.ghostButton} gap-2 text-sm`}
              aria-haspopup="dialog"
              aria-expanded={showCategories ? 'true' : 'false'}
            >
              {t('news.sidebar.title')}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>

          {/* Main */}
          <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 md:gap-8 lg:gap-10 items-start">
          {/* Articles List */}
          <div className="lg:col-span-1 md:pl-6 lg:pl-8 xl:pl-12">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-primary"></div>
                <span className="ml-3 text-gray-600">{t('news.loading')}</span>
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-6">
                {articles.map((article, index) => {
                  // Backend uses different field names
                  const thumbnail = article.articleThumbnail || extractFirstImageUrl(article.articleContent || '');
                  const summary = article.articleDescription || getArticleSummary(article.articleContent || '', 150);
                  
                  return (
                    <div key={article.articleId} className={`${styles.card} ${styles.articleCard} group cursor-pointer`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                        {/* Article Image */}
                        <div className={`${styles.articleImageContainer} flex-shrink-0 w-full sm:w-[38%] md:w-[34%] lg:w-[32%] xl:w-[30%]`}>
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={article.articleTitle}
                              className={`${styles.articleImage} w-full h-full sm:h-full object-cover`}
                            />
                          ) : (
                            <div className={`${styles.articleImagePlaceholder} w-full h-full bg-slate-50 flex items-center justify-center`}>
                              <span className="text-gray-400 text-xs sm:text-sm">{t('news.noImage')}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Article Content */}
                        <div className="flex-1 p-4 sm:p-3.5 md:p-5 lg:p-6 flex flex-col justify-between min-w-0">
                          <div className="min-w-0">
                            <div className={styles.articleMeta}>
                              <div className={`${styles.articleMetaPill} flex items-center`}>
                                <CalendarIcon className="h-3.5 w-3.5 mr-2 text-gray-500 flex-shrink-0" />
                                <span className="text-gray-700 font-medium text-xs sm:text-sm whitespace-nowrap">
                                  {new Date(article.articleCreatedDate).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <span className={`${styles.chip} px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap`}>
                                {t('news.category')}
                              </span>
                            </div>
                            
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3 line-clamp-2 leading-tight break-words">
                              {article.articleTitle}
                            </h3>
                            
                            <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3 leading-relaxed break-words">
                              {summary}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center mt-auto pt-2 sm:pt-0 text-sm text-gray-400">
                            <span className="hidden sm:block text-xs uppercase tracking-[0.25em]">
                              {t('news.readMore')}
                            </span>
                            <Link
                              to={`/news/detail?id=${article.articleId}`}
                              className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-semibold text-sm md:text-base transition-colors"
                            >
                              {t('news.readMore')}
                              <svg className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 transform group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                      
                      {/* Separator */}
                      {index < articles.length - 1 && (
                        <div className={`${styles.subtleDivider}`}></div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`${styles.card} shadow-sm rounded-xl text-center py-12 px-6`}>
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('news.noArticles')}</h3>
                <p className="text-gray-500">{t('news.noArticlesDesc')}</p>
              </div>
            )}
            
            {/* Load More Button */}
            {articles.length > 0 && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className={`${styles.softButton} flex items-center mx-auto`}
                >
                  {loadingMore ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      {t('news.loadingMore')}
                    </>
                  ) : (
                    t('news.loadMore')
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
            <div className="hidden lg:block lg:col-span-1 lg:pl-0 justify-self-end">
            <div className={`${styles.card} p-8 lg:sticky lg:top-24 w-[320px] space-y-6`}>
              <h3 className="text-lg font-semibold text-gray-900">{t('news.sidebar.title')}</h3>
              
              <div className="space-y-5">
                {/* Tour Categories */}
                <div className={styles.sidebarBlock}>
                  <h4 className={styles.sidebarHeading}>{t('news.sidebar.domestic.title')}</h4>
                  <ul className={styles.sidebarList}>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.domestic.north')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.domestic.central')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.domestic.south')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.domestic.teambuilding')}</a></li>
                  </ul>
                </div>

                <div className={styles.sidebarBlock}>
                  <h4 className={styles.sidebarHeading}>{t('news.sidebar.international.title')}</h4>
                  <ul className={styles.sidebarList}>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.japan')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.singapore')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.thailand')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.taiwan')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.korea')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.china')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.laos')}</a></li>
                  </ul>
                </div>

                <div className={styles.sidebarBlock}>
                  <h4 className={styles.sidebarHeading}>{t('news.sidebar.dayTours.title')}</h4>
                  <ul className={styles.sidebarList}>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.hue')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.baNa')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.hoiAn')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.mySon')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.sonTra')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.daNangCompany')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.chamIsland')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.daNangExplore')}</a></li>
                  </ul>
                </div>

                <div className={styles.sidebarBlock}>
                  <h4 className={styles.sidebarHeading}>{t('news.sidebar.daNangTours.title')}</h4>
                  <ul className={styles.sidebarList}>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.1day')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.2days')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.3days')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.4days')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.5days')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.6days')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.7days')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.8days')}</a></li>
                  </ul>
                </div>

                <div className={styles.sidebarBlock}>
                  <h4 className={styles.sidebarHeading}>{t('news.sidebar.events.title')}</h4>
                  <ul className={styles.sidebarList}>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.events.tet')}</a></li>
                    <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.events.festival')}</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Mobile/Tablet Categories Panel */}
          {showCategories && createPortal(
            <div className="lg:hidden fixed inset-0 z-[10000]" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowCategories(false)}></div>
              <div className="absolute left-0 right-0 top-20 mx-4 sm:mx-6 rounded-2xl overflow-hidden shadow-xl">
                <div className={`${styles.mobileSheet} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900">{t('news.sidebar.title')}</h3>
                    <button onClick={() => setShowCategories(false)} className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div className="space-y-4">
                    {/* Tour Categories (reuse markup) */}
                    <div className={styles.sidebarBlock}>
                      <h4 className={styles.sidebarHeading}>{t('news.sidebar.domestic.title')}</h4>
                      <ul className={styles.sidebarList}>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.domestic.north')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.domestic.central')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.domestic.south')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.domestic.teambuilding')}</a></li>
                      </ul>
                    </div>
                    <div className={styles.sidebarBlock}>
                      <h4 className={styles.sidebarHeading}>{t('news.sidebar.international.title')}</h4>
                      <ul className={styles.sidebarList}>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.japan')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.singapore')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.thailand')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.taiwan')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.korea')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.china')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.international.laos')}</a></li>
                      </ul>
                    </div>
                    <div className={styles.sidebarBlock}>
                      <h4 className={styles.sidebarHeading}>{t('news.sidebar.dayTours.title')}</h4>
                      <ul className={styles.sidebarList}>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.hue')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.baNa')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.hoiAn')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.mySon')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.sonTra')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.daNangCompany')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.chamIsland')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.dayTours.daNangExplore')}</a></li>
                      </ul>
                    </div>
                    <div className={styles.sidebarBlock}>
                      <h4 className={styles.sidebarHeading}>{t('news.sidebar.daNangTours.title')}</h4>
                      <ul className={styles.sidebarList}>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.1day')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.2days')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.3days')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.4days')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.5days')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.6days')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.7days')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.daNangTours.8days')}</a></li>
                      </ul>
                    </div>
                    <div className={styles.sidebarBlock}>
                      <h4 className={styles.sidebarHeading}>{t('news.sidebar.events.title')}</h4>
                      <ul className={styles.sidebarList}>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.events.tet')}</a></li>
                        <li><a href="#" className={styles.sidebarLink}>{t('news.sidebar.events.festival')}</a></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        </div>
      </div>
    </div>
    </div>
  );
};

export default News;
