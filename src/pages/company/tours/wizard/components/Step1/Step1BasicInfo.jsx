import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import { DatePicker } from 'react-rainbow-components';
import {
  Calendar,
  FileText,
  Layers,
  Clock,
  Moon,
  Users,
  CalendarDays,
  ClipboardList,
  AlertTriangle
} from 'lucide-react';
import styles from './Step1BasicInfo.module.css';

const DEFAULT_NIGHTS_FOR_ONE_DAY = 0; // đổi thành 1 nếu muốn mặc định là 1 đêm
const MAX_LEAD_DAYS = 365;

const Step1BasicInfo = () => {
  const { t } = useTranslation();
  const { tourData, updateTourData } = useTourWizardContext();
  const datePickerRef = useRef(null); // Ref to interact with hidden DatePicker
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    tourName: '',
    departurePoint: t('common.departurePoints.daNang'), // kept for compatibility but hidden
    vehicle: t('common.vehicles.tourBus'),
    duration: '',
    nights: '',
    tourType: '',
    maxCapacity: '',
    tourDeadline: '',
    minAdvancedDays: '',
    tourExpirationDate: '',
    checkDays: '',
    balancePaymentDays: '',
    allowRefundableAfterBalancePayment: false,
    refundFloor: '',
    depositPercentage: ''
  });

  // Helpers
  const clearFieldError = (name) => {
    setFieldErrors(prev => {
      if (!prev[name]) return prev;
      const newErrors = { ...prev };
      delete newErrors[name];
      // Notify parent about validation status change
      const hasErrors = Object.keys(newErrors).length > 0;
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('stepValidationStatus', {
          detail: { step: 1, hasErrors }
        }));
      }, 0);
      return newErrors;
    });
  };

  const handleFieldFocus = (e) => {
    const { name } = e.target;
    clearFieldError(name);
  };

  const preventInvalidNumberKeys = (e) => {
    const invalidKeys = ['e', 'E', '+', '-', '.'];
    if (invalidKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  // Nights rules:
  // - If duration = 0 → allowed nights = 1 only
  // - Otherwise allowed range = [duration - 1, duration + 1], with lower bound >= 0
  const getAllowedNightsRange = (days) => {
    const d = parseInt(days || 0, 10);
    if (isNaN(d)) return { min: 0, max: 0, suggest: 0 };
    if (d === 0) return { min: 1, max: 1, suggest: 1 };
    const min = Math.max(0, d - 1); // This allows 0 nights when d=1
    const max = d + 1;
    const suggest = Math.max(min, d - 1);
    return { min, max, suggest };
  };

  const formatAllowedNights = (days) => {
    const d = parseInt(days || 0, 10);
    if (isNaN(d)) return '';
    if (d === 0) return '1';
    const values = Array.from(new Set([Math.max(0, d - 1), d, d + 1]));
    return values.join(', ');
  };

  const calculateLeadDays = (isoDate) => {
    if (!isoDate) return null;
    const parsed = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = parsed.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const enforceCutoffLimit = (draft) => {
    // Validate: Minimum Advance Days must be strictly less than booking cut-off (tourExpirationDate)
    // Only allow when leadDays > minAdvancedDays (i.e., leadDays >= minAdvancedDays + 1)
    if (!draft.tourExpirationDate || draft.minAdvancedDays === '') return draft;
    const leadDays = calculateLeadDays(draft.tourExpirationDate);
    if (leadDays === null || leadDays < 0) return draft;
    const minDaysNum = parseInt(draft.minAdvancedDays, 10);
    if (Number.isNaN(minDaysNum)) return draft;

    // Error if minAdvancedDays >= leadDays (only allow when leadDays > minAdvancedDays)
    if (minDaysNum >= leadDays) {
      setFieldErrors((prev) => ({
        ...prev,
        tourDeadline: t('tourWizard.step1.errors.minAdvancedExceedsCutoff', {
          cutoff: leadDays
        }) || `Minimum booking days cannot exceed "${leadDays}" booking closing days. Please re-enter Check days and Balance payment days.`
      }));
    } else {
      // Clear cutoff error if within range (leadDays > minAdvancedDays)
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.tourDeadline;
        return next;
      });
    }
    return draft;
  };

  // Update form data when tourData changes
  useEffect(() => {
    setFormData({
      tourName: tourData.tourName || '',
      departurePoint: tourData.tourDeparturePoint || tourData.departurePoint || t('common.departurePoints.daNang'),
      vehicle: tourData.vehicle || t('common.vehicles.tourBus'),
      duration: tourData.duration || '',
      nights: tourData.nights || '',
      tourType: tourData.tourType || '',
      maxCapacity: tourData.maxCapacity || '',
      tourDeadline: tourData.minAdvancedDays !== undefined && tourData.minAdvancedDays !== null
        ? String(tourData.minAdvancedDays)
        : (tourData.tourDeadline !== undefined && tourData.tourDeadline !== null ? String(tourData.tourDeadline) : ''),
      minAdvancedDays: tourData.minAdvancedDays !== undefined && tourData.minAdvancedDays !== null
        ? String(tourData.minAdvancedDays)
        : (tourData.tourDeadline !== undefined && tourData.tourDeadline !== null ? String(tourData.tourDeadline) : ''),
      tourExpirationDate: tourData.tourExpirationDate || '',
      checkDays: tourData.tourCheckDays !== undefined && tourData.tourCheckDays !== null
        ? String(tourData.tourCheckDays)
        : (tourData.checkDays !== undefined && tourData.checkDays !== null ? String(tourData.checkDays) : ''),
      balancePaymentDays: tourData.balancePaymentDays !== undefined && tourData.balancePaymentDays !== null ? String(tourData.balancePaymentDays) : '',
      allowRefundableAfterBalancePayment: !!tourData.allowRefundableAfterBalancePayment,
      refundFloor: tourData.refundFloor !== undefined && tourData.refundFloor !== null ? String(tourData.refundFloor) : '',
      depositPercentage: tourData.depositPercentage !== undefined && tourData.depositPercentage !== null ? String(tourData.depositPercentage) : ''
    });
  }, [tourData]);

  // Listen for validation trigger from parent (TourWizard) - similar to Step1Contact in TourBookingWizard
  useEffect(() => {
    const handleValidateAll = () => {
      // Validate all required fields and show errors
      const errors = {};
      const requiredFields = [
        { key: 'tourName', errorKey: 'tourWizard.step1.fields.tourName' },
        { key: 'duration', errorKey: 'tourWizard.step1.fields.duration' },
        { key: 'nights', errorKey: 'tourWizard.step1.fields.nights' },
        { key: 'tourType', errorKey: 'tourWizard.step1.fields.tourType' },
        { key: 'maxCapacity', errorKey: 'tourWizard.step1.fields.numberOfAvailableTours' },
        { key: 'tourDeadline', errorKey: 'tourWizard.step1.fields.tourDeadline', checkEmpty: true },
        { key: 'tourExpirationDate', errorKey: 'tourWizard.step1.fields.tourExpirationDate' },
        { key: 'checkDays', errorKey: 'tourWizard.step1.fields.checkDays' },
        { key: 'balancePaymentDays', errorKey: 'tourWizard.step1.fields.balancePaymentDays' },
        { key: 'depositPercentage', errorKey: 'tourWizard.step1.fields.depositPercentage' }
      ];

      requiredFields.forEach(({ key, errorKey, checkEmpty }) => {
        const value = formData[key];
        if (checkEmpty) {
          if (value === '' || value === undefined || value === null) {
            errors[key] = t('toast.required', { field: t(errorKey) }) || `${t(errorKey)} là bắt buộc`;
          }
        } else {
          if (!value) {
            errors[key] = t('toast.required', { field: t(errorKey) }) || `${t(errorKey)} là bắt buộc`;
          }
        }
      });

      if (formData.allowRefundableAfterBalancePayment) {
        if (formData.refundFloor === '' || formData.refundFloor === undefined || formData.refundFloor === null) {
          errors.refundFloor =
            t('toast.required', { field: t('tourWizard.step1.fields.refundFloor', 'Refund floor') }) ||
            `${t('tourWizard.step1.fields.refundFloor', 'Refund floor')} là bắt buộc`;
        } else {
          const rf = parseInt(formData.refundFloor, 10);
          if (Number.isNaN(rf) || rf < 1 || rf > 100) {
            errors.refundFloor = t('toast.field_invalid') || 'Giá trị không hợp lệ';
          }
        }
      }

      setFieldErrors(errors);
      // Notify parent about validation status
      window.dispatchEvent(new CustomEvent('stepValidationStatus', {
        detail: { step: 1, hasErrors: Object.keys(errors).length > 0 }
      }));

      // Scroll to first error field if there are errors
      if (Object.keys(errors).length > 0) {
        setTimeout(() => {
          const firstErrorKey = Object.keys(errors)[0];
          const errorElement = document.getElementById(firstErrorKey) ||
            document.querySelector(`[name="${firstErrorKey}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorElement.focus();
          }
        }, 100);
      }
    };

    const handleClearErrors = () => {
      setFieldErrors({});
      // Notify parent that errors are cleared
      window.dispatchEvent(new CustomEvent('stepValidationStatus', {
        detail: { step: 1, hasErrors: false }
      }));
    };

    window.addEventListener('validateStep1', handleValidateAll);
    window.addEventListener('clearStepErrors', (event) => {
      if (event.detail?.step === 1) {
        handleClearErrors();
      }
    });
    return () => {
      window.removeEventListener('validateStep1', handleValidateAll);
      window.removeEventListener('clearStepErrors', handleClearErrors);
    };
  }, [formData, t]);

  // When duration changes, suggest nights and clamp within allowed range
  useEffect(() => {
    const { min, max, suggest } = getAllowedNightsRange(formData.duration);
    let nightsNum = formData.nights === '' ? '' : parseInt(formData.nights, 10);
    if (formData.duration === '') {
      // don't suggest if empty
      return;
    }
    if (formData.nights === '' && formData.duration !== '') {
      // Only suggest visually; avoid setState during render chain of another component
      return;
    }
    if (!isNaN(nightsNum)) {
      const clamped = Math.max(min, Math.min(max, nightsNum));
      if (clamped !== nightsNum) {
        setFieldErrors(prev => ({ ...prev, nights: t('toast.field_invalid') || 'Giá trị không hợp lệ' }));
        setFormData((prev) => {
          const next = { ...prev, nights: clamped };
          updateTourData(next);
          return next;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.duration]);

  const tourTypes = [
    { value: 'resort', i18nKey: 'common.tourTypes.resort' },
    { value: 'culture', i18nKey: 'common.tourTypes.culture' },
    { value: 'adventure', i18nKey: 'common.tourTypes.adventure' },
    { value: 'team-building', i18nKey: 'common.tourTypes.teamBuilding' },
    { value: 'food', i18nKey: 'common.tourTypes.food' },
    { value: 'photography', i18nKey: 'common.tourTypes.photography' },
    { value: 'religious', i18nKey: 'common.tourTypes.religious' },
    { value: 'other', i18nKey: 'common.tourTypes.other' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Clear error for this field when user starts typing
    if (fieldErrors[name]) {
      clearFieldError(name);
    }
    let nextValue = type === 'checkbox' ? checked : value;

    // Normalize numeric fields
    if (type === 'checkbox') {
      const updated = { ...formData, [name]: nextValue };
      // When disabling refundable, clear refund floor to 0
      if (name === 'allowRefundableAfterBalancePayment' && !nextValue) {
        updated.refundFloor = '0';
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.refundFloor;
          return newErrors;
        });
        setFormData(updated);
        updateTourData(updated);
        return;
      }
      // When enabling refundable, set default refund floor to 1
      if (name === 'allowRefundableAfterBalancePayment' && nextValue) {
        updated.refundFloor = '1';
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.refundFloor;
          return newErrors;
        });
        setFormData(updated);
        updateTourData(updated);
        return;
      }
      setFormData(updated);
      updateTourData(updated);
      return;
    }

    if (['duration', 'nights', 'maxCapacity', 'checkDays', 'balancePaymentDays', 'depositPercentage', 'refundFloor'].includes(name)) {
      // Strip non-digits
      nextValue = String(nextValue).replace(/[^0-9]/g, '');
      if (nextValue === '') {
        // allow empty while typing
        if (name === 'checkDays' || name === 'balancePaymentDays') {
          const updated = {
            ...formData,
            [name]: '',
            minAdvancedDays: '',
            tourDeadline: '',
            balancePaymentDays: name === 'balancePaymentDays' ? '' : formData.balancePaymentDays,
            checkDays: name === 'checkDays' ? '' : formData.checkDays
          };
          const adjusted = enforceCutoffLimit(updated);
          setFormData(adjusted);
          updateTourData(adjusted);
          clearFieldError('tourDeadline');
          clearFieldError('checkDays');
          clearFieldError('balancePaymentDays');
          return;
        }
      } else {
        const num = parseInt(nextValue, 10);
        if (name === 'duration') {
          // allow 0..365
          const days = Math.max(0, Math.min(365, num));
          nextValue = String(days);
          // Auto-suggest nights when days changed
          const { min, max, suggest } = getAllowedNightsRange(days);
          const currentNights = formData.nights === '' ? '' : parseInt(formData.nights, 10);
          let newNights = currentNights;
          if (formData.nights === '') {
            // Khi người dùng nhập 1 ngày và ô nights đang rỗng → tự gán 0 (hoặc 1 nếu muốn)
            newNights = (days === 1) ? DEFAULT_NIGHTS_FOR_ONE_DAY : suggest;
            // Clear error for nights when it's auto-filled from duration
            setFieldErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.nights;
              const hasErrors = Object.keys(newErrors).length > 0;
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('stepValidationStatus', {
                  detail: { step: 1, hasErrors }
                }));
              }, 0);
              return newErrors;
            });
          } else if (!isNaN(currentNights)) {
            // Check if current nights value is within allowed range
            const allowedChoices = [Math.max(0, days - 1), days, days + 1];
            if (allowedChoices.includes(currentNights)) {
              newNights = currentNights; // Keep the current value if it's valid
              // Clear error for nights if it's valid
              if (fieldErrors.nights) {
                setFieldErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.nights;
                  const hasErrors = Object.keys(newErrors).length > 0;
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', {
                      detail: { step: 1, hasErrors }
                    }));
                  }, 0);
                  return newErrors;
                });
              }
            } else {
              const clamped = Math.max(min, Math.min(max, currentNights));
              // Không hiển thị toast khi thay đổi số ngày; chỉ âm thầm điều chỉnh
              newNights = clamped;
              // Clear error for nights when it's auto-adjusted and valid
              if (fieldErrors.nights) {
                setFieldErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.nights;
                  const hasErrors = Object.keys(newErrors).length > 0;
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', {
                      detail: { step: 1, hasErrors }
                    }));
                  }, 0);
                  return newErrors;
                });
              }
            }
          }
          // Tính tourIntDuration = Max(days, nights)
          // days là số ngày, nights là số đêm
          const nightsNum = newNights === '' ? 0 : newNights;
          const tourIntDuration = Math.max(days, nightsNum);

          // Apply both fields together
          const updated = {
            ...formData,
            duration: String(days),
            nights: String(newNights),
            tourIntDuration: tourIntDuration
          };
          setFormData(updated);
          updateTourData(updated);
          return; // early return to avoid the generic update below
        } else if (name === 'nights') {
          const d = parseInt(formData.duration || 0, 10);
          // Allowed discrete values: d-1, d, d+1 (for d>0); for d=0 only 1
          let clamped;
          if (d === 0) {
            // For 0 days, only allow 1 night
            clamped = 1;
          } else {
            // For d>0, allow d-1, d, d+1 (with d-1 >= 0)
            const choices = [Math.max(0, d - 1), d, d + 1];
            // Check if the entered value is one of the allowed choices
            if (choices.includes(num)) {
              clamped = num; // Allow the exact value if it's valid
            } else {
              // Snap to nearest allowed value
              clamped = choices.reduce((prev, curr) => Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev, choices[0]);
            }
          }
          // Show error only if the value was changed due to being invalid
          if (clamped !== num) {
            setFieldErrors(prev => ({ ...prev, nights: t('toast.field_invalid') || 'Giá trị không hợp lệ' }));
          } else {
            setFieldErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.nights;
              return newErrors;
            });
          }
          nextValue = String(clamped);

          // Tính tourIntDuration = Max(days, nights)
          // d là số ngày (duration), clamped là số đêm (nights)
          const tourIntDuration = Math.max(d, clamped);

          const newFormData = {
            ...formData,
            [name]: nextValue,
            tourIntDuration: tourIntDuration
          };
          setFormData(newFormData);
          updateTourData(newFormData);
          return; // early return to avoid the generic update below
        } else if (name === 'maxCapacity') {
          const clamped = Math.max(1, Math.min(9999, num));
          if (clamped !== num) {
            setFieldErrors(prev => ({ ...prev, maxCapacity: t('toast.max_capacity_range') || 'Số lượng chỗ phải từ 1 đến 9999' }));
          } else {
            setFieldErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.maxCapacity;
              return newErrors;
            });
          }
          nextValue = clamped;
        } else if (name === 'checkDays' || name === 'balancePaymentDays') {
          const raw = nextValue; // already digits only
          // Allow empty while typing
          if (raw === '') {
            const updated = {
              ...formData,
              [name]: '',
              minAdvancedDays: '',
              tourDeadline: ''
            };
            const adjusted = enforceCutoffLimit(updated);
            setFormData(adjusted);
            updateTourData(adjusted);
            clearFieldError('checkDays');
            clearFieldError('balancePaymentDays');
            clearFieldError('tourDeadline');
            return;
          }
          const numeric = Math.max(0, parseInt(raw, 10));
          const otherVal = name === 'checkDays' ? formData.balancePaymentDays : formData.checkDays;
          const otherNum = otherVal === '' ? null : parseInt(otherVal, 10);
          let computedMin = '';
          if (otherNum !== null && !Number.isNaN(otherNum)) {
            computedMin = String(Math.max(0, numeric + otherNum));
          }
          let updated = {
            ...formData,
            checkDays: name === 'checkDays' ? String(numeric) : formData.checkDays,
            balancePaymentDays: name === 'balancePaymentDays' ? String(numeric) : formData.balancePaymentDays,
            minAdvancedDays: computedMin,
            tourDeadline: computedMin
          };
          clearFieldError('checkDays');
          clearFieldError('balancePaymentDays');
          clearFieldError('tourDeadline');
          updated = enforceCutoffLimit(updated);
          setFormData(updated);
          updateTourData(updated);
          return;
        } else if (name === 'depositPercentage') {
          const clamped = Math.max(0, Math.min(100, num));
          nextValue = String(clamped);
          clearFieldError('depositPercentage');
        } else if (name === 'refundFloor') {
          // Only valid when refundable is allowed; clamp 1-100
          const clamped = Math.max(1, Math.min(100, num));
          nextValue = String(clamped);
          clearFieldError('refundFloor');
        }
      }
    }

    // Update form data for other fields (not duration or nights)
    const newFormData = {
      ...formData,
      [name]: nextValue
    };
    setFormData(newFormData);
    updateTourData(newFormData);
  };

  const handleExpirationDateChange = (value) => {
    if (value === '') {
      const updated = { ...formData, tourExpirationDate: '' };
      setFormData(updated);
      updateTourData(updated);
      return;
    }
    const leadDays = calculateLeadDays(value);
    if (leadDays === null || leadDays < 0) {
      setFieldErrors(prev => ({ ...prev, tourExpirationDate: t('toast.field_invalid') || 'Ngày không hợp lệ' }));
      return;
    }

    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.tourExpirationDate;
      return newErrors;
    });
    let nextDeadline = formData.tourDeadline;
    if (nextDeadline !== '') {
      const deadlineNum = parseInt(nextDeadline, 10);
      if (!Number.isNaN(deadlineNum) && deadlineNum >= leadDays) {
        const adjusted = Math.max(0, leadDays - 1);
        nextDeadline = String(adjusted);
        // Clear error when value is auto-adjusted correctly
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.tourDeadline;
          const hasErrors = Object.keys(newErrors).length > 0;
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('stepValidationStatus', {
              detail: { step: 1, hasErrors }
            }));
          }, 0);
          return newErrors;
        });
      } else {
        // Clear error when value is valid
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.tourDeadline;
          const hasErrors = Object.keys(newErrors).length > 0;
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('stepValidationStatus', {
              detail: { step: 1, hasErrors }
            }));
          }, 0);
          return newErrors;
        });
      }
    }
    let updated = {
      ...formData,
      tourExpirationDate: value,
      tourDeadline: nextDeadline
    };
    updated = enforceCutoffLimit(updated);
    setFormData(updated);
    updateTourData(updated);
  };


  return (
    <div className={styles['step1-container']}>
      <div className={styles['step-header']}>
        <h2 className={styles['step-title']}>{t('tourWizard.step1.title')}</h2>
        <p className={styles['step-subtitle']}>{t('tourWizard.step1.subtitle')}</p>
        <div className={styles['warning-message']}>
          <AlertTriangle className={styles['warning-icon']} size={18} strokeWidth={1.5} />
          <span>{t('tourWizard.step1.warning')}</span>
        </div>
      </div>

      <div className={styles['form-grid']}>
        <div className={styles['form-group']}>
          <label htmlFor="tourName" className={styles['form-label']}>
            <FileText className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.tourName')}
            <span className={styles['required-asterisk']}>*</span>
          </label>
          <input
            type="text"
            id="tourName"
            name="tourName"
            value={formData.tourName}
            onChange={handleChange}
            className={styles['form-input']}
            placeholder={t('tourWizard.step1.placeholders.tourName')}
          />
          {fieldErrors.tourName && (
            <span className={styles['error-message']}>{fieldErrors.tourName}</span>
          )}
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="tourType" className={styles['form-label']}>
            <Layers className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.tourType')}
            <span className={styles['required-asterisk']}>*</span>
          </label>
          <select
            id="tourType"
            name="tourType"
            value={formData.tourType}
            onChange={handleChange}
            className={styles['form-select']}
          >
            <option value="">{t('tourWizard.step1.fields.tourType')}</option>
            {tourTypes.map(type => (
              <option key={type.value} value={type.value}>
                {t(type.i18nKey)}
              </option>
            ))}
          </select>
          {fieldErrors.tourType && (
            <span className={styles['error-message']}>{fieldErrors.tourType}</span>
          )}
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="duration" className={styles['form-label']}>
            <Clock className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.duration')}
            <span className={styles['required-asterisk']}>*</span>
          </label>
          <input
            type="number"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            onFocus={handleFieldFocus}
            onKeyDown={preventInvalidNumberKeys}
            onWheel={(e) => e.currentTarget.blur()}
            className={styles['form-input']}
            placeholder={t('tourWizard.step1.placeholders.duration')}
            min="0"
          />
          {fieldErrors.duration && (
            <span className={styles['error-message']}>{fieldErrors.duration}</span>
          )}
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="nights" className={styles['form-label']}>
            <Moon className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.nights')}
            <span className={styles['required-asterisk']}>*</span>
          </label>
          <input
            type="text"
            id="nights"
            name="nights"
            value={formData.nights}
            onChange={handleChange}
            onFocus={handleFieldFocus}
            onKeyDown={preventInvalidNumberKeys}
            onWheel={(e) => e.currentTarget.blur()}
            className={styles['form-input']}
            placeholder={t('tourWizard.step1.placeholders.nights')}
            inputMode="numeric"
            pattern="[0-9]*"
          />
          {fieldErrors.nights && (
            <span className={styles['error-message']}>{fieldErrors.nights}</span>
          )}
          {!fieldErrors.nights && formData.duration !== '' && (
            <small className={styles['form-help']}>
              {t('tourWizard.step1.hints.nightsSuggestion', { suggest: getAllowedNightsRange(formData.duration).suggest, days: formData.duration })}
              {' '}
              {t('tourWizard.step1.hints.allowedNights', { allowed: formatAllowedNights(formData.duration) })}
            </small>
          )}
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="maxCapacity" className={styles['form-label']}>
            <Users className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.numberOfAvailableTours', 'Number of available tours')}
            <span className={styles['required-asterisk']}>*</span>
          </label>
          <input
            type="number"
            id="maxCapacity"
            name="maxCapacity"
            value={formData.maxCapacity}
            onChange={handleChange}
            onFocus={handleFieldFocus}
            onKeyDown={preventInvalidNumberKeys}
            onWheel={(e) => e.currentTarget.blur()}
            className={styles['form-input']}
            placeholder={t('tourWizard.step1.placeholders.maxCapacity')}
            min="1"
          />
          {fieldErrors.maxCapacity && (
            <span className={styles['error-message']}>{fieldErrors.maxCapacity}</span>
          )}
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="tourExpirationDate" className={styles['form-label']}>
            <Calendar className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.tourExpirationDate')}
            <span className={styles['required-asterisk']}>*</span>
          </label>
          <div className={styles['date-input-container']}>
            <input
              type="text"
              id="tourExpirationDate"
              readOnly
              value={formData.tourExpirationDate || ''}
              onFocus={handleFieldFocus}
              className={`${styles['form-input']} ${styles['date-input']}`}
              placeholder={t('tourWizard.step1.placeholders.tourExpirationDate') || 'YYYY-MM-DD'}
            />
            <div className={styles['date-picker-wrapper']}>
              <button
                type="button"
                className={styles['calendar-button']}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Trigger the hidden DatePicker via its exposed handlers
                  if (datePickerRef.current) {
                    datePickerRef.current.focus?.();
                    datePickerRef.current.click?.();
                  }
                }}
                title="Open date picker"
              >
                <Calendar className={styles['calendar-icon']} />
              </button>
              <div style={{ position: 'absolute', left: '-9999px', opacity: 0, width: '1px', height: '1px', overflow: 'hidden' }}>
                <DatePicker
                  ref={datePickerRef}
                  value={formData.tourExpirationDate ? new Date(formData.tourExpirationDate) : null}
                  onChange={(date) => {
                    if (date) {
                      // Use local date components to avoid timezone issues
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const value = `${year}-${month}-${day}`;
                      handleExpirationDateChange(value);
                    } else {
                      handleExpirationDateChange('');
                    }
                  }}
                  minDate={new Date()}
                  className={styles['form-input']}
                  onFocus={() => { }}
                  onBlur={() => { }}
                  onClick={() => { }}
                />
              </div>
            </div>
          </div>
          {fieldErrors.tourExpirationDate && (
            <span className={styles['error-message']}>{fieldErrors.tourExpirationDate}</span>
          )}
          {!fieldErrors.tourExpirationDate && (
            <small className={styles['form-help']}>
              {t('tourWizard.step1.help.tourExpirationDate')}
            </small>
          )}
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="checkDays" className={styles['form-label']}>
            <CalendarDays className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.checkDays', 'Check days (deposit window)')}
          </label>
          <input
            type="number"
            id="checkDays"
            name="checkDays"
            value={formData.checkDays}
            onChange={handleChange}
            onFocus={handleFieldFocus}
            placeholder={t('tourWizard.step1.placeholders.checkDays', 'Enter check days')}
            onKeyDown={preventInvalidNumberKeys}
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            className={styles['form-input']}
          />
          {fieldErrors.checkDays && (
            <span className={styles['error-message']}>{fieldErrors.checkDays}</span>
          )}
          {!fieldErrors.checkDays && (
            <small className={styles['form-help']}>
              {t('tourWizard.step1.help.checkDays', 'Part of MinAdvanceDays; deposit window.')}
            </small>
          )}
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="balancePaymentDays" className={styles['form-label']}>
            <Clock className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.balancePaymentDays', 'Balance payment days')}
          </label>
          <input
            type="number"
            id="balancePaymentDays"
            name="balancePaymentDays"
            value={formData.balancePaymentDays}
            onChange={handleChange}
            onFocus={handleFieldFocus}
            onKeyDown={preventInvalidNumberKeys}
            onWheel={(e) => e.currentTarget.blur()}
            className={styles['form-input']}
            placeholder={t('tourWizard.step1.placeholders.balancePaymentDays', 'Enter balance payment days')}
          />
          {fieldErrors.balancePaymentDays && (
            <span className={styles['error-message']}>{fieldErrors.balancePaymentDays}</span>
          )}
          {!fieldErrors.balancePaymentDays && (
            <small className={styles['form-help']}>
              {t('tourWizard.step1.help.balancePaymentDays', 'Auto = MinAdvanceDays - CheckDays. Balance payment window.')}
            </small>
          )}
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="tourDeadline" className={styles['form-label']}>
            <CalendarDays className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.tourDeadline')}
            <span className={styles['required-asterisk']}>*</span>
          </label>
          <input
            type="number"
            id="tourDeadline"
            name="tourDeadline"
            value={formData.tourDeadline}
            readOnly
            disabled
            className={`${styles['form-input']} ${styles['form-input-readonly'] || ''}`}
            placeholder={t('tourWizard.step1.placeholders.tourDeadline')}
          />
          {fieldErrors.tourDeadline && (
            <span className={styles['error-message']}>{fieldErrors.tourDeadline}</span>
          )}
          {!fieldErrors.tourDeadline && (
            <small className={styles['form-help']}>{t('tourWizard.step1.help.tourDeadline')}</small>
          )}
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="depositPercentage" className={styles['form-label']}>
            <Layers className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.depositPercentage', 'Deposit percentage')}
          </label>
          <input
            type="number"
            id="depositPercentage"
            name="depositPercentage"
            value={formData.depositPercentage}
            onChange={handleChange}
            onFocus={handleFieldFocus}
            placeholder={t('tourWizard.step1.placeholders.depositPercentage', '0 - 100')}
            onKeyDown={preventInvalidNumberKeys}
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            max="100"
            className={styles['form-input']}
          />
          {fieldErrors.depositPercentage && (
            <span className={styles['error-message']}>{fieldErrors.depositPercentage}</span>
          )}
          {!fieldErrors.depositPercentage && (
            <small className={styles['form-help']}>
              {t('tourWizard.step1.help.depositPercentage', 'Required at booking time.')}
            </small>
          )}
        </div>

        <div className={styles['form-group']}>
          <label className={styles['form-label']} htmlFor="allowRefundableAfterBalancePayment">
            <ClipboardList className={styles['label-icon']} size={18} strokeWidth={1.5} />
            {t('tourWizard.step1.fields.allowRefundableAfterBalancePayment', 'Allow refund after balance payment')}
          </label>
          <div className={styles['checkbox-row'] || ''}>
            <input
              type="checkbox"
              id="allowRefundableAfterBalancePayment"
              name="allowRefundableAfterBalancePayment"
              checked={formData.allowRefundableAfterBalancePayment}
              onChange={handleChange}
              onFocus={handleFieldFocus}
            />
            <span>{t('tourWizard.step1.help.allowRefundableAfterBalancePayment', 'Enable refundable rules after balance is paid')}</span>
          </div>
        </div>

        {formData.allowRefundableAfterBalancePayment && (
          <div className={styles['form-group']}>
            <label htmlFor="refundFloor" className={styles['form-label']}>
              <ClipboardList className={styles['label-icon']} size={18} strokeWidth={1.5} />
              {t('tourWizard.step1.fields.refundFloor', 'Refund floor (%)')}
            </label>
            <input
              type="number"
              id="refundFloor"
              name="refundFloor"
              value={formData.refundFloor}
              onChange={handleChange}
              onFocus={handleFieldFocus}
              placeholder={t('tourWizard.step1.placeholders.refundFloor', '0 - 100')}
              onKeyDown={preventInvalidNumberKeys}
              onWheel={(e) => e.currentTarget.blur()}
              min="0"
              max="100"
              className={styles['form-input']}
            />
            {fieldErrors.refundFloor && (
              <span className={styles['error-message']}>{fieldErrors.refundFloor}</span>
            )}
            {!fieldErrors.refundFloor && (
              <small className={styles['form-help']}>
                {t('tourWizard.step1.help.refundFloor', 'Minimum refundable percentage after balance window.')}
              </small>
            )}
          </div>
        )}
      </div>

      <div className={styles['step-summary']}>
        <h3>
          <ClipboardList className={styles['summary-title-icon']} size={20} strokeWidth={1.5} />
          {t('tourWizard.step1.summary.title')}
        </h3>
        <div className={styles['summary-content']}>
          <div className={styles['summary-column']}>
            <p>
              <FileText className={styles['summary-item-icon']} size={16} strokeWidth={1.5} />
              <strong>{t('tourWizard.step1.summary.tourName')}</strong> {formData.tourName || t('tourWizard.step1.summary.notEntered')}
            </p>
            <p>
              <Layers className={styles['summary-item-icon']} size={16} strokeWidth={1.5} />
              <strong>{t('tourWizard.step1.summary.tourType')}</strong> {(() => { const tt = tourTypes.find(type => type.value === formData.tourType); return tt ? t(tt.i18nKey) : t('tourWizard.step1.summary.notSelected'); })()}
            </p>
            <p>
              <Clock className={styles['summary-item-icon']} size={16} strokeWidth={1.5} />
              <strong>{t('tourWizard.step1.summary.duration')}</strong> {(formData.duration || t('tourWizard.step1.summary.notEntered')) + ' ' + t('tourWizard.step1.summary.days')} {formData.nights !== '' ? ` ${formData.nights} ${t('tourWizard.step1.summary.nights')}` : ''}
            </p>
            <p>
              <Users className={styles['summary-item-icon']} size={16} strokeWidth={1.5} />
              <strong>{t('tourWizard.step1.summary.numberOfAvailableTours', 'Number of available tours')}</strong> {formData.maxCapacity || t('tourWizard.step1.summary.notEntered')}
            </p>
            <p>
              <Calendar className={styles['summary-item-icon']} size={16} strokeWidth={1.5} />
              <strong>{t('tourWizard.step1.summary.tourExpirationDate')}</strong> {formData.tourExpirationDate || t('tourWizard.step1.summary.notEntered')}
            </p>
          </div>
          <div className={styles['summary-column']}>
            <p>
              <CalendarDays className={styles['summary-item-icon']} size={16} strokeWidth={1.5} />
              <strong>{t('tourWizard.step1.summary.tourDeadline')}</strong> {formData.tourDeadline !== '' ? `${formData.tourDeadline} ${t('tourWizard.step1.summary.days')}` : t('tourWizard.step1.summary.notEntered')}
            </p>
            <p>
              <CalendarDays className={styles['summary-item-icon']} size={16} strokeWidth={1.5} />
              <strong>{t('tourWizard.step1.summary.checkDays', 'Check days')}</strong> {formData.checkDays !== '' ? formData.checkDays : t('tourWizard.step1.summary.notEntered')}
            </p>
            <p>
              <Clock className={styles['summary-item-icon']} size={16} strokeWidth={1.5} />
              <strong>{t('tourWizard.step1.summary.balancePaymentDays', 'Balance payment days')}</strong> {formData.balancePaymentDays !== '' ? formData.balancePaymentDays : t('tourWizard.step1.summary.notEntered')}
            </p>
            <p>
              <Layers className={styles['summary-item-icon']} size={16} strokeWidth={1.5} />
              <strong>{t('tourWizard.step1.summary.depositPercentage', 'Deposit')}</strong> {formData.depositPercentage !== '' ? `${formData.depositPercentage}%` : t('tourWizard.step1.summary.notEntered')}
            </p>
            <p>
              <ClipboardList className={styles['summary-item-icon']} size={16} strokeWidth={1.5} />
              <strong>{t('tourWizard.step1.summary.refundRule', 'Refund rule')}</strong>{' '}
              {formData.allowRefundableAfterBalancePayment
                ? `${t('tourWizard.step1.summary.refundFloor', 'Refund floor')}: ${formData.refundFloor || '0'}%`
                : t('tourWizard.step1.summary.notSelected')}
            </p>
          </div>
        </div>
      </div>

      <div className={styles['policy-explainer'] || ''}>
        <h4>{t('tourWizard.step1.explanation.title', 'How the advance / deposit timeline works')}</h4>
        <p>
          {t(
            'tourWizard.step1.explanation.timeline',
            'MinAdvanceDays defines the total lead time before departure. CheckDays is the first slice (deposit window) and BalancePaymentDays is auto-calculated so both add up to MinAdvanceDays.'
          )}
        </p>
        <p>
          {t(
            'tourWizard.step1.explanation.example',
            'Example: MinAdvanceDays = 10, CheckDays = 3, BalancePaymentDays = 7. From day 1 to day 3 the traveler pays the deposit (e.g., 30%). From day 4 to day 10 they pay the remaining balance. If refundable after balance is enabled with refundFloor = 20%, refunds go 100% in CheckDays, 80% during BalancePaymentDays, then gradually from 80% down to 20% until departure (never below the floor).'
          )}
        </p>
      </div>
    </div>
  );
};

export default Step1BasicInfo;
