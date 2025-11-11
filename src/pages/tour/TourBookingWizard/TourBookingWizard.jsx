import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { TourBookingProvider, useBooking } from '../../../contexts/TourBookingContext';
import { formatBookingData, validateBookingData } from '../../../utils/bookingFormatter';
import { useBookingAPI } from '../../../hooks/useBookingAPI';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useBookingStepValidation } from '../../../hooks/useBookingStepValidation';
import { useTranslation } from 'react-i18next';
import ConfirmLeaveModal from '../../../components/modals/ConfirmLeaveModal/ConfirmLeaveModal';
import Step2InfoModal from '../../../components/modals/Step2InfoModal/Step2InfoModal';
import Step1Contact from './steps/Step1Contact/Step1Contact';
import Step2Details from './steps/Step2Details/Step2Details';
import Step3Review from './steps/Step3Review/Step3Review';
import styles from './TourBookingWizard.module.css';

const STEPS = [
  { id: 1, titleKey: 'bookingWizard.steps.step1.title', descKey: 'bookingWizard.steps.step1.description' },
  { id: 2, titleKey: 'bookingWizard.steps.step2.title', descKey: 'bookingWizard.steps.step2.description' },
  { id: 3, titleKey: 'bookingWizard.steps.step3.title', descKey: 'bookingWizard.steps.step3.description' }
];

