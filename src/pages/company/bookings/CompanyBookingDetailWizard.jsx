import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { getBookingById, getGuestsByBookingId } from '../../../services/bookingAPI';
import Step1PersonalInfo from './steps/Step1PersonalInfo/Step1PersonalInfo';
import Step2Insurance from './steps/Step2Insurance/Step2Insurance';
import Step3Confirmation from './steps/Step3Confirmation/Step3Confirmation';
import styles from './CompanyBookingDetailWizard.module.css';

const STEPS = [
  { id: 1, title: 'Thông tin cá nhân', description: 'Xem và duyệt thông tin booking' },
  { id: 2, title: 'Thông tin bảo hiểm', description: 'Quản lý trạng thái bảo hiểm' },
  { id: 3, title: 'Xác nhận', description: 'Xác nhận booking thành công' }
];

const CompanyBookingDetailWizard = () => {
  const { id: bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Get tourId from URL params or location state
  const tourId = searchParams.get('tourId') || location.state?.tourId;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [booking, setBooking] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [bookingData, guestsData] = await Promise.all([
          getBookingById(bookingId),
          getGuestsByBookingId(bookingId)
        ]);
        
        setBooking(bookingData);
        setGuests(guestsData);
        
        // Determine initial step based on booking status
        if (bookingData.bookingStatus === 'BOOKING_SUCCESS') {
          setCurrentStep(3);
        } else if (bookingData.bookingStatus === 'WAITING_FOR_APPROVED' || 
                   bookingData.bookingStatus === 'WAITING_FOR_UPDATE') {
          // Check if we need to go to step 2 (insurance)
          // If all guests have insurance status, we're in step 2
          const allGuestsHaveInsurance = guestsData.length > 0 && 
            guestsData.every(g => g.insuranceStatus && g.insuranceStatus !== 'Pending');
          if (allGuestsHaveInsurance) {
            setCurrentStep(2);
          } else {
            setCurrentStep(1);
          }
        } else {
          setCurrentStep(1);
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(err.message || 'Không thể tải thông tin booking');
        if (err.message === 'Unauthenticated') {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId, navigate]);

  const handleStepChange = (step) => {
    if (step >= 1 && step <= 3) {
      setCurrentStep(step);
    }
  };

  const handleBookingUpdate = (updatedBooking) => {
    setBooking(updatedBooking);
  };

  const handleGuestsUpdate = (updatedGuests) => {
    setGuests(updatedGuests);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepCompleted = (step) => {
    if (!booking) return false;
    
    switch (step) {
      case 1:
        // Step 1 is completed if booking is approved and moved to step 2
        return booking.bookingStatus === 'WAITING_FOR_APPROVED' && currentStep >= 2;
      case 2:
        // Step 2 is completed if all guests have Success insurance and booking is success
        return booking.bookingStatus === 'BOOKING_SUCCESS' && currentStep >= 3;
      case 3:
        return booking.bookingStatus === 'BOOKING_SUCCESS';
      default:
        return false;
    }
  };

  const isStepAccessible = (step) => {
    if (step === 1) return true;
    if (step === 2) return isStepCompleted(1) || currentStep >= 2;
    if (step === 3) return isStepCompleted(2) || currentStep >= 3;
    return false;
  };

  // Navigate back function that preserves tourId
  const navigateBack = useCallback(() => {
    if (tourId) {
      navigate(`/company/bookings?tourId=${tourId}`);
    } else {
      navigate('/company/bookings');
    }
  }, [navigate, tourId]);

  const renderCurrentStep = () => {
    if (!booking || !guests) return null;

    switch (currentStep) {
      case 1:
        return (
          <Step1PersonalInfo
            booking={booking}
            guests={guests}
            onBookingUpdate={handleBookingUpdate}
            onNext={handleNext}
            onBack={navigateBack}
          />
        );
      case 2:
        return (
          <Step2Insurance
            booking={booking}
            guests={guests}
            onBookingUpdate={handleBookingUpdate}
            onGuestsUpdate={handleGuestsUpdate}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <Step3Confirmation
            booking={booking}
            guests={guests}
            onBookingUpdate={handleBookingUpdate}
            onBack={handleBack}
            onFinish={navigateBack}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={styles.wizardContainer}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Đang tải thông tin booking...</p>
        </div>
      </div>
    );
  }

  const handleStepClick = (stepId) => {
    // Only allow clicking on completed steps or current step
    if (isStepAccessible(stepId)) {
      handleStepChange(stepId);
    }
  };

  if (error) {
    return (
      <div className={styles['booking-wizard']}>
        <div className={styles.error}>
          <h3>Lỗi</h3>
          <p>{error}</p>
          <button onClick={navigateBack} className={styles.btn}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={styles['booking-wizard']}>
        <div className={styles.error}>
          <h3>Không tìm thấy booking</h3>
          <button onClick={navigateBack} className={styles.btn}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['booking-wizard']}>
      {/* Header */}
      <div className={styles['wizard-header']}>
        <button 
          onClick={navigateBack}
          className={styles['back-button']}
        >
          ← Quay lại
        </button>
        <h1 className={styles['wizard-title']}>Quản lý Booking #{booking.bookingId}</h1>
      </div>

      {/* Progress Bar */}
      <div className={styles['progress-container']}>
        <div className={styles['progress-bar']}>
          <div 
            className={styles['progress-fill']} 
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
        <div className={styles['progress-steps']}>
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = isStepCompleted(step.id);
            const isAccessible = isStepAccessible(step.id);
            
            let stepClassName = styles['progress-step'];
            if (isActive) {
              stepClassName += ` ${styles['active']}`;
            } else if (isCompleted) {
              stepClassName += ` ${styles['completed']}`;
            }
            if (!isAccessible) {
              stepClassName += ` ${styles['disabled']}`;
            }
            
            return (
              <button
                key={step.id}
                type="button"
                className={stepClassName}
                onClick={() => handleStepClick(step.id)}
                disabled={!isAccessible}
              >
                <div className={styles['step-number']}>
                  {isCompleted ? '' : step.id}
                </div>
                <div className={styles['step-info']}>
                  <div className={styles['step-title']}>{step.title}</div>
                  <div className={styles['step-description']}>{step.description}</div>
                </div>
              </button>
            );
          })}
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
          onClick={() => {
            if (currentStep === 1) {
              navigateBack();
            } else {
              handleBack();
            }
          }}
        >
          {currentStep === 1 ? 'Quay lại' : 'Trước'}
        </button>
        
        {currentStep === 3 ? (
          <button 
            type="button" 
            className={styles['btn-success']} 
            onClick={navigateBack}
          >
            Hoàn thành
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default CompanyBookingDetailWizard;

