import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon, DocumentTextIcon, ExclamationTriangleIcon, CheckIcon, XMarkIcon, EyeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../../contexts/ToastContext';
import articleService from '../../../services/articleService';
import { extractTextFromHtml, getArticleSummary, extractFirstImageUrl, htmlToJsx } from '../../../utils/htmlConverter';

const NewsManagement = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [lastArticleCount, setLastArticleCount] = useState(0);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const loadArticles = useCallback(async (showNewArticlesNotification = false) => {
    setLoadingArticles(true);
    try {
      const data = await articleService.getAllArticles();
      console.log('Articles data:', data); // Debug log
      const newArticles = data || [];
      // Sort: UNAPPROVED (pending) first, then newest by created date
      const sortedArticles = [...newArticles].sort((a, b) => {
        const aPending = a.articleStatus !== 'APPROVED';
        const bPending = b.articleStatus !== 'APPROVED';
        if (aPending !== bPending) return aPending ? -1 : 1;
        const aTime = new Date(a.articleCreatedDate).getTime() || 0;
        const bTime = new Date(b.articleCreatedDate).getTime() || 0;
        return bTime - aTime;
      });
      
      // Check for new articles from auto-crawling (only if count increased)
      if (showNewArticlesNotification && lastArticleCount > 0 && newArticles.length > lastArticleCount) {
        const newCount = newArticles.length - lastArticleCount;
        showSuccess(t('newsManagement.messages.autoCrawlSuccess', { count: newCount }));
      }
      
      setArticles(sortedArticles);
      setLastArticleCount(sortedArticles.length);
    } catch (error) {
      console.error('Error loading articles:', error);
      showError(t('newsManagement.messages.crawlError'));
    } finally {
      setLoadingArticles(false);
    }
  }, [showError, showSuccess, lastArticleCount]);

  // Load articles on component mount
  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
      loadArticles();
    }
  }, [user, loadArticles]);

  // Auto-refresh articles every 5 minutes to check for new auto-crawled articles
  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
      const interval = setInterval(() => {
        loadArticles(true); // Show notification for new articles
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [user]); // Removed loadArticles dependency to prevent infinite re-creation

  // Handle logout navigation
  useEffect(() => {
    if (isLoggingOut && !user) {
      // User has been cleared, safe to navigate
      navigate('/');
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, user, navigate]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
      if (showLanguageDropdown && !event.target.closest('.language-dropdown')) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown, showLanguageDropdown]);

  // Language change handler
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLanguageDropdown(false);
  };

  // Handle article detail modal
  const handleViewArticle = async (articleId) => {
    try {
      const article = await articleService.getArticleById(articleId);
      setSelectedArticle(article);
      setShowArticleModal(true);
    } catch (error) {
      console.error('Error fetching article:', error);
      showError(t('newsManagement.messages.crawlError'));
    }
  };

  // Avoid access-denied flicker on refresh: wait for auth to resolve
  if (authLoading) {
    return null;
  }

  // Show loading state while logging out or when user is null during logout process
  if (isLoggingOut || (!user && !isLoggingOut)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('newsManagement.logout.loggingOut')}</p>
        </div>
      </div>
    );
  }

  // Check if user has staff role only (backend uses uppercase)
  if (user && user.role !== 'STAFF') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('newsManagement.accessDenied.title')}</h2>
          <p className="text-gray-600 mb-4">
            Only staff members can access this page. Please login with a staff account.
          </p>
          {/* Debug info */}
          <div className="mb-4 p-3 bg-gray-100 rounded text-xs text-left">
            <p><strong>Debug Info:</strong></p>
            <p>User: {user ? JSON.stringify(user) : 'null'}</p>
            <p>Role: {user?.role || 'undefined'}</p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg transition-colors shadow-primary"
            >
              {t('newsManagement.accessDenied.goHome')}
            </button>
            <button
              onClick={() => navigate('/staff/login')}
              className="w-full bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg transition-colors shadow-primary"
            >
              Staff Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCrawlNews = async () => {
    setLoading(true);
    
    try {
      const result = await articleService.crawlArticles();
      
      // Check if any new articles were crawled
      if (result && result.length > 0) {
        showSuccess(t('newsManagement.messages.crawlSuccess', { count: result.length }));
      } else {
        showSuccess(t('newsManagement.messages.noNewArticles'));
      }
      
      // Reload articles after crawling (don't show auto-crawl notification)
      await loadArticles(false);
    } catch (error) {
      console.error('Error crawling articles:', error);
      showError(t('newsManagement.messages.crawlError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectArticle = (articleId) => {
    setSelectedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  // Calculate pagination
  const totalPages = Math.ceil(articles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentArticles = articles.slice(startIndex, endIndex);

  const handleSelectAll = () => {
    const currentPageArticleIds = currentArticles.map(article => article.articleId);
    if (selectedArticles.length === currentPageArticleIds.length && 
        currentPageArticleIds.every(id => selectedArticles.includes(id))) {
      setSelectedArticles([]);
    } else {
      const newSelected = [...selectedArticles];
      currentPageArticleIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      setSelectedArticles(newSelected);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (selectedArticles.length === 0) {
      showError(t('newsManagement.messages.selectArticles'));
      return;
    }

    setLoading(true);
    try {
      const promises = selectedArticles.map(articleId => 
        articleService.updateArticleStatus(articleId, status)
      );
      
      await Promise.all(promises);
      
      const statusText = status === 'APPROVED' ? t('newsManagement.messages.approved') : t('newsManagement.messages.unapproved');
      showSuccess(t('newsManagement.messages.statusUpdateSuccess', { action: statusText, count: selectedArticles.length }));
      setSelectedArticles([]);
      await loadArticles();
    } catch (error) {
      console.error('Error updating article status:', error);
      showError(t('newsManagement.messages.statusUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Custom styles for article content images */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .article-content img {
            display: block !important;
            margin: 1rem auto !important;
            max-width: 100% !important;
            height: auto !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .article-content p {
            text-align: justify;
          }
        `
      }} />
      {/* Main content area (no header/sidebar) */}
      <div className="max-w-7xl mx-auto py-6">
            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('newsManagement.title')}
              </h1>
              <p className="text-gray-600">
                {t('newsManagement.subtitle')}
              </p>
            </div>

            {/* Welcome Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">
                    {t('newsManagement.welcome.title', { name: user.name || user.email })}
                  </h2>
                  <p className="text-gray-600">
                    {t('newsManagement.welcome.description')}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    📅 {t('newsManagement.welcome.autoCrawl')}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === 'ADMIN' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'ADMIN' ? t('newsManagement.roles.admin') : t('newsManagement.roles.staff')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={handleCrawlNews}
                disabled={loading}
                className="bg-primary hover:bg-primary-hover text-white p-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-primary hover:shadow-primary-hover"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-3 animate-spin" />
                    {t('newsManagement.buttons.crawling')}
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-3" />
                    {t('newsManagement.buttons.crawlNews')}
                  </>
                )}
              </button>
              
              <button
                onClick={loadArticles}
                disabled={loadingArticles}
                className="bg-secondary text-primary p-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border border-primary hover:bg-primary hover:text-white"
              >
                {loadingArticles ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-3 animate-spin" />
                    {t('newsManagement.buttons.loading')}
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-3" />
                    {t('newsManagement.buttons.reloadList')}
                  </>
                )}
              </button>
            </div>

            {/* Inline message removed in favor of toast notifications */}

            {/* Articles Management */}
            {articles.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('newsManagement.articles.title', { count: articles.length })}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={currentArticles.every(article => selectedArticles.includes(article.articleId)) && currentArticles.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-600">{t('newsManagement.articles.selectAll')}</span>
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedArticles.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-800">
                        {t('newsManagement.articles.selectedCount', { count: selectedArticles.length })}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateStatus('APPROVED')}
                          disabled={loading}
                          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-primary"
                        >
                          <CheckIcon className="h-4 w-4 mr-1" />
                          {t('newsManagement.buttons.approve')}
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('UNAPPROVED')}
                          disabled={loading}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          {t('newsManagement.buttons.unapprove')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Articles List */}
                <div className="space-y-4">
                  {currentArticles.map((article, index) => {
                    // Backend uses different field names
                    const thumbnail = article.articleThumbnail || extractFirstImageUrl(article.articleContent || '');
                    const summary = article.articleDescription || getArticleSummary(article.articleContent || '', 100);
                    const isSelected = selectedArticles.includes(article.articleId);
                    
                    return (
                      <div
                        key={article.articleId || `article-${index}`}
                        className={`border rounded-lg p-4 transition-colors ${
                          isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => article.articleId && handleSelectArticle(article.articleId)}
                            disabled={!article.articleId}
                            className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
                          />
                          
                          {/* Thumbnail */}
                          {thumbnail && (
                            <div className="flex-shrink-0 w-20 h-20">
                              <img
                                src={thumbnail}
                                alt={article.articleTitle || 'Thumbnail'}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                          )}
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                                  {article.articleTitle}
                                </h4>
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                  {summary}
                                </p>
                                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                  <span className={`px-2 py-1 rounded-full ${
                                    article.articleStatus === 'APPROVED' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {article.articleStatus === 'APPROVED' ? t('newsManagement.status.approved') : t('newsManagement.status.pending')}
                                  </span>
                                  <span>{new Date(article.articleCreatedDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                              </div>
                              
                              {/* Individual Actions */}
                              <div className="flex items-center space-x-2 ml-4">
                                <button
                                  onClick={() => article.articleId && handleViewArticle(article.articleId)}
                                  disabled={!article.articleId}
                                  className="text-blue-600 hover:text-blue-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={t('newsManagement.buttons.viewDetails')}
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!article.articleId) return;
                                    const newStatus = article.articleStatus === 'APPROVED' ? 'UNAPPROVED' : 'APPROVED';
                                    setLoading(true);
                                    try {
                                      await articleService.updateArticleStatus(article.articleId, newStatus);
                                      const statusText = newStatus === 'APPROVED' ? t('newsManagement.messages.approved') : t('newsManagement.messages.unapproved');
                                      showSuccess(t('newsManagement.messages.statusUpdateSuccess', { action: statusText, count: 1 }));
                                      await loadArticles();
                                    } catch (error) {
                                      showError(t('newsManagement.messages.statusUpdateError'));
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  disabled={loading || !article.articleId}
                                  className={`p-1 ${
                                    article.articleStatus === 'APPROVED' 
                                      ? 'text-red-600 hover:text-red-700' 
                                      : 'text-green-600 hover:text-green-700'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  title={article.articleStatus === 'APPROVED' ? t('newsManagement.buttons.unapprove') : t('newsManagement.buttons.approve')}
                                >
                                  {article.articleStatus === 'APPROVED' ? (
                                    <XMarkIcon className="h-4 w-4" />
                                  ) : (
                                    <CheckIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      {t('newsManagement.pagination.showing', { start: startIndex + 1, end: Math.min(endIndex, articles.length), total: articles.length })}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('newsManagement.pagination.previous')}
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            currentPage === page
                              ? 'text-white bg-primary border border-primary'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('newsManagement.pagination.next')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No Articles Message */}
            {articles.length === 0 && !loadingArticles && (
              <div className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{t('newsManagement.noArticles.message')}</p>
              </div>
            )}

            {/* Instructions removed per request */}

            {/* Back to News Button */}
            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/news')}
                className="text-primary hover:text-primary-hover font-medium transition-colors"
              >
                ← {t('newsManagement.buttons.backToNews')}
              </button>
            </div>
      </div>

      {/* Article Detail Modal */}
      {showArticleModal && selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('newsManagement.modal.title')}</h3>
              <button
                onClick={() => setShowArticleModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Article Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                  {selectedArticle.articleTitle}
                </h2>
                
                <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(selectedArticle.articleCreatedDate).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedArticle.articleStatus === 'APPROVED' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedArticle.articleStatus === 'APPROVED' ? t('newsManagement.status.approved') : t('newsManagement.status.pending')}
                  </span>
                </div>
              </div>


              {/* Article Content */}
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                {selectedArticle.articleContent && (
                  <div 
                    dangerouslySetInnerHTML={{ __html: htmlToJsx(selectedArticle.articleContent) }}
                    className="article-content"
                  />
                )}
              </div>

              {/* Article Link */}
              {selectedArticle.articleLink && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">{t('newsManagement.modal.source')}</p>
                  <a
                    href={selectedArticle.articleLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm break-all"
                  >
                    {selectedArticle.articleLink}
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setShowArticleModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {t('newsManagement.modal.close')}
              </button>
              <button
                onClick={() => {
                  const newStatus = selectedArticle.articleStatus === 'APPROVED' ? 'UNAPPROVED' : 'APPROVED';
                  articleService.updateArticleStatus(selectedArticle.articleId, newStatus)
                    .then(() => {
                      const statusText = newStatus === 'APPROVED' ? t('newsManagement.messages.approved') : t('newsManagement.messages.unapproved');
                      showSuccess(t('newsManagement.messages.statusUpdateSuccess', { action: statusText, count: 1 }));
                      loadArticles();
                      setShowArticleModal(false);
                    })
                    .catch((error) => {
                      showError(t('newsManagement.messages.statusUpdateError'));
                    });
                }}
                className={`px-4 py-2 text-sm font-medium text-white transition-colors ${
                  selectedArticle.articleStatus === 'APPROVED' 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-primary hover:bg-primary-hover'
                }`}
              >
                {selectedArticle.articleStatus === 'APPROVED' ? t('newsManagement.buttons.unapprove') : t('newsManagement.buttons.approve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsManagement;
