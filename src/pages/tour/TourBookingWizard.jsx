import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TourBookingProvider, useBooking } from '../../contexts/TourBookingContext';
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
  const { tourId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { resetBooking, contact, plan } = useBooking();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Reset booking when component mounts or tourId changes
  useEffect(() => {
    resetBooking();
  }, [tourId, resetBooking]);

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
    // Prepare complete booking data
    const bookingData = {
      contact,
      plan,
      timestamp: new Date().toISOString(),
      status: 'confirmed'
    };

    // Log to console as requested
    console.log('Booking Confirmed:', bookingData);
    
    setIsConfirmed(true);
    showToast('Đã xác nhận đặt tour thành công! (Demo - Frontend only)', 'success');
    
    // Optional: Navigate back to tour detail after a delay
    setTimeout(() => {
      navigate(`/tour/${tourId}`);
    }, 2000);
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

  if (isConfirmed) {
    return (
      <div className="tour-booking-wizard">
        <div className="step-content">
          <div className="success-message">
            <h1>Đặt tour thành công!</h1>
            <p>Cảm ơn bạn đã đặt tour. Thông tin đã được ghi nhận.</p>
            <p>Đây là demo frontend, không có kết nối API thực tế.</p>
            <p>Bạn sẽ được chuyển về trang chi tiết tour trong giây lát...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <div 
              key={step.id} 
              className={`progress-step ${
                currentStep === step.id 
                  ? 'active' 
                  : isStepCompleted(step.id) 
                    ? 'completed' 
                    : ''
              }`}
              onClick={() => handleStepClick(step.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStepClick(step.id);
                }
              }}
              tabIndex={0}
            >
              <div className="step-number">{step.id}</div>
              <div className="step-info">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </div>
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
          >
            Xác nhận đặt tour
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
