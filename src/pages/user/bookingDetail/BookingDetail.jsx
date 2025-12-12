import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBookingById, getGuestsByBookingId, updateBooking, userConfirmTourCompletion, createBookingComplaint } from '../../../services/bookingAPI';
import { previewApplyVoucher } from '../../../services/voucherAPI';
import { DeleteConfirmModal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { formatDateForAPI } from '../../../utils/bookingFormatter';
import { API_ENDPOINTS, createAuthHeaders } from '../../../config/api';
import EditBookingModal from './EditBookingModal/EditBookingModal';
import ComplaintModal from './ComplaintModal/ComplaintModal';
import PaymentConfirmModal from '../../../components/modals/PaymentConfirmModal/PaymentConfirmModal';
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
    PENDING_DEPOSIT_PAYMENT: 'PENDING_DEPOSIT_PAYMENT',
    PENDING_BALANCE_PAYMENT: 'PENDING_BALANCE_PAYMENT',
    WAITING_FOR_APPROVED: 'WAITING_FOR_APPROVED',
    WAITING_FOR_UPDATE: 'WAITING_FOR_UPDATE',
    BOOKING_REJECTED: 'BOOKING_REJECTED',
    BOOKING_FAILED: 'BOOKING_FAILED',
    BOOKING_BALANCE_SUCCESS: 'BOOKING_BALANCE_SUCCESS',
    BOOKING_SUCCESS_PENDING: 'BOOKING_SUCCESS_PENDING',
    BOOKING_SUCCESS_WAIT_FOR_CONFIRMED: 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED',
    BOOKING_UNDER_COMPLAINT: 'BOOKING_UNDER_COMPLAINT',
    BOOKING_SUCCESS: 'BOOKING_SUCCESS',
    BOOKING_CANCELLED: 'BOOKING_CANCELLED',
    // Legacy mappings
    'PURCHASED': 'BOOKING_SUCCESS',
    'CONFIRMED': 'WAITING_FOR_APPROVED',
    'PENDING': 'PENDING_PAYMENT',
    'CANCELLED': 'BOOKING_CANCELLED',
    'FAILED': 'BOOKING_FAILED',
    'SUCCESS': 'BOOKING_SUCCESS'
  };

  return statusMap[raw] || 'PENDING_PAYMENT';
};

const STATUS_COLOR_MAP = {
  // Thanh toán chờ: cam đậm
  PENDING_PAYMENT: '#F97316',              // Orange
  PENDING_DEPOSIT_PAYMENT: '#EA580C',     // Orange darker (riêng biệt)
  PENDING_BALANCE_PAYMENT: '#F59E0B',      // Amber
  WAITING_FOR_APPROVED: '#3B82F6',         // Blue
  WAITING_FOR_UPDATE: '#8B5CF6',           // Purple
  BOOKING_REJECTED: '#EF4444',             // Red
  BOOKING_FAILED: '#DC2626',               // Red darker
  // Đã duyệt nhưng chờ tour diễn ra: teal
  BOOKING_BALANCE_SUCCESS: '#14B8A6',      // Teal
  BOOKING_SUCCESS_PENDING: '#06B6D4',       // Cyan (riêng biệt)
  BOOKING_SUCCESS_WAIT_FOR_CONFIRMED: '#2563EB', // Blue darker
  // Đang khiếu nại: vàng tươi
  BOOKING_UNDER_COMPLAINT: '#EAB308',      // Yellow
  BOOKING_SUCCESS: '#10B981',              // Green
  BOOKING_CANCELLED: '#9CA3AF'            // Gray
};

