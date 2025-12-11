import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, createAuthHeaders, getTourImageUrl } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import TourDetailModal from './TourDetailModal';
import DeleteConfirmModal from '../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import { Tooltip } from '../../../components';
import { Package, CheckCircle2, FileText, Eye, CheckCircle, XCircle, Check, Clock, X, RefreshCw, Edit3, Trash2 } from 'lucide-react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const TourManagement = () => {
  const { t, i18n } = useTranslation();
  const { getToken } = useAuth();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTour, setSelectedTour] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [tourToApprove, setTourToApprove] = useState(null);
  const [tourToReject, setTourToReject] = useState(null);

  // Update Requests State
  const [showUpdateRequests, setShowUpdateRequests] = useState(false);
  const [updateRequests, setUpdateRequests] = useState([]);
  const [loadingUpdateRequests, setLoadingUpdateRequests] = useState(false);
  const [selectedUpdateRequest, setSelectedUpdateRequest] = useState(null);
  const [isApproveUpdateModalOpen, setIsApproveUpdateModalOpen] = useState(false);
  const [isRejectUpdateModalOpen, setIsRejectUpdateModalOpen] = useState(false);
  const [updateApproveNote, setUpdateApproveNote] = useState('');
  const [updateRejectNote, setUpdateRejectNote] = useState('');
  const [searchUpdateQuery, setSearchUpdateQuery] = useState('');
  const [sortUpdateBy, setSortUpdateBy] = useState('newest');

  // Delete Requests State
  const [showDeleteRequests, setShowDeleteRequests] = useState(false);
  const [deleteRequests, setDeleteRequests] = useState([]);
  const [loadingDeleteRequests, setLoadingDeleteRequests] = useState(false);
  const [selectedDeleteRequest, setSelectedDeleteRequest] = useState(null);
  const [isApproveDeleteModalOpen, setIsApproveDeleteModalOpen] = useState(false);
  const [isRejectDeleteModalOpen, setIsRejectDeleteModalOpen] = useState(false);
  const [deleteApproveNote, setDeleteApproveNote] = useState('');
  const [deleteRejectNote, setDeleteRejectNote] = useState('');
  const [searchDeleteQuery, setSearchDeleteQuery] = useState('');
  const [sortDeleteBy, setSortDeleteBy] = useState('newest');

  // Fetch tours from API
  useEffect(() => {
    const fetchTours = async () => {
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
          setTours(Array.isArray(data) ? data : []);
        } else {
          // Silently handle failed to fetch tours
        }
      } catch (error) {
        // Silently handle error fetching tours
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, [getToken]);

  // Fetch pending requests counts on page load for notification badges
  useEffect(() => {
    const fetchPendingRequestsCounts = async () => {
      const token = getToken();
      if (!token) return;

      try {
        // Fetch update requests
        const updateResponse = await fetch(API_ENDPOINTS.TOUR_UPDATE_REQUESTS_PENDING, {
          headers: createAuthHeaders(token)
        });
        if (updateResponse.ok) {
          const data = await updateResponse.json();
          setUpdateRequests(Array.isArray(data) ? data : []);
        }

        // Fetch delete requests
        const deleteResponse = await fetch(API_ENDPOINTS.TOUR_DELETE_REQUESTS_PENDING, {
          headers: createAuthHeaders(token)
        });
        if (deleteResponse.ok) {
          const data = await deleteResponse.json();
          setDeleteRequests(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        // Silently handle error
      }
    };

    fetchPendingRequestsCounts();
  }, [getToken]);

  // Filter and sort tours
  const filteredAndSortedTours = useMemo(() => {
    let filtered = [...tours];

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

    // Status filter (if needed in future)
    // Currently keeping all tours

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

  // Filter and sort update requests
  const sortedUpdateRequests = useMemo(() => {
    let filtered = [...updateRequests];

    // Search filter
    if (searchUpdateQuery.trim()) {
      const query = searchUpdateQuery.toLowerCase();
      filtered = filtered.filter(request => {
        const tourName = (request.originalTour?.tourName || '').toLowerCase();
        const companyNote = (request.companyNote || '').toLowerCase();
        return tourName.includes(query) || companyNote.includes(query);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortUpdateBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortUpdateBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      } else if (sortUpdateBy === 'name-asc') {
        const nameA = (a.originalTour?.tourName || '').toLowerCase();
        const nameB = (b.originalTour?.tourName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortUpdateBy === 'name-desc') {
        const nameA = (a.originalTour?.tourName || '').toLowerCase();
        const nameB = (b.originalTour?.tourName || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

    return filtered;
  }, [updateRequests, searchUpdateQuery, sortUpdateBy]);

  // Filter and sort delete requests
  const sortedDeleteRequests = useMemo(() => {
    let filtered = [...deleteRequests];

    // Search filter
    if (searchDeleteQuery.trim()) {
      const query = searchDeleteQuery.toLowerCase();
      filtered = filtered.filter(request => {
        const tourName = (request.tourName || '').toLowerCase();
        const companyNote = (request.companyNote || '').toLowerCase();
        return tourName.includes(query) || companyNote.includes(query);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortDeleteBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortDeleteBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      } else if (sortDeleteBy === 'name-asc') {
        const nameA = (a.tourName || '').toLowerCase();
        const nameB = (b.tourName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortDeleteBy === 'name-desc') {
        const nameA = (a.tourName || '').toLowerCase();
        const nameB = (b.tourName || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

    return filtered;
  }, [deleteRequests, searchDeleteQuery, sortDeleteBy]);

  // Fetch pending update requests
  const fetchUpdateRequests = useCallback(async () => {
    try {
      setLoadingUpdateRequests(true);
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_UPDATE_REQUESTS_PENDING, {
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setUpdateRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setLoadingUpdateRequests(false);
    }
  }, [getToken]);

  // Handle approve update request
  const handleApproveUpdateRequest = (request) => {
    setSelectedUpdateRequest(request);
    setUpdateApproveNote('');
    setIsApproveUpdateModalOpen(true);
  };

  // Confirm approve update request
  const confirmApproveUpdateRequest = async () => {
    if (!selectedUpdateRequest) return;

    try {
      const token = getToken();
      const url = `${API_ENDPOINTS.TOUR_UPDATE_REQUEST_APPROVE(selectedUpdateRequest.id)}${updateApproveNote ? `?note=${encodeURIComponent(updateApproveNote)}` : ''}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Refresh both lists
        fetchUpdateRequests();
        // Refresh tours list
        const refreshResponse = await fetch(API_ENDPOINTS.TOURS, {
          headers: createAuthHeaders(token)
        });
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTours(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setIsApproveUpdateModalOpen(false);
      setSelectedUpdateRequest(null);
      setUpdateApproveNote('');
    }
  };

  // Handle reject update request
  const handleRejectUpdateRequest = (request) => {
    setSelectedUpdateRequest(request);
    setUpdateRejectNote('');
    setIsRejectUpdateModalOpen(true);
  };

  // Confirm reject update request
  const confirmRejectUpdateRequest = async () => {
    if (!selectedUpdateRequest) return;

    try {
      const token = getToken();
      const url = `${API_ENDPOINTS.TOUR_UPDATE_REQUEST_REJECT(selectedUpdateRequest.id)}${updateRejectNote ? `?note=${encodeURIComponent(updateRejectNote)}` : ''}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        fetchUpdateRequests();
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setIsRejectUpdateModalOpen(false);
      setSelectedUpdateRequest(null);
      setUpdateRejectNote('');
    }
  };

  // Toggle to update requests view
  const toggleUpdateRequestsView = () => {
    const newState = !showUpdateRequests;
    setShowUpdateRequests(newState);
    setShowDeleteRequests(false); // Close delete requests when opening update requests
    if (newState) {
      fetchUpdateRequests();
    }
  };

  // Fetch delete requests
  const fetchDeleteRequests = useCallback(async () => {
    try {
      setLoadingDeleteRequests(true);
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_DELETE_REQUESTS_PENDING, {
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setDeleteRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setLoadingDeleteRequests(false);
    }
  }, [getToken]);

  // Handle approve delete request
  const handleApproveDeleteRequest = (request) => {
    setSelectedDeleteRequest(request);
    setDeleteApproveNote('');
    setIsApproveDeleteModalOpen(true);
  };

  // Confirm approve delete request
  const confirmApproveDeleteRequest = async () => {
    if (!selectedDeleteRequest) return;

    try {
      const token = getToken();
      const url = `${API_ENDPOINTS.TOUR_DELETE_REQUEST_APPROVE(selectedDeleteRequest.id)}${deleteApproveNote ? `?note=${encodeURIComponent(deleteApproveNote)}` : ''}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Refresh both lists
        fetchDeleteRequests();
        // Refresh tours list
        const refreshResponse = await fetch(API_ENDPOINTS.TOURS, {
          headers: createAuthHeaders(token)
        });
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTours(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setIsApproveDeleteModalOpen(false);
      setSelectedDeleteRequest(null);
      setDeleteApproveNote('');
    }
  };

  // Handle reject delete request
  const handleRejectDeleteRequest = (request) => {
    setSelectedDeleteRequest(request);
    setDeleteRejectNote('');
    setIsRejectDeleteModalOpen(true);
  };

  // Confirm reject delete request
  const confirmRejectDeleteRequest = async () => {
    if (!selectedDeleteRequest) return;

    try {
      const token = getToken();
      const url = `${API_ENDPOINTS.TOUR_DELETE_REQUEST_REJECT(selectedDeleteRequest.id)}${deleteRejectNote ? `?note=${encodeURIComponent(deleteRejectNote)}` : ''}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        fetchDeleteRequests();
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setIsRejectDeleteModalOpen(false);
      setSelectedDeleteRequest(null);
      setDeleteRejectNote('');
    }
  };

  // Toggle to delete requests view
  const toggleDeleteRequestsView = () => {
    const newState = !showDeleteRequests;
    setShowDeleteRequests(newState);
    setShowUpdateRequests(false); // Close update requests when opening delete requests
    if (newState) {
      fetchDeleteRequests();
    }
  };

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
        alert(t('admin.tourManagement.detailError'));
      }
    } catch (error) {
      // Silently handle error fetching tour details
      alert(t('admin.tourManagement.detailError'));
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
          setTours(Array.isArray(data) ? data : []);
        }
        setIsApproveModalOpen(false);
        setTourToApprove(null);
      } else {
        // Silently handle error approving tour
      }
    } catch (error) {
      // Silently handle error approving tour
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
      // Set status to DISABLED when rejecting (NOT_APPROVED means pending, DISABLED means rejected)
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
          setTours(Array.isArray(data) ? data : []);
        }
        setIsRejectModalOpen(false);
        setTourToReject(null);
      } else {
        // Silently handle error rejecting tour
      }
    } catch (error) {
      // Silently handle error rejecting tour
    }
  };

  // Format as KRW (VND / 18)
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    const krwValue = Math.round(Number(price) / 18);
    return new Intl.NumberFormat('ko-KR').format(krwValue) + ' KRW';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
      return date.toLocaleDateString(locale);
    } catch {
      return dateString;
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
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
        return t('admin.tourManagement.durationTemplate', { days, nights });
      }
    }

    // If can't parse, return as is
    return raw;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('admin.tourManagement.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">{t('admin.tourManagement.title')}</p>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.tourManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.tourManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-300">
            <FunnelIcon className="h-5 w-5" />
            {t('admin.tourManagement.advancedFilter')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200">
            <ArrowDownTrayIcon className="h-5 w-5" />
            {t('admin.tourManagement.exportReport')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('admin.tourManagement.stats.totalTours')}</p>
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
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('admin.tourManagement.stats.displayedTours')}</p>
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
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('admin.tourManagement.stats.currentPage')}</p>
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
            {showUpdateRequests ? (
              <input
                type="text"
                value={searchUpdateQuery}
                onChange={(e) => setSearchUpdateQuery(e.target.value)}
                placeholder={t('admin.tourManagement.searchPlaceholder')}
                className="w-full border border-amber-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            ) : showDeleteRequests ? (
              <input
                type="text"
                value={searchDeleteQuery}
                onChange={(e) => setSearchDeleteQuery(e.target.value)}
                placeholder={t('admin.tourManagement.searchPlaceholder')}
                className="w-full border border-red-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            ) : (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(0);
                }}
                placeholder={t('admin.tourManagement.searchPlaceholder')}
                className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {showUpdateRequests ? (
              <select
                value={sortUpdateBy}
                onChange={(e) => setSortUpdateBy(e.target.value)}
                className="border border-amber-300 rounded-lg px-3 py-2 text-sm text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="newest">{t('admin.tourManagement.sortBy.newest')}</option>
                <option value="oldest">{t('admin.tourManagement.sortBy.oldest')}</option>
                <option value="name-asc">{t('admin.tourManagement.sortBy.nameAsc')}</option>
                <option value="name-desc">{t('admin.tourManagement.sortBy.nameDesc')}</option>
              </select>
            ) : showDeleteRequests ? (
              <select
                value={sortDeleteBy}
                onChange={(e) => setSortDeleteBy(e.target.value)}
                className="border border-red-300 rounded-lg px-3 py-2 text-sm text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="newest">{t('admin.tourManagement.sortBy.newest')}</option>
                <option value="oldest">{t('admin.tourManagement.sortBy.oldest')}</option>
                <option value="name-asc">{t('admin.tourManagement.sortBy.nameAsc')}</option>
                <option value="name-desc">{t('admin.tourManagement.sortBy.nameDesc')}</option>
              </select>
            ) : (
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(0);
                }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">{t('admin.tourManagement.sortBy.newest')}</option>
                <option value="oldest">{t('admin.tourManagement.sortBy.oldest')}</option>
                <option value="name-asc">{t('admin.tourManagement.sortBy.nameAsc')}</option>
                <option value="name-desc">{t('admin.tourManagement.sortBy.nameDesc')}</option>
              </select>
            )}
            <button
              onClick={toggleUpdateRequestsView}
              className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${showUpdateRequests
                ? 'bg-amber-500 text-white shadow-[0_8px_20px_rgba(245,158,11,0.35)] hover:bg-amber-600'
                : 'border border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-400'
                }`}
            >
              {/* Red notification dot */}
              {updateRequests.length > 0 && !showUpdateRequests && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              <Edit3 className="h-4 w-4" strokeWidth={1.5} />
              {t('admin.tourManagement.updateRequests.button')}
              {updateRequests.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-white text-amber-600">
                  {updateRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={toggleDeleteRequestsView}
              className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${showDeleteRequests
                ? 'bg-red-500 text-white shadow-[0_8px_20px_rgba(239,68,68,0.35)] hover:bg-red-600'
                : 'border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400'
                }`}
            >
              {/* Red notification dot */}
              {deleteRequests.length > 0 && !showDeleteRequests && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              {t('admin.tourManagement.deleteRequests.button')}
              {deleteRequests.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-white text-red-600">
                  {deleteRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conditional Table Content */}
        {showUpdateRequests ? (
          /* Update Requests Table */
          <div className="overflow-x-auto">
            {loadingUpdateRequests ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 text-amber-500 animate-spin" />
                <span className="ml-2 text-gray-500">{t('admin.tourManagement.loading')}</span>
              </div>
            ) : updateRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Edit3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{t('admin.tourManagement.updateRequests.empty')}</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-amber-50/70">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">{t('admin.tourManagement.updateRequests.tourName')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">{t('admin.tourManagement.updateRequests.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">{t('admin.tourManagement.updateRequests.bookingCount')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">{t('admin.tourManagement.updateRequests.companyNote')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">{t('admin.tourManagement.updateRequests.requestedAt')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">{t('admin.tourManagement.tableHeaders.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {sortedUpdateRequests.map((request, index) => (
                    <tr key={request.id} className="hover:bg-amber-50/40 transition">
                      <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {request.originalTour?.tourImgPath && (
                            <img
                              src={getTourImageUrl(request.originalTour.tourImgPath)}
                              alt={request.originalTour?.tourName || request.updatedTour?.tourName}
                              className="w-10 h-10 rounded-lg object-cover"
                              onError={(e) => { e.target.src = '/default-Tour.jpg'; }}
                            />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{request.originalTour?.tourName || request.updatedTour?.tourName || 'N/A'}</p>
                            <p className="text-xs text-gray-500">ID: {request.originalTourId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${request.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          request.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            request.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                          }`}>
                          {request.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {request.bookingCount || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        <p className="line-clamp-2">{request.companyNote || '-'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN') : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Tooltip text={t('admin.tourManagement.actions.viewDetails')} position="top">
                            <button
                              onClick={() => handleViewDetails(request.originalTourId)}
                              disabled={loadingDetail}
                              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </Tooltip>
                          <Tooltip text={t('admin.tourManagement.updateRequests.approve')} position="top">
                            <button
                              onClick={() => handleApproveUpdateRequest(request)}
                              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 transition"
                            >
                              <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </Tooltip>
                          <Tooltip text={t('admin.tourManagement.updateRequests.reject')} position="top">
                            <button
                              onClick={() => handleRejectUpdateRequest(request)}
                              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition"
                            >
                              <XCircle className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : showDeleteRequests ? (
          /* Delete Requests Table */
          <div className="overflow-x-auto">
            {loadingDeleteRequests ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 text-red-500 animate-spin" />
                <span className="ml-2 text-gray-500">{t('admin.tourManagement.loading')}</span>
              </div>
            ) : deleteRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Trash2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>{t('admin.tourManagement.deleteRequests.empty')}</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-red-50/70">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">{t('admin.tourManagement.deleteRequests.tourName')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">{t('admin.tourManagement.deleteRequests.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">{t('admin.tourManagement.deleteRequests.bookingCount')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">{t('admin.tourManagement.deleteRequests.companyNote')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">{t('admin.tourManagement.deleteRequests.requestedAt')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">{t('admin.tourManagement.tableHeaders.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {sortedDeleteRequests.map((request, index) => (
                    <tr key={request.id} className="hover:bg-red-50/40 transition">
                      <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{request.tourName || 'N/A'}</p>
                            <p className="text-xs text-gray-500">ID: {request.tourId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${request.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          request.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            request.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                          }`}>
                          {request.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {request.bookingCount || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        <p className="line-clamp-2">{request.companyNote || '-'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN') : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Tooltip text={t('admin.tourManagement.actions.viewDetails')} position="top">
                            <button
                              onClick={() => handleViewDetails(request.tourId)}
                              disabled={loadingDetail}
                              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </Tooltip>
                          <Tooltip text={t('admin.tourManagement.deleteRequests.approve')} position="top">
                            <button
                              onClick={() => handleApproveDeleteRequest(request)}
                              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 transition"
                            >
                              <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </Tooltip>
                          <Tooltip text={t('admin.tourManagement.deleteRequests.reject')} position="top">
                            <button
                              onClick={() => handleRejectDeleteRequest(request)}
                              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition"
                            >
                              <XCircle className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Regular Tours Table */
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/70">
                  <tr>
                    {[t('admin.tourManagement.tableHeaders.stt'), t('admin.tourManagement.tableHeaders.tourName'), t('admin.tourManagement.tableHeaders.status'), t('admin.tourManagement.tableHeaders.price'), t('admin.tourManagement.tableHeaders.duration'), t('admin.tourManagement.tableHeaders.createdAt'), t('admin.tourManagement.tableHeaders.actions')].map((header) => (
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
                        {loading ? t('admin.tourManagement.loading') : t('admin.tourManagement.noResults')}
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
                            <Tooltip text={t('admin.tourManagement.actions.viewDetails')} position="top">
                              <button
                                onClick={() => handleViewDetails(tour.tourId || tour.id)}
                                disabled={loadingDetail}
                                className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Eye className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </Tooltip>
                            {(tour.tourStatus || tour.status || '').toUpperCase() !== 'PUBLIC' && (
                              <Tooltip text={t('admin.tourManagement.actions.approve')} position="top">
                                <button
                                  onClick={() => handleApproveTour(tour.tourId || tour.id)}
                                  className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 transition"
                                >
                                  <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </Tooltip>
                            )}
                            {(tour.tourStatus || tour.status || '').toUpperCase() !== 'DISABLED' && (
                              <Tooltip text={t('admin.tourManagement.actions.reject')} position="top">
                                <button
                                  onClick={() => handleRejectTour(tour.tourId || tour.id)}
                                  className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition"
                                >
                                  <XCircle className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </Tooltip>
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
                  Trang {currentPage + 1} / {totalPages} ({filteredAndSortedTours.length} tour)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
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
      />

      {/* Approve Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setTourToApprove(null);
        }}
        onConfirm={confirmApproveTour}
        title={t('admin.tourManagement.approveConfirm.title')}
        message={t('admin.tourManagement.approveConfirm.message', { name: tourToApprove?.title || tourToApprove?.tourName || tourToApprove?.tourId || tourToApprove?.id })}
        itemName={tourToApprove?.title || tourToApprove?.tourName || tourToApprove?.tourId?.toString() || tourToApprove?.id?.toString()}
        confirmText={t('admin.tourManagement.approveConfirm.confirm')}
        cancelText={t('admin.tourManagement.approveConfirm.cancel')}
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
        title={t('admin.tourManagement.rejectConfirm.title')}
        message={t('admin.tourManagement.rejectConfirm.message', { name: tourToReject?.title || tourToReject?.tourName || tourToReject?.tourId || tourToReject?.id })}
        itemName={tourToReject?.title || tourToReject?.tourName || tourToReject?.tourId?.toString() || tourToReject?.id?.toString()}
        confirmText={t('admin.tourManagement.rejectConfirm.confirm')}
        cancelText={t('admin.tourManagement.rejectConfirm.cancel')}
        danger={true}
        icon={<XCircle size={36} strokeWidth={1.5} />}
      />

      {/* Approve Update Request Modal with Note Input */}
      {isApproveUpdateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
                {t('admin.tourManagement.updateRequests.approveConfirm.title')}
              </h3>
              <p className="text-center text-gray-600 mb-4">
                {t('admin.tourManagement.updateRequests.approveConfirm.message', {
                  name: selectedUpdateRequest?.originalTour?.tourName || selectedUpdateRequest?.updatedTour?.tourName || ''
                })}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.tourManagement.updateRequests.noteLabel')}
                </label>
                <textarea
                  value={updateApproveNote}
                  onChange={(e) => setUpdateApproveNote(e.target.value)}
                  placeholder={t('admin.tourManagement.updateRequests.notePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsApproveUpdateModalOpen(false);
                    setSelectedUpdateRequest(null);
                    setUpdateApproveNote('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  {t('admin.tourManagement.updateRequests.approveConfirm.cancel')}
                </button>
                <button
                  onClick={confirmApproveUpdateRequest}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  {t('admin.tourManagement.updateRequests.approveConfirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Update Request Modal with Note Input */}
      {isRejectUpdateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
                {t('admin.tourManagement.updateRequests.rejectConfirm.title')}
              </h3>
              <p className="text-center text-gray-600 mb-4">
                {t('admin.tourManagement.updateRequests.rejectConfirm.message', {
                  name: selectedUpdateRequest?.originalTour?.tourName || selectedUpdateRequest?.updatedTour?.tourName || ''
                })}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.tourManagement.updateRequests.noteLabel')}
                </label>
                <textarea
                  value={updateRejectNote}
                  onChange={(e) => setUpdateRejectNote(e.target.value)}
                  placeholder={t('admin.tourManagement.updateRequests.notePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsRejectUpdateModalOpen(false);
                    setSelectedUpdateRequest(null);
                    setUpdateRejectNote('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  {t('admin.tourManagement.updateRequests.rejectConfirm.cancel')}
                </button>
                <button
                  onClick={confirmRejectUpdateRequest}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  {t('admin.tourManagement.updateRequests.rejectConfirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Delete Request Modal with Note Input */}
      {isApproveDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
                {t('admin.tourManagement.deleteRequests.approveConfirm.title')}
              </h3>
              <p className="text-center text-gray-600 mb-4">
                {t('admin.tourManagement.deleteRequests.approveConfirm.message', {
                  name: selectedDeleteRequest?.tour?.tourName || ''
                })}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.tourManagement.deleteRequests.noteLabel')}
                </label>
                <textarea
                  value={deleteApproveNote}
                  onChange={(e) => setDeleteApproveNote(e.target.value)}
                  placeholder={t('admin.tourManagement.deleteRequests.notePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsApproveDeleteModalOpen(false);
                    setSelectedDeleteRequest(null);
                    setDeleteApproveNote('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  {t('admin.tourManagement.deleteRequests.approveConfirm.cancel')}
                </button>
                <button
                  onClick={confirmApproveDeleteRequest}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  {t('admin.tourManagement.deleteRequests.approveConfirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Delete Request Modal with Note Input */}
      {isRejectDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
                {t('admin.tourManagement.deleteRequests.rejectConfirm.title')}
              </h3>
              <p className="text-center text-gray-600 mb-4">
                {t('admin.tourManagement.deleteRequests.rejectConfirm.message', {
                  name: selectedDeleteRequest?.tour?.tourName || ''
                })}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.tourManagement.deleteRequests.noteLabel')}
                </label>
                <textarea
                  value={deleteRejectNote}
                  onChange={(e) => setDeleteRejectNote(e.target.value)}
                  placeholder={t('admin.tourManagement.deleteRequests.notePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsRejectDeleteModalOpen(false);
                    setSelectedDeleteRequest(null);
                    setDeleteRejectNote('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  {t('admin.tourManagement.deleteRequests.rejectConfirm.cancel')}
                </button>
                <button
                  onClick={confirmRejectDeleteRequest}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  {t('admin.tourManagement.deleteRequests.rejectConfirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tour Status Badge Component
const TourStatusBadge = ({ status }) => {
  const { t } = useTranslation();

  if (!status) {
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
        {t('admin.tourManagement.status.na') || 'N/A'}
      </span>
    );
  }

  const statusUpper = status.toUpperCase();
  const statusMap = {
    'PUBLIC': {
      color: 'bg-green-100 text-green-700',
      label: t('admin.tourManagement.status.approved'),
      icon: Check
    },
    'NOT_APPROVED': {
      color: 'bg-amber-100 text-amber-700',
      label: t('admin.tourManagement.status.pending'),
      icon: Clock
    },
    'DISABLED': {
      color: 'bg-red-100 text-red-700',
      label: t('admin.tourManagement.status.disabled'),
      icon: X
    }
  };

  const map = statusMap[statusUpper] || {
    color: 'bg-gray-100 text-gray-500',
    label: status,
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

export default TourManagement;
