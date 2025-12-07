import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders, getTourImageUrl } from '../../../../../config/api';
import { checkAndHandle401 } from '../../../../../utils/apiErrorHandler';
import TourDetailModal from './TourDetailModal';
import DeleteConfirmModal from '../../../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import { 
  XMarkIcon, 
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Package, CheckCircle2, FileText, Eye, CheckCircle, XCircle, Check, Clock, X } from 'lucide-react';

const TourApproval = () => {
  const { t, i18n } = useTranslation();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useToast();

  // Check if user has permission to manage tours
  const canManageTours = user?.staffTask === 'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE' || user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // Show all tours by default
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTour, setSelectedTour] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [tourToApprove, setTourToApprove] = useState(null);
  const [tourToReject, setTourToReject] = useState(null);

  // Fetch tours from API
  useEffect(() => {
    const fetchTours = async () => {
      if (!canManageTours) return;
      
      try {
        setLoading(true);
        const token = getToken();
        const response = await fetch(API_ENDPOINTS.TOURS, {
          headers: createAuthHeaders(token)
        });

        if (!response.ok && response.status === 401) {
          await checkAndHandle401(response);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          // Handle different response formats
          let toursList = [];
          if (Array.isArray(data)) {
            toursList = data;
          } else if (data.result && Array.isArray(data.result)) {
            toursList = data.result;
          } else if (data.content && Array.isArray(data.content)) {
            toursList = data.content;
          } else if (data.data && Array.isArray(data.data)) {
            toursList = data.data;
          }
          setTours(toursList);
          setError(''); // Clear error on success
        } else {
          // Silently handle failed to fetch tours
          setError(t('admin.tourApproval.error.loadTours'));
        }
      } catch (error) {
        // Silently handle error fetching tours
        setError(t('admin.tourApproval.error.loadTours'));
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, [canManageTours, getToken]);

  // Filter and sort tours
  const filteredAndSortedTours = useMemo(() => {
    let filtered = [...tours];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => {
        const status = (t.tourStatus || t.status || '').toUpperCase();
        return status === statusFilter.toUpperCase();
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tour => {
        const title = (tour.title || tour.tourName || '').toLowerCase();
        const desc = (tour.shortDescription || tour.tourDescription || '').toLowerCase();
        const departure = (tour.departurePoint || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || departure.includes(query);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      } else if (sortBy === 'name-asc') {
        const nameA = (a.title || a.tourName || '').toLowerCase();
        const nameB = (b.title || b.tourName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'name-desc') {
        const nameA = (a.title || a.tourName || '').toLowerCase();
        const nameB = (b.title || b.tourName || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

    return filtered;
  }, [tours, searchQuery, statusFilter, sortBy]);

  // Paginate
  const paginatedTours = useMemo(() => {
    const total = Math.ceil(filteredAndSortedTours.length / pageSize);
    setTotalPages(total);
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedTours.slice(startIndex, endIndex);
  }, [filteredAndSortedTours, currentPage, pageSize]);

  // Handle view details
  const handleViewDetails = async (tourId) => {
    try {
      setLoadingDetail(true);
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_BY_ID(tourId), {
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const tourDetail = await response.json();
        setSelectedTour(tourDetail);
        setIsDetailModalOpen(true);
      } else {
        const errorText = await response.text();
        setError(t('admin.tourApproval.error.loadDetail'));
      }
    } catch (error) {
      // Silently handle error fetching tour details
      setError(t('admin.tourApproval.error.loadDetail'));
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle approve tour - opens modal
  const handleApproveTour = (tourId) => {
    const tour = tours.find(t => (t.tourId || t.id) === tourId) || { tourId: tourId || tour.id };
    setTourToApprove(tour);
    setIsApproveModalOpen(true);
  };

  // Confirm approve tour - calls API
  const confirmApproveTour = async () => {
    if (!tourToApprove) return;
    const tourId = tourToApprove.tourId || tourToApprove.id;

    try {
      const token = getToken();
      const response = await fetch(`${API_ENDPOINTS.TOURS}/change-status/${tourId}?status=PUBLIC`, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Refresh tours list
        const refreshResponse = await fetch(API_ENDPOINTS.TOURS, {
          headers: createAuthHeaders(token)
        });
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          // Handle different response formats
          let toursList = [];
          if (Array.isArray(data)) {
            toursList = data;
          } else if (data.result && Array.isArray(data.result)) {
            toursList = data.result;
          } else if (data.content && Array.isArray(data.content)) {
            toursList = data.content;
          } else if (data.data && Array.isArray(data.data)) {
            toursList = data.data;
          }
          setTours(toursList);
        }
        setIsApproveModalOpen(false);
        setTourToApprove(null);
        showSuccess(t('admin.tourApproval.success.approve'));
        setIsDetailModalOpen(false);
      } else {
        const errorText = await response.text();
        setError(t('admin.tourApproval.error.approve', { error: errorText }));
      }
    } catch (error) {
      // Silently handle error approving tour
      setError(t('admin.tourApproval.error.approveGeneric'));
    }
  };

  // Handle reject tour - opens modal
  const handleRejectTour = (tourId) => {
    const tour = tours.find(t => (t.tourId || t.id) === tourId) || { tourId: tourId || tour.id };
    setTourToReject(tour);
    setIsRejectModalOpen(true);
  };

  // Confirm reject tour - calls API
  const confirmRejectTour = async () => {
    if (!tourToReject) return;
    const tourId = tourToReject.tourId || tourToReject.id;

    try {
      const token = getToken();
      // Set status to DISABLED when rejecting
      const response = await fetch(`${API_ENDPOINTS.TOURS}/change-status/${tourId}?status=DISABLED`, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Refresh tours list
        const refreshResponse = await fetch(API_ENDPOINTS.TOURS, {
          headers: createAuthHeaders(token)
        });
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          // Handle different response formats
          let toursList = [];
          if (Array.isArray(data)) {
            toursList = data;
          } else if (data.result && Array.isArray(data.result)) {
            toursList = data.result;
          } else if (data.content && Array.isArray(data.content)) {
            toursList = data.content;
          } else if (data.data && Array.isArray(data.data)) {
            toursList = data.data;
          }
          setTours(toursList);
        }
        setIsRejectModalOpen(false);
        setTourToReject(null);
        showSuccess(t('admin.tourApproval.success.reject'));
        setIsDetailModalOpen(false);
      } else {
        const errorText = await response.text();
        setError(t('admin.tourApproval.error.reject', { error: errorText }));
      }
    } catch (error) {
      // Silently handle error rejecting tour
      setError(t('admin.tourApproval.error.rejectGeneric'));
    }
  };

  const formatPrice = (price) => {
    if (!price) return t('admin.tourApproval.status.na');
    const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('admin.tourApproval.status.na');
    try {
      const date = new Date(dateString);
      const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return t('admin.tourApproval.status.na');
    const raw = String(duration);
    
    // Try to parse "X ngày Y đêm" or "X days Y nights" or "X일 Y박" format
    const viMatch = raw.match(/(\d+)\s*ngày\s*(\d+)\s*đêm/i);
    const enMatch = raw.match(/(\d+)\s*days?\s*(\d+)\s*nights?/i);
    const koMatch = raw.match(/(\d+)\s*일\s*(\d+)\s*박/i);
    const genericMatch = raw.match(/(\d+)\D+(\d+)/);
    
    const match = viMatch || enMatch || koMatch || genericMatch;
    
    if (match) {
      const days = parseInt(match[1], 10);
      const nights = parseInt(match[2], 10);
      if (Number.isFinite(days) && Number.isFinite(nights)) {
        return t('admin.tourApproval.durationTemplate', { days, nights });
      }
    }
    
    // If can't parse, return as is
    return raw;
  };

  // Check if user has permission
  if (user && !canManageTours) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#f6f7fb] to-[#fdfdfc]">
        <div className="max-w-md w-full rounded-[32px] bg-white/90 border border-gray-200 shadow-lg p-10 text-center">
          <div className="w-16 h-16 rounded-[20px] bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-6">
            <ExclamationTriangleIcon className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t('admin.tourApproval.permissionDenied.title')}</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {t('admin.tourApproval.permissionDenied.message')}
          </p>
          <button
            onClick={() => navigate('/staff/tasks')}
            className="w-full px-6 py-3 rounded-[24px] text-sm font-semibold text-white bg-[#4c9dff] hover:bg-[#3f85d6] transition-all shadow-[0_12px_30px_rgba(76,157,255,0.35)]"
          >
            {t('admin.tourApproval.permissionDenied.backButton')}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('admin.tourApproval.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">{t('admin.tourApproval.title')}</p>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.tourApproval.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.tourApproval.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-300">
            <FunnelIcon className="h-5 w-5" />
            {t('admin.tourApproval.filters.advancedFilter')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200">
            <ArrowDownTrayIcon className="h-5 w-5" />
            {t('admin.tourApproval.filters.exportReport')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('admin.tourApproval.stats.totalTours')}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{tours.length}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#e9f2ff] flex items-center justify-center">
              <Package className="w-6 h-6 text-[#4c9dff]" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('admin.tourApproval.stats.displayedTours')}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{filteredAndSortedTours.length}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('admin.tourApproval.stats.currentPage')}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {currentPage + 1} / {totalPages || 1}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              placeholder={t('admin.tourApproval.filters.searchPlaceholder')}
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t('admin.tourApproval.filters.statusFilter.all')}</option>
              <option value="NOT_APPROVED">{t('admin.tourApproval.filters.statusFilter.notApproved')}</option>
              <option value="PUBLIC">{t('admin.tourApproval.filters.statusFilter.public')}</option>
              <option value="DISABLED">{t('admin.tourApproval.filters.statusFilter.disabled')}</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(0);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">{t('admin.tourApproval.filters.sortBy.newest')}</option>
              <option value="oldest">{t('admin.tourApproval.filters.sortBy.oldest')}</option>
              <option value="name-asc">{t('admin.tourApproval.filters.sortBy.nameAsc')}</option>
              <option value="name-desc">{t('admin.tourApproval.filters.sortBy.nameDesc')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {[
                  t('admin.tourApproval.table.headers.stt'),
                  t('admin.tourApproval.table.headers.tourName'),
                  t('admin.tourApproval.table.headers.status'),
                  t('admin.tourApproval.table.headers.price'),
                  t('admin.tourApproval.table.headers.duration'),
                  t('admin.tourApproval.table.headers.createdAt'),
                  t('admin.tourApproval.table.headers.actions')
                ].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {paginatedTours.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {loading ? t('admin.tourApproval.table.loading') : t('admin.tourApproval.table.noResults')}
                  </td>
                </tr>
              ) : (
                paginatedTours.map((tour, index) => (
                  <tr key={tour.tourId || tour.id} className="hover:bg-[#e9f2ff]/40 transition">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {currentPage * pageSize + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {tour.tourImgPath || tour.thumbnailUrl ? (
                          <img
                            src={getTourImageUrl(tour.tourImgPath || tour.thumbnailUrl)}
                            alt={tour.title || tour.tourName}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              e.target.src = '/default-Tour.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">📦</span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {tour.title || tour.tourName || 'N/A'}
                          </p>
                          {tour.shortDescription && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {tour.shortDescription}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <TourStatusBadge status={tour.tourStatus || tour.status} />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatPrice(tour.price || tour.adultPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDuration(tour.duration || tour.tourDuration)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(tour.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(tour.tourId || tour.id)}
                          disabled={loadingDetail}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('admin.tourApproval.actions.viewDetails')}
                        >
                          <Eye className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                        {(tour.tourStatus || tour.status || '').toUpperCase() !== 'PUBLIC' && (
                          <button
                            onClick={() => handleApproveTour(tour.tourId || tour.id)}
                            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 transition"
                            title={t('admin.tourApproval.actions.approve')}
                          >
                            <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        )}
                        {(tour.tourStatus || tour.status || '').toUpperCase() !== 'DISABLED' && (
                          <button
                            onClick={() => handleRejectTour(tour.tourId || tour.id)}
                            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition"
                            title={t('admin.tourApproval.actions.reject')}
                          >
                            <XCircle className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAndSortedTours.length >= 10 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              {t('admin.tourApproval.pagination.page', { current: currentPage + 1, total: totalPages, count: filteredAndSortedTours.length })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {t('admin.tourApproval.pagination.previous')}
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {t('admin.tourApproval.pagination.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tour Detail Modal */}
      <TourDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTour(null);
        }}
        tour={selectedTour}
        onApprove={selectedTour ? () => handleApproveTour(selectedTour.tourId || selectedTour.id) : null}
        onReject={selectedTour ? () => handleRejectTour(selectedTour.tourId || selectedTour.id) : null}
      />

      {/* Approve Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setTourToApprove(null);
        }}
        onConfirm={confirmApproveTour}
        title={t('admin.tourApproval.approveConfirm.title')}
        message={t('admin.tourApproval.approveConfirm.message', { name: tourToApprove?.title || tourToApprove?.tourName || tourToApprove?.tourId || tourToApprove?.id })}
        itemName={tourToApprove?.title || tourToApprove?.tourName || tourToApprove?.tourId?.toString() || tourToApprove?.id?.toString()}
        confirmText={t('admin.tourApproval.approveConfirm.confirm')}
        cancelText={t('admin.tourApproval.approveConfirm.cancel')}
        danger={false}
        icon={<CheckCircle size={36} strokeWidth={1.5} />}
      />

      {/* Reject Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setTourToReject(null);
        }}
        onConfirm={confirmRejectTour}
        title={t('admin.tourApproval.rejectConfirm.title')}
        message={t('admin.tourApproval.rejectConfirm.message', { name: tourToReject?.title || tourToReject?.tourName || tourToReject?.tourId || tourToReject?.id })}
        itemName={tourToReject?.title || tourToReject?.tourName || tourToReject?.tourId?.toString() || tourToReject?.id?.toString()}
        confirmText={t('admin.tourApproval.rejectConfirm.confirm')}
        cancelText={t('admin.tourApproval.rejectConfirm.cancel')}
        danger={true}
        icon={<XCircle size={36} strokeWidth={1.5} />}
      />
    </div>
  );
};

// Tour Status Badge Component
const TourStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  
  if (!status) {
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
        {t('admin.tourApproval.status.na')}
      </span>
    );
  }

  const statusUpper = status.toUpperCase();
  const statusMap = {
    'PUBLIC': { 
      color: 'bg-green-100 text-green-700', 
      label: t('admin.tourApproval.status.approved'), 
      icon: Check 
    },
    'NOT_APPROVED': { 
      color: 'bg-amber-100 text-amber-700', 
      label: t('admin.tourApproval.status.pending'), 
      icon: Clock 
    },
    'DISABLED': { 
      color: 'bg-red-100 text-red-700', 
      label: t('admin.tourApproval.status.disabled'), 
      icon: X 
    }
  };
  
  const map = statusMap[statusUpper] || { 
    color: 'bg-gray-100 text-gray-500', 
    label: status || t('admin.tourApproval.status.na'), 
    icon: FileText 
  };
  
  const IconComponent = map.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      <IconComponent className="w-3.5 h-3.5" strokeWidth={1.5} />
      {map.label}
    </span>
  );
};

export default TourApproval;
