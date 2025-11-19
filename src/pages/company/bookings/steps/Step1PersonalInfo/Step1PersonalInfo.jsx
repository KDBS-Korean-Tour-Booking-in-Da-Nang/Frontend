import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../../contexts/ToastContext';
import { DeleteConfirmModal, RequestUpdateModal } from '../../../../../components/modals';
import { changeBookingStatus } from '../../../../../services/bookingAPI';
import styles from './Step1PersonalInfo.module.css';

const Step1PersonalInfo = ({ booking, guests, onBookingUpdate, onNext, onBack, isReadOnly = false, onStepCompleted }) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRequestUpdateModal, setShowRequestUpdateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleApprove = () => {
    // Show confirmation modal before moving to step 2
    setShowConfirmModal(true);
  };

  const handleConfirmApprove = () => {
    // Don't save to DB yet, just move to step 2
    // The actual DB update will happen in step 3
    setShowConfirmModal(false);
    
    // Mark step 1 as completed and move to step 2
    if (onStepCompleted) {
      onStepCompleted(1, 2); // Mark step 1 completed, save progress with step 2
    }
    
    showSuccess('Đã duyệt thông tin booking. Vui lòng tiếp tục các bước sau.');
    onNext();
  };

  const handleReject = () => {
    // Show confirmation modal
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (message) => {
    if (!message?.trim()) return;
    try {
      setLoading(true);
      const updatedBooking = await changeBookingStatus(booking.bookingId, 'BOOKING_REJECTED', message.trim());
      onBookingUpdate(updatedBooking);
      setShowRejectModal(false);
      showSuccess('Đã từ chối booking');
      // Navigate back to booking list after rejection
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Error rejecting booking:', error);
      showError(error.message || 'Không thể từ chối booking');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUpdate = () => {
    // Open modal to input message
    setShowRequestUpdateModal(true);
  };

  const handleConfirmRequestUpdate = async (message) => {
    try {
      setLoading(true);
      const updatedBooking = await changeBookingStatus(booking.bookingId, 'WAITING_FOR_UPDATE', message);
      onBookingUpdate(updatedBooking);
      setShowRequestUpdateModal(false);
      showSuccess('Đã gửi yêu cầu cập nhật booking');
      // Navigate back to booking management after request update
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Error requesting update:', error);
      showError(error.message || 'Không thể gửi yêu cầu cập nhật');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
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

  const getGenderLabel = (gender) => {
    switch (gender) {
      case 'MALE':
        return 'Nam';
      case 'FEMALE':
        return 'Nữ';
      case 'OTHER':
        return 'Khác';
      default:
        return gender || '-';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Thông tin cá nhân</h2>
        <p className={styles.description}>
          Xem và duyệt thông tin booking. Bạn có thể duyệt, từ chối hoặc yêu cầu cập nhật.
        </p>
      </div>

      {/* Booking Information */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Thông tin booking</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Mã booking:</span>
            <span className={styles.value}>#{booking.bookingId}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Tour:</span>
            <span className={styles.value}>{booking.tourName || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Ngày khởi hành:</span>
            <span className={styles.value}>{formatDate(booking.departureDate)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Tổng số khách:</span>
            <span className={styles.value}>{booking.totalGuests || 0}</span>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Thông tin liên hệ</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Họ tên:</span>
            <span className={styles.value}>{booking.contactName || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Email:</span>
            <span className={styles.value}>{booking.contactEmail || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Số điện thoại:</span>
            <span className={styles.value}>{booking.contactPhone || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Địa chỉ:</span>
            <span className={styles.value}>{booking.contactAddress || '-'}</span>
          </div>
          {booking.pickupPoint && (
            <div className={styles.infoItem}>
              <span className={styles.label}>Điểm đón:</span>
              <span className={styles.value}>{booking.pickupPoint}</span>
            </div>
          )}
          {booking.note && (
            <div className={styles.infoItem}>
              <span className={styles.label}>Ghi chú:</span>
              <span className={styles.value}>{booking.note}</span>
            </div>
          )}
        </div>
      </div>

      {/* Guests Information */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Danh sách khách</h3>
        {guests && guests.length > 0 ? (
          <div className={styles.guestsTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ tên</th>
                  <th>Ngày sinh</th>
                  <th>Giới tính</th>
                  <th>Loại khách</th>
                  <th>CMND/CCCD</th>
                  <th>Quốc tịch</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((guest, index) => (
                  <tr key={guest.bookingGuestId || index}>
                    <td>{index + 1}</td>
                    <td>{guest.fullName || '-'}</td>
                    <td>{formatDate(guest.birthDate)}</td>
                    <td>{getGenderLabel(guest.gender)}</td>
                    <td>{getGuestTypeLabel(guest.bookingGuestType)}</td>
                    <td>{guest.idNumber || '-'}</td>
                    <td>{guest.nationality || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyMessage}>Chưa có thông tin khách</p>
        )}
      </div>

      {/* Actions - Only show if not read-only */}
      {!isReadOnly && (
        <div className={styles.actions}>
          <div className={styles.actionGroup}>
            <button
              onClick={handleRequestUpdate}
              className={styles.btnWarning}
              disabled={loading || booking.bookingStatus === 'WAITING_FOR_UPDATE'}
            >
              {loading ? 'Đang xử lý...' : 'Yêu cầu cập nhật'}
            </button>
            <button
              onClick={handleReject}
              className={styles.btnDanger}
              disabled={loading || booking.bookingStatus === 'BOOKING_REJECTED'}
            >
              {loading ? 'Đang xử lý...' : 'Từ chối'}
            </button>
            <button
              onClick={handleApprove}
              className={styles.btnPrimary}
              disabled={
                booking.bookingStatus === 'BOOKING_REJECTED' || 
                booking.bookingStatus === 'BOOKING_SUCCESS' ||
                booking.bookingStatus === 'BOOKING_FAILED'
                // Allow approval when status is WAITING_FOR_APPROVED (user has created booking)
                // or PENDING_PAYMENT or WAITING_FOR_UPDATE
              }
            >
              Duyệt và tiếp tục
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {!isReadOnly && (
        <DeleteConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmApprove}
          title="Xác nhận duyệt booking"
          message={`Bạn có chắc chắn muốn duyệt booking #${booking?.bookingId}?`}
          confirmText="Xác nhận"
          cancelText="Hủy"
          icon="✓"
          danger={false}
          disableBackdropClose={false}
        >
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.6', color: '#374151' }}>
              Sau khi xác nhận, bạn sẽ chuyển sang bước duyệt bảo hiểm. Booking sẽ được lưu vào database ở bước cuối cùng.
            </p>
          </div>
        </DeleteConfirmModal>
      )}

      {/* Request Update Modal */}
      {!isReadOnly && (
        <RequestUpdateModal
          isOpen={showRequestUpdateModal}
          onClose={() => setShowRequestUpdateModal(false)}
          onConfirm={handleConfirmRequestUpdate}
          bookingId={booking?.bookingId}
          title="Yêu cầu cập nhật booking"
          message="Vui lòng nhập lý do yêu cầu cập nhật booking:"
        />
      )}

      {/* Reject Reason Modal */}
      {!isReadOnly && (
        <RequestUpdateModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleConfirmReject}
          bookingId={booking?.bookingId}
          title="Lý do từ chối booking"
          message="Vui lòng nhập lý do từ chối booking này:"
        />
      )}
    </div>
  );
};

export default Step1PersonalInfo;