const BookingDetail = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const { user, getToken } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guests, setGuests] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [showCompletionConfirmModal, setShowCompletionConfirmModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintMessage, setComplaintMessage] = useState('');
  const [showGuestsModal, setShowGuestsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState(null); // 'deposit', 'full', 'balance'
  const [voucherPreview, setVoucherPreview] = useState(null);
  const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);

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

  // Load voucher preview using bookingId (backend will get voucherCode from booking)
  useEffect(() => {
    const loadVoucherPreview = async () => {
      if (!booking?.bookingId) return;
      
      setIsLoadingVoucher(true);
      try {
        // Call API without voucherCode - backend will get it from booking
        const preview = await previewApplyVoucher(booking.bookingId);
        if (preview) {
          setVoucherPreview(preview);
        }
      } catch (err) {
        // If booking doesn't have voucher, set to null
        setVoucherPreview(null);
      } finally {
        setIsLoadingVoucher(false);
      }
    };

    if (booking?.bookingId) {
      loadVoucherPreview();
    }
  }, [booking?.bookingId]);

  const status = useMemo(() => normalizeStatus(booking?.bookingStatus || booking?.status), [booking]);
  const isPendingPayment = status === 'PENDING_PAYMENT';
  const isWaitingForUpdate = status === 'WAITING_FOR_UPDATE';
  const isSuccessPending = status === 'BOOKING_SUCCESS_PENDING';
  const isWaitingForConfirmation = status === 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED';
  const isUnderComplaint = status === 'BOOKING_UNDER_COMPLAINT';
  // NEW flags
  const isPendingDepositPayment = status === 'PENDING_DEPOSIT_PAYMENT';
  const isPendingBalancePayment = status === 'PENDING_BALANCE_PAYMENT';
  const isBookingBalanceSuccess = status === 'BOOKING_BALANCE_SUCCESS';
  const isBookingCancelled = status === 'BOOKING_CANCELLED';

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
      case 'PENDING_DEPOSIT_PAYMENT':
      case 'PENDING_BALANCE_PAYMENT':
        return <ClockIcon className={styles['status-icon']} style={{ color: statusColor }} />;
      case 'BOOKING_BALANCE_SUCCESS':
        return <CheckCircleIcon className={styles['status-icon']} style={{ color: statusColor }} />;
      case 'BOOKING_CANCELLED':
        return <XCircleIcon className={styles['status-icon']} style={{ color: statusColor }} />;
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
      case 'PENDING_DEPOSIT_PAYMENT':
        return 'bookingHistory.status.pendingDepositPayment';
      case 'PENDING_BALANCE_PAYMENT':
        return 'bookingHistory.status.pendingBalancePayment';
      case 'BOOKING_BALANCE_SUCCESS':
        return 'bookingHistory.status.bookingBalanceSuccess';
      case 'BOOKING_CANCELLED':
        return 'bookingHistory.status.bookingCancelled';
      default:
        return 'bookingHistory.status.pendingPayment';
    }
  })();

  // Format currency helper
  const formatCurrency = (value) => {
    if (!Number.isFinite(Number(value))) return '—';
    try {
      const krwValue = Math.round(Number(value) / 18);
      return new Intl.NumberFormat('ko-KR').format(krwValue) + ' KRW';
    } catch (error) {
      return Math.round(Number(value) / 18).toLocaleString('ko-KR') + ' KRW';
    }
  };

  // Get locale based on i18n language
  const getLocale = () => {
    const lang = localStorage.getItem('i18nextLng') || 'vi';
    const localeMap = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR' };
    return localeMap[lang] || 'vi-VN';
  };

  const handleUserConfirmCompletion = async () => {
    if (!booking?.bookingId) return;
    try {
      setConfirmingCompletion(true);
      await userConfirmTourCompletion(booking.bookingId);
      showSuccess(t('bookingDetail.completion.toastSuccess'));
      const refreshedBooking = await getBookingById(booking.bookingId);
      setBooking(refreshedBooking);

      // Refresh balance for company if booking is now BOOKING_SUCCESS
      // This will update company's balance in navbar and dashboard
      if (refreshedBooking?.bookingStatus === 'BOOKING_SUCCESS') {
        // Trigger balance update event for company users
        // Use a small delay to ensure the event listener is ready
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('balanceUpdated'));
        }, 100);
      }
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

  const handleConfirmPayment = () => {
    setShowPaymentModal(false);
    if (!booking?.bookingId) return;

    // Navigate to payment page with appropriate state based on type
    // BookingCheckPaymentPage will call preview-apply with bookingId automatically
    const state = {
      booking,
      fromBookingDetail: true,
      isBalancePayment: paymentType === 'balance'
    };

    navigate(`/booking/payment?id=${booking.bookingId}`, { state });
  };

  const renderCompletionInfo = () => {
    if (!booking) return null;
    return (
      <div className={styles['completion-note']}>
        <p>
          {booking.autoConfirmedDate
            ? t('bookingDetail.completion.autoConfirmWithDate', {
              date: new Date(booking.autoConfirmedDate).toLocaleDateString(getLocale())
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

        {/* Payment Information Section - NEW */}
        {(booking?.totalAmount || booking?.payedAmount || booking?.depositAmount || voucherPreview) && (
          <div className={styles['info-section']}>
            <div className={styles['section-header']}>
              <CreditCardIcon className={styles['section-icon']} />
              <h2 className={styles['section-title']}>{t('bookingDetail.sections.paymentInfo')}</h2>
            </div>
            <div className={styles['info-grid']}>
              {/* Total Amount - show original with strikethrough if voucher applied */}
              {(voucherPreview?.originalTotal || booking.totalAmount) && (
                <div className={styles['info-item']}>
                  <div className={styles['info-label']}>
                    <span>{t('bookingDetail.payment.totalAmount', 'Tổng tiền tour')}</span>
                  </div>
                  <div className={styles['info-value']} style={voucherPreview ? { textDecoration: 'line-through', opacity: 0.7, color: '#94a3b8' } : {}}>
                    {formatCurrency(voucherPreview?.originalTotal || booking.totalAmount)}
                  </div>
                </div>
              )}
              
              {/* Voucher Code if applied */}
              {booking?.voucherCode && booking.voucherCode !== 'none' && booking.voucherCode.trim() !== '' && (
                <div className={styles['info-item']}>
                  <div className={styles['info-label']}>
                    <span>{t('booking.step3.payment.voucher', 'Mã giảm giá')}</span>
                  </div>
                  <div className={styles['info-value']} style={{ color: '#059669', fontWeight: 600 }}>
                    {booking.voucherCode}
                  </div>
                </div>
              )}

              {/* Discount Amount (when voucher is applied) */}
              {voucherPreview && (() => {
                const discountAmount = Number(voucherPreview.discountAmount || 0);
                if (discountAmount <= 0) return null;
                
                const discountType = voucherPreview.discountType || voucherPreview.meta?.discountType;
                const discountValue = voucherPreview.discountValue || voucherPreview.meta?.discountValue || 0;
                
                // Display based on discount type
                let discountDisplay = '';
                if (discountType === 'PERCENT' || discountType === 'PERCENTAGE') {
                  // Show percentage discount (e.g., -20%)
                  const percentValue = Number.isFinite(Number(discountValue)) 
                    ? Math.round(Number(discountValue))
                    : discountValue;
                  discountDisplay = `-${percentValue}%`;
                } else if (discountType === 'FIXED' || discountType === 'AMOUNT') {
                  // Show fixed amount discount (e.g., -50,000 KRW)
                  discountDisplay = `-${formatCurrency(discountAmount)}`;
                } else {
                  // Fallback: show amount if type is unknown
                  discountDisplay = `-${formatCurrency(discountAmount)}`;
                }
                
                return (
                  <div className={styles['info-item']}>
                    <div className={styles['info-label']}>
                      <span>{t('booking.step3.payment.discountLabel', 'Giảm giá')}</span>
                    </div>
                    <div className={styles['info-value']} style={{ color: '#059669', fontWeight: 600 }}>
                      {discountDisplay}
                    </div>
                  </div>
                );
              })()}

              {/* Final Total (after voucher) - always show when voucher is applied */}
              {voucherPreview && (
                <div className={styles['info-item']}>
                  <div className={styles['info-label']}>
                    <span>{t('booking.step3.payment.finalTotal', 'Tổng tiền (sau giảm giá)')}</span>
                  </div>
                  <div className={styles['info-value']} style={{ color: '#2563EB', fontWeight: 700, fontSize: '1.05rem' }}>
                    {formatCurrency(voucherPreview.finalTotal || booking.totalAmount || 0)}
                  </div>
                </div>
              )}

              {/* Deposit and Balance - only show if NOT oneTimePayment */}
              {(() => {
                const isOneTimePayment = voucherPreview?.oneTimePayment || 
                  (booking?.depositPercentage === 100) || 
                  (booking?.depositPercentage === 0);
                
                if (isOneTimePayment) return null;
                
                return (
                  <>
                    {/* Deposit Amount - use finalDepositAmount if voucher applied */}
                    {(() => {
                      const depositAmount = voucherPreview?.finalDepositAmount || booking?.depositAmount || 0;
                      const depositPercentage = booking?.depositPercentage || 0;
                      return depositAmount > 0 ? (
                        <div className={styles['info-item']}>
                          <div className={styles['info-label']}>
                            <span>
                              {t('booking.step3.payment.depositAmount', 'Tiền cọc')}
                              {depositPercentage > 0 && ` (${depositPercentage}%)`}
                            </span>
                          </div>
                          <div className={styles['info-value']}>
                            {formatCurrency(depositAmount)}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Remaining Amount - use finalRemainingAmount if voucher applied */}
                    {(() => {
                      const remainingAmount = voucherPreview?.finalRemainingAmount || 
                        (booking?.totalAmount && booking?.depositAmount ? booking.totalAmount - booking.depositAmount : 0);
                      return remainingAmount > 0 ? (
                        <div className={styles['info-item']}>
                          <div className={styles['info-label']}>
                            <span>{t('booking.step3.payment.balanceAmount', 'Còn lại')}</span>
                          </div>
                          <div className={styles['info-value']} style={{ color: '#F59E0B' }}>
                            {formatCurrency(remainingAmount)}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </>
                );
              })()}

              {booking.payedAmount > 0 && (
                <div className={styles['info-item']}>
                  <div className={styles['info-label']}>
                    <span>{t('bookingDetail.payment.payedAmount', 'Đã thanh toán')}</span>
                  </div>
                  <div className={styles['info-value']} style={{ color: '#10B981' }}>
                    {formatCurrency(booking.payedAmount)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Guests Information */}
        {guests && guests.length > 0 && (
          <div className={styles['info-section']}>
            <div className={styles['section-header']}>
              <UserGroupIcon className={styles['section-icon']} />
              <h2 className={styles['section-title']}>{t('bookingDetail.sections.guests')}</h2>
            </div>
            <div className={styles['guests-list']}>
              {(guests.length > 3 ? guests.slice(0, 3) : guests).map((guest, index) => (
                <div key={guest.bookingGuestId || index} className={styles['guest-card']}>
                  <div className={styles['guest-header']}>
                    <span className={styles['guest-index']}>{index + 1}</span>
                    <span className={styles['guest-name']}>{guest.fullName || '-'}</span>
                  </div>
                  <div className={styles['guest-info-grid']}>
                    {guest.bookingGuestType && (
                      <div className={styles['guest-info-item']}>
                        <div className={styles['guest-info-label']}>
                          <UserGroupIcon className={styles['guest-item-icon']} />
                          <span>Type</span>
                        </div>
                        <div className={styles['guest-info-value']}>
                          {guest.bookingGuestType}
                        </div>
                      </div>
                    )}
                    {guest.birthDate && (
                      <div className={styles['guest-info-item']}>
                        <div className={styles['guest-info-label']}>
                          <CalendarIcon className={styles['guest-item-icon']} />
                          <span>DOB</span>
                        </div>
                        <div className={styles['guest-info-value']}>
                          {new Date(guest.birthDate).toLocaleDateString(getLocale())}
                        </div>
                      </div>
                    )}
                    {guest.gender && (
                      <div className={styles['guest-info-item']}>
                        <div className={styles['guest-info-label']}>
                          <UserIcon className={styles['guest-item-icon']} />
                          <span>Gender</span>
                        </div>
                        <div className={styles['guest-info-value']}>
                          {guest.gender}
                        </div>
                      </div>
                    )}
                    {guest.nationality && (
                      <div className={styles['guest-info-item']}>
                        <div className={styles['guest-info-label']}>
                          <MapPinIcon className={styles['guest-item-icon']} />
                          <span>Nationality</span>
                        </div>
                        <div className={styles['guest-info-value']}>
                          {guest.nationality}
                        </div>
                      </div>
                    )}
                    {guest.idNumber && (
                      <div className={styles['guest-info-item']}>
                        <div className={styles['guest-info-label']}>
                          <DocumentTextIcon className={styles['guest-item-icon']} />
                          <span>ID No.</span>
                        </div>
                        <div className={styles['guest-info-value']}>
                          {guest.idNumber}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {guests.length > 3 && (
              <div className={styles['guests-footer']}>
                <button
                  type="button"
                  className={styles['guests-view-all-btn']}
                  onClick={() => setShowGuestsModal(true)}
                >
                  {t('bookingDetail.guests.viewAll', { count: guests.length })}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {booking?.bookingId && (
        <>
          {/* Pay Deposit Button */}
          {isPendingDepositPayment && (
            <div className={styles['action-section']}>
              <button
                className={styles['action-btn']}
                onClick={() => {
                  setPaymentType('deposit');
                  setShowPaymentModal(true);
                }}
              >
                <CreditCardIcon className={styles['action-icon']} />
                <span>{t('bookingDetail.actions.payDeposit')}</span>
              </button>
            </div>
          )}

          {isPendingPayment && (
            <div className={styles['action-section']}>
              <button
                className={styles['action-btn']}
                onClick={() => {
                  setPaymentType('full');
                  setShowPaymentModal(true);
                }}
              >
                <CreditCardIcon className={styles['action-icon']} />
                <span>{t('payment.checkPayment.actions.pay')}</span>
              </button>
            </div>
          )}

          {/* Pay Balance Button - NEW */}
          {isPendingBalancePayment && (
            <div className={styles['action-section']}>
              <div className={styles['info-banner']} style={{ backgroundColor: '#FEF3C7', marginBottom: '1rem' }}>
                <p>{t('bookingDetail.info.balancePaymentRequired')}</p>
                <p style={{ fontWeight: 600 }}>
                  {t('bookingDetail.info.remainingAmount')}: {formatCurrency(booking.totalAmount - booking.payedAmount)}
                </p>
              </div>
              <button
                className={styles['action-btn']}
                onClick={() => {
                  setPaymentType('balance');
                  setShowPaymentModal(true);
                }}
              >
                <CreditCardIcon className={styles['action-icon']} />
                <span>{t('bookingDetail.actions.payBalance')}</span>
              </button>
            </div>
          )}

          {/* Balance Success Info */}
          {isBookingBalanceSuccess && (
            <div className={styles['action-section']}>
              <div className={styles['info-banner']} style={{ backgroundColor: '#D1FAE5' }}>
                <p>{t('bookingDetail.info.balanceSuccess')}</p>
                <p>{t('bookingDetail.info.waitingForDeparture')}</p>
              </div>
            </div>
          )}

          {/* Cancelled Booking Info */}
          {isBookingCancelled && (
            <div className={styles['action-section']}>
              <div className={styles['info-banner']} style={{ backgroundColor: '#F3F4F6' }}>
                <p>{t('bookingDetail.info.cancelled')}</p>
                {booking.cancelDate && (
                  <p>{t('bookingDetail.info.cancelledDate')}: {new Date(booking.cancelDate).toLocaleDateString(getLocale())}</p>
                )}
                {booking.refundAmount > 0 && (
                  <p>{t('bookingDetail.info.refundAmount')}: {formatCurrency(booking.refundAmount)} ({booking.refundPercentage}%)</p>
                )}
              </div>
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
                  {booking.tourEndDate ? new Date(booking.tourEndDate).toLocaleDateString(getLocale()) : '-'}
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
              {/* Hide buttons if user has already confirmed but company hasn't */}
              {!(booking?.userConfirmedCompletion === true && booking?.companyConfirmedCompletion === false) && (
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
              )}
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

      {/* Guests Modal - full list */}
      {showGuestsModal && guests && guests.length > 0 && (
        <div
          className={styles['guests-modal-overlay']}
          onClick={() => setShowGuestsModal(false)}
        >
          <div
            className={styles['guests-modal']}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles['guests-modal-header']}>
              <h3 className={styles['guests-modal-title']}>
                {t('bookingDetail.sections.guests')} ({guests.length})
              </h3>
              <button
                type="button"
                className={styles['guests-modal-close']}
                onClick={() => setShowGuestsModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles['guests-modal-body']}>
              <div className={styles['guests-list']}>
                {guests.map((guest, index) => (
                  <div key={guest.bookingGuestId || index} className={styles['guest-card']}>
                    <div className={styles['guest-header']}>
                      <span className={styles['guest-index']}>{index + 1}</span>
                      <span className={styles['guest-name']}>{guest.fullName || '-'}</span>
                    </div>
                    <div className={styles['guest-info-grid']}>
                      {guest.bookingGuestType && (
                        <div className={styles['guest-info-item']}>
                          <div className={styles['guest-info-label']}>
                            <UserGroupIcon className={styles['guest-item-icon']} />
                            <span>Type</span>
                          </div>
                          <div className={styles['guest-info-value']}>
                            {guest.bookingGuestType}
                          </div>
                        </div>
                      )}
                      {guest.birthDate && (
                        <div className={styles['guest-info-item']}>
                          <div className={styles['guest-info-label']}>
                            <CalendarIcon className={styles['guest-item-icon']} />
                            <span>DOB</span>
                          </div>
                          <div className={styles['guest-info-value']}>
                            {new Date(guest.birthDate).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      )}
                      {guest.gender && (
                        <div className={styles['guest-info-item']}>
                          <div className={styles['guest-info-label']}>
                            <UserIcon className={styles['guest-item-icon']} />
                            <span>Gender</span>
                          </div>
                          <div className={styles['guest-info-value']}>
                            {guest.gender}
                          </div>
                        </div>
                      )}
                      {guest.nationality && (
                        <div className={styles['guest-info-item']}>
                          <div className={styles['guest-info-label']}>
                            <MapPinIcon className={styles['guest-item-icon']} />
                            <span>Nationality</span>
                          </div>
                          <div className={styles['guest-info-value']}>
                            {guest.nationality}
                          </div>
                        </div>
                      )}
                      {guest.idNumber && (
                        <div className={styles['guest-info-item']}>
                          <div className={styles['guest-info-label']}>
                            <DocumentTextIcon className={styles['guest-item-icon']} />
                            <span>ID No.</span>
                          </div>
                          <div className={styles['guest-info-value']}>
                            {guest.idNumber}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      <PaymentConfirmModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handleConfirmPayment}
        modalKey="bookingDetail"
      />
    </div>
  );
};

export default BookingDetail;


