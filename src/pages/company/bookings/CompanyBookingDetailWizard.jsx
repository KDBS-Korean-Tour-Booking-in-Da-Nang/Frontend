import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { getBookingById, getGuestsByBookingId, getTourCompletionStatus, changeBookingStatus, changeBookingGuestInsuranceStatus } from '../../../services/bookingAPI';
import { useToast } from '../../../contexts/ToastContext';
import { DeleteConfirmModal } from '../../../components/modals';
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
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();
  
  // Get tourId from URL params or location state
  const tourId = searchParams.get('tourId') || location.state?.tourId;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [booking, setBooking] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmingBooking, setConfirmingBooking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set()); // Track completed steps
  const [isReadOnly, setIsReadOnly] = useState(false); // Read-only mode for completed bookings
  const [pendingInsuranceUpdates, setPendingInsuranceUpdates] = useState([]);

  // Load wizard progress from localStorage
  const loadWizardProgress = (bookingId) => {
    try {
      const progressKey = `booking_wizard_progress_${bookingId}`;
      const savedProgress = localStorage.getItem(progressKey);
      if (savedProgress) {
        const { currentStep: savedStep, completedSteps: savedCompleted } = JSON.parse(savedProgress);
        return {
          step: savedStep || 1,
          completed: new Set(savedCompleted || [])
        };
      }
    } catch (err) {
      console.error('Error loading wizard progress:', err);
    }
    return { step: 1, completed: new Set() };
  };

  // Save wizard progress to localStorage
  const saveWizardProgress = (bookingId, step, completed) => {
    try {
      const progressKey = `booking_wizard_progress_${bookingId}`;
      localStorage.setItem(progressKey, JSON.stringify({
        currentStep: step,
        completedSteps: Array.from(completed)
      }));
    } catch (err) {
      console.error('Error saving wizard progress:', err);
    }
  };

  // Clear wizard progress from localStorage
  const clearWizardProgress = (bookingId) => {
    try {
      const progressKey = `booking_wizard_progress_${bookingId}`;
      localStorage.removeItem(progressKey);
    } catch (err) {
      console.error('Error clearing wizard progress:', err);
    }
  };

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
        setPendingInsuranceUpdates([]);
        
        // Check if booking is completed (read-only mode)
        if (bookingData.bookingStatus === 'BOOKING_SUCCESS') {
          setIsReadOnly(true);
          setCurrentStep(3);
          // Mark all steps as completed for read-only view
          setCompletedSteps(new Set([1, 2, 3]));
          // Clear progress since booking is completed
          clearWizardProgress(bookingId);
          return;
        }
        
        // Load saved progress if exists
        const { step: savedStep, completed: savedCompleted } = loadWizardProgress(bookingId);
        setCompletedSteps(savedCompleted);
        
        // Determine initial step based on booking status and progress
        let initialStep = savedStep;
        
        if (bookingData.bookingStatus === 'WAITING_FOR_APPROVED' || 
            bookingData.bookingStatus === 'WAITING_FOR_UPDATE') {
          // If step 1 is completed, move to step 2
          if (savedCompleted.has(1)) {
            // Check if all guests have insurance status (step 2 might be completed)
            const allGuestsHaveInsurance = guestsData.length > 0 && 
              guestsData.every(g => g.insuranceStatus && g.insuranceStatus !== 'Pending');
            
            if (savedCompleted.has(2) || allGuestsHaveInsurance) {
              // Step 2 is completed or all insurance is set, move to step 3
              initialStep = 3;
            } else {
              // Step 1 completed but step 2 not, go to step 2
              initialStep = 2;
            }
          } else {
            // Step 1 not completed, start at step 1
            initialStep = 1;
          }
        } else {
          // Other statuses, start at step 1
          initialStep = 1;
        }
        
        setCurrentStep(initialStep);
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

  const handleBookingUpdate = async (updatedBooking) => {
    setBooking(updatedBooking);
    // If booking completion status changed, refresh booking data
    if (updatedBooking.companyConfirmedCompletion || updatedBooking.userConfirmedCompletion) {
      // Refresh booking to get latest status from backend
      try {
        const refreshedBooking = await getBookingById(bookingId);
        setBooking(refreshedBooking);
      } catch (err) {
        console.error('Error refreshing booking:', err);
      }
    }
  };

  const handleGuestsUpdate = (updatedGuests) => {
    setGuests(updatedGuests);
  };

  const handlePendingInsuranceUpdates = useCallback((updates) => {
    setPendingInsuranceUpdates(updates || []);
  }, []);

  const handleNext = () => {
    if (currentStep < 3 && !isReadOnly) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Progress is saved by markStepCompleted callback
    }
  };

  const handleBack = () => {
    if (isReadOnly || currentStep === 1) {
      return;
    }

    const prevStep = currentStep - 1;

    if (currentStep === 3 && prevStep === 2) {
      setPendingInsuranceUpdates([]);
    }
  if (currentStep === 2 && prevStep === 1) {
    setPendingInsuranceUpdates([]);
  }

    setCurrentStep(prevStep);

  setCompletedSteps((prev) => {
    const newCompleted = new Set(prev);
    saveWizardProgress(bookingId, prevStep, newCompleted);
    return newCompleted;
  });
  };

  // Mark step as completed - exposed to child components via callback
  const markStepCompleted = useCallback((step, nextStep = null) => {
    if (isReadOnly) return;
    
    setCompletedSteps(prev => {
      const newCompleted = new Set(prev);
      newCompleted.add(step);
      // Save progress with next step (if provided) or current step + 1
      const stepToSave = nextStep !== null ? nextStep : (currentStep < 3 ? currentStep + 1 : currentStep);
      saveWizardProgress(bookingId, stepToSave, newCompleted);
      return newCompleted;
    });
  }, [bookingId, currentStep, isReadOnly]);

  const isStepCompleted = (step) => {
    if (!booking) return false;

    if (booking.bookingStatus === 'BOOKING_SUCCESS') {
      return step <= 3;
    }

    return completedSteps.has(step);
  };

  const isStepAccessible = (step) => {
    // In read-only mode, only step 3 is accessible
    if (isReadOnly) {
      return step === 3;
    }
    
    // Step 1 is always accessible
    if (step === 1) return true;
    
    // Step 2 is accessible if step 1 is completed or we're at/after step 2
    if (step === 2) {
      return completedSteps.has(1) || currentStep >= 2;
    }
    
    // Step 3 is accessible if step 2 is completed or we're at step 3
    if (step === 3) {
      return completedSteps.has(2) || currentStep >= 3;
    }
    
    return false;
  };

  // Check if step can be clicked (for navigation)
  const canClickStep = (stepId) => {
    if (isReadOnly) {
      return false;
    }
    
    if (stepId === currentStep) return true;

    if (stepId < currentStep) return true;
    
    if (stepId === currentStep + 1) {
      return completedSteps.has(currentStep);
    }
    
    return false;
  };

  const canGoBack = () => {
    return !isReadOnly && currentStep > 1;
  };

  // Navigate back function that preserves tourId
  const navigateBack = useCallback(() => {
    if (tourId) {
      navigate(`/company/bookings?tourId=${tourId}`);
    } else {
      navigate('/company/bookings');
    }
  }, [navigate, tourId]);

  // Handle finish button - show confirmation modal
  const handleFinish = useCallback(() => {
    // Check if booking is already confirmed
    if (booking?.bookingStatus === 'BOOKING_SUCCESS') {
      // Already confirmed, just navigate back
      navigateBack();
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  }, [booking, navigateBack]);

  // Handle booking confirmation - called from modal
  const handleConfirmBooking = useCallback(async () => {
    if (!booking?.bookingId) return;

    try {
      setConfirmingBooking(true);
      setShowConfirmModal(false);

      if (pendingInsuranceUpdates.length > 0) {
        await Promise.all(
          pendingInsuranceUpdates.map(change =>
            changeBookingGuestInsuranceStatus(change.guestId, change.status)
          )
        );
      }
      
      // Change booking status to BOOKING_SUCCESS - this is the final confirmation
      const updatedBooking = await changeBookingStatus(booking.bookingId, 'BOOKING_SUCCESS');
      
      // Update booking state
      setBooking(updatedBooking);
      setPendingInsuranceUpdates([]);
      
      // Mark all steps as completed and set read-only mode
      setCompletedSteps(new Set([1, 2, 3]));
      setIsReadOnly(true);
      
      // Clear progress since booking is completed
      clearWizardProgress(bookingId);
      
      showSuccess('Đã xác nhận booking thành công! Booking và bảo hiểm đã được lưu vào database.');
      
      // Navigate back after a short delay to show success message
      setTimeout(() => {
        navigateBack();
      }, 1500);
    } catch (error) {
      console.error('Error confirming booking:', error);
      showError(error.message || 'Không thể xác nhận booking');
    } finally {
      setConfirmingBooking(false);
    }
  }, [booking, bookingId, navigateBack, pendingInsuranceUpdates, showSuccess, showError]);

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
            isReadOnly={isReadOnly}
            onStepCompleted={markStepCompleted}
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
            isReadOnly={isReadOnly}
            isStep1Completed={completedSteps.has(1)}
            onStepCompleted={markStepCompleted}
            onInsuranceUpdatesPending={handlePendingInsuranceUpdates}
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
            isReadOnly={isReadOnly}
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
    if (isReadOnly || stepId === currentStep) {
      return;
    }
    
    if (stepId < currentStep) {
      if (stepId === 2) {
        setPendingInsuranceUpdates([]);
      }
    if (stepId === 1) {
      setPendingInsuranceUpdates([]);
    }
      setCurrentStep(stepId);
      setCompletedSteps((prev) => {
        const newCompleted = new Set(prev);
        saveWizardProgress(bookingId, stepId, newCompleted);
        return newCompleted;
      });
      return;
    }
    
    if (canClickStep(stepId)) {
      handleStepChange(stepId);
      saveWizardProgress(bookingId, stepId, completedSteps);
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

  const canShowNavigationButtons = !isReadOnly && (
    (currentStep === 1 && completedSteps.has(1)) ||
    (currentStep === 2 && completedSteps.has(2))
  );

  const showWizardNavigation = (!isReadOnly && currentStep <= 3) || (currentStep === 3 && !isReadOnly);

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

      {/* Read-only indicator */}
      {isReadOnly && (
        <div style={{ 
          padding: '0.75rem 1rem', 
          backgroundColor: '#fef3c7', 
          border: '1px solid #fbbf24', 
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>👁️</span>
          <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 500 }}>
            Chế độ xem chỉ đọc - Booking đã hoàn thành (BOOKING_SUCCESS)
          </span>
        </div>
      )}

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
            const canClick = isReadOnly ? false : canClickStep(step.id);

            let stepClassName = styles['progress-step'];
            if (isActive) {
              stepClassName += ` ${styles['active']}`;
            } else if (isCompleted) {
              stepClassName += ` ${styles['completed']}`;
            }

            if (!canClick) {
              stepClassName += ` ${styles['disabled']}`;
            } else {
              stepClassName += ` ${styles['hoverable']}`;
            }
            
            return (
              <button
                key={step.id}
                type="button"
                className={stepClassName}
                onClick={() => handleStepClick(step.id)}
                disabled={!canClick}
                title={
                  isReadOnly && step.id !== 3
                    ? 'Booking đã hoàn thành - Chỉ hiển thị bước 3'
                    : isReadOnly && step.id === 3
                      ? 'Booking đã hoàn thành (chỉ xem)'
                      : isCompleted && !isReadOnly 
                        ? 'Bước đã hoàn thành (không thể quay lại)' 
                        : !canClick && !isReadOnly
                          ? 'Bước này chưa thể truy cập'
                          : ''
                }
              >
                <div className={styles['step-number']}>
                  {isCompleted && !isActive ? '✓' : step.id}
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
        {showWizardNavigation ? (
          <>
            <button 
              type="button" 
              className={styles['btn-secondary']} 
              onClick={() => {
                if (canGoBack()) {
                  handleBack();
                } else {
                  navigateBack();
                }
              }}
              disabled={currentStep === 1}
            >
              Trước
            </button>
            {currentStep < 3 ? (
              <button 
                type="button" 
                className={styles['btn-primary']} 
                onClick={handleNext}
                disabled={currentStep >= 3}
              >
                Tiếp
              </button>
            ) : (
              <button 
                type="button" 
                className={styles['btn-success']} 
                onClick={handleFinish}
                disabled={confirmingBooking}
              >
                {confirmingBooking ? 'Đang xử lý...' : 'Hoàn thành'}
              </button>
            )}
          </>
        ) : (
          <button 
            type="button" 
            className={styles['btn-success']} 
            onClick={navigateBack}
          >
            Đóng
          </button>
        )}
      </div>

      {/* Booking Confirmation Modal */}
      {showConfirmModal && (
        <DeleteConfirmModal
          isOpen={showConfirmModal}
          onClose={() => !confirmingBooking && setShowConfirmModal(false)}
          onConfirm={handleConfirmBooking}
          title="Xác nhận booking"
          message={`Bạn có chắc chắn muốn xác nhận booking #${booking?.bookingId}?`}
          confirmText="Xác nhận"
          cancelText="Hủy"
          icon="✓"
          danger={false}
          disableBackdropClose={confirmingBooking}
        >
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.6', color: '#374151' }}>
              Booking sẽ được lưu vào database với trạng thái <strong>BOOKING_SUCCESS</strong> và thông báo sẽ được gửi đến khách hàng.
            </p>
          </div>
        </DeleteConfirmModal>
      )}
    </div>
  );
};

export default CompanyBookingDetailWizard;

