import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TourBookingProvider, useBooking } from '../../contexts/TourBookingContext';
import { formatBookingData, validateBookingData } from '../../utils/bookingFormatter';
import { useAuth } from '../../contexts/AuthContext';
import Step1Contact from './steps/Step1Contact';
import Step2Details from './steps/Step2Details';
import Step3Review from './steps/Step3Review';
import { useToast } from '../../contexts/ToastContext';
import './TourBookingWizard.css';

const STEPS = [
  { id: 1, title: 'Thông tin liên hệ', description: 'Nhập thông tin liên hệ của bạn' },
  { id: 2, title: 'Chi tiết tour', description: 'Chọn ngày và thông tin đoàn' },
  { id: 3, title: 'Xác nhận', description: 'Kiểm tra và xác nhận đặt tour' }
];

// Inner component that uses the booking context
const BookingWizardContent = () => {
  const { id: tourId } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { 
    resetBooking, 
    contact, 
    plan, 
    booking
  } = useBooking();
  
  const [currentStep, setCurrentStep] = useState(1);

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
    // Add validation logic here if needed
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirm = () => {
    // Validate booking data before proceeding to payment
    const bookingData = formatBookingData({ contact, plan }, tourId);
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
      <div className="tour-booking-wizard">
        <div className="step-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Đang kiểm tra xác thực...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login required message if not authenticated
  if (!user) {
    return (
      <div className="tour-booking-wizard">
        <div className="step-content">
          <div className="auth-required">
            <h2>🔒 Yêu cầu đăng nhập</h2>
            <p>Bạn cần đăng nhập để đặt tour.</p>
            <button 
              type="button"
              className="btn-primary"
              onClick={() => navigate('/login')}
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Note: Success and error handling is now done via redirect to SuccessPage/FailPage

  return (
    <div className="tour-booking-wizard">
      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
        <div className="progress-steps">
          {STEPS.map((step) => (
            <button 
              key={step.id} 
              type="button"
              className={(() => {
                if (currentStep === step.id) return 'progress-step active';
                if (isStepCompleted(step.id)) return 'progress-step completed';
                return 'progress-step';
              })()}
              onClick={() => handleStepClick(step.id)}
            >
              <div className="step-number">{step.id}</div>
              <div className="step-info">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="step-content">
        {renderCurrentStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="step-navigation">
        <button 
          type="button" 
          className="btn-secondary" 
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          Quay lại
        </button>
        
        {currentStep < 3 ? (
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleNext}
          >
            Tiếp tục
          </button>
        ) : (
          <button 
            type="button" 
            className="btn-success" 
            onClick={handleConfirm}
            disabled={booking.loading}
          >
            {(() => {
              if (booking.loading) {
                return (
                  <>
                    <span className="loading-spinner-small"></span>
                    {' '}Đang xử lý...
                  </>
                );
              }
              return 'Xác nhận đặt tour';
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
