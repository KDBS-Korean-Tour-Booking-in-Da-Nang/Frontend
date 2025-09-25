import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import styles from './VNPayFailPage.module.css';

const VNPayFailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showError } = useToast();
  const [countdown, setCountdown] = useState(10);
  const [transactionData, setTransactionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastShown, setToastShown] = useState(false);

  useEffect(() => {
    // Check if we have data from location state (from VNPayReturnPage or TransactionResultPage)
    if (location.state) {
      console.log('VNPay Fail Page - Location state:', location.state);
      
      setTransactionData({
        orderId: location.state.orderId,
        paymentMethod: location.state.paymentMethod,
        responseCode: location.state.responseCode,
        bookingData: location.state.bookingData,
        tourId: location.state.tourId,
        paymentInfo: location.state.paymentInfo
      });

      // Show error message only once
      if (!toastShown) {
        showError(t('payment.paymentFailed'));
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

    console.log('VNPay Fail Page - URL params:', {
      orderId,
      paymentMethod,
      responseCode
    });

    // Get pending booking data from sessionStorage
    const pendingBookingData = sessionStorage.getItem('pendingBooking');
    let bookingData = null;
    
    if (pendingBookingData) {
      try {
        bookingData = JSON.parse(pendingBookingData);
        console.log('Pending booking data:', bookingData);
      } catch (error) {
        console.error('Error parsing pending booking data:', error);
      }
    }

    // Set transaction data
    setTransactionData({
      orderId,
      paymentMethod,
      responseCode,
      bookingData: bookingData?.bookingData,
      tourId: bookingData?.tourId,
      paymentInfo: bookingData?.paymentInfo
    });

    // Show error message only once
    if (!toastShown) {
      showError(t('payment.paymentFailed'));
      setToastShown(true);
    }
    
    setLoading(false);

    // Clear pending booking data
    if (pendingBookingData) {
      sessionStorage.removeItem('pendingBooking');
    }
  }, [location.search, location.state, showError, toastShown]);

  useEffect(() => {
    if (!loading) {
      // Countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Navigate to tour detail or home
            const tourId = transactionData?.tourId;
            if (tourId) {
              navigate(`/tour/${tourId}`);
            } else {
              navigate('/tour');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [loading, navigate, transactionData]);

  const handleRetryPayment = () => {
    const tourId = transactionData?.tourId;
    if (tourId) {
      navigate(`/tour/${tourId}/booking`);
    } else {
      navigate('/tour');
    }
  };

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

  const handleContactSupport = () => {
    // In a real app, this would open a contact form or redirect to support
    window.open('mailto:support@example.com?subject=VNPay Payment Error Support', '_blank');
  };

  const getErrorMessage = () => {
    if (!transactionData?.responseCode) {
      return t('payment.paymentCancelledFailed');
    }
    
    const responseCode = transactionData.responseCode;
    
    switch (responseCode) {
      case '07':
        return t('payment.paymentSuspicious');
      case '09':
        return t('payment.paymentNotRegistered');
      case '10':
        return t('payment.paymentVerificationFailed');
      case '11':
        return t('payment.paymentExpired');
      case '12':
        return t('payment.paymentCancelled');
      case '24':
        return t('payment.paymentUserCancelled');
      case '51':
        return t('payment.paymentInsufficientBalance');
      case '65':
        return t('payment.paymentExceedLimit');
      case '75':
        return t('payment.paymentBankMaintenance');
      case '79':
        return t('payment.paymentWrongPassword');
      default:
        return `${t('payment.paymentFailedWithCode')}: ${responseCode}`;
    }
  };

  const getErrorType = () => {
    if (!transactionData?.responseCode) return 'cancelled';
    
    const responseCode = transactionData.responseCode;
    
    if (responseCode === '24') return 'cancelled';
    if (responseCode === '12') return 'cancelled';
    if (responseCode === '51') return 'insufficient';
    if (responseCode === '75') return 'maintenance';
    if (responseCode === '79') return 'password';
    if (responseCode === '10') return 'verification';
    
    return 'general';
  };

  const getErrorIcon = () => {
    const errorType = getErrorType();
    
    switch (errorType) {
      case 'cancelled':
        return '🚫';
      case 'insufficient':
        return '💰';
      case 'maintenance':
        return '🔧';
      case 'password':
        return '🔐';
      case 'verification':
        return '❓';
      default:
        return '❌';
    }
  };

  const getErrorTitle = () => {
    const errorType = getErrorType();
    
    switch (errorType) {
      case 'cancelled':
        return t('payment.errorCancelled');
      case 'insufficient':
        return t('payment.errorInsufficientBalance');
      case 'maintenance':
        return t('payment.errorMaintenance');
      case 'password':
        return t('payment.errorWrongPassword');
      case 'verification':
        return t('payment.errorVerificationFailed');
      default:
        return t('payment.errorGeneral');
    }
  };

  const getErrorDescription = () => {
    const errorType = getErrorType();
    
    switch (errorType) {
      case 'cancelled':
        return t('payment.errorMessageCancelled');
      case 'insufficient':
        return t('payment.errorMessageInsufficient');
      case 'maintenance':
        return t('payment.errorMessageMaintenance');
      case 'password':
        return t('payment.errorMessagePassword');
      case 'verification':
        return t('payment.errorMessageVerification');
      default:
        return t('payment.errorMessageGeneral');
    }
  };

  const getErrorSuggestions = () => {
    const errorType = getErrorType();
    
    switch (errorType) {
      case 'cancelled':
        return [
          t('payment.suggestionRetryPayment'),
          t('payment.suggestionCheckCardInfo'),
          t('payment.suggestionContactBank')
        ];
      case 'insufficient':
        return [
          t('payment.suggestionAddMoney'),
          t('payment.suggestionUseOtherCard'),
          t('payment.suggestionCheckLimit')
        ];
      case 'maintenance':
        return [
          t('payment.suggestionRetryLater'),
          t('payment.suggestionUseOtherMethod'),
          t('payment.suggestionContactSupport')
        ];
      case 'password':
        return [
          t('payment.suggestionRetryAfter30min'),
          t('payment.suggestionResetPassword'),
          t('payment.suggestionUseOtherCardAccount')
        ];
      case 'verification':
        return [
          t('payment.suggestionCheckCardInfoAgain'),
          t('payment.suggestionEnsureCardActive'),
          t('payment.suggestionContactBankSupport')
        ];
      default:
        return [
          t('payment.suggestionRetryPayment'),
          t('payment.suggestionCheckInternet'),
          t('payment.suggestionContactSupportIfIssue')
        ];
    }
  };

  if (loading) {
    return (
      <div className={styles['vnpay-fail-page']}>
        <div className={styles['fail-container']}>
          <div className={styles['loading-spinner']}></div>
          <p>{t('payment.processing')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['vnpay-fail-page']}>
      <div className={styles['fail-container']}>
        {/* Error Icon */}
        <div className={styles['error-icon']}>
          <div className={styles['error-symbol']}>
            <span className={styles['error-emoji']}>{getErrorIcon()}</span>
          </div>
        </div>

        {/* Error Message */}
        <div className={styles['error-message']}>
          <h1>{getErrorTitle()}</h1>
          <p className={styles['error-subtitle']}>
            {getErrorDescription()}
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
                <span className={`${styles['info-value']} ${styles['error-code']}`}>{transactionData.responseCode}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Details */}
        <div className={styles["error-details"]}>
          <h3>{t('payment.errorDetails')}:</h3>
          <div className={styles["error-content"]}>
            <p className={styles["error-text"]}>{getErrorMessage()}</p>
          </div>
        </div>

        {/* Error Suggestions */}
        <div className={styles["error-suggestions"]}>
          <h3>{t('payment.suggestions')}:</h3>
          <ul className={styles["suggestions-list"]}>
            {getErrorSuggestions().map((suggestion, index) => (
              <li key={`suggestion-${index}-${suggestion.slice(0, 10)}`} className={styles["suggestion-item"]}>
                <span className={styles["suggestion-icon"]}>💡</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className={styles['action-buttons']}>
          <button 
            className={styles['btn-retry']}
            onClick={handleRetryPayment}
          >
            🔄 {t('payment.retryPayment')}
          </button>
          
          <button 
            className={styles['btn-secondary']}
            onClick={handleGoToTour}
          >
            {t('payment.viewTour')}
          </button>
          
          <button 
            className={styles['btn-tertiary']}
            onClick={handleGoHome}
          >
            {t('payment.goHome')}
          </button>
        </div>

        {/* Support Section */}
        <div className={styles['support-section']}>
          <div className={styles['support-card']}>
            <h4>🆘 {t('payment.needSupport')}?</h4>
            <p>{t('payment.contactUs')}:</p>
            <div className={styles['support-contacts']}>
              <button 
                className={styles['btn-support']}
                onClick={handleContactSupport}
              >
                📧 {t('payment.supportEmail')}
              </button>
              <a 
                href="tel:1900-xxxx" 
                className={styles['btn-support']}
              >
                📞 Hotline: 1900-xxxx
              </a>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className={styles["countdown"]}>
          <p>
            Tự động chuyển về trang tour trong <span className={styles["countdown-number"]}>{countdown}</span> giây
          </p>
        </div>

        {/* Technical Details (for debugging) */}
        {import.meta.env.DEV && transactionData && (
          <div className={styles["technical-details"]}>
            <details>
              <summary>{t('payment.technicalDetails')}</summary>
              <pre className={styles["error-stack"]}>
                {JSON.stringify(transactionData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default VNPayFailPage;
