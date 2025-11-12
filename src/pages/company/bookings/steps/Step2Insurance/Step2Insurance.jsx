import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../../contexts/ToastContext';
import { changeBookingGuestInsuranceStatus, changeBookingStatus } from '../../../../../services/bookingAPI';
import styles from './Step2Insurance.module.css';

const Step2Insurance = ({ booking, guests, onBookingUpdate, onGuestsUpdate, onNext, onBack }) => {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState({});
  const [guestsState, setGuestsState] = useState(guests || []);

  useEffect(() => {
    setGuestsState(guests || []);
  }, [guests]);

  const handleInsuranceStatusChange = async (guestId, status) => {
    try {
      setLoading(prev => ({ ...prev, [guestId]: true }));
      // Change insurance status - BE uses 'Success' and 'Failed' (not 'SUCCESS'/'FAILED')
      const statusValue = status === 'SUCCESS' ? 'Success' : status === 'FAILED' ? 'Failed' : status;
      const updatedGuest = await changeBookingGuestInsuranceStatus(guestId, statusValue);
      
      // Update local state
      const updatedGuests = guestsState.map(g => 
        g.bookingGuestId === guestId 
          ? { ...g, insuranceStatus: statusValue }
          : g
      );
      setGuestsState(updatedGuests);
      onGuestsUpdate(updatedGuests);
      
      showSuccess(`Đã cập nhật trạng thái bảo hiểm cho ${updatedGuest.fullName || 'khách'}`);
    } catch (error) {
      console.error('Error changing insurance status:', error);
      showError(error.message || 'Không thể cập nhật trạng thái bảo hiểm');
    } finally {
      setLoading(prev => ({ ...prev, [guestId]: false }));
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn từ chối booking này?')) {
      return;
    }
    try {
      setLoading({ reject: true });
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

  const handleApproveAll = async () => {
    if (!window.confirm('Bạn có muốn duyệt tất cả bảo hiểm là SUCCESS?')) {
      return;
    }
    try {
      setLoading({ approveAll: true });
      
      // Update all guests to Success
      const updatePromises = guestsState.map(guest =>
        changeBookingGuestInsuranceStatus(guest.bookingGuestId, 'Success')
      );
      
      await Promise.all(updatePromises);
      
      const updatedGuests = guestsState.map(g => ({ ...g, insuranceStatus: 'Success' }));
      setGuestsState(updatedGuests);
      onGuestsUpdate(updatedGuests);
      
      showSuccess('Đã duyệt tất cả bảo hiểm');
    } catch (error) {
      console.error('Error approving all insurance:', error);
      showError(error.message || 'Không thể duyệt tất cả bảo hiểm');
    } finally {
      setLoading(prev => ({ ...prev, approveAll: false }));
    }
  };

  const handleContinue = async () => {
    // Check if all guests have Success insurance
    const allSuccess = guestsState.length > 0 && 
      guestsState.every(g => g.insuranceStatus === 'Success');
    
    if (!allSuccess) {
      showError('Tất cả khách phải có trạng thái bảo hiểm là SUCCESS để tiếp tục');
      return;
    }

    try {
      setLoading({ continue: true });
      // Change booking status to BOOKING_SUCCESS
      const updatedBooking = await changeBookingStatus(booking.bookingId, 'BOOKING_SUCCESS');
      onBookingUpdate(updatedBooking);
      showSuccess('Đã xác nhận booking thành công');
      onNext();
    } catch (error) {
      console.error('Error confirming booking:', error);
      showError(error.message || 'Không thể xác nhận booking');
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
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {guestsState.map((guest, index) => {
                  const currentStatus = guest.insuranceStatus || 'Pending';
                  const isLoading = loading[guest.bookingGuestId];
                  
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
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => handleInsuranceStatusChange(guest.bookingGuestId, 'SUCCESS')}
                            className={`${styles.statusBtn} ${styles.successBtn}`}
                            disabled={isLoading || currentStatus === 'Success'}
                            title="Duyệt bảo hiểm"
                          >
                            {isLoading ? '...' : '✓'}
                          </button>
                          <button
                            onClick={() => handleInsuranceStatusChange(guest.bookingGuestId, 'FAILED')}
                            className={`${styles.statusBtn} ${styles.failedBtn}`}
                            disabled={isLoading || currentStatus === 'Failed'}
                            title="Từ chối bảo hiểm"
                          >
                            {isLoading ? '...' : '✕'}
                          </button>
                        </div>
                      </td>
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

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.actionGroup}>
          {hasPending && (
            <button
              onClick={handleApproveAll}
              className={styles.btnWarning}
              disabled={loading.approveAll || loading.reject || loading.continue}
            >
              {loading.approveAll ? 'Đang xử lý...' : 'Duyệt tất cả'}
            </button>
          )}
          <button
            onClick={handleReject}
            className={styles.btnDanger}
            disabled={loading.reject || loading.continue || booking.bookingStatus === 'BOOKING_REJECTED'}
          >
            {loading.reject ? 'Đang xử lý...' : 'Từ chối booking'}
          </button>
          <button
            onClick={handleContinue}
            className={styles.btnPrimary}
            disabled={!allSuccess || loading.continue || loading.reject || booking.bookingStatus === 'BOOKING_SUCCESS'}
          >
            {loading.continue ? 'Đang xử lý...' : 'Xác nhận và tiếp tục'}
          </button>
        </div>
      </div>

      {!allSuccess && guestsState.length > 0 && (
        <div className={styles.warning}>
          <p>⚠️ Tất cả khách phải có trạng thái bảo hiểm là SUCCESS để tiếp tục.</p>
        </div>
      )}
    </div>
  );
};

export default Step2Insurance;

