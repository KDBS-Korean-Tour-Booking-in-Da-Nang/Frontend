import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import './VNPayReturnPage.css';

const VNPayReturnPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
      // Get pending booking data from sessionStorage
      const pendingBookingData = sessionStorage.getItem('pendingBooking');
      let bookingData = null;
      
      if (pendingBookingData) {
        try {
          bookingData = JSON.parse(pendingBookingData);
        } catch (error) {
          console.error('Error parsing pending booking data:', error);
        }
      }

      // Determine payment status
      if (vnpResponseCode === '00' && vnpTransactionStatus === '00') {
        // Payment successful
        showSuccess('Thanh toán thành công! Đang chuyển hướng...');
        
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
      } else {
        // Payment failed or cancelled
        showError('Thanh toán thất bại hoặc đã bị hủy');
        
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
      // No VNPay parameters, just show loading
      console.warn('No VNPay parameters found in URL');
      setProcessing(false);
    }
  }, [location.search, navigate, showSuccess, showError]);

  return (
    <div className="vnpay-return-page">
      <div className="return-container">
        <div className="loading-spinner"></div>
        <p>Đang xử lý kết quả thanh toán...</p>
        {!processing && (
          <p className="redirect-notice">
            Không tìm thấy thông tin thanh toán. Vui lòng{' '}
            <a href="/tour" className="redirect-link">quay lại trang tour</a>.
          </p>
        )}
      </div>
    </div>
  );
};

export default VNPayReturnPage;