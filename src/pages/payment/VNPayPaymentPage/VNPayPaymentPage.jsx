import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { createVNPayPayment, createBooking } from '../../../services/bookingAPI';
import { formatPrice } from '../../../utils/priceRules';
import { API_ENDPOINTS, createAuthHeaders } from '../../../config/api';
import styles from './VNPayPaymentPage.module.css';

const VNPayPaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const { showError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(null);
  const [error, setError] = useState(null);
  const [tourInfo, setTourInfo] = useState(null);
  const [calculatingTotal, setCalculatingTotal] = useState(true);

  // Get booking data or premium data from location state
  const { bookingData, tourId, premiumData } = location.state || {};

  const calculateTotalAmount = useCallback(async () => {
    // Handle premium payment
    if (premiumData) {
      setCalculatingTotal(true);
      setError(null);
      setTotalAmount(premiumData.amount);
      setCalculatingTotal(false);
      return;
    }
    
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
  }, [bookingData, tourId, premiumData]);

  useEffect(() => {
    // Handle premium payment
    if (premiumData) {
      if (!user) {
        navigate('/login');
        return;
      }
      calculateTotalAmount();
      return;
    }

    // Handle booking payment
    if (!bookingData || !user) {
      navigate('/tours');
      return;
    }

    // Validate that user email matches contact email
    if (user.email !== bookingData.contactEmail) {
      showError(t('payment.emailMismatch'));
      navigate('/tours');
      return;
    }

    // Calculate total amount
    calculateTotalAmount();
  }, [bookingData, premiumData, user, navigate, showError, calculateTotalAmount]);

  const handlePayment = async () => {
    if ((!bookingData && !premiumData) || !user) {
      showError(t('payment.invalidPaymentInfo'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      
      if (premiumData) {
        // Handle premium payment - already has VNPay URL from PremiumModal
        console.log('Processing premium VNPay payment...', premiumData);
        console.log('Premium data keys:', Object.keys(premiumData));
        console.log('Premium payUrl:', premiumData.payUrl);
        
        // Try different possible field names for payUrl
        const payUrl = premiumData.payUrl || premiumData.pay_url || premiumData.paymentUrl || premiumData.payment_url;
        
        if (payUrl) {
          // Store premium data in sessionStorage for return handling
          sessionStorage.setItem('pendingPremiumPayment', JSON.stringify({
            premiumData: premiumData,
            paymentInfo: {
              success: true,
              payUrl: payUrl
            }
          }));
          
          // Redirect to VNPay payment page immediately
          window.location.href = payUrl;
        } else {
          console.error('Premium data received:', premiumData);
          console.error('This suggests PremiumModal did not receive payUrl from backend or navigation failed');
          
          // Fallback: Try to call premium payment API directly from VNPayPaymentPage
          console.log('Attempting to call premium payment API directly...');
          
          const token = getToken();
          if (!token) {
            throw new Error('No authentication token found');
          }
          
          // We need to get the premium plan info somehow
          // For now, let's try to extract from premiumData or use defaults
          const duration = premiumData.duration || 1; // Default to 1 month if not specified
          
          const requestBody = {
            durationInMonths: duration,
            userEmail: user.email
          };
          
          console.log('Fallback request body:', requestBody);
          
          const fallbackResponse = await fetch(API_ENDPOINTS.PREMIUM_PAYMENT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log('Fallback response:', fallbackData);
            
            if (fallbackData.payUrl) {
              sessionStorage.setItem('pendingPremiumPayment', JSON.stringify({
                premiumData: premiumData,
                paymentInfo: {
                  success: true,
                  payUrl: fallbackData.payUrl
                }
              }));
              
              window.location.href = fallbackData.payUrl;
              return;
            }
          }
          
          throw new Error('VNPay payment URL not found in premium data. Available fields: ' + Object.keys(premiumData).join(', '));
        }
      } else {
        // Handle booking payment
        console.log('Creating booking...', bookingData);
        const createdBookingResult = await createBooking(bookingData);
        console.log('Booking created:', createdBookingResult);
        
        // Step 2: Create VNPay payment
        const paymentRequest = {
          bookingId: createdBookingResult.bookingId,
          userEmail: user.email
        };

        console.log('Creating VNPay payment...', paymentRequest);
        response = await createVNPayPayment(paymentRequest);
        
        if (response.success && response.payUrl) {
          // Store booking data in sessionStorage for return handling
          sessionStorage.setItem('pendingBooking', JSON.stringify({
            bookingData: createdBookingResult,
            tourId: tourId,
            paymentInfo: response
          }));
          
          // Redirect to VNPay payment page immediately
          window.location.href = response.payUrl;
        } else {
          throw new Error(t('payment.cannotCreatePaymentLink'));
        }
      }
    } catch (error) {
      console.error('Payment creation failed:', error);
      
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

  const handleCancel = () => {
    // Clear any pending data
    sessionStorage.removeItem('pendingBooking');
    sessionStorage.removeItem('pendingPremiumPayment');
    
    if (premiumData) {
      // Navigate back to home for premium payment
      navigate('/');
    } else {
      // Navigate back to Step 3 of BookingWizard
      navigate(`/tour/${tourId}/booking`, { 
        state: { 
          returnFromPayment: true,
          message: t('payment.bookingCancelled'),
          type: 'info'
        }
      });
    }
  };

  if ((!bookingData && !premiumData) || !user) {
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
          <h1>{premiumData ? 'Premium Payment' : t('payment.vnpayTitle')}</h1>
          <p>{t('payment.completePaymentToConfirm')}</p>
        </div>

        <div className={styles['payment-content']}>
          {/* Premium Summary or Booking Summary */}
          {premiumData ? (
            <div className={styles['booking-summary']}>
              <h3>Premium Subscription</h3>
              <div className={styles['summary-details']}>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>Plan:</span>
                  <span className={styles['value']}>{premiumData.planName}</span>
                </div>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>Order ID:</span>
                  <span className={styles['value']}>{premiumData.orderId}</span>
                </div>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>User:</span>
                  <span className={styles['value']}>{user.email}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles['booking-summary']}>
              <h3>{t('payment.bookingInfo')}</h3>
              <div className={styles['summary-details']}>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>{t('payment.tourName')}:</span>
                  <span className={styles['value']}>{tourInfo?.tourName || t('payment.loading')}</span>
                </div>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>{t('payment.departureDate')}:</span>
                  <span className={styles['value']}>{bookingData.departureDate}</span>
                </div>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>{t('payment.guestCount')}:</span>
                  <span className={styles['value']}>{(bookingData.adultsCount || 0) + (bookingData.childrenCount || 0) + (bookingData.babiesCount || 0)} {t('payment.guests')}</span>
                </div>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>{t('payment.contactPerson')}:</span>
                  <span className={styles['value']}>{bookingData.contactName}</span>
                </div>
                <div className={styles['summary-item']}>
                  <span className={styles['label']}>Email:</span>
                  <span className={styles['value']}>{bookingData.contactEmail}</span>
                </div>
              </div>
            </div>
          )}

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
              disabled={loading || calculatingTotal || totalAmount === null}
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
