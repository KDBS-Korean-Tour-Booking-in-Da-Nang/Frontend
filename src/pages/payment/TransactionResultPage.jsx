import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VNPaySuccessPage from './VNPaySuccessPage';
import VNPayFailPage from './VNPayFailPage';

const TransactionResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    // Check if we have data from location state (from VNPayReturnPage)
    if (location.state) {
      console.log('Transaction Result Page - Location state:', location.state);
      
      const { responseCode } = location.state;
      
      // Determine payment status based on response code
      if (responseCode === '00') {
        setPaymentStatus('success');
      } else {
        setPaymentStatus('failed');
      }
      
      setLoading(false);
      return;
    }

    // Fallback: Parse URL parameters from backend redirect
    const urlParams = new URLSearchParams(location.search);
    const orderId = urlParams.get('orderId');
    const paymentMethod = urlParams.get('paymentMethod');
    const responseCode = urlParams.get('responseCode');

    console.log('Transaction Result Page - URL params:', {
      orderId,
      paymentMethod,
      responseCode
    });

    // Determine payment status based on response code
    if (responseCode === '00') {
      // Payment successful
      setPaymentStatus('success');
    } else {
      // Payment failed or cancelled
      setPaymentStatus('failed');
    }

    setLoading(false);
  }, [location.search, location.state]);

  if (loading) {
    return (
      <div className="transaction-result-page">
        <div className="result-container">
          <div className="loading-spinner"></div>
          <p>Đang xử lý kết quả thanh toán...</p>
        </div>
      </div>
    );
  }

  // Render appropriate page based on payment status
  if (paymentStatus === 'success') {
    return <VNPaySuccessPage />;
  } else if (paymentStatus === 'failed') {
    return <VNPayFailPage />;
  }

  // Fallback - should not reach here
  return (
    <div className="transaction-result-page">
      <div className="result-container">
        <div className="error-icon">❓</div>
        <h1>Không xác định được kết quả</h1>
        <p>Không thể xác định kết quả thanh toán. Vui lòng thử lại.</p>
        <button 
          className="btn-primary"
          onClick={() => navigate('/tour')}
        >
          Về trang tour
        </button>
      </div>
    </div>
  );
};

export default TransactionResultPage;
