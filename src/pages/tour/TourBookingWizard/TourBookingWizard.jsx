import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTourBooking } from '../../../hooks/useTourBooking';
import { formatBookingData, validateBookingData } from '../../../utils/bookingFormatter';
import { useBookingAPI } from '../../../hooks/useBookingAPI';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useBookingStepValidation } from '../../../hooks/useBookingStepValidation';
import { useTranslation } from 'react-i18next';
import ConfirmLeaveModal from '../../../components/modals/ConfirmLeaveModal/ConfirmLeaveModal';
import PaymentConfirmModal from '../../../components/modals/PaymentConfirmModal/PaymentConfirmModal';
import TourFullyBookedModal from '../../../components/modals/TourFullyBookedModal/TourFullyBookedModal';
import Step1Contact from './steps/Step1Contact/Step1Contact';
import Step2Details from './steps/Step2Details/Step2Details';
import Step3Review from './steps/Step3Review/Step3Review';
import styles from './TourBookingWizard.module.css';

const STEPS = [
  { id: 1, titleKey: 'bookingWizard.steps.step1.title', descKey: 'bookingWizard.steps.step1.description' },
  { id: 2, titleKey: 'bookingWizard.steps.step2.title', descKey: 'bookingWizard.steps.step2.description' },
  { id: 3, titleKey: 'bookingWizard.steps.step3.title', descKey: 'bookingWizard.steps.step3.description' }
];

