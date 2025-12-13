import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  CalendarCheck2,
  UsersRound,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Hash,
  ClipboardList,
  CalendarDays,
  Users,
  UserRound,
  AtSign,
  Phone
} from 'lucide-react';
import { useToast } from '../../../../../../contexts/ToastContext';
import { companyConfirmTourCompletion, getTourCompletionStatus, changeBookingStatus, changeBookingGuestInsuranceStatus } from '../../../../../../services/bookingAPI';
import { DeleteConfirmModal } from '../../../../../../components/modals';
import styles from './Step3Confirmation.module.css';
const getStatusColor = (status) => {
  const normalizedStatus = String(status || '').toUpperCase().replace(/ /g, '_');
  
  const colorMap = {
    PENDING_PAYMENT: '#F97316',              // Orange
    PENDING_DEPOSIT_PAYMENT: '#EA580C',      // Orange darker (riêng biệt)
    PENDING_BALANCE_PAYMENT: '#F59E0B',      // Amber
    WAITING_FOR_APPROVED: '#3B82F6',         // Blue
    WAITING_FOR_UPDATE: '#8B5CF6',           // Purple
    BOOKING_REJECTED: '#EF4444',             // Red
    BOOKING_FAILED: '#DC2626',               // Red darker
    BOOKING_BALANCE_SUCCESS: '#14B8A6',      // Teal
    BOOKING_SUCCESS_PENDING: '#06B6D4',       // Cyan (riêng biệt)
    BOOKING_SUCCESS_WAIT_FOR_CONFIRMED: '#2563EB', // Blue darker
    BOOKING_UNDER_COMPLAINT: '#EAB308',      // Yellow
    BOOKING_SUCCESS: '#10B981',              // Green
    BOOKING_CANCELLED: '#9CA3AF'            // Gray
  };
  
  return colorMap[normalizedStatus] || '#6B7280';
};

