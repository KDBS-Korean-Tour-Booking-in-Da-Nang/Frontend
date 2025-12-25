import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tinymce/tinymce-react';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import { getApiPath, normalizeToRelativePath } from '../../../../../../config/api';
import {
  DollarSign,
  User,
  Baby,
  Users,
  AlertTriangle
} from 'lucide-react';
import styles from './Step3Pricing.module.css';

const Step3Pricing = () => {
  const { t } = useTranslation();
  const { tourData, updateTourData } = useTourWizardContext();

  // TinyMCE configuration với image upload: TinyMCE 8 compatible options (forced_root_block='div', remove_redundant_brs, cleanup), configure image upload handler (POST /api/tour/content-image, normalize về relative path), handle 401
  const getTinyMCEConfig = (height = 200) => ({
    apiKey: import.meta.env.VITE_TINYMCE_API_KEY,
    height,
    menubar: false,
    statusbar: false, // Hide status bar
    resize: false, // Disable resize handle
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount'
    ],
    toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link | table tabledelete | tableprops tablerowprops tablecellprops | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | removeformat | code | help',
    branding: false,
    content_style: 'body { font-family: Inter, system-ui, Arial, sans-serif; font-size: 14px }',
    forced_root_block: 'div',
    remove_redundant_brs: true,
    cleanup: true,
    cleanup_on_startup: true,
    verify_html: false,
    entity_encoding: 'raw',
    convert_urls: false,
    images_upload_handler: async (blobInfo) => {
      const formData = new FormData();
      formData.append('file', blobInfo.blob(), blobInfo.filename());
      
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const token = storage.getItem('token');
      
      if (!token) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      }
      
      try {
        const response = await fetch(getApiPath('/api/tour/content-image'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok && response.status === 401) {
          const { checkAndHandle401 } = await import('../../../../../../utils/apiErrorHandler');
          await checkAndHandle401(response);
          throw new Error('Session expired. Please login again.');
        }
        
        if (response.ok) {
          const imageUrl = await response.text();
          return normalizeToRelativePath(imageUrl);
        } else {
          const errorText = await response.text();
          throw new Error('Upload failed: ' + errorText);
        }
      } catch (error) {
        throw new Error('Không thể upload ảnh. Vui lòng thử lại.');
      }
    },
    automatic_uploads: true,
    file_picker_types: 'image'
  });
  const [formData, setFormData] = useState({
    minGuests: '',
    maxGuests: '',
    adultPrice: '',
    childrenPrice: '',
    babyPrice: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});

  // Update form data khi tourData thay đổi: sync formData (minGuests, maxGuests, adultPrice, childrenPrice, babyPrice) với tourData
  useEffect(() => {
    setFormData({
      minGuests: tourData.minGuests || '',
      maxGuests: tourData.maxGuests || '',
      adultPrice: tourData.adultPrice || '',
      childrenPrice: tourData.childrenPrice || '',
      babyPrice: tourData.babyPrice || ''
    });
  }, [tourData]);

  // Lắng nghe validation trigger từ parent (TourWizard): sử dụng latest values từ cả formData và tourData để đảm bảo có most current values, validate tất cả required fields (adultPrice >= 10000, childrenPrice/babyPrice >= 0), notify parent về validation status, scroll to first error field nếu có errors
  useEffect(() => {
    const handleValidateAll = () => {
      const currentMinGuests = formData.minGuests || tourData.minGuests || '';
      const currentMaxGuests = formData.maxGuests || tourData.maxGuests || '';
      const currentAdultPrice = formData.adultPrice || tourData.adultPrice || '';
      const currentChildrenPrice = formData.childrenPrice || tourData.childrenPrice || '';
      const currentBabyPrice = formData.babyPrice || tourData.babyPrice || '';
      
      const errors = {};
      const MIN_PRICE_ADULT = 10000;
      const MIN_PRICE_CHILDREN_BABY = 0;
      
      // Validate minGuests and maxGuests (optional but if provided must be valid)
      const MAX_GUESTS_LIMIT = 99;
      if (currentMinGuests !== null && currentMinGuests !== undefined && String(currentMinGuests).trim() !== '') {
        const minNum = parseInt(String(currentMinGuests).replace(/[^0-9]/g, ''), 10);
        if (isNaN(minNum) || minNum < 1) {
          errors.minGuests = t('tourWizard.step3.guestLimits.errors.minInvalid') || 'Số khách tối thiểu phải lớn hơn hoặc bằng 1';
        } else {
          const maxNum = currentMaxGuests ? parseInt(String(currentMaxGuests).replace(/[^0-9]/g, ''), 10) : null;
          const maxLimit = maxNum !== null && !isNaN(maxNum) ? maxNum : MAX_GUESTS_LIMIT;
          if (minNum > maxLimit) {
            errors.minGuests = maxNum !== null && !isNaN(maxNum)
              ? (t('tourWizard.step3.guestLimits.errors.minGreaterThanMax') || 'Số khách tối thiểu không được lớn hơn số khách tối đa')
              : (t('tourWizard.step3.guestLimits.errors.maxExceedsLimit', { limit: MAX_GUESTS_LIMIT }) || `Số khách tối thiểu không được vượt quá ${MAX_GUESTS_LIMIT}`);
          }
        }
      }
      
      if (currentMaxGuests !== null && currentMaxGuests !== undefined && String(currentMaxGuests).trim() !== '') {
        const maxNum = parseInt(String(currentMaxGuests).replace(/[^0-9]/g, ''), 10);
        if (isNaN(maxNum) || maxNum < 1) {
          errors.maxGuests = t('tourWizard.step3.guestLimits.errors.maxInvalid') || 'Số khách tối đa phải lớn hơn hoặc bằng 1';
        } else if (maxNum > MAX_GUESTS_LIMIT) {
          errors.maxGuests = t('tourWizard.step3.guestLimits.errors.maxExceedsLimit', { limit: MAX_GUESTS_LIMIT }) || `Số khách tối đa không được vượt quá ${MAX_GUESTS_LIMIT}`;
        } else {
          const minNum = currentMinGuests ? parseInt(String(currentMinGuests).replace(/[^0-9]/g, ''), 10) : null;
          const minLimit = minNum !== null && !isNaN(minNum) ? minNum : 1;
          if (maxNum < minLimit) {
            errors.maxGuests = minNum !== null && !isNaN(minNum)
              ? (t('tourWizard.step3.guestLimits.errors.maxLessThanMin') || 'Số khách tối đa phải lớn hơn hoặc bằng số khách tối thiểu')
              : (t('tourWizard.step3.guestLimits.errors.maxInvalid') || 'Số khách tối đa phải lớn hơn hoặc bằng 1');
          }
        }
      }
      
      if (!currentAdultPrice || String(currentAdultPrice).trim() === '') {
        errors.adultPrice = t('toast.required', { field: t('tourWizard.step3.pricing.adultPrice') }) || 'Giá người lớn là bắt buộc';
      } else {
        const adultPriceNum = parseInt(String(currentAdultPrice).replace(/[^0-9]/g, ''), 10);
        if (isNaN(adultPriceNum) || adultPriceNum < MIN_PRICE_ADULT) {
          errors.adultPrice = t('toast.min_price', { min: MIN_PRICE_ADULT.toLocaleString('vi-VN') }) || `Giá tối thiểu là ${MIN_PRICE_ADULT.toLocaleString('vi-VN')} VND`;
        }
      }
      
      if (currentChildrenPrice !== null && currentChildrenPrice !== undefined && String(currentChildrenPrice).trim() !== '') {
        const childrenPriceNum = parseInt(String(currentChildrenPrice).replace(/[^0-9]/g, ''), 10);
        if (isNaN(childrenPriceNum) || childrenPriceNum < MIN_PRICE_CHILDREN_BABY) {
          errors.childrenPrice = t('toast.min_price', { min: MIN_PRICE_CHILDREN_BABY.toLocaleString('vi-VN') }) || `Giá tối thiểu là ${MIN_PRICE_CHILDREN_BABY.toLocaleString('vi-VN')} VND`;
        }
      }
      
      if (currentBabyPrice !== null && currentBabyPrice !== undefined && String(currentBabyPrice).trim() !== '') {
        const babyPriceNum = parseInt(String(currentBabyPrice).replace(/[^0-9]/g, ''), 10);
        if (isNaN(babyPriceNum) || babyPriceNum < MIN_PRICE_CHILDREN_BABY) {
          errors.babyPrice = t('toast.min_price', { min: MIN_PRICE_CHILDREN_BABY.toLocaleString('vi-VN') }) || `Giá tối thiểu là ${MIN_PRICE_CHILDREN_BABY.toLocaleString('vi-VN')} VND`;
        }
      }
      
      setFieldErrors(errors);
      window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
        detail: { step: 3, hasErrors: Object.keys(errors).length > 0 } 
      }));
      
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
      window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
        detail: { step: 3, hasErrors: false } 
      }));
    };

    window.addEventListener('validateStep3', handleValidateAll);
    window.addEventListener('clearStepErrors', (event) => {
      if (event.detail?.step === 3) {
        handleClearErrors();
      }
    });
    return () => {
      window.removeEventListener('validateStep3', handleValidateAll);
      window.removeEventListener('clearStepErrors', handleClearErrors);
    };
  }, [formData, tourData, t]);

  const addSurcharge = () => {};

  const updateSurcharge = () => {};

  const removeSurcharge = () => {};


  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  return (
    <div className={styles['step3-container']}>
      <div className={styles['step-header']}>
        <h2 className={styles['step-title']}>{t('tourWizard.step3.title')}</h2>
        <p className={styles['step-subtitle']}>{t('tourWizard.step3.subtitle')}</p>
        <div className={styles['warning-message']}>
          <AlertTriangle className={styles['warning-icon']} size={18} strokeWidth={1.5} />
          <span>{t('tourWizard.step3.warning')}</span>
        </div>
      </div>

      {/* Guest Limits */}
      <div className={styles['pricing-section']}>
        <h3>{t('tourWizard.step3.guestLimits.title')}</h3>
        <div className={styles['form-grid']} style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className={styles['form-group']}>
            <label htmlFor="minGuests" className={styles['form-label']}>
              <Users className={styles['label-icon']} size={18} />
              {t('tourWizard.step3.guestLimits.minGuests')}
              {fieldErrors.minGuests && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
            </label>
            <input
              type="number"
              id="minGuests"
              name="minGuests"
              value={formData.minGuests || ''}
              onKeyDown={(e) => { if(['e','E','+','-','.'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                const newFormData = { ...formData, minGuests: value };
                setFormData(newFormData);
                updateTourData(newFormData);
                if (fieldErrors.minGuests) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.minGuests;
                    delete newErrors.maxGuests;
                    const hasErrors = Object.keys(newErrors).length > 0;
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                      detail: { step: 3, hasErrors } 
                    }));
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                const errors = {};
                const MAX_GUESTS_LIMIT = 99;
                if (value && value !== '') {
                  const minNum = parseInt(value, 10);
                  if (isNaN(minNum) || minNum < 1) {
                    errors.minGuests = t('tourWizard.step3.guestLimits.errors.minInvalid') || 'Số khách tối thiểu phải lớn hơn hoặc bằng 1';
                  } else {
                    const maxNum = formData.maxGuests ? parseInt(formData.maxGuests.replace(/[^0-9]/g,''), 10) : null;
                    const maxLimit = maxNum !== null && !isNaN(maxNum) ? maxNum : MAX_GUESTS_LIMIT;
                    if (minNum > maxLimit) {
                      errors.minGuests = maxNum !== null && !isNaN(maxNum)
                        ? (t('tourWizard.step3.guestLimits.errors.minGreaterThanMax') || 'Số khách tối thiểu không được lớn hơn số khách tối đa')
                        : (t('tourWizard.step3.guestLimits.errors.maxExceedsLimit', { limit: MAX_GUESTS_LIMIT }) || `Số khách tối thiểu không được vượt quá ${MAX_GUESTS_LIMIT}`);
                    }
                  }
                }
                if (Object.keys(errors).length > 0) {
                  setFieldErrors(prev => ({ ...prev, ...errors }));
                  window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                    detail: { step: 3, hasErrors: true } 
                  }));
                }
              }}
              className={`${styles['form-input']} ${fieldErrors.minGuests ? styles['error'] : ''}`}
              placeholder={t('tourWizard.step3.guestLimits.placeholders.minGuests')}
              min="1"
              max={formData.maxGuests ? parseInt(formData.maxGuests.replace(/[^0-9]/g,''), 10) || 99 : 99}
            />
            {fieldErrors.minGuests && (
              <div className={styles['error-message']} style={{ marginTop: '0.5rem', color: '#e11d48', fontSize: '0.875rem' }}>
                {fieldErrors.minGuests}
              </div>
            )}
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="maxGuests" className={styles['form-label']}>
              <Users className={styles['label-icon']} size={18} />
              {t('tourWizard.step3.guestLimits.maxGuests')}
              {fieldErrors.maxGuests && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
            </label>
            <input
              type="number"
              id="maxGuests"
              name="maxGuests"
              value={formData.maxGuests || ''}
              onKeyDown={(e) => { if(['e','E','+','-','.'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                const newFormData = { ...formData, maxGuests: value };
                setFormData(newFormData);
                updateTourData(newFormData);
                if (fieldErrors.maxGuests) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.maxGuests;
                    delete newErrors.minGuests;
                    const hasErrors = Object.keys(newErrors).length > 0;
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                      detail: { step: 3, hasErrors } 
                    }));
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                const errors = {};
                const MAX_GUESTS_LIMIT = 99;
                if (value && value !== '') {
                  const maxNum = parseInt(value, 10);
                  const minNum = formData.minGuests ? parseInt(formData.minGuests.replace(/[^0-9]/g,''), 10) : null;
                  const minLimit = minNum !== null && !isNaN(minNum) ? minNum : 1;
                  if (isNaN(maxNum) || maxNum < 1) {
                    errors.maxGuests = t('tourWizard.step3.guestLimits.errors.maxInvalid') || 'Số khách tối đa phải lớn hơn hoặc bằng 1';
                  } else if (maxNum > MAX_GUESTS_LIMIT) {
                    errors.maxGuests = t('tourWizard.step3.guestLimits.errors.maxExceedsLimit', { limit: MAX_GUESTS_LIMIT }) || `Số khách tối đa không được vượt quá ${MAX_GUESTS_LIMIT}`;
                  } else if (maxNum < minLimit) {
                    errors.maxGuests = minNum !== null && !isNaN(minNum)
                      ? (t('tourWizard.step3.guestLimits.errors.maxLessThanMin') || 'Số khách tối đa phải lớn hơn hoặc bằng số khách tối thiểu')
                      : (t('tourWizard.step3.guestLimits.errors.maxInvalid') || 'Số khách tối đa phải lớn hơn hoặc bằng 1');
                  }
                }
                if (Object.keys(errors).length > 0) {
                  setFieldErrors(prev => ({ ...prev, ...errors }));
                  window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                    detail: { step: 3, hasErrors: true } 
                  }));
                }
              }}
              className={`${styles['form-input']} ${fieldErrors.maxGuests ? styles['error'] : ''}`}
              placeholder={t('tourWizard.step3.guestLimits.placeholders.maxGuests')}
              min={formData.minGuests ? parseInt(formData.minGuests.replace(/[^0-9]/g,''), 10) || 1 : 1}
              max="99"
            />
            {fieldErrors.maxGuests && (
              <div className={styles['error-message']} style={{ marginTop: '0.5rem', color: '#e11d48', fontSize: '0.875rem' }}>
                {fieldErrors.maxGuests}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className={styles['pricing-section']}>
        <h3>{t('tourWizard.step3.pricing.title')}</h3>
        <div className={styles['form-grid']}>
          <div className={styles['form-group']}>
            <label htmlFor="adultPrice" className={styles['form-label']}>
              <DollarSign className={styles['label-icon']} size={18} />
              {t('tourWizard.step3.pricing.adultPrice')}
              {fieldErrors.adultPrice && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
            </label>
            <input
              type="number"
              id="adultPrice"
              name="adultPrice"
              value={formData.adultPrice || ''}
              onKeyDown={(e) => { if(['e','E','+','-','.'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                const newFormData = { ...formData, adultPrice: value };
                setFormData(newFormData);
                updateTourData(newFormData);
                // Clear error for this field when user starts typing
                if (fieldErrors.adultPrice) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.adultPrice;
                    // Notify parent about validation status change
                    const hasErrors = Object.keys(newErrors).length > 0;
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                      detail: { step: 3, hasErrors } 
                    }));
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                if (value && value !== '') {
                  const priceNum = parseInt(value, 10);
                  const MIN_PRICE = 10000;
                  if (!isNaN(priceNum) && priceNum < MIN_PRICE) {
                    setFieldErrors(prev => ({
                      ...prev,
                      adultPrice: t('toast.min_price', { min: MIN_PRICE.toLocaleString('vi-VN') }) || `Giá tối thiểu là ${MIN_PRICE.toLocaleString('vi-VN')} VND`
                    }));
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                      detail: { step: 3, hasErrors: true } 
                    }));
                  }
                }
              }}
              className={`${styles['form-input']} ${fieldErrors.adultPrice ? styles['error'] : ''}`}
              placeholder={t('tourWizard.step3.pricing.placeholders.adultPrice')}
              min="10000"
            />
            <small className={styles['form-help']}>{t('tourWizard.step3.pricing.unit')}</small>
            {fieldErrors.adultPrice && (
              <div className={styles['error-message']} style={{ marginTop: '0.5rem', color: '#e11d48', fontSize: '0.875rem' }}>
                {fieldErrors.adultPrice}
              </div>
            )}
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="childrenPrice" className={styles['form-label']}>
              <User className={styles['label-icon']} size={18} />
              {t('tourWizard.step3.pricing.childrenPrice')}
              {fieldErrors.childrenPrice && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
            </label>
            <input
              type="number"
              id="childrenPrice"
              name="childrenPrice"
              value={formData.childrenPrice || ''}
              onKeyDown={(e) => { if(['e','E','+','-','.'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                const newFormData = { ...formData, childrenPrice: value };
                setFormData(newFormData);
                updateTourData(newFormData);
                if (fieldErrors.childrenPrice) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.childrenPrice;
                    const hasErrors = Object.keys(newErrors).length > 0;
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                      detail: { step: 3, hasErrors } 
                    }));
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                if (value !== '') {
                  const priceNum = parseInt(value, 10);
                  const MIN_PRICE = 0;
                  if (!isNaN(priceNum) && priceNum < MIN_PRICE) {
                    setFieldErrors(prev => ({
                      ...prev,
                      childrenPrice: t('toast.min_price', { min: MIN_PRICE.toLocaleString('vi-VN') }) || `Giá tối thiểu là ${MIN_PRICE.toLocaleString('vi-VN')} VND`
                    }));
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                      detail: { step: 3, hasErrors: true } 
                    }));
                  }
                }
              }}
              className={`${styles['form-input']} ${fieldErrors.childrenPrice ? styles['error'] : ''}`}
              placeholder={t('tourWizard.step3.pricing.placeholders.childrenPrice')}
              min="0"
            />
            <small className={styles['form-help']}>{t('tourWizard.step3.pricing.unitChildren')}</small>
            {fieldErrors.childrenPrice && (
              <div className={styles['error-message']} style={{ marginTop: '0.5rem', color: '#e11d48', fontSize: '0.875rem' }}>
                {fieldErrors.childrenPrice}
              </div>
            )}
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="babyPrice" className={styles['form-label']}>
              <Baby className={styles['label-icon']} size={18} />
              {t('tourWizard.step3.pricing.babyPrice')}
              {fieldErrors.babyPrice && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
            </label>
            <input
              type="number"
              id="babyPrice"
              name="babyPrice"
              value={formData.babyPrice || ''}
              onKeyDown={(e) => { if(['e','E','+','-','.'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                const newFormData = { ...formData, babyPrice: value };
                setFormData(newFormData);
                updateTourData(newFormData);
                if (fieldErrors.babyPrice) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.babyPrice;
                    const hasErrors = Object.keys(newErrors).length > 0;
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                      detail: { step: 3, hasErrors } 
                    }));
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                // Validate minimum price on blur - allow 0 (free)
                const value = e.target.value.replace(/[^0-9]/g,'');
                if (value !== '') {
                  const priceNum = parseInt(value, 10);
                  const MIN_PRICE = 0; // Allow 0 VND for baby (free)
                  if (!isNaN(priceNum) && priceNum < MIN_PRICE) {
                    setFieldErrors(prev => ({
                      ...prev,
                      babyPrice: t('toast.min_price', { min: MIN_PRICE.toLocaleString('vi-VN') }) || `Giá tối thiểu là ${MIN_PRICE.toLocaleString('vi-VN')} VND`
                    }));
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                      detail: { step: 3, hasErrors: true } 
                    }));
                  }
                }
              }}
              className={`${styles['form-input']} ${fieldErrors.babyPrice ? styles['error'] : ''}`}
              placeholder={t('tourWizard.step3.pricing.placeholders.babyPrice')}
              min="0"
            />
            <small className={styles['form-help']}>{t('tourWizard.step3.pricing.unitBaby')}</small>
            {fieldErrors.babyPrice && (
              <div className={styles['error-message']} style={{ marginTop: '0.5rem', color: '#e11d48', fontSize: '0.875rem' }}>
                {fieldErrors.babyPrice}
              </div>
            )}
          </div>
        </div>

        {/* Price Summary */}
        <div className={styles['price-summary']}>
          <h4>{t('tourWizard.step3.summary.title')}</h4>
          <div className={styles['summary-grid']}>
            <div className={styles['price-item']}>
              <span className={styles['price-label']}>{t('tourWizard.step3.summary.adult')}</span>
              <span className={styles['price-value']}>{formatPrice(formData.adultPrice)}</span>
            </div>
            <div className={styles['price-item']}>
              <span className={styles['price-label']}>{t('tourWizard.step3.summary.children')}</span>
              <span className={styles['price-value']}>{formatPrice(formData.childrenPrice)}</span>
            </div>
            <div className={styles['price-item']}>
              <span className={styles['price-label']}>{t('tourWizard.step3.summary.baby')}</span>
              <span className={styles['price-value']}>{formatPrice(formData.babyPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Surcharges removed */}

      {/* Policies removed: consolidated into tourDescription at the bottom of FE pages */}
    </div>
  );
};

export default Step3Pricing;
