import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../../contexts/ToastContext';
import { changeBookingStatus } from '../../../../../services/bookingAPI';
import { DeleteConfirmModal } from '../../../../../components/modals';
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
  onStepCompleted,
  onInsuranceUpdatesPending
}) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState({});
  const [guestsState, setGuestsState] = useState(guests || []);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  useEffect(() => {
    setGuestsState(guests || []);
  }, [guests]);

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

    const guestName = updatedGuests.find(g => g.bookingGuestId === guestId)?.fullName || 'khách';
    showSuccess(`Đã cập nhật trạng thái bảo hiểm cho ${guestName}. Thay đổi sẽ được lưu khi bạn hoàn thành booking.`);
  };

  const handleReject = () => {
    // Show confirmation modal
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    try {
      setLoading({ reject: true });
      setShowRejectModal(false);
      const updatedBooking = await changeBookingStatus(booking.bookingId, 'BOOKING_REJECTED');
      onBookingUpdate(updatedBooking);
      showSuccess('Đã từ chối booking');
      // Navigate back after rejection
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Error rejecting booking:', error);
      showError(error.message || 'Không thể từ chối booking');
    } finally {
      setLoading(prev => ({ ...prev, reject: false }));
    }
  };

  const handleApproveAll = () => {
    // Don't save to DB yet, just update local state
    // The actual DB update will happen when user confirms in modal
    const updatedGuests = guestsState.map(g => ({ ...g, insuranceStatus: 'Success' }));
    setGuestsState(updatedGuests);

    showSuccess('Đã duyệt tất cả bảo hiểm. Thay đổi sẽ được lưu khi bạn hoàn thành booking.');
  };

  const handleContinue = () => {
    // Check if all guests have Success insurance
    const allSuccess = guestsState.length > 0 && 
      guestsState.every(g => g.insuranceStatus === 'Success');
    
    if (!allSuccess) {
      showError('Tất cả khách phải có trạng thái bảo hiểm là SUCCESS để tiếp tục');
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

      if (onStepCompleted) {
        onStepCompleted(2, 3);
      }

      showSuccess('Đã ghi nhận các thay đổi bảo hiểm. Vui lòng hoàn thành booking để lưu vào database.');
      onNext();
    } catch (error) {
      console.error('Error preparing insurance status changes:', error);
      showError(error.message || 'Không thể ghi nhận thay đổi bảo hiểm');
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

  const getInsuranceStatusColor = (status) => {
    switch (status) {
      case 'Success':
        return '#10b981';
      case 'Failed':
        return '#ef4444';
      case 'Pending':
      default:
        return '#f59e0b';
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

  const allSuccess = guestsState.length > 0 && 
    guestsState.every(g => g.insuranceStatus === 'Success');
  
  const hasPending = guestsState.some(g => !g.insuranceStatus || g.insuranceStatus === 'Pending');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Thông tin bảo hiểm</h2>
        <p className={styles.description}>
          Quản lý trạng thái bảo hiểm cho từng khách. Tất cả khách phải có trạng thái SUCCESS để tiếp tục.
        </p>
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Tổng số khách:</span>
          <span className={styles.summaryValue}>{guestsState.length}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>SUCCESS:</span>
          <span className={styles.summaryValue} style={{ color: '#10b981' }}>
            {guestsState.filter(g => g.insuranceStatus === 'Success').length}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>FAILED:</span>
          <span className={styles.summaryValue} style={{ color: '#ef4444' }}>
            {guestsState.filter(g => g.insuranceStatus === 'Failed').length}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>PENDING:</span>
          <span className={styles.summaryValue} style={{ color: '#f59e0b' }}>
            {guestsState.filter(g => !g.insuranceStatus || g.insuranceStatus === 'Pending').length}
          </span>
        </div>
      </div>

      {/* Guests Insurance Table */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Danh sách khách và bảo hiểm</h3>
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
                        <span
                          className={styles.statusBadge}
                          style={{
                            backgroundColor: `${getInsuranceStatusColor(currentStatus)}15`,
                            color: getInsuranceStatusColor(currentStatus)
                          }}
                        >
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
                              ✓
                            </button>
                            <button
                              onClick={() => handleInsuranceStatusChange(guest.bookingGuestId, 'FAILED')}
                              className={`${styles.statusBtn} ${styles.failedBtn}`}
                              disabled={currentStatus === 'Failed' || loading.continue}
                              title="Từ chối bảo hiểm"
                            >
                              ✕
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
                className={styles.btnWarning}
                disabled={loading.reject || loading.continue}
              >
                Duyệt tất cả
              </button>
            )}
            <button
              onClick={handleReject}
              className={styles.btnDanger}
              disabled={loading.reject || booking.bookingStatus === 'BOOKING_REJECTED'}
            >
              {loading.reject ? 'Đang xử lý...' : 'Từ chối booking'}
            </button>
            <button
              onClick={handleContinue}
              className={styles.btnPrimary}
              disabled={!allSuccess || loading.reject || loading.continue || booking.bookingStatus === 'BOOKING_SUCCESS'}
            >
              {loading.continue ? 'Đang xử lý...' : 'Xác nhận và tiếp tục'}
            </button>
          </div>
        </div>
      )}

      {!allSuccess && guestsState.length > 0 && (
        <div className={styles.warning}>
          <p>⚠️ Tất cả khách phải có trạng thái bảo hiểm là SUCCESS để tiếp tục.</p>
        </div>
      )}

      {/* Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showConfirmModal}
        onClose={() => !loading.continue && setShowConfirmModal(false)}
        onConfirm={handleConfirmContinue}
        title="Xác nhận duyệt bảo hiểm"
        message={`Bạn có chắc chắn muốn ghi nhận các thay đổi bảo hiểm và chuyển sang bước cuối? Những thay đổi này sẽ được lưu vào database khi bạn bấm "Hoàn thành" ở bước 3.`}
        confirmText={t('common.confirm') || 'Xác nhận'}
        cancelText={t('common.cancel') || 'Hủy'}
        icon="✓"
        danger={false}
        disableBackdropClose={loading.continue}
      >
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.6', color: '#374151', marginBottom: '0.5rem' }}>
            Các thay đổi trạng thái bảo hiểm sẽ được lưu vào database:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#374151', maxHeight: '200px', overflowY: 'auto' }}>
            {guestsState.map((guest, index) => {
              const originalGuest = guests.find(g => g.bookingGuestId === guest.bookingGuestId);
              const hasChanged = originalGuest && originalGuest.insuranceStatus !== guest.insuranceStatus;
              if (!hasChanged && originalGuest) return null;
              return (
                <li key={guest.bookingGuestId || index} style={{ marginBottom: '0.25rem' }}>
                  <strong>{guest.fullName || `Khách ${index + 1}`}</strong>: {originalGuest ? `${originalGuest.insuranceStatus || 'Pending'} → ${guest.insuranceStatus || 'Pending'}` : guest.insuranceStatus || 'Pending'}
                </li>
              );
            })}
          </ul>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', lineHeight: '1.6', color: '#374151' }}>
            Sau khi xác nhận, bạn sẽ chuyển sang bước cuối cùng để xác nhận booking.
          </p>
        </div>
      </DeleteConfirmModal>

      {/* Reject Confirmation Modal */}
      {!isReadOnly && (
        <DeleteConfirmModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleConfirmReject}
          title="Xác nhận từ chối booking"
          message="Bạn có chắc chắn muốn từ chối booking này không?"
          confirmText={t('common.confirm') || 'Xác nhận'}
          cancelText={t('common.cancel') || 'Hủy'}
          icon="⚠"
          danger={true}
          disableBackdropClose={false}
        />
      )}
    </div>
  );
};

export default Step2Insurance;

