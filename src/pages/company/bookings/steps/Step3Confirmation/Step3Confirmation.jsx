import { useState, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useToast } from '../../../../../contexts/ToastContext';
import { companyConfirmTourCompletion, getTourCompletionStatus } from '../../../../../services/bookingAPI';
import styles from './Step3Confirmation.module.css';

const Step3Confirmation = ({ booking, guests, onBookingUpdate, onBack, onFinish, isReadOnly = false }) => {
  const { showSuccess, showError } = useToast();
  const [tourCompleted, setTourCompleted] = useState(false);
  const [companyConfirmed, setCompanyConfirmed] = useState(booking?.companyConfirmedCompletion || false);
  const [userConfirmed, setUserConfirmed] = useState(booking?.userConfirmedCompletion || false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

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
        return 'Người lớn';
      case 'CHILD':
        return 'Trẻ em';
      case 'BABY':
        return 'Em bé';
      default:
        return type;
    }
  };

  // Update company/user confirmed status from booking props
  useEffect(() => {
    if (booking) {
      setCompanyConfirmed(booking.companyConfirmedCompletion || false);
      setUserConfirmed(booking.userConfirmedCompletion || false);
      // Check if tour is completed (both confirmed)
      const isCompleted = (booking.companyConfirmedCompletion && booking.userConfirmedCompletion) || false;
      setTourCompleted(isCompleted);
    }
  }, [booking]);

  // Check tour completion status on mount and refresh periodically
  useEffect(() => {
    const checkCompletionStatus = async () => {
      if (!booking?.bookingId) return;
      
      try {
        setCheckingStatus(true);
        const isCompleted = await getTourCompletionStatus(booking.bookingId);
        setTourCompleted(isCompleted);
        
        // Refresh booking data to get updated confirmation status
        // The backend getTourCompletionStatus may auto-confirm if 3 days have passed
        // So we should refresh booking data to see the updated status
      } catch (error) {
        console.error('Error checking tour completion status:', error);
        // Don't show error to user, just log it
      } finally {
        setCheckingStatus(false);
      }
    };

    checkCompletionStatus();
    // Refresh status every 30 seconds to catch auto-confirmation
    const interval = setInterval(checkCompletionStatus, 30000);
    
    return () => clearInterval(interval);
  }, [booking?.bookingId]);

  // Handle company confirm tour completion
  const handleConfirmCompletion = async () => {
    if (!booking?.bookingId) return;
    
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
        showSuccess('Tour đã được xác nhận hoàn thành bởi cả hai bên! Thanh toán sẽ được chuyển đến công ty.');
      } else {
        showSuccess('Đã xác nhận tour hoàn thành! Nếu khách hàng cũng xác nhận, thanh toán sẽ được chuyển ngay. Nếu không, hệ thống sẽ tự động xác nhận sau 3 ngày (sau ngày ' + getAutoConfirmedDate() + ').');
      }
    } catch (error) {
      console.error('Error confirming tour completion:', error);
      showError(error.message || 'Không thể xác nhận tour hoàn thành');
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
    // Only allow if booking status is SUCCESS
    if (!booking?.bookingId || booking?.bookingStatus !== 'BOOKING_SUCCESS') {
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
    if (!canConfirmCompletion() || tourCompleted) return false;
    // Show if one party confirmed but not both
    return (companyConfirmed && !userConfirmed) || (!companyConfirmed && userConfirmed);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {isReadOnly || booking?.bookingStatus === 'BOOKING_SUCCESS' ? (
          <>
            <div className={styles.successIcon}>
              <CheckCircleIcon className={styles.icon} />
            </div>
            <h2 className={styles.title}>Booking đã được xác nhận thành công!</h2>
            <p className={styles.description}>
              Booking #{booking.bookingId} đã được xác nhận và thông báo đã được gửi đến khách hàng.
            </p>
            {isReadOnly && (
              <p className={styles.description} style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280', fontStyle: 'italic' }}>
                Đây là chế độ xem chỉ đọc. Bạn chỉ có thể xem thông tin booking, không thể chỉnh sửa.
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className={styles.title}>Xác nhận booking</h2>
            <p className={styles.description}>
              Vui lòng xem lại thông tin booking #{booking.bookingId} và bấm "Hoàn thành" để xác nhận booking.
            </p>
          </>
        )}
      </div>

      {/* Booking Summary */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Tóm tắt booking</h3>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.label}>Mã booking:</span>
            <span className={styles.value}>#{booking.bookingId}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>Tour:</span>
            <span className={styles.value}>{booking.tourName || '-'}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>Ngày khởi hành:</span>
            <span className={styles.value}>{formatDate(booking.departureDate)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>Ngày kết thúc (dự kiến):</span>
            <span className={styles.value}>{getTourEndDate() || '-'}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>Tổng số khách:</span>
            <span className={styles.value}>{booking.totalGuests || 0}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>Trạng thái:</span>
            <span className={styles.value} style={{ 
              color: booking?.bookingStatus === 'BOOKING_SUCCESS' ? '#10b981' : '#f59e0b', 
              fontWeight: 600 
            }}>
              {booking?.bookingStatus || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Thông tin liên hệ</h3>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.label}>Họ tên:</span>
            <span className={styles.value}>{booking.contactName || '-'}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>Email:</span>
            <span className={styles.value}>{booking.contactEmail || '-'}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.label}>Số điện thoại:</span>
            <span className={styles.value}>{booking.contactPhone || '-'}</span>
          </div>
        </div>
      </div>

      {/* Guests Summary */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Danh sách khách đã duyệt</h3>
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
                      <span>Bảo hiểm: {guest.insuranceStatus === 'Success' ? 'SUCCESS' : guest.insuranceStatus || 'PENDING'}</span>
                    </div>
                  </div>
                </div>
                {guest.insuranceStatus === 'Success' && (
                  <CheckCircleIcon className={styles.checkIcon} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>Chưa có thông tin khách</p>
        )}
      </div>

      {/* Tour Completion Section */}
      {canConfirmCompletion() && (
        <div className={styles.completionSection}>
          <h3 className={styles.sectionTitle}>Xác nhận tour hoàn thành</h3>
          
          {/* Completion Status Display */}
          <div className={styles.completionStatusInfo}>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Trạng thái công ty:</span>
              <span className={styles.statusValue}>
                {companyConfirmed ? (
                  <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Đã xác nhận</span>
                ) : (
                  <span style={{ color: '#6b7280' }}>Chưa xác nhận</span>
                )}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Trạng thái khách hàng:</span>
              <span className={styles.statusValue}>
                {userConfirmed ? (
                  <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Đã xác nhận</span>
                ) : (
                  <span style={{ color: '#6b7280' }}>Chưa xác nhận</span>
                )}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Ngày kết thúc tour:</span>
              <span className={styles.statusValue}>{getTourEndDate() || '-'}</span>
            </div>
            {booking?.autoConfirmedDate && (
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Ngày tự động xác nhận:</span>
                <span className={styles.statusValue}>{getAutoConfirmedDate()}</span>
              </div>
            )}
          </div>

          {checkingStatus ? (
            <div className={styles.loading}>
              <p>Đang kiểm tra trạng thái tour...</p>
            </div>
          ) : tourCompleted ? (
            <div className={styles.completionStatus}>
              <CheckCircleIcon className={styles.completionCheckIcon} />
              <p className={styles.completionMessage}>
                Tour đã được xác nhận hoàn thành bởi cả hai bên. Thanh toán sẽ được chuyển đến tài khoản của công ty.
              </p>
            </div>
          ) : (
            <div className={styles.completionActions}>
              {shouldShowAutoConfirmMessage() && (
                <div className={styles.autoConfirmWarning}>
                  <p className={styles.autoConfirmText}>
                    {companyConfirmed 
                      ? `Bạn đã xác nhận. Đang chờ khách hàng xác nhận. Nếu khách hàng không xác nhận sau 3 ngày (sau ngày ${getAutoConfirmedDate()}), hệ thống sẽ tự động xác nhận.`
                      : `Khách hàng đã xác nhận. Bạn có thể xác nhận ngay hoặc hệ thống sẽ tự động xác nhận sau 3 ngày (sau ngày ${getAutoConfirmedDate()}).`}
                  </p>
                </div>
              )}
              
              {!companyConfirmed && (
                <>
                  <p className={styles.completionInfo}>
                    Tour đã kết thúc vào ngày <strong>{getTourEndDate()}</strong>. 
                    Bạn có thể xác nhận tour đã hoàn thành để tiến hành thanh toán.
                  </p>
                  <button
                    onClick={handleConfirmCompletion}
                    disabled={loading || companyConfirmed}
                    className={styles.confirmButton}
                  >
                    {loading ? 'Đang xử lý...' : 'Xác nhận tour hoàn thành'}
                  </button>
                  <p className={styles.completionNote}>
                    * Sau khi bạn xác nhận:
                    <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                      <li>Nếu khách hàng cũng xác nhận, thanh toán sẽ được chuyển ngay lập tức.</li>
                      <li>Nếu khách hàng chưa xác nhận, hệ thống sẽ tự động xác nhận sau 3 ngày (sau ngày {getAutoConfirmedDate()}).</li>
                    </ul>
                  </p>
                </>
              )}
              
              {companyConfirmed && !tourCompleted && (
                <div className={styles.waitingMessage}>
                  <p className={styles.completionInfo}>
                    Bạn đã xác nhận tour hoàn thành. Đang chờ khách hàng xác nhận.
                  </p>
                  <p className={styles.completionNote}>
                    Nếu khách hàng xác nhận, thanh toán sẽ được chuyển ngay. 
                    Nếu không, hệ thống sẽ tự động xác nhận sau 3 ngày (sau ngày {getAutoConfirmedDate()}).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Note about tour completion */}
      {!canConfirmCompletion() && booking?.bookingStatus === 'BOOKING_SUCCESS' && (
        <div className={styles.note}>
          <h4 className={styles.noteTitle}>Lưu ý:</h4>
          <p className={styles.noteText}>
            Sau khi tour kết thúc (ngày khởi hành + thời lượng tour), hệ thống sẽ tự động gửi thông báo xác nhận tour kết thúc.
            Cả company và khách hàng đều có thể tick xác nhận tour kết thúc.
          </p>
          <ul className={styles.noteList}>
            <li>Cả 2 cùng tick: Tiền từ hệ thống sẽ chuyển về lại cho company</li>
            <li>Người dùng tick, company không tick: Sau 3 ngày tour sẽ auto được ghi nhận là đã kết thúc</li>
            <li>Company tick, người dùng không tick: Sau 3 ngày tour sẽ auto được ghi nhận là đã kết thúc</li>
          </ul>
          {booking?.tourEndDate && (
            <p className={styles.noteText} style={{ marginTop: '1rem' }}>
              Tour dự kiến kết thúc: <strong>{getTourEndDate()}</strong>
            </p>
          )}
        </div>
      )}

      {/* Note: Navigation is handled by wizard parent */}
    </div>
  );
};

export default Step3Confirmation;

