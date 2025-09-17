import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import './Step1BasicInfo.css';

const Step1BasicInfo = () => {
  const { t } = useTranslation();
  const { tourData, updateTourData } = useTourWizardContext();
  const { showError } = useToast();
  const [formData, setFormData] = useState({
    tourName: '',
    departurePoint: 'Đà Nẵng', // Default departure point
    vehicle: 'Xe Du Lịch',
    duration: '',
    nights: '',
    tourType: '',
    maxCapacity: '',
    bookingDeadline: ''
  });

  // Helpers
  const preventInvalidNumberKeys = (e) => {
    const invalidKeys = ['e', 'E', '+', '-', '.'];
    if (invalidKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  const nowLocalDateTime = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  // Nights rules:
  // - If duration = 0 → allowed nights = 1 only
  // - Otherwise allowed range = [duration - 1, duration + 1], with lower bound >= 0
  const getAllowedNightsRange = (days) => {
    const d = parseInt(days || 0, 10);
    if (isNaN(d)) return { min: 0, max: 0, suggest: 0 };
    if (d === 0) return { min: 1, max: 1, suggest: 1 };
    const min = Math.max(0, d - 1);
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

  // Update form data when tourData changes
  useEffect(() => {
    setFormData({
      tourName: tourData.tourName || '',
      departurePoint: tourData.departurePoint || 'Đà Nẵng', // Default departure point
      vehicle: tourData.vehicle || 'Xe Du Lịch',
      duration: tourData.duration || '',
      nights: tourData.nights || '',
      tourType: tourData.tourType || '',
      maxCapacity: tourData.maxCapacity || '',
      bookingDeadline: tourData.bookingDeadline || ''
    });
  }, [tourData]);

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
        showError({ i18nKey: 'toast.field_invalid' });
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
    { value: 'resort', label: 'Nghỉ dưỡng' },
    { value: 'culture', label: 'Văn hóa' },
    { value: 'adventure', label: 'Mạo hiểm' },
    { value: 'team-building', label: 'Team Building' },
    { value: 'food', label: 'Ẩm thực' },
    { value: 'photography', label: 'Nhiếp ảnh' },
    { value: 'religious', label: 'Tâm linh' },
    { value: 'other', label: 'Khác' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    // Normalize numeric fields
    if (['duration', 'nights', 'maxCapacity'].includes(name)) {
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
            newNights = suggest;
          } else if (!isNaN(currentNights)) {
            const clamped = Math.max(min, Math.min(max, currentNights));
            // Không hiển thị toast khi thay đổi số ngày; chỉ âm thầm điều chỉnh
            newNights = clamped;
          }
          // Apply both fields together
          const updated = { ...formData, duration: String(days), nights: newNights };
          setFormData(updated);
          updateTourData(updated);
          return; // early return to avoid the generic update below
        } else if (name === 'nights') {
          const d = parseInt(formData.duration || 0, 10);
          const { min, max } = getAllowedNightsRange(d);
          // Allowed discrete values: d-1, d, d+1 (for d>0); for d=0 only 1
          let clamped;
          if (d === 0) {
            clamped = 1;
          } else {
            const choices = [Math.max(0, d - 1), d, d + 1];
            // Snap to nearest allowed value
            clamped = choices.reduce((prev, curr) => Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev, choices[0]);
            clamped = Math.max(min, Math.min(max, clamped));
          }
          // Khi chỉnh trực tiếp số đêm, chỉ hiển thị toast nếu ngày = 0 mà nhập ngoài quy tắc
          if (d === 0 && clamped !== num) {
            showError({ i18nKey: 'toast.field_invalid' });
          }
          nextValue = clamped;
        } else if (name === 'maxCapacity') {
          const clamped = Math.max(1, Math.min(9999, num));
          if (clamped !== num) {
            showError('toast.max_capacity_range');
          }
          nextValue = clamped;
        }
      }
    }

    // Prevent past date for bookingDeadline
    if (name === 'bookingDeadline' && nextValue) {
      const minValue = new Date(nowLocalDateTime());
      const picked = new Date(nextValue);
      if (picked < minValue) {
        nextValue = nowLocalDateTime();
        showError('toast.invalid_past_deadline');
      }
    }

    const newFormData = {
      ...formData,
      [name]: nextValue
    };
    setFormData(newFormData);
    updateTourData(newFormData);
  };


  return (
    <div className="step1-container">
      <div className="step-header">
        <h2 className="step-title">{t('tourWizard.step1.title')}</h2>
        <p className="step-subtitle">{t('tourWizard.step1.subtitle')}</p>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="tourName" className="form-label">
            {t('tourWizard.step1.fields.tourName')}
          </label>
          <input
            type="text"
            id="tourName"
            name="tourName"
            value={formData.tourName}
            onChange={handleChange}
            className="form-input"
            placeholder={t('tourWizard.step1.placeholders.tourName')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tourType" className="form-label">
            {t('tourWizard.step1.fields.tourType')}
          </label>
          <select
            id="tourType"
            name="tourType"
            value={formData.tourType}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">{t('tourWizard.step1.fields.tourType')}</option>
            {tourTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="departurePoint" className="form-label">
            {t('tourWizard.step1.fields.departurePoint')}
          </label>
          <select
            id="departurePoint"
            name="departurePoint"
            value={formData.departurePoint}
            onChange={handleChange}
            className="form-select"
            disabled
          >
            <option value="Đà Nẵng">Đà Nẵng</option>
          </select>
          <small className="form-help">{t('tourWizard.step1.help.departurePoint')}</small>
        </div>

        <div className="form-group">
          <label htmlFor="vehicle" className="form-label">
            {t('tourWizard.step1.fields.vehicle')}
          </label>
          <select
            id="vehicle"
            name="vehicle"
            value={formData.vehicle}
            onChange={handleChange}
            className="form-select"
            disabled
          >
            <option value="Xe Du Lịch">Xe Du Lịch</option>
          </select>
          <small className="form-help">{t('tourWizard.step1.help.vehicle')}</small>
        </div>


        <div className="form-group">
          <label htmlFor="duration" className="form-label">
            {t('tourWizard.step1.fields.duration')}
          </label>
          <input
            type="number"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            onKeyDown={preventInvalidNumberKeys}
            onWheel={(e) => e.currentTarget.blur()}
            className="form-input"
            placeholder={t('tourWizard.step1.placeholders.duration')}
            min="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="nights" className="form-label">
            {t('tourWizard.step1.fields.nights')}
          </label>
          <input
            type="number"
            id="nights"
            name="nights"
            value={formData.nights}
            onChange={handleChange}
            onKeyDown={preventInvalidNumberKeys}
            onWheel={(e) => e.currentTarget.blur()}
            className="form-input"
            placeholder={t('tourWizard.step1.placeholders.nights')}
            min="0"
          />
          {formData.duration !== '' && (
            <small className="form-help">
              Gợi ý: {getAllowedNightsRange(formData.duration).suggest} đêm (cho {formData.duration} ngày).
              Cho phép: {formatAllowedNights(formData.duration)} đêm.
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="maxCapacity" className="form-label">
            {t('tourWizard.step1.fields.maxCapacity')}
          </label>
          <input
            type="number"
            id="maxCapacity"
            name="maxCapacity"
            value={formData.maxCapacity}
            onChange={handleChange}
            onKeyDown={preventInvalidNumberKeys}
            onWheel={(e) => e.currentTarget.blur()}
            className="form-input"
            placeholder={t('tourWizard.step1.placeholders.maxCapacity')}
            min="1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="bookingDeadline" className="form-label">
            {t('tourWizard.step1.fields.bookingDeadline')}
          </label>
          <input
            type="datetime-local"
            id="bookingDeadline"
            name="bookingDeadline"
            value={formData.bookingDeadline}
            onChange={handleChange}
            className="form-input"
            placeholder={t('tourWizard.step1.placeholders.bookingDeadline')}
            min={nowLocalDateTime()}
          />
          <small className="form-help">{t('tourWizard.step1.help.bookingDeadline')}</small>
        </div>
      </div>

      <div className="step-summary">
        <h3>{t('tourWizard.step1.summary.title')}</h3>
        <div className="summary-content">
          <p><strong>{t('tourWizard.step1.summary.tourName')}</strong> {formData.tourName || t('tourWizard.step1.summary.notEntered')}</p>
          <p><strong>{t('tourWizard.step1.summary.tourType')}</strong> {tourTypes.find(type => type.value === formData.tourType)?.label || t('tourWizard.step1.summary.notSelected')}</p>
          <p><strong>{t('tourWizard.step1.summary.departurePoint')}</strong> {formData.departurePoint || t('tourWizard.step1.summary.notEntered')}</p>
          <p><strong>{t('tourWizard.step1.summary.vehicle')}</strong> {formData.vehicle || 'Xe Du Lịch'}</p>
          <p><strong>{t('tourWizard.step1.summary.duration')}</strong> {formData.duration || t('tourWizard.step1.summary.notEntered')} ngày {formData.nights ? `${formData.nights} đêm` : ''}</p>
          <p><strong>{t('tourWizard.step1.summary.maxCapacity')}</strong> {formData.maxCapacity || t('tourWizard.step1.summary.notEntered')} {t('tourWizard.step1.summary.guests')}</p>
          <p><strong>{t('tourWizard.step1.summary.bookingDeadline')}</strong> {formData.bookingDeadline || t('tourWizard.step1.summary.notEntered')}</p>
        </div>
      </div>
    </div>
  );
};

export default Step1BasicInfo;
