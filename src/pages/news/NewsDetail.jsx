import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, UserIcon, ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import articleService from '../../services/articleService';
import { extractTextFromHtml, htmlToJsx } from '../../utils/htmlConverter';

const NewsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadArticle(id);
    }
  }, [id]);

  const loadArticle = async (articleId) => {
    if (!articleId || articleId === 'undefined') {
      setError(t('newsDetail.errorMessage'));
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const data = await articleService.getArticleById(articleId);
      setArticle(data);
    } catch (error) {
      console.error('Error loading article:', error);
      setError(t('newsDetail.errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('newsDetail.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <DocumentTextIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('newsDetail.errorTitle')}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => loadArticle(id)}
              className="w-full bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg transition-colors shadow-primary"
            >
              {t('newsDetail.retry')}
            </button>
            <button
              onClick={() => navigate('/news')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {t('newsDetail.backToNewsPage')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('newsDetail.notFoundTitle')}</h2>
          <p className="text-gray-600 mb-6">{t('newsDetail.notFoundMessage')}</p>
          <button
            onClick={() => navigate('/news')}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg transition-colors shadow-primary"
          >
            {t('newsDetail.backToNewsPage')}
          </button>
        </div>
      </div>
    );
  }

  // Convert HTML content to displayable text with styling for introtext and fulltext
  const articleContent = article.articleContent || '';
  
  // Create styled content with different styles for introtext and fulltext
  const getStyledContent = (htmlContent) => {
    if (!htmlContent) return '';
    
    // Add CSS classes to introtext and fulltext divs
    let styledContent = htmlContent
      .replace(/<div class="introtext">/g, '<div class="introtext italic text-lg text-gray-600 border-l-4 border-green-500 pl-4 mb-6">')
      .replace(/<div class="fulltext">/g, '<div class="fulltext text-gray-800 leading-relaxed">');
    
    return htmlToJsx(styledContent);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom styles for article content images */}
      <style jsx>{`
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
      `}</style>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/news')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              {t('newsDetail.backToNews')}
            </button>
            <div className="h-6 border-l border-gray-300"></div>
            <Link
              to="/news"
              className="text-primary hover:text-primary-hover font-medium transition-colors"
            >
              {t('newsDetail.news')}
            </Link>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <article className="bg-white shadow-sm border border-gray-200 overflow-hidden">
          {/* Article Header */}
          <div className="p-8 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              {article.articleTitle}
            </h1>
            
            <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {new Date(article.articleCreatedDate).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <span className="bg-secondary text-primary px-3 py-1 text-xs font-medium">
                {t('newsDetail.category')}
              </span>
            </div>
          </div>

          {/* Article Body */}
          <div className="p-8">
            {/* Article Content */}
            {articleContent ? (
              <div className="prose prose-lg max-w-none">
                <div 
                  dangerouslySetInnerHTML={{ __html: getStyledContent(articleContent) }}
                  className="article-content"
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{t('newsDetail.contentUpdating')}</p>
              </div>
            )}
          </div>

          {/* Article Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {t('newsDetail.publishedAt')}: {new Date(article.articleCreatedDate).toLocaleString('vi-VN')}
            </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-primary hover:text-primary-hover font-medium text-sm transition-colors"
                >
                  {t('newsDetail.backToTop')}
                </button>
                <Link
                  to="/news"
                  className="text-primary hover:text-primary-hover font-medium text-sm transition-colors"
                >
                  {t('newsDetail.viewMoreNews')}
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default NewsDetail;
