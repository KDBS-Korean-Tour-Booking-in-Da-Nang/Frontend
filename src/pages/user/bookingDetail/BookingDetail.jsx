import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBookingById, getGuestsByBookingId, updateBooking } from '../../../services/bookingAPI';
import { DeleteConfirmModal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext';
import { formatDateForAPI } from '../../../utils/bookingFormatter';
import EditBookingModal from './EditBookingModal';
import {
  ArrowLeftIcon,
  CreditCardIcon,
  PencilIcon,
  CalendarIcon,
  UserGroupIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import styles from './BookingDetail.module.css';

const normalizeStatus = (status) => {
  if (status === null || status === undefined) {
    return 'PENDING_PAYMENT';
  }

  if (typeof status === 'number') {
    if (status === 1) return 'BOOKING_SUCCESS';
    if (status === 2) return 'BOOKING_REJECTED';
    return 'PENDING_PAYMENT';
  }

  const raw = String(status).trim().toUpperCase();

  if (raw === '0') return 'PENDING_PAYMENT';
  if (raw === '1') return 'BOOKING_SUCCESS';
  if (raw === '2') return 'BOOKING_REJECTED';

  // Map các status từ backend
  const statusMap = {
    'PENDING_PAYMENT': 'PENDING_PAYMENT',
    'WAITING_FOR_APPROVED': 'WAITING_FOR_APPROVED',
    'WAITING_FOR_UPDATE': 'WAITING_FOR_UPDATE',
    'BOOKING_REJECTED': 'BOOKING_REJECTED',
    'BOOKING_FAILED': 'BOOKING_FAILED',
    'BOOKING_SUCCESS': 'BOOKING_SUCCESS',
    // Legacy mappings
    'PURCHASED': 'BOOKING_SUCCESS',
    'CONFIRMED': 'WAITING_FOR_APPROVED',
    'PENDING': 'PENDING_PAYMENT',
    'CANCELLED': 'BOOKING_REJECTED',
    'FAILED': 'BOOKING_FAILED',
    'SUCCESS': 'BOOKING_SUCCESS'
  };

  return statusMap[raw] || 'PENDING_PAYMENT';
};

const BookingDetail = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guests, setGuests] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const [bookingData, guestsData] = await Promise.all([
          getBookingById(id),
          getGuestsByBookingId(id).catch(() => []) // Silently fail if guests API fails
        ]);
        setBooking(bookingData);
        setGuests(Array.isArray(guestsData) ? guestsData : []);
      } catch (e) {
        if (e?.message === 'Unauthenticated') {
          navigate('/login', { state: { redirectTo: `/user/booking?id=${id}` } });
          return;
        }
        setError(e.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchDetail();
    }
  }, [id, navigate]);

  const status = useMemo(() => normalizeStatus(booking?.bookingStatus || booking?.status), [booking]);
  const isPendingPayment = status === 'PENDING_PAYMENT';
  const isWaitingForUpdate = status === 'WAITING_FOR_UPDATE';

  const handleEditBooking = () => {
    setShowEditModal(true);
  };

  const handleConfirmEdit = async (formData) => {
    // Close edit modal first
    setShowEditModal(false);
    
    // Directly submit update (confirmation already done in EditBookingModal)
    if (!formData || !booking) return;
    
    try {
      setLoading(true);
      
      // Format booking data for API
      const bookingData = {
        tourId: booking.tourId || booking.tour?.tourId || booking.tour?.id,
        userEmail: booking.userEmail || booking.contactEmail,
        contactName: formData.contactName,
        contactAddress: formData.contactAddress,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        pickupPoint: formData.pickupPoint || '',
        note: formData.note || '',
        departureDate: formatDateForAPI(formData.departureDate, 'vi'),
        adultsCount: formData.adultsCount,
        childrenCount: formData.childrenCount,
        babiesCount: formData.babiesCount,
        bookingGuestRequests: formData.guests.map(guest => ({
          fullName: guest.fullName,
          birthDate: formatDateForAPI(guest.birthDate, 'vi'),
          gender: guest.gender,
          idNumber: guest.idNumber || '',
          nationality: guest.nationality || 'Vietnamese',
          bookingGuestType: guest.bookingGuestType
        }))
      };

      const updatedBooking = await updateBooking(booking.bookingId, bookingData);
      setBooking(updatedBooking);
      showSuccess('Đã cập nhật booking thành công');
      
      // Refresh booking data
      const [refreshedBooking, refreshedGuests] = await Promise.all([
        getBookingById(id),
        getGuestsByBookingId(id).catch(() => [])
      ]);
      setBooking(refreshedBooking);
      setGuests(Array.isArray(refreshedGuests) ? refreshedGuests : []);
    } catch (error) {
      console.error('Error updating booking:', error);
      showError(error.message || 'Không thể cập nhật booking');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'BOOKING_SUCCESS':
        return <CheckCircleIcon className={styles['status-icon']} />;
      case 'BOOKING_REJECTED':
        return <XCircleIcon className={styles['status-icon']} />;
      case 'WAITING_FOR_APPROVED':
      case 'WAITING_FOR_UPDATE':
        return <ClockIcon className={styles['status-icon']} />;
      default:
        return <ClockIcon className={styles['status-icon']} />;
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'BOOKING_SUCCESS':
        return styles['status-success'];
      case 'BOOKING_REJECTED':
      case 'BOOKING_FAILED':
        return styles['status-error'];
      case 'WAITING_FOR_APPROVED':
      case 'WAITING_FOR_UPDATE':
        return styles['status-warning'];
      default:
        return styles['status-pending'];
    }
  };

  if (loading) {
    return (
      <div className={styles['booking-detail-container']}>
        <div className={styles['loading']}>
          <div className={styles['spinner']} />
          <p>{t('bookingHistory.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['booking-detail-container']}>
        <div className={styles['error']}>
          <h3>{t('bookingHistory.error.title')}</h3>
          <p>{error}</p>
          <button className={styles['btn']} onClick={() => navigate(-1)}>
            {t('bookingHistory.backButton')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['booking-detail-container']}>
      {/* Header */}
      <div className={styles['header']}>
        <button className={styles['back-btn']} onClick={() => navigate(-1)}>
          <ArrowLeftIcon className={styles['back-icon']} />
          <span>{t('bookingHistory.backButton')}</span>
        </button>
        <h1 className={styles['page-title']}>{t('bookingHistory.title')}</h1>
      </div>

      {/* Main Card */}
      <div className={styles['card']}>
        {/* Header with Booking ID and Status */}
        <div className={styles['card-header']}>
          <div className={styles['booking-id-section']}>
            <DocumentTextIcon className={styles['header-icon']} />
            <div>
              <div className={styles['booking-id-label']}>{t('bookingHistory.card.bookingId')}</div>
              <div className={styles['booking-id']}>#{booking.bookingId}</div>
            </div>
          </div>
          <div className={`${styles['status-badge']} ${getStatusClass()}`}>
            {getStatusIcon()}
            <span>
              {status === 'BOOKING_SUCCESS' || status === 'PURCHASED' 
                ? t('bookingHistory.status.bookingSuccess') 
                : status === 'BOOKING_REJECTED' || status === 'CANCELLED' 
                ? t('bookingHistory.status.bookingRejected') 
                : status === 'WAITING_FOR_APPROVED'
                ? t('bookingHistory.status.waitingForApproved')
                : status === 'WAITING_FOR_UPDATE'
                ? t('bookingHistory.status.waitingForUpdate')
                : status === 'BOOKING_FAILED'
                ? t('bookingHistory.status.bookingFailed')
                : t('bookingHistory.status.pendingPayment')}
            </span>
          </div>
        </div>

        {/* Tour Information */}
        <div className={styles['info-section']}>
          <div className={styles['section-header']}>
            <MapPinIcon className={styles['section-icon']} />
            <h2 className={styles['section-title']}>Thông tin tour</h2>
          </div>
          <div className={styles['info-grid']}>
            <div className={styles['info-item']}>
              <div className={styles['info-label']}>
                <span>{t('payment.tourName')}</span>
              </div>
              <div className={styles['info-value']}>
                {booking.tourName || booking.tour?.tourName || '-'}
              </div>
            </div>
            <div className={styles['info-item']}>
              <div className={styles['info-label']}>
                <CalendarIcon className={styles['item-icon']} />
                <span>{t('payment.departureDate')}</span>
              </div>
              <div className={styles['info-value']}>{booking.departureDate}</div>
            </div>
            <div className={styles['info-item']}>
              <div className={styles['info-label']}>
                <UserGroupIcon className={styles['item-icon']} />
                <span>{t('payment.totalGuests')}</span>
              </div>
              <div className={styles['info-value']}>{booking.totalGuests}</div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className={styles['info-section']}>
          <div className={styles['section-header']}>
            <UserIcon className={styles['section-icon']} />
            <h2 className={styles['section-title']}>Thông tin liên hệ</h2>
          </div>
          <div className={styles['info-grid']}>
            <div className={styles['info-item']}>
              <div className={styles['info-label']}>
                <span>{t('bookingHistory.card.contactName')}</span>
              </div>
              <div className={styles['info-value']}>{booking.contactName}</div>
            </div>
            <div className={styles['info-item']}>
              <div className={styles['info-label']}>
                <PhoneIcon className={styles['item-icon']} />
                <span>{t('bookingHistory.card.contactPhone')}</span>
              </div>
              <div className={styles['info-value']}>{booking.contactPhone}</div>
            </div>
            <div className={styles['info-item']}>
              <div className={styles['info-label']}>
                <EnvelopeIcon className={styles['item-icon']} />
                <span>Email</span>
              </div>
              <div className={styles['info-value']}>{booking.contactEmail}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isPendingPayment && booking?.bookingId && (
        <div className={styles['action-section']}>
          <button 
            className={styles['action-btn']}
            onClick={() => navigate(`/booking/payment?id=${booking.bookingId}`, {
              state: {
                booking: booking,
                fromBookingDetail: true
              }
            })}
          >
            <CreditCardIcon className={styles['action-icon']} />
            <span>{t('payment.checkPayment.actions.pay')}</span>
          </button>
        </div>
      )}

      {isWaitingForUpdate && booking?.bookingId && (
        <div className={styles['action-section']}>
          <button 
            className={`${styles['action-btn']} ${styles['edit-action-btn']}`}
            onClick={handleEditBooking}
          >
            <PencilIcon className={styles['action-icon']} />
            <span>Chỉnh sửa booking</span>
          </button>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditModal && booking && (
        <EditBookingModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onConfirm={handleConfirmEdit}
          booking={booking}
          guests={guests}
        />
      )}
    </div>
  );
};

export default BookingDetail;


