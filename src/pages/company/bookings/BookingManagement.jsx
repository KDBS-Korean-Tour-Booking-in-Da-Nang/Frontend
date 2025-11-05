import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './BookingManagement.module.css';
import { useToast } from '../../../contexts/ToastContext';
import { API_ENDPOINTS, getImageUrl } from '../../../config/api';
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
  const navigate = useNavigate();
  // consts only
  
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState([]);
  const [toursLoading, setToursLoading] = useState(true);
  const selectedTourIdRef = useRef(null);
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
    'WAITING_FOR_APPROVAL',
    'BOOKING_REJECTED',
    'WAITING_FOR_UPDATE',
    'BOOKING_FAILED',
    'BOOKING_SUCCESS'
  ];

  const handleViewBooking = (bookingId) => {
    if (!bookingId) return;
    navigate(`/user/booking/${bookingId}`);
  };

  const handleApproveBooking = (bookingId) => {
    setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, bookingStatus: 'BOOKING_SUCCESS' } : b));
    showSuccess?.('Đã duyệt booking');
  };

  const handleRejectBooking = (bookingId) => {
    setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, bookingStatus: 'BOOKING_REJECTED' } : b));
    showSuccess?.('Đã từ chối booking');
  };

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
      if (!res.ok) {
        setTours([]);
      } else {
        const data = await res.json();
        setTours(Array.isArray(data) ? data : []);
        setCurrentTourPage(1); // Reset to first page when tours are loaded
      }
    } catch (e) {
      console.error(e);
      setTours([]);
    } finally {
      setToursLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanyTours(); }, [fetchCompanyTours]);

  // Load mock bookings initially (list without requiring selection)
  useEffect(() => {
    setLoading(true);
    const mock = generateMockBookings();
    setAllBookings(mock);
    setLoading(false);
  }, []);

  useEffect(() => {
    filterAndPaginateBookings();
  }, [searchQuery, statusFilter, sortBy, currentPage, allBookings]);

  // no-op: fetching real bookings will replace this

  const generateMockBookings = () => {
    const tours = ['Tour Hạ Long', 'Tour Sapa', 'Tour Phú Quốc', 'Tour Đà Lạt'];
    const statusList = statuses;
    const bookings = [];
    
    for (let i = 1; i <= 50; i++) {
      const tourIndex = Math.floor(Math.random() * tours.length);
      const statusIndex = Math.floor(Math.random() * statusList.length);
      bookings.push({
        id: i,
        bookingId: `BK-${String(i).padStart(4, '0')}`,
        tourId: tourIndex + 1,
        tourName: tours[tourIndex],
        contactName: `Nguyễn Văn ${String.fromCodePoint(65 + (i % 26))}`,
        contactEmail: `user${i}@example.com`,
        contactPhone: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
        departureDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        adultsCount: Math.floor(Math.random() * 4) + 1,
        childrenCount: Math.floor(Math.random() * 3),
        babiesCount: Math.floor(Math.random() * 2),
        totalAmount: (Math.floor(Math.random() * 50) + 10) * 100000,
        bookingStatus: statusList[statusIndex],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    return bookings;
  };

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
      case 'WAITING_FOR_APPROVAL':
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const getImageSrc = (tourImgPath) => {
    if (!tourImgPath) return '';
    if (tourImgPath.startsWith('http')) return tourImgPath;
    const normalized = tourImgPath.startsWith('/uploads')
      ? tourImgPath
      : `/uploads/tours/thumbnails/${tourImgPath}`;
    return getImageUrl(normalized);
  };

  return (
    <div className="space-y-6 overflow-visible">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Tour Booking</h1>
          <p className="mt-1 text-sm text-gray-500">Quản lý tất cả các booking theo tour</p>
        </div>
      </div>

      {/* Tour Cards Selector */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Chọn tour để xem booking</h2>
        {toursLoading ? (
          <div className="text-gray-500">Đang tải danh sách tour...</div>
        ) : tours.length === 0 ? (
          <div className="text-gray-500">Chưa có tour nào.</div>
        ) : (
          <>
            {/* Tour Cards - Single Row */}
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {paginatedTours.map((tour) => (
                <button
                  key={tour.id}
                  className={`flex-shrink-0 text-left border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow`}
                  style={{ width: '220px', minWidth: '220px' }}
                  onClick={() => { selectedTourIdRef.current = tour.id; setCurrentPage(1); }}
                >
                  {/* Fixed image height for uniform cards */}
                  <div style={{ height: 160, background: '#f3f4f6' }}>
                    {tour.tourImgPath ? (
                      <img
                        src={getImageSrc(tour.tourImgPath)}
                        alt={tour.tourName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.src = '/default-Tour.jpg'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">🏞️</div>
                    )}
                  </div>
                  {/* Fixed content height so cards align */}
                  <div className="p-3 flex flex-col justify-between" style={{ height: 112 }}>
                    <div className="font-semibold leading-snug line-clamp-2" title={tour.tourName || ''}>{tour.tourName}</div>
                    <div className="text-sm text-gray-500 mt-2">Mã tour: {tour.id}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Tour Pagination */}
            {totalTourPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handleTourPageChange(currentTourPage - 1)}
                    disabled={currentTourPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => handleTourPageChange(currentTourPage + 1)}
                    disabled={currentTourPage === totalTourPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Hiển thị trang <span className="font-medium">{currentTourPage}</span> / <span className="font-medium">{totalTourPages}</span> của{' '}
                      <span className="font-medium">{tours.length}</span> tour
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handleTourPageChange(currentTourPage - 1)}
                        disabled={currentTourPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Trước</span>
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      {new Array(totalTourPages).fill(null).map((_, idx) => {
                        const page = idx + 1;
                        if (totalTourPages <= 7 || page === 1 || page === totalTourPages || (page >= currentTourPage - 1 && page <= currentTourPage + 1)) {
                          return (
                            <button
                              key={page}
                              onClick={() => handleTourPageChange(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentTourPage === page
                                  ? 'z-10 bg-red-600 border-red-600 text-white'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentTourPage - 2 || page === currentTourPage + 2) {
                          return <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                        }
                        return null;
                      })}
                      <button
                        onClick={() => handleTourPageChange(currentTourPage + 1)}
                        disabled={currentTourPage === totalTourPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Sau</span>
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filters (always visible with mock data) */}
      <div className="bg-white shadow-sm rounded-lg p-4 overflow-visible">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm tên khách, mã booking..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3 w-full sm:w-auto overflow-visible">
            {/* Status */}
            <div className={`${styles.selectWrapper} relative z-10`}>
              <div className="border border-gray-300 rounded-md bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-transparent outline-none appearance-none border-0 sm:text-sm"
                >
                  <option value="all">Tất cả trạng thái</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>{formatStatusDisplay(status)}</option>
                  ))}
                </select>
              </div>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.25 7.5L10 12.25 14.75 7.5H5.25z" />
              </svg>
            </div>

            {/* Sort */}
            <div className={`${styles.selectWrapper} relative z-10`}>
              <div className="border border-gray-300 rounded-md bg-white focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-transparent outline-none appearance-none border-0 sm:text-sm"
                >
                  <option value="newest">Sắp xếp theo: Mới nhất</option>
                  <option value="oldest">Sắp xếp theo: Cũ nhất</option>
                  <option value="amount-desc">Số tiền cao → thấp</option>
                  <option value="amount-asc">Số tiền thấp → cao</option>
                </select>
              </div>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.25 7.5L10 12.25 14.75 7.5H5.25z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tour</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày khởi hành</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">Không có booking nào</td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{b.bookingId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.tourName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.contactName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.departureDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.totalAmount || 0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: `${getStatusColor(b.bookingStatus)}15`, color: getStatusColor(b.bookingStatus) }}>
                        {t(`bookingManagement.status.${b.bookingStatus}`) || b.bookingStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(b.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Xem chi tiết"
                          onClick={() => handleViewBooking(b.bookingId)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-600"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          title="Duyệt"
                          onClick={() => handleApproveBooking(b.id)}
                          className="p-1 rounded hover:bg-green-50 text-green-600"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          title="Từ chối"
                          onClick={() => handleRejectBooking(b.id)}
                          className="p-1 rounded hover:bg-red-50 text-red-600"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Hiển thị trang <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span> của{' '}
                <span className="font-medium">{totalItems}</span> booking
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Trước</span>
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                {new Array(totalPages).fill(null).map((_, idx) => {
                  const page = idx + 1;
                  if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-red-600 border-red-600 text-white'
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
                  <span className="sr-only">Sau</span>
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingManagement;
