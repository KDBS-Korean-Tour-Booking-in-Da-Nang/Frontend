import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tinymce/tinymce-react';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import './Step3Pricing.css';

const Step3Pricing = () => {
  const { t } = useTranslation();
  const { tourData, updateTourData } = useTourWizardContext();
  const { showError } = useToast();

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
      
      try {
        const response = await fetch('/api/tour/content-image', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const imageUrl = await response.text();
          console.log('Uploaded image URL:', imageUrl);
          return imageUrl;
        } else {
          const errorText = await response.text();
          console.error('Upload failed:', response.status, errorText);
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

  const [surcharges, setSurcharges] = useState([]);

  // Update form data when tourData changes
  useEffect(() => {
    setFormData({
      adultPrice: tourData.adultPrice || '',
      childrenPrice: tourData.childrenPrice || '',
      babyPrice: tourData.babyPrice || ''
    });
    setSurcharges(tourData.surcharges || []);
  }, [tourData]);

  const addSurcharge = () => {
    const newSurcharge = {
      type: 'holiday',
      name: '',
      percentage: '',
      description: ''
    };
    const newSurcharges = [...surcharges, newSurcharge];
    setSurcharges(newSurcharges);
    updateTourData({ ...formData, surcharges: newSurcharges });
  };

  const updateSurcharge = (index, field, value) => {
    const newSurcharges = surcharges.map((surcharge, i) => 
      i === index ? { ...surcharge, [field]: value } : surcharge
    );
    setSurcharges(newSurcharges);
    updateTourData({ ...formData, surcharges: newSurcharges });
  };

  const removeSurcharge = (index) => {
    const newSurcharges = surcharges.filter((_, i) => i !== index);
    setSurcharges(newSurcharges);
    updateTourData({ ...formData, surcharges: newSurcharges });
  };


  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  return (
    <div className="step3-container">
      <div className="step-header">
        <h2 className="step-title">{t('tourWizard.step3.title')}</h2>
        <p className="step-subtitle">{t('tourWizard.step3.subtitle')}</p>
      </div>

      {/* Pricing */}
      <div className="pricing-section">
        <h3>{t('tourWizard.step3.pricing.title')}</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="adultPrice" className="form-label">
              {t('tourWizard.step3.pricing.adultPrice')}
            </label>
            <input
              type="number"
              id="adultPrice"
              name="adultPrice"
              value={formData.adultPrice}
              onKeyDown={(e) => { if(['e','E','+','-','.'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                const newFormData = { ...formData, adultPrice: value };
                setFormData(newFormData);
                updateTourData(newFormData);
              }}
              className="form-input"
              placeholder={t('tourWizard.step3.pricing.placeholders.adultPrice')}
              min="0"
            />
            <small className="form-help">{t('tourWizard.step3.pricing.unit')}</small>
            {!formData.adultPrice && (
              <div className="form-error">{t('tourWizard.step3.pricing.error')}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="childrenPrice" className="form-label">
              {t('tourWizard.step3.pricing.childrenPrice')}
            </label>
            <input
              type="number"
              id="childrenPrice"
              name="childrenPrice"
              value={formData.childrenPrice}
              onKeyDown={(e) => { if(['e','E','+','-','.'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                const newFormData = { ...formData, childrenPrice: value };
                setFormData(newFormData);
                updateTourData(newFormData);
              }}
              className="form-input"
              placeholder={t('tourWizard.step3.pricing.placeholders.childrenPrice')}
              min="0"
            />
            <small className="form-help">{t('tourWizard.step3.pricing.unitChildren')}</small>
          </div>

          <div className="form-group">
            <label htmlFor="babyPrice" className="form-label">
              {t('tourWizard.step3.pricing.babyPrice')}
            </label>
            <input
              type="number"
              id="babyPrice"
              name="babyPrice"
              value={formData.babyPrice}
              onKeyDown={(e) => { if(['e','E','+','-','.'].includes(e.key)) e.preventDefault(); }}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g,'');
                const newFormData = { ...formData, babyPrice: value };
                setFormData(newFormData);
                updateTourData(newFormData);
              }}
              className="form-input"
              placeholder={t('tourWizard.step3.pricing.placeholders.babyPrice')}
              min="0"
            />
            <small className="form-help">{t('tourWizard.step3.pricing.unitBaby')}</small>
          </div>
        </div>

        {/* Price Summary */}
        <div className="price-summary">
          <h4>{t('tourWizard.step3.summary.title')}</h4>
          <div className="summary-grid">
            <div className="price-item">
              <span className="price-label">{t('tourWizard.step3.summary.adult')}</span>
              <span className="price-value">{formatPrice(formData.adultPrice)}</span>
            </div>
            <div className="price-item">
              <span className="price-label">{t('tourWizard.step3.summary.children')}</span>
              <span className="price-value">{formatPrice(formData.childrenPrice)}</span>
            </div>
            <div className="price-item">
              <span className="price-label">{t('tourWizard.step3.summary.baby')}</span>
              <span className="price-value">{formatPrice(formData.babyPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Surcharges */}
      <div className="surcharges-section">
        <div className="section-header">
          <h3>{t('tourWizard.step3.surcharges.title')}</h3>
          <button 
            type="button" 
            className="btn-add" 
            onClick={addSurcharge}
          >
            {t('tourWizard.step3.surcharges.add')}
          </button>
        </div>

        {surcharges.map((surcharge, index) => (
          <div key={index} className="surcharge-item">
            <select
              value={surcharge.type}
              onChange={(e) => updateSurcharge(index, 'type', e.target.value)}
              className="form-select"
            >
              <option value="holiday">{t('tourWizard.step3.surcharges.types.holiday')}</option>
              <option value="weekend">{t('tourWizard.step3.surcharges.types.weekend')}</option>
              <option value="single-room">{t('tourWizard.step3.surcharges.types.singleRoom')}</option>
              <option value="peak-season">{t('tourWizard.step3.surcharges.types.peakSeason')}</option>
              <option value="other">{t('tourWizard.step3.surcharges.types.other')}</option>
            </select>
            <input
              type="text"
              placeholder={t('tourWizard.step3.surcharges.placeholders.name')}
              value={surcharge.name}
              onChange={(e) => updateSurcharge(index, 'name', e.target.value)}
              className="form-input"
            />
            <input
              type="number"
              placeholder={t('tourWizard.step3.surcharges.placeholders.percentage')}
              value={surcharge.percentage}
              onChange={(e) => updateSurcharge(index, 'percentage', e.target.value)}
              className="form-input"
            />
            <button 
              type="button" 
              className="btn-remove-small"
              onClick={() => removeSurcharge(index)}
            >
              X
            </button>
          </div>
        ))}

        {/* Description Editor - Full Width */}
        {surcharges.length > 0 && (
          <div className="surcharge-description-section">
            <label className="form-label">{t('tourWizard.step3.surcharges.description')}</label>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY || 'no-api-key'}
              value={surcharges[0]?.description || ''}
              onEditorChange={(content) => {
                if (surcharges.length > 0) {
                  updateSurcharge(0, 'description', content);
                }
              }}
              init={getTinyMCEConfig(200)}
            />
          </div>
        )}
      </div>

      {/* Policies removed: consolidated into tourDescription at the bottom of FE pages */}
    </div>
  );
};

export default Step3Pricing;
