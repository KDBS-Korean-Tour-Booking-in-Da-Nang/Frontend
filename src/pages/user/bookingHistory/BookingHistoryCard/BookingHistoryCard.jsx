import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  UserGroupIcon,
  UserIcon,
  PhoneIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { previewCancelBooking, cancelBooking } from '../../../../services/bookingAPI';
import { previewApplyVoucher } from '../../../../services/voucherAPI';
import PaymentConfirmModal from '../../../../components/modals/PaymentConfirmModal/PaymentConfirmModal';
import styles from './BookingHistoryCard.module.css';

const STATUS_KEYS = {
  PENDING_PAYMENT: 'pendingPayment',
  PENDING_DEPOSIT_PAYMENT: 'pendingDepositPayment',       // NEW
  PENDING_BALANCE_PAYMENT: 'pendingBalancePayment',       // NEW
  WAITING_FOR_APPROVED: 'waitingForApproved',
  WAITING_FOR_UPDATE: 'waitingForUpdate',
  BOOKING_REJECTED: 'bookingRejected',
  BOOKING_FAILED: 'bookingFailed',
  BOOKING_BALANCE_SUCCESS: 'bookingBalanceSuccess',       // NEW
  BOOKING_SUCCESS_PENDING: 'bookingSuccessPending',
  BOOKING_SUCCESS_WAIT_FOR_CONFIRMED: 'bookingSuccessWaitForConfirmed',
  BOOKING_UNDER_COMPLAINT: 'bookingUnderComplaint',
  BOOKING_SUCCESS: 'bookingSuccess',
  BOOKING_CANCELLED: 'bookingCancelled'                   // NEW
};

const statusColorMap = {
  [STATUS_KEYS.PENDING_PAYMENT]: '#F97316',
  [STATUS_KEYS.PENDING_DEPOSIT_PAYMENT]: '#EA580C',
  [STATUS_KEYS.PENDING_BALANCE_PAYMENT]: '#F59E0B',
  [STATUS_KEYS.WAITING_FOR_APPROVED]: '#3B82F6',
  [STATUS_KEYS.WAITING_FOR_UPDATE]: '#8B5CF6',
  [STATUS_KEYS.BOOKING_REJECTED]: '#EF4444',
  [STATUS_KEYS.BOOKING_FAILED]: '#DC2626',
  [STATUS_KEYS.BOOKING_BALANCE_SUCCESS]: '#14B8A6',
  [STATUS_KEYS.BOOKING_SUCCESS_PENDING]: '#06B6D4',
  [STATUS_KEYS.BOOKING_SUCCESS_WAIT_FOR_CONFIRMED]: '#2563EB',
  [STATUS_KEYS.BOOKING_UNDER_COMPLAINT]: '#EAB308',
  [STATUS_KEYS.BOOKING_SUCCESS]: '#10B981',
  [STATUS_KEYS.BOOKING_CANCELLED]: '#9CA3AF'
};

