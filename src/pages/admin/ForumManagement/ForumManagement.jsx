import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from '../../../components';
import { 
  EyeIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  PhotoIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  NewspaperIcon,
  ChatBubbleBottomCenterTextIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import { API_ENDPOINTS, getImageUrl, getAvatarUrl, FrontendURL, createAuthHeaders, normalizeToRelativePath } from '../../../config/api';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';

const ForumManagement = () => {
  const { t, i18n } = useTranslation();
  const { getToken } = useAuth();
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [reportFilter, setReportFilter] = useState('all'); // 'all', 'POST', 'COMMENT'
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tourPreviews, setTourPreviews] = useState({}); // Store tour previews by tour ID
  
  // Pagination and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (showReports) {
      fetchReports();
    }
  }, [showReports, reportFilter]);

  useEffect(() => {
    if (!showReports) {
      filterAndPaginatePosts();
    }
  }, [searchQuery, statusFilter, sortBy, currentPage, allPosts, showReports]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = getToken();

      const response = await fetch(API_ENDPOINTS.POSTS, {
        headers: createAuthHeaders(token)
      });

      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setAllPosts(Array.isArray(data) ? data : []);
      } else {
        setError(t('admin.forumManagement.error') || 'Không thể tải danh sách bài viết');
      }
    } catch (error) {
      // Silently handle error fetching posts
      setError(t('admin.forumManagement.error') || 'Có lỗi xảy ra khi tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const token = getToken();

      const params = new URLSearchParams({ page: '0', size: '100' });
      const response = await fetch(`${API_ENDPOINTS.REPORTS_ADMIN_ALL}?${params}`, {
        headers: createAuthHeaders(token)
      });

      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        const reportsList = data.content || data || [];
        setReports(reportsList);
      } else {
        setError(t('admin.forumManagement.error') || 'Không thể tải danh sách báo cáo');
      }
    } catch (error) {
      // Silently handle error fetching reports
      setError(t('admin.forumManagement.error') || 'Có lỗi xảy ra khi tải danh sách báo cáo');
    } finally {
      setReportsLoading(false);
    }
  };

  const filterAndPaginatePosts = () => {
    let filtered = [...allPosts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => {
        const content = (post.content || '').toLowerCase();
        const author = (post.username || '').toLowerCase();
        const userId = post.userId ? String(post.userId).toLowerCase() : '';
        return content.includes(query) || author.includes(query) || userId.includes(query);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      return 0;
    });

    // Paginate
    const totalPagesCount = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    setPosts(paginated);
    setTotalPages(totalPagesCount);
    setTotalItems(filtered.length);
  };

  const handleView = (post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleViewDetails = (postId) => {
    navigate(`/forum?postId=${postId}`);
    setIsModalOpen(false);
  };

  const handleViewReportDetails = (report) => {
    if (report.targetType === 'POST') {
      navigate(`/forum?postId=${report.targetId}`);
    } else if (report.targetType === 'COMMENT') {
      navigate(`/forum?commentId=${report.targetId}`);
    }
  };

  const filteredReports = reports.filter(report => {
    if (reportFilter === 'all') return true;
    return report.targetType === reportFilter;
  });

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      INVESTIGATING: 'bg-[#bfd7ff] text-[#2563eb]',
      RESOLVED: 'bg-green-100 text-green-800',
      DISMISSED: 'bg-gray-100 text-gray-800',
      CLOSED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Extract tour ID from post content or metadata
  const extractTourId = (post) => {
    try {
      // Check metadata first
      const meta = post.metadata || post.meta || null;
      if (meta && meta.linkType === 'TOUR' && (meta.linkRefId || meta.linkUrl)) {
        const urlStr = String(meta.linkUrl || '');
        const idFromMeta = meta.linkRefId || 
                         urlStr.match(/\/tour\/detail[?&]id=(\d+)/)?.[1] || 
                         urlStr.match(/\/tour\/(\d+)/)?.[1];
        if (idFromMeta) return idFromMeta;
      }
      
      // Check content for tour links
      const text = String(post.content || '');
      const escapedBase = FrontendURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regexOld = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/(\\d+)(?:[\\s\\?&#]|$)`, 'i');
      const regexNew = new RegExp(`(?:https?://[^\\s/]+)?(?:${escapedBase})?/tour/detail[?&]id=(\\d+)(?:[\\s&#]|$)`, 'i');
      const match = text.match(regexNew) || text.match(regexOld);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  // Remove URLs from content for display
  const cleanContent = (content) => {
    if (!content) return '';
    // Remove URLs (http://, https://)
    return content.replace(/https?:\/\/[^\s]+/gi, '').trim();
  };

  // Fetch tour preview
  const fetchTourPreview = async (tourId) => {
    if (tourPreviews[tourId]) return; // Already fetched
    
    try {
      const token = getToken();
      
      const response = await fetch(API_ENDPOINTS.TOUR_PREVIEW_BY_ID(tourId), {
        headers: createAuthHeaders(token)
      });
      
      if (response.ok) {
        const data = await response.json();
        // Normalize thumbnailUrl về relative path để không lưu BaseURL vào state
        const rawThumbnail = data.thumbnailUrl || data.tourImgPath;
        setTourPreviews(prev => ({
          ...prev,
          [tourId]: {
            title: data.title || data.tourName,
            thumbnailUrl: normalizeToRelativePath(rawThumbnail)
          }
        }));
      }
    } catch (error) {
      // Silently handle error fetching tour preview
    }
  };

  // Load tour previews for posts
  useEffect(() => {
    if (posts.length > 0) {
      posts.forEach(post => {
        const tourId = extractTourId(post);
        if (tourId && !tourPreviews[tourId]) {
          fetchTourPreview(tourId);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  const stats = {
    total: allPosts.length,
    active: allPosts.filter((p) => p.status !== 'inactive').length,
    reports: reports.length,
    comments: allPosts.reduce((sum, p) => sum + (p.reactions?.commentCount || 0), 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">{t('admin.forumManagement.title')}</p>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.forumManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.forumManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchPosts}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </button>
          <button
            onClick={() => setShowReports(!showReports)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow ${
              showReports 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <FlagIcon className="h-5 w-5" />
            {showReports ? t('admin.forumManagement.hideReports') : t('admin.forumManagement.reports')}
          </button>
        </div>
      </div>

      {!showReports && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={NewspaperIcon} label={t('admin.forumManagement.stats.totalPosts')} value={stats.total} trend={t('admin.forumManagement.stats.totalPostsTrend')} />
          <StatCard icon={DocumentTextIcon} label={t('admin.forumManagement.stats.active')} value={stats.active} trend={t('admin.forumManagement.stats.activeTrend')} color="text-green-600" />
          <StatCard icon={ChatBubbleBottomCenterTextIcon} label={t('admin.forumManagement.stats.totalComments')} value={stats.comments} trend={t('admin.forumManagement.stats.totalCommentsTrend')} color="text-[#4c9dff]" />
          <StatCard icon={ExclamationTriangleIcon} label={t('admin.forumManagement.stats.reports')} value={stats.reports} trend={t('admin.forumManagement.stats.reportsTrend')} color="text-amber-500" />
        </div>
      )}

      {showReports ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">{t('admin.forumManagement.reportFilters.all')}</span>
              <button
                onClick={() => setReportFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  reportFilter === 'all'
                    ? 'bg-[#4c9dff] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.forumManagement.reportFilters.all')}
              </button>
              <button
                onClick={() => setReportFilter('POST')}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  reportFilter === 'POST'
                    ? 'bg-[#4c9dff] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.forumManagement.reportFilters.post')}
              </button>
              <button
                onClick={() => setReportFilter('COMMENT')}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  reportFilter === 'COMMENT'
                    ? 'bg-[#4c9dff] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.forumManagement.reportFilters.comment')}
              </button>
            </div>
          </div>

          {reportsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c9dff]"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('admin.forumManagement.noReports')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <div key={report.reportId} className="p-6 hover:bg-[#e9f2ff]/40 transition-colors border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(report.status)}`}>
                          {report.status}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {report.targetType === 'POST' ? t('admin.forumManagement.reportLabels.post') : t('admin.forumManagement.reportLabels.comment')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {t('admin.forumManagement.reportLabels.reportedBy', { name: report.reporterUsername || 'N/A' })}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {report.targetTitle || t('admin.forumManagement.reportLabels.noTitle')}
                      </h3>
                      {report.description && (
                        <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                      )}
                      {report.reasons && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {typeof report.reasons === 'string' 
                            ? report.reasons.split(',').map((reason, idx) => (
                                <span key={idx} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                  {reason.trim()}
                                </span>
                              ))
                            : Array.isArray(report.reasons)
                            ? report.reasons.map((reason, idx) => (
                                <span key={idx} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                  {reason}
                                </span>
                              ))
                            : null
                          }
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatDate(report.reportedAt)}</span>
                        </div>
                        {report.targetAuthor && (
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-4 w-4" />
                            <span>{t('admin.forumManagement.reportLabels.reportedBy', { name: report.targetAuthor })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Tooltip text={t('admin.forumManagement.actions.viewDetails')} position="top">
                        <button
                          onClick={() => handleViewReportDetails(report)}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search and Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-xs">
                <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t('admin.forumManagement.searchPlaceholder')}
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">{t('admin.forumManagement.statusFilter.all')}</option>
                  <option value="active">{t('admin.forumManagement.statusFilter.active')}</option>
                  <option value="inactive">{t('admin.forumManagement.statusFilter.inactive')}</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">{t('admin.forumManagement.sortBy.newest')}</option>
                  <option value="oldest">{t('admin.forumManagement.sortBy.oldest')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c9dff]"></div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/70">
                <tr>
                  {[t('admin.forumManagement.tableHeaders.id'), t('admin.forumManagement.tableHeaders.post'), t('admin.forumManagement.tableHeaders.author'), t('admin.forumManagement.tableHeaders.likes'), t('admin.forumManagement.tableHeaders.comments'), t('admin.forumManagement.tableHeaders.date'), t('admin.forumManagement.tableHeaders.actions')].map((header) => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      {t('admin.forumManagement.noResults')}
                    </td>
                  </tr>
                ) : (
                      posts.map((post) => (
                        <tr key={post.forumPostId || post.id} className="hover:bg-[#e9f2ff]/40 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            POST-{post.forumPostId || post.id || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const tourId = extractTourId(post);
                              const tourPreview = tourId ? tourPreviews[tourId] : null;
                              const hasImages = post.images && post.images.length > 0;
                              // Normalize image URL khi hiển thị (state đã lưu relative path)
                              const displayImage = tourPreview?.thumbnailUrl 
                                ? getImageUrl(tourPreview.thumbnailUrl)
                                : (hasImages ? getImageUrl(typeof post.images[0] === 'string' ? post.images[0] : post.images[0]?.imgPath) : null);
                              const cleanText = cleanContent(post.content || '');
                              const displayTitle = post.title || (tourPreview?.title || null);
                              const displayContent = cleanText || 'N/A';
                              
                              return (
                                <div className="flex items-start gap-3">
                                  {displayImage && (
                                    <img
                                      src={displayImage}
                                      alt={displayTitle || "Post"}
                                      className="h-16 w-16 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    {displayTitle && (
                                      <div className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                                        {displayTitle}
                                      </div>
                                    )}
                                    <div className="text-sm text-gray-600 line-clamp-2">
                                      {displayContent}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {post.username || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {post.reactions?.likeCount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {post.reactions?.commentCount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(post.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Tooltip text={t('admin.forumManagement.actions.viewDetails')} position="top">
                              <button
                                onClick={() => handleView(post)}
                                className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {posts.length > 0 && (
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('admin.forumManagement.pagination.previous')}
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('admin.forumManagement.pagination.next')}
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {t('admin.forumManagement.pagination.showing', { current: currentPage, total: totalPages, items: totalItems })}
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">{t('admin.forumManagement.pagination.previous')}</span>
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      {[...Array(totalPages)].map((_, idx) => {
                        const page = idx + 1;
                        if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === page
                                  ? 'z-10 bg-[#4c9dff] border-[#4c9dff] text-white'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                        }
                        return null;
                      })}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">{t('admin.forumManagement.pagination.next')}</span>
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && selectedPost && !showReports && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setIsModalOpen(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#4c9dff] to-[#3f85d6] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                      <DocumentTextIcon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{t('admin.forumManagement.modal.title')}</h3>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white hover:bg-opacity-20 rounded-lg"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="bg-white px-6 py-6">
                <div className="space-y-6">
                  {/* Author Info */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {selectedPost.userAvatar && (
                      <img
                        src={getAvatarUrl(selectedPost.userAvatar)}
                        alt={selectedPost.username}
                        className="w-14 h-14 rounded-full border-2 border-white shadow-md"
                        onError={(e) => { e.target.src = '/default-avatar.png'; }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-lg font-bold text-gray-900">{selectedPost.username || 'N/A'}</p>
                        {selectedPost.userId && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                            ID: {selectedPost.userId}
                          </span>
                        )}
                      </div>
                      {selectedPost.createdAt && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatDate(selectedPost.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Images */}
                  {selectedPost.images && selectedPost.images.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <PhotoIcon className="h-5 w-5" />
                        <span>{t('admin.forumManagement.modal.images', { count: selectedPost.images.length })}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedPost.images.map((img, idx) => (
                          <div key={idx} className="relative overflow-hidden rounded-lg border border-gray-200 group">
                            <img
                              src={getImageUrl(typeof img === 'string' ? img : img?.imgPath)}
                              alt={`Post image ${idx + 1}`}
                              className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <DocumentTextIcon className="h-5 w-5" />
                      <span>{t('admin.forumManagement.modal.content')}</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {selectedPost.content || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  {selectedPost.reactions && (
                    <div className="flex items-center gap-6 p-4 bg-gradient-to-r from-[#e9f2ff] to-[#e0edff] rounded-lg border border-[#bfd7ff]">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <HeartIcon className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">{t('admin.forumManagement.modal.likes')}</p>
                          <p className="text-lg font-bold text-red-600">{selectedPost.reactions.likeCount || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-[#bfd7ff] rounded-lg">
                          <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#4c9dff]" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">{t('admin.forumManagement.modal.comments')}</p>
                          <p className="text-lg font-bold text-[#4c9dff]">{selectedPost.reactions.commentCount || 0}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4c9dff] transition-colors"
                >
                  {t('admin.forumManagement.modal.close')}
                </button>
                <button
                  onClick={() => handleViewDetails(selectedPost.forumPostId || selectedPost.id)}
                  className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg border border-transparent shadow-[0_12px_30px_rgba(76,157,255,0.35)] px-5 py-2.5 bg-[#4c9dff] text-sm font-medium text-white hover:bg-[#3f85d6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4c9dff] transition-all duration-200"
                >
                  {t('admin.forumManagement.modal.viewDetails')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: IconComponent, label, value, trend, color = 'text-blue-600' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#e9f2ff] flex items-center justify-center">
          <IconComponent className="h-6 w-6 text-[#4c9dff]" />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <span className={`text-xs font-semibold ${color === 'text-blue-600' ? 'text-[#4c9dff]' : color}`}>{trend}</span>
    </div>
  </div>
);

export default ForumManagement;
