import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';
import { getBookingTotal } from '../../../services/bookingAPI';
import BookingHistoryCard from './BookingHistoryCard';
import styles from './BookingHistory.module.css';

// Normalizers for mixed BE formats (numeric / string) and different field names
const normalizeStatus = (status) => {
  if (typeof status === 'number') return status === 1 ? 'purchased' : status === 2 ? 'cancelled' : 'pending';
  if (status === '0') return 'pending';
  if (status === '1') return 'purchased';
  if (status === '2') return 'cancelled';
  return String(status || 'pending').toLowerCase();
};
const normalizeTrx = (trx) => {
  if (!trx && typeof trx !== 'number') return undefined;
  if (typeof trx === 'number') return trx === 1 ? 'success' : trx === 2 ? 'failed' : trx === 3 ? 'cancelled' : 'pending';
  return String(trx || '').toLowerCase();
};

const BookingHistory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('newest');
  const [allBookings, setAllBookings] = useState([]);
  const itemsPerPage = 3;

  useEffect(() => {
    if (!user) return;
    
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get token from storage (check both localStorage and sessionStorage)
        const remembered = localStorage.getItem('rememberMe') === 'true';
        const storage = remembered ? localStorage : sessionStorage;
        const token = storage.getItem('token');
        
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        const response = await fetch(API_ENDPOINTS.BOOKING_BY_EMAIL(user.email), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please login again.');
          }
          throw new Error(`Failed to fetch booking history: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        // Fetch total amounts for all bookings in parallel
        const bookingsWithTotals = await Promise.all(
          data.map(async (booking) => {
            try {
              const totalResp = await getBookingTotal(booking.bookingId);
              return {
                bookingId: booking.bookingId,
                tourId: booking.tourId,
                tourName: booking.tourName,
                contactName: booking.contactName,
                contactPhone: booking.contactPhone,
                contactEmail: booking.contactEmail,
                departureDate: booking.departureDate,
                totalGuests: booking.totalGuests,
                status: booking.bookingStatus, // Use correct bookingStatus from BookingResponse
                totalAmount: totalResp?.totalAmount || 0,
                createdAt: booking.createdAt
              };
            } catch (err) {
              console.error(`Failed to fetch total for booking ${booking.bookingId}:`, err);
              return {
                bookingId: booking.bookingId,
                tourId: booking.tourId,
                tourName: booking.tourName,
                contactName: booking.contactName,
                contactPhone: booking.contactPhone,
                contactEmail: booking.contactEmail,
                departureDate: booking.departureDate,
                totalGuests: booking.totalGuests,
                status: booking.bookingStatus,
                totalAmount: 0,
                createdAt: booking.createdAt
              };
            }
          })
        );
        setAllBookings(bookingsWithTotals);
        
        // Calculate pagination
        const totalItems = bookingsWithTotals.length;
        const totalPagesCount = Math.ceil(totalItems / itemsPerPage);
        setTotalPages(totalPagesCount);
        
        // Set initial page data
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        setBookings(bookingsWithTotals.slice(startIndex, endIndex));
      } catch (err) {
        console.error('Error fetching booking history:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  // Handle pagination and filtering
  useEffect(() => {
    if (allBookings.length === 0) return;

    // Apply filters
    let filteredBookings = [...allBookings];

    // Status filter
    if (statusFilter !== 'all') {
      filteredBookings = filteredBookings.filter(booking => {
        const status = normalizeStatus(booking.status ?? booking.bookingStatus);
        const trx = normalizeTrx(booking.transactionStatus ?? booking.latestTransactionStatus);
        if (statusFilter === 'purchased') {
          return status === 'purchased' || status === 'confirmed' || trx === 'success';
        }
        if (statusFilter === 'pending') {
          return status === 'pending' && trx !== 'success';
        }
        return status === statusFilter.toLowerCase();
      });
    }

    // Date filter
    if (dateFilter === 'newest') {
      filteredBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (dateFilter === 'oldest') {
      filteredBookings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    // Calculate pagination for filtered results
    const totalItems = filteredBookings.length;
    const totalPagesCount = Math.ceil(totalItems / itemsPerPage);
    setTotalPages(totalPagesCount);

    // Reset to page 1 when filters change
    setCurrentPage(1);

    // Get current page data
    const startIndex = 0;
    const endIndex = itemsPerPage;
    setBookings(filteredBookings.slice(startIndex, endIndex));
  }, [allBookings, statusFilter, dateFilter]);

  // Handle page change
  useEffect(() => {
    if (allBookings.length === 0) return;

    // Apply filters
    let filteredBookings = [...allBookings];

    if (statusFilter !== 'all') {
      filteredBookings = filteredBookings.filter(booking => {
        const status = normalizeStatus(booking.status ?? booking.bookingStatus);
        const trx = normalizeTrx(booking.transactionStatus ?? booking.latestTransactionStatus);
        if (statusFilter === 'purchased') {
          return status === 'purchased' || status === 'confirmed' || trx === 'success';
        }
        if (statusFilter === 'pending') {
          return status === 'pending' && trx !== 'success';
        }
        return status === statusFilter.toLowerCase();
      });
    }

    if (dateFilter === 'newest') {
      filteredBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (dateFilter === 'oldest') {
      filteredBookings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    // Get current page data
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setBookings(filteredBookings.slice(startIndex, endIndex));
  }, [currentPage, allBookings, statusFilter, dateFilter]);

  if (!user) {
    return (
      <div className={styles['booking-history-container']}>
        <div className={styles['login-required']}>
          <h2>{t('bookingHistory.loginRequired.title')}</h2>
          <p>{t('bookingHistory.loginRequired.message')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles['booking-history-container']}>
        <div className={styles['loading-container']}>
          <div className={styles['loading-spinner']}></div>
          <p>{t('bookingHistory.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['booking-history-container']}>
        <div className={styles['error-container']}>
          <h3>{t('bookingHistory.error.title')}</h3>
          <p>{error}</p>
          <button 
            className={styles['retry-btn']}
            onClick={() => window.location.reload()}
          >
            {t('bookingHistory.error.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['booking-history-container']}>
      <div className={styles['booking-history-wrapper']}>
        {/* Header */}
        <div className={styles['booking-history-header']}>
          <button 
            className={styles['back-button']}
            onClick={() => navigate(-1)}
            title={t('bookingHistory.backButton')}
          >
            ← {t('bookingHistory.backButton')}
          </button>
          <h1 className={styles['booking-history-title']}>
            {t('bookingHistory.title')}
          </h1>
        </div>

        {/* Filters */}
        <div className={styles['filters-section']}>
          <div className={styles['filter-group']}>
            <label className={styles['filter-label']}>
              {t('bookingHistory.filters.status')}
            </label>
            <select 
              className={styles['filter-select']}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('bookingHistory.filters.allStatus')}</option>
              <option value="pending">{t('bookingHistory.status.pending')}</option>
              <option value="purchased">{t('bookingHistory.status.purchased') || t('bookingHistory.status.confirmed')}</option>
              <option value="cancelled">{t('bookingHistory.status.cancelled')}</option>
            </select>
          </div>
          
          <div className={styles['filter-group']}>
            <label className={styles['filter-label']}>
              {t('bookingHistory.filters.date')}
            </label>
            <select 
              className={styles['filter-select']}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="newest">{t('bookingHistory.filters.newestDate')}</option>
              <option value="oldest">{t('bookingHistory.filters.oldestDate')}</option>
            </select>
          </div>
        </div>

        {/* Bookings Container */}
        <div className={styles['bookings-container']}>
          {bookings.length === 0 ? (
            <div className={styles['empty-state']}>
              <div className={styles['empty-icon']}>📋</div>
              <h3>{t('bookingHistory.empty.title')}</h3>
              <p>{t('bookingHistory.empty.message')}</p>
            </div>
          ) : (
            <>
              <div className={styles['bookings-list']}>
                {bookings.map((booking) => (
                  <BookingHistoryCard 
                    key={booking.bookingId} 
                    booking={booking} 
                  />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles['pagination']}>
                  <button 
                    className={styles['pagination-btn']}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    «
                  </button>
                  <button 
                    className={styles['pagination-btn']}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    ‹
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        className={`${styles['pagination-page']} ${currentPage === pageNum ? styles['active'] : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      <span className={styles['pagination-ellipsis']}>...</span>
                      <button
                        className={`${styles['pagination-page']} ${currentPage === totalPages ? styles['active'] : ''}`}
                        onClick={() => setCurrentPage(totalPages)}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  
                  <button 
                    className={styles['pagination-btn']}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    ›
                  </button>
                  <button 
                    className={styles['pagination-btn']}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    »
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingHistory;
