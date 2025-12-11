import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders, getTourImageUrl } from '../../../../../config/api';
import { checkAndHandle401 } from '../../../../../utils/apiErrorHandler';
import TourDetailModal from './TourDetailModal';
import DeleteConfirmModal from '../../../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import Tooltip from '../../../../../components/tooltip/Tooltip';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Package, CheckCircle2, FileText, Eye, CheckCircle, XCircle, Check, Clock, X, Edit3, Trash2, RefreshCw } from 'lucide-react';

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

  // Fetch pending requests counts on page load for notification badges
  useEffect(() => {
    const fetchPendingRequestsCounts = async () => {
      if (!canManageTours) return;
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
  }, [canManageTours, getToken]);

  // Fetch Update Requests
  const fetchUpdateRequests = useCallback(async () => {
    try {
      setLoadingUpdateRequests(true);
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_UPDATE_REQUESTS_PENDING, {
        headers: createAuthHeaders(token)
      });
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

  // Fetch Delete Requests
  const fetchDeleteRequests = useCallback(async () => {
    try {
      setLoadingDeleteRequests(true);
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_DELETE_REQUESTS_PENDING, {
        headers: createAuthHeaders(token)
      });
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

  // Toggle Update Requests View
  const toggleUpdateRequestsView = () => {
    const newState = !showUpdateRequests;
    setShowUpdateRequests(newState);
    if (newState) {
      setShowDeleteRequests(false);
      fetchUpdateRequests();
    }
  };

  // Toggle Delete Requests View
  const toggleDeleteRequestsView = () => {
    const newState = !showDeleteRequests;
    setShowDeleteRequests(newState);
    if (newState) {
      setShowUpdateRequests(false);
      fetchDeleteRequests();
    }
  };

  // Handle Approve Update Request
  const handleApproveUpdateRequest = (request) => {
    setSelectedUpdateRequest(request);
    setUpdateApproveNote('');
    setIsApproveUpdateModalOpen(true);
  };

  // Confirm Approve Update Request
  const confirmApproveUpdateRequest = async () => {
    if (!selectedUpdateRequest) return;
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_UPDATE_REQUEST_APPROVE(selectedUpdateRequest.id), {
        method: 'PUT',
        headers: { ...createAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: updateApproveNote })
      });
      if (response.ok) {
        showSuccess(t('admin.tourManagement.updateRequests.approveSuccess') || 'Update request approved');
        setIsApproveUpdateModalOpen(false);
        setSelectedUpdateRequest(null);
        setUpdateApproveNote('');
        fetchUpdateRequests();
        // Refresh tours list
        const toursResponse = await fetch(API_ENDPOINTS.TOURS, { headers: createAuthHeaders(token) });
        if (toursResponse.ok) {
          const data = await toursResponse.json();
          setTours(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Handle Reject Update Request
  const handleRejectUpdateRequest = (request) => {
    setSelectedUpdateRequest(request);
    setUpdateRejectNote('');
    setIsRejectUpdateModalOpen(true);
  };

  // Confirm Reject Update Request
  const confirmRejectUpdateRequest = async () => {
    if (!selectedUpdateRequest) return;
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_UPDATE_REQUEST_REJECT(selectedUpdateRequest.id), {
        method: 'PUT',
        headers: { ...createAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: updateRejectNote })
      });
      if (response.ok) {
        showSuccess(t('admin.tourManagement.updateRequests.rejectSuccess') || 'Update request rejected');
        setIsRejectUpdateModalOpen(false);
        setSelectedUpdateRequest(null);
        setUpdateRejectNote('');
        fetchUpdateRequests();
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Handle Approve Delete Request
  const handleApproveDeleteRequest = (request) => {
    setSelectedDeleteRequest(request);
    setDeleteApproveNote('');
    setIsApproveDeleteModalOpen(true);
  };

  // Confirm Approve Delete Request
  const confirmApproveDeleteRequest = async () => {
    if (!selectedDeleteRequest) return;
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_DELETE_REQUEST_APPROVE(selectedDeleteRequest.id), {
        method: 'PUT',
        headers: { ...createAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: deleteApproveNote })
      });
      if (response.ok) {
        showSuccess(t('admin.tourManagement.deleteRequests.approveSuccess') || 'Delete request approved');
        setIsApproveDeleteModalOpen(false);
        setSelectedDeleteRequest(null);
        setDeleteApproveNote('');
        fetchDeleteRequests();
        // Refresh tours list
        const toursResponse = await fetch(API_ENDPOINTS.TOURS, { headers: createAuthHeaders(token) });
        if (toursResponse.ok) {
          const data = await toursResponse.json();
          setTours(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Handle Reject Delete Request
  const handleRejectDeleteRequest = (request) => {
    setSelectedDeleteRequest(request);
    setDeleteRejectNote('');
    setIsRejectDeleteModalOpen(true);
  };

  // Confirm Reject Delete Request
  const confirmRejectDeleteRequest = async () => {
    if (!selectedDeleteRequest) return;
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_DELETE_REQUEST_REJECT(selectedDeleteRequest.id), {
        method: 'PUT',
        headers: { ...createAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: deleteRejectNote })
      });
      if (response.ok) {
        showSuccess(t('admin.tourManagement.deleteRequests.rejectSuccess') || 'Delete request rejected');
        setIsRejectDeleteModalOpen(false);
        setSelectedDeleteRequest(null);
        setDeleteRejectNote('');
        fetchDeleteRequests();
      }
    } catch (error) {
      // Silently handle error
    }
  };

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

  // Format as KRW (VND / 18)
  const formatPrice = (price) => {
    if (!price) return t('admin.tourApproval.status.na');
    const krwValue = Math.round(Number(price) / 18);
    return new Intl.NumberFormat('ko-KR').format(krwValue) + ' KRW';
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
            {showUpdateRequests ? (
              <input
                type="text"
                value={searchUpdateQuery}
                onChange={(e) => setSearchUpdateQuery(e.target.value)}
                placeholder={t('admin.tourApproval.filters.searchPlaceholder')}
                className="w-full border border-amber-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            ) : showDeleteRequests ? (
              <input
                type="text"
                value={searchDeleteQuery}
                onChange={(e) => setSearchDeleteQuery(e.target.value)}
                placeholder={t('admin.tourApproval.filters.searchPlaceholder')}
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
                placeholder={t('admin.tourApproval.filters.searchPlaceholder')}
                className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Status filter - only show for default tours table */}
            {!showUpdateRequests && !showDeleteRequests && (
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
            )}
            {/* Sort dropdown - conditional based on active table */}
            {showUpdateRequests ? (
              <select
                value={sortUpdateBy}
                onChange={(e) => setSortUpdateBy(e.target.value)}
                className="border border-amber-300 rounded-lg px-3 py-2 text-sm text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="newest">{t('admin.tourApproval.filters.sortBy.newest')}</option>
                <option value="oldest">{t('admin.tourApproval.filters.sortBy.oldest')}</option>
                <option value="name-asc">{t('admin.tourApproval.filters.sortBy.nameAsc')}</option>
                <option value="name-desc">{t('admin.tourApproval.filters.sortBy.nameDesc')}</option>
              </select>
            ) : showDeleteRequests ? (
              <select
                value={sortDeleteBy}
                onChange={(e) => setSortDeleteBy(e.target.value)}
                className="border border-red-300 rounded-lg px-3 py-2 text-sm text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="newest">{t('admin.tourApproval.filters.sortBy.newest')}</option>
                <option value="oldest">{t('admin.tourApproval.filters.sortBy.oldest')}</option>
                <option value="name-asc">{t('admin.tourApproval.filters.sortBy.nameAsc')}</option>
                <option value="name-desc">{t('admin.tourApproval.filters.sortBy.nameDesc')}</option>
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
                <option value="newest">{t('admin.tourApproval.filters.sortBy.newest')}</option>
                <option value="oldest">{t('admin.tourApproval.filters.sortBy.oldest')}</option>
                <option value="name-asc">{t('admin.tourApproval.filters.sortBy.nameAsc')}</option>
                <option value="name-desc">{t('admin.tourApproval.filters.sortBy.nameDesc')}</option>
              </select>
            )}
            {/* Update Requests Button */}
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
            {/* Delete Requests Button */}
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
                    {['STT', t('admin.tourManagement.updateRequests.tourName'), t('admin.tourManagement.updateRequests.status'), t('admin.tourManagement.updateRequests.bookingCount'), t('admin.tourManagement.updateRequests.companyNote'), t('admin.tourManagement.updateRequests.requestedAt'), t('admin.tourApproval.table.headers.actions')].map((header) => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
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
                              alt={request.originalTour?.tourName}
                              className="w-10 h-10 rounded-lg object-cover"
                              onError={(e) => { e.target.src = '/default-Tour.jpg'; }}
                            />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{request.originalTour?.tourName || 'N/A'}</p>
                            <p className="text-xs text-gray-500">ID: {request.originalTour?.tourId || request.originalTourId}</p>
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
                          <Tooltip text={t('admin.tourApproval.actions.viewDetails')} position="top">
                            <button
                              onClick={() => handleViewDetails(request.originalTour?.tourId || request.originalTourId)}
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
                    {['STT', t('admin.tourManagement.deleteRequests.tourName'), t('admin.tourManagement.deleteRequests.status'), t('admin.tourManagement.deleteRequests.bookingCount'), t('admin.tourManagement.deleteRequests.companyNote'), t('admin.tourManagement.deleteRequests.requestedAt'), t('admin.tourApproval.table.headers.actions')].map((header) => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-red-700 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
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
                          <Tooltip text={t('admin.tourApproval.actions.viewDetails')} position="top">
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
        )}

        {/* Pagination */}
        {!showUpdateRequests && !showDeleteRequests && filteredAndSortedTours.length >= 10 && totalPages > 1 && (
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

      {/* Update Request Approve Modal - Minimal Soft Korean Style */}
      {isApproveUpdateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
        >
          <div
            className="w-full max-w-md overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)', borderRadius: '28px', boxShadow: '0 25px 80px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0, 0, 0, 0.04)' }}
          >
            <div style={{ padding: '32px 28px 28px' }}>
              <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <CheckCircle style={{ width: '28px', height: '28px', color: '#10b981', strokeWidth: '1.5' }} />
              </div>
              <h3 className="text-center mb-2" style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a2e', letterSpacing: '-0.02em' }}>
                {t('admin.tourManagement.updateRequests.approveConfirm.title')}
              </h3>
              <p className="text-center mb-5" style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                {t('admin.tourManagement.updateRequests.approveConfirm.message')}
              </p>
              <div style={{ marginBottom: '24px' }}>
                <label className="block mb-2" style={{ fontSize: '13px', fontWeight: '500', color: '#4b5563', letterSpacing: '-0.01em' }}>{t('admin.tourManagement.updateRequests.noteLabel')}</label>
                <textarea
                  value={updateApproveNote}
                  onChange={(e) => setUpdateApproveNote(e.target.value)}
                  placeholder={t('admin.tourManagement.updateRequests.notePlaceholder')}
                  rows={3}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fafbfc', fontSize: '14px', color: '#374151', resize: 'none', outline: 'none', transition: 'all 0.2s ease', lineHeight: '1.5' }}
                  onFocus={(e) => { e.target.style.borderColor = '#86efac'; e.target.style.boxShadow = '0 0 0 4px rgba(134, 239, 172, 0.15)'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafbfc'; }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsApproveUpdateModalOpen(false)}
                  style={{ padding: '14px 24px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb'; }}
                >{t('common.cancel')}</button>
                <button
                  onClick={confirmApproveUpdateRequest}
                  style={{ padding: '14px 24px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)' }}
                  onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.35)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.25)'; }}
                >{t('common.confirm')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Request Reject Modal - Minimal Soft Korean Style */}
      {isRejectUpdateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
        >
          <div
            className="w-full max-w-md overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)', borderRadius: '28px', boxShadow: '0 25px 80px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0, 0, 0, 0.04)' }}
          >
            <div style={{ padding: '32px 28px 28px' }}>
              <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'linear-gradient(145deg, #fef2f2 0%, #fecaca 100%)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <XCircle style={{ width: '28px', height: '28px', color: '#ef4444', strokeWidth: '1.5' }} />
              </div>
              <h3 className="text-center mb-2" style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a2e', letterSpacing: '-0.02em' }}>
                {t('admin.tourManagement.updateRequests.rejectConfirm.title')}
              </h3>
              <p className="text-center mb-5" style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                {t('admin.tourManagement.updateRequests.rejectConfirm.message')}
              </p>
              <div style={{ marginBottom: '24px' }}>
                <label className="block mb-2" style={{ fontSize: '13px', fontWeight: '500', color: '#4b5563', letterSpacing: '-0.01em' }}>{t('admin.tourManagement.updateRequests.noteLabel')}</label>
                <textarea
                  value={updateRejectNote}
                  onChange={(e) => setUpdateRejectNote(e.target.value)}
                  placeholder={t('admin.tourManagement.updateRequests.notePlaceholder')}
                  rows={3}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fafbfc', fontSize: '14px', color: '#374151', resize: 'none', outline: 'none', transition: 'all 0.2s ease', lineHeight: '1.5' }}
                  onFocus={(e) => { e.target.style.borderColor = '#fca5a5'; e.target.style.boxShadow = '0 0 0 4px rgba(252, 165, 165, 0.15)'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafbfc'; }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsRejectUpdateModalOpen(false)}
                  style={{ padding: '14px 24px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb'; }}
                >{t('common.cancel')}</button>
                <button
                  onClick={confirmRejectUpdateRequest}
                  style={{ padding: '14px 24px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)' }}
                  onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.35)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.25)'; }}
                >{t('common.confirm')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Request Approve Modal - Minimal Soft Korean Style */}
      {isApproveDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
        >
          <div
            className="w-full max-w-md overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)', borderRadius: '28px', boxShadow: '0 25px 80px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0, 0, 0, 0.04)' }}
          >
            <div style={{ padding: '32px 28px 28px' }}>
              <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <CheckCircle style={{ width: '28px', height: '28px', color: '#10b981', strokeWidth: '1.5' }} />
              </div>
              <h3 className="text-center mb-2" style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a2e', letterSpacing: '-0.02em' }}>
                {t('admin.tourManagement.deleteRequests.approveConfirm.title')}
              </h3>
              <p className="text-center mb-5" style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                {t('admin.tourManagement.deleteRequests.approveConfirm.message')}
              </p>
              <div style={{ marginBottom: '24px' }}>
                <label className="block mb-2" style={{ fontSize: '13px', fontWeight: '500', color: '#4b5563', letterSpacing: '-0.01em' }}>{t('admin.tourManagement.deleteRequests.noteLabel')}</label>
                <textarea
                  value={deleteApproveNote}
                  onChange={(e) => setDeleteApproveNote(e.target.value)}
                  placeholder={t('admin.tourManagement.deleteRequests.notePlaceholder')}
                  rows={3}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fafbfc', fontSize: '14px', color: '#374151', resize: 'none', outline: 'none', transition: 'all 0.2s ease', lineHeight: '1.5' }}
                  onFocus={(e) => { e.target.style.borderColor = '#86efac'; e.target.style.boxShadow = '0 0 0 4px rgba(134, 239, 172, 0.15)'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafbfc'; }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsApproveDeleteModalOpen(false)}
                  style={{ padding: '14px 24px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb'; }}
                >{t('common.cancel')}</button>
                <button
                  onClick={confirmApproveDeleteRequest}
                  style={{ padding: '14px 24px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)' }}
                  onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.35)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.25)'; }}
                >{t('common.confirm')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Request Reject Modal - Minimal Soft Korean Style */}
      {isRejectDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
        >
          <div
            className="w-full max-w-md overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)', borderRadius: '28px', boxShadow: '0 25px 80px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0, 0, 0, 0.04)' }}
          >
            <div style={{ padding: '32px 28px 28px' }}>
              <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'linear-gradient(145deg, #fef2f2 0%, #fecaca 100%)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <XCircle style={{ width: '28px', height: '28px', color: '#ef4444', strokeWidth: '1.5' }} />
              </div>
              <h3 className="text-center mb-2" style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a2e', letterSpacing: '-0.02em' }}>
                {t('admin.tourManagement.deleteRequests.rejectConfirm.title')}
              </h3>
              <p className="text-center mb-5" style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                {t('admin.tourManagement.deleteRequests.rejectConfirm.message')}
              </p>
              <div style={{ marginBottom: '24px' }}>
                <label className="block mb-2" style={{ fontSize: '13px', fontWeight: '500', color: '#4b5563', letterSpacing: '-0.01em' }}>{t('admin.tourManagement.deleteRequests.noteLabel')}</label>
                <textarea
                  value={deleteRejectNote}
                  onChange={(e) => setDeleteRejectNote(e.target.value)}
                  placeholder={t('admin.tourManagement.deleteRequests.notePlaceholder')}
                  rows={3}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fafbfc', fontSize: '14px', color: '#374151', resize: 'none', outline: 'none', transition: 'all 0.2s ease', lineHeight: '1.5' }}
                  onFocus={(e) => { e.target.style.borderColor = '#fca5a5'; e.target.style.boxShadow = '0 0 0 4px rgba(252, 165, 165, 0.15)'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafbfc'; }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsRejectDeleteModalOpen(false)}
                  style={{ padding: '14px 24px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb'; }}
                >{t('common.cancel')}</button>
                <button
                  onClick={confirmRejectDeleteRequest}
                  style={{ padding: '14px 24px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)' }}
                  onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.35)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.25)'; }}
                >{t('common.confirm')}</button>
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
