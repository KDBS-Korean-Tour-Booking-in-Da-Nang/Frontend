import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import './VNPaySuccessPage.css';

const VNPaySuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [countdown, setCountdown] = useState(5);
  const [transactionData, setTransactionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we have data from location state (from VNPayReturnPage or TransactionResultPage)
    if (location.state) {
      console.log('VNPay Success Page - Location state:', location.state);
      
      setTransactionData({
        orderId: location.state.orderId,
        paymentMethod: location.state.paymentMethod,
        responseCode: location.state.responseCode,
        bookingData: location.state.bookingData,
        tourId: location.state.tourId,
        paymentInfo: location.state.paymentInfo
      });

      // Show success message
      showSuccess('Thanh toán thành công! Đặt tour hoàn tất.');
      
      setLoading(false);
      return;
    }

    // Fallback: Parse URL parameters from VNPay return
    const urlParams = new URLSearchParams(location.search);
    const orderId = urlParams.get('orderId');
    const paymentMethod = urlParams.get('paymentMethod');
    const responseCode = urlParams.get('responseCode');

    console.log('VNPay Success Page - URL params:', {
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

    // Show success message
    showSuccess('Thanh toán thành công! Đặt tour hoàn tất.');
    
    setLoading(false);

    // Clear pending booking data
    if (pendingBookingData) {
      sessionStorage.removeItem('pendingBooking');
    }
  }, [location.search, location.state, showSuccess]);

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
      <div className="vnpay-success-page">
        <div className="success-container">
          <div className="loading-spinner"></div>
          <p>Đang xử lý kết quả thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vnpay-success-page">
      <div className="success-container">
        {/* Success Icon */}
        <div className="success-icon">
          <div className="checkmark">
            <div className="checkmark-circle">
              <div className="checkmark-stem"></div>
              <div className="checkmark-kick"></div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="success-message">
          <h1>🎉 Thanh toán thành công!</h1>
          <p className="success-subtitle">
            Cảm ơn bạn đã thanh toán. Đặt tour đã được hoàn tất thành công.
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
                <span className="info-value success-code">{transactionData.responseCode}</span>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details */}
        {transactionData?.bookingData && (
          <div className="booking-details">
            <h2>Thông tin đặt tour</h2>
            <div className="booking-info-grid">
              <div className="info-item">
                <span className="info-label">Mã đặt tour:</span>
                <span className="info-value booking-id">#{transactionData.bookingData.bookingId}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Tên tour:</span>
                <span className="info-value">{transactionData.bookingData.tourName}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Ngày khởi hành:</span>
                <span className="info-value">{formatDate(transactionData.bookingData.departureDate)}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Tổng số khách:</span>
                <span className="info-value">{transactionData.bookingData.totalGuests} người</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Người liên hệ:</span>
                <span className="info-value">{transactionData.bookingData.contactName}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Số điện thoại:</span>
                <span className="info-value">{transactionData.bookingData.contactPhone}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{transactionData.bookingData.contactEmail}</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">Thời gian đặt:</span>
                <span className="info-value">{formatDateTime(transactionData.bookingData.createdAt)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Guest List */}
        {transactionData?.bookingData?.guests && transactionData.bookingData.guests.length > 0 && (
          <div className="guests-section">
            <h3>Danh sách khách</h3>
            <div className="guests-table">
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ và tên</th>
                    <th>Ngày sinh</th>
                    <th>Giới tính</th>
                    <th>Quốc tịch</th>
                    <th>Loại khách</th>
                    <th>Số ID/Passport</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionData.bookingData.guests.map((guest, index) => (
                    <tr key={`guest-${guest.fullName}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{guest.fullName}</td>
                      <td>{formatDate(guest.birthDate)}</td>
                      <td>
                        {(() => {
                          if (guest.gender === 'MALE') return 'Nam';
                          if (guest.gender === 'FEMALE') return 'Nữ';
                          return 'Khác';
                        })()}
                      </td>
                      <td>{guest.nationality}</td>
                      <td>
                        {(() => {
                          if (guest.guestType === 'ADULT') return 'Người lớn';
                          if (guest.guestType === 'CHILD') return 'Trẻ em';
                          return 'Em bé';
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
        <div className="action-buttons">
          <button 
            className="btn-primary"
            onClick={handleViewBooking}
          >
            Xem đặt tour của tôi
          </button>
          
          <button 
            className="btn-secondary"
            onClick={handleGoToTour}
          >
            Xem chi tiết tour
          </button>
          
          <button 
            className="btn-tertiary"
            onClick={handleGoHome}
          >
            Về trang chủ
          </button>
        </div>

        {/* Countdown */}
        <div className="countdown">
          <p>
            Tự động chuyển về trang tour trong <span className="countdown-number">{countdown}</span> giây
          </p>
        </div>

        {/* Additional Info */}
        <div className="additional-info">
          <div className="info-card">
            <h4>📧 Email xác nhận</h4>
            <p>Chúng tôi đã gửi email xác nhận thanh toán và đặt tour đến địa chỉ email của bạn.</p>
          </div>
          
          <div className="info-card">
            <h4>📞 Hỗ trợ khách hàng</h4>
            <p>Nếu có thắc mắc, vui lòng liên hệ hotline: <strong>1900-xxxx</strong></p>
          </div>
          
          <div className="info-card">
            <h4>💳 Thông tin thanh toán</h4>
            <p>Giao dịch đã được xử lý thành công qua VNPay. Bạn có thể kiểm tra lịch sử giao dịch trong tài khoản.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VNPaySuccessPage;
