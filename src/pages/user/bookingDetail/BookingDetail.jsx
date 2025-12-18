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

// Chuẩn hóa status booking từ nhiều định dạng về string thống nhất
// Hỗ trợ: number (0, 1, 2), string numeric, legacy status, new status
const normalizeStatus = (status) => {
  // Nếu null/undefined, mặc định là PENDING_PAYMENT
  if (status === null || status === undefined) {
    return 'PENDING_PAYMENT';
  }

  // Xử lý status dạng number (legacy format)
  if (typeof status === 'number') {
    if (status === 1) return 'BOOKING_SUCCESS';
    if (status === 2) return 'BOOKING_REJECTED';
    return 'PENDING_PAYMENT';
  }

  const raw = String(status).trim().toUpperCase();

  // Xử lý string numeric
  if (raw === '0') return 'PENDING_PAYMENT';
  if (raw === '1') return 'BOOKING_SUCCESS';
  if (raw === '2') return 'BOOKING_REJECTED';

  // Map tất cả các status có thể có (bao gồm cả legacy và mới)
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
    // Legacy status mapping
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
  PENDING_PAYMENT: '#F97316',
  PENDING_DEPOSIT_PAYMENT: '#EA580C',
  PENDING_BALANCE_PAYMENT: '#F59E0B',
  WAITING_FOR_APPROVED: '#3B82F6',
  WAITING_FOR_UPDATE: '#8B5CF6',
  BOOKING_REJECTED: '#EF4444',
  BOOKING_FAILED: '#DC2626',
  BOOKING_BALANCE_SUCCESS: '#14B8A6',
  BOOKING_SUCCESS_PENDING: '#06B6D4',
  BOOKING_SUCCESS_WAIT_FOR_CONFIRMED: '#2563EB',
  BOOKING_UNDER_COMPLAINT: '#EAB308',
  BOOKING_SUCCESS: '#10B981',
  BOOKING_CANCELLED: '#9CA3AF'
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

  // Load voucher preview cho booking
  // Chỉ load nếu có voucherCode hợp lệ để tránh lỗi 404
  useEffect(() => {
    const loadVoucherPreview = async () => {
      if (!booking?.bookingId) return;
      
      const bookingVoucherCode = booking?.voucherCode;
      // Kiểm tra voucherCode có hợp lệ không (không phải 'none', null, undefined, hoặc rỗng)
      const hasValidVoucherCode = bookingVoucherCode && 
        bookingVoucherCode !== 'none' && 
        bookingVoucherCode.trim() !== '' &&
        bookingVoucherCode !== null &&
        bookingVoucherCode !== undefined;
      
      if (!hasValidVoucherCode) {
        setVoucherPreview(null);
        setIsLoadingVoucher(false);
        return;
      }
      
      setIsLoadingVoucher(true);
      try {
        const preview = await previewApplyVoucher(booking.bookingId);
        if (preview) {
          setVoucherPreview(preview);
        }
      } catch {
        setVoucherPreview(null);
      } finally {
        setIsLoadingVoucher(false);
      }
    };

    if (booking?.bookingId) {
      loadVoucherPreview();
    }
  }, [booking?.bookingId, booking?.voucherCode]);

  const status = useMemo(() => normalizeStatus(booking?.bookingStatus || booking?.status), [booking]);
  const isPendingPayment = status === 'PENDING_PAYMENT';
  const isWaitingForUpdate = status === 'WAITING_FOR_UPDATE';
  const isSuccessPending = status === 'BOOKING_SUCCESS_PENDING';
  const isWaitingForConfirmation = status === 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED';
  const isUnderComplaint = status === 'BOOKING_UNDER_COMPLAINT';
  const isPendingDepositPayment = status === 'PENDING_DEPOSIT_PAYMENT';
  const isPendingBalancePayment = status === 'PENDING_BALANCE_PAYMENT';
  const isBookingBalanceSuccess = status === 'BOOKING_BALANCE_SUCCESS';
  const isBookingCancelled = status === 'BOOKING_CANCELLED';

  const handleEditBooking = () => {
    setShowEditModal(true);
  };

  const handleConfirmEdit = async (formData) => {
    setShowEditModal(false);

    if (!formData || !booking) return;

    try {
      setLoading(true);

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

  const formatCurrency = (value) => {
    if (!Number.isFinite(Number(value))) return '—';
    try {
      const krwValue = Math.round(Number(value) / 18);
      return new Intl.NumberFormat('ko-KR').format(krwValue) + ' KRW';
    } catch (error) {
      return Math.round(Number(value) / 18).toLocaleString('ko-KR') + ' KRW';
    }
  };

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

      if (refreshedBooking?.bookingStatus === 'BOOKING_SUCCESS') {
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

    const state = {
      booking,
      fromBookingDetail: true,
      paymentType: paymentType,
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
      <div className={styles['header']}>
        <button className={styles['back-btn']} onClick={() => navigate(-1)}>
          <ArrowLeftIcon className={styles['back-icon']} />
          <span>{t('bookingHistory.backButton')}</span>
        </button>
        <h1 className={styles['page-title']}>{t('bookingHistory.title')}</h1>
      </div>

      <div className={styles['card']}>
        <div className={styles['card-header']}>
          <div className={styles['booking-id-section']}>
            <DocumentTextIcon className={styles['header-icon']} />
            <div>
              <div className={styles['booking-id-label']}>{t('payment.tourName', 'Tên tour')}</div>
              <div className={styles['booking-id']}>{booking.tourName || booking.tour?.tourName || '-'}</div>
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

        {(booking?.totalAmount || booking?.payedAmount || booking?.depositAmount || voucherPreview) && (
          <div className={styles['info-section']}>
            <div className={styles['section-header']}>
              <CreditCardIcon className={styles['section-icon']} />
              <h2 className={styles['section-title']}>{t('bookingDetail.sections.paymentInfo')}</h2>
            </div>
            <div className={styles['info-grid']}>
              {(() => {
                const hasVoucher = booking?.voucherCode && 
                  booking.voucherCode !== 'none' && 
                  booking.voucherCode.trim() !== '';
                const hasVoucherDiscount = booking?.depositDiscountAmount != null || booking?.totalDiscountAmount != null;
                const showStrikethrough = hasVoucher || hasVoucherDiscount || voucherPreview;
                
                return (voucherPreview?.originalTotal || booking.totalAmount) ? (
                  <div className={styles['info-item']}>
                    <div className={styles['info-label']}>
                      <span>{t('bookingDetail.payment.totalAmount', 'Tổng tiền tour')}</span>
                    </div>
                    <div className={styles['info-value']} style={showStrikethrough ? { textDecoration: 'line-through', opacity: 0.7, color: '#94a3b8' } : {}}>
                      {formatCurrency(voucherPreview?.originalTotal || booking.totalAmount)}
                    </div>
                  </div>
                ) : null;
              })()}
              
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

              {voucherPreview && (() => {
                const discountAmount = Number(voucherPreview.discountAmount || 0);
                if (discountAmount <= 0) return null;
                
                const discountType = voucherPreview.discountType || voucherPreview.meta?.discountType;
                const discountValue = voucherPreview.discountValue || voucherPreview.meta?.discountValue || 0;
                
                let discountDisplay = '';
                if (discountType === 'PERCENT' || discountType === 'PERCENTAGE') {
                  const percentValue = Number.isFinite(Number(discountValue)) 
                    ? Math.round(Number(discountValue))
                    : discountValue;
                  discountDisplay = `-${percentValue}%`;
                } else if (discountType === 'FIXED' || discountType === 'AMOUNT') {
                  discountDisplay = `-${formatCurrency(discountAmount)}`;
                } else {
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

              {(() => {
                const hasVoucher = booking?.voucherCode && 
                  booking.voucherCode !== 'none' && 
                  booking.voucherCode.trim() !== '';
                const hasVoucherDiscount = booking?.depositDiscountAmount != null || booking?.totalDiscountAmount != null;
                const shouldShowFinalTotal = hasVoucher || hasVoucherDiscount || voucherPreview;
                
                if (!shouldShowFinalTotal) return null;
                
                const finalTotal = booking?.totalDiscountAmount != null && booking.totalDiscountAmount > 0
                  ? booking.totalDiscountAmount
                  : (voucherPreview?.finalTotal ?? booking.totalAmount ?? 0);
                
                return (
                  <div className={styles['info-item']}>
                    <div className={styles['info-label']}>
                      <span>{t('booking.step3.payment.finalTotal', 'Tổng tiền (sau giảm giá)')}</span>
                    </div>
                    <div className={styles['info-value']} style={{ color: '#2563EB', fontWeight: 700, fontSize: '1.05rem' }}>
                      {formatCurrency(finalTotal)}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const isOneTimePayment = voucherPreview?.oneTimePayment || 
                  (booking?.depositPercentage === 100) || 
                  (booking?.depositPercentage === 0);
                
                if (isOneTimePayment) return null;
                
                return (
                  <>
                    {(() => {
                      const depositAmount = booking?.depositDiscountAmount != null && booking.depositDiscountAmount > 0
                        ? booking.depositDiscountAmount
                        : (voucherPreview?.finalDepositAmount != null 
                            ? voucherPreview.finalDepositAmount 
                            : (booking?.depositAmount ?? 0));
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

                    {(() => {
                      let remainingAmount = 0;
                      
                      if (booking?.depositDiscountAmount != null && booking?.totalDiscountAmount != null) {
                        remainingAmount = Math.max(0, Number(booking.totalDiscountAmount) - Number(booking.depositDiscountAmount));
                      } else if (voucherPreview) {
                        if (voucherPreview.finalRemainingAmount != null && voucherPreview.finalRemainingAmount !== undefined) {
                          remainingAmount = Number(voucherPreview.finalRemainingAmount) || 0;
                        } else if (voucherPreview.finalTotal && voucherPreview.finalDepositAmount != null && voucherPreview.finalDepositAmount !== undefined) {
                          remainingAmount = Math.max(0, Number(voucherPreview.finalTotal) - Number(voucherPreview.finalDepositAmount));
                        } else {
                          remainingAmount = 0;
                        }
                      } else {
                        const total = booking?.totalAmount || 0;
                        const deposit = booking?.depositAmount || 0;
                        remainingAmount = Math.max(0, total - deposit);
                      }
                      
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

      {booking?.bookingId && (
        <>
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

          {isBookingBalanceSuccess && (
            <div className={styles['action-section']}>
              <div className={styles['info-banner']} style={{ backgroundColor: '#D1FAE5' }}>
                <p>{t('bookingDetail.info.balanceSuccess')}</p>
                <p>{t('bookingDetail.info.waitingForDeparture')}</p>
              </div>
            </div>
          )}

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

      {showEditModal && booking && (
        <EditBookingModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onConfirm={handleConfirmEdit}
          booking={booking}
          guests={guests}
        />
      )}

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