const BookingWizardContent = () => {
  const [searchParams] = useSearchParams();
  const tourId = searchParams.get('id');
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { showSuccess } = useToast();
  const { user, loading: authLoading } = useAuth();
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
    clearBookingStatus,
    restoreBookingData
  } = useTourBooking();

  // Track if we've restored data to avoid duplicate restores
  const hasRestoredRef = useRef(false);
  const { createBookingAPI } = useBookingAPI();

  const [currentStep, setCurrentStep] = useState(1);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTourFullyBookedModal, setShowTourFullyBookedModal] = useState(false);
  const [tourFullyBookedMessage, setTourFullyBookedMessage] = useState('');
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [hasConfirmedLeave, setHasConfirmedLeave] = useState(false);
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false);
  const [step2ValidationAttempted, setStep2ValidationAttempted] = useState(false);
  const [step2HasErrors, setStep2HasErrors] = useState(false);

  // Tạo key từ contact và plan để theo dõi thay đổi và auto-save
  const contactKey = useMemo(() => contact ? JSON.stringify(contact) : '', [contact]);
  const planKey = useMemo(() => plan ? JSON.stringify(plan) : '', [plan]);
  const lastSavedRef = useRef('');
  const isRestoringRef = useRef(false);
  const skipNextAutoSaveRef = useRef(false);

  // Auto-save booking data vào localStorage khi contact hoặc plan thay đổi
  // Bỏ qua khi đang restore hoặc skipNextAutoSave được set
  useEffect(() => {
    if (isRestoringRef.current || skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    if (contactKey && planKey && tourId) {
      const currentKey = `${contactKey}_${planKey}_${tourId}`;

      // Chỉ save nếu key thay đổi và không phải key rỗng
      if (currentKey !== lastSavedRef.current && currentKey !== '___') {
        try {
          const bookingData = {
            contact,
            plan,
            timestamp: Date.now(),
            tourId: tourId
          };
          localStorage.setItem(`bookingData_${tourId}`, JSON.stringify(bookingData));
          lastSavedRef.current = currentKey;
        } catch (error) {
        }
      }
    }
  }, [contactKey, planKey, tourId]);

  // Cảnh báo khi user đóng tab/refresh nếu đã có dữ liệu nhập vào
  // Lưu flag vào localStorage để biết user đã xác nhận rời trang
  useEffect(() => {
    const hasData = contact && (contact.fullName || contact.phone || contact.email) &&
      plan && (plan.date || plan.pax);

    const handler = (e) => {
      if (!hasData || !tourId) return;
      e.preventDefault();
      e.returnValue = '';
      try {
        localStorage.setItem(`hasConfirmedLeave_${tourId}`, 'true');
      } catch (_) { }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [contactKey, planKey, tourId]);

  // Chặn navigation khi user click link nếu đã có dữ liệu nhập vào
  // Cho phép điều hướng đến /tour/ và /payment/ mà không cần xác nhận
  useEffect(() => {
    const hasData = contact && (contact.fullName || contact.phone || contact.email) &&
      plan && (plan.date || plan.pax);

    const onClick = (ev) => {
      if (!hasData) return; // Cho phép navigation bình thường nếu chưa có dữ liệu
      const anchor = ev.target.closest('a');
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.origin);
      const isSameOrigin = url.origin === window.location.origin;
      // Chặn navigation nếu là same origin và không phải /tour/ hoặc /payment/
      if (isSameOrigin && url.pathname !== window.location.pathname &&
        !url.pathname.includes('/tour/') && !url.pathname.includes('/payment/')) {
        ev.preventDefault();
        setShowLeaveModal(true);
        setPendingNavigation(url.pathname + url.search + url.hash);
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [contactKey, planKey]);

  const { getStepErrors, isStepCompleted, stepValidations } = useBookingStepValidation({ contact, plan, user });

  useEffect(() => {
    if (currentStep === 1 && stepValidations.step1?.isValid) {
      setStep1ValidationAttempted(false);
    }
  }, [currentStep, stepValidations.step1?.isValid]);

  useEffect(() => {
    if (currentStep === 2 && stepValidations.step2?.isValid) {
      setStep2ValidationAttempted(false);
    }
  }, [currentStep, stepValidations.step2?.isValid]);

  // Listen for step2 validation status events from Step2Details
  useEffect(() => {
    const handleStep2ValidationStatus = (event) => {
      const { hasErrors } = event.detail;
      setStep2HasErrors(hasErrors);
    };

    window.addEventListener('step2ValidationStatus', handleStep2ValidationStatus);
    return () => {
      window.removeEventListener('step2ValidationStatus', handleStep2ValidationStatus);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      localStorage.setItem('returnAfterLogin', window.location.pathname);
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && user && user.role === 'COMPANY') {
      setBookingError(t('bookingWizard.toast.companyNotAllowedError') || 'Tài khoản công ty không thể đặt tour');
    }
  }, [authLoading, user]);

  useEffect(() => {
    hasRestoredRef.current = false;
  }, [tourId]);

  useEffect(() => {
    if (location.state?.clearExistingData) {
      try {
        localStorage.removeItem(`bookingData_${tourId}`);
        localStorage.removeItem(`hasConfirmedLeave_${tourId}`);
        localStorage.removeItem(`existingBookingId_${tourId}`);
        resetBooking();
        setCurrentStep(1);
        hasRestoredRef.current = true;
      } catch (error) {
      }
      return;
    }

    if (location.state?.step && location.state.step >= 1 && location.state.step <= 3) {
      setCurrentStep(location.state.step);
    }
  }, [location, tourId, resetBooking]);

  useEffect(() => {
    if (user && !hasRestoredRef.current) {
      if (location.state?.clearExistingData) {
        hasRestoredRef.current = true;
        return;
      }

      const hasConfirmedLeaveFlag = localStorage.getItem(`hasConfirmedLeave_${tourId}`);
      if (hasConfirmedLeaveFlag === 'true') {
        resetBooking();
        try {
          localStorage.removeItem(`hasConfirmedLeave_${tourId}`);
        } catch (error) {
        }
        hasRestoredRef.current = true;
        return;
      }

      try {
        const savedBookingData = localStorage.getItem(`bookingData_${tourId}`);
        if (savedBookingData) {
          const parsedData = JSON.parse(savedBookingData);

          isRestoringRef.current = true;

          if (parsedData.contact || parsedData.plan) {
            isRestoringRef.current = true;
            skipNextAutoSaveRef.current = true;

            restoreBookingData({
              contact: parsedData.contact || null,
              plan: parsedData.plan || null
            });

            const savedKey = `${JSON.stringify(parsedData.contact || {})}_${JSON.stringify(parsedData.plan || {})}_${tourId}`;
            lastSavedRef.current = savedKey;

            setTimeout(() => {
              isRestoringRef.current = false;
            }, 500);
          }
        } else {
          resetBooking();
        }

        hasRestoredRef.current = true;
      } catch (error) {
        isRestoringRef.current = false;
        resetBooking();
        hasRestoredRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, user]);

  const handleNext = () => {
      if (currentStep < STEPS.length) {
      const currentStepKey = `step${currentStep}`;
      const isCurrentStepValid = stepValidations[currentStepKey]?.isValid;

      if (!isCurrentStepValid) {
        if (currentStep === 1) {
          setStep1ValidationAttempted(true);
          window.dispatchEvent(new CustomEvent('validateStep1'));
        } else if (currentStep === 2) {
          setStep2ValidationAttempted(true);
          window.dispatchEvent(new CustomEvent('validateStep2'));
        } else {
          // Step 3 validation errors are handled by individual step components
          // No need to show toast errors here
        }
      } else {
        if (currentStep === 1) {
          if (plan.members.adult.length > 0) {
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

          if (plan.pax.adult < 1) {
            setPax({ ...plan.pax, adult: 1 });
          }

          setTimeout(() => {
            rebuildMembers();
          }, 0);

          try {
            const bookingData = {
              contact,
              plan,
              timestamp: Date.now(),
              tourId: tourId
            };
            localStorage.setItem(`bookingData_${tourId}`, JSON.stringify(bookingData));
          } catch (error) {
          }

          setStep1ValidationAttempted(false);
          setStep2ValidationAttempted(false);
          setCurrentStep(2);
        } else {
          try {
            const bookingData = {
              contact,
              plan,
              timestamp: Date.now(),
              tourId: tourId
            };
            localStorage.setItem(`bookingData_${tourId}`, JSON.stringify(bookingData));
          } catch (error) {
          }

          if (currentStep === 2) {
            setStep2ValidationAttempted(false);
            setStep2HasErrors(false); // Reset errors when successfully moving to next step
          }

          setCurrentStep(currentStep + 1);
        }
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 2) {
        setStep2ValidationAttempted(false);
        setStep2HasErrors(false); // Reset errors when leaving step 2
      } else if (currentStep === 1) {
        setStep1ValidationAttempted(false);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePaymentClick = () => {
    setShowPaymentModal(true);
  };

  const handleConfirm = async () => {
    setShowPaymentModal(false); // Close modal before processing
    const currentLanguage = (i18n && i18n.language) ? i18n.language : 'vi';

    const priceValidation = {
      adult: plan.price?.adult !== null && plan.price?.adult !== undefined && plan.price.adult >= 0,
      child: plan.price?.child !== null && plan.price?.child !== undefined && plan.price.child >= 0,
      infant: plan.price?.infant !== null && plan.price?.infant !== undefined && plan.price.infant >= 0,
    };

    if (plan.pax.adult > 0 && (!priceValidation.adult || plan.price.adult === null || plan.price.adult === undefined)) {
      setBookingError(t('bookingWizard.toast.missingTourPrices') || 'Tour chưa được thiết lập giá. Vui lòng liên hệ hỗ trợ.');
      setBookingLoading(false);
      return;
    }

    if (plan.pax.child > 0 && (!priceValidation.child || plan.price.child === null || plan.price.child === undefined)) {
      setBookingError(t('bookingWizard.toast.missingTourPrices') || 'Tour chưa được thiết lập giá. Vui lòng liên hệ hỗ trợ.');
      setBookingLoading(false);
      return;
    }

    if (plan.pax.infant > 0 && (!priceValidation.infant || plan.price.infant === null || plan.price.infant === undefined)) {
      setBookingError(t('bookingWizard.toast.missingTourPrices') || 'Tour chưa được thiết lập giá. Vui lòng liên hệ hỗ trợ.');
      setBookingLoading(false);
      return;
    }

    const totalPrice = plan.price?.total || plan.total || 0;
    if (!totalPrice || totalPrice <= 0) {
      setBookingError(t('bookingWizard.toast.missingTourPrices') || 'Tour chưa được thiết lập giá. Vui lòng liên hệ hỗ trợ.');
      setBookingLoading(false);
      return;
    }

    let voucherCode = '';
    try {
      const savedData = localStorage.getItem(`bookingData_${tourId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        voucherCode = parsed.voucherCode || '';
      }
    } catch (err) {
    }

    let bookingData;
    try {
      bookingData = formatBookingData({ contact, plan, voucherCode }, tourId, currentLanguage, user.email);
    } catch (error) {
      setBookingError(error?.message || t('bookingWizard.toast.formatDataError') || 'Lỗi định dạng dữ liệu');
      return;
    }

    const validation = validateBookingData(bookingData);
    if (!validation.isValid) {
      setBookingError(t('bookingWizard.toast.validationError', { errors: validation.errors.join(', ') }) || 'Dữ liệu không hợp lệ');
      return;
    }

    setBookingError('');

    try {
      const finalBookingData = {
        contact,
        plan,
        timestamp: Date.now(),
        tourId
      };
      localStorage.setItem(`bookingData_${tourId}`, JSON.stringify(finalBookingData));
    } catch (error) {
    }

    clearBookingStatus();
    setBookingLoading(true);


    try {
      const createdBooking = await createBookingAPI(bookingData);

      if (!createdBooking || !createdBooking.bookingId) {
        throw new Error('Invalid booking response from server. Please try again.');
      }

      setBookingSuccess(createdBooking);

      try {
        localStorage.removeItem(`bookingData_${tourId}`);
        localStorage.removeItem(`hasConfirmedLeave_${tourId}`);
      } catch (_) { }

      resetBooking();

      showSuccess(t('bookingWizard.toast.bookingSuccess'));

      const voucherCodeFromBooking = bookingData.voucherCode || null;
      
      navigate(`/booking/payment?id=${createdBooking.bookingId}`, {
        state: {
          bookingId: createdBooking.bookingId,
          userEmail: createdBooking.contactEmail || bookingData.userEmail,
          booking: createdBooking,
          voucherCode: voucherCodeFromBooking
        }
      });
    } catch (error) {
      const message = error?.message || t('bookingWizard.toast.bookingError') || 'Đặt tour thất bại';

      // Check if error is tour fully booked
      if (message.includes('The tour is fully booked') || 
          message.includes('fully booked') || 
          message.toLowerCase().includes('tour is fully booked')) {
        setTourFullyBookedMessage(message);
        setShowTourFullyBookedModal(true);
        setBookingError('');
      } else {
        setBookingError(message);
        if (message === 'Unauthenticated' || message.toLowerCase().includes('unauthenticated')) {
          navigate('/login');
        }
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const isStepCompletedByValidation = (stepId) => {
    return isStepCompleted(stepId);
  };

  const handleStepClick = (stepId) => {
    if (isStepCompletedByValidation(stepId) || stepId === currentStep) {
      if (currentStep === 1 && stepId !== 1) {
        setStep1ValidationAttempted(false);
      }
      if (currentStep === 2 && stepId !== 2) {
        setStep2ValidationAttempted(false);
      }
      setCurrentStep(stepId);
    }
  };

  const handleNavigation = (path) => {
    const hasData = contact && (contact.fullName || contact.phone || contact.email) &&
      plan && (plan.date || plan.pax);

    if (hasData) {
      setPendingNavigation(path);
      setShowLeaveModal(true);
    } else {
      navigate(path);
    }
  };

  const handleConfirmLeave = () => {
    window.removeEventListener('beforeunload', () => { });
    setShowLeaveModal(false);

    try {
      localStorage.removeItem(`bookingData_${tourId}`);
      localStorage.setItem(`hasConfirmedLeave_${tourId}`, 'true');
    } catch (error) {
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
              <h2>🚫 {t('bookingWizard.auth.accessDeniedTitle')}</h2>
              <p>{t('bookingWizard.auth.companyNotAllowed')}</p>
              <button
                type="button"
                className={styles['btn-primary']}
                onClick={() => navigate(`/tour/detail?id=${tourId}`)}
              >
                {t('bookingWizard.navigation.backtoTour')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['wizard-fullscreen-bg']}>
      <div className={styles['tour-booking-wizard']}>
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

        <div className={styles['step-content']}>
          {renderCurrentStep()}
        </div>

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
              disabled={(() => {
                if (currentStep === 1) {
                  if (!step1ValidationAttempted) {
                    return false;
                  }
                  const currentStepKey = `step${currentStep}`;
                  const isCurrentStepValid = stepValidations[currentStepKey]?.isValid;
                  return !isCurrentStepValid;
                }

                if (currentStep === 2) {
                  const currentStepKey = `step${currentStep}`;
                  const isCurrentStepValid = stepValidations[currentStepKey]?.isValid;
                  // Always check if step2 has errors from Step2Details component (e.g., totalGuests validation)
                  // If there are errors, disable Next button even if user hasn't attempted validation yet
                  if (step2HasErrors) {
                    return true; // Disable button if there are errors
                  }
                  // If no errors, check normal validation flow
                  if (!step2ValidationAttempted) {
                    return false;
                  }
                  return !isCurrentStepValid;
                }

                const currentStepKey = `step${currentStep}`;
                const isCurrentStepValid = stepValidations[currentStepKey]?.isValid;
                return !isCurrentStepValid;
              })()}
            >
              {t('bookingWizard.navigation.next')}
            </button>
          ) : (
            <button
              type="button"
              className={styles['btn-success']}
              onClick={handlePaymentClick}
              disabled={booking.loading || !!booking.error}
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

        <ConfirmLeaveModal
          open={showLeaveModal}
          onCancel={handleCancelLeave}
          onConfirm={handleConfirmLeave}
        />

        <PaymentConfirmModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handleConfirm}
          modalKey="wizard"
          loading={booking.loading}
        />

        <TourFullyBookedModal
          isOpen={showTourFullyBookedModal}
          onClose={() => setShowTourFullyBookedModal(false)}
          message={tourFullyBookedMessage}
        />

      </div>
    </div>
  );
};

const TourBookingWizard = () => {
  return <BookingWizardContent />;
};

export default TourBookingWizard;
