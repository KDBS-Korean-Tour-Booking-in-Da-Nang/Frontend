import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import { DatePicker } from 'react-rainbow-components';
import {
  Calendar,
  FileText,
  Layers,
  MapPin,
  Bus,
  Clock,
  Moon,
  Users,
  CalendarDays,
  ClipboardList
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
    departurePoint: t('common.departurePoints.daNang'), // Default departure point (i18n)
    vehicle: t('common.vehicles.tourBus'),
    duration: '',
    nights: '',
    tourType: '',
    maxCapacity: '',
    tourDeadline: '',
    tourExpirationDate: ''
  });

  // Helpers
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

  // Normalize values entered/stored in different languages to current locale label
  const localizeDeparturePoint = (value) => {
    if (!value) return '';
    const variants = [
      'Đà Nẵng',
      'Da Nang',
      '다낭',
      t('common.departurePoints.daNang')
    ];
    return variants.includes(value) ? t('common.departurePoints.daNang') : value;
  };

  const localizeVehicle = (value) => {
    if (!value) return '';
    const variants = [
      'Xe Du Lịch',
      'Tour Bus',
      '관광 버스',
      t('common.vehicles.tourBus')
    ];
    return variants.includes(value) ? t('common.vehicles.tourBus') : value;
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

  // Update form data when tourData changes
  useEffect(() => {
    setFormData({
      tourName: tourData.tourName || '',
      departurePoint: tourData.departurePoint || t('common.departurePoints.daNang'), // Default departure point (i18n)
      vehicle: tourData.vehicle || t('common.vehicles.tourBus'),
      duration: tourData.duration || '',
      nights: tourData.nights || '',
      tourType: tourData.tourType || '',
      maxCapacity: tourData.maxCapacity || '',
      tourDeadline: tourData.tourDeadline !== undefined && tourData.tourDeadline !== null ? String(tourData.tourDeadline) : '',
      tourExpirationDate: tourData.tourExpirationDate || ''
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
        { key: 'maxCapacity', errorKey: 'tourWizard.step1.fields.maxCapacity' },
        { key: 'tourDeadline', errorKey: 'tourWizard.step1.fields.tourDeadline', checkEmpty: true },
        { key: 'tourExpirationDate', errorKey: 'tourWizard.step1.fields.tourExpirationDate' }
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
      
      setFieldErrors(errors);
      // Notify parent about validation status
      window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
        detail: { step: 1, hasErrors: Object.keys(errors).length > 0 } 
      }));
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
    const { name, value } = e.target;
    // Clear error for this field when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        // Notify parent about validation status change (use setTimeout to avoid render warning)
        const hasErrors = Object.keys(newErrors).length > 0;
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
            detail: { step: 1, hasErrors } 
          }));
        }, 0);
        return newErrors;
      });
    }
    let nextValue = value;

    // Normalize numeric fields
  if (['duration', 'nights', 'maxCapacity', 'tourDeadline'].includes(name)) {
      // Strip non-digits
      nextValue = String(nextValue).replace(/[^0-9]/g, '');
      if (nextValue === '') {
        // allow empty while typing
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
        } else if (name === 'tourDeadline') {
          const clamped = Math.max(0, Math.min(MAX_LEAD_DAYS, num));
          let adjustedValue = clamped;
          if (formData.tourExpirationDate) {
            const leadDays = calculateLeadDays(formData.tourExpirationDate);
            if (leadDays !== null && adjustedValue >= leadDays) {
              adjustedValue = Math.max(0, leadDays - 1);
              setFieldErrors(prev => ({ ...prev, tourDeadline: t('toast.field_invalid') || 'Giá trị không hợp lệ' }));
            } else {
              setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.tourDeadline;
                return newErrors;
              });
            }
          }
          nextValue = String(adjustedValue);
          const updated = {
            ...formData,
            [name]: nextValue
          };
          setFormData(updated);
          updateTourData(updated);
          return;
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
        if (String(adjusted) !== nextDeadline) {
          setFieldErrors(prev => ({ ...prev, tourDeadline: t('toast.field_invalid') || 'Giá trị không hợp lệ' }));
        } else {
          setFieldErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.tourDeadline;
            return newErrors;
          });
        }
        nextDeadline = String(adjusted);
      }
    }
    const updated = {
      ...formData,
      tourExpirationDate: value,
      tourDeadline: nextDeadline
    };
    setFormData(updated);
    updateTourData(updated);
  };


  return (
    <div className={styles['step1-container']}>
      <div className={styles['step-header']}>
        <h2 className={styles['step-title']}>{t('tourWizard.step1.title')}</h2>
        <p className={styles['step-subtitle']}>{t('tourWizard.step1.subtitle')}</p>
      </div>

      <div className={styles['form-grid']}>
        <div className={styles['form-group']}>
          <label htmlFor="tourName" className={styles['form-label']}>
            <FileText className={styles['label-icon']} size={18} />
            {t('tourWizard.step1.fields.tourName')}
            {fieldErrors.tourName && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
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
            <Layers className={styles['label-icon']} size={18} />
            {t('tourWizard.step1.fields.tourType')}
            {fieldErrors.tourType && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
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
          <label htmlFor="departurePoint" className={styles['form-label']}>
            <MapPin className={styles['label-icon']} size={18} />
            {t('tourWizard.step1.fields.departurePoint')}
          </label>
          <select
            id="departurePoint"
            name="departurePoint"
            value={formData.departurePoint}
            onChange={handleChange}
            className={styles['form-select']}
            disabled
          >
            <option value={t('common.departurePoints.daNang')}>{t('common.departurePoints.daNang')}</option>
          </select>
          <small className={styles['form-help']}>{t('tourWizard.step1.help.departurePoint')}</small>
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="vehicle" className={styles['form-label']}>
            <Bus className={styles['label-icon']} size={18} />
            {t('tourWizard.step1.fields.vehicle')}
          </label>
          <select
            id="vehicle"
            name="vehicle"
            value={formData.vehicle}
            onChange={handleChange}
            className={styles['form-select']}
            disabled
          >
            <option value={t('common.vehicles.tourBus')}>{t('common.vehicles.tourBus')}</option>
          </select>
          <small className={styles['form-help']}>{t('tourWizard.step1.help.vehicle')}</small>
        </div>


        <div className={styles['form-group']}>
          <label htmlFor="duration" className={styles['form-label']}>
            <Clock className={styles['label-icon']} size={18} />
            {t('tourWizard.step1.fields.duration')}
            {fieldErrors.duration && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
          </label>
          <input
            type="number"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
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
            <Moon className={styles['label-icon']} size={18} />
            {t('tourWizard.step1.fields.nights')}
            {fieldErrors.nights && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
          </label>
          <input
            type="text"
            id="nights"
            name="nights"
            value={formData.nights}
            onChange={handleChange}
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
            <Users className={styles['label-icon']} size={18} />
            {t('tourWizard.step1.fields.maxCapacity')}
            {fieldErrors.maxCapacity && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
          </label>
          <input
            type="number"
            id="maxCapacity"
            name="maxCapacity"
            value={formData.maxCapacity}
            onChange={handleChange}
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
          <label htmlFor="tourDeadline" className={styles['form-label']}>
            <CalendarDays className={styles['label-icon']} size={18} />
            {t('tourWizard.step1.fields.tourDeadline')}
            {fieldErrors.tourDeadline && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
          </label>
          <input
            type="number"
            id="tourDeadline"
            name="tourDeadline"
            value={formData.tourDeadline}
            onChange={handleChange}
            placeholder={t('tourWizard.step1.placeholders.tourDeadline')}
            onKeyDown={preventInvalidNumberKeys}
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            max={MAX_LEAD_DAYS}
            className={styles['form-input']}
          />
          {fieldErrors.tourDeadline && (
            <span className={styles['error-message']}>{fieldErrors.tourDeadline}</span>
          )}
          {!fieldErrors.tourDeadline && (
            <small className={styles['form-help']}>{t('tourWizard.step1.help.tourDeadline')}</small>
          )}
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="tourExpirationDate" className={styles['form-label']}>
            <Calendar className={styles['label-icon']} size={18} />
            {t('tourWizard.step1.fields.tourExpirationDate')}
            {fieldErrors.tourExpirationDate && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
          </label>
          <div className={styles['date-input-container']}>
            <input
              type="text"
              id="tourExpirationDate"
              readOnly
              value={formData.tourExpirationDate || ''}
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
                    onFocus={() => {}}
                    onBlur={() => {}}
                    onClick={() => {}}
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
      </div>

      <div className={styles['step-summary']}>
        <h3>
          <ClipboardList className={styles['summary-title-icon']} size={20} />
          {t('tourWizard.step1.summary.title')}
        </h3>
        <div className={styles['summary-content']}>
          <p>
            <FileText className={styles['summary-item-icon']} size={16} />
            <strong>{t('tourWizard.step1.summary.tourName')}</strong> {formData.tourName || t('tourWizard.step1.summary.notEntered')}
          </p>
          <p>
            <Layers className={styles['summary-item-icon']} size={16} />
            <strong>{t('tourWizard.step1.summary.tourType')}</strong> {(() => { const tt = tourTypes.find(type => type.value === formData.tourType); return tt ? t(tt.i18nKey) : t('tourWizard.step1.summary.notSelected'); })()}
          </p>
          <p>
            <MapPin className={styles['summary-item-icon']} size={16} />
            <strong>{t('tourWizard.step1.summary.departurePoint')}</strong> {localizeDeparturePoint(formData.departurePoint) || t('tourWizard.step1.summary.notEntered')}
          </p>
          <p>
            <Bus className={styles['summary-item-icon']} size={16} />
            <strong>{t('tourWizard.step1.summary.vehicle')}</strong> {localizeVehicle(formData.vehicle) || t('common.vehicles.tourBus')}
          </p>
          <p>
            <Clock className={styles['summary-item-icon']} size={16} />
            <strong>{t('tourWizard.step1.summary.duration')}</strong> {(formData.duration || t('tourWizard.step1.summary.notEntered')) + ' ' + t('tourWizard.step1.summary.days')} {formData.nights !== '' ? ` ${formData.nights} ${t('tourWizard.step1.summary.nights')}` : ''}
          </p>
          <p>
            <Users className={styles['summary-item-icon']} size={16} />
            <strong>{t('tourWizard.step1.summary.maxCapacity')}</strong> {formData.maxCapacity || t('tourWizard.step1.summary.notEntered')} {t('tourWizard.step1.summary.tours')}
          </p>
          <p>
            <CalendarDays className={styles['summary-item-icon']} size={16} />
            <strong>{t('tourWizard.step1.summary.tourDeadline')}</strong> {formData.tourDeadline !== '' ? `${formData.tourDeadline} ${t('tourWizard.step1.summary.days')}` : t('tourWizard.step1.summary.notEntered')}
          </p>
          <p>
            <Calendar className={styles['summary-item-icon']} size={16} />
            <strong>{t('tourWizard.step1.summary.tourExpirationDate')}</strong> {formData.tourExpirationDate || t('tourWizard.step1.summary.notEntered')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Step1BasicInfo;
