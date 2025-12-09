import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import TourCardStep4 from './TourCardStep4';
import {
  DocumentTextIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import styles from './Step4Media.module.css';

const Step4Media = () => {
  const { t } = useTranslation();
  const { tourData, updateTourData } = useTourWizardContext();
  const [formData, setFormData] = useState({
    thumbnail: null
  });
  const [error, setError] = useState('');

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
        setError(t('toast.field_invalid') || 'File không hợp lệ. Vui lòng chọn file ảnh.');
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError(t('toast.field_invalid') || 'File quá lớn. Kích thước tối đa là 10MB.');
        return;
      }
      
      // Clear error if validation passes
      setError('');
      
      const newFormData = { ...formData, thumbnail: file };
      setFormData(newFormData);
      updateTourData(newFormData);
    }
  };



  return (
    <div className={styles['step4-container']}>
      <h2 className={styles['section-title']}>{t('tourWizard.step4.title')}</h2>

      {/* Thumbnail */}
      <div className={styles['media-section']}>
        <div className={styles['upload-area']}>
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailUpload}
            className={styles['file-input']}
            id="thumbnail-upload"
          />
          <label htmlFor="thumbnail-upload">
            {formData.thumbnail ? (
              <div className={styles['thumbnail-preview']}>
                <img 
                  src={URL.createObjectURL(formData.thumbnail)} 
                  alt="Thumbnail preview" 
                  className={styles['thumbnail-image']}
                />
                <div className={styles['upload-text']}>{t('tourWizard.step4.thumbnail.changeImage')}</div>
                <div className={styles['upload-subtext']}>
                  {formData.thumbnail.name} • {(formData.thumbnail.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div className={styles['upload-placeholder']}>
                <div className={styles['upload-icon']}>📷</div>
                <div className={styles['upload-text']}>{t('tourWizard.step4.thumbnail.selectImage')}</div>
                <div className={styles['upload-subtext']}>
                  {t('tourWizard.step4.thumbnail.supportedFormats')}<br/>
                  {t('tourWizard.step4.thumbnail.recommendedSize')}
                </div>
              </div>
            )}
          </label>
        </div>
      </div>


      {/* Preview */}
      <div className={styles['preview-container']}>
        <h3 className={styles['preview-title']}>{t('tourWizard.step4.preview.title')}</h3>
        
        <div className={styles['preview-grid']}>
          <div className={styles['preview-card-wrapper']}>
            <TourCardStep4 
              tour={{
                tourName: tourData.tourName || t('tourCard.sampleTitle'),
                tourDuration: `${tourData.duration || '2'} ${t('tourWizard.step1.summary.days')} ${tourData.nights || '1'} ${t('tourWizard.step1.summary.nights')}`,
                adultPrice: Number(tourData.adultPrice) || 14990000,
                thumbnail: formData.thumbnail,
                tourStatus: 'ACTIVE',
                tourDeparturePoint: tourData.tourDeparturePoint || null,
                amount: tourData.amount || null
              }}
              showActions={false}
            />
          </div>
          
          <div className={styles['preview-info']}>
            <h5 className={styles['preview-info-title']}>{t('tourWizard.step4.preview.infoTitle')}</h5>
            <div className={styles['preview-info-list']}>
              <div className={styles['preview-info-row']}>
                <div className={styles['preview-info-label-wrapper']}>
                  <DocumentTextIcon className={styles['preview-info-icon']} />
                  <span className={styles['preview-info-label']}>{t('tourWizard.step4.preview.fields.tourName')}</span>
                </div>
                <span className={styles['preview-info-value']}>{tourData.tourName || t('tourWizard.step4.preview.values.notSet')}</span>
              </div>

              <div className={styles['preview-info-row']}>
                <div className={styles['preview-info-label-wrapper']}>
                  <ClockIcon className={styles['preview-info-icon']} />
                  <span className={styles['preview-info-label']}>{t('tourWizard.step4.preview.fields.duration')}</span>
                </div>
                <span className={styles['preview-info-value']}>
                  {(tourData.duration || '0')} {t('tourWizard.step1.summary.days')} {(tourData.nights || '0')} {t('tourWizard.step1.summary.nights')}
                </span>
              </div>

              <div className={styles['preview-info-row']}>
                <div className={styles['preview-info-label-wrapper']}>
                  <CurrencyDollarIcon className={styles['preview-info-icon']} />
                  <span className={styles['preview-info-label']}>{t('tourWizard.step4.preview.fields.adultPrice')}</span>
                </div>
                <span className={styles['preview-info-value']}>
                  {tourData.adultPrice 
                    ? `${new Intl.NumberFormat('vi-VN').format(tourData.adultPrice)} VNĐ` 
                    : t('tourWizard.step4.preview.values.noPrice')}
                </span>
              </div>

              <div className={styles['preview-info-row']}>
                <div className={styles['preview-info-label-wrapper']}>
                  <ClockIcon className={styles['preview-info-icon']} />
                  <span className={styles['preview-info-label']}>{t('tourWizard.step4.preview.fields.minAdvanceDays', 'Minimum advance days')}</span>
                </div>
                <span className={styles['preview-info-value']}>
                  {tourData.minAdvancedDays || tourData.tourDeadline || '0'} {t('tourWizard.step1.summary.days')}
                </span>
              </div>

              <div className={styles['preview-info-row']}>
                <div className={styles['preview-info-label-wrapper']}>
                  <ClockIcon className={styles['preview-info-icon']} />
                  <span className={styles['preview-info-label']}>{t('tourWizard.step4.preview.fields.checkDays', 'Check days')}</span>
                </div>
                <span className={styles['preview-info-value']}>
                  {tourData.checkDays || tourData.tourCheckDays || '0'} {t('tourWizard.step1.summary.days')}
                </span>
              </div>

              <div className={styles['preview-info-row']}>
                <div className={styles['preview-info-label-wrapper']}>
                  <ClockIcon className={styles['preview-info-icon']} />
                  <span className={styles['preview-info-label']}>{t('tourWizard.step4.preview.fields.balancePaymentDays', 'Balance payment days')}</span>
                </div>
                <span className={styles['preview-info-value']}>
                  {tourData.balancePaymentDays || '0'} {t('tourWizard.step1.summary.days')}
                </span>
              </div>

              <div className={styles['preview-info-row']}>
                <div className={styles['preview-info-label-wrapper']}>
                  <CurrencyDollarIcon className={styles['preview-info-icon']} />
                  <span className={styles['preview-info-label']}>{t('tourWizard.step4.preview.fields.depositPercentage', 'Deposit %')}</span>
                </div>
                <span className={styles['preview-info-value']}>
                  {tourData.depositPercentage !== undefined && tourData.depositPercentage !== null && tourData.depositPercentage !== ''
                    ? `${tourData.depositPercentage}%`
                    : t('tourWizard.step4.preview.values.noPrice')}
                </span>
              </div>

              <div className={styles['preview-info-row']}>
                <div className={styles['preview-info-label-wrapper']}>
                  <CheckCircleIcon className={styles['preview-info-icon']} />
                  <span className={styles['preview-info-label']}>{t('tourWizard.step4.preview.fields.refundable', 'Refundable after balance')}</span>
                </div>
                <span className={styles['preview-info-value']}>
                  {tourData.allowRefundableAfterBalancePayment
                    ? `${t('tourWizard.step4.preview.fields.refundFloor', 'Refund floor')}: ${(tourData.refundFloor || 0)}%`
                    : t('tourWizard.step4.preview.values.notUploaded')}
                </span>
              </div>

              <div className={styles['preview-info-row']}>
                <div className={styles['preview-info-label-wrapper']}>
                  <PhotoIcon className={styles['preview-info-icon']} />
                  <span className={styles['preview-info-label']}>{t('tourWizard.step4.preview.fields.image')}</span>
                </div>
                <span className={`${styles['preview-info-value']} ${formData.thumbnail ? styles['preview-status-success'] : styles['preview-status-pending']}`}>
                  {formData.thumbnail 
                    ? t('tourWizard.step4.preview.values.uploaded')
                    : t('tourWizard.step4.preview.values.notUploaded')}
                </span>
              </div>

              <div className={styles['preview-info-row']}>
                <div className={styles['preview-info-label-wrapper']}>
                  <CheckCircleIcon className={styles['preview-info-icon']} />
                  <span className={styles['preview-info-label']}>{t('tourWizard.step4.preview.fields.status')}</span>
                </div>
                <span className={styles['preview-info-value']}>{t('tourWizard.step4.preview.values.willShow')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4Media;
