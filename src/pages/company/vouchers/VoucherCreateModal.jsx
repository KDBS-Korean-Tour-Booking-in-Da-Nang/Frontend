import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
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
    if (!form.code || !form.code.trim()) e.code = 'Vui lòng nhập mã voucher';
    if (!form.name || !form.name.trim()) e.name = 'Vui lòng nhập tên voucher';
    if (!form.discountType) e.discountType = 'Vui lòng chọn loại giảm giá';
    if (form.discountType && !form.discountValue) {
      e.discountValue = 'Vui lòng nhập giá trị giảm';
    } else if (form.discountType === 'PERCENT') {
      const v = Number(form.discountValue);
      if (isNaN(v) || v < 1 || v > 100) e.discountValue = 'Phần trăm từ 1 đến 100';
    } else if (form.discountType === 'AMOUNT') {
      const v = Number(form.discountValue);
      if (isNaN(v) || v < 1) e.discountValue = 'Giá trị giảm phải từ 1 trở lên (ví dụ: 100000 cho 100k)';
    }
    if (!form.totalQuantity || Number(form.totalQuantity) < 1) {
      e.totalQuantity = 'Số lượng phải lớn hơn 0';
    }
    // minOrderValue is optional, no validation needed
    if (!form.startDate) {
      e.startDate = 'Vui lòng chọn ngày bắt đầu';
    }
    if (!form.endDate) {
      e.endDate = 'Vui lòng chọn ngày kết thúc';
    }
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end <= start) {
        e.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!companyId) {
      setErrors(prev => ({ ...prev, general: 'Không tìm thấy thông tin công ty' }));
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
      showSuccess('Tạo voucher thành công');
      setErrors({}); // Clear all errors on success
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, general: error.message || 'Không thể tạo voucher. Vui lòng thử lại.' }));
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
            aria-label="Đóng"
            className={styles['modal-close-btn']}
          >
            <XMarkIcon className={styles['close-icon']} />
          </button>
          <h3 className={styles['modal-title']}>Tạo voucher</h3>
        </div>

        {/* Body: scrollable form */}
        <form ref={formRef} onSubmit={handleSubmit} className={styles['modal-form']}>
          <div className={styles['form-grid']}>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                Mã voucher
                {errors.code && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
              </label>
              <input 
                className={`${styles['form-input']} ${errors.code ? styles['error'] : ''}`}
                value={form.code} 
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="Ví dụ: VOUCHER001"
              />
              {errors.code && <p className={styles['error-message']}>{errors.code}</p>}
            </div>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                Tên voucher
                {errors.name && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
              </label>
              <input 
                className={`${styles['form-input']} ${errors.name ? styles['error'] : ''}`}
                value={form.name} 
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ví dụ: Giảm 10% cho tour mùa hè"
              />
              {errors.name && <p className={styles['error-message']}>{errors.name}</p>}
            </div>
          </div>

          <div className={styles['form-grid']}>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                Loại giảm giá
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
                  <span>Giảm theo tiền</span>
                </label>
                <label className={styles['radio-label']}>
                  <input 
                    type="radio" 
                    name="discountType" 
                    className={styles['radio-input']}
                    checked={form.discountType === 'PERCENT'} 
                    onChange={() => handleChange('discountType', 'PERCENT')} 
                  />
                  <span>Giảm theo %</span>
                </label>
              </div>
              {errors.discountType && <p className={styles['error-message']}>{errors.discountType}</p>}
            </div>
            {form.discountType && (
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>
                  Giá trị giảm
                  {errors.discountValue && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
                </label>
                <input
                  className={`${styles['form-input']} ${errors.discountValue ? styles['error'] : ''}`}
                  type="number"
                  min={form.discountType === 'PERCENT' ? 1 : 1}
                  max={form.discountType === 'PERCENT' ? 100 : undefined}
                  step={form.discountType === 'PERCENT' ? 1 : 'any'}
                  placeholder={form.discountType === 'PERCENT' ? 'Nhập % (1 - 100)' : 'Nhập số tiền VND (ví dụ: 100000 cho 100k)'}
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
                Số lượng
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
              <label className={styles['form-label']}>Đơn tối thiểu (VND)</label>
              <input 
                className={styles['form-input']}
                type="number" 
                min={0} 
                value={form.minOrderValue || ''} 
                onChange={(e) => handleChange('minOrderValue', e.target.value)} 
              />
            </div>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>Trạng thái</label>
              <select 
                className={styles['form-select']} 
                value={form.status} 
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>
          </div>

          <div className={styles['form-grid']}>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                Ngày bắt đầu
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
                Ngày kết thúc
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
            <label className={styles['form-label']}>Áp dụng cho tour</label>
            <button
              type="button"
              onClick={() => setTourDropdownOpen((o) => !o)}
              className={styles['tour-dropdown-btn']}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.tourIds.length === 0 ? 'Chọn tour áp dụng' : `${form.tourIds.length} tour đã chọn`}
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
                  <div className={styles['tour-dropdown-empty']}>Không có tour</div>
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
            Hủy
          </button>
          <button 
            type="button" 
            onClick={() => formRef.current?.requestSubmit()} 
            disabled={isSubmitting || !companyId || Object.keys(errors).length > 0}
            className={`${styles['footer-btn']} ${styles['btn-submit']}`}
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoucherCreateModal;


