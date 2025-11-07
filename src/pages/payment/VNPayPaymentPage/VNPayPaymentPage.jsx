import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { createVNPayPayment, createBooking, cancelBooking, getBookingTotal, getBookingDetails } from '../../../services/bookingAPI';
import { formatPrice } from '../../../utils/priceRules';
import { createAuthHeaders } from '../../../config/api';
import styles from './VNPayPaymentPage.module.css';

const VNPayPaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, getToken, loading: authLoading } = useAuth();
  const { showError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(null);
  const [error, setError] = useState(null);
  const [tourInfo, setTourInfo] = useState(null);
  const [calculatingTotal, setCalculatingTotal] = useState(true);
  const [timeoutId, setTimeoutId] = useState(null);

  // Get booking data from location state
  const { bookingData, tourId, bookingId: existingBookingId } = location.state || {};

  const [createdBooking, setCreatedBooking] = useState(null);
  const hasAttemptedCreationRef = useRef(false);
  const [reconstructedBookingData, setReconstructedBookingData] = useState(null);

  const calculateTotalAmount = useCallback(async () => {
    // Handle booking payment
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
      setError(t('payment.cannotCalculateTotal'));
    } finally {
      setCalculatingTotal(false);
    }
  }, [bookingData, tourId]);

  // Timeout handling for VNPay transactions
  useEffect(() => {
    // Wait for auth state to resolve to avoid false redirects when user is still loading
    if (authLoading) return;
    const setupTimeout = () => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Set 12-minute timeout (VNPay typically allows 15 minutes)
      const timeout = setTimeout(() => {
        console.log('VNPay transaction timeout - user may have left during payment');
        // Don't automatically cancel here, let user manually cancel or resume
        showError(t('payment.transactionTimeout') || 'Giao dịch đã hết hạn. Vui lòng thử lại hoặc hủy đặt tour.');
      }, 12 * 60 * 1000); // 12 minutes
      
      setTimeoutId(timeout);
    };

    // Only set timeout if we have a booking
    if (createdBooking?.bookingId || existingBookingId) {
      setupTimeout();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [createdBooking?.bookingId, existingBookingId]); // Removed timeoutId, showError, t from dependencies

  useEffect(() => {
    // If navigating with existing bookingId (resume payment), load booking details
    if (existingBookingId && user) {
      // Load booking details to restore form data
      (async () => {
        try {
          setCalculatingTotal(true);
          const bookingDetails = await getBookingDetails(existingBookingId);
          
          // Set created booking state
          setCreatedBooking(bookingDetails);
          // ----------- add: reconstruct booking data -----------
          const newReconstruct = {
            tourId: bookingDetails.tourId,
            contactName: bookingDetails.contactName,
            contactEmail: bookingDetails.contactEmail,
            contactPhone: bookingDetails.contactPhone,
            contactAddress: bookingDetails.contactAddress,
            pickupPoint: bookingDetails.pickupPoint || '',
            note: bookingDetails.note || '',
            departureDate: bookingDetails.departureDate,
            adultsCount: bookingDetails.adultsCount,
            childrenCount: bookingDetails.childrenCount,
            babiesCount: bookingDetails.babiesCount,
            userEmail: user.email,
            bookingStatus: 'PENDING'
          };
          setReconstructedBookingData(newReconstruct);
          // Store in sessionStorage for fallback restoring (optional)
          sessionStorage.setItem('pendingBooking', JSON.stringify({
            bookingData: bookingDetails,
            tourId: bookingDetails.tourId,
            reconstructedBookingData: newReconstruct
          }));
          // --- BỔ SUNG KIỂM TRA TRẠNG THÁI ĐƠN ---
          const bookingStatus = String(bookingDetails?.bookingStatus || bookingDetails?.status || '').toUpperCase();
          if (bookingStatus === 'CANCELLED' || bookingStatus === 'CANCELED' || (bookingStatus && bookingStatus !== 'PENDING')) {
            showError('Đơn đã bị hủy hoặc không thể tiếp tục thanh toán. Vui lòng chọn đơn khác.');
            navigate('/user/booking-history');
            return;
          }
          // --- END PATCH ---
          // Get total amount
          const totalResp = await getBookingTotal(existingBookingId);
          if (typeof totalResp?.totalAmount === 'number') {
            setTotalAmount(totalResp.totalAmount);
          }
          
          // Store booking data for display (reconstruct from booking details)
          const reconstructedBookingData = {
            tourId: bookingDetails.tourId,
            contactName: bookingDetails.contactName,
            contactEmail: bookingDetails.contactEmail,
            contactPhone: bookingDetails.contactPhone,
            contactAddress: bookingDetails.contactAddress,
            pickupPoint: bookingDetails.pickupPoint || '',
            note: bookingDetails.note || '',
            departureDate: bookingDetails.departureDate,
            adultsCount: bookingDetails.adultsCount,
            childrenCount: bookingDetails.childrenCount,
            babiesCount: bookingDetails.babiesCount,
            userEmail: user.email,
            bookingStatus: 'PENDING'
          };
          
          // Store in sessionStorage for consistency
          sessionStorage.setItem('pendingBooking', JSON.stringify({
            bookingData: bookingDetails,
            tourId: bookingDetails.tourId,
            reconstructedBookingData: reconstructedBookingData
          }));
          
        } catch (e) {
          console.error('Failed to load booking details:', e?.message);
          if (e?.message === 'Unauthenticated') {
            // Redirect to login and preserve intent to resume payment
            navigate('/login', {
              state: {
                redirectTo: '/payment/vnpay',
                resume: { bookingId: existingBookingId, tourId }
              }
            });
            return;
          }
          showError('Không thể tải thông tin đặt tour. Vui lòng thử lại.');
          navigate('/user/booking-history');
        } finally {
          setCalculatingTotal(false);
        }
      })();
    }

    // Handle booking payment: allow resume via existingBookingId without bookingData
    if ((!bookingData && !existingBookingId) || !user) {
      navigate('/tour');
      return;
    }

    // Allow contact email to differ from account email (no blocking)

    // Create booking immediately on page load if not resuming
    const createBookingOnMount = async () => {
      try {
        // If coming from history with existing booking, skip
        if (existingBookingId) return;

        // Prevent duplicate creation in React StrictMode or re-renders
        if (hasAttemptedCreationRef.current) return;
        hasAttemptedCreationRef.current = true;

        // --- PATCH: Validate departure date is in the future ---
        if (bookingData?.departureDate) {
          const parts = String(bookingData.departureDate).split('-');
          let dep;
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1; // 0-based
            const d = parseInt(parts[2], 10);
            dep = new Date(y, m, d, 0, 0, 0, 0);
          } else {
            dep = new Date(bookingData.departureDate);
          }
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (isNaN(dep.getTime()) || dep.getTime() <= today.getTime()) {
            showError('Ngày khởi hành không hợp lệ. Vui lòng chọn ngày trong tương lai.');
            navigate(`/tour/${tourId}`);
            return;
          }
        }
        // --- END PATCH ---

        // Ensure bookingData has userEmail and bookingStatus
        const bookingDataWithUser = {
          ...bookingData,
          userEmail: user.email,
          bookingStatus: 'PENDING'
        };

        const created = await createBooking(bookingDataWithUser);
        setCreatedBooking(created);
        // Store for return handling
        sessionStorage.setItem('pendingBooking', JSON.stringify({
          bookingData: created,
          tourId: tourId
        }));
      } catch (err) {
        console.error('Failed to create booking on VNPay page:', err);
        showError(t('payment.paymentCreationError'));
        navigate('/tours');
        return;
      } finally {
        // Calculate total amount after booking created
        if (bookingData && tourId) {
    calculateTotalAmount();
        } else if (!existingBookingId) {
          try {
            setCalculatingTotal(true);
            const pending = sessionStorage.getItem('pendingBooking');
            const parsed = pending ? JSON.parse(pending) : null;
            const bId = parsed?.bookingData?.bookingId;
            if (bId) {
              const totalResp = await getBookingTotal(bId);
              if (typeof totalResp?.totalAmount === 'number') {
                setTotalAmount(totalResp.totalAmount);
              }
            }
          } catch (_) {}
          setCalculatingTotal(false);
        }
      }
    };

    createBookingOnMount();
  }, [bookingData, user, navigate, showError, calculateTotalAmount, authLoading]);

  const handlePayment = async () => {
    // --- PATCH: always use the most reliable data ---
    const useBookingData = bookingData || reconstructedBookingData;
    if ((!useBookingData && !createdBooking && !existingBookingId) || !user) {
      showError(t('payment.invalidPaymentInfo'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      {
        const bookingIdToPay = createdBooking?.bookingId || existingBookingId;
        if (!bookingIdToPay) {
          throw new Error('Missing bookingId to create payment');
        }

        const paymentRequest = {
          bookingId: bookingIdToPay,
          userEmail: user.email // user.email always present if logged in
          // (add more info if needed by BE in future, for now keep as is)
        };

        console.log('Creating VNPay payment...', paymentRequest);
        response = await createVNPayPayment(paymentRequest);
        // Nếu gọi thành công, làm như cũ
        if (response.success && response.payUrl) {
          // Store booking data in sessionStorage for return handling
          const stored = createdBooking || { bookingId: bookingIdToPay };
          sessionStorage.setItem('pendingBooking', JSON.stringify({
            bookingData: stored,
            tourId: tourId,
            paymentInfo: response,
            timestamp: Date.now() // Store timestamp for timeout handling
          }));
          
          // Clear timeout since we're redirecting to VNPay
          if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
          }
          
          // Redirect to VNPay payment page immediately
          window.location.href = response.payUrl;
        } else {
          // Nếu trả về lỗi nhưng vẫn có payUrl (BE cho dùng lại link cũ)
          if (response.payUrl) {
            window.location.href = response.payUrl;
            return;
          }
          throw new Error(t('payment.cannotCreatePaymentLink'));
        }
      }
    } catch (error) {
      console.error('Payment creation failed:', error);
      // --- PATCH: Hiển thị lỗi user-friendly nếu BE trả về lỗi liên quan trạng thái / bị hủy ---
      const errMsg = (error?.message || '').toLowerCase();
      if (errMsg.includes('cancel') || errMsg.includes('hủy') || errMsg.includes('invalid payment')) {
        showError('Đơn đã bị hủy hoặc không thể tiếp tục thanh toán. Vui lòng chọn đơn khác.');
        setLoading(false);
        // Optional: Không chuyển trang ở đây để user đọc lỗi. Có thể chuyển sau vài giây nếu muốn.
        return;
      }
      // --- END PATCH ---
      if (error.message === 'Unauthenticated') {
        showError(t('payment.sessionExpired'));
        navigate('/login');
        return;
      }
      setError(error.message || t('payment.paymentCreationError'));
      showError(`${t('payment.paymentError')}: ${error.message || t('payment.errorOccurred')}`);
      setLoading(false); // Reset loading state on error
    }
    // Note: Don't set loading to false on success - we're redirecting immediately
  };

  const handleCancel = async () => {
    try {
      const bookingIdToCancel = createdBooking?.bookingId || existingBookingId;
      if (!premiumData && bookingIdToCancel) {
        await cancelBooking(bookingIdToCancel).catch((e) => {
          console.warn('Cancel booking request failed, continue to history anyway:', e?.message);
        });
      }
    } finally {
      // Clear any pending data and timeout
    sessionStorage.removeItem('pendingBooking');
    sessionStorage.removeItem('pendingPremiumPayment');
      try {
        if (tourId) {
          localStorage.removeItem(`bookingData_${tourId}`);
          localStorage.removeItem(`hasConfirmedLeave_${tourId}`);
        }
      } catch (_) {}
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    
      {
        navigate('/user/booking-history');
      }
    }
  };

  // While auth is loading, show a lightweight loading state instead of error/redirect
  if (authLoading) {
    return (
      <div className={styles['vnpay-payment-page']}>
        <div className={styles['payment-container']}>
          <div className={styles['payment-header']}>
            <h1>{t('payment.vnpayTitle')}</h1>
            <p>{t('payment.loading')}</p>
          </div>
          <div className={styles['payment-content']}>
            <div className={styles['loading-spinner']}></div>
          </div>
        </div>
      </div>
    );
  }

  if ((!bookingData && !existingBookingId) || !user) {
    return (
      <div className={styles['vnpay-payment-page']}>
        <div className={styles['payment-container']}>
          <div className={styles['error-message']}>
            <h2>{t('payment.noPaymentInfo')}</h2>
            <p>{t('payment.pleaseTryAgain')}</p>
            <button 
              type="button"
              className={styles['btn-primary']}
              onClick={() => navigate('/')}
            >
              Quay về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['vnpay-payment-page']}>
      <div className={styles['payment-container']}>
        <div className={styles['payment-header']}>
          <h1>{t('payment.vnpayTitle')}</h1>
          <p>{t('payment.completePaymentToConfirm')}</p>
        </div>

        <div className={styles['payment-content']}>
          {/* Booking Summary */}
          (
            <div className={styles['booking-summary']}>
              <h3>{t('payment.bookingInfo')}</h3>
              <div className={styles['summary-details']}>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>{t('payment.tourName')}:</span>
                   <span className={styles['value']}>{createdBooking?.tourName || tourInfo?.tourName || t('payment.loading')}</span>
                </div>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>{t('payment.departureDate')}:</span>
                   <span className={styles['value']}>{createdBooking?.departureDate || bookingData?.departureDate}</span>
                </div>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>{t('payment.guestCount')}:</span>
                   <span className={styles['value']}>
                     {(createdBooking?.adultsCount || bookingData?.adultsCount || 0) + 
                      (createdBooking?.childrenCount || bookingData?.childrenCount || 0) + 
                      (createdBooking?.babiesCount || bookingData?.babiesCount || 0)} {t('payment.guests')}
                   </span>
                </div>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>{t('payment.contactPerson')}:</span>
                   <span className={styles['value']}>{createdBooking?.contactName || bookingData?.contactName}</span>
                </div>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>Email:</span>
                   <span className={styles['value']}>{createdBooking?.contactEmail || bookingData?.contactEmail}</span>
                </div>
              </div>
            </div>
          )

          {/* Payment Amount */}
          <div className={styles['payment-amount']}>
            <h3>{t('payment.totalPayment')}</h3>
            <div className={styles['amount-display']}>
              {(() => {
                if (calculatingTotal) {
                  return <span className={styles['loading-amount']}>{t('payment.calculating')}</span>;
                }
                if (totalAmount !== null) {
                  return <span className={styles['total-amount']}>{formatPrice(totalAmount)}</span>;
                }
                if (error) {
                  return (
                    <div className={styles['amount-error']}>
                      <span className={styles['error-text']}>{t('payment.cannotCalculateTotal')}</span>
                      <button 
                        type="button"
                        className={styles['retry-btn-small']}
                        onClick={calculateTotalAmount}
                      >
                        {t('payment.retry')}
                      </button>
                    </div>
                  );
                }
                return <span className={styles['loading-amount']}>{t('payment.loading')}</span>;
              })()}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles['error-message']}>
              <span className={styles['error-icon']}>⚠️</span>
              <span className={styles['error-text']}>{error}</span>
            </div>
          )}

          {/* Payment Actions */}
          <div className={styles['payment-actions']}>
            {(() => {
              const statusUpper = String(createdBooking?.bookingStatus || '').toUpperCase();
              const isPayable = !statusUpper || statusUpper === 'PENDING';
              return (
                <>
                  <button
                    type="button"
                    className={styles['btn-secondary']}
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    {t('payment.cancel')}
                  </button>
                  <button
                    type="button"
                    className={styles['btn-primary']}
                    onClick={handlePayment}
                    disabled={loading || calculatingTotal || totalAmount === null || !isPayable}
                  >
                    {loading ? (
                      <>
                        <span className={styles['loading-spinner-small']}></span>
                        <span>{t('payment.processing')}</span>
                      </>
                    ) : (
                      t('payment.vnpayPayment')
                    )}
                  </button>
                </>
              );
            })()}
          </div>

          {/* Payment Info */}
          <div className={styles['payment-info']}>
            <h4>{t('payment.paymentInfo')}</h4>
            <ul>
              <li>{t('payment.vnpayDescription')}</li>
              <li>{t('payment.supportedPaymentMethods')}</li>
              <li>{t('payment.securePayment')}</li>
              <li>{t('payment.confirmationEmail')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VNPayPaymentPage;
