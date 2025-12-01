import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, UsersRound, Check, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { useToast } from '../../../../../contexts/ToastContext';
import { changeBookingStatus } from '../../../../../services/bookingAPI';
import { DeleteConfirmModal, RequestUpdateModal } from '../../../../../components/modals';
import styles from './Step2Insurance.module.css';

const Step2Insurance = ({
  booking,
  guests,
  onBookingUpdate,
  onGuestsUpdate,
  onNext,
  onBack,
  isReadOnly = false,
  isStep1Completed = false,
  isStep2Completed = false,
  onStepCompleted,
  onInsuranceUpdatesPending
}) => {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState({});
  const [guestsState, setGuestsState] = useState(guests || []);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const storageKey = booking?.bookingId ? `booking_insurance_state_${booking.bookingId}` : null;

  const mergeWithSavedState = (guestList) => {
    if (!storageKey) return guestList;
    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (!savedRaw) return guestList;
      const savedMap = JSON.parse(savedRaw);
      if (!savedMap) return guestList;
      return guestList.map((guest) => {
        const savedStatus = savedMap[guest.bookingGuestId];
        if (savedStatus) {
          return { ...guest, insuranceStatus: savedStatus };
        }
        return guest;
      });
    } catch (err) {
      return guestList;
    }
  };

  const persistInsuranceState = (guestList) => {
    if (!storageKey) return;
    try {
      const map = guestList.reduce((acc, guest) => {
        if (guest.bookingGuestId && guest.insuranceStatus) {
          acc[guest.bookingGuestId] = guest.insuranceStatus;
        }
        return acc;
      }, {});
      localStorage.setItem(storageKey, JSON.stringify(map));
    } catch (err) {
      // Unable to persist insurance state
    }
  };

  useEffect(() => {
    const merged = mergeWithSavedState(guests || []);
    setGuestsState(merged);
  }, [guests, booking?.bookingId]);

  useEffect(() => {
    if (!storageKey) return;
    if (
      booking?.bookingStatus === 'BOOKING_SUCCESS' ||
      booking?.bookingStatus === 'BOOKING_REJECTED' ||
      booking?.bookingStatus === 'BOOKING_FAILED'
    ) {
      localStorage.removeItem(storageKey);
    }
  }, [booking?.bookingStatus, storageKey]);

  const handleInsuranceStatusChange = (guestId, status) => {
    // Don't save to DB yet, just update local state
    // The actual DB update will happen when user confirms in modal
    const statusValue = status === 'SUCCESS' ? 'Success' : status === 'FAILED' ? 'Failed' : status;
    
    // Update local state
    const updatedGuests = guestsState.map(g => 
      g.bookingGuestId === guestId 
        ? { ...g, insuranceStatus: statusValue }
        : g
    );
    setGuestsState(updatedGuests);
    persistInsuranceState(updatedGuests);

    const guestName = updatedGuests.find(g => g.bookingGuestId === guestId)?.fullName || 'khách';
    showSuccess(`Đã cập nhật trạng thái bảo hiểm cho ${guestName}. Thay đổi sẽ được lưu khi bạn hoàn thành booking.`);
  };

  const handleReject = () => {
    // Show confirmation modal
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (message) => {
    if (!message?.trim()) return;
    try {
      setLoading({ reject: true });
      const updatedBooking = await changeBookingStatus(booking.bookingId, 'BOOKING_REJECTED', message.trim());
      onBookingUpdate(updatedBooking);
      setShowRejectModal(false);
      showSuccess('Đã từ chối booking');
      // Navigate back after rejection
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      // Error rejecting booking - show in UI if needed
    } finally {
      setLoading(prev => ({ ...prev, reject: false }));
    }
  };

  const handleApproveAll = () => {
    // Don't save to DB yet, just update local state
    // The actual DB update will happen when user confirms in modal
    const updatedGuests = guestsState.map(g => ({ ...g, insuranceStatus: 'Success' }));
    setGuestsState(updatedGuests);
    persistInsuranceState(updatedGuests);

    showSuccess('Đã duyệt tất cả bảo hiểm. Thay đổi sẽ được lưu khi bạn hoàn thành booking.');
  };

  const handleContinue = () => {
    // Check if all guests have Success insurance
    const allSuccess = guestsState.length > 0 && 
      guestsState.every(g => g.insuranceStatus === 'Success');
    
    if (!allSuccess) {
      // Validation error - can be shown in UI
      return;
    }

    // Show confirmation modal before saving to DB and moving to step 3
    setShowConfirmModal(true);
  };

  // Handle confirmation - save all insurance statuses to DB
  const handleConfirmContinue = async () => {
    setLoading({ continue: true });
    setShowConfirmModal(false);

    try {
      const changesToSave = guestsState
        .map(currentGuest => {
          const originalGuest = guests.find(g => g.bookingGuestId === currentGuest.bookingGuestId);
          if (originalGuest && originalGuest.insuranceStatus !== currentGuest.insuranceStatus) {
            return {
              guestId: currentGuest.bookingGuestId,
              status: currentGuest.insuranceStatus || 'Pending'
            };
          }
          return null;
        })
        .filter(change => change !== null);

      if (onInsuranceUpdatesPending) {
        onInsuranceUpdatesPending(changesToSave);
      }

      onGuestsUpdate(guestsState);
      persistInsuranceState(guestsState);

      if (onStepCompleted) {
        onStepCompleted(2, 3);
      }

      showSuccess('Đã ghi nhận các thay đổi bảo hiểm. Vui lòng hoàn thành booking để lưu vào database.');
      onNext();
    } catch (error) {
      // Error preparing insurance status changes - show in UI if needed
    } finally {
      setLoading(prev => ({ ...prev, continue: false }));
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

  const getInsuranceStatusLabel = (status) => {
    switch (status) {
      case 'Success':
        return 'SUCCESS';
      case 'Failed':
        return 'FAILED';
      case 'Pending':
      default:
        return 'PENDING';
    }
  };

  const getStatusClass = (status) => {
    if (status === 'Success') return styles.statusSuccess;
    if (status === 'Failed') return styles.statusFailed;
    return styles.statusPending;
  };

  const allSuccess = guestsState.length > 0 && 
    guestsState.every(g => g.insuranceStatus === 'Success');
  
  const hasPending = guestsState.some(g => !g.insuranceStatus || g.insuranceStatus === 'Pending');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerCard}>
          <div className={styles.headerIcon}>
            <ShieldCheck size={28} strokeWidth={1.6} />
          </div>
          <div>
            <h2 className={styles.title}>Thông tin bảo hiểm</h2>
            <p className={styles.description}>
              Duy trì tone pastel, tập trung vào trạng thái bảo hiểm của từng khách. Đảm bảo tất cả đều SUCCESS trước khi tiếp tục.
            </p>
          </div>
          <span className={styles.stepBadge}>Bước 2 / 3</span>
        </div>
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabelRow}>
            <UsersRound className={styles.summaryIcon} strokeWidth={1.5} />
            <span className={styles.summaryLabel}>Tổng khách</span>
          </div>
          <span className={styles.summaryValue}>{guestsState.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabelRow}>
            <ShieldCheck className={`${styles.summaryIcon} ${styles.success}`} strokeWidth={1.5} />
            <span className={styles.summaryLabel}>SUCCESS</span>
          </div>
          <span className={styles.summaryValue}>
            {guestsState.filter(g => g.insuranceStatus === 'Success').length}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabelRow}>
            <AlertTriangle className={`${styles.summaryIcon} ${styles.failed}`} strokeWidth={1.5} />
            <span className={styles.summaryLabel}>FAILED</span>
          </div>
          <span className={styles.summaryValue}>
            {guestsState.filter(g => g.insuranceStatus === 'Failed').length}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabelRow}>
            <ArrowRight className={styles.summaryIcon} strokeWidth={1.5} />
            <span className={styles.summaryLabel}>PENDING</span>
          </div>
          <span className={styles.summaryValue}>
            {guestsState.filter(g => !g.insuranceStatus || g.insuranceStatus === 'Pending').length}
          </span>
        </div>
      </div>

      {/* Guests Insurance Table */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <ShieldCheck className={styles.sectionIcon} strokeWidth={1.5} />
          Danh sách khách và bảo hiểm
        </h3>
        {guestsState && guestsState.length > 0 ? (
          <div className={styles.guestsTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ tên</th>
                  <th>Ngày sinh</th>
                  <th>CMND/CCCD</th>
                  <th>Trạng thái bảo hiểm</th>
                  {!isReadOnly && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {guestsState.map((guest, index) => {
                  const currentStatus = guest.insuranceStatus || 'Pending';
                  
                  return (
                    <tr key={guest.bookingGuestId || index}>
                      <td>{index + 1}</td>
                      <td>{guest.fullName || '-'}</td>
                      <td>{formatDate(guest.birthDate)}</td>
                      <td>{guest.idNumber || '-'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(currentStatus)}`}>
                          {getInsuranceStatusLabel(currentStatus)}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              onClick={() => handleInsuranceStatusChange(guest.bookingGuestId, 'SUCCESS')}
                              className={`${styles.statusBtn} ${styles.successBtn}`}
                              disabled={currentStatus === 'Success' || loading.continue}
                              title="Duyệt bảo hiểm"
                            >
                              <Check size={16} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => handleInsuranceStatusChange(guest.bookingGuestId, 'FAILED')}
                              className={`${styles.statusBtn} ${styles.failedBtn}`}
                              disabled={currentStatus === 'Failed' || loading.continue}
                              title="Từ chối bảo hiểm"
                            >
                              <X size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
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
            {hasPending && (
              <button
                onClick={handleApproveAll}
                className={`${styles.actionButton} ${styles.btnWarning}`}
                disabled={loading.reject || loading.continue}
              >
                <ShieldCheck size={18} />
                Duyệt tất cả
              </button>
            )}
            <button
              onClick={handleReject}
              className={`${styles.actionButton} ${styles.btnDanger}`}
              disabled={loading.reject || booking.bookingStatus === 'BOOKING_REJECTED'}
            >
              <X size={18} />
              {loading.reject ? 'Đang xử lý...' : 'Từ chối booking'}
            </button>
            <button
              onClick={handleContinue}
              className={`${styles.actionButton} ${styles.btnPrimary}`}
              disabled={
                isStep2Completed ||
                !allSuccess ||
                loading.reject ||
                loading.continue ||
                booking.bookingStatus === 'BOOKING_SUCCESS'
              }
            >
              <ArrowRight size={18} />
              {isStep2Completed
                ? 'Đã ghi nhận'
                : loading.continue
                  ? 'Đang xử lý...'
                  : 'Xác nhận và tiếp tục'}
            </button>
          </div>
        </div>
      )}

      {!allSuccess && guestsState.length > 0 && (
        <div className={styles.warning}>
          <AlertTriangle size={18} />
          <p>Tất cả khách phải có trạng thái bảo hiểm SUCCESS để tiếp tục.</p>
        </div>
      )}

      {/* Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showConfirmModal}
        onClose={() => !loading.continue && setShowConfirmModal(false)}
        onConfirm={handleConfirmContinue}
        title="Xác nhận duyệt bảo hiểm"
        message="Bạn có chắc chắn muốn ghi nhận các thay đổi bảo hiểm và chuyển sang bước cuối?"
        confirmText={t('common.confirm') || 'Xác nhận'}
        cancelText={t('common.cancel') || 'Hủy'}
        icon="✓"
        danger={false}
        disableBackdropClose={loading.continue}
      />

      {/* Reject Reason Modal */}
      {!isReadOnly && (
        <RequestUpdateModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleConfirmReject}
          bookingId={booking?.bookingId}
          title="Lý do từ chối booking"
          message="Vui lòng nhập lý do từ chối booking ở bước bảo hiểm:"
        />
      )}
    </div>
  );
};

export default Step2Insurance;

