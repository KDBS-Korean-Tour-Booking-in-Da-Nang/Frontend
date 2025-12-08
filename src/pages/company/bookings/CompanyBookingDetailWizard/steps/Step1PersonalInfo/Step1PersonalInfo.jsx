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
import { useToast } from '../../../../../../contexts/ToastContext';
import { DeleteConfirmModal, RequestUpdateModal } from '../../../../../../components/modals';
import { changeBookingStatus } from '../../../../../../services/bookingAPI';
import styles from './Step1PersonalInfo.module.css';

const Step1PersonalInfo = ({ booking, guests, onBookingUpdate, onNext, onBack, isReadOnly = false, onStepCompleted }) => {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRequestUpdateModal, setShowRequestUpdateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [error, setError] = useState('');

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
        return t('booking.step2.guestTypes.adult');
      case 'CHILD':
        return t('booking.step2.guestTypes.child');
      case 'BABY':
        return t('booking.step2.guestTypes.baby');
      default:
        return type;
    }
  };

  const getGenderLabel = (gender) => {
    switch (gender) {
      case 'MALE':
        return t('booking.step1.gender.male');
      case 'FEMALE':
        return t('booking.step1.gender.female');
      case 'OTHER':
        return t('booking.step1.gender.other');
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
      label: t('companyBookingWizard.step1.booking.code'),
      value: booking?.bookingId ? `#${booking.bookingId}` : '-',
      icon: Hash
    },
    {
      key: 'tour',
      label: t('companyBookingWizard.step1.booking.tour'),
      value: booking?.tourName || '-',
      icon: Map
    },
    {
      key: 'departure',
      label: t('companyBookingWizard.step1.booking.departureDate'),
      value: formatDate(booking?.departureDate),
      icon: CalendarDays
    },
    {
      key: 'guests',
      label: t('companyBookingWizard.step1.booking.totalGuests'),
      value: booking?.totalGuests || 0,
      icon: Users
    }
  ];

  const contactDetails = [
    {
      key: 'contact-name',
      label: t('booking.step1.fields.fullName'),
      value: booking?.contactName || '-',
      icon: UserRound
    },
    {
      key: 'contact-email',
      label: t('booking.step1.fields.email'),
      value: booking?.contactEmail || '-',
      icon: AtSign
    },
    {
      key: 'contact-phone',
      label: t('booking.step1.fields.phone'),
      value: booking?.contactPhone || '-',
      icon: Phone
    },
    {
      key: 'contact-address',
      label: t('booking.step1.fields.address'),
      value: booking?.contactAddress || '-',
      icon: Home
    }
  ];

  if (booking?.pickupPoint) {
    contactDetails.push({
      key: 'pickup-point',
      label: t('booking.step1.fields.pickupPoint'),
      value: booking.pickupPoint,
      icon: MapPin
    });
  }

  if (booking?.note) {
    contactDetails.push({
      key: 'note',
      label: t('booking.step1.fields.note'),
      value: booking.note,
      icon: NotebookPen
    });
  }

  const guestColumns = [
    { key: 'index', label: t('companyBookingWizard.step1.guests.columns.index'), icon: Hash },
    { key: 'name', label: t('companyBookingWizard.step1.guests.columns.fullName'), icon: UserRound },
    { key: 'birth', label: t('companyBookingWizard.step1.guests.columns.birthDate'), icon: CalendarDays },
    { key: 'gender', label: t('companyBookingWizard.step1.guests.columns.gender'), icon: UserCircle2 },
    { key: 'type', label: t('companyBookingWizard.step1.guests.columns.guestType'), icon: UserSquare2 },
    { key: 'id', label: t('companyBookingWizard.step1.guests.columns.idNumber'), icon: IdCard },
    { key: 'nation', label: t('companyBookingWizard.step1.guests.columns.nationality'), icon: Globe }
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
    
    showSuccess(t('companyBookingWizard.step1.toasts.approved'));
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
      showSuccess(t('companyBookingWizard.step1.toasts.rejected'));
      // Navigate back to booking list after rejection
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      // Silently handle error rejecting booking
      setError(error.message || 'Không thể từ chối booking');
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
      showSuccess(t('companyBookingWizard.step1.toasts.requestedUpdate'));
      // Navigate back to booking management after request update
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      // Silently handle error requesting update
      setError(error.message || 'Không thể gửi yêu cầu cập nhật');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#e11d48', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      <div className={styles.header}>
        <div className={styles.headerCard}>
          <div className={styles.headerIcon}>
            <ClipboardList size={28} strokeWidth={1.6} />
          </div>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>{t('companyBookingWizard.step1.header.title')}</h2>
            <p className={styles.description}>
              {t('companyBookingWizard.step1.header.description')}
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
              {t('companyBookingWizard.step1.sections.bookingInfo')}
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
            {t('companyBookingWizard.step1.sections.contactInfo')}
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
          {t('companyBookingWizard.step1.sections.guests')}
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
          <p className={styles.emptyMessage}>{t('companyBookingWizard.step1.guests.empty')}</p>
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
              {loading
                ? t('companyBookingWizard.step1.actions.processing')
                : t('companyBookingWizard.step1.actions.requestUpdate')}
            </button>
            <button
              onClick={handleReject}
              className={`${styles.actionButton} ${styles.btnDanger}`}
              disabled={loading || booking.bookingStatus === 'BOOKING_REJECTED'}
            >
              <XCircle size={18} />
              {loading
                ? t('companyBookingWizard.step1.actions.processing')
                : t('companyBookingWizard.step1.actions.reject')}
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
              {t('companyBookingWizard.step1.actions.approveAndContinue')}
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
          title={t('companyBookingWizard.step1.confirmModal.title')}
          message={t('companyBookingWizard.step1.confirmModal.message', { bookingId: booking?.bookingId })}
          confirmText={t('common.confirm')}
          cancelText={t('common.cancel')}
          icon="✓"
          danger={false}
          disableBackdropClose={false}
        >
          <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: '#f4f8ff', borderRadius: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#1e293b' }}>
              {t('companyBookingWizard.step1.confirmModal.description')}
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
          title={t('companyBookingWizard.step1.requestUpdateModal.title')}
          message={t('companyBookingWizard.step1.requestUpdateModal.message')}
        />
      )}

      {/* Reject Reason Modal */}
      {!isReadOnly && (
        <RequestUpdateModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleConfirmReject}
          bookingId={booking?.bookingId}
          title={t('companyBookingWizard.step1.rejectModal.title')}
          message={t('companyBookingWizard.step1.rejectModal.message')}
        />
      )}
    </div>
  );
};

export default Step1PersonalInfo;

