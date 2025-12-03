import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, FileText, Check, X, Eye } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import articleService from '../../../services/articleService';
import { extractTextFromHtml, getArticleSummary, extractFirstImageUrl, htmlToJsx } from '../../../utils/htmlConverter';

const ArticleManagement = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [lastArticleCount, setLastArticleCount] = useState(0);
  const [error, setError] = useState('');

  const softUI = {
    pageBg: 'bg-gradient-to-b from-[#fefefe] via-[#f8f6ff] to-[#f3fbff]',
    container: 'max-w-6xl mx-auto space-y-8',
    card: 'rounded-[28px] bg-white/90 border border-[#ece8df] shadow-[0_25px_60px_rgba(205,198,187,0.35)] backdrop-blur-md',
    tag: 'px-4 py-1 rounded-full text-xs font-medium bg-[#f1ede7] text-[#7a7f8a]'
  };
  const primaryButtonClasses = 'rounded-[28px] px-6 py-3 font-semibold text-white bg-[#4c9dff] hover:bg-[#3f85d6] focus:ring-4 focus:ring-[#bfd7ff] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_12px_30px_rgba(76,157,255,0.35)]';
  const secondaryButtonClasses = 'rounded-[28px] px-6 py-3 font-semibold text-[#4c9dff] bg-white/80 border border-[#4c9dff]/40 hover:bg-[#e9f2ff] focus:ring-4 focus:ring-[#bfd7ff] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed';
  const iconButtonClasses = 'p-2 rounded-full border border-transparent hover:border-[#dcd6ca] hover:bg-white/70 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed';

  const loadArticles = useCallback(async (showNewArticlesNotification = false, isBackgroundPoll = false) => {
    setLoadingArticles(true);
    try {
      // Don't auto redirect on 401 when called from background polling
      const data = await articleService.getAllArticles(!isBackgroundPoll);
      const newArticles = data || [];
      const sortedArticles = [...newArticles].sort((a, b) => {
        const aPending = a.articleStatus !== 'APPROVED';
        const bPending = b.articleStatus !== 'APPROVED';
        if (aPending !== bPending) return aPending ? -1 : 1;
        const aTime = new Date(a.articleCreatedDate).getTime() || 0;
        const bTime = new Date(b.articleCreatedDate).getTime() || 0;
        return bTime - aTime;
      });
      
      if (showNewArticlesNotification && lastArticleCount > 0 && newArticles.length > lastArticleCount) {
        const newCount = newArticles.length - lastArticleCount;
        showSuccess(t('articleManagement.messages.autoCrawlSuccess', { count: newCount }));
      }
      
      setArticles(sortedArticles);
      setLastArticleCount(sortedArticles.length);
      setError(''); // Clear error on success
    } catch (error) {
      // Don't show error or logout if it's a 401 from background polling
      if (isBackgroundPoll && error?.status === 401) {
        // Silently fail - token might be expired, but don't logout from background polling
        console.warn('Background article refresh failed: token expired');
        return;
      }
      setError(t('articleManagement.messages.crawlError') || 'Không thể tải danh sách bài viết');
    } finally {
      setLoadingArticles(false);
    }
  }, [showSuccess, lastArticleCount, t]);

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
      loadArticles();
    }
  }, [user, loadArticles]);

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
      const interval = setInterval(() => {
        loadArticles(true, true); // Show notification for new articles, but mark as background poll
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, loadArticles]);

  if (authLoading) {
    return null;
  }

  const handleCrawlNews = async () => {
    setLoading(true);
    try {
      const result = await articleService.crawlArticles();
      if (result && result.length > 0) {
        showSuccess(t('articleManagement.messages.crawlSuccess', { count: result.length }));
      } else {
        showSuccess(t('articleManagement.messages.noNewArticles'));
      }
      await loadArticles(false);
    } catch (error) {
      setError(t('articleManagement.messages.crawlError') || 'Không thể crawl bài viết');
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
      setError(t('articleManagement.messages.selectArticles') || 'Vui lòng chọn ít nhất một bài viết');
      return;
    }
    
    setError(''); // Clear previous error

    setLoading(true);
    try {
      const promises = selectedArticles.map(articleId => 
        articleService.updateArticleStatus(articleId, status)
      );
      await Promise.all(promises);
      const statusText = status === 'APPROVED' ? t('articleManagement.messages.approved') : t('articleManagement.messages.unapproved');
      showSuccess(t('articleManagement.messages.statusUpdateSuccess', { action: statusText, count: selectedArticles.length }));
      setSelectedArticles([]);
      await loadArticles();
    } catch (error) {
      setError(t('articleManagement.messages.statusUpdateError') || 'Không thể cập nhật trạng thái bài viết');
    } finally {
      setLoading(false);
    }
  };

  const handleViewArticle = async (articleId) => {
    try {
      const article = await articleService.getArticleById(articleId);
      setSelectedArticle(article);
      setShowArticleModal(true);
      setError(''); // Clear error on success
    } catch (error) {
      setError(t('articleManagement.messages.crawlError') || 'Không thể tải bài viết');
    }
  };

  return (
    <div className={`min-h-screen ${softUI.pageBg} px-4 py-10`}>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{
        __html: `
          .article-content img {
            display: block !important;
            margin: 1.5rem auto !important;
            max-width: 100% !important;
            height: auto !important;
            border-radius: 24px !important;
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.08);
          }
          .article-content p {
            text-align: justify;
            line-height: 1.8;
            color: #4a4f5a;
          }
        `
      }} />
      <div className={softUI.container}>
        <div className="space-y-3 text-center md:text-left">
          <p className="uppercase text-[0.7rem] tracking-[0.5em] text-[#b7b3ab]">
            {t('articleManagement.subtitle')}
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-[#2f2f2f]">
            {t('articleManagement.title')}
          </h1>
          <p className="text-[#8c8f97] text-base md:text-lg max-w-2xl">
            {t('articleManagement.welcome.description')}
          </p>
        </div>

        <div className={`${softUI.card} p-8`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <span className={`${softUI.tag} inline-flex items-center gap-2`}>
                <span className="w-2 h-2 rounded-full bg-[#4c9dff]" />
                {t('articleManagement.welcome.title', { name: user?.name || user?.email || 'Admin' })}
              </span>
              <p className="text-[#71737b] text-sm md:text-base">
                {t('articleManagement.welcome.autoCrawl')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-5 py-2 rounded-full bg-[#edf0f5] text-sm font-medium text-[#4c5562]">
                {user?.role === 'ADMIN' ? t('articleManagement.roles.admin') : t('articleManagement.roles.staff')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleCrawlNews}
            disabled={loading}
            className={`${primaryButtonClasses} flex items-center justify-center gap-3`}
          >
            <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? t('articleManagement.buttons.crawling') : t('articleManagement.buttons.crawlNews')}
          </button>
          
          <button
            onClick={() => loadArticles(false)}
            disabled={loadingArticles}
            className={`${secondaryButtonClasses} flex items-center justify-center gap-3`}
          >
            <RefreshCcw className={`h-5 w-5 ${loadingArticles ? 'animate-spin' : ''}`} />
            {loadingArticles ? t('articleManagement.buttons.loading') : t('articleManagement.buttons.reloadList')}
          </button>
        </div>

        {articles.length > 0 && (
          <div className={`${softUI.card} p-8 space-y-6`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="text-sm uppercase tracking-[0.3em] text-[#b7b3ab]">
                {t('articleManagement.articles.title', { count: articles.length })}
              </p>
              <div className="flex items-center gap-2 text-sm text-[#6f7680]">
                <input
                  type="checkbox"
                  checked={currentArticles.every(article => selectedArticles.includes(article.articleId)) && currentArticles.length > 0}
                  onChange={handleSelectAll}
                  className="rounded-full border-[#d8d2c6] text-[#4c9dff] focus:ring-[#4c9dff]"
                />
                <span>{t('articleManagement.articles.selectAll')}</span>
              </div>
            </div>

            {selectedArticles.length > 0 && (
              <div className="p-4 rounded-[20px] bg-white/70 border border-[#dcd6ca] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#4b5563]">
                  {t('articleManagement.articles.selectedCount', { count: selectedArticles.length })}
                </span>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleUpdateStatus('APPROVED')}
                    disabled={loading}
                    className={`${primaryButtonClasses} flex items-center gap-2 px-4 py-2 text-sm`}
                  >
                    <Check className="h-4 w-4" />
                    {t('articleManagement.buttons.approve')}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('UNAPPROVED')}
                    disabled={loading}
                    className="rounded-[28px] px-4 py-2 text-sm font-semibold text-[#ff5f72] bg-white border border-[#ffc8cf] hover:bg-[#fff5f6] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4" />
                      {t('articleManagement.buttons.unapprove')}
                    </div>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {currentArticles.map((article, index) => {
                const thumbnail = article.articleThumbnail || extractFirstImageUrl(article.articleContent || '');
                const summary = article.articleDescription || getArticleSummary(article.articleContent || '', 100);
                const isSelected = selectedArticles.includes(article.articleId);
                
                return (
                  <div
                    key={article.articleId || `article-${index}`}
                    className={`p-5 rounded-[24px] border transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#eef6ff] border-[#c8e0ff] shadow-[0_12px_35px_rgba(115,152,197,0.25)]'
                        : 'bg-white/80 border-[#eee9df] hover:border-[#d7d0c4]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => article.articleId && handleSelectArticle(article.articleId)}
                        disabled={!article.articleId}
                        className="mt-2 rounded-full border-[#d8d2c6] text-[#4c9dff] focus:ring-[#4c9dff] disabled:opacity-30"
                      />
                      
                      {thumbnail && (
                        <div className="flex-shrink-0 w-28 h-28 rounded-[26px] overflow-hidden bg-[#f5f1ea]">
                          <img
                            src={thumbnail}
                            alt={article.articleTitle || 'Thumbnail'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div>
                            <h4 className="text-base font-medium text-[#222] line-clamp-2">
                              {article.articleTitle}
                            </h4>
                            <p className="mt-2 text-sm text-[#6b6f79] line-clamp-2">
                              {summary}
                            </p>
                            <div className="mt-3 flex items-center flex-wrap gap-3 text-xs">
                              <span className={`px-3 py-1 rounded-full ${
                                article.articleStatus === 'APPROVED' 
                                  ? 'bg-[#e7f6ec] text-[#1f7a4c]'
                                  : 'bg-[#fff4da] text-[#a9792f]'
                              }`}>
                                {article.articleStatus === 'APPROVED' ? t('articleManagement.status.approved') : t('articleManagement.status.pending')}
                              </span>
                              <span className="text-[#8a8e98]">
                                {new Date(article.articleCreatedDate).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 self-start">
                            <button
                              onClick={() => article.articleId && handleViewArticle(article.articleId)}
                              disabled={!article.articleId}
                              className={`${iconButtonClasses} text-[#3e4a62]`}
                              title={t('articleManagement.buttons.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!article.articleId) return;
                                const newStatus = article.articleStatus === 'APPROVED' ? 'UNAPPROVED' : 'APPROVED';
                                setLoading(true);
                                try {
                                  await articleService.updateArticleStatus(article.articleId, newStatus);
                                  const statusText = newStatus === 'APPROVED' ? t('articleManagement.messages.approved') : t('articleManagement.messages.unapproved');
                                  showSuccess(t('articleManagement.messages.statusUpdateSuccess', { action: statusText, count: 1 }));
                                  await loadArticles();
                                } catch (error) {
                                  setError(t('articleManagement.messages.statusUpdateError') || 'Không thể cập nhật trạng thái bài viết');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading || !article.articleId}
                              className={`${iconButtonClasses} ${
                                article.articleStatus === 'APPROVED' 
                                  ? 'text-[#ff5671]' 
                                  : 'text-[#3bb273]'
                              }`}
                              title={article.articleStatus === 'APPROVED' ? t('articleManagement.buttons.unapprove') : t('articleManagement.buttons.approve')}
                            >
                              {article.articleStatus === 'APPROVED' ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
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

            {totalPages > 1 && (
              <div className="pt-4 border-t border-[#ece7de] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="text-sm text-[#7a7f8a]">
                  {t('articleManagement.pagination.showing', { start: startIndex + 1, end: Math.min(endIndex, articles.length), total: articles.length })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-full border border-[#e0dacf] text-sm text-[#7a7f8a] bg-white/70 hover:bg-white disabled:opacity-40"
                  >
                    {t('articleManagement.pagination.previous')}
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        currentPage === page
                          ? 'bg-[#4c9dff] text-white shadow-[0_10px_25px_rgba(76,157,255,0.3)]'
                          : 'bg-white/70 text-[#6f7680] border border-transparent hover:border-[#dcd6ca]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-full border border-[#e0dacf] text-sm text-[#7a7f8a] bg-white/70 hover:bg-white disabled:opacity-40"
                  >
                    {t('articleManagement.pagination.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {articles.length === 0 && !loadingArticles && (
          <div className={`${softUI.card} p-10 text-center`}>
            <div className="w-16 h-16 mx-auto rounded-[22px] bg-[#f2f4f8] flex items-center justify-center text-[#9ba4b5] mb-4">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-[#7a7f8a] text-sm">{t('articleManagement.noArticles.message')}</p>
          </div>
        )}
      </div>

      {showArticleModal && selectedArticle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 rounded-[32px] border border-[#efeae1] shadow-[0_35px_80px_rgba(69,73,87,0.25)] max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#f0ece3]">
              <h3 className="text-xl font-semibold text-[#1f2933]">{t('articleManagement.modal.title')}</h3>
              <button
                onClick={() => setShowArticleModal(false)}
                className={`${iconButtonClasses} text-[#7a7f8a]`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              <div>
                <h2 className="text-3xl font-semibold text-[#21242c] mb-4 leading-tight">
                  {selectedArticle.articleTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-[#8a8e98]">
                  <span>
                    {new Date(selectedArticle.articleCreatedDate).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <span className={`px-4 py-1 rounded-full text-xs font-medium ${
                    selectedArticle.articleStatus === 'APPROVED' 
                      ? 'bg-[#e7f6ec] text-[#1f7a4c]'
                      : 'bg-[#fff4da] text-[#a9792f]'
                  }`}>
                    {selectedArticle.articleStatus === 'APPROVED' ? t('articleManagement.status.approved') : t('articleManagement.status.pending')}
                  </span>
                </div>
              </div>

              <div className="prose prose-lg max-w-none text-[#4a4f5a] leading-relaxed">
                {selectedArticle.articleContent && (
                  <div 
                    dangerouslySetInnerHTML={{ __html: htmlToJsx(selectedArticle.articleContent) }}
                    className="article-content"
                  />
                )}
              </div>

              {selectedArticle.articleLink && (
                <div className="mt-6 p-5 rounded-[22px] bg-[#f7f4ef] border border-[#ebe5db]">
                  <p className="text-sm text-[#8a8e98] mb-2">{t('articleManagement.modal.source')}</p>
                  <a
                    href={selectedArticle.articleLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4c9dff] hover:text-[#3f85d6] text-sm break-all"
                  >
                    {selectedArticle.articleLink}
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#f0ece3] bg-[#fbfaf7]">
              <button
                onClick={() => setShowArticleModal(false)}
                className={`${secondaryButtonClasses} px-6 py-2`}
              >
                {t('articleManagement.modal.close')}
              </button>
              <button
                onClick={() => {
                  const newStatus = selectedArticle.articleStatus === 'APPROVED' ? 'UNAPPROVED' : 'APPROVED';
                  articleService.updateArticleStatus(selectedArticle.articleId, newStatus)
                    .then(() => {
                      const statusText = newStatus === 'APPROVED' ? t('articleManagement.messages.approved') : t('articleManagement.messages.unapproved');
                      showSuccess(t('articleManagement.messages.statusUpdateSuccess', { action: statusText, count: 1 }));
                      loadArticles();
                      setShowArticleModal(false);
                    })
                    .catch(() => {
                      setError(t('articleManagement.messages.statusUpdateError') || 'Không thể cập nhật trạng thái bài viết');
                    });
                }}
                className={`${primaryButtonClasses} px-6 py-2`}
              >
                {selectedArticle.articleStatus === 'APPROVED' ? t('articleManagement.buttons.unapprove') : t('articleManagement.buttons.approve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleManagement;
