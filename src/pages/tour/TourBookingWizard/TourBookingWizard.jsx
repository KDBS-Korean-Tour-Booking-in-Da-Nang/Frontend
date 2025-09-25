import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TourBookingProvider, useBooking } from '../../../contexts/TourBookingContext';
import { formatBookingData, validateBookingData } from '../../../utils/bookingFormatter';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useBookingStepValidation } from '../../../hooks/useBookingStepValidation';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const { showError, showBatch } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { 
    resetBooking, 
    contact, 
    plan, 
    booking
  } = useBooking();
  
  const [currentStep, setCurrentStep] = useState(1);
  
  // Use custom hook for step validation
  const { getStepErrors } = useBookingStepValidation({ contact, plan, user });

  // Authentication guard
  useEffect(() => {
    if (!authLoading && !user) {
      // Store current URL to return after login
      localStorage.setItem('returnAfterLogin', window.location.pathname);
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Reset booking when component mounts or tourId changes
  useEffect(() => {
    if (user) {
      resetBooking();
    }
  }, [tourId, resetBooking, user]);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      // Get validation errors for current step
      const errors = getStepErrors(currentStep);
      
      if (errors.length > 0) {
        const messages = errors.map(errorKey => ({ i18nKey: 'toast.required', values: { field: t(errorKey) } }));
        // Queue this batch; if another click happens, the next batch will wait until this one is done
        showBatch(messages, 'error', 5000);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirm = () => {
    // Get current language for date format conversion
    const currentLanguage = (i18n && i18n.language) ? i18n.language : 'vi';
    
    // Validate booking data before proceeding to payment
    const bookingData = formatBookingData({ contact, plan }, tourId, currentLanguage);
    const validation = validateBookingData(bookingData);
    
    if (!validation.isValid) {
      showError(`Dữ liệu không hợp lệ: ${validation.errors.join(', ')}`);
      return;
    }
    
    // Navigate to payment page with booking data (not yet created in DB)
    navigate('/payment/vnpay', {
      state: {
        bookingData: bookingData, // Use formatted data, not created booking
        tourId: tourId
      }
    });
  };

  const isStepCompleted = (stepId) => {
    return stepId < currentStep;
  };

  const handleStepClick = (stepId) => {
    // Only allow clicking on completed steps or current step
    if (isStepCompleted(stepId) || stepId === currentStep) {
      setCurrentStep(stepId);
    }
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
      <div className={styles['tour-booking-wizard']}>
        <div className={styles['step-content']}>
          <div className={styles['loading-container']}>
            <div className={styles['loading-spinner']}></div>
            <p>{t('bookingWizard.auth.checking')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login required message if not authenticated
  if (!user) {
    return (
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
    );
  }

  // Note: Success and error handling is now done via redirect to SuccessPage/FailPage

  return (
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
                if (isStepCompleted(step.id)) return `${base} ${styles.completed}`;
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