// Inner component that uses the booking context
const BookingWizardContent = () => {
  const { id: tourId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { showError, showBatch, showSuccess } = useToast();
  const { user, loading: authLoading } = useAuth();
  const showErrorRef = useRef(showError);
  const {
    resetBooking,
    contact,
    plan,
    booking,
    setContact,
    setDate,
    setPax,
    setMember,
    rebuildMembers,
    recalcTotal,
    setBookingLoading,
    setBookingError,
    setBookingSuccess,
    clearBookingStatus
  } = useBooking();
  const { createBookingAPI } = useBookingAPI();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showStep2InfoModal, setShowStep2InfoModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [hasConfirmedLeave, setHasConfirmedLeave] = useState(false);
  
  // Update ref when showError changes
  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);
  
  // Removed VNPay return handling effect
  
  // Auto-save booking data when contact or plan changes
  useEffect(() => {
    // Only save if we have meaningful data (not initial empty state)
    if (contact && (contact.fullName || contact.phone || contact.email) && 
        plan && (plan.date || plan.pax)) {
      try {
        const bookingData = {
          contact,
          plan,
          timestamp: Date.now(),
          tourId: tourId
        };
          localStorage.setItem(`bookingData_${tourId}`, JSON.stringify(bookingData));
      } catch (error) {
        console.error('Error auto-saving booking data:', error);
      }
    }
  }, [contact, plan, tourId]);
  
  // Simple beforeunload handler like TourWizard
  useEffect(() => {
    const hasData = contact && (contact.fullName || contact.phone || contact.email) && 
                   plan && (plan.date || plan.pax);

    const handler = (e) => {
      if (!hasData) return;
      e.preventDefault();
      e.returnValue = '';
      try {
        // Mark as confirmed leave so next mount clears data
        localStorage.setItem(`hasConfirmedLeave_${tourId}`, 'true');
      } catch (_) {}
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [contact, plan, tourId]);

  // Intercept clicks on navigation links like TourWizard
  useEffect(() => {
    const hasData = contact && (contact.fullName || contact.phone || contact.email) && 
                   plan && (plan.date || plan.pax);
    
    const onClick = (ev) => {
      if (!hasData) return; // allow normal nav if not dirty
      const anchor = ev.target.closest('a');
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.origin);
      const isSameOrigin = url.origin === window.location.origin;
      if (isSameOrigin && url.pathname !== window.location.pathname && 
          !url.pathname.includes('/tour/') && !url.pathname.includes('/payment/')) {
        ev.preventDefault();
        setShowLeaveModal(true);
        setPendingNavigation(url.pathname + url.search + url.hash);
      }
    };
    
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [contact, plan]);
  
  
  // Use custom hook for step validation
  const { getStepErrors, isStepCompleted, stepValidations } = useBookingStepValidation({ contact, plan, user });

  // Authentication and role guard
  useEffect(() => {
    if (!authLoading && !user) {
      // Store current URL to return after login
      localStorage.setItem('returnAfterLogin', window.location.pathname);
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Block COMPANY role from booking
  useEffect(() => {
    if (!authLoading && user && user.role === 'COMPANY') {
      showErrorRef.current('Tài khoản doanh nghiệp không thể đặt tour.');
    }
  }, [authLoading, user]);

  // Reset booking when component mounts or tourId changes
  useEffect(() => {
    if (user) {
      // Check if user has confirmed to leave before
      const hasConfirmedLeaveFlag = localStorage.getItem(`hasConfirmedLeave_${tourId}`);
      if (hasConfirmedLeaveFlag === 'true') {
        resetBooking();
        return;
      }
      
      // Try to restore existing booking data from localStorage
      try {
        const savedBookingData = localStorage.getItem(`bookingData_${tourId}`);
        if (savedBookingData) {
          const parsedData = JSON.parse(savedBookingData);
        
          // Restore contact data
          if (parsedData.contact) {
            setContact(parsedData.contact);
          }
          
          // Restore plan data
          if (parsedData.plan) {
            // Restore date
            if (parsedData.plan.date) {
              setDate(parsedData.plan.date);
            }
            
            // Restore pax BEFORE members so arrays are rebuilt to correct sizes
            if (parsedData.plan.pax) {
              setPax(parsedData.plan.pax);
            }

            // Restore members
            if (parsedData.plan.members) {
              // Restore adult members
              if (parsedData.plan.members.adult) {
                parsedData.plan.members.adult.forEach((member, index) => {
                  setMember('adult', index, member);
                });
              }
              
              // Restore child members
              if (parsedData.plan.members.child) {
                parsedData.plan.members.child.forEach((member, index) => {
                  setMember('child', index, member);
                });
              }
              
              // Restore infant members
              if (parsedData.plan.members.infant) {
                parsedData.plan.members.infant.forEach((member, index) => {
                  setMember('infant', index, member);
                });
              }
            }
          }
        } else {
          // No saved data, reset to initial state
          resetBooking();
        }
      } catch (error) {
        console.error('Error restoring booking data:', error);
        resetBooking();
      }
    }
  }, [tourId, resetBooking, user, setContact, setDate, setMember]);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      // Check if current step is valid using stepValidations
      const currentStepKey = `step${currentStep}`;
      const isCurrentStepValid = stepValidations[currentStepKey]?.isValid;
      
      if (!isCurrentStepValid) {
        // Get validation errors for current step
        const errors = getStepErrors(currentStep);
        
        if (errors.length > 0) {
          const messages = errors.map(errorKey => {
            // Check if it's a toast message key (contains 'toast')
            if (errorKey.includes('toast')) {
              return { i18nKey: errorKey };
            } else {
              // It's a field name, use the required toast format
              const fieldName = t(errorKey);
              return { i18nKey: 'toast.required', values: { field: fieldName } };
            }
          });
          
          // Queue this batch; if another click happens, the next batch will wait until this one is done
          showBatch(messages, 'error', 5000);
        }
      } else {
        // Special handling when moving from step 1 to step 2
        if (currentStep === 1) {
          // Reset members array and ensure we have 1 empty adult passenger
          // Clear all existing members first
          if (plan.members.adult.length > 0) {
            // Clear all adult members
            for (let i = plan.members.adult.length - 1; i >= 0; i--) {
              setMember('adult', i, {
                fullName: '',
                dob: '',
                gender: '',
                nationality: '',
                idNumber: ''
              });
            }
          }
          
          // Ensure we have exactly 1 adult passenger
          if (plan.pax.adult < 1) {
            setPax({ ...plan.pax, adult: 1 });
          }
          
          // Rebuild members to ensure we have 1 empty adult
          setTimeout(() => {
            rebuildMembers();
          }, 0);
          
          // Show info modal
          setShowStep2InfoModal(true);
        } else {
          // For other steps, save and move forward normally
          // Save booking data to localStorage before moving to next step
          try {
            const bookingData = {
              contact,
              plan,
              timestamp: Date.now(),
              tourId: tourId
            };
            localStorage.setItem(`bookingData_${tourId}`, JSON.stringify(bookingData));
          } catch (error) {
            console.error('Error saving booking data:', error);
          }
          
          setCurrentStep(currentStep + 1);
        }
      }
    }
  };

  const handleStep2InfoModalClose = () => {
    setShowStep2InfoModal(false);
    // Save booking data to localStorage after modal closes
    try {
      const bookingData = {
        contact,
        plan,
        timestamp: Date.now(),
        tourId: tourId
      };
      localStorage.setItem(`bookingData_${tourId}`, JSON.stringify(bookingData));
    } catch (error) {
      console.error('Error saving booking data:', error);
    }
    // Move to step 2
    setCurrentStep(2);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirm = async () => {
    const currentLanguage = (i18n && i18n.language) ? i18n.language : 'vi';

    let bookingData;
    try {
      bookingData = formatBookingData({ contact, plan }, tourId, currentLanguage, user.email);
    } catch (error) {
      console.error('[Booking] Failed to format booking data', error);
      showError(error?.message || 'Không thể chuẩn bị dữ liệu đặt tour. Vui lòng kiểm tra lại thông tin.');
      return;
    }

    const validation = validateBookingData(bookingData);
    if (!validation.isValid) {
      showError(`Dữ liệu không hợp lệ: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      const finalBookingData = {
        contact,
        plan,
        timestamp: Date.now(),
        tourId
      };
      localStorage.setItem(`bookingData_${tourId}`, JSON.stringify(finalBookingData));
    } catch (error) {
      console.error('Error saving final booking data:', error);
    }

    clearBookingStatus();
    setBookingLoading(true);

    try {
      const createdBooking = await createBookingAPI(bookingData);
      setBookingSuccess(createdBooking);

      try {
        localStorage.removeItem(`bookingData_${tourId}`);
        localStorage.removeItem(`hasConfirmedLeave_${tourId}`);
      } catch (_) {}

      resetBooking();

      showSuccess('Đặt tour thành công. Vui lòng tiến hành thanh toán để hoàn tất.');

      navigate(`/booking/${createdBooking.bookingId}/payment`, {
        state: {
          bookingId: createdBooking.bookingId,
          userEmail: createdBooking.contactEmail || bookingData.userEmail
        }
      });
    } catch (error) {
      console.error('[Booking] Create booking failed', error);
      const message = error?.message || 'Không thể tạo booking. Vui lòng thử lại sau.';
      setBookingError(message);
      showError(message);
      if (message === 'Unauthenticated') {
        navigate('/login');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const isStepCompletedByValidation = (stepId) => {
    return isStepCompleted(stepId);
  };

  const handleStepClick = (stepId) => {
    // Only allow clicking on completed steps or current step
    if (isStepCompletedByValidation(stepId) || stepId === currentStep) {
      setCurrentStep(stepId);
    }
  };

  // Handle navigation with confirm leave modal
  const handleNavigation = (path) => {
    // Check if user has entered any data
    const hasData = contact && (contact.fullName || contact.phone || contact.email) && 
                   plan && (plan.date || plan.pax);
    
    if (hasData) {
      // Show confirm leave modal
      
      setPendingNavigation(path);
      setShowLeaveModal(true);
    } else {
      // No data, navigate directly
      navigate(path);
    }
  };

  // Handle confirm leave modal actions - simple like TourWizard
  const handleConfirmLeave = () => {
    // Allow closing tab without prompt
    window.removeEventListener('beforeunload', () => {});
    setShowLeaveModal(false);
    
    // Clear booking data when user confirms to leave
    try {
      localStorage.removeItem(`bookingData_${tourId}`);
      localStorage.setItem(`hasConfirmedLeave_${tourId}`, 'true');
    } catch (error) {
      console.error('Error clearing booking data:', error);
    }
    
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveModal(false);
    setPendingNavigation(null);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Contact />;
      case 2:
        return <Step2Details />;
      case 3:
        return <Step3Review />;
      default:
        return null;
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className={styles['wizard-fullscreen-bg']}>
        <div className={styles['tour-booking-wizard']}>
          <div className={styles['step-content']}>
            <div className={styles['loading-container']}>
              <div className={styles['loading-spinner']}></div>
              <p>Đang kiểm tra xác thực...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login required message if not authenticated
  if (!user) {
    return (
      <div className={styles['wizard-fullscreen-bg']}>
        <div className={styles['tour-booking-wizard']}>
          <div className={styles['step-content']}>
            <div className={styles['auth-required']}>
              <h2>🔒 {t('bookingWizard.auth.loginRequiredTitle')}</h2>
              <p>{t('bookingWizard.auth.loginRequiredMessage')}</p>
              <button 
                type="button"
                className={styles['btn-primary']}
                onClick={() => navigate('/login')}
              >
                {t('bookingWizard.auth.loginButton')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If COMPANY user, show blocked message and no wizard actions
  if (user && user.role === 'COMPANY') {
    return (
      <div className={styles['wizard-fullscreen-bg']}>
        <div className={styles['tour-booking-wizard']}>
          <div className={styles['step-content']}>
            <div className={styles['auth-required']}>
              <h2>🚫 {t('bookingWizard.auth.accessDeniedTitle') || 'Không thể đặt tour'}</h2>
              <p>{t('bookingWizard.auth.companyNotAllowed') || 'Tài khoản doanh nghiệp (COMPANY) không thể đặt tour. Vui lòng sử dụng tài khoản người dùng.'}</p>
              <button 
                type="button"
                className={styles['btn-primary']}
                onClick={() => navigate(`/tour/${tourId}`)}
              >
                {t('bookingWizard.navigation.backToTour') || 'Quay lại trang tour'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Note: Success and error handling is now done via redirect to SuccessPage/FailPage

  return (
    <div className={styles['wizard-fullscreen-bg']}>
      <div className={styles['tour-booking-wizard']}>
        {/* Progress Bar */}
        <div className={styles['progress-container']}>
          <div className={styles['progress-bar']}>
            <div 
              className={styles['progress-fill']} 
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
          <div className={styles['progress-steps']}>
            {STEPS.map((step) => (
              <button 
                key={step.id} 
                type="button"
                className={(() => {
                  const base = styles['progress-step'];
                  if (currentStep === step.id) return `${base} ${styles.active}`;
                  if (isStepCompletedByValidation(step.id)) return `${base} ${styles.completed}`;
                  return base;
                })()}
                onClick={() => handleStepClick(step.id)}
              >
                <div className={styles['step-number']}>{step.id}</div>
                <div className={styles['step-info']}>
                  <div className={styles['step-title']}>{t(step.titleKey)}</div>
                  <div className={styles['step-description']}>{t(step.descKey)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className={styles['step-content']}>
          {renderCurrentStep()}
        </div>

        {/* Navigation Buttons */}
        <div className={styles['step-navigation']}>
          <button 
            type="button" 
            className={styles['btn-secondary']} 
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            {t('bookingWizard.navigation.back')}
          </button>
          
          {currentStep < 3 ? (
            <button 
              type="button" 
              className={styles['btn-primary']} 
              onClick={handleNext}
            >
              {t('bookingWizard.navigation.next')}
            </button>
          ) : (
            <button 
              type="button" 
              className={styles['btn-success']} 
              onClick={handleConfirm}
              disabled={booking.loading}
            >
              {(() => {
                if (booking.loading) {
                  return (
                    <>
                      <span className={styles['loading-spinner-small']}></span>
                      {' '}{t('bookingWizard.processing')}
                    </>
                  );
                }
                return t('bookingWizard.navigation.confirm');
              })()}
            </button>
          )}
        </div>

        {/* Confirm Leave Modal */}
        <ConfirmLeaveModal
          open={showLeaveModal}
          onCancel={handleCancelLeave}
          onConfirm={handleConfirmLeave}
        />

        {/* Step 2 Info Modal */}
        <Step2InfoModal
          open={showStep2InfoModal}
          onClose={handleStep2InfoModalClose}
        />
      </div>
    </div>
  );
};

// Main component with provider
const TourBookingWizard = () => {
  return (
    <TourBookingProvider>
      <BookingWizardContent />
    </TourBookingProvider>
  );
};

export default TourBookingWizard;
