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

  // Calculate if Next button should be disabled based on step validation errors
  const isNextButtonDisabled = useMemo(() => {
    if (currentStep >= 4) return false;
    
    // Disable if there are validation errors (from blur or from clicking Next)
    if (currentStep === 1) {
      if (stepHasErrors[1]) {
        return true;
      }
      return false;
    }
    
    if (currentStep === 2) {
      if (stepHasErrors[2]) {
        return true;
      }
      return false;
    }
    
    if (currentStep === 3) {
      if (stepHasErrors[3]) {
        return true;
      }
      // Also check stepValidations to ensure prices meet minimum requirement
      const stepKey = `step${currentStep}`;
      const isCurrentStepValid = stepValidations[stepKey]?.isValid;
      if (!isCurrentStepValid) {
        return true;
      }
      return false;
    }
    
    return false;
  }, [currentStep, stepValidations, stepHasErrors]);

  // Reset validation state when entering a new step to enable Next button
  useEffect(() => {
    if (currentStep === 1) {
      setStep1ValidationAttempted(false);
      setStepHasErrors(prev => ({ ...prev, [1]: false }));
    } else if (currentStep === 2) {
      setStep2ValidationAttempted(false);
      setStepHasErrors(prev => ({ ...prev, [2]: false }));
    } else if (currentStep === 3) {
      setStep3ValidationAttempted(false);
      setStepHasErrors(prev => ({ ...prev, [3]: false }));
    } else if (currentStep === 4) {
      setStep4ValidationAttempted(false);
      setStepHasErrors(prev => ({ ...prev, [4]: false }));
    }
    // Clear errors for the current step
    window.dispatchEvent(new CustomEvent('clearStepErrors', { detail: { step: currentStep } }));
  }, [currentStep]);

  // Reset validation attempted state when step becomes valid
  useEffect(() => {
    const stepKey = `step${currentStep}`;
    if (stepValidations[stepKey]?.isValid) {
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

  // Clear submit error when user adds thumbnail on Step 4
  useEffect(() => {
    if (currentStep === 4 && tourData.thumbnail && submitError) {
      setSubmitError('');
    }
  }, [currentStep, tourData.thumbnail, submitError]);

  const steps = [
    { id: 1, title: t('tourWizard.steps.step1.title'), description: t('tourWizard.steps.step1.description') },
    { id: 2, title: t('tourWizard.steps.step2.title'), description: t('tourWizard.steps.step2.description') },
    { id: 3, title: t('tourWizard.steps.step3.title'), description: t('tourWizard.steps.step3.description') },
    { id: 4, title: t('tourWizard.steps.step4.title'), description: t('tourWizard.steps.step4.description') }
  ];

  // Check if form has any user-entered data (for unsaved changes warning)
  const isDirty = useMemo(() => {
    const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
    const hasList = (v) => Array.isArray(v) && v.length > 0;
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

  // Warn user when closing browser/tab if form has unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Intercept navigation (browser back button and link clicks) when form has unsaved changes
  useEffect(() => {
    const onPopState = () => {
      if (isDirty) {
        try { window.history.pushState(null, ''); } catch (_) {}
        setShowLeaveConfirm(true);
        pendingNavigationRef.current = { type: 'back' };
      } else {
        window.removeEventListener('popstate', onPopState);
        navigate(-1);
        return;
      }
    };
    window.addEventListener('popstate', onPopState);

    // Intercept link clicks to show leave confirmation when form is dirty
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

  // Handle user confirmation to leave wizard (navigate to pending route)
  const handleConfirmLeave = () => {
    window.removeEventListener('beforeunload', () => {});
    const pending = pendingNavigationRef.current;
    setShowLeaveConfirm(false);
    if (pending?.type === 'href' && pending.href) {
      navigate(pending.href);
    } else if (pending?.type === 'back') {
      navigate(-1);
    }
  };

  // Cancel leaving wizard - stay on current page
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

  // Navigate to next step after validating current step
  const nextStep = () => {
    if (currentStep < 4) {
      const stepKey = `step${currentStep}`;
      const isCurrentStepValid = stepValidations[stepKey]?.isValid;
      
      if (!isCurrentStepValid) {
        // Trigger validation events to show error messages
        if (currentStep === 1) {
          setStep1ValidationAttempted(true);
          window.dispatchEvent(new CustomEvent('validateStep1'));
        } else if (currentStep === 2) {
          setStep2ValidationAttempted(true);
          window.dispatchEvent(new CustomEvent('validateStep2'));
        } else if (currentStep === 3) {
          setStep3ValidationAttempted(true);
          window.dispatchEvent(new CustomEvent('validateStep3'));
        } else {
          const errors = getStepErrors(currentStep);
          window.dispatchEvent(new CustomEvent('validateStep', { detail: { step: currentStep, errors } }));
        }
        return;
      } else {
        // Move to next step and reset validation state
        if (currentStep === 1) {
          setStep2ValidationAttempted(false);
          setCurrentStep(2);
        } else if (currentStep === 2) {
          setStep3ValidationAttempted(false);
          setCurrentStep(3);
        } else if (currentStep === 3) {
          setStep4ValidationAttempted(false);
          setCurrentStep(4);
        } else {
          setCurrentStep(currentStep + 1);
        }
        
        // Clear errors for current step
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

  // Navigate to previous step and reset validation state
  const prevStep = () => {
    if (currentStep > 1) {
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

  // Submit tour creation form: validate data, prepare FormData, and call API
  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      // Validate required fields before submission
      if (!tourData.tourName || !tourData.thumbnail) {
        const missingFieldLabel = !tourData.tourName
          ? t('tourWizard.step1.fields.tourName')
          : t('tourWizard.step4.thumbnail.title');
        setSubmitError(
          t('toast.required', { field: missingFieldLabel }) ||
          `${missingFieldLabel} là bắt buộc`
        );
        setIsSubmitting(false);
        return;
      }

      // Prepare FormData for multipart/form-data upload
      const formData = new FormData();
      
      // Get user authentication data from storage
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

      // Calculate tourIntDuration as max of days and nights
      const days = parseInt(tourData.duration) || 0;
      const nights = parseInt(tourData.nights) || 0;
      const tourIntDuration = Math.max(days, nights);

      // Parse and validate min advance days against expiration date
      const parseMinAdvance = (value, expirationDate) => {
        if (value === undefined || value === null || value === '') return null;
        const parsed = parseInt(value, 10);
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

      // Validate expiration date and minimum advance days
      const expirationDate = tourData.tourExpirationDate || null;
      const minAdvanceDays = parseMinAdvance(tourData.minAdvancedDays ?? tourData.tourDeadline, expirationDate);

      if (minAdvanceDays === null || !expirationDate) {
        const fieldLabel = t('tourWizard.step3.title');
        setSubmitError(
          t('toast.fill_missing_field', { field: fieldLabel }) ||
          'Vui lòng điền đầy đủ thông tin'
        );
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
        const fieldLabel = t('tourWizard.step3.title');
        setSubmitError(
          t('toast.fill_missing_field', { field: fieldLabel }) ||
          'Vui lòng điền đầy đủ thông tin'
        );
        setIsSubmitting(false);
        return;
      }

      // Build tour request object with all wizard data
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
        minAdvancedDays: minAdvanceDays,
        tourDeadline: minAdvanceDays, // backward compatibility
        tourCheckDays: tourData.tourCheckDays !== undefined && tourData.tourCheckDays !== null
          ? parseInt(tourData.tourCheckDays, 10) || 0
          : parseInt(tourData.checkDays || 0, 10) || 0,
        balancePaymentDays: parseInt(tourData.balancePaymentDays || 0, 10) || 0,
        depositPercentage: parseInt(tourData.depositPercentage || 0, 10) || 0,
        allowRefundableAfterBalancePayment: !!tourData.allowRefundableAfterBalancePayment,
        refundFloor: tourData.allowRefundableAfterBalancePayment
          ? (parseInt(tourData.refundFloor || 0, 10) || 0)
          : 0,
        tourExpirationDate: expirationDate,
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

      // Append tour data as JSON blob for Spring @RequestPart binding
      formData.append('data', new Blob([JSON.stringify(tourRequest)], { type: 'application/json' }));
      
      // Handle tour thumbnail image (use placeholder if not provided)
      if (tourData.thumbnail && tourData.thumbnail instanceof File) {
        formData.append('tourImage', tourData.thumbnail);
      } else {
        // Create transparent PNG placeholder if no thumbnail provided
        const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        const binaryString = atob(base64PNG);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/png' });
        const imageFile = new File([blob], 'placeholder.png', { type: 'image/png', lastModified: Date.now() });
        formData.append('tourImage', imageFile);
      }

      // Call API to create tour
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
        setSubmitError('');
        showSuccess('toast.tour.create_success');
        navigate('/company/tours');
      } else {
          let errorData;
          try {
            errorData = await response.json();
            setSubmitError(errorData.message || t('toast.save_error') || 'Lưu thất bại');
          } catch (e) {
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

  // Handle step navigation via step indicator click
  const handleStepClick = (stepId) => {
    // Only allow clicking on completed steps or current step
    if (isStepCompleted(stepId) || stepId === currentStep) {
      setCurrentStep(stepId);
    }
  };

  // Render component for current step
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
    <>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? t('tourWizard.navigation.creating') : t('tourWizard.navigation.complete')}
            </button>
          )}
        </div>
      </div>

      {/* Confirm Leave Modal - Rendered outside wizard container */}
      <ConfirmLeaveModal 
        open={showLeaveConfirm}
        onCancel={handleCancelLeave}
        onConfirm={handleConfirmLeave}
      />
    </>
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
