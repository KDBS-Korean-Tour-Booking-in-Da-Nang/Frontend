import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../contexts/ToastContext';
import { TourWizardProvider, useTourWizardContext } from '../../../../contexts/TourWizardContext';
import { useStepValidation } from '../../../../hooks/useStepValidation';
import { getApiPath } from '../../../../config/api';
import Step1BasicInfo from './components/Step1/Step1BasicInfo';
import Step2Itinerary from './components/Step2/Step2Itinerary';
import Step3Pricing from './components/Step3/Step3Pricing';
import Step4Media from './components/Step4/Step4Media';
import styles from './TourWizard.module.css';
import { ConfirmLeaveModal } from '../../../../components/modals';

const TourWizardContent = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const { tourData } = useTourWizardContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [stepHasErrors, setStepHasErrors] = useState({}); // Track which steps have validation errors
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false); // Track if user has attempted to proceed from Step 1
  const [step2ValidationAttempted, setStep2ValidationAttempted] = useState(false); // Track if user has attempted to proceed from Step 2
  const [step3ValidationAttempted, setStep3ValidationAttempted] = useState(false); // Track if user has attempted to proceed from Step 3
  const [step4ValidationAttempted, setStep4ValidationAttempted] = useState(false); // Track if user has attempted to proceed from Step 4
  const pendingNavigationRef = useRef(null);
  
  // Use custom hook for step validation
  const { isStepCompleted, getStepErrors, stepValidations } = useStepValidation(tourData);

  // Calculate if Next button should be disabled using useMemo
  // Button is enabled by default, only disabled after user clicks Next and there are errors
  const isNextButtonDisabled = useMemo(() => {
    if (currentStep >= 4) return false;
    
    // Only disable if user has attempted to proceed and there are errors
    if (currentStep === 1) {
      // Disable only if user clicked Next and validation failed
      if (step1ValidationAttempted && stepHasErrors[1]) {
        return true;
      }
      return false;
    }
    
    if (currentStep === 2) {
      // Disable only if user clicked Next and validation failed
      if (step2ValidationAttempted && stepHasErrors[2]) {
        return true;
      }
      return false;
    }
    
    if (currentStep === 3) {
      // Disable only if user clicked Next and validation failed
      if (step3ValidationAttempted && stepHasErrors[3]) {
        return true;
      }
      return false;
    }
    
    return false;
  }, [currentStep, stepHasErrors, step1ValidationAttempted, step2ValidationAttempted, step3ValidationAttempted]);

  // Reset stepValidationAttempted when step becomes valid (only for current step)
  useEffect(() => {
    const stepKey = `step${currentStep}`;
    if (stepValidations[stepKey]?.isValid) {
      // Only reset if step is actually valid and user has attempted validation
      if (currentStep === 1 && step1ValidationAttempted) {
        setStep1ValidationAttempted(false);
        setStepHasErrors(prev => ({ ...prev, [1]: false }));
      } else if (currentStep === 2 && step2ValidationAttempted) {
        setStep2ValidationAttempted(false);
        setStepHasErrors(prev => ({ ...prev, [2]: false }));
      } else if (currentStep === 3 && step3ValidationAttempted) {
        setStep3ValidationAttempted(false);
        setStepHasErrors(prev => ({ ...prev, [3]: false }));
      } else if (currentStep === 4 && step4ValidationAttempted) {
        setStep4ValidationAttempted(false);
        setStepHasErrors(prev => ({ ...prev, [4]: false }));
      }
    }
  }, [currentStep, stepValidations, step1ValidationAttempted, step2ValidationAttempted, step3ValidationAttempted, step4ValidationAttempted]);

  const steps = [
    { id: 1, title: t('tourWizard.steps.step1.title'), description: t('tourWizard.steps.step1.description') },
    { id: 2, title: t('tourWizard.steps.step2.title'), description: t('tourWizard.steps.step2.description') },
    { id: 3, title: t('tourWizard.steps.step3.title'), description: t('tourWizard.steps.step3.description') },
    { id: 4, title: t('tourWizard.steps.step4.title'), description: t('tourWizard.steps.step4.description') }
  ];

  // Determine if the form has any user-entered data
  const isDirty = useMemo(() => {
    const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
    const hasList = (v) => Array.isArray(v) && v.length > 0;
    // Only consider fields that user actually types/selects. Ignore defaults like departurePoint.
    return (
      hasText(tourData.tourName) ||
      hasText(tourData.duration) ||
      hasText(tourData.nights) ||
      hasText(tourData.tourType) ||
      hasText(tourData.maxCapacity) ||
      hasText(tourData.tourDeadline) ||
      hasText(tourData.tourExpirationDate) ||
      hasList(tourData.itinerary) ||
      hasText(tourData.adultPrice) ||
      hasText(tourData.childrenPrice) ||
      hasText(tourData.babyPrice) ||
      hasText(tourData.tourDescription) ||
      false ||
      !!tourData.thumbnail
    );
  }, [tourData]);

  // Warn on browser/tab close only when dirty
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Intercept in-app route changes (links/back) only when dirty
  useEffect(() => {
    const onPopState = () => {
      if (isDirty) {
        // Immediately push state forward to keep user on page
        try { window.history.pushState(null, ''); } catch (_) {}
        setShowLeaveConfirm(true);
        pendingNavigationRef.current = { type: 'back' };
      } else {
        // Not dirty: allow normal back navigation by removing our listener before going back
        window.removeEventListener('popstate', onPopState);
        navigate(-1);
        return;
      }
    };
    window.addEventListener('popstate', onPopState);

    // Intercept clicks on <a> links inside the wizard container
    const onClick = (ev) => {
      if (!isDirty) return; // allow normal nav if not dirty
      const anchor = ev.target.closest('a');
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.origin);
      const isSameOrigin = url.origin === window.location.origin;
      if (isSameOrigin && url.pathname !== window.location.pathname) {
        ev.preventDefault();
        setShowLeaveConfirm(true);
        pendingNavigationRef.current = { type: 'href', href: url.pathname + url.search + url.hash };
      }
    };
    document.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClick, true);
    };
  }, [isDirty, navigate]);

  const handleConfirmLeave = () => {
    // Allow closing tab without prompt
    window.removeEventListener('beforeunload', () => {});
    const pending = pendingNavigationRef.current;
    setShowLeaveConfirm(false);
    if (pending?.type === 'href' && pending.href) {
      navigate(pending.href);
    } else if (pending?.type === 'back') {
      navigate(-1);
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirm(false);
  };

  // Listen for validation status updates from step components
  useEffect(() => {
    const handleValidationStatus = (event) => {
      const { step, hasErrors } = event.detail;
      setStepHasErrors(prev => ({
        ...prev,
        [step]: hasErrors
      }));
    };

    window.addEventListener('stepValidationStatus', handleValidationStatus);
    return () => {
      window.removeEventListener('stepValidationStatus', handleValidationStatus);
    };
  }, []);

  const nextStep = () => {
    if (currentStep < 4) {
      // Check if current step is valid using stepValidations
      const stepKey = `step${currentStep}`;
      const isCurrentStepValid = stepValidations[stepKey]?.isValid;
      
      if (!isCurrentStepValid) {
        // Mark that user has attempted validation
        if (currentStep === 1) {
          setStep1ValidationAttempted(true);
          // Trigger validation in Step1BasicInfo to show inline error messages
          window.dispatchEvent(new CustomEvent('validateStep1'));
        } else if (currentStep === 2) {
          setStep2ValidationAttempted(true);
          // Trigger validation in Step2Itinerary to show error messages for missing fields
          window.dispatchEvent(new CustomEvent('validateStep2'));
        } else if (currentStep === 3) {
          setStep3ValidationAttempted(true);
          // Trigger validation in Step3Pricing to show error messages for missing fields
          window.dispatchEvent(new CustomEvent('validateStep3'));
        } else {
          // For other steps, use the original validation event
          const errors = getStepErrors(currentStep);
          window.dispatchEvent(new CustomEvent('validateStep', { detail: { step: currentStep, errors } }));
        }
        
        // Don't move to next step if there are errors
        // stepHasErrors will be updated by the validation event from step components
        return;
      } else {
        // Special handling when moving from step 1 to step 2
        if (currentStep === 1) {
          // Reset Step 2 validation attempted state when entering Step 2
          setStep2ValidationAttempted(false);
          setCurrentStep(2);
        } else if (currentStep === 2) {
          // Reset Step 3 validation attempted state when entering Step 3
          setStep3ValidationAttempted(false);
          setCurrentStep(3);
        } else if (currentStep === 3) {
          // Reset Step 4 validation attempted state when entering Step 4
          setStep4ValidationAttempted(false);
          setCurrentStep(4);
        } else {
          // For other steps, move forward normally
          setCurrentStep(currentStep + 1);
        }
        
        // Clear errors when moving to next step by dispatching clear event
        window.dispatchEvent(new CustomEvent('clearStepErrors', { detail: { step: currentStep } }));
        setStepHasErrors(prev => ({
          ...prev,
          [currentStep]: false
        }));
        
        // Reset validation attempted state for current step
        if (currentStep === 1) {
          setStep1ValidationAttempted(false);
        } else if (currentStep === 2) {
          setStep2ValidationAttempted(false);
        } else if (currentStep === 3) {
          setStep3ValidationAttempted(false);
        }
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      // Reset validation attempted state when going back
      if (currentStep === 2) {
        setStep2ValidationAttempted(false);
      } else if (currentStep === 3) {
        setStep3ValidationAttempted(false);
      } else if (currentStep === 4) {
        setStep4ValidationAttempted(false);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Clear previous errors
      setSubmitError('');
      
      // Validate final data
      if (!tourData.tourName || !tourData.thumbnail) {
        setSubmitError(t('toast.required') || 'Vui lòng điền đầy đủ thông tin');
        setIsSubmitting(false);
        return;
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Get current user data from localStorage/sessionStorage (same logic as AuthContext)
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const savedUser = storage.getItem('user');
      const token = storage.getItem('token');
      
      
      if (!savedUser || !token) {
        setSubmitError(t('toast.login_required') || 'Vui lòng đăng nhập');
        setIsSubmitting(false);
        return;
      }
      
      const userData = JSON.parse(savedUser);
      const userEmail = userData.email;
      const userRole = userData.role;
      
      
      if (!userEmail) {
        setSubmitError(t('toast.login_required') || 'Vui lòng đăng nhập');
        setIsSubmitting(false);
        return;
      }
      
      if (userRole !== 'COMPANY') {
        setSubmitError(t('toast.company_only') || 'Chỉ tài khoản công ty mới có thể tạo tour');
        setIsSubmitting(false);
        return;
      }

      // Tính tourIntDuration = Max(days, nights)
      // duration là số ngày (days), nights là số đêm
      const days = parseInt(tourData.duration) || 0;
      const nights = parseInt(tourData.nights) || 0;
      const tourIntDuration = Math.max(days, nights);

      const parseDeadline = (deadlineValue, expirationDate) => {
        if (deadlineValue === undefined || deadlineValue === null || deadlineValue === '') return null;
        const parsed = parseInt(deadlineValue, 10);
        if (Number.isNaN(parsed)) return null;
        const clamped = Math.max(0, parsed);
        if (!expirationDate) return clamped;
        const leadDays = (() => {
          const parsedDate = new Date(`${expirationDate}T00:00:00`);
          if (Number.isNaN(parsedDate.getTime())) return null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diff = Math.round((parsedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diff;
        })();
        if (leadDays === null) return clamped;
        return clamped >= leadDays ? Math.max(0, leadDays - 1) : clamped;
      };

      const expirationDate = tourData.tourExpirationDate || null;
      const deadlineDays = parseDeadline(tourData.tourDeadline, expirationDate);

      if (deadlineDays === null || !expirationDate) {
        setSubmitError(t('toast.required') || 'Vui lòng điền đầy đủ thông tin');
        setIsSubmitting(false);
        return;
      }

      const leadDaysForValidation = (() => {
        const parsedDate = new Date(`${expirationDate}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.round((parsedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      })();

      if (leadDaysForValidation === null || leadDaysForValidation < 0) {
        setSubmitError(t('toast.required') || 'Vui lòng điền đầy đủ thông tin');
        setIsSubmitting(false);
        return;
      }

      // Add tour data as JSON - Complete data with all wizard fields
      const tourRequest = {
        companyEmail: userEmail, // Use current user's email
        tourName: tourData.tourName,
        tourDescription: tourData.tourDescription || `Tour ${tourData.tourName} - ${tourData.duration} ngày ${tourData.nights} đêm`,
        tourDuration: `${tourData.duration} ngày ${tourData.nights} đêm`,
        tourIntDuration: tourIntDuration, // Max(days, nights) - duration là số ngày
        tourDeparturePoint: 'Đà Nẵng', // All tours depart from Da Nang
        tourVehicle: 'Xe du lịch', // Hardcoded as requested
        // If Step 1 captured vehicle, prefer that
        ...(tourData.vehicle ? { tourVehicle: tourData.vehicle } : {}),
        tourType: tourData.tourType,
        tourSchedule: tourData.tourSchedule || '', // User-defined schedule summary
        amount: parseInt(tourData.maxCapacity) || 30,
        adultPrice: parseFloat(tourData.adultPrice) || 0,
        childrenPrice: parseFloat(tourData.childrenPrice) || 0,
        babyPrice: parseFloat(tourData.babyPrice) || 0,
        tourDeadline: deadlineDays,
        tourExpirationDate: expirationDate,
        
        // Additional fields from wizard (bookingDeadline/surcharges removed)
        availableDates: tourData.availableDates || [],
        gallery: [], // Removed for testing
        attachments: [], // Removed for testing
        
        contents: (tourData.itinerary || []).map((day, index) => ({
          tourContentTitle: (day.dayTitle && day.dayTitle.trim()) ? day.dayTitle.trim() : `Ngày ${index + 1}`,
          tourContentDescription: day.activities || day.description || `Hoạt động ngày ${index + 1}`,
          images: day.images ? day.images.map(img => img.name) : [], // Image file names
          dayColor: day.dayColor || '#10b981',
          titleAlignment: day.titleAlignment || 'left'
        }))
      };

      // Append JSON as a Blob with explicit content type so Spring binds @RequestPart correctly
      formData.append('data', new Blob([JSON.stringify(tourRequest)], { type: 'application/json' }));
      
      // Ensure we have a valid image file
      if (tourData.thumbnail && tourData.thumbnail instanceof File) {
        formData.append('tourImage', tourData.thumbnail);
      } else {
        // Create a minimal 1x1 transparent PNG placeholder
        const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        // Convert base64 to binary
        const binaryString = atob(base64PNG);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob and file with explicit MIME type
        const blob = new Blob([bytes], { 
          type: 'image/png'
        });
        
        // Create file with explicit type and proper extension
        const imageFile = new File([blob], 'placeholder.png', { 
          type: 'image/png',
          lastModified: Date.now()
        });
        
        formData.append('tourImage', imageFile);
      }


      // Call backend API to create tour with Bearer token authentication
      const response = await fetch(getApiPath('/api/tour/create'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        const { handleApiError } = await import('../../../../utils/apiErrorHandler');
        await handleApiError(response);
        return;
      }
      
      if (response.ok) {
        setSubmitError(''); // Clear error on success
        showSuccess('toast.tour.create_success');
        navigate('/company/tours');
      } else {
          let errorData;
          try {
            errorData = await response.json();
            console.error('Tour creation error:', errorData);
            console.error('Error details:', {
              status: response.status,
              statusText: response.statusText,
              errorCode: errorData.code,
              errorMessage: errorData.message,
              errorData: errorData
            });
            setSubmitError(errorData.message || t('toast.save_error') || 'Lưu thất bại');
          } catch (e) {
            // If JSON parsing fails, get text response
            const textResponse = await response.text();
            setSubmitError(t('toast.save_error') || 'Lưu thất bại');
          }
        }
    } catch (error) {
      setSubmitError(t('toast.save_error') || 'Lưu thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Handle step click
  const handleStepClick = (stepId) => {
    // Only allow clicking on completed steps or current step
    if (isStepCompleted(stepId) || stepId === currentStep) {
      setCurrentStep(stepId);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo />;
      case 2:
        return <Step2Itinerary />;
      case 3:
        return <Step3Pricing />;
      case 4:
        return <Step4Media />;
      default:
        return null;
    }
  };

  return (
    <div className={styles['tour-wizard']}>
      {/* Progress Bar */}
      <div className={styles['progress-container']}>
        <div className={styles['progress-bar']}>
          <div 
            className={styles['progress-fill']} 
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
        <div className={styles['progress-steps']}>
        {steps.map((step) => (
          <div 
            key={step.id} 
            className={`${styles['progress-step']} ${
              currentStep === step.id ? styles['active'] : 
              isStepCompleted(step.id) ? styles['completed'] : ''
            }`}
            onClick={() => handleStepClick(step.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStepClick(step.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className={styles['step-number']}>{step.id}</div>
            <div className={styles['step-info']}>
              <div className={styles['step-title']}>{step.title}</div>
              <div className={styles['step-description']}>{step.description}</div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Step Content */}
      <div className={styles['step-content']}>
        {submitError && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#e11d48', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
            {submitError}
          </div>
        )}
        {renderCurrentStep()}
      </div>

      {/* Navigation Buttons */}
      <div className={styles['step-navigation']}>
        <button 
          type="button" 
          className={styles['btn-secondary']} 
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          {t('tourWizard.navigation.back')}
        </button>
        
         {currentStep < 4 ? (
           <button 
             type="button" 
             className={styles['btn-primary']} 
             onClick={nextStep}
             disabled={isNextButtonDisabled}
             style={{
               opacity: isNextButtonDisabled ? 0.5 : 1,
               cursor: isNextButtonDisabled ? 'not-allowed' : 'pointer'
             }}
           >
             {t('tourWizard.navigation.next')}
           </button>
        ) : (
          <button 
            type="button" 
            className={styles['btn-success']} 
            onClick={handleSubmit}
            disabled={isSubmitting || !!submitError}
          >
            {isSubmitting ? t('tourWizard.navigation.creating') : t('tourWizard.navigation.complete')}
          </button>
        )}
      </div>

      {/* Confirm Leave Modal */}
      <ConfirmLeaveModal 
        open={showLeaveConfirm}
        onCancel={handleCancelLeave}
        onConfirm={handleConfirmLeave}
      />
    </div>
  );
};

const TourWizard = () => {
  return (
    <TourWizardProvider>
      <TourWizardContent />
    </TourWizardProvider>
  );
};

export default TourWizard;
