import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import styles from './VNPaySuccessPage.module.css';

const VNPaySuccessPage = ({ paymentType }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [countdown, setCountdown] = useState(10);
  const [transactionData, setTransactionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastShown, setToastShown] = useState(false);


  useEffect(() => {
    // Check if we have data from location state (from VNPayReturnPage or TransactionResultPage)
    if (location.state) {
      const finalPaymentType = location.state.paymentType || paymentType;
      
      setTransactionData({
        orderId: location.state.orderId,
        paymentMethod: location.state.paymentMethod,
        responseCode: location.state.responseCode,
        paymentType: finalPaymentType,
        bookingData: location.state.bookingData,
        tourId: location.state.tourId,
        premiumData: location.state.premiumData,
        paymentInfo: location.state.paymentInfo
      });

      // Show success message only once
      if (!toastShown) {
        showSuccess(t('payment.paymentSuccess'));
        setToastShown(true);
      }
      
      setLoading(false);
      return;
    }

    // Fallback: Parse URL parameters from VNPay return
    const urlParams = new URLSearchParams(location.search);
    const orderId = urlParams.get('orderId');
    const paymentMethod = urlParams.get('paymentMethod');
    const responseCode = urlParams.get('responseCode');


    // Get pending booking or premium data from sessionStorage
    const pendingBookingData = sessionStorage.getItem('pendingBooking');
    const pendingPremiumData = sessionStorage.getItem('pendingPremiumPayment');
    let bookingData = null;
    let premiumData = null;
    
    if (pendingBookingData) {
      try {
        bookingData = JSON.parse(pendingBookingData);
      } catch (error) {
        console.error('Error parsing pending booking data:', error);
      }
    }
    
    if (pendingPremiumData) {
      try {
        premiumData = JSON.parse(pendingPremiumData);
      } catch (error) {
        console.error('Error parsing pending premium data:', error);
      }
    }

    // Set transaction data - prioritize paymentType from prop
    const detectedPaymentType = premiumData ? 'premium' : 'booking';
    const finalPaymentType = paymentType || detectedPaymentType;
    
    
    setTransactionData({
      orderId,
      paymentMethod,
      responseCode,
      paymentType: finalPaymentType,
      bookingData: bookingData?.bookingData,
      tourId: bookingData?.tourId,
      premiumData: premiumData?.premiumData,
      paymentInfo: bookingData?.paymentInfo || premiumData?.paymentInfo
    });

    // Show success message only once
    if (!toastShown) {
      showSuccess(t('payment.paymentSuccess'));
      setToastShown(true);
    }
    
    setLoading(false);

    // Clear pending data
    if (pendingBookingData) {
      sessionStorage.removeItem('pendingBooking');
    }
    if (pendingPremiumData) {
      sessionStorage.removeItem('pendingPremiumPayment');
    }
  }, [location.search, location.state, showSuccess, toastShown]);

  // useEffect(() => {
  //   if (!loading) {
  //     // Countdown timer
  //     const timer = setInterval(() => {
  //       setCountdown((prev) => {
  //         if (prev <= 1) {
  //           clearInterval(timer);
  //           return 0;
  //         }
  //         return prev - 1;
  //       });
  //     }, 1000);

  //     return () => clearInterval(timer);
  //   }
  // }, [loading]);

  // Separate effect for navigation when countdown reaches 0 
  // useEffect(() => {
  //   if (countdown === 0 && !loading) {
  //     const tourId = transactionData?.tourId;
  //     if (tourId) {
  //       navigate(`/tour/${tourId}`);
  //     } else {
  //       navigate('/tour');
  //     }
  //   }
  // }, [countdown, loading, navigate, transactionData]);

  const handleGoToTour = () => {
    const tourId = transactionData?.tourId;
    if (tourId) {
      navigate(`/tour/${tourId}`);
    } else {
      navigate('/tour');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleViewBooking = () => {
    // In a real app, this would navigate to a booking details page
    navigate('/profile');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles['vnpay-success-page']}>
        <div className={styles['success-container']}>
          <div className={styles['loading-spinner']}></div>
          <p>{t('payment.processing')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['vnpay-success-page']}>
      <div className={styles['success-container']}>
        {/* Success Icon */}
        <div className={styles['success-icon']}>
          <div className={styles['checkmark']}>
            <svg className={styles['checkmark-svg']} viewBox="0 0 52 52">
              <circle className={styles['checkmark-circle']} cx="26" cy="26" r="25" fill="none"/>
              <path className={styles['checkmark-check']} fill="none" d="m14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <div className={styles['success-message']}>
          <h1>🎉 {t('payment.paymentSuccessTitle')}</h1>
          <p className={styles['success-subtitle']}>
            {(() => {
              const message = transactionData?.paymentType === 'premium' 
                ? 'Cảm ơn bạn đã thanh toán. Gói Premium đã được kích hoạt thành công!'
                : t('payment.paymentSuccessMessage');
              return message;
            })()}
          </p>
        </div>

        {/* Transaction Details */}
        {transactionData && (
          <div className={styles['transaction-details']}>
            <h2>{t('payment.transactionInfo')}</h2>
            <div className={styles['transaction-info-grid']}>
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>{t('payment.transactionId')}:</span>
                <span className={`${styles['info-value']} ${styles['transaction-id']}`}>#{transactionData.orderId}</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>{t('payment.paymentMethod')}:</span>
                <span className={styles['info-value']}>{transactionData.paymentMethod?.toUpperCase() || 'VNPay'}</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>{t('payment.responseCode')}:</span>
                <span className={`${styles['info-value']} ${styles['success-code']}`}>{transactionData.responseCode}</span>
              </div>
            </div>
          </div>
        )}

        {/* Premium Details */}
        {transactionData?.paymentType === 'premium' && transactionData?.premiumData && (
          <div className={styles['premium-details']}>
            <h2>🌟 Thông tin gói Premium</h2>
            <div className={styles['premium-info-grid']}>
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>Gói Premium:</span>
                <span className={styles['info-value']}>{transactionData.premiumData.planName}</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>Số tiền thanh toán:</span>
                <span className={styles['info-value']}>{transactionData.premiumData.amount?.toLocaleString('vi-VN')} VND</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>Trạng thái:</span>
                <span className={`${styles['info-value']} ${styles['premium-status']}`}>Đã kích hoạt</span>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details */}
        {transactionData?.bookingData && (
          <div className={styles['booking-details']}>
            <h2>{t('payment.bookingInfo')}</h2>
            <div className={styles['booking-info-grid']}>
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>{t('payment.bookingId')}:</span>
                <span className={`${styles['info-value']} ${styles['booking-id']}`}>#{transactionData.bookingData.bookingId}</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>{t('payment.tourName')}:</span>
                <span className={styles['info-value']}>{transactionData.bookingData.tourName}</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>{t('payment.departureDate')}:</span>
                <span className={styles['info-value']}>{formatDate(transactionData.bookingData.departureDate)}</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>{t('payment.totalGuests')}:</span>
                <span className={styles['info-value']}>{transactionData.bookingData.totalGuests} {t('payment.guests')}</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>{t('payment.contactPerson')}:</span>
                <span className={styles['info-value']}>{transactionData.bookingData.contactName}</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>{t('payment.phoneNumber')}:</span>
                <span className={styles['info-value']}>{transactionData.bookingData.contactPhone}</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>Email:</span>
                <span className={styles['info-value']}>{transactionData.bookingData.contactEmail}</span>
              </div>
              
              <div className={styles['info-item']}>
                <span className={styles['info-label']}>{t('payment.bookingTime')}:</span>
                <span className={styles['info-value']}>{formatDateTime(transactionData.bookingData.createdAt)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Guest List */}
        {transactionData?.bookingData?.bookingGuestRequests && transactionData.bookingData.bookingGuestRequests.length > 0 && (
          <div className={styles['guests-section']}>
            <h3>{t('payment.guestList')}</h3>
            <div className={styles['guests-table']}>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>{t('payment.fullName')}</th>
                    <th>{t('payment.birthDate')}</th>
                    <th>{t('payment.gender')}</th>
                    <th>{t('payment.nationality')}</th>
                    <th>{t('payment.guestType')}</th>
                    <th>{t('payment.idPassport')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionData.bookingData.bookingGuestRequests.map((guest, index) => (
                    <tr key={`guest-${guest.fullName}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{guest.fullName}</td>
                      <td>{formatDate(guest.birthDate)}</td>
                      <td>
                        {(() => {
                          if (guest.gender === 'MALE') return t('payment.male');
                          if (guest.gender === 'FEMALE') return t('payment.female');
                          return t('payment.other');
                        })()}
                      </td>
                      <td>{guest.nationality}</td>
                      <td>
                        {(() => {
                          if (guest.bookingGuestType === 'ADULT') return t('payment.adult');
                          if (guest.bookingGuestType === 'CHILD') return t('payment.child');
                          return t('payment.baby');
                        })()}
                      </td>
                      <td>{guest.idNumber || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles['action-buttons']}>
          {transactionData?.paymentType === 'premium' ? (
            // Premium payment buttons
            <>
              <button 
                className={styles['btn-primary']}
                onClick={handleGoHome}
              >
                Về trang chủ
              </button>
              
              <button 
                className={styles['btn-secondary']}
                onClick={() => navigate('/profile')}
              >
                Xem tài khoản Premium
              </button>
            </>
          ) : (
            // Booking payment buttons
            <>
              <button 
                className={styles['btn-primary']}
                onClick={handleViewBooking}
              >
                Xem đặt tour của tôi
              </button>
              
              <button 
                className={styles['btn-secondary']}
                onClick={handleGoToTour}
              >
                Xem chi tiết tour
              </button>
              
              <button 
                className={styles['btn-tertiary']}
                onClick={handleGoHome}
              >
                Về trang chủ
              </button>
            </>
          )}
        </div>

        {/* Countdown */}
        {/* <div className={styles['countdown']}>
          <p>
            Tự động chuyển về trang tour trong <span className={styles["countdown-number"]}>{countdown}</span> giây
          </p>
        </div> */}

        {/* Additional Info */}
        <div className={styles['additional-info']}>
          <div className={styles['info-card']}>
            <h4>📧 {t('payment.confirmationEmail')}</h4>
            <p>{t('payment.emailSent')}</p>
          </div>
          
          <div className={styles['info-card']}>
            <h4>📞 {t('payment.customerSupport')}</h4>
            <p>{t('payment.contactHotline')}: <strong>1900-xxxx</strong></p>
          </div>
          
          <div className={styles['info-card']}>
            <h4>💳 {t('payment.paymentInfo')}</h4>
            <p>{t('payment.transactionProcessed')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VNPaySuccessPage;