const Step3Confirmation = ({ 
  booking, 
  guests, 
  onBookingUpdate, 
  onBack, 
  onFinish, 
  isReadOnly = false,
  pendingInsuranceUpdates = [],
  bookingId,
  tourId,
  onMarkStepsCompleted,
  onClearInsuranceUpdates
}) => {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const navigate = useNavigate();
  const STATUS_SUCCESS = 'BOOKING_SUCCESS';
  const STATUS_SUCCESS_PENDING = 'BOOKING_SUCCESS_PENDING';
  const STATUS_SUCCESS_WAIT = 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED';
  const [tourCompleted, setTourCompleted] = useState(false);
  const [companyConfirmed, setCompanyConfirmed] = useState(booking?.companyConfirmedCompletion || false);
  const [userConfirmed, setUserConfirmed] = useState(booking?.userConfirmedCompletion || false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [confirmingBooking, setConfirmingBooking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isStatusPendingCompletion = booking?.bookingStatus === STATUS_SUCCESS_PENDING;
  const isStatusWaitingConfirm = booking?.bookingStatus === STATUS_SUCCESS_WAIT;
  const isStatusCompleted = booking?.bookingStatus === STATUS_SUCCESS;
  const shouldRenderCompletionSection = isStatusPendingCompletion || isStatusWaitingConfirm || isStatusCompleted;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0 VND';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getGuestTypeLabel = (type) => {
    switch (type) {
      case 'ADULT':
        return t('booking.step2.guestTypes.adult');
      case 'CHILD':
        return t('booking.step2.guestTypes.child');
      case 'BABY':
        return t('booking.step2.guestTypes.baby');
      default:
        return type;
    }
  };

  // Update company/user confirmed status from booking props
  useEffect(() => {
    if (booking) {
      setCompanyConfirmed(booking.companyConfirmedCompletion || false);
      setUserConfirmed(booking.userConfirmedCompletion || false);
      // Check if tour is completed (both confirmed or backend already finalized)
      const isCompleted =
        booking.bookingStatus === STATUS_SUCCESS ||
        (booking.companyConfirmedCompletion && booking.userConfirmedCompletion) ||
        false;
      setTourCompleted(isCompleted);
    }
  }, [booking, STATUS_SUCCESS]);

  // Check tour completion status on mount and refresh periodically
useEffect(() => {
  if (!booking?.bookingId) return;

  if (!isStatusWaitingConfirm && !isStatusCompleted) {
    setTourCompleted(false);
    setCheckingStatus(false);
    return;
  }

  let isMounted = true;

  const checkCompletionStatus = async () => {
    if (!isMounted) return;

    try {
      setCheckingStatus(true);
      const isCompleted = await getTourCompletionStatus(booking.bookingId);
      if (isMounted) {
        setTourCompleted(isCompleted);
      }
    } catch (error) {
      // Error checking tour completion status
    } finally {
      if (isMounted) {
        setCheckingStatus(false);
      }
    }
  };

  checkCompletionStatus();
  const interval = setInterval(checkCompletionStatus, 30000);
  
  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, [booking?.bookingId, booking?.bookingStatus, isStatusCompleted, isStatusWaitingConfirm]);

  // Handle finish button - show confirmation modal
  const handleFinish = () => {
    // Check if booking is already confirmed
    if (booking?.bookingStatus === 'BOOKING_SUCCESS') {
      // Already confirmed, just navigate to booking management
      navigateToBookingManagement();
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  // Navigate to booking management page
  const navigateToBookingManagement = () => {
    if (tourId) {
      navigate(`/company/bookings?tourId=${tourId}`);
    } else {
      navigate('/company/bookings');
    }
  };

  // Handle booking confirmation - called from modal
  const handleConfirmBooking = async () => {
    if (!booking?.bookingId) return;

    try {
      setConfirmingBooking(true);
      setShowConfirmModal(false);

      if (pendingInsuranceUpdates.length > 0) {
        await Promise.all(
          pendingInsuranceUpdates.map(change =>
            changeBookingGuestInsuranceStatus(change.guestId, change.status)
          )
        );
      }
      
      // Determine next status based on payment status
      // Check if booking has voucher applied
      const hasVoucher = booking?.voucherCode && 
        booking.voucherCode !== 'none' && 
        booking.voucherCode.trim() !== '' &&
        booking.totalDiscountAmount != null &&
        booking.depositDiscountAmount != null;
      
      // Use discount amounts if voucher is applied, otherwise use original amounts
      const finalTotalAmount = hasVoucher 
        ? Number(booking.totalDiscountAmount || 0)
        : Number(booking?.totalAmount || 0);
      
      const finalDepositAmount = hasVoucher
        ? Number(booking.depositDiscountAmount || 0)
        : Number(booking?.depositAmount || 0);
      
      const payedAmount = Number(booking?.payedAmount || 0);
      
      // Debug logging
      console.log('Booking approval check:', {
        bookingId: booking.bookingId,
        currentStatus: booking.bookingStatus,
        hasVoucher,
        payedAmount,
        finalTotalAmount,
        finalDepositAmount,
        originalTotalAmount: booking?.totalAmount,
        originalDepositAmount: booking?.depositAmount,
        totalDiscountAmount: booking?.totalDiscountAmount,
        depositDiscountAmount: booking?.depositDiscountAmount,
        depositPercentage: booking?.depositPercentage
      });
      
      // Tolerance for floating point comparison (allow small difference due to rounding)
      const TOLERANCE = 1; // 1 VND tolerance
      
      // Determine next status based on payment amount (not depositPercentage)
      // Since booking is WAITING_FOR_APPROVED, payment has been completed
      // We determine status based on actual payment amount vs required amounts
      let nextStatus = null;
      
      // Check if full amount is paid (with tolerance)
      if (payedAmount >= (finalTotalAmount - TOLERANCE)) {
        // Full amount is paid → BOOKING_BALANCE_SUCCESS
        // This applies to both one-time payment and split payment where customer paid full
        nextStatus = 'BOOKING_BALANCE_SUCCESS';
      } else if (payedAmount >= (finalDepositAmount - TOLERANCE)) {
        // Only deposit is paid (or partial payment) → PENDING_BALANCE_PAYMENT
        // This means customer paid deposit but not full amount yet
        nextStatus = 'PENDING_BALANCE_PAYMENT';
      } else {
        // This should not happen if booking is WAITING_FOR_APPROVED
        // But handle edge case - payment amount is less than deposit
        console.warn('Payment amount check failed:', {
          payedAmount,
          finalDepositAmount,
          finalTotalAmount,
          depositPercentage: booking?.depositPercentage
        });
        throw new Error(`Không thể duyệt booking: Khách hàng chưa thanh toán đủ tiền cọc. Đã thanh toán: ${payedAmount.toLocaleString('vi-VN')} VND, Cần thanh toán cọc: ${finalDepositAmount.toLocaleString('vi-VN')} VND`);
      }
      
      // If nextStatus is still null, something went wrong
      if (!nextStatus) {
        throw new Error('Không thể xác định trạng thái booking tiếp theo. Vui lòng kiểm tra lại thông tin thanh toán.');
      }
      
      // Change booking status based on payment status
      const updatedBooking = await changeBookingStatus(booking.bookingId, nextStatus);
      
      // Update booking state
      if (onBookingUpdate) {
        onBookingUpdate(updatedBooking);
      }
      
      // Clear insurance updates
      if (onClearInsuranceUpdates) {
        onClearInsuranceUpdates();
      }
      
      // Mark all steps as completed in local progress tracking
      if (onMarkStepsCompleted) {
        onMarkStepsCompleted(new Set([1, 2, 3]));
      }
      
      // Show success message based on new status
      if (nextStatus === 'PENDING_BALANCE_PAYMENT') {
        showSuccess('Đã duyệt booking. Khách hàng cần thanh toán số tiền còn lại.');
      } else if (nextStatus === 'BOOKING_BALANCE_SUCCESS') {
        showSuccess('Đã duyệt booking. Khách hàng đã thanh toán đủ số tiền. Hệ thống sẽ tự động chuyển sang BOOKING_SUCCESS_PENDING khi đến ngày khởi hành.');
      }
      
      // Navigate to booking management after a short delay to show success message
      setTimeout(() => {
        navigateToBookingManagement();
      }, 1500);
    } catch (error) {
      // Silently handle error confirming booking
      showSuccess(error.message || 'Không thể xác nhận booking');
    } finally {
      setConfirmingBooking(false);
    }
  };

  // Handle company confirm tour completion
  const handleConfirmCompletion = async () => {
    if (!booking?.bookingId || !isStatusWaitingConfirm) return;
    
    if (!window.confirm('Bạn có chắc chắn muốn xác nhận tour đã hoàn thành?')) {
      return;
    }

    try {
      setLoading(true);
      await companyConfirmTourCompletion(booking.bookingId);
      setCompanyConfirmed(true);
      
      // Check if user also confirmed - if so, tour is completed
      const isCompleted = userConfirmed; // If user was already confirmed, now both are confirmed
      setTourCompleted(isCompleted);
      
      // Refresh completion status to get updated state from backend
      // Backend may have auto-confirmed if 3 days have passed
      try {
        const updatedStatus = await getTourCompletionStatus(booking.bookingId);
        setTourCompleted(updatedStatus);
        // Also refresh booking to get latest confirmation status
        if (onBookingUpdate) {
          // Trigger parent to refresh booking data
          const updatedBooking = {
            ...booking,
            companyConfirmedCompletion: true
          };
          onBookingUpdate(updatedBooking);
        }
      } catch (err) {
        // If refresh fails, update local state
        if (onBookingUpdate) {
          const updatedBooking = {
            ...booking,
            companyConfirmedCompletion: true
          };
          onBookingUpdate(updatedBooking);
        }
      }
      
      if (isCompleted) {
        showSuccess(t('companyBookingWizard.confirmation.toasts.completedByBoth'));
      } else {
        showSuccess(
          t('companyBookingWizard.confirmation.toasts.companyConfirmed', {
            date: getAutoConfirmedDate()
          })
        );
      }
    } catch (error) {
      // Error confirming tour completion - show in UI if needed
    } finally {
      setLoading(false);
    }
  };

  // Tính tour end date từ booking.tourEndDate (đã được tính sẵn từ backend)
  const getTourEndDate = () => {
    if (booking?.tourEndDate) {
      return formatDate(booking.tourEndDate);
    }
    return null;
  };

  // Get auto-confirm date (tour end date + 3 days)
  const getAutoConfirmedDate = () => {
    if (booking?.autoConfirmedDate) {
      return formatDate(booking.autoConfirmedDate);
    }
    if (booking?.tourEndDate) {
      const endDate = new Date(booking.tourEndDate);
      endDate.setDate(endDate.getDate() + 3);
      return formatDate(endDate.toISOString().split('T')[0]);
    }
    return null;
  };

  // Check if tour has ended (can be confirmed)
  const canConfirmCompletion = () => {
    // Only allow if booking status is waiting for confirmation
    if (!booking?.bookingId || !isStatusWaitingConfirm) {
      return false;
    }
    
    // Tour can be confirmed if tour end date has passed
    // Backend will validate, but we can show the UI when tour has ended
    if (booking?.tourEndDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(booking.tourEndDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate <= today;
    }
    
    // If no tourEndDate, don't show confirmation section
    // Backend will handle validation
    return false;
  };

  // Check if should show auto-confirm message (one party confirmed, waiting for other)
  const shouldShowAutoConfirmMessage = () => {
    if (!isStatusWaitingConfirm || !canConfirmCompletion() || tourCompleted) return false;
    // Show if one party confirmed but not both
    return (companyConfirmed && !userConfirmed) || (!companyConfirmed && userConfirmed);
  };

  const headerTitle = isReadOnly || isStatusCompleted
    ? t('companyBookingWizard.confirmation.header.successTitle')
    : t('companyBookingWizard.confirmation.header.title');

  const headerDescription = isReadOnly
    ? t('companyBookingWizard.confirmation.header.readOnlyDescription')
    : t('companyBookingWizard.confirmation.header.description', { bookingId: booking?.bookingId });

  const statusAccent = (() => {
    if (tourCompleted || isStatusCompleted) return '#12b76a';
    if (isStatusWaitingConfirm) return '#f97316';
    if (isStatusPendingCompletion) return '#f59e0b';
    if (companyConfirmed || userConfirmed) return '#f6c344';
    return '#1a8eea';
  })();

  return (
    <>
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerCard}>
          <div className={styles.headerIcon}>
            <CheckCircle2 strokeWidth={1.6} />
          </div>
          <div className={styles.headerContent}>
            <p className={styles.headerLabel}>{t('companyBookingWizard.confirmation.header.stepBadge')}</p>
            <h2 className={styles.title}>{headerTitle}</h2>
            <p className={styles.description}>{headerDescription}</p>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.bookingTag}>#{booking?.bookingId}</span>
            <span
              className={styles.statusPill}
              style={{
                color: statusAccent,
                borderColor: `${statusAccent}33`,
                backgroundColor: `${statusAccent}12`
              }}
            >
              {tourCompleted ? t('companyBookingWizard.confirmation.status.completed') : booking?.bookingStatus || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Booking Summary */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <CalendarCheck2 className={styles.sectionIcon} strokeWidth={1.5} />
          {t('companyBookingWizard.confirmation.sections.bookingSummary')}
        </h3>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.label}>
              <Hash className={styles.itemIcon} />
              {t('companyBookingWizard.confirmation.fields.bookingCode')}
            </span>
            <span className={styles.value}>#{booking.bookingId}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>
              <ClipboardList className={styles.itemIcon} />
              {t('companyBookingWizard.confirmation.fields.tour')}
            </span>
            <span className={styles.value}>{booking.tourName || '-'}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>
              <CalendarDays className={styles.itemIcon} />
              {t('companyBookingWizard.confirmation.fields.departureDate')}
            </span>
            <span className={styles.value}>{formatDate(booking.departureDate)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>
              <CalendarDays className={styles.itemIcon} />
              {t('companyBookingWizard.confirmation.fields.expectedEndDate')}
            </span>
            <span className={styles.value}>{getTourEndDate() || '-'}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>
              <Users className={styles.itemIcon} />
              {t('companyBookingWizard.confirmation.fields.totalGuests')}
            </span>
            <span className={styles.value}>{booking.totalGuests || 0}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>
              <ShieldCheck className={styles.itemIcon} />
              {t('companyBookingWizard.confirmation.fields.status')}
            </span>
            <span
              className={`${styles.value} ${styles.statusValue}`}
              style={{ color: getStatusColor(booking?.bookingStatus) }}
            >
              {booking?.bookingStatus || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Mail className={styles.sectionIcon} strokeWidth={1.5} />
          {t('companyBookingWizard.confirmation.sections.contactInfo')}
        </h3>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.label}>
              <UserRound className={styles.itemIcon} />
              {t('booking.step1.fields.fullName')}:
            </span>
            <span className={styles.value}>{booking.contactName || '-'}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>
              <AtSign className={styles.itemIcon} />
              {t('booking.step1.fields.email')}:
            </span>
            <span className={styles.value}>{booking.contactEmail || '-'}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>
              <Phone className={styles.itemIcon} />
              {t('booking.step1.fields.phone')}:
            </span>
            <span className={styles.value}>{booking.contactPhone || '-'}</span>
          </div>
        </div>
      </div>

      {/* Guests Summary */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <UsersRound className={styles.sectionIcon} strokeWidth={1.5} />
          {t('companyBookingWizard.confirmation.sections.guestsApproved')}
        </h3>
        {guests && guests.length > 0 ? (
          <div className={styles.guestsList}>
            {guests.map((guest, index) => (
              <div key={guest.bookingGuestId || index} className={styles.guestCard}>
                <div className={styles.guestInfo}>
                  <span className={styles.guestNumber}>{index + 1}</span>
                  <div className={styles.guestDetails}>
                    <div className={styles.guestName}>{guest.fullName || '-'}</div>
                    <div className={styles.guestMeta}>
                      <span>{getGuestTypeLabel(guest.bookingGuestType)}</span>
                      <span className={styles.separator}>•</span>
                      <span>{t('companyBookingWizard.confirmation.guest.insuranceLabel')}: {guest.insuranceStatus === 'Success' ? t('companyBookingWizard.confirmation.guest.insuranceSuccess') : guest.insuranceStatus || t('companyBookingWizard.confirmation.guest.insurancePending')}</span>
                    </div>
                  </div>
                </div>
                {guest.insuranceStatus === 'Success' && (
                  <CheckCircle2 className={styles.checkIcon} strokeWidth={2} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>{t('companyBookingWizard.confirmation.sections.guestsEmpty')}</p>
        )}
      </div>

      {/* Tour Completion Section */}
      {shouldRenderCompletionSection && (
        <div className={styles.completionSection}>
          <h3 className={styles.sectionTitle}>
            <ShieldCheck className={styles.sectionIcon} strokeWidth={1.5} />
            {t('companyBookingWizard.confirmation.sections.completionTitle')}
          </h3>
          
          {/* Completion Status Display */}
          <div className={styles.completionStatusInfo}>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>{t('companyBookingWizard.confirmation.completion.companyStatus')}</span>
              <span className={styles.statusValue}>
                {companyConfirmed ? (
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{t('companyBookingWizard.confirmation.completion.confirmed')}</span>
                ) : (
                  <span style={{ color: '#6b7280' }}>{t('companyBookingWizard.confirmation.completion.notConfirmed')}</span>
                )}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>{t('companyBookingWizard.confirmation.completion.userStatus')}</span>
              <span className={styles.statusValue}>
                {userConfirmed ? (
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{t('companyBookingWizard.confirmation.completion.confirmed')}</span>
                ) : (
                  <span style={{ color: '#6b7280' }}>{t('companyBookingWizard.confirmation.completion.notConfirmed')}</span>
                )}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>{t('companyBookingWizard.confirmation.completion.tourEndDate')}</span>
              <span className={styles.statusValue}>{getTourEndDate() || '-'}</span>
            </div>
            {booking?.autoConfirmedDate && (
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>{t('companyBookingWizard.confirmation.completion.autoConfirmDate')}</span>
                <span className={styles.statusValue}>{getAutoConfirmedDate()}</span>
              </div>
            )}
          </div>

          {isStatusWaitingConfirm ? (
            checkingStatus ? (
              <div className={styles.loading}>
                <p>{t('companyBookingWizard.confirmation.completion.checkingStatus')}</p>
              </div>
            ) : tourCompleted ? (
              <div className={styles.completionStatus}>
                <CheckCircle2 className={styles.completionCheckIcon} strokeWidth={1.8} />
                <p className={styles.completionMessage}>
                  {t('companyBookingWizard.confirmation.completion.completedMessage')}
                </p>
              </div>
            ) : (
              <div className={styles.completionActions}>
                {shouldShowAutoConfirmMessage() && (
                  <div className={styles.autoConfirmWarning}>
                    <AlertTriangle className={styles.autoConfirmIcon} strokeWidth={1.5} />
                    <p className={styles.autoConfirmText}>
                      {companyConfirmed 
                        ? t('companyBookingWizard.confirmation.completion.autoConfirmCompany', { date: getAutoConfirmedDate() })
                        : t('companyBookingWizard.confirmation.completion.autoConfirmUser', { date: getAutoConfirmedDate() })}
                    </p>
                  </div>
                )}
                
                {!companyConfirmed && (
                  <>
                    <p className={styles.completionInfo}>
                      {t('companyBookingWizard.confirmation.completion.readyToConfirm', {
                        date: getTourEndDate()
                      })}
                    </p>
                    <button
                      onClick={handleConfirmCompletion}
                      disabled={loading || companyConfirmed}
                      className={styles.confirmButton}
                    >
                      {loading
                        ? t('companyBookingWizard.confirmation.completion.confirmProcessing')
                        : t('companyBookingWizard.confirmation.completion.confirmButton')}
                    </button>
                    <p className={styles.completionNote}>
                      {t('companyBookingWizard.confirmation.completion.confirmNote', {
                        date: getAutoConfirmedDate()
                      })}
                    </p>
                  </>
                )}
                
                {companyConfirmed && !tourCompleted && (
                  <div className={styles.waitingMessage}>
                    <p className={styles.completionInfo}>
                      {t('companyBookingWizard.confirmation.completion.waitingUser')}
                    </p>
                    <p className={styles.completionNote}>
                      {t('companyBookingWizard.confirmation.completion.waitingUserNote', {
                        date: getAutoConfirmedDate()
                      })}
                    </p>
                  </div>
                )}
              </div>
            )
          ) : isStatusPendingCompletion ? (
            <div className={styles.waitingMessage}>
              <p className={styles.completionInfo}>
                Booking đã hoàn tất các bước phê duyệt và đang chờ tour diễn ra/hoàn tất (trạng thái BOOKING_SUCCESS_PENDING).
              </p>
              <p className={styles.completionNote}>
                Sau khi tour kết thúc, hệ thống sẽ tự động chuyển sang trạng thái BOOKING_SUCCESS_WAIT_FOR_CONFIRMED để công ty và khách hàng xác nhận hoàn tất.
              </p>
            </div>
          ) : (
            <div className={styles.completionStatus}>
              <CheckCircle2 className={styles.completionCheckIcon} strokeWidth={1.8} />
              <p className={styles.completionMessage}>
                Tour đã được xác nhận hoàn thành bởi cả hai bên. Thanh toán sẽ được chuyển đến tài khoản của công ty.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Note about tour completion */}
      {isStatusPendingCompletion && (
        <div className={styles.note}>
          <h4 className={styles.noteTitle}>Lưu ý:</h4>
          <p className={styles.noteText}>
            Booking đang trong trạng thái BOOKING_SUCCESS_PENDING. Sau khi tour kết thúc (ngày khởi hành + thời lượng tour), hệ thống sẽ chuyển sang BOOKING_SUCCESS_WAIT_FOR_CONFIRMED để cả công ty và khách hàng xác nhận tour đã hoàn tất.
          </p>
          <ul className={styles.noteList}>
            <li>Cả 2 cùng tick: tiền sẽ chuyển ngay về công ty.</li>
            <li>Chỉ khách hàng tick: Sau 3 ngày hệ thống tự động xác nhận.</li>
            <li>Chỉ công ty tick: Sau 3 ngày hệ thống tự động xác nhận.</li>
          </ul>
          {booking?.tourEndDate && (
            <p className={styles.noteText} style={{ marginTop: '1rem' }}>
              Tour dự kiến kết thúc: <strong>{getTourEndDate()}</strong>
            </p>
          )}
        </div>
      )}

      {/* Finish Button - Only show if not read-only and booking can be confirmed */}
      {!isReadOnly && 
       booking?.bookingStatus !== 'BOOKING_SUCCESS' && 
       booking?.bookingStatus !== 'BOOKING_SUCCESS_PENDING' &&
       booking?.bookingStatus !== 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED' &&
       (booking?.bookingStatus === 'WAITING_FOR_APPROVED' || booking?.bookingStatus === 'WAITING_FOR_UPDATE') && (
        <div className={styles.finishButtonContainer}>
          <button
            type="button"
            onClick={handleFinish}
            disabled={confirmingBooking}
            className={styles.finishButton}
          >
            {confirmingBooking ? t('companyBookingWizard.navigation.processing') : t('companyBookingWizard.navigation.finish')}
          </button>
        </div>
      )}
    </div>

    {/* Booking Confirmation Modal - Rendered outside container to avoid being clipped */}
    {!isReadOnly && (
      <DeleteConfirmModal
        isOpen={showConfirmModal}
        onClose={() => !confirmingBooking && setShowConfirmModal(false)}
        onConfirm={handleConfirmBooking}
        title={t('companyBookingWizard.confirmModal.title')}
        message={t('companyBookingWizard.confirmModal.message', { bookingId: booking?.bookingId })}
        confirmText={t('companyBookingWizard.confirmModal.confirm')}
        cancelText={t('companyBookingWizard.confirmModal.cancel')}
        icon="✓"
        danger={false}
        disableBackdropClose={confirmingBooking}
      />
    )}
    </>
  );
};

export default Step3Confirmation;

