import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders, getTourImageUrl } from '../../../../../config/api';
import { checkAndHandle401 } from '../../../../../utils/apiErrorHandler';
import TourDetailModal from './TourDetailModal';
import DeleteConfirmModal from '../../../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import Tooltip from '../../../../../components/tooltip/Tooltip';
import { Package, CheckCircle2, FileText, Eye, CheckCircle, XCircle, Check, Clock, X, Edit3, Trash2, RefreshCw, AlertTriangle, Search } from 'lucide-react';

const TourApproval = () => {
  const { t, i18n } = useTranslation();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useToast();

  // Kiểm tra user có permission để manage tours không: check staffTask === 'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE' hoặc role === 'ADMIN'
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

  // Update Requests State: showUpdateRequests, updateRequests, loadingUpdateRequests, selectedUpdateRequest, modal states, approve/reject notes, search và sort states
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

  // Delete Requests State: showDeleteRequests, deleteRequests, loadingDeleteRequests, selectedDeleteRequest, modal states, approve/reject notes, search và sort states
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

  // Booking dropdown state
  const [expandedUpdateRequestId, setExpandedUpdateRequestId] = useState(null);
  const [expandedDeleteRequestId, setExpandedDeleteRequestId] = useState(null);
  const [updateRequestBookingPages, setUpdateRequestBookingPages] = useState({});
  const [deleteRequestBookingPages, setDeleteRequestBookingPages] = useState({});
  const BOOKINGS_PER_PAGE = 5;

  // Fetch tours từ API: gọi TOURS endpoint, handle different response formats (array, result, content, data), không gọi checkAndHandle401 trong background loading (skip401Check = true) để tránh premature logout, set tours state
  const fetchTours = useCallback(async (skip401Check = false) => {
    if (!canManageTours) return;

    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOURS, {
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        if (!skip401Check) {
          await checkAndHandle401(response);
        }
        return;
      }

      if (response.ok) {
        const data = await response.json();
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
        setError('');
      } else {
        setError(t('admin.tourApproval.error.loadTours'));
      }
    } catch (error) {
      setError(t('admin.tourApproval.error.loadTours'));
    } finally {
      setLoading(false);
    }
  }, [canManageTours, getToken, t]);

  // Fetch tours khi component mount: gọi fetchTours với skip401Check = true để tránh premature logout trong background loading
  useEffect(() => {
    fetchTours(true);
  }, [fetchTours]);

  // Fetch pending requests counts khi page load cho notification badges: fetch update requests và delete requests từ API, không gọi checkAndHandle401 trong background loading, set updateRequests và deleteRequests state
  useEffect(() => {
    const fetchPendingRequestsCounts = async () => {
      if (!canManageTours) return;
      const token = getToken();
      if (!token) return;

      try {
        const updateResponse = await fetch(API_ENDPOINTS.TOUR_UPDATE_REQUESTS_PENDING, {
          headers: createAuthHeaders(token)
        });
        if (!updateResponse.ok && updateResponse.status === 401) {
          return;
        }
        if (updateResponse.ok) {
          const data = await updateResponse.json();
          setUpdateRequests(Array.isArray(data) ? data : []);
        }

        const deleteResponse = await fetch(API_ENDPOINTS.TOUR_DELETE_REQUESTS_PENDING, {
          headers: createAuthHeaders(token)
        });
        if (!deleteResponse.ok && deleteResponse.status === 401) {
          return;
        }
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

  // Fetch Update Requests: gọi TOUR_UPDATE_REQUESTS_PENDING endpoint, set updateRequests state, handle 401, set loadingUpdateRequests state
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

  // Fetch Delete Requests: gọi TOUR_DELETE_REQUESTS_PENDING endpoint, set deleteRequests state, handle 401, set loadingDeleteRequests state
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

  // Toggle Update Requests View: toggle showUpdateRequests state, nếu mở thì đóng Delete Requests View và fetch update requests
  const toggleUpdateRequestsView = () => {
    const newState = !showUpdateRequests;
    setShowUpdateRequests(newState);
    if (newState) {
      setShowDeleteRequests(false);
      fetchUpdateRequests();
    }
  };

  // Toggle Delete Requests View: toggle showDeleteRequests state, nếu mở thì đóng Update Requests View và fetch delete requests
  const toggleDeleteRequestsView = () => {
    const newState = !showDeleteRequests;
    setShowDeleteRequests(newState);
    if (newState) {
      setShowUpdateRequests(false);
      fetchDeleteRequests();
    }
  };

  // Xử lý approve update request: set selectedUpdateRequest, clear updateApproveNote, mở approve modal
  const handleApproveUpdateRequest = (request) => {
    setSelectedUpdateRequest(request);
    setUpdateApproveNote('');
    setIsApproveUpdateModalOpen(true);
  };

  // Confirm approve update request: gọi TOUR_UPDATE_REQUEST_APPROVE endpoint với PUT, refresh update requests list và tours list sau khi thành công, handle 401, show success toast
  const confirmApproveUpdateRequest = async () => {
    if (!selectedUpdateRequest) return;
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_UPDATE_REQUEST_APPROVE(selectedUpdateRequest.id), {
        method: 'PUT',
        headers: { ...createAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: updateApproveNote })
      });
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }
      if (response.ok) {
        showSuccess(t('admin.tourManagement.updateRequests.approveSuccess') || 'Update request approved');
        setIsApproveUpdateModalOpen(false);
        setSelectedUpdateRequest(null);
        setUpdateApproveNote('');
        fetchUpdateRequests();
        // Refresh tours list
        const toursResponse = await fetch(API_ENDPOINTS.TOURS, { headers: createAuthHeaders(token) });
        if (!toursResponse.ok && toursResponse.status === 401) {
          await checkAndHandle401(toursResponse);
          return;
        }
        if (toursResponse.ok) {
          const data = await toursResponse.json();
          setTours(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Xử lý reject update request: set selectedUpdateRequest, clear updateRejectNote, mở reject modal
  const handleRejectUpdateRequest = (request) => {
    setSelectedUpdateRequest(request);
    setUpdateRejectNote('');
    setIsRejectUpdateModalOpen(true);
  };

  // Confirm reject update request: gọi TOUR_UPDATE_REQUEST_REJECT endpoint với PUT, refresh update requests list sau khi thành công, handle 401, show success toast
  const confirmRejectUpdateRequest = async () => {
    if (!selectedUpdateRequest) return;
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_UPDATE_REQUEST_REJECT(selectedUpdateRequest.id), {
        method: 'PUT',
        headers: { ...createAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: updateRejectNote })
      });
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }
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

  // Xử lý approve delete request: set selectedDeleteRequest, clear deleteApproveNote, mở approve modal
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
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }
      if (response.ok) {
        showSuccess(t('admin.tourManagement.deleteRequests.approveSuccess') || 'Delete request approved');
        setIsApproveDeleteModalOpen(false);
        setSelectedDeleteRequest(null);
        setDeleteApproveNote('');
        fetchDeleteRequests();
        const toursResponse = await fetch(API_ENDPOINTS.TOURS, { headers: createAuthHeaders(token) });
        if (!toursResponse.ok && toursResponse.status === 401) {
          await checkAndHandle401(toursResponse);
          return;
        }
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

  // Confirm reject delete request: gọi TOUR_DELETE_REQUEST_REJECT endpoint với PUT, refresh delete requests list sau khi thành công, handle 401, show success toast
  const confirmRejectDeleteRequest = async () => {
    if (!selectedDeleteRequest) return;
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_DELETE_REQUEST_REJECT(selectedDeleteRequest.id), {
        method: 'PUT',
        headers: { ...createAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: deleteRejectNote })
      });
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }
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

  // Filter và sort tours: filter theo status (all, NOT_APPROVED, APPROVED, REJECTED), search filter (title, description, departurePoint), sort (newest, oldest, name-asc, name-desc), return filtered và sorted tours array
  const filteredAndSortedTours = useMemo(() => {
    let filtered = [...tours];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => {
        const status = (t.tourStatus || t.status || '').toUpperCase();
        return status === statusFilter.toUpperCase();
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tour => {
        const title = (tour.title || tour.tourName || '').toLowerCase();
        const desc = (tour.shortDescription || tour.tourDescription || '').toLowerCase();
        const departure = (tour.departurePoint || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || departure.includes(query);
      });
    }

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

  // Paginate tours: tính totalPages, slice filteredAndSortedTours theo currentPage và pageSize, return paginated tours array
  const paginatedTours = useMemo(() => {
    const total = Math.ceil(filteredAndSortedTours.length / pageSize);
    setTotalPages(total);
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedTours.slice(startIndex, endIndex);
  }, [filteredAndSortedTours, currentPage, pageSize]);

  // Filter và sort update requests: search filter (tourName, companyNote), sort (newest, oldest, name-asc, name-desc), return filtered và sorted update requests array
  const sortedUpdateRequests = useMemo(() => {
    let filtered = [...updateRequests];

    if (searchUpdateQuery.trim()) {
      const query = searchUpdateQuery.toLowerCase();
      filtered = filtered.filter(request => {
        const tourName = (request.originalTour?.tourName || '').toLowerCase();
        const companyNote = (request.companyNote || '').toLowerCase();
        return tourName.includes(query) || companyNote.includes(query);
      });
    }

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

  // Filter và sort delete requests: search filter (tourName, companyNote), sort (newest, oldest, name-asc, name-desc), return filtered và sorted delete requests array
  const sortedDeleteRequests = useMemo(() => {
    let filtered = [...deleteRequests];

    if (searchDeleteQuery.trim()) {
      const query = searchDeleteQuery.toLowerCase();
      filtered = filtered.filter(request => {
        const tourName = (request.tourName || '').toLowerCase();
        const companyNote = (request.companyNote || '').toLowerCase();
        return tourName.includes(query) || companyNote.includes(query);
      });
    }

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

  // Xử lý view details: nếu có updateRequestData thì dùng originalTour từ updateRequest (không cần fetch từ database), nếu không thì fetch tour từ TOUR_BY_ID endpoint, set selectedTour và mở detail modal, handle 401
  const handleViewDetails = async (tourId, updateRequestData = null) => {
    try {
      setLoadingDetail(true);
      
      if (updateRequestData && updateRequestData.originalTour) {
        setSelectedTour({
          ...updateRequestData.originalTour,
          _updateRequest: updateRequestData
        });
        setIsDetailModalOpen(true);
        setLoadingDetail(false);
        return;
      }

      // Otherwise, fetch tour from database (normal view)
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

  // Confirm approve tour: gọi TOURS/change-status endpoint với PUT và status=PUBLIC, refresh tours list sau khi thành công, handle different response formats, handle 401, show success toast, đóng modal
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
        if (!refreshResponse.ok && refreshResponse.status === 401) {
          await checkAndHandle401(refreshResponse);
          return;
        }
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
      setError(t('admin.tourApproval.error.approveGeneric'));
    }
  };

  // Xử lý reject tour: tìm tour trong tours list, set tourToReject và mở reject modal
  const handleRejectTour = (tourId) => {
    const tour = tours.find(t => (t.tourId || t.id) === tourId) || { tourId: tourId || tour.id };
    setTourToReject(tour);
    setIsRejectModalOpen(true);
  };

  // Confirm reject tour: gọi TOURS/change-status endpoint với PUT và status=DISABLED, refresh tours list sau khi thành công, handle different response formats, handle 401, show success toast, đóng modal
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
        if (!refreshResponse.ok && refreshResponse.status === 401) {
          await checkAndHandle401(refreshResponse);
          return;
        }
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
      setError(t('admin.tourApproval.error.rejectGeneric'));
    }
  };

  // Format price sang VND: giữ nguyên giá trị, không chia cho 18
  const formatPrice = (price) => {
    if (!price) return t('admin.tourApproval.status.na');
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(Number(price));
  };

  // Format date: format dateString với locale dựa trên i18n.language (ko-KR, en-US, vi-VN), return 'N/A' nếu không hợp lệ
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

  // Format duration: parse "X ngày Y đêm" hoặc "X days Y nights" hoặc "X일 Y박" format, return formatted string với i18n template, nếu không parse được thì return raw string
  const formatDuration = (duration) => {
    if (!duration) return t('admin.tourApproval.status.na');
    const raw = String(duration);

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

  // Format booking date
  const formatBookingDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  // Format booking datetime: format dateString với locale dựa trên i18n.language (ko-KR, en-US, vi-VN), bao gồm hour và minute, return 'N/A' nếu không hợp lệ
  const formatBookingDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
      return date.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Toggle update request booking dropdown
  const toggleUpdateRequestBooking = (requestId) => {
    if (expandedUpdateRequestId === requestId) {
      setExpandedUpdateRequestId(null);
    } else {
      setExpandedUpdateRequestId(requestId);
      if (!updateRequestBookingPages[requestId]) {
        setUpdateRequestBookingPages(prev => ({ ...prev, [requestId]: 0 }));
      }
    }
  };

  // Toggle delete request booking dropdown: toggle expandedDeleteRequestId, nếu mở thì init booking page = 0 cho requestId đó
  const toggleDeleteRequestBooking = (requestId) => {
    if (expandedDeleteRequestId === requestId) {
      setExpandedDeleteRequestId(null);
    } else {
      setExpandedDeleteRequestId(requestId);
      if (!deleteRequestBookingPages[requestId]) {
        setDeleteRequestBookingPages(prev => ({ ...prev, [requestId]: 0 }));
      }
    }
  };

  // Get paginated bookings for update request
  const getPaginatedUpdateBookings = (bookings, requestId) => {
    if (!bookings || bookings.length === 0) return [];
    const page = updateRequestBookingPages[requestId] || 0;
    const startIndex = page * BOOKINGS_PER_PAGE;
    const endIndex = startIndex + BOOKINGS_PER_PAGE;
    return bookings.slice(startIndex, endIndex);
  };

  // Get paginated bookings for delete request
  const getPaginatedDeleteBookings = (bookings, requestId) => {
    if (!bookings || bookings.length === 0) return [];
    const page = deleteRequestBookingPages[requestId] || 0;
    const startIndex = page * BOOKINGS_PER_PAGE;
    const endIndex = startIndex + BOOKINGS_PER_PAGE;
    return bookings.slice(startIndex, endIndex);
  };

  // Get total pages for bookings
  const getBookingTotalPages = (bookings) => {
    if (!bookings || bookings.length === 0) return 0;
    return Math.ceil(bookings.length / BOOKINGS_PER_PAGE);
  };

  // Get color code for booking status badge (same as BookingManagement)
  const getBookingStatusColor = (status) => {
    const normalizedStatus = String(status || '').toUpperCase().replace(/ /g, '_');
    
    const colorMap = {
      PENDING_PAYMENT: '#F97316',              // Orange
      PENDING_DEPOSIT_PAYMENT: '#EA580C',      // Orange darker
      PENDING_BALANCE_PAYMENT: '#F59E0B',      // Amber
      WAITING_FOR_APPROVED: '#3B82F6',        // Blue
      WAITING_FOR_UPDATE: '#8B5CF6',           // Purple
      BOOKING_REJECTED: '#EF4444',            // Red
      BOOKING_FAILED: '#DC2626',              // Red darker
      BOOKING_BALANCE_SUCCESS: '#14B8A6',     // Teal
      BOOKING_SUCCESS_PENDING: '#06B6D4',     // Cyan
      BOOKING_SUCCESS_WAIT_FOR_CONFIRMED: '#2563EB', // Blue darker
      BOOKING_UNDER_COMPLAINT: '#EAB308',      // Yellow
      BOOKING_SUCCESS: '#10B981',             // Green
      BOOKING_CANCELLED: '#9CA3AF'            // Gray
    };
    
    return colorMap[normalizedStatus] || '#6B7280';
  };

  // Format booking status for display
  const formatBookingStatusDisplay = (status = '') => {
    if (!status) return 'N/A';
    const translationKey = `bookingManagement.status.${status}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : status.replaceAll('_', ' ');
  };

  // Check if user has permission
  if (user && !canManageTours) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="max-w-md w-full rounded-[32px] bg-white border p-10 text-center shadow-sm" style={{ borderColor: '#F0F0F0' }}>
          <div className="w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#DCFCE7' }}>
            <AlertTriangle className="h-7 w-7" style={{ color: '#15803D' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">{t('admin.tourApproval.permissionDenied.title')}</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            {t('admin.tourApproval.permissionDenied.message')}
          </p>
          <button
            onClick={() => navigate('/staff/tasks')}
            className="w-full px-6 py-3 rounded-[24px] text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: '#66B3FF' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4DA3FF'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#66B3FF'}
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#66B3FF' }}></div>
          <p className="mt-4 text-gray-600">{t('admin.tourApproval.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="mb-6 px-4 py-3 rounded-[20px] text-sm" style={{ backgroundColor: '#FFE6F0', borderColor: '#FFB3B3', color: '#FF80B3', borderWidth: '1px', borderStyle: 'solid' }}>
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>{t('admin.tourApproval.title')}</p>
          <h1 className="text-3xl font-semibold text-gray-800">{t('admin.tourApproval.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.tourApproval.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[28px] border p-6 shadow-sm" style={{ borderColor: '#F0F0F0', backgroundColor: '#E6F3FF' }}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="h-14 w-14 rounded-[20px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                <Package className="h-7 w-7" style={{ color: '#66B3FF' }} strokeWidth={1.5} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-gray-800">{tours.length}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{t('admin.tourApproval.stats.totalTours')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[28px] border p-6 shadow-sm" style={{ borderColor: '#F0F0F0', backgroundColor: '#DCFCE7' }}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="h-14 w-14 rounded-[20px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: '#15803D' }} strokeWidth={1.5} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-gray-800">{filteredAndSortedTours.length}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{t('admin.tourApproval.stats.displayedTours')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[28px] border p-6 shadow-sm" style={{ borderColor: '#F0F0F0', backgroundColor: '#F0E6FF' }}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="h-14 w-14 rounded-[20px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                <FileText className="h-7 w-7" style={{ color: '#B380FF' }} strokeWidth={1.5} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-gray-800">
                  {currentPage + 1} / {totalPages || 1}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{t('admin.tourApproval.stats.currentPage')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[28px] shadow-sm border" style={{ borderColor: '#F0F0F0' }}>
        <div className="flex flex-col gap-3 p-5 border-b lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: '#F0F0F0' }}>
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" strokeWidth={1.5} />
            {showUpdateRequests ? (
              <input
                type="text"
                value={searchUpdateQuery}
                onChange={(e) => setSearchUpdateQuery(e.target.value)}
                placeholder={t('admin.tourApproval.filters.searchPlaceholder')}
                className="w-full border rounded-[20px] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/30 bg-white"
                style={{ borderColor: '#FFE5CC' }}
              />
            ) : showDeleteRequests ? (
              <input
                type="text"
                value={searchDeleteQuery}
                onChange={(e) => setSearchDeleteQuery(e.target.value)}
                placeholder={t('admin.tourApproval.filters.searchPlaceholder')}
                className="w-full border rounded-[20px] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF80B3]/30 bg-white"
                style={{ borderColor: '#FFB3B3' }}
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
                className="w-full border rounded-[20px] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
                style={{ borderColor: '#E0E0E0' }}
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
                className="border rounded-[20px] px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
                style={{ borderColor: '#E0E0E0' }}
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
                className="border rounded-[20px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/30 bg-white"
                style={{ borderColor: '#FFE5CC', color: '#FFB84D' }}
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
                className="border rounded-[20px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF80B3]/30 bg-white"
                style={{ borderColor: '#FFB3B3', color: '#FF80B3' }}
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
                className="border rounded-[20px] px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
                style={{ borderColor: '#E0E0E0' }}
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
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-[20px] text-sm font-semibold transition-all duration-200"
              style={showUpdateRequests
                ? { backgroundColor: '#FFB84D', color: '#FFFFFF' }
                : { borderColor: '#FFE5CC', color: '#FFB84D', backgroundColor: '#FFF4E6', borderWidth: '1px', borderStyle: 'solid' }
              }
              onMouseEnter={(e) => {
                if (!showUpdateRequests) {
                  e.target.style.backgroundColor = '#FFEDD5';
                } else {
                  e.target.style.backgroundColor = '#FFA726';
                }
              }}
              onMouseLeave={(e) => {
                if (!showUpdateRequests) {
                  e.target.style.backgroundColor = '#FFF4E6';
                } else {
                  e.target.style.backgroundColor = '#FFB84D';
                }
              }}
            >
              {/* Red notification dot */}
              {updateRequests.length > 0 && !showUpdateRequests && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#FF80B3' }}></span>
                  <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: '#FF80B3' }}></span>
                </span>
              )}
              <Edit3 className="h-4 w-4" strokeWidth={1.5} />
              {t('admin.tourManagement.updateRequests.button')}
              {updateRequests.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full" style={{ backgroundColor: showUpdateRequests ? '#FFFFFF' : '#FFB84D', color: showUpdateRequests ? '#FFB84D' : '#FFFFFF' }}>
                  {updateRequests.length}
                </span>
              )}
            </button>
            {/* Delete Requests Button */}
            <button
              onClick={toggleDeleteRequestsView}
              className="relative inline-flex items-center gap-2 px-4 py-2 rounded-[20px] text-sm font-semibold transition-all duration-200"
              style={showDeleteRequests
                ? { backgroundColor: '#FF80B3', color: '#FFFFFF' }
                : { borderColor: '#FFB3B3', color: '#FF80B3', backgroundColor: '#FFE6F0', borderWidth: '1px', borderStyle: 'solid' }
              }
              onMouseEnter={(e) => {
                if (!showDeleteRequests) {
                  e.target.style.backgroundColor = '#FFD9E8';
                } else {
                  e.target.style.backgroundColor = '#FF66A3';
                }
              }}
              onMouseLeave={(e) => {
                if (!showDeleteRequests) {
                  e.target.style.backgroundColor = '#FFE6F0';
                } else {
                  e.target.style.backgroundColor = '#FF80B3';
                }
              }}
            >
              {/* Red notification dot */}
              {deleteRequests.length > 0 && !showDeleteRequests && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#FF80B3' }}></span>
                  <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: '#FF80B3' }}></span>
                </span>
              )}
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              {t('admin.tourManagement.deleteRequests.button')}
              {deleteRequests.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full" style={{ backgroundColor: showDeleteRequests ? '#FFFFFF' : '#FF80B3', color: showDeleteRequests ? '#FF80B3' : '#FFFFFF' }}>
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
              <div className="bg-white rounded-[28px] overflow-hidden border shadow-sm" style={{ borderColor: '#FFE5CC' }}>
                <table className="min-w-full divide-y" style={{ borderColor: '#FFE5CC' }}>
                  <thead style={{ backgroundColor: '#FFF4E6' }}>
                    <tr>
                      {['STT', t('admin.tourManagement.updateRequests.tourName'), t('admin.tourManagement.updateRequests.status'), t('admin.tourManagement.updateRequests.bookingCount'), t('admin.tourManagement.updateRequests.companyNote'), t('admin.tourManagement.updateRequests.requestedAt'), t('admin.tourApproval.table.headers.actions')].map((header) => (
                        <th key={header} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFB84D' }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y" style={{ borderColor: '#FFE5CC' }}>
                  {sortedUpdateRequests.map((request, index) => {
                    const isExpanded = expandedUpdateRequestId === request.id;
                    const bookings = request.bookings || [];
                    const paginatedBookings = getPaginatedUpdateBookings(bookings, request.id);
                    const totalBookingPages = getBookingTotalPages(bookings);
                    const currentBookingPage = updateRequestBookingPages[request.id] || 0;

                    return (
                      <React.Fragment key={request.id}>
                        <tr 
                          className="transition-all duration-200 cursor-pointer"
                          style={{ backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF4E6'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => toggleUpdateRequestBooking(request.id)}
                        >
                          <td className="px-6 py-5 text-sm" style={{ color: '#FFB84D' }}>{index + 1}</td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              {request.originalTour?.tourImgPath && (
                                <img
                                  src={getTourImageUrl(request.originalTour.tourImgPath)}
                                  alt={request.originalTour?.tourName}
                                  className="w-12 h-12 rounded-[16px] object-cover"
                                  onError={(e) => { e.target.src = '/default-Tour.jpg'; }}
                                />
                              )}
                              <div>
                                <p className="font-medium text-[#5A4A3A]">{request.originalTour?.tourName || 'N/A'}</p>
                                <p className="text-xs text-[#A6927A]">ID: {request.originalTour?.tourId || request.originalTourId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex px-3 py-1.5 text-xs font-semibold rounded-[20px]" style={
                              request.status === 'PENDING' ? { backgroundColor: '#FFF4E6', color: '#FFB84D' } :
                              request.status === 'APPROVED' ? { backgroundColor: '#DCFCE7', color: '#15803D' } :
                              request.status === 'REJECTED' ? { backgroundColor: '#FFE6F0', color: '#FF80B3' } :
                              { backgroundColor: '#F5F5F5', color: '#9CA3AF' }
                            }>
                              {request.status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-sm" style={{ color: '#FFB84D' }}>
                            {request.bookingCount || 0}
                          </td>
                          <td className="px-6 py-5 text-sm text-[#8B6F47] max-w-xs">
                            <p className="line-clamp-2">{request.companyNote || '-'}</p>
                          </td>
                          <td className="px-6 py-5 text-sm text-[#8B6F47]">
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN') : 'N/A'}
                          </td>
                          <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Tooltip text={t('admin.tourApproval.actions.viewDetails') + ' - ' + t('admin.tourDetailModal.viewingUpdateRequest')} position="top">
                                <button
                                  onClick={() => handleViewDetails(request.originalTour?.tourId || request.originalTourId, request)}
                                  disabled={loadingDetail}
                                  className="relative p-2.5 rounded-[20px] border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ borderColor: '#FFE5CC', backgroundColor: '#FFF4E6', color: '#FFB84D' }}
                                  onMouseEnter={(e) => {
                                    if (!e.target.disabled) {
                                      e.target.style.backgroundColor = '#FFEDD5';
                                      e.target.style.borderColor = '#FFD9B3';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!e.target.disabled) {
                                      e.target.style.backgroundColor = '#FFF4E6';
                                      e.target.style.borderColor = '#FFE5CC';
                                    }
                                  }}
                                  title={t('admin.tourDetailModal.viewingUpdateRequest')}
                                >
                                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: '#FFB84D' }}></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: '#FFB84D' }}></span>
                                  </span>
                                </button>
                              </Tooltip>
                              <Tooltip text={t('admin.tourManagement.updateRequests.approve')} position="top">
                                <button
                                  onClick={() => handleApproveUpdateRequest(request)}
                                  className="p-2.5 rounded-[20px] transition-all duration-200"
                                  style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#BBF7D0'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#DCFCE7'}
                                >
                                  <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </Tooltip>
                              <Tooltip text={t('admin.tourManagement.updateRequests.reject')} position="top">
                                <button
                                  onClick={() => handleRejectUpdateRequest(request)}
                                  className="p-2.5 rounded-[20px] transition-all duration-200"
                                  style={{ backgroundColor: '#FFE6F0', color: '#FF80B3' }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#FFB3B3'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#FFE6F0'}
                                >
                                  <XCircle className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && bookings.length > 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-5" style={{ backgroundColor: '#FFF4E6' }}>
                              <div className="space-y-4 pl-4">
                                <h4 className="text-sm font-semibold mb-4" style={{ color: '#FFB84D' }}>
                                  {t('admin.tourManagement.updateRequests.bookings')} ({bookings.length})
                                </h4>
                                <div className="overflow-x-auto bg-white rounded-[24px] border shadow-sm" style={{ borderColor: '#FFE5CC' }}>
                                  <table className="min-w-full divide-y" style={{ borderColor: '#FFE5CC' }}>
                                    <thead style={{ backgroundColor: '#FFF4E6' }}>
                                      <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFB84D' }}>ID</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFB84D' }}>{t('admin.tourManagement.bookings.contactName')}</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFB84D' }}>{t('admin.tourManagement.bookings.contactPhone')}</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFB84D' }}>{t('admin.tourManagement.bookings.contactEmail')}</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFB84D' }}>{t('admin.tourManagement.bookings.departureDate')}</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFB84D' }}>{t('admin.tourManagement.bookings.status')}</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FFB84D' }}>{t('admin.tourManagement.bookings.createdAt')}</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y" style={{ borderColor: '#FFE5CC' }}>
                                      {paginatedBookings.map((booking) => {
                                        const statusColor = getBookingStatusColor(booking.status);
                                        // Convert to pastel colors
                                        const pastelColors = {
                                          '#10b981': { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
                                          '#f59e0b': { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
                                          '#ef4444': { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
                                          '#3b82f6': { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' },
                                          '#6b7280': { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' }
                                        };
                                        const colorKey = statusColor || '#6b7280';
                                        const pastelColor = pastelColors[colorKey] || pastelColors['#6b7280'];
                                        return (
                                          <tr key={booking.bookingId} className="transition-all duration-200" style={{ backgroundColor: 'transparent' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF4E6'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                          >
                                            <td className="px-5 py-3 text-sm" style={{ color: '#FFB84D' }}>#{booking.bookingId}</td>
                                            <td className="px-5 py-3 text-sm text-gray-800 font-medium">{booking.contactName || 'N/A'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600">{booking.contactPhone || 'N/A'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600">{booking.contactEmail || 'N/A'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600">{formatBookingDate(booking.departureDate)}</td>
                                            <td className="px-5 py-3">
                                              <span 
                                                className="inline-flex px-3 py-1.5 text-xs font-medium rounded-[20px]"
                                                style={{
                                                  backgroundColor: pastelColor.bg,
                                                  color: pastelColor.text,
                                                  border: `1px solid ${pastelColor.border}`
                                                }}
                                              >
                                                {formatBookingStatusDisplay(booking.status)}
                                              </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600">{formatBookingDateTime(booking.createdAt)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                {totalBookingPages > 1 && (
                                  <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: '#FFE5CC' }}>
                                    <div className="text-sm" style={{ color: '#FFB84D' }}>
                                      Trang {currentBookingPage + 1} / {totalBookingPages} ({bookings.length} booking)
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setUpdateRequestBookingPages(prev => ({
                                            ...prev,
                                            [request.id]: Math.max(0, (prev[request.id] || 0) - 1)
                                          }));
                                        }}
                                        disabled={currentBookingPage === 0}
                                        className="px-4 py-2 text-sm border rounded-[20px] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                                        style={{ borderColor: '#FFE5CC', backgroundColor: '#FFFFFF', color: '#FFB84D' }}
                                        onMouseEnter={(e) => {
                                          if (!e.target.disabled) {
                                            e.target.style.backgroundColor = '#FFF4E6';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!e.target.disabled) {
                                            e.target.style.backgroundColor = '#FFFFFF';
                                          }
                                        }}
                                      >
                                        Trước
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setUpdateRequestBookingPages(prev => ({
                                            ...prev,
                                            [request.id]: Math.min(totalBookingPages - 1, (prev[request.id] || 0) + 1)
                                          }));
                                        }}
                                        disabled={currentBookingPage >= totalBookingPages - 1}
                                        className="px-4 py-2 text-sm border rounded-[20px] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                                        style={{ borderColor: '#FFE5CC', backgroundColor: '#FFFFFF', color: '#FFB84D' }}
                                        onMouseEnter={(e) => {
                                          if (!e.target.disabled) {
                                            e.target.style.backgroundColor = '#FFF4E6';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!e.target.disabled) {
                                            e.target.style.backgroundColor = '#FFFFFF';
                                          }
                                        }}
                                      >
                                        Sau
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
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
              <div className="bg-white rounded-[28px] overflow-hidden border shadow-sm" style={{ borderColor: '#FFB3B3' }}>
                <table className="min-w-full divide-y" style={{ borderColor: '#FFB3B3' }}>
                  <thead style={{ backgroundColor: '#FFE6F0' }}>
                    <tr>
                      {['STT', t('admin.tourManagement.deleteRequests.tourName'), t('admin.tourManagement.deleteRequests.status'), t('admin.tourManagement.deleteRequests.bookingCount'), t('admin.tourManagement.deleteRequests.companyNote'), t('admin.tourManagement.deleteRequests.requestedAt'), t('admin.tourApproval.table.headers.actions')].map((header) => (
                        <th key={header} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FF80B3' }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y" style={{ borderColor: '#FFB3B3' }}>
                  {sortedDeleteRequests.map((request, index) => {
                    const isExpanded = expandedDeleteRequestId === request.id;
                    const bookings = request.bookings || [];
                    const paginatedBookings = getPaginatedDeleteBookings(bookings, request.id);
                    const totalBookingPages = getBookingTotalPages(bookings);
                    const currentBookingPage = deleteRequestBookingPages[request.id] || 0;

                    return (
                      <React.Fragment key={request.id}>
                        <tr 
                          className="transition-all duration-200 cursor-pointer"
                          style={{ backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFE6F0'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => toggleDeleteRequestBooking(request.id)}
                        >
                          <td className="px-6 py-5 text-sm" style={{ color: '#FF80B3' }}>{index + 1}</td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-medium text-gray-800">{request.tourName || 'N/A'}</p>
                                <p className="text-xs text-gray-500">ID: {request.tourId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex px-3 py-1.5 text-xs font-semibold rounded-[20px]" style={
                              request.status === 'PENDING' ? { backgroundColor: '#FFF4E6', color: '#FFB84D' } :
                              request.status === 'APPROVED' ? { backgroundColor: '#DCFCE7', color: '#15803D' } :
                              request.status === 'REJECTED' ? { backgroundColor: '#FFE6F0', color: '#FF80B3' } :
                              { backgroundColor: '#F5F5F5', color: '#9CA3AF' }
                            }>
                              {request.status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-sm" style={{ color: '#FF80B3' }}>
                            {request.bookingCount || 0}
                          </td>
                          <td className="px-6 py-5 text-sm text-gray-600 max-w-xs">
                            <p className="line-clamp-2">{request.companyNote || '-'}</p>
                          </td>
                          <td className="px-6 py-5 text-sm text-gray-600">
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN') : 'N/A'}
                          </td>
                          <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Tooltip text={t('admin.tourApproval.actions.viewDetails')} position="top">
                                <button
                                  onClick={() => handleViewDetails(request.tourId)}
                                  disabled={loadingDetail}
                                  className="p-2.5 rounded-[20px] border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ borderColor: '#FFB3B3', backgroundColor: '#FFE6F0', color: '#FF80B3' }}
                                  onMouseEnter={(e) => {
                                    if (!e.target.disabled) {
                                      e.target.style.backgroundColor = '#FFD9E8';
                                      e.target.style.borderColor = '#FFB3CC';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!e.target.disabled) {
                                      e.target.style.backgroundColor = '#FFE6F0';
                                      e.target.style.borderColor = '#FFB3B3';
                                    }
                                  }}
                                  title={t('admin.tourDetailModal.viewingDeleteRequest') || 'Viewing Delete Request'}
                                >
                                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </Tooltip>
                              <Tooltip text={t('admin.tourManagement.deleteRequests.approve')} position="top">
                                <button
                                  onClick={() => handleApproveDeleteRequest(request)}
                                  className="p-2.5 rounded-[20px] transition-all duration-200"
                                  style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#BBF7D0'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#DCFCE7'}
                                >
                                  <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </Tooltip>
                              <Tooltip text={t('admin.tourManagement.deleteRequests.reject')} position="top">
                                <button
                                  onClick={() => handleRejectDeleteRequest(request)}
                                  className="p-2.5 rounded-[20px] transition-all duration-200"
                                  style={{ backgroundColor: '#FFE6F0', color: '#FF80B3' }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#FFB3B3'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#FFE6F0'}
                                >
                                  <XCircle className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && bookings.length > 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-5" style={{ backgroundColor: '#FFE6F0' }}>
                              <div className="space-y-4 pl-4">
                                <h4 className="text-sm font-semibold mb-4" style={{ color: '#FF80B3' }}>
                                  {t('admin.tourManagement.deleteRequests.bookings')} ({bookings.length})
                                </h4>
                                <div className="overflow-x-auto bg-white rounded-[24px] border shadow-sm" style={{ borderColor: '#FFB3B3' }}>
                                  <table className="min-w-full divide-y" style={{ borderColor: '#FFB3B3' }}>
                                    <thead style={{ backgroundColor: '#FFE6F0' }}>
                                      <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FF80B3' }}>ID</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FF80B3' }}>{t('admin.tourManagement.bookings.contactName')}</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FF80B3' }}>{t('admin.tourManagement.bookings.contactPhone')}</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FF80B3' }}>{t('admin.tourManagement.bookings.contactEmail')}</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FF80B3' }}>{t('admin.tourManagement.bookings.departureDate')}</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FF80B3' }}>{t('admin.tourManagement.bookings.status')}</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#FF80B3' }}>{t('admin.tourManagement.bookings.createdAt')}</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y" style={{ borderColor: '#FFB3B3' }}>
                                      {paginatedBookings.map((booking) => {
                                        const statusColor = getBookingStatusColor(booking.status);
                                        // Convert to pastel colors
                                        const pastelColors = {
                                          '#10b981': { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
                                          '#f59e0b': { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
                                          '#ef4444': { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
                                          '#3b82f6': { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' },
                                          '#6b7280': { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' }
                                        };
                                        const colorKey = statusColor || '#6b7280';
                                        const pastelColor = pastelColors[colorKey] || pastelColors['#6b7280'];
                                        return (
                                          <tr key={booking.bookingId} className="transition-all duration-200" style={{ backgroundColor: 'transparent' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFE6F0'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                          >
                                            <td className="px-5 py-3 text-sm" style={{ color: '#FF80B3' }}>#{booking.bookingId}</td>
                                            <td className="px-5 py-3 text-sm text-gray-800 font-medium">{booking.contactName || 'N/A'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600">{booking.contactPhone || 'N/A'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600">{booking.contactEmail || 'N/A'}</td>
                                            <td className="px-5 py-3 text-sm text-gray-600">{formatBookingDate(booking.departureDate)}</td>
                                            <td className="px-5 py-3">
                                              <span 
                                                className="inline-flex px-3 py-1.5 text-xs font-semibold rounded-[20px]"
                                                style={{
                                                  backgroundColor: pastelColor.bg,
                                                  color: pastelColor.text,
                                                  border: `1px solid ${pastelColor.border}`
                                                }}
                                              >
                                                {formatBookingStatusDisplay(booking.status)}
                                              </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600">{formatBookingDateTime(booking.createdAt)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                {totalBookingPages > 1 && (
                                  <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: '#FFB3B3' }}>
                                    <div className="text-sm" style={{ color: '#FF80B3' }}>
                                      Trang {currentBookingPage + 1} / {totalBookingPages} ({bookings.length} booking)
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteRequestBookingPages(prev => ({
                                            ...prev,
                                            [request.id]: Math.max(0, (prev[request.id] || 0) - 1)
                                          }));
                                        }}
                                        disabled={currentBookingPage === 0}
                                        className="px-4 py-2 text-sm border rounded-[20px] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                                        style={{ borderColor: '#FFB3B3', backgroundColor: '#FFFFFF', color: '#FF80B3' }}
                                        onMouseEnter={(e) => {
                                          if (!e.target.disabled) {
                                            e.target.style.backgroundColor = '#FFE6F0';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!e.target.disabled) {
                                            e.target.style.backgroundColor = '#FFFFFF';
                                          }
                                        }}
                                      >
                                        Trước
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteRequestBookingPages(prev => ({
                                            ...prev,
                                            [request.id]: Math.min(totalBookingPages - 1, (prev[request.id] || 0) + 1)
                                          }));
                                        }}
                                        disabled={currentBookingPage >= totalBookingPages - 1}
                                        className="px-4 py-2 text-sm border rounded-[20px] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                                        style={{ borderColor: '#FFB3B3', backgroundColor: '#FFFFFF', color: '#FF80B3' }}
                                        onMouseEnter={(e) => {
                                          if (!e.target.disabled) {
                                            e.target.style.backgroundColor = '#FFE6F0';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!e.target.disabled) {
                                            e.target.style.backgroundColor = '#FFFFFF';
                                          }
                                        }}
                                      >
                                        Sau
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        ) : (
          /* Regular Tours Table */

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ borderColor: '#F0F0F0' }}>
              <thead style={{ backgroundColor: '#FAFAFA' }}>
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
              <tbody className="bg-white divide-y" style={{ borderColor: '#F0F0F0' }}>
                {paginatedTours.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      {loading ? t('admin.tourApproval.table.loading') : t('admin.tourApproval.table.noResults')}
                    </td>
                  </tr>
                ) : (
                  paginatedTours.map((tour, index) => (
                    <tr key={tour.tourId || tour.id} className="transition" style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6F3FF'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {currentPage * pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {tour.tourImgPath || tour.thumbnailUrl ? (
                            <img
                              src={getTourImageUrl(tour.tourImgPath || tour.thumbnailUrl)}
                              alt={tour.title || tour.tourName}
                              className="w-12 h-12 rounded-[20px] object-cover border"
                              style={{ borderColor: '#E0E0E0' }}
                              onError={(e) => {
                                e.target.src = '/default-Tour.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-[20px] flex items-center justify-center border" style={{ backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' }}>
                              <Package className="h-6 w-6 text-gray-400" strokeWidth={1.5} />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-800">
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
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
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
                          <Tooltip text={t('admin.tourApproval.actions.viewDetails')} position="top">
                            <button
                              onClick={() => handleViewDetails(tour.tourId || tour.id)}
                              disabled={loadingDetail}
                              className="p-2 rounded-[20px] border transition disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ borderColor: '#E0E0E0', color: '#9CA3AF' }}
                              onMouseEnter={(e) => {
                                if (!e.target.disabled) {
                                  e.target.style.color = '#66B3FF';
                                  e.target.style.borderColor = '#CCE6FF';
                                  e.target.style.backgroundColor = '#E6F3FF';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!e.target.disabled) {
                                  e.target.style.color = '#9CA3AF';
                                  e.target.style.borderColor = '#E0E0E0';
                                  e.target.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </Tooltip>
                          {(tour.tourStatus || tour.status || '').toUpperCase() !== 'PUBLIC' && (
                            <Tooltip text={t('admin.tourApproval.actions.approve')} position="top">
                              <button
                                onClick={() => handleApproveTour(tour.tourId || tour.id)}
                                className="p-2 rounded-[20px] transition"
                                style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#BBF7D0'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#DCFCE7'}
                              >
                                <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </Tooltip>
                          )}
                          {(tour.tourStatus || tour.status || '').toUpperCase() !== 'DISABLED' && (
                            <Tooltip text={t('admin.tourApproval.actions.reject')} position="top">
                              <button
                                onClick={() => handleRejectTour(tour.tourId || tour.id)}
                                className="p-2 rounded-[20px] transition"
                                style={{ backgroundColor: '#FFE6F0', color: '#FF80B3' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#FFB3B3'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#FFE6F0'}
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
        )}

        {/* Pagination */}
        {!showUpdateRequests && !showDeleteRequests && filteredAndSortedTours.length >= 10 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#F0F0F0' }}>
            <div className="text-sm text-gray-600">
              Trang {currentPage + 1} / {totalPages} ({filteredAndSortedTours.length} tour)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 text-sm border rounded-[20px] disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#F5F5F5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                Trước
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 text-sm border rounded-[20px] disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#F5F5F5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                Sau
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
        updateRequest={selectedTour?._updateRequest || null}
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
            className="w-full max-w-md overflow-hidden border"
            style={{ backgroundColor: '#FFFFFF', borderRadius: '32px', boxShadow: '0 25px 80px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.04)', borderColor: '#F0F0F0' }}
          >
            <div style={{ padding: '32px 28px 28px' }}>
              <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: '72px', height: '72px', borderRadius: '24px', backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0' }}>
                <CheckCircle style={{ width: '28px', height: '28px', color: '#15803D', strokeWidth: '1.5' }} />
              </div>
              <h3 className="text-center mb-2" style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a2e', letterSpacing: '-0.02em' }}>
                {t('admin.tourManagement.updateRequests.approveConfirm.title')}
              </h3>
              <p className="text-center mb-5" style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                {t('admin.tourManagement.updateRequests.approveConfirm.message', {
                  name: selectedUpdateRequest?.originalTour?.tourName || selectedUpdateRequest?.updatedTour?.tourName || ''
                })}
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
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsApproveUpdateModalOpen(false); setSelectedUpdateRequest(null); setUpdateApproveNote(''); }}
                  style={{ flex: 1, padding: '14px 20px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb'; }}
                >{t('admin.tourManagement.updateRequests.approveConfirm.cancel')}</button>
                <button
                  onClick={confirmApproveUpdateRequest}
                  style={{ flex: 1, padding: '14px 20px', borderRadius: '20px', border: 'none', backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = '#BBF7D0'; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = '#DCFCE7'; }}
                >{t('admin.tourManagement.updateRequests.approveConfirm.confirm')}</button>
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
            className="w-full max-w-md overflow-hidden border"
            style={{ backgroundColor: '#FFFFFF', borderRadius: '32px', boxShadow: '0 25px 80px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.04)', borderColor: '#F0F0F0' }}
          >
            <div style={{ padding: '32px 28px 28px' }}>
              <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: '72px', height: '72px', borderRadius: '24px', backgroundColor: '#FFE6F0', border: '1px solid #FFB3B3' }}>
                <XCircle style={{ width: '28px', height: '28px', color: '#FF80B3', strokeWidth: '1.5' }} />
              </div>
              <h3 className="text-center mb-2" style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a2e', letterSpacing: '-0.02em' }}>
                {t('admin.tourManagement.updateRequests.rejectConfirm.title')}
              </h3>
              <p className="text-center mb-5" style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                {t('admin.tourManagement.updateRequests.rejectConfirm.message', { name: selectedUpdateRequest?.originalTour?.tourName || selectedUpdateRequest?.updatedTour?.tourName || '' })}
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
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsRejectUpdateModalOpen(false); setSelectedUpdateRequest(null); setUpdateRejectNote(''); }}
                  style={{ flex: 1, padding: '14px 20px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb'; }}
                >{t('admin.tourManagement.updateRequests.rejectConfirm.cancel')}</button>
                <button
                  onClick={confirmRejectUpdateRequest}
                  style={{ flex: 1, padding: '14px 20px', borderRadius: '20px', border: 'none', backgroundColor: '#FFE6F0', color: '#FF80B3', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = '#FFB3B3'; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = '#FFE6F0'; }}
                >{t('admin.tourManagement.updateRequests.rejectConfirm.confirm')}</button>
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
            className="w-full max-w-md overflow-hidden border"
            style={{ backgroundColor: '#FFFFFF', borderRadius: '32px', boxShadow: '0 25px 80px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.04)', borderColor: '#F0F0F0' }}
          >
            <div style={{ padding: '32px 28px 28px' }}>
              <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: '72px', height: '72px', borderRadius: '24px', backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0' }}>
                <CheckCircle style={{ width: '28px', height: '28px', color: '#15803D', strokeWidth: '1.5' }} />
              </div>
              <h3 className="text-center mb-2" style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a2e', letterSpacing: '-0.02em' }}>
                {t('admin.tourManagement.deleteRequests.approveConfirm.title')}
              </h3>
              <p className="text-center mb-5" style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                {t('admin.tourManagement.deleteRequests.approveConfirm.message', { name: selectedDeleteRequest?.tour?.tourName || '' })}
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
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsApproveDeleteModalOpen(false); setSelectedDeleteRequest(null); setDeleteApproveNote(''); }}
                  style={{ flex: 1, padding: '14px 20px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb'; }}
                >{t('admin.tourManagement.deleteRequests.approveConfirm.cancel')}</button>
                <button
                  onClick={confirmApproveDeleteRequest}
                  style={{ flex: 1, padding: '14px 20px', borderRadius: '20px', border: 'none', backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = '#BBF7D0'; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = '#DCFCE7'; }}
                >{t('admin.tourManagement.deleteRequests.approveConfirm.confirm')}</button>
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
            className="w-full max-w-md overflow-hidden border"
            style={{ backgroundColor: '#FFFFFF', borderRadius: '32px', boxShadow: '0 25px 80px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.04)', borderColor: '#F0F0F0' }}
          >
            <div style={{ padding: '32px 28px 28px' }}>
              <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: '72px', height: '72px', borderRadius: '24px', backgroundColor: '#FFE6F0', border: '1px solid #FFB3B3' }}>
                <XCircle style={{ width: '28px', height: '28px', color: '#FF80B3', strokeWidth: '1.5' }} />
              </div>
              <h3 className="text-center mb-2" style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a2e', letterSpacing: '-0.02em' }}>
                {t('admin.tourManagement.deleteRequests.rejectConfirm.title')}
              </h3>
              <p className="text-center mb-5" style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                {t('admin.tourManagement.deleteRequests.rejectConfirm.message', { name: selectedDeleteRequest?.tour?.tourName || '' })}
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
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsRejectDeleteModalOpen(false); setSelectedDeleteRequest(null); setDeleteRejectNote(''); }}
                  style={{ flex: 1, padding: '14px 20px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb'; }}
                >{t('admin.tourManagement.deleteRequests.rejectConfirm.cancel')}</button>
                <button
                  onClick={confirmRejectDeleteRequest}
                  style={{ flex: 1, padding: '14px 20px', borderRadius: '20px', border: 'none', backgroundColor: '#FFE6F0', color: '#FF80B3', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = '#FFB3B3'; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = '#FFE6F0'; }}
                >{t('admin.tourManagement.deleteRequests.rejectConfirm.confirm')}</button>
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
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: '#F5F5F5', color: '#9CA3AF' }}>
        {t('admin.tourApproval.status.na')}
      </span>
    );
  }

  const statusUpper = status.toUpperCase();
  const statusMap = {
    'PUBLIC': {
      bgColor: '#DCFCE7',
      textColor: '#15803D',
      label: t('admin.tourApproval.status.approved'),
      icon: Check
    },
    'NOT_APPROVED': {
      bgColor: '#FFF4E6',
      textColor: '#FFB84D',
      label: t('admin.tourApproval.status.pending'),
      icon: Clock
    },
    'DISABLED': {
      bgColor: '#FFE6F0',
      textColor: '#FF80B3',
      label: t('admin.tourApproval.status.disabled'),
      icon: X
    }
  };

  const map = statusMap[statusUpper] || {
    bgColor: '#F5F5F5',
    textColor: '#9CA3AF',
    label: status,
    icon: FileText
  };

  const IconComponent = map.icon;

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: map.bgColor, color: map.textColor }}>
      <IconComponent className="w-3.5 h-3.5" strokeWidth={1.5} />
      {map.label}
    </span>
  );
};

export default TourApproval;
