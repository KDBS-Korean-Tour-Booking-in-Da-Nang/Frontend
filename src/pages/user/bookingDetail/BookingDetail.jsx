import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBookingById, getGuestsByBookingId, updateBooking, userConfirmTourCompletion, createBookingComplaint } from '../../../services/bookingAPI';
import { DeleteConfirmModal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext';
import { formatDateForAPI } from '../../../utils/bookingFormatter';
import EditBookingModal from './EditBookingModal';
import ComplaintModal from './ComplaintModal';
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
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    WAITING_FOR_APPROVED: 'WAITING_FOR_APPROVED',
    WAITING_FOR_UPDATE: 'WAITING_FOR_UPDATE',
    BOOKING_REJECTED: 'BOOKING_REJECTED',
    BOOKING_FAILED: 'BOOKING_FAILED',
    BOOKING_SUCCESS_PENDING: 'BOOKING_SUCCESS_PENDING',
    BOOKING_SUCCESS_WAIT_FOR_CONFIRMED: 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED',
    BOOKING_UNDER_COMPLAINT: 'BOOKING_UNDER_COMPLAINT',
    BOOKING_SUCCESS: 'BOOKING_SUCCESS',
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

const STATUS_COLOR_MAP = {
  // Thanh toán chờ: cam đậm
  PENDING_PAYMENT: '#F97316',
  WAITING_FOR_APPROVED: '#3B82F6',
  WAITING_FOR_UPDATE: '#8B5CF6',
  BOOKING_REJECTED: '#EF4444',
  BOOKING_FAILED: '#DC2626',
  // Đã duyệt nhưng chờ tour diễn ra: teal
  BOOKING_SUCCESS_PENDING: '#14B8A6',
  BOOKING_SUCCESS_WAIT_FOR_CONFIRMED: '#2563EB',
  // Đang khiếu nại: vàng tươi
  BOOKING_UNDER_COMPLAINT: '#EAB308',
  BOOKING_SUCCESS: '#10B981'
};

const BookingDetail = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guests, setGuests] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [showCompletionConfirmModal, setShowCompletionConfirmModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintMessage, setComplaintMessage] = useState('');

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
        setError(e.message || t('bookingDetail.error.loadFailed'));
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
  const isSuccessPending = status === 'BOOKING_SUCCESS_PENDING';
  const isWaitingForConfirmation = status === 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED';
  const isUnderComplaint = status === 'BOOKING_UNDER_COMPLAINT';

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
      showSuccess(t('bookingDetail.edit.toastSuccess'));
      
      // Refresh booking data
      const [refreshedBooking, refreshedGuests] = await Promise.all([
        getBookingById(id),
        getGuestsByBookingId(id).catch(() => [])
      ]);
      setBooking(refreshedBooking);
      setGuests(Array.isArray(refreshedGuests) ? refreshedGuests : []);
    } catch (error) {
      console.error('Error updating booking:', error);
      setError(error.message || t('bookingDetail.edit.toastError'));
    } finally {
      setLoading(false);
    }
  };

  const statusColor = STATUS_COLOR_MAP[status] || '#6B7280';

  const getStatusIcon = () => {
    switch (status) {
      case 'BOOKING_SUCCESS':
        return <CheckCircleIcon className={styles['status-icon']} style={{ color: statusColor }} />;
      case 'BOOKING_REJECTED':
        return <XCircleIcon className={styles['status-icon']} style={{ color: statusColor }} />;
      case 'BOOKING_UNDER_COMPLAINT':
        return <XCircleIcon className={styles['status-icon']} style={{ color: statusColor }} />;
      case 'WAITING_FOR_APPROVED':
      case 'WAITING_FOR_UPDATE':
      case 'BOOKING_SUCCESS_PENDING':
      case 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED':
        return <ClockIcon className={styles['status-icon']} style={{ color: statusColor }} />;
      default:
        return <ClockIcon className={styles['status-icon']} style={{ color: statusColor }} />;
    }
  };

  const statusLabelKey = (() => {
    switch (status) {
      case 'BOOKING_SUCCESS':
      case 'PURCHASED':
      case 'SUCCESS':
        return 'bookingHistory.status.bookingSuccess';
      case 'BOOKING_REJECTED':
      case 'CANCELLED':
        return 'bookingHistory.status.bookingRejected';
      case 'WAITING_FOR_APPROVED':
      case 'CONFIRMED':
        return 'bookingHistory.status.waitingForApproved';
      case 'WAITING_FOR_UPDATE':
        return 'bookingHistory.status.waitingForUpdate';
      case 'BOOKING_FAILED':
      case 'FAILED':
        return 'bookingHistory.status.bookingFailed';
      case 'BOOKING_SUCCESS_PENDING':
        return 'bookingHistory.status.bookingSuccessPending';
      case 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED':
        return 'bookingHistory.status.bookingSuccessWaitForConfirmed';
      case 'BOOKING_UNDER_COMPLAINT':
        return 'bookingHistory.status.bookingUnderComplaint';
      default:
        return 'bookingHistory.status.pendingPayment';
    }
  })();

  const handleUserConfirmCompletion = async () => {
    if (!booking?.bookingId) return;
    try {
      setConfirmingCompletion(true);
      await userConfirmTourCompletion(booking.bookingId);
      showSuccess(t('bookingDetail.completion.toastSuccess'));
      const refreshedBooking = await getBookingById(booking.bookingId);
      setBooking(refreshedBooking);
    } catch (err) {
      setError(err.message || t('bookingDetail.completion.toastError'));
    } finally {
      setConfirmingCompletion(false);
      setShowCompletionConfirmModal(false);
    }
  };

  const handleSubmitComplaint = async (messageFromModal) => {
    if (!booking?.bookingId) return;
    const trimmed = (messageFromModal ?? complaintMessage).trim();
    if (!trimmed) {
      setError(t('bookingDetail.complaint.emptyError'));
      return;
    }
    try {
      setLoading(true);
      await createBookingComplaint(booking.bookingId, trimmed);
      showSuccess(t('bookingDetail.complaint.toastSuccess'));
      setComplaintMessage('');
      setShowComplaintModal(false);
      const refreshedBooking = await getBookingById(booking.bookingId);
      setBooking(refreshedBooking);
    } catch (err) {
      setError(err.message || t('bookingDetail.complaint.toastError'));
    } finally {
      setLoading(false);
    }
  };

  const renderCompletionInfo = () => {
    if (!booking) return null;
    return (
      <div className={styles['completion-note']}>
        <p>
          {booking.autoConfirmedDate
            ? t('bookingDetail.completion.autoConfirmWithDate', {
                date: new Date(booking.autoConfirmedDate).toLocaleDateString('vi-VN')
              })
            : t('bookingDetail.completion.autoConfirmDefault')}
        </p>
      </div>
    );
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
          <div
            className={styles['status-badge']}
            style={{
              backgroundColor: `${statusColor}15`,
              color: statusColor,
              border: `1px solid ${statusColor}30`
            }}
          >
            {getStatusIcon()}
            <span>{t(statusLabelKey)}</span>
          </div>
        </div>

        {/* Tour Information */}
        <div className={styles['info-section']}>
          <div className={styles['section-header']}>
            <MapPinIcon className={styles['section-icon']} />
            <h2 className={styles['section-title']}>{t('bookingDetail.sections.tourInfo')}</h2>
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
            <h2 className={styles['section-title']}>{t('bookingDetail.sections.contactInfo')}</h2>
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
                <span>{t('bookingDetail.sections.email')}</span>
              </div>
              <div className={styles['info-value']}>{booking.contactEmail}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {booking?.bookingId && (
        <>
          {isPendingPayment && (
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

          {isWaitingForUpdate && (
            <div className={styles['action-section']}>
              <button 
                className={`${styles['action-btn']} ${styles['edit-action-btn']}`}
                onClick={handleEditBooking}
              >
                <PencilIcon className={styles['action-icon']} />
                <span>{t('bookingDetail.actions.editBooking')}</span>
              </button>
            </div>
          )}

          {isSuccessPending && (
            <div className={styles['action-section']}>
              <div className={styles['info-banner']}>
                <p>{t('bookingDetail.info.successPending')}</p>
                <p>
                  {t('bookingDetail.info.expectedEndDatePrefix')}{' '}
                  {booking.tourEndDate ? new Date(booking.tourEndDate).toLocaleDateString('vi-VN') : '-'}
                </p>
              </div>
            </div>
          )}

          {isWaitingForConfirmation && (
            <div className={styles['action-section']}>
              <div className={styles['info-banner']}>
                <p>{t('bookingDetail.info.waitingForConfirmation')}</p>
                {renderCompletionInfo()}
              </div>
              <div className={styles['completion-actions']}>
                <button 
                  className={styles['confirm-btn']}
                  onClick={() => setShowCompletionConfirmModal(true)}
                  disabled={confirmingCompletion}
                >
                  <CheckCircleIcon className={styles['action-icon']} />
                  <span>{t('bookingDetail.actions.complete')}</span>
                </button>
                <button 
                  type="button"
                  className={styles['complaint-btn']}
                  onClick={() => setShowComplaintModal(true)}
                >
                  <XCircleIcon className={styles['action-icon']} />
                  <span>{t('bookingDetail.actions.complaint')}</span>
                </button>
              </div>
            </div>
          )}
          {isUnderComplaint && (
            <div className={styles['action-section']}>
              <div className={styles['info-banner']}>
                <p>{t('bookingDetail.info.underComplaint')}</p>
              </div>
            </div>
          )}
        </>
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

      {/* Modal xác nhận hoàn thành tour */}
      {showCompletionConfirmModal && (
        <DeleteConfirmModal
          isOpen={showCompletionConfirmModal}
          onClose={() => !confirmingCompletion && setShowCompletionConfirmModal(false)}
          onConfirm={handleUserConfirmCompletion}
          title={t('bookingDetail.modal.completionTitle')}
          message={t('bookingDetail.modal.completionMessage')}
          confirmText={
            confirmingCompletion
              ? t('bookingDetail.modal.confirmProcessing')
              : t('bookingDetail.modal.confirm')
          }
          cancelText={t('common.cancel')}
          icon="✓"
          danger={false}
          disableBackdropClose={confirmingCompletion}
        >
          {renderCompletionInfo()}
        </DeleteConfirmModal>
      )}

      {/* Modal khiếu nại tour */}
      {showComplaintModal && (
        <ComplaintModal
          isOpen={showComplaintModal}
          onClose={() => setShowComplaintModal(false)}
          onConfirm={handleSubmitComplaint}
          bookingId={booking?.bookingId}
        />
      )}
    </div>
  );
};

export default BookingDetail;


