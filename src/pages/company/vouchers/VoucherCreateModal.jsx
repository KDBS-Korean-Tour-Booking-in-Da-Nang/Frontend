import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../../contexts/ToastContext';
import { createVoucher } from '../../../services/voucherAPI';
import styles from './VoucherCreateModal.module.css';

const defaultState = {
  code: '',
  name: '',
  discountType: '', // 'AMOUNT' | 'PERCENT' (frontend) -> 'FIXED' | 'PERCENT' (backend)
  discountValue: '',
  minOrderValue: '',
  totalQuantity: '',
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
  tourIds: []
};

const VoucherCreateModal = ({ isOpen, onClose, onSuccess, tours, companyId }) => {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [form, setForm] = useState(defaultState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setForm(defaultState);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validate = () => {
    const e = {};
    if (!form.code || !form.code.trim()) e.code = t('voucherCreate.errors.codeRequired');
    if (!form.name || !form.name.trim()) e.name = t('voucherCreate.errors.nameRequired');
    if (!form.discountType) e.discountType = t('voucherCreate.errors.discountTypeRequired');
    if (form.discountType && !form.discountValue) {
      e.discountValue = t('voucherCreate.errors.discountValueRequired');
    } else if (form.discountType === 'PERCENT') {
      const v = Number(form.discountValue);
      if (isNaN(v) || v < 1 || v > 100) e.discountValue = t('voucherCreate.errors.discountPercentRange');
    } else if (form.discountType === 'AMOUNT') {
      const v = Number(form.discountValue);
      if (isNaN(v) || v < 1) e.discountValue = t('voucherCreate.errors.discountAmountMin');
    }
    if (!form.totalQuantity || Number(form.totalQuantity) < 1) {
      e.totalQuantity = t('voucherCreate.errors.totalQuantityRequired');
    }
    // minOrderValue is optional, no validation needed
    if (!form.startDate) {
      e.startDate = t('voucherCreate.errors.startDateRequired');
    }
    if (!form.endDate) {
      e.endDate = t('voucherCreate.errors.endDateRequired');
    }
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end <= start) {
        e.endDate = t('voucherCreate.errors.endDateAfterStart');
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!companyId) {
      setErrors(prev => ({ ...prev, general: t('voucherCreate.errors.companyNotFound') }));
      return;
    }
    
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });

    setIsSubmitting(true);
    try {
      // Map frontend discountType (AMOUNT) to backend (FIXED)
      const backendDiscountType = form.discountType === 'AMOUNT' ? 'FIXED' : form.discountType;

      // Prepare payload for backend
      const payload = {
        companyId: companyId,
        code: form.code.trim(),
        name: form.name.trim(),
        discountType: backendDiscountType,
        discountValue: Number(form.discountValue),
        minOrderValue: form.minOrderValue && form.minOrderValue.trim() ? Number(form.minOrderValue) : null,
        totalQuantity: Number(form.totalQuantity),
        startDate: form.startDate ? form.startDate : null, // Backend expects LocalDateTime format (YYYY-MM-DDTHH:mm)
        endDate: form.endDate ? form.endDate : null,
        status: form.status,
        tourIds: form.tourIds && form.tourIds.length > 0 ? form.tourIds : null // null or empty array means apply to all tours
      };

      await createVoucher(payload);
      showSuccess(t('voucherCreate.success.created'));
      setErrors({}); // Clear all errors on success
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, general: error.message || t('voucherCreate.errors.createFailed') }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleTour = (id) => {
    setForm((prev) => {
      const set = new Set(prev.tourIds);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...prev, tourIds: Array.from(set) };
    });
  };

  const [tourDropdownOpen, setTourDropdownOpen] = useState(false);
  const firstItemRef = useRef(null);
  const [panelMaxH, setPanelMaxH] = useState(0);
  const dropdownRef = useRef(null);

  useLayoutEffect(() => {
    if (tourDropdownOpen && firstItemRef.current) {
      const itemHeight = firstItemRef.current.offsetHeight || 40;
      setPanelMaxH(itemHeight * 7 + 8); // 7 items + a small padding
    }
  }, [tourDropdownOpen, tours]);

  useEffect(() => {
    if (!tourDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setTourDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tourDropdownOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles['modal-overlay']}>
      <div className={styles['modal-backdrop']} onClick={onClose} />
      <div className={styles['modal-container']}>
        {/* Header */}
        <div className={styles['modal-header']}>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('voucherCreate.close')}
            className={styles['modal-close-btn']}
          >
            <XMarkIcon className={styles['close-icon']} />
          </button>
          <h3 className={styles['modal-title']}>{t('voucherCreate.title')}</h3>
        </div>

        {/* Body: scrollable form */}
        <form ref={formRef} onSubmit={handleSubmit} className={styles['modal-form']}>
          <div className={styles['form-grid']}>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                {t('voucherCreate.fields.code')}
                {errors.code && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
              </label>
              <input 
                className={`${styles['form-input']} ${errors.code ? styles['error'] : ''}`}
                value={form.code} 
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder={t('voucherCreate.placeholders.code')}
              />
              {errors.code && <p className={styles['error-message']}>{errors.code}</p>}
            </div>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                {t('voucherCreate.fields.name')}
                {errors.name && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
              </label>
              <input 
                className={`${styles['form-input']} ${errors.name ? styles['error'] : ''}`}
                value={form.name} 
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={t('voucherCreate.placeholders.name')}
              />
              {errors.name && <p className={styles['error-message']}>{errors.name}</p>}
            </div>
          </div>

          <div className={styles['form-grid']}>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                {t('voucherCreate.fields.discountType')}
                {errors.discountType && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
              </label>
              <div className={styles['radio-group']}>
                <label className={styles['radio-label']}>
                  <input 
                    type="radio" 
                    name="discountType" 
                    className={styles['radio-input']}
                    checked={form.discountType === 'AMOUNT'} 
                    onChange={() => handleChange('discountType', 'AMOUNT')} 
                  />
                  <span>{t('voucherManagement.discountTypes.fixed')}</span>
                </label>
                <label className={styles['radio-label']}>
                  <input 
                    type="radio" 
                    name="discountType" 
                    className={styles['radio-input']}
                    checked={form.discountType === 'PERCENT'} 
                    onChange={() => handleChange('discountType', 'PERCENT')} 
                  />
                  <span>{t('voucherManagement.discountTypes.percent')}</span>
                </label>
              </div>
              {errors.discountType && <p className={styles['error-message']}>{errors.discountType}</p>}
            </div>
            {form.discountType && (
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>
                  {t('voucherCreate.fields.discountValue')}
                  {errors.discountValue && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
                </label>
                <input
                  className={`${styles['form-input']} ${errors.discountValue ? styles['error'] : ''}`}
                  type="number"
                  min={form.discountType === 'PERCENT' ? 1 : 1}
                  max={form.discountType === 'PERCENT' ? 100 : undefined}
                  step={form.discountType === 'PERCENT' ? 1 : 'any'}
                  placeholder={form.discountType === 'PERCENT' ? t('voucherCreate.placeholders.discountPercent') : t('voucherCreate.placeholders.discountAmount')}
                  value={form.discountValue}
                  onKeyDown={(e) => {
                    if (form.discountType === 'PERCENT') {
                      if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                        e.preventDefault();
                      }
                    } else {
                      if (['-', '+'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleChange('discountValue', value);
                  }}
                  onBlur={(e) => {
                    const numValue = Number(e.target.value);
                    if (form.discountType === 'PERCENT') {
                      if (isNaN(numValue) || numValue < 1) {
                        handleChange('discountValue', '1');
                      } else if (numValue > 100) {
                        handleChange('discountValue', '100');
                      }
                    } else if (form.discountType === 'AMOUNT') {
                      if (isNaN(numValue) || numValue < 1) {
                        handleChange('discountValue', '1');
                      }
                    }
                  }}
                />
                {errors.discountValue && <p className={styles['error-message']}>{errors.discountValue}</p>}
              </div>
            )}
          </div>

          <div className={styles['form-grid-3']}>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                {t('voucherCreate.fields.totalQuantity')}
                {errors.totalQuantity && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
              </label>
              <input 
                className={`${styles['form-input']} ${errors.totalQuantity ? styles['error'] : ''}`}
                type="number" 
                min={1} 
                value={form.totalQuantity} 
                onChange={(e) => handleChange('totalQuantity', e.target.value)} 
              />
              {errors.totalQuantity && <p className={styles['error-message']}>{errors.totalQuantity}</p>}
            </div>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>{t('voucherCreate.fields.minOrderValue')}</label>
              <input 
                className={styles['form-input']}
                type="number" 
                min={0} 
                value={form.minOrderValue || ''} 
                onChange={(e) => handleChange('minOrderValue', e.target.value)} 
              />
            </div>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>{t('voucherCreate.fields.status')}</label>
              <select 
                className={styles['form-select']} 
                value={form.status} 
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="ACTIVE">{t('voucherManagement.status.ACTIVE')}</option>
                <option value="INACTIVE">{t('voucherManagement.status.INACTIVE')}</option>
                <option value="EXPIRED">{t('voucherManagement.status.EXPIRED')}</option>
              </select>
            </div>
          </div>

          <div className={styles['form-grid']}>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                {t('voucherCreate.fields.startDate')}
                {errors.startDate && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
              </label>
              <input
                className={`${styles['form-input']} ${errors.startDate ? styles['error'] : ''}`}
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.startDate && <p className={styles['error-message']}>{errors.startDate}</p>}
            </div>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                {t('voucherCreate.fields.endDate')}
                {errors.endDate && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
              </label>
              <input
                className={`${styles['form-input']} ${errors.endDate ? styles['error'] : ''}`}
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                min={form.startDate || new Date().toISOString().slice(0, 16)}
              />
              {errors.endDate && <p className={styles['error-message']}>{errors.endDate}</p>}
            </div>
          </div>

          {/* Multi-select tours as dropdown */}
          <div className={styles['tour-dropdown-wrapper']} ref={dropdownRef}>
            <label className={styles['form-label']}>{t('voucherCreate.fields.applyToTours')}</label>
            <button
              type="button"
              onClick={() => setTourDropdownOpen((o) => !o)}
              className={styles['tour-dropdown-btn']}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.tourIds.length === 0 ? t('voucherCreate.tourDropdown.select') : `${form.tourIds.length} ${t('voucherCreate.tourDropdown.selected')}`}
              </span>
              <svg 
                className={`${styles['dropdown-arrow']} ${tourDropdownOpen ? styles['open'] : ''}`} 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
              </svg>
            </button>
            {tourDropdownOpen && (
              <div
                className={styles['tour-dropdown-panel']}
                style={{ maxHeight: `${panelMaxH}px` }}
              >
                {tours?.length === 0 ? (
                  <div className={styles['tour-dropdown-empty']}>{t('voucherCreate.tourDropdown.empty')}</div>
                ) : (
                  tours?.map((t, i) => (
                    <label 
                      key={t.id} 
                      ref={i === 0 ? firstItemRef : null} 
                      className={styles['tour-dropdown-item']}
                    >
                      <input
                        type="checkbox"
                        checked={form.tourIds.includes(t.id)}
                        onChange={() => toggleTour(t.id)}
                      />
                      <span>{t.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer: sticky at bottom */}
        <div className={styles['modal-footer']}>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSubmitting}
            className={`${styles['footer-btn']} ${styles['btn-cancel']}`}
          >
            {t('voucherCreate.actions.cancel')}
          </button>
          <button 
            type="button" 
            onClick={() => formRef.current?.requestSubmit()} 
            disabled={isSubmitting || !companyId || Object.keys(errors).length > 0}
            className={`${styles['footer-btn']} ${styles['btn-submit']}`}
          >
            {isSubmitting ? t('voucherCreate.actions.creating') : t('voucherCreate.actions.create')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoucherCreateModal;


