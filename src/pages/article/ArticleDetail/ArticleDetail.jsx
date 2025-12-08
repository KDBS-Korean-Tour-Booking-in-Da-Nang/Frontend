import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import articleService from '../../../services/articleService';
import { htmlToJsx, normalizeImageUrlsInHtml } from '../../../utils/htmlConverter';
import { getImageUrl } from '../../../config/api';
import ArticleCommentSection from './ArticleCommentSection/ArticleCommentSection';
import styles from './ArticleDetail.module.css';

const ArticleDetail = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const detailContainerClass = `${styles.pageContainer} ${styles.detailContainer}`;

  // Load article when id changes
  useEffect(() => {
    if (id) {
      loadArticle(id);
    }
  }, [id]);

  // Get localized article field based on current language (fallback to Vietnamese, then English, then Korean)
  const getLocalizedArticleField = (article, baseField) => {
    if (!article) return '';
    const lang = (i18n.language || 'vi').toLowerCase();

    const vi = article[baseField];
    const en = article[`${baseField}EN`] ?? article[`${baseField}En`];
    const kr = article[`${baseField}KR`] ?? article[`${baseField}Ko`] ?? article[`${baseField}KO`];

    if (lang.startsWith('en') && en) return en;
    if ((lang.startsWith('ko') || lang.startsWith('kr')) && kr) return kr;

    return vi || en || kr || '';
  };

  // Load article by ID from API
  const loadArticle = async (articleId) => {
    if (!articleId || articleId === 'undefined') {
      setError(t('articleDetail.errorMessage'));
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const data = await articleService.getArticleById(articleId);
      setArticle(data);
    } catch (error) {
      setError(t('articleDetail.errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageRoot}>
      <div className={styles.pageBackground} aria-hidden="true"></div>
      <div className={detailContainerClass}>
        <div className={`${styles.contentWrap} flex items-center justify-center`}>
          <div className={`${styles.card} max-w-md w-full text-center py-12`}>
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-primary mx-auto mb-4"></div>
            <p className="text-gray-600">{t('articleDetail.loading')}</p>
          </div>
        </div>
      </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageRoot}>
        <div className={styles.pageBackground} aria-hidden="true"></div>
        <div className={detailContainerClass}>
          <div className={`${styles.contentWrap} flex items-center justify-center`}>
          <div className={`${styles.card} max-w-md w-full p-8 text-center space-y-4`}>
        <DocumentTextIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">{t('articleDetail.errorTitle')}</h2>
        <p className="text-gray-600">{error}</p>
        <div className="space-y-3 pt-2">
          <button
            onClick={() => loadArticle(id)}
            className={`${styles.softButton} w-full justify-center`}
          >
            {t('articleDetail.retry')}
          </button>
          <button
            onClick={() => navigate('/article')}
            className={`${styles.softButton} ${styles.ghostButton} w-full justify-center`}
          >
            {t('articleDetail.backToNewsPage')}
          </button>
        </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className={styles.pageRoot}>
        <div className={styles.pageBackground} aria-hidden="true"></div>
        <div className={detailContainerClass}>
          <div className={`${styles.contentWrap} flex items-center justify-center`}>
          <div className={`${styles.card} max-w-md w-full p-8 text-center space-y-4`}>
        <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-gray-900">{t('articleDetail.notFoundTitle')}</h2>
        <p className="text-gray-600">{t('articleDetail.notFoundMessage')}</p>
        <button
          onClick={() => navigate('/article')}
          className={`${styles.softButton} w-full justify-center`}
        >
          {t('articleDetail.backToNewsPage')}
        </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const articleContent = getLocalizedArticleField(article, 'articleContent') || article.articleContent || '';
  
  // Add CSS classes to introtext and fulltext divs for different styling
  const getStyledContent = (htmlContent) => {
    if (!htmlContent) return '';
    
    let styledContent = htmlContent
      .replace(/<div class="introtext">/g, '<div class="introtext italic text-lg text-gray-600 border-l-4 border-green-500 pl-4 mb-6">')
      .replace(/<div class="fulltext">/g, '<div class="fulltext text-gray-800 leading-relaxed">');
    
    return htmlToJsx(styledContent);
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageBackground} aria-hidden="true"></div>
      <div className={detailContainerClass}>
        {/* Header */}
        <div className={`${styles.contentWrap} pt-2 pb-0`}>
          <div className={`${styles.card} px-4 sm:px-6 lg:px-8 py-3`}>
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <button
                onClick={() => navigate('/article')}
                className={`${styles.softButton} ${styles.ghostButton} text-sm gap-2`}
              >
                <ArrowLeftIcon className="h-4 w-4" />
                {t('articleDetail.backToNews')}
              </button>
              <Link
                to="/article"
                className="text-primary hover:text-primary-hover font-medium transition-colors text-sm"
              >
                {t('articleDetail.article')}
              </Link>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className={`${styles.contentWrap} pt-6`}>
          <article className={`${styles.card} overflow-hidden`}>
            {/* Article Header */}
            <div className="p-8 border-b border-gray-200 space-y-4">
              <p className={styles.heroEyebrow}>{t('articleDetail.pill', { defaultValue: 'Feature' })}</p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                {getLocalizedArticleField(article, 'articleTitle') || article.articleTitle}
              </h1>
              <div className={styles.articleMeta}>
                <div className={`${styles.articleMetaPill} flex items-center`}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {new Date(article.articleCreatedDate).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <span className={`${styles.articleMetaPill} uppercase tracking-[0.2em] text-xs`}>
                  {t('articleDetail.category')}
                </span>
              </div>
            </div>

            {/* Article Body */}
            <div className="p-8">
              {articleContent ? (
                <div className="prose prose-lg max-w-none">
                  <div
                    dangerouslySetInnerHTML={{ __html: normalizeImageUrlsInHtml(getStyledContent(articleContent), getImageUrl) }}
                    className={styles.articleProse}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{t('articleDetail.contentUpdating')}</p>
                </div>
              )}
            </div>

            {/* Comment Section */}
            <ArticleCommentSection articleId={article.articleId} />

            {/* Article Footer */}
            <div className={`${styles.articleFooter} px-8 py-6 border-t border-gray-200`}>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {t('articleDetail.publishedAt')}: {new Date(article.articleCreatedDate).toLocaleString('vi-VN')}
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className={`${styles.softButton} ${styles.ghostButton} text-sm px-4 py-2`}
                  >
                    {t('articleDetail.backToTop')}
                  </button>
                  <Link
                    to="/article"
                    className={`${styles.softButton} text-sm px-4 py-2`}
                  >
                    {t('articleDetail.viewMoreNews')}
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
