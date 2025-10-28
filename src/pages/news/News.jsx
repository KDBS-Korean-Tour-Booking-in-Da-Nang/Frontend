import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import articleService from '../../services/articleService';
import { getArticleSummary, extractFirstImageUrl } from '../../utils/htmlConverter';

const News = () => {
  const { t } = useTranslation();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50" style={{ marginTop: '30px' }}>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary-light text-white py-16 shadow-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              {t('news.hero.title')}
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              {t('news.hero.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Articles List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-gray-600">{t('news.loading')}</span>
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-6">
                {articles.map((article, index) => {
                  // Backend uses different field names
                  const thumbnail = article.articleThumbnail || extractFirstImageUrl(article.articleContent || '');
                  const summary = article.articleDescription || getArticleSummary(article.articleContent || '', 150);
                  
                  return (
                    <div key={article.articleId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="flex">
                        {/* Article Image */}
                        <div className="flex-shrink-0 w-48 h-32">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={article.articleTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-sm">{t('news.noImage')}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Article Content */}
                        <div className="flex-1 p-6">
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              {new Date(article.articleCreatedDate).toLocaleDateString('vi-VN')}
                            </div>
                            <span className="bg-secondary text-primary px-2 py-1 rounded-full text-xs">
                              {t('news.category')}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                            {article.articleTitle}
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                            {summary}
                          </p>
                          
                          <div className="flex justify-end">
                            <Link
                              to={`/news/${article.articleId}`}
                              className="text-primary hover:text-primary-hover font-medium text-sm flex items-center"
                            >
                              {t('news.readMore')} 
                              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                      
                      {/* Separator */}
                      {index < articles.length - 1 && (
                        <div className="border-t border-gray-100"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('news.noArticles')}</h3>
                <p className="text-gray-500">{t('news.noArticlesDesc')}</p>
              </div>
            )}
            
            {/* Load More Button */}
            {articles.length > 0 && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto shadow-primary hover:shadow-primary-hover"
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
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('news.sidebar.title')}</h3>
              
              <div className="space-y-4">
                {/* Tour Categories */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">{t('news.sidebar.domestic.title')}</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.domestic.north')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.domestic.central')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.domestic.south')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.domestic.teambuilding')}</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">{t('news.sidebar.international.title')}</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.international.japan')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.international.singapore')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.international.thailand')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.international.taiwan')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.international.korea')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.international.china')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.international.laos')}</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">{t('news.sidebar.dayTours.title')}</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.dayTours.hue')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.dayTours.baNa')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.dayTours.hoiAn')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.dayTours.mySon')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.dayTours.sonTra')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.dayTours.daNangCompany')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.dayTours.chamIsland')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.dayTours.daNangExplore')}</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">{t('news.sidebar.daNangTours.title')}</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.daNangTours.1day')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.daNangTours.2days')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.daNangTours.3days')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.daNangTours.4days')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.daNangTours.5days')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.daNangTours.6days')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.daNangTours.7days')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.daNangTours.8days')}</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">{t('news.sidebar.events.title')}</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.events.tet')}</a></li>
                    <li><a href="#" className="hover:text-primary">{t('news.sidebar.events.festival')}</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default News;
