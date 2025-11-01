import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VNPaySuccessPage from '../VNPaySuccessPage/VNPaySuccessPage';
import VNPayFailPage from '../VNPayFailPage/VNPayFailPage';
import styles from './TransactionResultPage.module.css';

const TransactionResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentType, setPaymentType] = useState(null);

  useEffect(() => {
    // Check if we have data from location state (from VNPayReturnPage)
    if (location.state) {
      
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


    // Check sessionStorage to determine payment type
    const pendingBookingData = sessionStorage.getItem('pendingBooking');
    const pendingPremiumData = sessionStorage.getItem('pendingPremiumPayment');
    
    // Determine payment type
    let paymentType = 'booking'; // default
    if (pendingPremiumData) {
      paymentType = 'premium';
    } else if (pendingBookingData) {
      paymentType = 'booking';
    }


    // Determine payment status based on response code
    if (responseCode === '00') {
      // Payment successful
      setPaymentStatus('success');
    } else {
      // Payment failed or cancelled
      setPaymentStatus('failed');
    }

    // Store payment type in component state for passing to child components
    setPaymentType(paymentType);

    setLoading(false);
  }, [location.search, location.state]);

  if (loading) {
    return (
      <div className={styles['transaction-result-page']}>
        <div className={styles['result-container']}>
          <div className={styles['loading-spinner']}></div>
          <p>{t('payment.processing')}</p>
        </div>
      </div>
    );
  }

  // Render appropriate page based on payment status
  if (paymentStatus === 'success') {
    const finalPaymentType = location.state?.paymentType || paymentType;
    return <VNPaySuccessPage paymentType={finalPaymentType} />;
  } else if (paymentStatus === 'failed') {
    const finalPaymentType = location.state?.paymentType || paymentType;
    return <VNPayFailPage paymentType={finalPaymentType} />;
  }

  // Fallback - should not reach here
  return (
    <div className={styles['transaction-result-page']}>
      <div className={styles['result-container']}>
        <div className={styles['error-icon']}>❓</div>
        <h1>{t('payment.unknownResult')}</h1>
        <p>{t('payment.cannotDetermine')}</p>
        <button 
          className={styles['btn-primary']}
          onClick={() => navigate('/tour')}
        >
          {t('payment.backToTour')}
        </button>
      </div>
    </div>
  );
};

export default TransactionResultPage;
