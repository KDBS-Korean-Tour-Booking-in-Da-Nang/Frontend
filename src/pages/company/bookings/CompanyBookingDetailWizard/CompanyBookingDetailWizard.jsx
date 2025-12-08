import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBookingById, getGuestsByBookingId } from '../../../../services/bookingAPI';
import { ConfirmLeaveModal } from '../../../../components/modals';
import Step1PersonalInfo from './steps/Step1PersonalInfo/Step1PersonalInfo';
import Step2Insurance from './steps/Step2Insurance/Step2Insurance';
import Step3Confirmation from './steps/Step3Confirmation/Step3Confirmation';
import styles from './CompanyBookingDetailWizard.module.css';

const CompanyBookingDetailWizard = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const navigate = useNavigate();
  const location = useLocation();
  
  const STEPS = [
    { id: 1, title: t('companyBookingWizard.steps.step1.title'), description: t('companyBookingWizard.steps.step1.description') },
    { id: 2, title: t('companyBookingWizard.steps.step2.title'), description: t('companyBookingWizard.steps.step2.description') },
    { id: 3, title: t('companyBookingWizard.steps.step3.title'), description: t('companyBookingWizard.steps.step3.description') }
  ];
  
  // Get tourId from URL params or location state
  const tourId = searchParams.get('tourId') || location.state?.tourId;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [booking, setBooking] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set()); // Track completed steps
  const [isReadOnly, setIsReadOnly] = useState(false); // Read-only mode for completed bookings
  const [lockedToStep1Only, setLockedToStep1Only] = useState(false); // Reject mode
  const [pendingInsuranceUpdates, setPendingInsuranceUpdates] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingNavigationRef = useRef(null);
  
  // Check if wizard has unsaved changes (completed steps but booking not finished)
  const hasUnsavedChanges = useMemo(() => {
    return !isReadOnly && 
           !lockedToStep1Only && 
           completedSteps.size > 0 && 
           booking?.bookingStatus !== 'BOOKING_SUCCESS_PENDING';
  }, [isReadOnly, lockedToStep1Only, completedSteps.size, booking?.bookingStatus]);

  // Load saved wizard progress from localStorage
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
      // Silently handle error saving wizard progress
    }
  };

  // Clear wizard progress from localStorage
  const clearWizardProgress = (bookingId) => {
    try {
      const progressKey = `booking_wizard_progress_${bookingId}`;
      localStorage.removeItem(progressKey);
    } catch (err) {
    }
  };

  // Fetch booking and guests data, determine initial step based on status
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
        setIsReadOnly(false);
        setLockedToStep1Only(false);
        
        // Set read-only mode for completed bookings
        if (bookingData.bookingStatus === 'BOOKING_SUCCESS') {
          setIsReadOnly(true);
          setCurrentStep(3);
          setCompletedSteps(new Set([1, 2, 3]));
          clearWizardProgress(bookingId);
          return;
        }

        // Lock to step 1 only for rejected bookings
        if (bookingData.bookingStatus === 'BOOKING_REJECTED') {
          setLockedToStep1Only(true);
          setCurrentStep(1);
          setCompletedSteps(new Set());
          clearWizardProgress(bookingId);
          return;
        }
        
        // Load saved progress and determine initial step
        const { step: savedStep, completed: savedCompleted } = loadWizardProgress(bookingId);
        setCompletedSteps(savedCompleted);
        
        // Determine initial step based on booking status and completed steps
        let initialStep = savedStep;
        
        if (bookingData.bookingStatus === 'WAITING_FOR_APPROVED' || 
            bookingData.bookingStatus === 'WAITING_FOR_UPDATE') {
          if (savedCompleted.has(1)) {
            // Check if step 2 is completed (all guests have insurance)
            const allGuestsHaveInsurance = guestsData.length > 0 && 
              guestsData.every(g => g.insuranceStatus && g.insuranceStatus !== 'Pending');
            
            if (savedCompleted.has(2) || allGuestsHaveInsurance) {
              initialStep = 3;
            } else {
              initialStep = 2;
            }
          } else {
            initialStep = 1;
          }
        } else {
          initialStep = 1;
        }
        
        setCurrentStep(initialStep);
      } catch (err) {
        setError(err.message || t('companyBookingWizard.error.loadFailed'));
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

  // Handle manual step change
  const handleStepChange = (step) => {
    if (step >= 1 && step <= 3) {
      setCurrentStep(step);
    }
  };

  // Update booking state and refresh if completion status changed
  const handleBookingUpdate = async (updatedBooking) => {
    setBooking(updatedBooking);
    // Refresh booking data if completion status changed
    if (updatedBooking.companyConfirmedCompletion || updatedBooking.userConfirmedCompletion) {
      try {
        const refreshedBooking = await getBookingById(bookingId);
        setBooking(refreshedBooking);
      } catch (err) {
      }
    }
  };

  // Update guests state
  const handleGuestsUpdate = (updatedGuests) => {
    setGuests(updatedGuests);
  };

  // Handle pending insurance updates from Step 2
  const handlePendingInsuranceUpdates = useCallback((updates) => {
    setPendingInsuranceUpdates(updates || []);
  }, []);

  // Navigate to next step
  const handleNext = () => {
    if (currentStep < 3 && !isReadOnly && !lockedToStep1Only) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
    }
  };

  // Navigate to previous step and clear pending insurance updates
  const handleBack = () => {
    if (isReadOnly || lockedToStep1Only || currentStep === 1) {
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
    if (isReadOnly || lockedToStep1Only) return;
    
    setCompletedSteps(prev => {
      const newCompleted = new Set(prev);
      newCompleted.add(step);
      const stepToSave = nextStep !== null ? nextStep : (currentStep < 3 ? currentStep + 1 : currentStep);
      saveWizardProgress(bookingId, stepToSave, newCompleted);
      return newCompleted;
    });
  }, [bookingId, currentStep, isReadOnly, lockedToStep1Only]);

  // Check if step is completed (always true for completed bookings)
  const isStepCompleted = (step) => {
    if (!booking) return false;

    if (booking.bookingStatus === 'BOOKING_SUCCESS') {
      return step <= 3;
    }

    return completedSteps.has(step);
  };

  // Check if step can be clicked for navigation
  const canClickStep = (stepId) => {
    if (isReadOnly || lockedToStep1Only) {
      return false;
    }
    
    if (stepId === currentStep) return true;

    if (stepId < currentStep) return true;
    
    if (stepId === currentStep + 1) {
      return completedSteps.has(currentStep);
    }
    
    return false;
  };

  // Check if user can navigate back
  const canGoBack = () => {
    return !isReadOnly && !lockedToStep1Only && currentStep > 1;
  };

  // Navigate back to bookings list, preserving tourId in URL
  const navigateBack = useCallback(() => {
    if (tourId) {
      navigate(`/company/bookings?tourId=${tourId}`);
    } else {
      navigate('/company/bookings');
    }
  }, [navigate, tourId]);

  // Handle user confirmation to leave wizard: clear progress and navigate
  const handleConfirmLeave = useCallback(() => {
    if (bookingId) {
      clearWizardProgress(bookingId);
    }
    setCompletedSteps(new Set());
    setPendingInsuranceUpdates([]);
    setShowLeaveModal(false);
    
    // Navigate to pending route or back to bookings list
    if (pendingNavigationRef.current) {
      const { path, type } = pendingNavigationRef.current;
      if (type === 'back') {
        navigate(-1);
      } else if (type === 'path') {
        navigate(path);
      } else {
        navigateBack();
      }
      pendingNavigationRef.current = null;
    } else {
      navigateBack();
    }
  }, [bookingId, navigate, navigateBack]);

  // Cancel leaving wizard - stay on current page
  const handleCancelLeave = useCallback(() => {
    setShowLeaveModal(false);
    pendingNavigationRef.current = null;
  }, []);

  // Warn user when closing browser/tab if wizard has unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Intercept browser back button when wizard has unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const onPopState = () => {
      window.history.pushState(null, '');
      setShowLeaveModal(true);
      pendingNavigationRef.current = { type: 'back' };
    };
    
    window.history.pushState(null, '');
    window.addEventListener('popstate', onPopState);
    
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [hasUnsavedChanges]);

  // Intercept link clicks when wizard has unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const onClick = (ev) => {
      const anchor = ev.target.closest('a');
      if (!anchor) return;
      
      const url = new URL(anchor.href, window.location.origin);
      const isSameOrigin = url.origin === window.location.origin;
      const isWizardPath = url.pathname.includes('/company/bookings/detail');
      
      if (isWizardPath) return;
      if (isSameOrigin && url.pathname !== window.location.pathname) {
        ev.preventDefault();
        setShowLeaveModal(true);
        pendingNavigationRef.current = { type: 'path', path: url.pathname + url.search + url.hash };
      }
    };
    
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [hasUnsavedChanges]);

  // Render component for current step
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
            isReadOnly={isReadOnly || lockedToStep1Only}
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
            isStep2Completed={completedSteps.has(2)}
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
            pendingInsuranceUpdates={pendingInsuranceUpdates}
            bookingId={bookingId}
            tourId={tourId}
            onMarkStepsCompleted={(completed) => {
              setCompletedSteps(completed);
              clearWizardProgress(bookingId);
            }}
            onClearInsuranceUpdates={() => setPendingInsuranceUpdates([])}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#e11d48', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        <div className={styles.wizardContainer}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>{t('companyBookingWizard.loading.booking')}</p>
          </div>
        </div>
      </>
    );
  }

  const handleStepClick = (stepId) => {
    if (isReadOnly || lockedToStep1Only || stepId === currentStep) {
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
          <h3>{t('companyBookingWizard.error.title')}</h3>
          <p>{error}</p>
          <button onClick={navigateBack} className={styles.btn}>
            {t('companyBookingWizard.error.back')}
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={styles['booking-wizard']}>
        <div className={styles.error}>
          <h3>{t('companyBookingWizard.error.notFound')}</h3>
          <button onClick={navigateBack} className={styles.btn}>
            {t('companyBookingWizard.error.back')}
          </button>
        </div>
      </div>
    );
  }

  const showWizardNavigation = (!isReadOnly && !lockedToStep1Only && currentStep < 3);

  return (
    <div className={styles['booking-wizard']}>
      {/* Header */}
      <div className={styles['wizard-header']}>
        <h1 className={styles['wizard-title']}>{t('companyBookingWizard.header.title')}{booking.bookingId}</h1>
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
            {t('companyBookingWizard.readOnly.title')}
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
            const canClick = (isReadOnly || lockedToStep1Only) ? false : canClickStep(step.id);

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
                  lockedToStep1Only
                    ? t('companyBookingWizard.stepTooltips.rejected')
                    : isReadOnly && step.id !== 3
                      ? t('companyBookingWizard.stepTooltips.readOnlyOther')
                      : isReadOnly && step.id === 3
                        ? t('companyBookingWizard.stepTooltips.readOnlyStep3')
                        : isCompleted && !isReadOnly 
                          ? t('companyBookingWizard.stepTooltips.completed')
                          : !canClick && !isReadOnly
                            ? t('companyBookingWizard.stepTooltips.notAccessible')
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
        {showWizardNavigation && currentStep < 3 ? (
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
              disabled={currentStep === 1 || lockedToStep1Only}
            >
              {t('companyBookingWizard.navigation.back')}
            </button>
            <button 
              type="button" 
              className={styles['btn-primary']} 
              onClick={handleNext}
              disabled={
                currentStep >= 3 || 
                (currentStep === 1 && !completedSteps.has(1)) ||
                (currentStep === 2 && !completedSteps.has(2))
              }
            >
              {t('companyBookingWizard.navigation.next')}
            </button>
          </>
        ) : currentStep === 3 && !isReadOnly && !lockedToStep1Only ? (
          <button 
            type="button" 
            className={styles['btn-secondary']} 
            onClick={handleBack}
            disabled={false}
          >
            {t('companyBookingWizard.navigation.back')}
          </button>
          ) : null}
      </div>

      {/* Confirm Leave Modal - Rendered outside wizard container */}
      <ConfirmLeaveModal
        open={showLeaveModal}
        onCancel={handleCancelLeave}
        onConfirm={handleConfirmLeave}
      />
    </div>
  );
};

export default CompanyBookingDetailWizard;