// Chuẩn hóa status booking từ nhiều định dạng về key thống nhất
// Hỗ trợ: number, string numeric, legacy status, new status
const normalizeStatus = (status) => {
  if (status === null || status === undefined) {
    return STATUS_KEYS.PENDING_PAYMENT;
  }

  // Xử lý status dạng number (legacy format)
  if (typeof status === 'number') {
    if (status === 1) return STATUS_KEYS.BOOKING_SUCCESS;
    if (status === 2) return STATUS_KEYS.BOOKING_REJECTED;
    return STATUS_KEYS.PENDING_PAYMENT;
  }

  const raw = String(status).trim().toUpperCase();

  // Xử lý string numeric
  if (raw === '0') return STATUS_KEYS.PENDING_PAYMENT;
  if (raw === '1') return STATUS_KEYS.BOOKING_SUCCESS;
  if (raw === '2') return STATUS_KEYS.BOOKING_REJECTED;

  // Kiểm tra xem có phải key mới không
  if (STATUS_KEYS[raw]) {
    return STATUS_KEYS[raw];
  }

  // Map các status legacy (từ hệ thống cũ)
  const legacyMap = {
    PURCHASED: STATUS_KEYS.BOOKING_SUCCESS,
    CONFIRMED: STATUS_KEYS.WAITING_FOR_APPROVED,
    PENDING: STATUS_KEYS.PENDING_PAYMENT,
    CANCELLED: STATUS_KEYS.BOOKING_CANCELLED,
    FAILED: STATUS_KEYS.BOOKING_FAILED,
    SUCCESS: STATUS_KEYS.BOOKING_SUCCESS
  };

  // Map các status mới
  const newStatusMap = {
    PENDING_DEPOSIT_PAYMENT: STATUS_KEYS.PENDING_DEPOSIT_PAYMENT,
    PENDING_BALANCE_PAYMENT: STATUS_KEYS.PENDING_BALANCE_PAYMENT,
    BOOKING_BALANCE_SUCCESS: STATUS_KEYS.BOOKING_BALANCE_SUCCESS,
    BOOKING_CANCELLED: STATUS_KEYS.BOOKING_CANCELLED,
  };

  if (newStatusMap[raw]) {
    return newStatusMap[raw];
  }

  return legacyMap[raw] || STATUS_KEYS.PENDING_PAYMENT;
};

// Chuẩn hóa transaction status từ nhiều định dạng về string thống nhất
// Hỗ trợ: number (1=SUCCESS, 2=FAILED, 3=CANCELLED), string
const normalizeTransaction = (trx) => {
  if (!trx && typeof trx !== 'number') return undefined;
  // Xử lý transaction status dạng number (legacy format)
  if (typeof trx === 'number') {
    return trx === 1 ? 'SUCCESS' : trx === 2 ? 'FAILED' : trx === 3 ? 'CANCELLED' : 'PENDING';
  }
  // Chuyển string về uppercase
  return String(trx || '').toUpperCase();
};

const getStatusColor = (statusKey) => statusColorMap[statusKey] || '#6B7280';

const getTransactionStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':
      return '#10B981';
    case 'PENDING':
      return '#F59E0B';
    case 'FAILED':
      return '#EF4444';
    case 'CANCELLED':
      return '#DC2626';
    default:
      return '#6B7280';
  }
};

// Danh sách các status cho phép hủy booking
const CANCELLABLE_STATUSES = [
  'WAITING_FOR_APPROVED',
  'WAITING_FOR_UPDATE',
  'PENDING_BALANCE_PAYMENT',
  'BOOKING_BALANCE_SUCCESS'
];

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(Number(value || 0));
};

// Format giá trị VND sang KRW (tỷ lệ 1 KRW = 18 VND)
const formatKRW = (vndValue) => {
  if (vndValue === null || vndValue === undefined) return '0 KRW';
  const krwValue = Math.round(Number(vndValue || 0) / 18);
  return new Intl.NumberFormat('ko-KR').format(krwValue) + ' KRW';
};

