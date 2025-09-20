import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../contexts/ToastContext';
import { TourWizardProvider, useTourWizardContext } from '../../../../contexts/TourWizardContext';
import { useStepValidation } from '../../../../hooks/useStepValidation';
import Step1BasicInfo from './components/Step1/Step1BasicInfo';
import Step2Itinerary from './components/Step2/Step2Itinerary';
import Step3Pricing from './components/Step3/Step3Pricing';
import Step4Media from './components/Step4/Step4Media';
import './TourWizard.css';
import { ConfirmLeaveModal } from '../../../../components/modals';

const TourWizardContent = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showError, showSuccess, showBatch } = useToast();
  const { tourData } = useTourWizardContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingNavigationRef = useRef(null);
  
  // Use custom hook for step validation
  const { isStepCompleted, getStepErrors } = useStepValidation(tourData);

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


  const nextStep = () => {
    if (currentStep < 4) {
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

  const prevStep = () => {
    if (currentStep > 1) {
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
      
      // Validate final data
      if (!tourData.tourName || !tourData.thumbnail) {
        showError({ i18nKey: 'toast.required', values: { field: t('tourWizard.step1.title') } });
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
        showError('toast.login_required');
        setIsSubmitting(false);
        return;
      }
      
      const userData = JSON.parse(savedUser);
      const userEmail = userData.email;
      const userRole = userData.role;
      
      
      if (!userEmail) {
        showError('toast.login_required');
        setIsSubmitting(false);
        return;
      }
      
      if (userRole !== 'COMPANY') {
        showError('toast.company_only');
        setIsSubmitting(false);
        return;
      }

      // Add tour data as JSON - Complete data with all wizard fields
      const tourRequest = {
        companyEmail: userEmail, // Use current user's email
        tourName: tourData.tourName,
        tourDescription: tourData.tourDescription || `Tour ${tourData.tourName} - ${tourData.duration} ngày ${tourData.nights} đêm`,
        tourDuration: `${tourData.duration} ngày ${tourData.nights} đêm`,
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


      // Call backend API to create tour
      // Note: Backend endpoint /api/tour/create is public, no auth required
      const response = await fetch('/api/tour/create', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        showSuccess('toast.tour.create_success');
        navigate('/business/tours');
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
            showError(errorData.message || 'toast.save_error');
          } catch (e) {
            // If JSON parsing fails, get text response
            const textResponse = await response.text();
            console.error('Tour creation error (text):', textResponse);
            console.error('Response status:', response.status);
            console.error('Response headers:', Object.fromEntries(response.headers.entries()));
            showError('toast.save_error');
          }
        }
    } catch (error) {
      console.error('Error creating tour:', error);
      showError('toast.save_error');
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
    <div className="tour-wizard">
      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
        <div className="progress-steps">
        {steps.map((step) => (
          <div 
            key={step.id} 
            className={`progress-step ${
              currentStep === step.id ? 'active' : 
              isStepCompleted(step.id) ? 'completed' : ''
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
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          {t('tourWizard.navigation.back')}
        </button>
        
        {currentStep < 4 ? (
          <button 
            type="button" 
            className="btn-primary" 
            onClick={nextStep}
          >
            {t('tourWizard.navigation.next')}
          </button>
        ) : (
          <button 
            type="button" 
            className="btn-success" 
            onClick={handleSubmit}
            disabled={isSubmitting}
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
