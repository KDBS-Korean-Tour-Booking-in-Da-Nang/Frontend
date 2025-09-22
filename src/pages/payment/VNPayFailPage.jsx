import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import './VNPayFailPage.css';

const VNPayFailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [countdown, setCountdown] = useState(10);
  const [transactionData, setTransactionData] = useState(null);
  const [loading, setLoading] = useState(true);

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

      // Show error message
      showError('Thanh toán thất bại. Vui lòng thử lại.');
      
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

    // Show error message
    showError('Thanh toán thất bại. Vui lòng thử lại.');
    
    setLoading(false);

    // Clear pending booking data
    if (pendingBookingData) {
      sessionStorage.removeItem('pendingBooking');
    }
  }, [location.search, location.state, showError]);

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
      return 'Thanh toán đã bị hủy hoặc thất bại';
    }
    
    const responseCode = transactionData.responseCode;
    
    switch (responseCode) {
      case '07':
        return 'Trừ tiền thành công, giao dịch bị nghi ngờ (liên quan đến lừa đảo, giao dịch bất thường)';
      case '09':
        return 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking';
      case '10':
        return 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần';
      case '11':
        return 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch';
      case '12':
        return 'Giao dịch bị hủy';
      case '24':
        return 'Khách hàng hủy giao dịch';
      case '51':
        return 'Tài khoản không đủ số dư để thực hiện giao dịch';
      case '65':
        return 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày';
      case '75':
        return 'Ngân hàng thanh toán đang bảo trì';
      case '79':
        return 'Nhập sai mật khẩu thanh toán quá số lần quy định';
      default:
        return `Thanh toán thất bại với mã lỗi: ${responseCode}`;
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
        return 'Thanh toán đã bị hủy';
      case 'insufficient':
        return 'Số dư không đủ';
      case 'maintenance':
        return 'Hệ thống đang bảo trì';
      case 'password':
        return 'Sai mật khẩu';
      case 'verification':
        return 'Xác thực thất bại';
      default:
        return 'Thanh toán thất bại';
    }
  };

  const getErrorDescription = () => {
    const errorType = getErrorType();
    
    switch (errorType) {
      case 'cancelled':
        return 'Bạn đã hủy giao dịch hoặc giao dịch đã bị hủy. Vui lòng thử lại nếu muốn tiếp tục đặt tour.';
      case 'insufficient':
        return 'Tài khoản của bạn không đủ số dư để thực hiện giao dịch. Vui lòng nạp thêm tiền và thử lại.';
      case 'maintenance':
        return 'Hệ thống ngân hàng đang bảo trì. Vui lòng thử lại sau ít phút.';
      case 'password':
        return 'Bạn đã nhập sai mật khẩu quá số lần cho phép. Vui lòng thử lại sau hoặc liên hệ ngân hàng.';
      case 'verification':
        return 'Thông tin xác thực không chính xác. Vui lòng kiểm tra lại thông tin thẻ/tài khoản.';
      default:
        return 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ.';
    }
  };

  const getErrorSuggestions = () => {
    const errorType = getErrorType();
    
    switch (errorType) {
      case 'cancelled':
        return [
          'Thử lại thanh toán',
          'Kiểm tra thông tin thẻ/tài khoản',
          'Liên hệ ngân hàng nếu cần thiết'
        ];
      case 'insufficient':
        return [
          'Nạp thêm tiền vào tài khoản',
          'Sử dụng thẻ/tài khoản khác',
          'Kiểm tra hạn mức giao dịch'
        ];
      case 'maintenance':
        return [
          'Thử lại sau 15-30 phút',
          'Sử dụng phương thức thanh toán khác',
          'Liên hệ hỗ trợ nếu cần thiết'
        ];
      case 'password':
        return [
          'Thử lại sau 30 phút',
          'Liên hệ ngân hàng để reset mật khẩu',
          'Sử dụng thẻ/tài khoản khác'
        ];
      case 'verification':
        return [
          'Kiểm tra lại thông tin thẻ',
          'Đảm bảo thẻ đã được kích hoạt',
          'Liên hệ ngân hàng để được hỗ trợ'
        ];
      default:
        return [
          'Thử lại thanh toán',
          'Kiểm tra kết nối internet',
          'Liên hệ hỗ trợ nếu vấn đề vẫn tiếp diễn'
        ];
    }
  };

  if (loading) {
    return (
      <div className="vnpay-fail-page">
        <div className="fail-container">
          <div className="loading-spinner"></div>
          <p>Đang xử lý kết quả thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vnpay-fail-page">
      <div className="fail-container">
        {/* Error Icon */}
        <div className="error-icon">
          <div className="error-symbol">
            <span className="error-emoji">{getErrorIcon()}</span>
          </div>
        </div>

        {/* Error Message */}
        <div className="error-message">
          <h1>{getErrorTitle()}</h1>
          <p className="error-subtitle">
            {getErrorDescription()}
          </p>
        </div>

        {/* Transaction Details */}
        {transactionData && (
          <div className="transaction-details">
            <h2>Thông tin giao dịch</h2>
            <div className="transaction-info-grid">
              <div className="info-item">
                <span className="info-label">Mã giao dịch:</span>
                <span className="info-value transaction-id">#{transactionData.orderId}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Phương thức thanh toán:</span>
                <span className="info-value">{transactionData.paymentMethod?.toUpperCase() || 'VNPay'}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Mã phản hồi:</span>
                <span className="info-value error-code">{transactionData.responseCode}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Details */}
        <div className="error-details">
          <h3>Chi tiết lỗi:</h3>
          <div className="error-content">
            <p className="error-text">{getErrorMessage()}</p>
          </div>
        </div>

        {/* Error Suggestions */}
        <div className="error-suggestions">
          <h3>Gợi ý khắc phục:</h3>
          <ul className="suggestions-list">
            {getErrorSuggestions().map((suggestion, index) => (
              <li key={`suggestion-${index}-${suggestion.slice(0, 10)}`} className="suggestion-item">
                <span className="suggestion-icon">💡</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="btn-retry"
            onClick={handleRetryPayment}
          >
            🔄 Thử lại thanh toán
          </button>
          
          <button 
            className="btn-secondary"
            onClick={handleGoToTour}
          >
            Xem tour
          </button>
          
          <button 
            className="btn-tertiary"
            onClick={handleGoHome}
          >
            Về trang chủ
          </button>
        </div>

        {/* Support Section */}
        <div className="support-section">
          <div className="support-card">
            <h4>🆘 Cần hỗ trợ?</h4>
            <p>Nếu vấn đề vẫn tiếp diễn, vui lòng liên hệ với chúng tôi:</p>
            <div className="support-contacts">
              <button 
                className="btn-support"
                onClick={handleContactSupport}
              >
                📧 Email hỗ trợ
              </button>
              <a 
                href="tel:1900-xxxx" 
                className="btn-support"
              >
                📞 Hotline: 1900-xxxx
              </a>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="countdown">
          <p>
            Tự động chuyển về trang tour trong <span className="countdown-number">{countdown}</span> giây
          </p>
        </div>

        {/* Technical Details (for debugging) */}
        {import.meta.env.DEV && transactionData && (
          <div className="technical-details">
            <details>
              <summary>Chi tiết kỹ thuật (Development)</summary>
              <pre className="error-stack">
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
