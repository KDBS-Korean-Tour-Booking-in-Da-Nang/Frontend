import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import TourCard from './TourCard';
import './Step4Media.css';

const Step4Media = () => {
  const { t } = useTranslation();
  const { showError } = useToast();
  const { tourData, updateTourData } = useTourWizardContext();
  const [formData, setFormData] = useState({
    thumbnail: null
  });

  // Update form data when tourData changes
  useEffect(() => {
    setFormData({
      thumbnail: tourData.thumbnail || null
    });
  }, [tourData]);

  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError({ i18nKey: 'toast.field_invalid' });
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        showError({ i18nKey: 'toast.field_invalid' });
        return;
      }
      
      const newFormData = { ...formData, thumbnail: file };
      setFormData(newFormData);
      updateTourData(newFormData);
    }
  };



  return (
    <div className="step4-container">
      <h2 className="section-title">{t('tourWizard.step4.title')}</h2>

      {/* Thumbnail */}
      <div className="media-section">
        <div className="upload-area">
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailUpload}
            className="file-input"
            id="thumbnail-upload"
          />
          <label htmlFor="thumbnail-upload">
            {formData.thumbnail ? (
              <div className="thumbnail-preview">
                <img 
                  src={URL.createObjectURL(formData.thumbnail)} 
                  alt="Thumbnail preview" 
                  className="thumbnail-image"
                />
                <div className="upload-text">{t('tourWizard.step4.thumbnail.changeImage')}</div>
                <div className="upload-subtext">
                  {formData.thumbnail.name} • {(formData.thumbnail.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">📷</div>
                <div className="upload-text">{t('tourWizard.step4.thumbnail.selectImage')}</div>
                <div className="upload-subtext">
                  {t('tourWizard.step4.thumbnail.supportedFormats')}<br/>
                  {t('tourWizard.step4.thumbnail.recommendedSize')}
                </div>
              </div>
            )}
          </label>
        </div>
      </div>


      {/* Preview */}
      <div className="preview-container">
        <h3 className="preview-title">{t('tourWizard.step4.preview.title')}</h3>
        
        <div className="preview-grid">
          <TourCard 
            tour={{
              tourName: tourData.tourName || 'Tour Hàn Quốc đi tết âm lịch từ Đà Nẵng',
              tourDuration: `${tourData.duration || '5'} ngày ${tourData.nights || '4'} đêm`,
              adultPrice: tourData.adultPrice || 14990000,
              thumbnail: formData.thumbnail,
              tourStatus: 'ACTIVE'
            }}
            onClick={() => {}}
            showActions={false}
          />
          
          <div className="preview-info">
            <h5>{t('tourWizard.step4.preview.infoTitle')}</h5>
            <ul>
              <li><strong>{t('tourWizard.step4.preview.fields.tourName')}</strong> {tourData.tourName || t('tourWizard.step4.preview.values.notSet')}</li>
              <li><strong>{t('tourWizard.step4.preview.fields.duration')}</strong> {tourData.duration || '0'} ngày {tourData.nights || '0'} đêm</li>
              <li><strong>{t('tourWizard.step4.preview.fields.adultPrice')}</strong> {tourData.adultPrice ? `${new Intl.NumberFormat('vi-VN').format(tourData.adultPrice)} VNĐ` : t('tourWizard.step4.preview.values.noPrice')}</li>
              <li><strong>{t('tourWizard.step4.preview.fields.image')}</strong> {formData.thumbnail ? t('tourWizard.step4.preview.values.uploaded') : t('tourWizard.step4.preview.values.notUploaded')}</li>
              <li><strong>{t('tourWizard.step4.preview.fields.status')}</strong> {t('tourWizard.step4.preview.values.willShow')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4Media;
