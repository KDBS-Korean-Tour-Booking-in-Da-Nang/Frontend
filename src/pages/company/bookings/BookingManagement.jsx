import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './BookingManagement.module.css';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, getImageUrl, createAuthHeaders } from '../../../config/api';
import { getAllBookings, getBookingsByTourId, getBookingTotal, companyConfirmTourCompletion } from '../../../services/bookingAPI';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import Tooltip from '../../../components/tooltip';
import { 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  FileText,
  Timer,
  Users,
  Phone,
  Mail
} from 'lucide-react';

const BookingManagement = () => {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const { user } = useAuth();
  const showSuccessRef = useRef(showSuccess);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [companyId, setCompanyId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [tours, setTours] = useState([]);
  const [toursLoading, setToursLoading] = useState(true);
  const [selectedTourId, setSelectedTourId] = useState(null);
  const [currentTourPage, setCurrentTourPage] = useState(1);
  const [toursPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [approvingBookingId, setApprovingBookingId] = useState(null);
  const [tourBookingCounts, setTourBookingCounts] = useState(new Map()); // Map tourId -> bookingCount
  const modalContainerRef = useRef(null);
  const bodyOverflowRef = useRef('');

  const statuses = [
    'PENDING_PAYMENT',
    'WAITING_FOR_APPROVED',
    'BOOKING_REJECTED',
    'WAITING_FOR_UPDATE',
    'BOOKING_FAILED',
    'BOOKING_SUCCESS',
    'BOOKING_SUCCESS_PENDING',
    'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED',
    'BOOKING_UNDER_COMPLAINT'
  ];

  const isPendingStatus = (status) => {
    if (!status) return false;
    return status.toUpperCase().includes('PENDING');
  };

  const handleEditBooking = (bookingItem) => {
    if (!bookingItem) return;

    const bookingId = bookingItem.bookingId || bookingItem;
    if (!bookingId) return;

    if (isPendingStatus(bookingItem.bookingStatus)) {
      showSuccessRef.current?.(t('bookingManagement.actions.bookingPending'));
      return;
    }

    // Preserve tourId in URL when navigating to booking detail
    const tourId = selectedTourId || searchParams.get('tourId');
    if (tourId) {
      navigate(`/company/bookings/detail?id=${bookingId}&tourId=${tourId}`);
    } else {
      navigate(`/company/bookings/detail?id=${bookingId}`);
    }
  };

  const handleViewBooking = (bookingItem) => {
    if (!bookingItem) return;
    setViewingBooking(bookingItem);
    setIsDetailModalOpen(true);
  };

  const handleApproveBooking = async (bookingItem) => {
    if (!bookingItem?.bookingId || bookingItem.bookingStatus !== 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED') {
      return;
    }
    try {
      setApprovingBookingId(bookingItem.bookingId);
      await companyConfirmTourCompletion(bookingItem.bookingId);
      showSuccessRef.current?.(t('companyBookingWizard.success.bookingPending'));
      
      // Refresh balance after confirmation
      // Check if booking status changed to BOOKING_SUCCESS (both confirmed)
      await refreshBookings();
      
      // Refresh user balance to get updated balance
      if (user?.email) {
        try {
          const remembered = localStorage.getItem('rememberMe') === 'true';
          const storage = remembered ? localStorage : sessionStorage;
          const token = storage.getItem('token');
          if (token) {
            const response = await fetch(API_ENDPOINTS.GET_USER(user.email), {
              headers: createAuthHeaders(token)
            });
            if (response.ok) {
              const userData = await response.json();
              // Trigger balance update event
              window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { balance: userData.balance || 0 } }));
            }
          }
        } catch {
          // Silently handle error refreshing balance
        }
      }
    } catch (error) {
      // Silently handle error approving booking completion
    } finally {
      setApprovingBookingId(null);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setViewingBooking(null);
  };

  useEffect(() => {
    showSuccessRef.current = showSuccess;
  }, [showSuccess]);

  useEffect(() => {
    if (!user) {
      setCompanyId(null);
      return;
    }

    const isCompanyUser = user.role === 'COMPANY' || user.role === 'BUSINESS';
    if (!isCompanyUser) {
      setCompanyId(null);
      return;
    }

    const derivedCompanyId =
      user.companyId ??
      user.companyID ??
      user.company?.companyId ??
      user.company?.id ??
      user.id ??
      null;

    setCompanyId(derivedCompanyId ?? null);
  }, [user]);

  // Handle tour selection
  const handleTourSelect = (tourId) => {
    if (tourId === undefined || tourId === null) return;
    const normalizedId = tourId.toString();
    const newSearchParams = new URLSearchParams(searchParams);

    setCurrentPage(1);

    if (selectedTourId === normalizedId) {
      setSelectedTourId(null);
      newSearchParams.delete('tourId');
      setSearchParams(newSearchParams, { replace: true });
      return;
    }

    setSelectedTourId(normalizedId);
    newSearchParams.set('tourId', normalizedId);
    setSearchParams(newSearchParams, { replace: true });
  };

  const enrichBookingsWithTotals = useCallback(async (bookings = []) => {
    return Promise.all(
      bookings.map(async (booking) => {
        try {
          const totalResp = await getBookingTotal(booking.bookingId);
          return {
            ...booking,
            id: booking.bookingId,
            bookingId: booking.bookingId,
            totalAmount: totalResp?.totalAmount || 0
          };
        } catch (err) {
          return {
            ...booking,
            id: booking.bookingId,
            bookingId: booking.bookingId,
            totalAmount: 0
          };
        }
      })
    );
  }, []);

  const fetchAllBookings = useCallback(async () => {
    if (!companyId) {
      setBookingsLoading(false);
      setAllBookings([]);
      setBookings([]);
      setTotalItems(0);
      setTotalPages(1);
      return;
    }

    try {
      setBookingsLoading(true);
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const token = storage.getItem('token');
      if (!token) {
        setAllBookings([]);
        setBookingsLoading(false);
        return;
      }

      const bookings = await getAllBookings(companyId);
      const bookingsWithTotals = await enrichBookingsWithTotals(bookings);
      setAllBookings(bookingsWithTotals);
      setCurrentPage(1);
    } catch (e) {
      // Silently handle error fetching all bookings
      setAllBookings([]);
      showSuccessRef.current?.('Không thể tải danh sách booking');
    } finally {
      setBookingsLoading(false);
    }
  }, [companyId, enrichBookingsWithTotals]);

  // Fetch bookings when tour is selected
  const fetchBookingsByTour = useCallback(async (tourId) => {
    if (!tourId) {
      return;
    }
    if (!companyId) {
      setAllBookings([]);
      setBookings([]);
      setBookingsLoading(false);
      return;
    }
    try {
      setBookingsLoading(true);
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const token = storage.getItem('token');
      if (!token) {
        setAllBookings([]);
        setBookingsLoading(false);
        return;
      }
      const parsedId = typeof tourId === 'string' ? parseInt(tourId, 10) : tourId;
      const normalizedTourId = Number.isNaN(parsedId) ? tourId : parsedId;

      const bookings = await getBookingsByTourId(normalizedTourId);
      
      const bookingsWithTotals = await enrichBookingsWithTotals(bookings);
      
      setAllBookings(bookingsWithTotals);
      setCurrentPage(1);
    } catch (e) {
      // Silently handle error fetching bookings
      setAllBookings([]);
      showSuccessRef.current?.('Không thể tải danh sách booking');
    } finally {
      setBookingsLoading(false);
    }
  }, [companyId, enrichBookingsWithTotals]);

  // Sync selectedTourId with URL params after tours are loaded
  useEffect(() => {
    if (tours.length === 0 || toursLoading) return;
    
    const tourIdFromUrl = searchParams.get('tourId');
    
    if (tourIdFromUrl) {
      const tourExists = tours.some(t => t?.id?.toString() === tourIdFromUrl);
      if (tourExists) {
        // Only update if different to avoid unnecessary re-renders
        if (selectedTourId !== tourIdFromUrl) {
          setSelectedTourId(tourIdFromUrl);
          // Calculate which page the tour is on
          const tourIndex = tours.findIndex(t => t?.id?.toString() === tourIdFromUrl);
          if (tourIndex >= 0) {
            const page = Math.floor(tourIndex / toursPerPage) + 1;
            setCurrentTourPage(page);
          }
        }
      } else {
        // Tour not found, clear URL param (but don't update selectedTourId here to avoid loop)
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('tourId');
        setSearchParams(newSearchParams, { replace: true });
        if (selectedTourId !== null) {
          setSelectedTourId(null);
        }
      }
    } else {
      // URL param removed, clear selected tour
      if (selectedTourId !== null) {
        setSelectedTourId(null);
      }
    }
  }, [searchParams, tours, toursPerPage, toursLoading, selectedTourId, setSearchParams]);

  // Fetch bookings when selectedTourId changes
  useEffect(() => {
    if (!companyId) return;

    if (selectedTourId) {
      fetchBookingsByTour(selectedTourId);
    } else {
      fetchAllBookings();
    }
  }, [companyId, selectedTourId, fetchAllBookings, fetchBookingsByTour]);

  const refreshBookings = useCallback(async () => {
    if (selectedTourId) {
      await fetchBookingsByTour(selectedTourId);
    } else {
      await fetchAllBookings();
    }
  }, [selectedTourId, fetchAllBookings, fetchBookingsByTour]);

  // Load company tours first
  const fetchCompanyTours = useCallback(async () => {
    try {
      setToursLoading(true);
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const token = storage.getItem('token');
      if (!token) {
        setTours([]);
        setToursLoading(false);
        return;
      }
      const res = await fetch(API_ENDPOINTS.TOURS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Handle 401 if token expired
      if (!res.ok && res.status === 401) {
        await checkAndHandle401(res);
        setTours([]);
        return;
      }
      
      if (!res.ok) {
        setTours([]);
      } else {
        const data = await res.json();
        const allTours = Array.isArray(data) ? data : [];
        // Filter to only show tours with PUBLIC status
        const publicTours = allTours.filter(tour => tour.tourStatus === 'PUBLIC');
        setTours(publicTours);
        setCurrentTourPage(1); // Reset to first page when tours are loaded
      }
    } catch (e) {
      setTours([]);
    } finally {
      setToursLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanyTours(); }, [fetchCompanyTours]);

  // Calculate booking counts for each tour
  useEffect(() => {
    if (!allBookings || allBookings.length === 0) {
      setTourBookingCounts(new Map());
      return;
    }

    const countsMap = new Map();
    allBookings.forEach((booking) => {
      const tourId = getBookingTourId(booking);
      if (tourId) {
        const currentCount = countsMap.get(tourId) || 0;
        countsMap.set(tourId, currentCount + 1);
      }
    });
    setTourBookingCounts(countsMap);
  }, [allBookings]);

  useEffect(() => {
    filterAndPaginateBookings();
  }, [searchQuery, statusFilter, sortBy, currentPage, allBookings]);

  // Resolve portal container once on mount
  useEffect(() => {
    if (!modalContainerRef.current) {
      const root = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
      modalContainerRef.current = root || (typeof document !== 'undefined' ? document.body : null);
    }
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!modalContainerRef.current || typeof document === 'undefined') return;
    if (isDetailModalOpen) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = bodyOverflowRef.current || '';
      };
    }
  }, [isDetailModalOpen]);

  const filterAndPaginateBookings = () => {
    let filtered = [...allBookings];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => {
        const tourName = (booking.tourName || '').toLowerCase();
        const contactName = (booking.contactName || '').toLowerCase();
        const bookingId = (booking.bookingId || '').toLowerCase();
        return tourName.includes(query) || contactName.includes(query) || bookingId.includes(query);
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.bookingStatus === statusFilter);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      } else if (sortBy === 'tour-asc') {
        const tourA = (a.tourName || '').toLowerCase();
        const tourB = (b.tourName || '').toLowerCase();
        return tourA.localeCompare(tourB);
      } else if (sortBy === 'tour-desc') {
        const tourA = (a.tourName || '').toLowerCase();
        const tourB = (b.tourName || '').toLowerCase();
        return tourB.localeCompare(tourA);
      } else if (sortBy === 'amount-desc') {
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      } else if (sortBy === 'amount-asc') {
        return (a.totalAmount || 0) - (b.totalAmount || 0);
      }
      return 0;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    setBookings(paginated);
    setTotalPages(totalPages);
    setTotalItems(filtered.length);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleTourPageChange = (page) => {
    const totalTourPages = Math.ceil(tours.length / toursPerPage);
    if (page >= 1 && page <= totalTourPages) {
      setCurrentTourPage(page);
    }
  };

  // Calculate paginated tours
  const totalTourPages = Math.ceil(tours.length / toursPerPage);
  const startTourIndex = (currentTourPage - 1) * toursPerPage;
  const endTourIndex = startTourIndex + toursPerPage;
  const paginatedTours = tours.slice(startTourIndex, endTourIndex);

  // format helpers not needed here

  const getStatusColor = (status) => {
    switch (status) {
      case 'BOOKING_SUCCESS':
        return '#10B981';
      case 'BOOKING_SUCCESS_PENDING':
        // Đã duyệt nhưng chờ tour diễn ra: teal
        return '#14B8A6';
      case 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED':
        return '#2563EB';
      case 'BOOKING_UNDER_COMPLAINT':
        // Đang khiếu nại: vàng tươi
        return '#EAB308';
      case 'PENDING_PAYMENT':
        // Thanh toán chờ: cam đậm
        return '#F97316';
      case 'WAITING_FOR_APPROVED':
        return '#3B82F6';
      case 'WAITING_FOR_UPDATE':
        return '#8B5CF6';
      case 'BOOKING_REJECTED':
      case 'BOOKING_FAILED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const formatStatusDisplay = (status = '') => {
    if (!status) return '';
    // Use translation keys from bookingManagement.status
    const translationKey = `bookingManagement.status.${status}`;
    const translated = t(translationKey);
    // If translation exists (not the same as key), return it; otherwise format the status
    return translated !== translationKey ? translated : status.replaceAll('_', ' ');
  };

  const getBookingTourId = (booking) => {
    if (!booking) return null;
    const candidates = [
      booking?.tourId,
      booking?.tourID,
      booking?.tour?.tourId,
      booking?.tour?.tourID,
      booking?.tour?.id
    ];

    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null) {
        return candidate.toString();
      }
    }
    return null;
  };

  const findTourForBooking = (booking) => {
    const bookingTourId = getBookingTourId(booking);
    if (!bookingTourId) return null;
    return (
      tours.find((tour) => {
        const tourCandidates = [tour?.id, tour?.tourId, tour?.tourID];
        return tourCandidates.some(
          (tourId) => tourId !== undefined && tourId !== null && tourId.toString() === bookingTourId
        );
      }) ?? null
    );
  };

  const getTourDurationDays = (booking) => {
    if (!booking) return null;
    const tour = findTourForBooking(booking);

    const durationCandidates = [
      booking?.tourIntDuration,
      booking?.tour_int_duration,
      booking?.tourDurationInt,
      booking?.tourDuration,
      booking?.duration,
      booking?.durationDays,
      booking?.tour?.tourIntDuration,
      booking?.tour?.tourDuration,
      tour?.tourIntDuration,
      tour?.tour_int_duration,
      tour?.tourDurationInt,
      tour?.tourDuration
    ];

    for (const duration of durationCandidates) {
      const parsed = Number(duration);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return null;
  };

  const calculateTourEndDate = (booking) => {
    if (!booking?.departureDate) return null;
    const departure = new Date(booking.departureDate);
    if (Number.isNaN(departure.getTime())) return null;

    const duration = getTourDurationDays(booking);
    if (!duration) return null;

    const endDate = new Date(departure);
    endDate.setDate(endDate.getDate() + duration);
    return endDate;
  };

  // status badge helper not needed; computed inline

  // Optional stats (unused in current UI)

  const getImageSrc = (tourImgPath) => {
    if (!tourImgPath) return '';
    
    // Check if path contains full URL anywhere (fix: Backend lưu full Azure URL trong path)
    const trimmed = tourImgPath.trim();
    if (trimmed.includes('https://') || trimmed.includes('http://')) {
      // Extract the full URL from the path
      const httpsIndex = trimmed.indexOf('https://');
      const httpIndex = trimmed.indexOf('http://');
      const urlStartIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;
      if (urlStartIndex >= 0) {
        return trimmed.substring(urlStartIndex);
      }
    }
    
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    const normalized = trimmed.startsWith('/uploads')
      ? trimmed
      : `/uploads/tours/thumbnails/${trimmed}`;
    return getImageUrl(normalized);
  };

  const canApproveFromList = (status) => status === 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED';

  // Check if booking status allows editing/approval actions
  const canEditBooking = (status) => {
    if (!status) return false;
    const statusUpper = status.toUpperCase();
    const disabledStatuses = [
      'BOOKING_SUCCESS',
      'BOOKING_REJECTED',
      'BOOKING_UNDER_COMPLAINT',
      'BOOKING_SUCCESS_PENDING',
      'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED'
    ];
    return !disabledStatuses.includes(statusUpper);
  };

  const modalDurationDays = viewingBooking ? getTourDurationDays(viewingBooking) : null;
  const modalEndDate = viewingBooking ? calculateTourEndDate(viewingBooking) : null;
  const modalDepartureDate = viewingBooking?.departureDate ? new Date(viewingBooking.departureDate) : null;

  // Countdown timer component - chỉ đếm ngược khi tour đã bắt đầu
  const CountdownTimer = ({ departureDate, endDate }) => {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
      if (!departureDate || !endDate) {
        setTimeLeft(null);
        return;
      }

      const calculateTimeLeft = () => {
        const now = new Date();
        const departure = new Date(departureDate);
        const end = new Date(endDate);

        // Nếu tour chưa bắt đầu (now < departureDate)
        if (now < departure) {
          return { notStarted: true };
        }

        // Nếu tour đã kết thúc (now >= endDate)
        if (now >= end) {
          return { expired: true };
        }

        // Tour đang diễn ra - đếm ngược đến khi kết thúc
        const difference = end - now;
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds, expired: false, notStarted: false };
      };

      setTimeLeft(calculateTimeLeft());
      const interval = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(interval);
    }, [departureDate, endDate]);

    if (!timeLeft) return null;

    // Tour chưa bắt đầu
    if (timeLeft.notStarted) {
      return (
        <div className={styles['countdown-not-started']}>
          <Calendar className={styles['countdown-icon']} strokeWidth={2} />
          <span>{t('bookingManagement.modal.tourNotStarted', { defaultValue: 'Tour chưa bắt đầu' })}</span>
        </div>
      );
    }

    // Tour đã kết thúc
    if (timeLeft.expired) {
      return (
        <div className={styles['countdown-expired']}>
          <Timer className={styles['countdown-icon']} strokeWidth={2} />
          <span>{t('bookingManagement.modal.tourEnded', { defaultValue: 'Tour đã kết thúc' })}</span>
        </div>
      );
    }

    // Tour đang diễn ra - hiển thị countdown
    return (
      <div className={styles['countdown-timer']}>
        <Timer className={styles['countdown-icon']} strokeWidth={2} />
        <div className={styles['countdown-content']}>
          <span className={styles['countdown-label']}>
            {t('bookingManagement.modal.timeUntilEnd', { defaultValue: 'Còn lại' })}:
          </span>
          <div className={styles['countdown-values']}>
            {timeLeft.days > 0 && (
              <span className={styles['countdown-item']}>
                <strong>{timeLeft.days}</strong> {t('bookingManagement.modal.days', { defaultValue: 'ngày' })}
              </span>
            )}
            <span className={styles['countdown-item']}>
              <strong>{String(timeLeft.hours).padStart(2, '0')}</strong> {t('bookingManagement.modal.hours', { defaultValue: 'giờ' })}
            </span>
            <span className={styles['countdown-item']}>
              <strong>{String(timeLeft.minutes).padStart(2, '0')}</strong> {t('bookingManagement.modal.minutes', { defaultValue: 'phút' })}
            </span>
            <span className={styles['countdown-item']}>
              <strong>{String(timeLeft.seconds).padStart(2, '0')}</strong> {t('bookingManagement.modal.seconds', { defaultValue: 'giây' })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const modalNode = isDetailModalOpen && viewingBooking ? (
    <div className={styles['modal-backdrop']} onClick={handleCloseDetailModal}>
      <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['modal-header']}>
          <div className={styles['modal-header-content']}>
            <div className={styles['modal-title-section']}>
              <h3 className={styles['modal-title']}>
                {t('bookingManagement.modal.title')}{viewingBooking.bookingId}
              </h3>
              <div className={styles['modal-tour-name']}>
                <MapPin className={styles['modal-tour-icon']} strokeWidth={2} />
                <span className={styles['tour-name-highlight']}>
                  {viewingBooking.tourName || '-'}
                </span>
              </div>
            </div>
            {modalDepartureDate && modalEndDate && (
              <div className={styles['modal-countdown-wrapper']}>
                <CountdownTimer departureDate={modalDepartureDate} endDate={modalEndDate} />
              </div>
            )}
          </div>
          <div className={styles['modal-header-right']}>
            <button type="button" className={styles['modal-close']} onClick={handleCloseDetailModal}>
              <XCircleIcon className={styles['modal-close-icon']} />
            </button>
            <div className={styles['modal-status-header']}>
              <span 
                className={styles['modal-status-badge']}
                style={{ 
                  color: getStatusColor(viewingBooking.bookingStatus),
                  backgroundColor: `${getStatusColor(viewingBooking.bookingStatus)}15`,
                  borderColor: `${getStatusColor(viewingBooking.bookingStatus)}30`
                }}
              >
                {formatStatusDisplay(viewingBooking.bookingStatus || '')}
              </span>
            </div>
            <div className={styles['modal-duration-wrapper']}>
              <Clock className={styles['modal-duration-icon']} strokeWidth={2} />
              <span className={styles['modal-duration-text']}>
                {modalDurationDays ? `${modalDurationDays} ${t('bookingManagement.modal.days')}` : t('bookingManagement.modal.unknown')}
              </span>
            </div>
          </div>
        </div>
        <div className={styles['modal-body']}>
          <div className={styles['modal-row']}>
            <div className={styles['modal-row-label']}>
              <User className={styles['modal-row-icon']} strokeWidth={2} />
              <span className={styles['modal-label']}>{t('bookingManagement.modal.customer')}</span>
            </div>
            <span className={styles['modal-value']}>{viewingBooking.contactName || '-'}</span>
          </div>
          <div className={styles['modal-row']}>
            <div className={styles['modal-row-label']}>
              <Phone className={styles['modal-row-icon']} strokeWidth={2} />
              <span className={styles['modal-label']}>{t('bookingManagement.modal.phone', { defaultValue: 'Phone' })}</span>
            </div>
            <span className={styles['modal-value']}>{viewingBooking.contactPhone || '-'}</span>
          </div>
          <div className={styles['modal-row']}>
            <div className={styles['modal-row-label']}>
              <Mail className={styles['modal-row-icon']} strokeWidth={2} />
              <span className={styles['modal-label']}>{t('bookingManagement.modal.email', { defaultValue: 'Email' })}</span>
            </div>
            <span className={styles['modal-value']}>{viewingBooking.contactEmail || '-'}</span>
          </div>
          <div className={styles['modal-row']}>
            <div className={styles['modal-row-label']}>
              <Calendar className={styles['modal-row-icon']} strokeWidth={2} />
              <span className={styles['modal-label']}>{t('bookingManagement.modal.departureDate')}</span>
            </div>
            <span className={styles['modal-value']}>
              {viewingBooking.departureDate ? new Date(viewingBooking.departureDate).toLocaleDateString('vi-VN') : '-'}
            </span>
          </div>
          <div className={styles['modal-row']}>
            <div className={styles['modal-row-label']}>
              <Calendar className={styles['modal-row-icon']} strokeWidth={2} />
              <span className={styles['modal-label']}>{t('bookingManagement.modal.expectedEndDate')}</span>
            </div>
            <span className={styles['modal-value']}>
              {modalEndDate ? modalEndDate.toLocaleDateString('vi-VN') : '-'}
            </span>
          </div>
          <div className={styles['modal-row']}>
            <div className={styles['modal-row-label']}>
              <DollarSign className={styles['modal-row-icon']} strokeWidth={2} />
              <span className={styles['modal-label']}>{t('bookingManagement.modal.totalAmount')}</span>
            </div>
            <span className={styles['modal-value']} style={{ color: '#16a34a', fontWeight: 700 }}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(viewingBooking.totalAmount || 0)}
            </span>
          </div>
          <div className={styles['modal-row']}>
            <div className={styles['modal-row-label']}>
              <Clock className={styles['modal-row-icon']} strokeWidth={2} />
              <span className={styles['modal-label']}>{t('bookingManagement.modal.createdAt')}</span>
            </div>
            <span className={styles['modal-value']}>
              {viewingBooking.createdAt ? new Date(viewingBooking.createdAt).toLocaleString('vi-VN') : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className={styles['booking-management']}>
      {/* Header */}
      <div className={styles['management-header']}>
        <div className={styles['header-title']}>
          <h1>{t('bookingManagement.header.title')}</h1>
        </div>
        <p className={styles['header-subtitle']}>{t('bookingManagement.header.subtitle')}</p>
      </div>

        {/* Tour Cards Selector */}
        <div className={styles['tour-selector-container']}>
        <h2 className={styles['tour-selector-title']}>{t('bookingManagement.tourSelector.title')}</h2>
        {toursLoading ? (
          <div className={styles['empty-state']}>{t('bookingManagement.tourSelector.loading')}</div>
        ) : tours.length === 0 ? (
          <div className={styles['empty-state']}>{t('bookingManagement.tourSelector.empty')}</div>
        ) : (
          <>
            {/* Tour Cards - Single Row */}
            <div className={styles['tour-cards-container']}>
              {paginatedTours.map((tour) => {
                const normalizedTourId = tour?.id != null ? tour.id.toString() : '';
                const isSelected = selectedTourId === normalizedTourId;
                const bookingCount = tourBookingCounts.get(normalizedTourId) || 0;

                return (
                  <button
                    key={tour.id}
                    className={`${styles['tour-card']} ${isSelected ? styles['selected'] : ''}`}
                    onClick={() => handleTourSelect(tour.id)}
                  >
                    {/* Fixed image height for uniform cards */}
                    <div style={{ height: 160, background: '#f3f4f6' }}>
                      {tour.tourImgPath ? (
                        <img
                          src={getImageSrc(tour.tourImgPath)}
                          alt={tour.tourName}
                          className={styles['tour-card-image']}
                          onError={(e) => { e.currentTarget.src = '/default-Tour.jpg'; }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>🏞️</div>
                      )}
                    </div>
                    {/* Fixed content height so cards align */}
                    <div className={styles['tour-card-content']}>
                      <div className={styles['tour-card-name']} title={tour.tourName || ''}>{tour.tourName}</div>
                      {/* Booking count - displayed below tour name */}
                      <div className={styles['tour-card-booking-count']}>
                        <Users className={styles['booking-count-icon']} strokeWidth={2} />
                        <span className={styles['booking-count-text']}>
                          {bookingCount} {t('bookingManagement.tourSelector.bookings', { defaultValue: 'booking' })}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tour Pagination */}
            {totalTourPages > 1 && (
              <div className={styles['tour-pagination']}>
                <div className={styles['tour-pagination-info']}>
                  {t('bookingManagement.tourSelector.pagination.showing')} <strong>{currentTourPage}</strong> / <strong>{totalTourPages}</strong> {t('bookingManagement.tourSelector.pagination.of')}{' '}
                  <strong>{tours.length}</strong> {t('bookingManagement.tourSelector.pagination.tours')}
                </div>
                <nav className={styles['tour-pagination-nav']} aria-label="Pagination">
                  <button
                    onClick={() => handleTourPageChange(currentTourPage - 1)}
                    disabled={currentTourPage === 1}
                    className={styles['tour-pagination-btn']}
                  >
                    <ChevronLeftIcon className={styles['pagination-icon']} />
                  </button>
                  {new Array(totalTourPages).fill(null).map((_, idx) => {
                    const page = idx + 1;
                    if (totalTourPages <= 7 || page === 1 || page === totalTourPages || (page >= currentTourPage - 1 && page <= currentTourPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => handleTourPageChange(page)}
                          className={`${styles['tour-pagination-page']} ${currentTourPage === page ? styles['active'] : ''}`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentTourPage - 2 || page === currentTourPage + 2) {
                      return <span key={page} className={styles['tour-pagination-ellipsis']}>...</span>;
                    }
                    return null;
                  })}
                  <button
                    onClick={() => handleTourPageChange(currentTourPage + 1)}
                    disabled={currentTourPage === totalTourPages}
                    className={styles['tour-pagination-btn']}
                  >
                    <ChevronRightIcon className={styles['pagination-icon']} />
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filters */}
      <div className={styles['filters-container']}>
        <div className={styles['filters-wrapper']}>
          {/* Search */}
          <div className={styles['search-box']}>
            <MagnifyingGlassIcon className={styles['search-icon']} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t('bookingManagement.search.placeholder')}
              className={styles['search-input']}
            />
          </div>

          {/* Filters */}
          <div className={styles['filters-group']}>
            {/* Status */}
            <div className={styles['selectWrapper']}>
              <div className={styles['select-container']}>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className={styles['select-native']}
                >
                  <option value="all">{t('bookingManagement.filters.allStatuses')}</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>{formatStatusDisplay(status)}</option>
                  ))}
                </select>
              </div>
              <svg className={styles['select-arrow']} viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.25 7.5L10 12.25 14.75 7.5H5.25z" />
              </svg>
            </div>

            {/* Sort */}
            <div className={styles['selectWrapper']}>
              <div className={styles['select-container']}>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className={styles['select-native']}
                >
                  <option value="newest">{t('bookingManagement.filters.sortBy')} {t('bookingManagement.sort.newest')}</option>
                  <option value="oldest">{t('bookingManagement.filters.sortBy')} {t('bookingManagement.sort.oldest')}</option>
                  <option value="amount-desc">{t('bookingManagement.sort.amountDesc')}</option>
                  <option value="amount-asc">{t('bookingManagement.sort.amountAsc')}</option>
                </select>
              </div>
              <svg className={styles['select-arrow']} viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.25 7.5L10 12.25 14.75 7.5H5.25z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={styles['table-container']}>
        <div className={styles['table-wrapper']}>
          <table className={styles['bookings-table']}>
            <thead>
              <tr>
                <th style={{ width: '48px' }}>
                  <input type="checkbox" style={{ borderRadius: '4px' }} />
                </th>
                <th>{t('bookingManagement.table.bookingId')}</th>
                <th>{t('bookingManagement.table.tour')}</th>
                <th>{t('bookingManagement.table.customer')}</th>
                <th>{t('bookingManagement.table.departureDate')}</th>
                <th>{t('bookingManagement.table.amount')}</th>
                <th>{t('bookingManagement.table.status')}</th>
                <th>{t('bookingManagement.table.createdAt')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles['empty-cell']}>{t('bookingManagement.empty.noBookings')}</td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const isPendingBooking = isPendingStatus(b.bookingStatus);
                  const isUnderComplaint = b.bookingStatus === 'BOOKING_UNDER_COMPLAINT';
                  const canEdit = canEditBooking(b.bookingStatus);
                  const isCompanyConfirmed = b.companyConfirmedCompletion === true;
                  const canShowApproveButton = !isUnderComplaint && canApproveFromList(b.bookingStatus);
                  const isApproving = approvingBookingId === b.bookingId;
                  return (
                  <tr key={b.id}>
                    <td>
                      <input type="checkbox" style={{ borderRadius: '4px' }} />
                    </td>
                    <td className={styles['booking-id']}>{b.bookingId}</td>
                    <td>{b.tourName}</td>
                    <td>{b.contactName}</td>
                    <td>{b.departureDate}</td>
                    <td className={styles['amount-cell']}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.totalAmount || 0)}</td>
                    <td>
                      <span className={styles['status-badge']} style={{ backgroundColor: `${getStatusColor(b.bookingStatus)}15`, color: getStatusColor(b.bookingStatus) }}>
                        {formatStatusDisplay(b.bookingStatus)}
                      </span>
                    </td>
                    <td>{b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                    <td>
                      <div className={styles['action-group']}>
                        <Tooltip text={t('bookingManagement.actions.viewQuick')} position="top">
                          <button
                            type="button"
                            onClick={() => handleViewBooking(b)}
                            className={styles['action-btn']}
                          >
                            <EyeIcon className={styles['action-icon']} />
                          </button>
                        </Tooltip>
                        {!isUnderComplaint && (
                          <Tooltip 
                            text={t('bookingManagement.actions.editBooking')} 
                            position="top"
                          >
                            <button
                              type="button"
                              onClick={() => handleEditBooking(b)}
                              className={`${styles['action-btn']} ${(!canEdit || isPendingBooking) ? styles['action-btn-disabled'] : ''}`}
                              disabled={!canEdit || isPendingBooking}
                            >
                              <PencilSquareIcon className={styles['action-icon']} />
                            </button>
                          </Tooltip>
                        )}
                        {canShowApproveButton && (
                          <Tooltip 
                            text={t('bookingManagement.actions.confirmTourCompletion')} 
                            position="top"
                          >
                            <button
                              type="button"
                              onClick={() => handleApproveBooking(b)}
                              className={`${styles['action-btn']} ${(isApproving || isCompanyConfirmed) ? styles['action-btn-disabled'] : ''}`}
                              disabled={isApproving || isCompanyConfirmed}
                            >
                              <CheckCircleIcon className={styles['action-icon']} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles['pagination']}>
          <div className={styles['pagination-info']}>
            {t('bookingManagement.tourSelector.pagination.showing')} <strong>{currentPage}</strong> / <strong>{totalPages}</strong> {t('bookingManagement.tourSelector.pagination.of')}{' '}
            <strong>{totalItems}</strong> {t('bookingManagement.loading', { defaultValue: 'booking' })}
          </div>
          <nav className={styles['pagination-nav']} aria-label="Pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles['pagination-btn']}
            >
              <ChevronLeftIcon className={styles['pagination-icon']} />
            </button>
            {new Array(totalPages).fill(null).map((_, idx) => {
              const page = idx + 1;
              if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`${styles['pagination-page']} ${currentPage === page ? styles['active'] : ''}`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className={styles['pagination-ellipsis']}>...</span>;
              }
              return null;
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={styles['pagination-btn']}
            >
              <ChevronRightIcon className={styles['pagination-icon']} />
            </button>
          </nav>
        </div>
      </div>
    </div>
      {/* Booking Detail Modal - Rendered outside booking management container */}
      {modalContainerRef.current && modalNode ? createPortal(modalNode, modalContainerRef.current) : modalNode}
    </>
  );
};

export default BookingManagement;