const BookingHistoryCard = ({ booking, onBookingCancelled }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [hasConfirmedCancel, setHasConfirmedCancel] = useState(false);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const modalShouldStayOpenRef = useRef({ shouldStayOpen: false, callback: null });
  const [voucherPreview, setVoucherPreview] = useState(null);
  const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState(null);

  const getLocale = () => {
    const lang = localStorage.getItem('i18nextLng') || 'vi';
    const localeMap = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR' };
    return localeMap[lang] || 'vi-VN';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(getLocale(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleViewDetails = () => {
    navigate(`/user/booking?id=${booking.bookingId}`);
  };

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

    loadVoucherPreview();
  }, [booking?.bookingId, booking?.voucherCode]);

  // Xử lý thanh toán: xác định loại thanh toán (deposit, full, balance) dựa trên status
  const handlePay = (e) => {
    e.stopPropagation();
    if (!booking?.bookingId) return;
    
    const rawStatus = booking?.bookingStatus || booking?.status;
    const statusString = String(rawStatus || '').toUpperCase();
    
    let type = 'full';
    
    // Xác định loại thanh toán dựa trên status
    if (statusString === 'PENDING_DEPOSIT_PAYMENT') {
      type = 'deposit';
    } else if (statusString === 'PENDING_BALANCE_PAYMENT') {
      type = 'balance';
    } else if (statusString === 'PENDING_PAYMENT') {
      type = 'full';
    } else {
      // Fallback: dùng effectiveStatus nếu statusString không khớp
      if (effectiveStatus === STATUS_KEYS.PENDING_DEPOSIT_PAYMENT) {
        type = 'deposit';
      } else if (effectiveStatus === STATUS_KEYS.PENDING_BALANCE_PAYMENT) {
        type = 'balance';
      } else if (effectiveStatus === STATUS_KEYS.PENDING_PAYMENT) {
        type = 'full';
      }
    }
    
    setPaymentType(type);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    setShowPaymentModal(false);
    if (!booking?.bookingId) return;

    const state = {
      booking,
      fromBookingHistory: true,
      fromBookingDetail: false,
      paymentType: paymentType,
      isBalancePayment: paymentType === 'balance'
    };

    navigate(`/booking/payment?id=${booking.bookingId}`, { state });
  };

  // Xác định status hiệu quả: ưu tiên transaction status (nếu SUCCESS thì booking thành công)
  // Nếu không có transaction SUCCESS thì dùng booking status
  const effectiveStatus = (() => {
    const trxRaw = booking?.transactionStatus ?? booking?.latestTransactionStatus;
    const trx = normalizeTransaction(trxRaw);
    // Nếu transaction đã thành công, booking được coi là thành công
    if (trx === 'SUCCESS') return STATUS_KEYS.BOOKING_SUCCESS;
    // Nếu không, dùng booking status
    const rawStatus = booking?.status ?? booking?.bookingStatus;
    return normalizeStatus(rawStatus);
  })();

  const canCancelBooking = useMemo(() => {
    const rawStatus = booking?.status ?? booking?.bookingStatus;
    const statusString = String(rawStatus || '').toUpperCase();
    return CANCELLABLE_STATUSES.includes(statusString);
  }, [booking]);

  const getStatusIcon = (iconColor) => {
    switch (effectiveStatus) {
      case STATUS_KEYS.BOOKING_SUCCESS:
      case STATUS_KEYS.BOOKING_BALANCE_SUCCESS:
        return <CheckCircleIcon className={styles['status-icon']} style={{ color: iconColor }} />;
      case STATUS_KEYS.BOOKING_REJECTED:
      case STATUS_KEYS.BOOKING_FAILED:
      case STATUS_KEYS.BOOKING_UNDER_COMPLAINT:
      case STATUS_KEYS.BOOKING_CANCELLED:
        return <XCircleIcon className={styles['status-icon']} style={{ color: iconColor }} />;
      case STATUS_KEYS.WAITING_FOR_APPROVED:
      case STATUS_KEYS.BOOKING_SUCCESS_PENDING:
      case STATUS_KEYS.BOOKING_SUCCESS_WAIT_FOR_CONFIRMED:
      case STATUS_KEYS.WAITING_FOR_UPDATE:
      case STATUS_KEYS.PENDING_DEPOSIT_PAYMENT:
      case STATUS_KEYS.PENDING_BALANCE_PAYMENT:
        return <ClockIcon className={styles['status-icon']} style={{ color: iconColor }} />;
      default:
        return <ClockIcon className={styles['status-icon']} style={{ color: iconColor }} />;
    }
  };

  const statusColor = getStatusColor(effectiveStatus);

  const handleCardClick = (e) => {
    if (e.target.closest(`.${styles['view-details-btn']}`)) {
      return;
    }
    handleViewDetails();
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    handleViewDetails();
  };

  // Xử lý click hủy booking: mở modal ngay và load preview thông tin hoàn tiền
  const handleCancelClick = async (e) => {
    e.stopPropagation();
    setIsLoadingPreview(true);
    setCancelError(null);
    setCancelPreview(null);
    setHasConfirmedCancel(false);
    modalShouldStayOpenRef.current = { shouldStayOpen: false, callback: null };
    setShowCancelModal(true); // Mở modal ngay để user thấy loading state

    try {
      // Load preview thông tin hoàn tiền từ API
      const preview = await previewCancelBooking(booking.bookingId);
      setCancelPreview(preview);
    } catch (error) {
      setCancelError(error.message || 'Không thể tải thông tin hoàn tiền. Vui lòng thử lại.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCloseModal = useCallback(async (e) => {
    if (e) e.stopPropagation();
    
    if (hasConfirmedCancel && modalShouldStayOpenRef.current?.callback) {
      setIsClosingModal(true);
      const callback = modalShouldStayOpenRef.current.callback;
      modalShouldStayOpenRef.current = { shouldStayOpen: false, callback: null };
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (callback) {
        callback();
      }
      
      setShowCancelModal(false);
      setHasConfirmedCancel(false);
      setCancelPreview(null);
      setCancelError(null);
      setIsClosingModal(false);
    } else {
      modalShouldStayOpenRef.current = { shouldStayOpen: false, callback: null };
      setShowCancelModal(false);
      setHasConfirmedCancel(false);
      setCancelPreview(null);
      setCancelError(null);
      setIsClosingModal(false);
    }
  }, [hasConfirmedCancel]);

  const handleConfirmCancel = useCallback(async (e) => {
    e.stopPropagation();
    setIsCancelling(true);
    setCancelError(null);

    try {
      const result = await cancelBooking(booking.bookingId);
      
      modalShouldStayOpenRef.current = { 
        shouldStayOpen: true, 
        callback: onBookingCancelled || null 
      };
      
      setShowCancelModal(true);
      setHasConfirmedCancel(true);
    } catch (error) {
      setCancelError(error.message || 'Không thể hủy booking. Vui lòng thử lại.');
      setHasConfirmedCancel(false);
      modalShouldStayOpenRef.current = { shouldStayOpen: false, callback: null };
    } finally {
      setIsCancelling(false);
    }
  }, [booking.bookingId, onBookingCancelled]);

  const modalNode = useMemo(() => {
    if (!showCancelModal) return null;
    return createPortal(
      <div className={styles['modal-overlay']} onClick={handleCloseModal} role="presentation">
        <div
          className={styles['modal']}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className={`${styles['modal-content-wrapper']} ${hasConfirmedCancel ? styles['wrapper-success'] : ''}`}>
            <div className={`${styles['modal-content']} ${!hasConfirmedCancel ? styles['modal-content-active'] : styles['modal-content-hidden']}`}>
              <div className={styles['modal-header']}>
                <h3>{t('bookingHistory.cancel.title', 'Xác nhận hủy booking')}</h3>
              </div>

              {isLoadingPreview ? (
                <div className={styles['modal-text']}>
                  <p>{t('bookingHistory.cancel.loading', 'Đang tải thông tin hoàn tiền...')}</p>
                </div>
              ) : cancelError ? (
                <div className={styles['modal-text']}>
                  <p style={{ color: '#EF4444' }}>{cancelError}</p>
                </div>
              ) : cancelPreview ? (
                <>
                  <p className={styles['modal-text']}>
                    {t(
                      'bookingHistory.cancel.message',
                      'Bạn chắc chắn muốn huỷ booking này?'
                    )}
                  </p>
                  <div className={styles['refund-info']}>
                    <div className={styles['refund-item']}>
                      <span>{t('bookingHistory.cancel.refundPercentage', 'Tỷ lệ hoàn tiền')}:</span>
                      <strong>{cancelPreview.refundPercentage || 0}%</strong>
                    </div>
                    <div className={styles['refund-item']}>
                      <span>{t('bookingHistory.cancel.refundAmount', 'Số tiền hoàn lại')}:</span>
                      <strong>{formatKRW(cancelPreview.refundAmount || 0)}</strong>
                    </div>
                    {cancelPreview.payedAmount && (
                      <div className={styles['refund-item']}>
                        <span>{t('bookingHistory.cancel.payedAmount', 'Số tiền đã thanh toán')}:</span>
                        <span>{formatKRW(cancelPreview.payedAmount)}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className={styles['modal-text']}>
                  {t(
                    'bookingHistory.cancel.message',
                    'Bạn chắc chắn muốn huỷ booking này?'
                  )}
                </p>
              )}

              <div className={styles['modal-actions']}>
                <button
                  className={styles['ghost-btn']}
                  onClick={handleCloseModal}
                  type="button"
                  disabled={isCancelling}
                >
                  {t('common.close', 'Đóng')}
                </button>
                <button
                  className={styles['primary-btn']}
                  onClick={handleConfirmCancel}
                  type="button"
                  disabled={isCancelling || isLoadingPreview || !cancelPreview}
                >
                  {isCancelling
                    ? t('bookingHistory.cancel.processing', 'Đang xử lý...')
                    : t('bookingHistory.cancel.confirm', 'Xác nhận hủy')
                  }
                </button>
              </div>
            </div>

            <div className={`${styles['modal-content']} ${hasConfirmedCancel ? styles['modal-content-active'] : styles['modal-content-hidden']}`}>
              {isClosingModal && (
                <div className={styles['modal-loading-overlay']}>
                  <div className={styles['loading-spinner']}></div>
                </div>
              )}
              <div className={styles['modal-header']}>
                <h3>{t('bookingHistory.cancel.successTitle', 'Hủy booking thành công')}</h3>
              </div>
              <p className={styles['modal-text']}>
                {t(
                  'bookingHistory.cancel.successBody',
                  'Yêu cầu huỷ đã được ghi nhận. Khoản hoàn tiền'
                )}{' '}
                {cancelPreview && (
                  <>
                    <strong>{cancelPreview.refundPercentage || 0}%</strong>
                    {' '}(<strong>{formatKRW(cancelPreview.refundAmount || 0)}</strong>)
                  </>
                )}{' '}
                {t('bookingHistory.cancel.successTail', 'sẽ được chuyển theo phương thức thanh toán ban đầu.')}
              </p>
              <div className={styles['modal-actions']}>
                <button 
                  className={styles['primary-btn']} 
                  onClick={handleCloseModal} 
                  type="button"
                  disabled={isClosingModal}
                >
                  {isClosingModal 
                    ? t('bookingHistory.cancel.closing', 'Đang đóng...') 
                    : t('common.close', 'Đóng')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }, [
    showCancelModal,
    hasConfirmedCancel,
    handleCloseModal,
    handleConfirmCancel,
    cancelPreview,
    isLoadingPreview,
    isCancelling,
    isClosingModal,
    cancelError,
    t
  ]);

  return (
    <>
      <div
        className={styles['booking-card']}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleViewDetails();
          }
        }}
        aria-label={`View details for booking ${booking.bookingId}`}
      >
        <div className={styles['card-header']}>
          <div className={styles['booking-id-section']}>
            <DocumentTextIcon className={styles['id-icon']} />
            <div>
              <div className={styles['booking-main-row']}>
                {booking.tourName && (
                  <div className={styles['booking-field']}>
                    <div className={styles['booking-tour-label']}>
                      {t('bookingHistory.card.tourName')}
                    </div>
                    <div className={styles['booking-tour-name']}>
                      {booking.tourName}
                    </div>
                  </div>
                )}
              </div>
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
            {getStatusIcon(statusColor)}
            <span>{t(`bookingHistory.status.${effectiveStatus || STATUS_KEYS.PENDING_PAYMENT}`)}</span>
          </div>
        </div>

        <div className={styles['booking-content']}>
          <div className={styles['info-grid']}>
            <div className={styles['info-item']}>
              <div className={styles['info-label']}>
                <CalendarIcon className={styles['item-icon']} />
                <span>{t('bookingHistory.card.departureDate')}</span>
              </div>
              <div className={styles['info-value']}>
                {formatDate(booking.departureDate)}
              </div>
            </div>

            <div className={styles['info-item']}>
              <div className={styles['info-label']}>
                <UserGroupIcon className={styles['item-icon']} />
                <span>{t('bookingHistory.card.totalGuests')}</span>
              </div>
              <div className={styles['info-value']}>
                {booking.totalGuests} {t('bookingHistory.card.guests')}
              </div>
            </div>

            <div className={styles['info-item']}>
              <div className={styles['info-label']}>
                <UserIcon className={styles['item-icon']} />
                <span>{t('bookingHistory.card.contactName')}</span>
              </div>
              <div className={styles['info-value']}>
                {booking.contactName}
              </div>
            </div>

            <div className={styles['info-item']}>
              <div className={styles['info-label']}>
                <PhoneIcon className={styles['item-icon']} />
                <span>{t('bookingHistory.card.contactPhone')}</span>
              </div>
              <div className={styles['info-value']}>
                {booking.contactPhone}
              </div>
            </div>

            {/* Hiển thị thông tin thanh toán: ưu tiên số tiền đã lưu (totalDiscountAmount, depositDiscountAmount), sau đó dùng voucherPreview */}
            {(() => {
              // Xác định xem có phải thanh toán một lần không (100% deposit hoặc 0% deposit)
              const isOneTimePayment = voucherPreview?.oneTimePayment || 
                (booking?.depositPercentage === 100) || 
                (booking?.depositPercentage === 0);
              
              // Nếu thanh toán một lần, hiển thị tổng tiền cần thanh toán
              if (isOneTimePayment) {
                if (effectiveStatus === STATUS_KEYS.PENDING_PAYMENT || 
                    effectiveStatus === STATUS_KEYS.PENDING_DEPOSIT_PAYMENT) {
                  // Ưu tiên totalDiscountAmount đã lưu, sau đó voucherPreview, cuối cùng là booking.totalAmount
                  const totalAmount = booking?.totalDiscountAmount != null && booking.totalDiscountAmount > 0
                    ? booking.totalDiscountAmount
                    : (voucherPreview?.finalTotal ?? booking.totalAmount ?? booking.totalPrice ?? 0);
                  
                  return (
                    <div className={styles['info-item']}>
                      <div className={styles['info-label']}>
                        <BanknotesIcon className={styles['item-icon']} />
                        <span>{t('payment.checkPayment.amountDue', 'Số tiền cần thanh toán')}</span>
                      </div>
                      <div className={styles['info-value']} style={{ color: '#EA580C', fontWeight: 600 }}>
                        {formatKRW(totalAmount)}
                      </div>
                    </div>
                  );
                }
                return null;
              }
              
              // Nếu cần thanh toán cọc, hiển thị số tiền cọc
              if (effectiveStatus === STATUS_KEYS.PENDING_DEPOSIT_PAYMENT ||
                  effectiveStatus === STATUS_KEYS.PENDING_PAYMENT) {
                const depositDiscountAmount = booking?.depositDiscountAmount;
                const finalDepositFromPreview = voucherPreview?.finalDepositAmount;
                const originalDeposit = booking.depositAmount ?? booking.deposit ?? 0;
                
                // Ưu tiên depositDiscountAmount đã lưu, sau đó voucherPreview, cuối cùng là originalDeposit
                const depositAmount = depositDiscountAmount != null && depositDiscountAmount > 0
                  ? depositDiscountAmount
                  : (finalDepositFromPreview != null 
                      ? finalDepositFromPreview 
                      : originalDeposit);
                
                return (
                  <div className={styles['info-item']}>
                    <div className={styles['info-label']}>
                      <BanknotesIcon className={styles['item-icon']} />
                      <span>{t('bookingHistory.card.depositAmount', 'Tiền cọc')}</span>
                    </div>
                    <div className={styles['info-value']} style={{ color: '#EA580C', fontWeight: 600 }}>
                      {formatKRW(depositAmount)}
                    </div>
                  </div>
                );
              }
              
              // Nếu cần thanh toán số tiền còn lại, tính toán và hiển thị
              if (effectiveStatus === STATUS_KEYS.PENDING_BALANCE_PAYMENT) {
                let remainingAmount = 0;
                
                const depositDiscountAmount = booking?.depositDiscountAmount;
                const totalDiscountAmount = booking?.totalDiscountAmount;
                
                // Ưu tiên dùng số tiền đã lưu (totalDiscountAmount - depositDiscountAmount)
                if (depositDiscountAmount != null && totalDiscountAmount != null) {
                  remainingAmount = Math.max(0, Number(totalDiscountAmount) - Number(depositDiscountAmount));
                } 
                // Nếu không có, dùng voucherPreview
                else if (voucherPreview) {
                  if (voucherPreview.finalRemainingAmount != null && voucherPreview.finalRemainingAmount !== undefined) {
                    remainingAmount = Number(voucherPreview.finalRemainingAmount) || 0;
                  } else if (voucherPreview.finalTotal && voucherPreview.finalDepositAmount != null && voucherPreview.finalDepositAmount !== undefined) {
                    remainingAmount = Math.max(0, Number(voucherPreview.finalTotal) - Number(voucherPreview.finalDepositAmount));
                  } else {
                    remainingAmount = 0;
                  }
                } 
                // Cuối cùng, tính từ booking (total - deposit)
                else {
                  const total = booking.totalPrice || booking.totalAmount || 0;
                  const deposit = booking.depositAmount || booking.deposit || 0;
                  remainingAmount = Math.max(0, total - deposit);
                }
                
                return (
                  <div className={styles['info-item']}>
                    <div className={styles['info-label']}>
                      <BanknotesIcon className={styles['item-icon']} />
                      <span>{t('bookingHistory.card.balanceAmount', 'Còn lại')}</span>
                    </div>
                    <div className={styles['info-value']} style={{ color: '#F59E0B', fontWeight: 600 }}>
                      {formatKRW(remainingAmount)}
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}
          </div>

          {(booking?.transactionStatus || booking?.latestTransactionStatus) && (
            <div className={styles['transaction-badge']}>
              <span className={styles['transaction-label']}>
                {t('bookingHistory.card.transaction')}:
              </span>
              <span className={styles['transaction-value']}>
                {t(`bookingHistory.transactionStatus.${String(normalizeTransaction(booking.transactionStatus ?? booking.latestTransactionStatus) || 'PENDING').toLowerCase()}`) || normalizeTransaction(booking.transactionStatus ?? booking.latestTransactionStatus)}
              </span>
            </div>
          )}
        </div>

        <div className={styles['card-footer']}>
          <div className={styles['action-buttons']}>
            {(effectiveStatus === STATUS_KEYS.PENDING_DEPOSIT_PAYMENT ||
              effectiveStatus === STATUS_KEYS.PENDING_PAYMENT ||
              effectiveStatus === STATUS_KEYS.PENDING_BALANCE_PAYMENT) && (
              <button
                className={styles['pay-btn']}
                onClick={handlePay}
                type="button"
              >
                <CreditCardIcon className={styles['btn-icon']} />
                <span>{t('payment.checkPayment.actions.pay', 'Thanh toán')}</span>
              </button>
            )}
            {canCancelBooking && (
              <button
                className={styles['cancel-btn']}
                onClick={handleCancelClick}
                type="button"
                disabled={isLoadingPreview}
              >
                {t('bookingHistory.card.cancelBooking', 'Hủy booking')}
              </button>
            )}
            <button
              className={styles['view-details-btn']}
              onClick={handleButtonClick}
              type="button"
            >
              <span>{t('bookingHistory.card.viewDetails', 'Xem chi tiết')}</span>
              <ArrowRightIcon className={styles['btn-icon']} />
            </button>
          </div>
        </div>
      </div>
      {modalNode}
      
      <PaymentConfirmModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handleConfirmPayment}
        modalKey="bookingHistoryCard"
      />
    </>
  );
};

export default BookingHistoryCard;
