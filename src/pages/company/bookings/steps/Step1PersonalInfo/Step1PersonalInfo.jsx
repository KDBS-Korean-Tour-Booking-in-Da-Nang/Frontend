import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  FileText,
  Mail,
  UsersRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hash,
  CalendarDays,
  Users,
  UserRound,
  UserCircle2,
  UserSquare2,
  AtSign,
  Phone,
  Map,
  MapPin,
  Home,
  NotebookPen,
  Globe,
  IdCard
} from 'lucide-react';
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

  const statusColorMap = {
    BOOKING_SUCCESS: '#10b981',
    BOOKING_REJECTED: '#ef4444',
    BOOKING_FAILED: '#ef4444',
    WAITING_FOR_UPDATE: '#8b5cf6',
    WAITING_FOR_APPROVED: '#3b82f6',
    PENDING_PAYMENT: '#f59e0b',
    default: '#6b7280'
  };

  const statusAccent = statusColorMap[booking?.bookingStatus] || statusColorMap.default;

  const bookingDetails = [
    {
      key: 'booking-id',
      label: 'Mã booking',
      value: booking?.bookingId ? `#${booking.bookingId}` : '-',
      icon: Hash
    },
    {
      key: 'tour',
      label: 'Tour',
      value: booking?.tourName || '-',
      icon: Map
    },
    {
      key: 'departure',
      label: 'Ngày khởi hành',
      value: formatDate(booking?.departureDate),
      icon: CalendarDays
    },
    {
      key: 'guests',
      label: 'Tổng số khách',
      value: booking?.totalGuests || 0,
      icon: Users
    }
  ];

  const contactDetails = [
    {
      key: 'contact-name',
      label: 'Họ tên',
      value: booking?.contactName || '-',
      icon: UserRound
    },
    {
      key: 'contact-email',
      label: 'Email',
      value: booking?.contactEmail || '-',
      icon: AtSign
    },
    {
      key: 'contact-phone',
      label: 'Số điện thoại',
      value: booking?.contactPhone || '-',
      icon: Phone
    },
    {
      key: 'contact-address',
      label: 'Địa chỉ',
      value: booking?.contactAddress || '-',
      icon: Home
    }
  ];

  if (booking?.pickupPoint) {
    contactDetails.push({
      key: 'pickup-point',
      label: 'Điểm đón',
      value: booking.pickupPoint,
      icon: MapPin
    });
  }

  if (booking?.note) {
    contactDetails.push({
      key: 'note',
      label: 'Ghi chú',
      value: booking.note,
      icon: NotebookPen
    });
  }

  const guestColumns = [
    { key: 'index', label: 'STT', icon: Hash },
    { key: 'name', label: 'Họ tên', icon: UserRound },
    { key: 'birth', label: 'Ngày sinh', icon: CalendarDays },
    { key: 'gender', label: 'Giới tính', icon: UserCircle2 },
    { key: 'type', label: 'Loại khách', icon: UserSquare2 },
    { key: 'id', label: 'CMND/CCCD', icon: IdCard },
    { key: 'nation', label: 'Quốc tịch', icon: Globe }
  ];

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerCard}>
          <div className={styles.headerIcon}>
            <ClipboardList size={28} strokeWidth={1.6} />
          </div>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>Thông tin cá nhân</h2>
          <p className={styles.description}>
              Xem và duyệt chi tiết booking trước khi chuyển sang bước bảo hiểm. Phong cách tối giản, tập trung
              vào dữ liệu quan trọng.
          </p>
        </div>
          <div className={styles.headerMeta}>
            <span className={styles.bookingTag}>#{booking.bookingId}</span>
            <span
              className={styles.statusPill}
              style={{
                color: statusAccent,
                borderColor: `${statusAccent}33`,
                backgroundColor: `${statusAccent}12`
              }}
            >
              {booking?.bookingStatus || '-'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.infoSections}>
        {/* Booking Information */}
        <div className={`${styles.section} ${styles.infoSection}`}>
          <h3 className={styles.sectionTitle}>
            <FileText className={styles.sectionIcon} strokeWidth={1.5} />
            Thông tin booking
          </h3>
          <div className={styles.infoGrid}>
            {bookingDetails.map(({ key, label, value, icon: Icon }) => (
              <div key={key} className={styles.infoItem}>
                <Icon className={styles.infoItemIcon} strokeWidth={1.8} />
                <div className={styles.infoItemText}>
                  <span className={styles.label}>{label}:</span>
                  <span className={styles.value}>{value}</span>
            </div>
          </div>
        ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className={`${styles.section} ${styles.infoSection}`}>
          <h3 className={styles.sectionTitle}>
            <Mail className={styles.sectionIcon} strokeWidth={1.5} />
            Thông tin liên hệ
          </h3>
        <div className={styles.infoGrid}>
            {contactDetails.map(({ key, label, value, icon: Icon }) => (
              <div key={key} className={styles.infoItem}>
                <Icon className={styles.infoItemIcon} strokeWidth={1.8} />
                <div className={styles.infoItemText}>
                  <span className={styles.label}>{label}:</span>
                <span className={styles.value}>{value}</span>
              </div>
            </div>
          ))}
        </div>
          </div>
        </div>

      {/* Guests Information */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <UsersRound className={styles.sectionIcon} strokeWidth={1.5} />
          Danh sách khách
        </h3>
        {guests && guests.length > 0 ? (
          <div className={styles.guestsTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {guestColumns.map(({ key, label, icon: Icon }) => (
                    <th key={key}>
                      <span className={styles.tableHeader}>
                        <Icon className={styles.tableHeaderIcon} strokeWidth={1.8} />
                        {label}
                      </span>
                    </th>
                  ))}
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
              className={`${styles.actionButton} ${styles.btnWarning}`}
              disabled={loading || booking.bookingStatus === 'WAITING_FOR_UPDATE'}
            >
              <AlertTriangle size={18} />
              {loading ? 'Đang xử lý...' : 'Yêu cầu cập nhật'}
            </button>
            <button
              onClick={handleReject}
              className={`${styles.actionButton} ${styles.btnDanger}`}
              disabled={loading || booking.bookingStatus === 'BOOKING_REJECTED'}
            >
              <XCircle size={18} />
              {loading ? 'Đang xử lý...' : 'Từ chối'}
            </button>
            <button
              onClick={handleApprove}
              className={`${styles.actionButton} ${styles.btnPrimary}`}
              disabled={
                booking.bookingStatus === 'BOOKING_REJECTED' ||
                booking.bookingStatus === 'BOOKING_SUCCESS' ||
                booking.bookingStatus === 'BOOKING_FAILED'
              }
            >
              <CheckCircle2 size={18} />
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
          <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: '#f4f8ff', borderRadius: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#1e293b' }}>
              Sau khi xác nhận, bạn sẽ chuyển sang bước duyệt bảo hiểm. Tất cả thay đổi chỉ được ghi vào hệ thống
              ở bước hoàn tất cuối cùng.
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

