import { CheckCircleIcon } from '@heroicons/react/24/solid';
import styles from './Step3Confirmation.module.css';

const Step3Confirmation = ({ booking, guests, onBookingUpdate, onBack, onFinish }) => {

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

  // Tính tour end date từ booking.tourEndDate (đã được tính sẵn từ backend)
  const getTourEndDate = () => {
    if (booking.tourEndDate) {
      return formatDate(booking.tourEndDate);
    }
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.successIcon}>
          <CheckCircleIcon className={styles.icon} />
        </div>
        <h2 className={styles.title}>Booking đã được xác nhận thành công!</h2>
        <p className={styles.description}>
          Booking #{booking.bookingId} đã được xác nhận và thông báo đã được gửi đến khách hàng.
        </p>
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
            <span className={styles.value} style={{ color: '#10b981', fontWeight: 600 }}>
              BOOKING_SUCCESS
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

      {/* Note about tour completion */}
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
        <p className={styles.noteText} style={{ marginTop: '1rem', fontStyle: 'italic', color: '#6b7280' }}>
          * Tính năng này cần được triển khai ở Backend (scheduler, notification, payment transfer)
        </p>
      </div>

      {/* Note: Navigation is handled by wizard parent */}
    </div>
  );
};

export default Step3Confirmation;

