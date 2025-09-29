import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import styles from './VNPayReturnPage.module.css';

const VNPayReturnPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Parse URL parameters from VNPay return
    const urlParams = new URLSearchParams(location.search);
    const vnpResponseCode = urlParams.get('vnp_ResponseCode');
    const vnpTransactionStatus = urlParams.get('vnp_TransactionStatus');
    const vnpOrderInfo = urlParams.get('vnp_OrderInfo');
    const vnpAmount = urlParams.get('vnp_Amount');
    const vnpTransactionNo = urlParams.get('vnp_TransactionNo');
    const vnpTxnRef = urlParams.get('vnp_TxnRef');

    console.log('VNPay Return Page - URL params:', {
      vnpResponseCode,
      vnpTransactionStatus,
      vnpOrderInfo,
      vnpAmount,
      vnpTransactionNo,
      vnpTxnRef
    });

    // If we have VNPay parameters, process them directly
    if (vnpResponseCode !== null) {
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

      // Determine payment status
      if (vnpResponseCode === '00' && vnpTransactionStatus === '00') {
        // Payment successful
        if (premiumData) {
          showSuccess('Premium payment successful!');
          // Clear pending premium data
          sessionStorage.removeItem('pendingPremiumPayment');
          
          // Redirect to success page with premium data
          setTimeout(() => {
            navigate('/transaction-result', {
              state: {
                orderId: vnpTxnRef,
                paymentMethod: 'vnpay',
                responseCode: vnpResponseCode,
                paymentType: 'premium',
                premiumData: premiumData.premiumData,
                paymentInfo: {
                  orderInfo: vnpOrderInfo,
                  amount: vnpAmount,
                  transactionNo: vnpTransactionNo,
                  responseCode: vnpResponseCode
                }
              }
            });
          }, 2000);
        } else {
          showSuccess(t('payment.paymentSuccessRedirect'));
          // Clear pending booking data
          if (pendingBookingData) {
            sessionStorage.removeItem('pendingBooking');
          }
          
          // Redirect to success page after a short delay
          setTimeout(() => {
            navigate('/transaction-result', {
              state: {
                orderId: vnpTxnRef,
                paymentMethod: 'vnpay',
                responseCode: vnpResponseCode,
                paymentType: 'booking',
                bookingData: bookingData?.bookingData,
                tourId: bookingData?.tourId,
                paymentInfo: {
                  orderInfo: vnpOrderInfo,
                  amount: vnpAmount,
                  transactionNo: vnpTransactionNo,
                  responseCode: vnpResponseCode
                }
              }
            });
          }, 2000);
        }
      } else {
        // Payment failed or cancelled
        if (premiumData) {
          showError('Premium payment failed!');
          // Clear pending premium data
          sessionStorage.removeItem('pendingPremiumPayment');
          
          // Redirect to fail page with premium data
          setTimeout(() => {
            navigate('/transaction-result', {
              state: {
                orderId: vnpTxnRef,
                paymentMethod: 'vnpay',
                responseCode: vnpResponseCode,
                paymentType: 'premium',
                premiumData: premiumData.premiumData,
                paymentInfo: {
                  orderInfo: vnpOrderInfo,
                  amount: vnpAmount,
                  transactionNo: vnpTransactionNo,
                  responseCode: vnpResponseCode
                }
              }
            });
          }, 2000);
        } else {
          showError(t('payment.paymentFailedCancelled'));
          
          // Clear pending booking data
          if (pendingBookingData) {
            sessionStorage.removeItem('pendingBooking');
          }
          
          // Redirect to fail page after a short delay
          setTimeout(() => {
            navigate('/transaction-result', {
              state: {
                orderId: vnpTxnRef,
                paymentMethod: 'vnpay',
                responseCode: vnpResponseCode,
                paymentType: 'booking',
                bookingData: bookingData?.bookingData,
                tourId: bookingData?.tourId,
                paymentInfo: {
                  orderInfo: vnpOrderInfo,
                  amount: vnpAmount,
                  transactionNo: vnpTransactionNo,
                  responseCode: vnpResponseCode
                }
              }
            });
          }, 2000);
        }
      }
    } else {
      // No VNPay parameters, just show loading
      console.warn('No VNPay parameters found in URL');
      setProcessing(false);
    }
  }, [location.search, navigate, showSuccess, showError]);

  return (
    <div className={styles['vnpay-return-page']}>
      <div className={styles['return-container']}>
        <div className={styles['loading-spinner']}></div>
        <p>{t('payment.processing')}</p>
        {!processing && (
          <p className={styles['redirect-notice']}>
            {t('payment.noPaymentInfo')}{' '}
            <a href="/tour" className={styles['redirect-link']}>{t('payment.backToTour')}</a>.
          </p>
        )}
      </div>
    </div>
  );
};

export default VNPayReturnPage;