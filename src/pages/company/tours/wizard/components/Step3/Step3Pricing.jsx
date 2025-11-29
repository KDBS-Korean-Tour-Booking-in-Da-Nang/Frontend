import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tinymce/tinymce-react';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import styles from './Step3Pricing.module.css';

const Step3Pricing = () => {
  const { t } = useTranslation();
  const { tourData, updateTourData } = useTourWizardContext();
  // Removed showError - errors will be handled in UI

  // TinyMCE configuration with image upload
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
    // TinyMCE 8 compatible options
    forced_root_block: 'div',
    remove_redundant_brs: true,
    // Clean up HTML
    cleanup: true,
    cleanup_on_startup: true,
    verify_html: false,
    // Additional settings to prevent <p> tags
    entity_encoding: 'raw',
    convert_urls: false,
    // Configure image upload
    images_upload_handler: async (blobInfo) => {
      const formData = new FormData();
      formData.append('file', blobInfo.blob(), blobInfo.filename());
      
      // Get token for authentication
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const token = storage.getItem('token');
      
      if (!token) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      }
      
      try {
        const response = await fetch('/api/tour/content-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        // Handle 401 if token expired
        if (!response.ok && response.status === 401) {
          const { checkAndHandle401 } = await import('../../../../../../utils/apiErrorHandler');
          await checkAndHandle401(response);
          throw new Error('Session expired. Please login again.');
        }
        
        if (response.ok) {
          const imageUrl = await response.text();
          return imageUrl;
        } else {
          const errorText = await response.text();
          throw new Error('Upload failed: ' + errorText);
        }
      } catch (error) {
        console.error('Image upload error:', error);
        throw new Error('Không thể upload ảnh. Vui lòng thử lại.');
      }
    },
    automatic_uploads: true,
    file_picker_types: 'image'
  });
  const [formData, setFormData] = useState({
    adultPrice: '',
    childrenPrice: '',
    babyPrice: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});

  // Surcharges feature removed

  // Update form data when tourData changes
  useEffect(() => {
    setFormData({
      adultPrice: tourData.adultPrice || '',
      childrenPrice: tourData.childrenPrice || '',
      babyPrice: tourData.babyPrice || ''
    });
    // no-op for surcharges
  }, [tourData]);

  // Listen for validation trigger from parent (TourWizard) - similar to Step3Pricing pattern
  useEffect(() => {
    const handleValidateAll = () => {
      // Use latest values from both formData and tourData to ensure we have the most current values
      const currentAdultPrice = formData.adultPrice || tourData.adultPrice || '';
      const currentChildrenPrice = formData.childrenPrice || tourData.childrenPrice || '';
      const currentBabyPrice = formData.babyPrice || tourData.babyPrice || '';
      
      // Validate all required fields and show errors
      const errors = {};
      
      // Check adultPrice - must be non-empty
      if (!currentAdultPrice || String(currentAdultPrice).trim() === '') {
        errors.adultPrice = t('toast.required', { field: t('tourWizard.step3.pricing.adultPrice') }) || 'Giá người lớn là bắt buộc';
      }
      
      // Check childrenPrice - must be non-empty
      if (!currentChildrenPrice || String(currentChildrenPrice).trim() === '') {
        errors.childrenPrice = t('toast.required', { field: t('tourWizard.step3.pricing.childrenPrice') }) || 'Giá trẻ em là bắt buộc';
      }
      
      // Check babyPrice - must be non-empty
      if (!currentBabyPrice || String(currentBabyPrice).trim() === '') {
        errors.babyPrice = t('toast.required', { field: t('tourWizard.step3.pricing.babyPrice') }) || 'Giá em bé là bắt buộc';
      }
      
      setFieldErrors(errors);
      // Notify parent about validation status
      window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
        detail: { step: 3, hasErrors: Object.keys(errors).length > 0 } 
      }));
    };

    const handleClearErrors = () => {
      setFieldErrors({});
      // Notify parent that errors are cleared
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
      </div>

      {/* Pricing */}
      <div className={styles['pricing-section']}>
        <h3>{t('tourWizard.step3.pricing.title')}</h3>
        <div className={styles['form-grid']}>
          <div className={styles['form-group']}>
            <label htmlFor="adultPrice" className={styles['form-label']}>
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
              className={`${styles['form-input']} ${fieldErrors.adultPrice ? styles['error'] : ''}`}
              placeholder={t('tourWizard.step3.pricing.placeholders.adultPrice')}
              min="0"
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
                // Clear error for this field when user starts typing
                if (fieldErrors.childrenPrice) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.childrenPrice;
                    // Notify parent about validation status change
                    const hasErrors = Object.keys(newErrors).length > 0;
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                      detail: { step: 3, hasErrors } 
                    }));
                    return newErrors;
                  });
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
                // Clear error for this field when user starts typing
                if (fieldErrors.babyPrice) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.babyPrice;
                    // Notify parent about validation status change
                    const hasErrors = Object.keys(newErrors).length > 0;
                    window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
                      detail: { step: 3, hasErrors } 
                    }));
                    return newErrors;
                  });
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
