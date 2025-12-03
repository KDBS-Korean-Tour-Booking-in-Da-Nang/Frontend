import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { createVNPayPayment, createBooking } from '../../services/bookingAPI';
import { formatPrice } from '../../utils/priceRules';
import './VNPayPaymentPage.css';

const VNPayPaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(null);
  const [error, setError] = useState(null);
  const [tourInfo, setTourInfo] = useState(null);
  const [calculatingTotal, setCalculatingTotal] = useState(true);

  // Get booking data from location state
  const { bookingData, tourId } = location.state || {};

  const calculateTotalAmount = useCallback(async () => {
    if (!bookingData || !tourId) return;
    
    setCalculatingTotal(true);
    setError(null);
    
    try {
      // Fetch tour prices from API
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${API_BASE_URL}/api/tour/${tourId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tourData = await response.json();
      
      // Store tour info for display
      setTourInfo(tourData);
      
      // Calculate total from tour prices and guest counts
      const adultPrice = tourData.adultPrice || 0;
      const childPrice = tourData.childrenPrice || 0;
      const babyPrice = tourData.babyPrice || 0;
      
      const total = (bookingData.adultsCount * adultPrice) + 
                    (bookingData.childrenCount * childPrice) + 
                    (bookingData.babiesCount * babyPrice);
      
      console.log('Calculated total:', {
        adults: bookingData.adultsCount,
        children: bookingData.childrenCount,
        babies: bookingData.babiesCount,
        adultPrice,
        childPrice,
        babyPrice,
        total
      });
      
      setTotalAmount(total);
    } catch (error) {
      console.error('Error calculating total amount:', error);
      setError('Không thể tính tổng tiền. Vui lòng thử lại.');
    } finally {
      setCalculatingTotal(false);
    }
  }, [bookingData, tourId]);

  useEffect(() => {
    if (!bookingData || !user) {
      navigate('/tours');
      return;
    }

    // Validate that user email matches contact email
    if (user.email !== bookingData.contactEmail) {
      showError('Email người dùng không khớp với email trong thông tin liên hệ');
      navigate('/tours');
      return;
    }

    // Calculate total amount
    calculateTotalAmount();
  }, [bookingData, user, navigate, showError, calculateTotalAmount]);

  const handlePayment = async () => {
    if (!bookingData || !user) {
      showError('Thông tin thanh toán không hợp lệ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create booking in database
      console.log('Creating booking...', bookingData);
      const createdBookingResult = await createBooking(bookingData);
      console.log('Booking created:', createdBookingResult);
      
      // Store created booking for later use (in sessionStorage)
      
      // Step 2: Create VNPay payment
      const paymentRequest = {
        bookingId: createdBookingResult.bookingId,
        userEmail: user.email
      };

      console.log('Creating VNPay payment...', paymentRequest);
      const response = await createVNPayPayment(paymentRequest);
      
      if (response.success && response.payUrl) {
        // Store booking data in sessionStorage for return handling
        sessionStorage.setItem('pendingBooking', JSON.stringify({
          bookingData: createdBookingResult,
          tourId: tourId,
          paymentInfo: response
        }));
        
        // Redirect to VNPay payment page
        window.location.href = response.payUrl;
      } else {
        throw new Error('Không thể tạo liên kết thanh toán VNPay');
      }
    } catch (error) {
      console.error('Payment creation failed:', error);
      
      if (error.message === 'Unauthenticated') {
        showError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        navigate('/login');
        return;
      }
      
      setError(error.message || 'Có lỗi xảy ra khi tạo thanh toán');
      showError(`Lỗi thanh toán: ${error.message || 'Có lỗi xảy ra'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/tours');
  };

  if (!bookingData || !user) {
    return (
      <div className="vnpay-payment-page">
        <div className="payment-container">
          <div className="error-message">
            <h2>Không tìm thấy thông tin đặt tour</h2>
            <p>Vui lòng thực hiện đặt tour trước khi thanh toán.</p>
            <button 
              type="button"
              className="btn-primary"
              onClick={() => navigate('/tours')}
            >
              Quay lại danh sách tour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vnpay-payment-page">
      <div className="payment-container">
        <div className="payment-header">
          <h1>Thanh toán VNPay</h1>
          <p>Hoàn tất thanh toán để xác nhận đặt tour</p>
        </div>

        <div className="payment-content">
          {/* Booking Summary */}
          <div className="booking-summary">
            <h3>Thông tin đặt tour</h3>
            <div className="summary-details">
              <div className="summary-item">
                <span className="label">Tên tour:</span>
                <span className="value">{tourInfo?.tourName || 'Đang tải...'}</span>
              </div>
              <div className="summary-item">
                <span className="label">Ngày khởi hành:</span>
                <span className="value">{bookingData.departureDate}</span>
              </div>
              <div className="summary-item">
                <span className="label">Số khách:</span>
                <span className="value">{(bookingData.adultsCount || 0) + (bookingData.childrenCount || 0) + (bookingData.babiesCount || 0)} người</span>
              </div>
              <div className="summary-item">
                <span className="label">Người liên hệ:</span>
                <span className="value">{bookingData.contactName}</span>
              </div>
              <div className="summary-item">
                <span className="label">Email:</span>
                <span className="value">{bookingData.contactEmail}</span>
              </div>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="payment-amount">
            <h3>Tổng thanh toán</h3>
            <div className="amount-display">
              {(() => {
                if (calculatingTotal) {
                  return <span className="loading-amount">Đang tính toán...</span>;
                }
                if (totalAmount !== null) {
                  return <span className="total-amount">{formatPrice(totalAmount)}</span>;
                }
                if (error) {
                  return (
                    <div className="amount-error">
                      <span className="error-text">Không thể tính tổng tiền</span>
                      <button 
                        type="button"
                        className="retry-btn-small"
                        onClick={calculateTotalAmount}
                      >
                        Thử lại
                      </button>
                    </div>
                  );
                }
                return <span className="loading-amount">Đang tải...</span>;
              })()}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}

          {/* Payment Actions */}
          <div className="payment-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handlePayment}
              disabled={loading || calculatingTotal || totalAmount === null}
            >
              {loading ? (
                <>
                  <span className="loading-spinner-small"></span>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                'Thanh toán VNPay'
              )}
            </button>
          </div>

          {/* Payment Info */}
          <div className="payment-info">
            <h4>Thông tin thanh toán</h4>
            <ul>
              <li>Thanh toán được xử lý bởi VNPay - Cổng thanh toán điện tử uy tín</li>
              <li>Hỗ trợ thanh toán qua thẻ ATM, Internet Banking, Ví điện tử</li>
              <li>Thông tin thanh toán được mã hóa và bảo mật</li>
              <li>Sau khi thanh toán thành công, bạn sẽ nhận được email xác nhận</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VNPayPaymentPage;
