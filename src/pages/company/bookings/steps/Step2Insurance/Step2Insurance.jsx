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

    const guestName = updatedGuests.find(g => g.bookingGuestId === guestId)?.fullName || t('companyBookingWizard.insurance.guestFallback');
    showSuccess(
      t('companyBookingWizard.insurance.toasts.statusUpdated', {
        guestName
      })
    );
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
      showSuccess(t('companyBookingWizard.insurance.toasts.rejected'));
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

      showSuccess(t('companyBookingWizard.insurance.toasts.saved'));
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
            <h2 className={styles.title}>{t('companyBookingWizard.insurance.header.title')}</h2>
            <p className={styles.description}>
              {t('companyBookingWizard.insurance.header.description')}
            </p>
          </div>
          <span className={styles.stepBadge}>{t('companyBookingWizard.insurance.header.stepBadge')}</span>
        </div>
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabelRow}>
            <UsersRound className={styles.summaryIcon} strokeWidth={1.5} />
            <span className={styles.summaryLabel}>{t('companyBookingWizard.insurance.summary.totalGuests')}</span>
          </div>
          <span className={styles.summaryValue}>{guestsState.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabelRow}>
            <ShieldCheck className={`${styles.summaryIcon} ${styles.success}`} strokeWidth={1.5} />
            <span className={styles.summaryLabel}>{t('companyBookingWizard.insurance.summary.success')}</span>
          </div>
          <span className={styles.summaryValue}>
            {guestsState.filter(g => g.insuranceStatus === 'Success').length}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabelRow}>
            <AlertTriangle className={`${styles.summaryIcon} ${styles.failed}`} strokeWidth={1.5} />
            <span className={styles.summaryLabel}>{t('companyBookingWizard.insurance.summary.failed')}</span>
          </div>
          <span className={styles.summaryValue}>
            {guestsState.filter(g => g.insuranceStatus === 'Failed').length}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabelRow}>
            <ArrowRight className={styles.summaryIcon} strokeWidth={1.5} />
            <span className={styles.summaryLabel}>{t('companyBookingWizard.insurance.summary.pending')}</span>
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
          {t('companyBookingWizard.insurance.table.title')}
        </h3>
        {guestsState && guestsState.length > 0 ? (
          <div className={styles.guestsTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('companyBookingWizard.insurance.table.columns.index')}</th>
                  <th>{t('companyBookingWizard.insurance.table.columns.fullName')}</th>
                  <th>{t('companyBookingWizard.insurance.table.columns.birthDate')}</th>
                  <th>{t('companyBookingWizard.insurance.table.columns.idNumber')}</th>
                  <th>{t('companyBookingWizard.insurance.table.columns.insuranceStatus')}</th>
                  {!isReadOnly && <th>{t('companyBookingWizard.insurance.table.columns.actions')}</th>}
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
                              title={t('companyBookingWizard.insurance.actions.approveTooltip')}
                            >
                              <Check size={16} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => handleInsuranceStatusChange(guest.bookingGuestId, 'FAILED')}
                              className={`${styles.statusBtn} ${styles.failedBtn}`}
                              disabled={currentStatus === 'Failed' || loading.continue}
                              title={t('companyBookingWizard.insurance.actions.rejectTooltip')}
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
          <p className={styles.emptyMessage}>{t('companyBookingWizard.insurance.table.empty')}</p>
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
                {t('companyBookingWizard.insurance.actions.approveAll')}
              </button>
            )}
            <button
              onClick={handleReject}
              className={`${styles.actionButton} ${styles.btnDanger}`}
              disabled={loading.reject || booking.bookingStatus === 'BOOKING_REJECTED'}
            >
              <X size={18} />
              {loading.reject
                ? t('companyBookingWizard.insurance.actions.rejectProcessing')
                : t('companyBookingWizard.insurance.actions.rejectBooking')}
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
                ? t('companyBookingWizard.insurance.actions.alreadySaved')
                : loading.continue
                  ? t('companyBookingWizard.insurance.actions.continueProcessing')
                  : t('companyBookingWizard.insurance.actions.continue')}
            </button>
          </div>
        </div>
      )}

      {!allSuccess && guestsState.length > 0 && (
        <div className={styles.warning}>
          <AlertTriangle size={18} />
          <p>{t('companyBookingWizard.insurance.warning.allSuccessRequired')}</p>
        </div>
      )}

      {/* Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showConfirmModal}
        onClose={() => !loading.continue && setShowConfirmModal(false)}
        onConfirm={handleConfirmContinue}
        title={t('companyBookingWizard.insurance.confirmModal.title')}
        message={t('companyBookingWizard.insurance.confirmModal.message')}
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
          title={t('companyBookingWizard.insurance.rejectModal.title')}
          message={t('companyBookingWizard.insurance.rejectModal.message')}
        />
      )}
    </div>
  );
};

export default Step2Insurance;

