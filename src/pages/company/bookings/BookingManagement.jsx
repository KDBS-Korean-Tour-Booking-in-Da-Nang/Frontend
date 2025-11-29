import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './BookingManagement.module.css';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, getImageUrl } from '../../../config/api';
import { getAllBookings, getBookingsByTourId, getBookingTotal } from '../../../services/bookingAPI';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import { 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

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

  const statuses = [
    'PENDING_PAYMENT',
    'WAITING_FOR_APPROVED',
    'BOOKING_REJECTED',
    'WAITING_FOR_UPDATE',
    'BOOKING_FAILED',
    'BOOKING_SUCCESS'
  ];

  const isPendingStatus = (status) => {
    if (!status) return false;
    return status.toUpperCase().includes('PENDING');
  };

  const handleViewBooking = (bookingItem) => {
    if (!bookingItem) return;

    const bookingId = bookingItem.bookingId || bookingItem;
    if (!bookingId) return;

    if (isPendingStatus(bookingItem.bookingStatus)) {
      showSuccessRef.current?.('Booking đang ở trạng thái pending, không thể truy cập.');
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
      console.error('Error fetching all bookings:', e);
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
      console.error('Error fetching bookings:', e);
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
        setTours(Array.isArray(data) ? data : []);
        setCurrentTourPage(1); // Reset to first page when tours are loaded
      }
    } catch (e) {
      setTours([]);
    } finally {
      setToursLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanyTours(); }, [fetchCompanyTours]);

  useEffect(() => {
    filterAndPaginateBookings();
  }, [searchQuery, statusFilter, sortBy, currentPage, allBookings]);

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
      case 'PENDING_PAYMENT':
        return '#F59E0B';
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

  const formatStatusDisplay = (status) => {
    return status.replaceAll('_', ' ');
  };

  // status badge helper not needed; computed inline

  // Optional stats (unused in current UI)

  const getImageSrc = (tourImgPath) => {
    if (!tourImgPath) return '';
    if (tourImgPath.startsWith('http')) return tourImgPath;
    const normalized = tourImgPath.startsWith('/uploads')
      ? tourImgPath
      : `/uploads/tours/thumbnails/${tourImgPath}`;
    return getImageUrl(normalized);
  };

  return (
    <div className={styles['booking-management']}>
      {/* Header */}
      <div className={styles['management-header']}>
        <div className={styles['header-title']}>
          <h1>Quản lý Tour Booking</h1>
        </div>
        <p className={styles['header-subtitle']}>Quản lý tất cả các booking theo tour</p>
      </div>

        {/* Tour Cards Selector */}
        <div className={styles['tour-selector-container']}>
        <h2 className={styles['tour-selector-title']}>Chọn tour để xem booking</h2>
        {toursLoading ? (
          <div className={styles['empty-state']}>Đang tải danh sách tour...</div>
        ) : tours.length === 0 ? (
          <div className={styles['empty-state']}>Chưa có tour nào.</div>
        ) : (
          <>
            {/* Tour Cards - Single Row */}
            <div className={styles['tour-cards-container']}>
              {paginatedTours.map((tour) => {
                const normalizedTourId = tour?.id != null ? tour.id.toString() : '';
                const isSelected = selectedTourId === normalizedTourId;

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
                      <div className={styles['tour-card-id']}>Mã tour: {tour.id}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tour Pagination */}
            {totalTourPages > 1 && (
              <div className={styles['tour-pagination']}>
                <div className={styles['tour-pagination-info']}>
                  Hiển thị trang <strong>{currentTourPage}</strong> / <strong>{totalTourPages}</strong> của{' '}
                  <strong>{tours.length}</strong> tour
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
              placeholder="Tìm kiếm tên khách, mã booking..."
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
                  <option value="all">Tất cả trạng thái</option>
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
                  <option value="newest">Sắp xếp theo: Mới nhất</option>
                  <option value="oldest">Sắp xếp theo: Cũ nhất</option>
                  <option value="amount-desc">Số tiền cao → thấp</option>
                  <option value="amount-asc">Số tiền thấp → cao</option>
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
                <th>ID</th>
                <th>Tour</th>
                <th>Khách hàng</th>
                <th>Ngày khởi hành</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles['empty-cell']}>Không có booking nào</td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const isPendingBooking = isPendingStatus(b.bookingStatus);
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
                      <button
                        type="button"
                        title="Xem chi tiết"
                        onClick={() => handleViewBooking(b)}
                        className={`${styles['action-btn']} ${isPendingBooking ? styles['action-btn-disabled'] : ''}`}
                        disabled={isPendingBooking}
                      >
                        <EyeIcon className={styles['action-icon']} />
                      </button>
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
            Hiển thị trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> của{' '}
            <strong>{totalItems}</strong> booking
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
  );
};

export default BookingManagement;
