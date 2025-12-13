import { useState, useEffect } from 'react';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tinymce/tinymce-react';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import { getApiPath, normalizeToRelativePath } from '../../../../../../config/api';
import {
  FileText,
  Clock,
  List,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import styles from './Step2Itinerary.module.css';
import ColorPickerModal from './ColorPickerModal/ColorPickerModal';

// Note: Day titles are fully customized by Company; no default prefix is injected

// Helper function to adjust color brightness for gradient
const adjustColor = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;

  const clampColor = (value) => {
    if (value < 0) return 0;
    if (value > 255) return 255;
    return value;
  };

  const clampedR = clampColor(R);
  const clampedG = clampColor(G);
  const clampedB = clampColor(B);

  return '#' + (0x1000000 + clampedR * 0x10000 + clampedG * 0x100 + clampedB).toString(16).slice(1);
};

const Step2Itinerary = () => {
  const { t, i18n } = useTranslation();
  const { tourData, updateTourData } = useTourWizardContext();
  const { showInfo } = useToast();

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
    toolbar: 'undo redo | blocks | ' +
      'bold italic forecolor | alignleft aligncenter ' +
      'alignright alignjustify | bullist numlist outdent indent | ' +
      'image | table tabledelete | tableprops tablerowprops tablecellprops | ' +
      'tableinsertrowbefore tableinsertrowafter tabledeleterow | ' +
      'tableinsertcolbefore tableinsertcolafter tabledeletecol | removeformat | help',
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px } table { width: 100%; border-collapse: collapse; } table, th, td { border: 1px solid #e5e7eb; } th, td { padding: 8px; }',
    // Typing/newline behavior (TinyMCE 8 compatible)
    forced_root_block: 'div',
    remove_redundant_brs: false,
    cleanup: false,
    cleanup_on_startup: false,
    verify_html: false,
    br_in_pre: true,
    extended_valid_elements: 'br[class|style]',
    // Additional settings
    entity_encoding: 'raw',
    convert_urls: false,
    // Enable drag and drop for images
    paste_data_images: true,
    paste_enable_default_filters: false,
    paste_auto_cleanup_on_paste: true,
    paste_remove_styles_if_webkit: false,
    paste_merge_formats: true,
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
        const response = await fetch(getApiPath('/api/tour/content-image'), {
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
          // Normalize về relative path để đảm bảo không lưu BaseURL vào HTML content
          return normalizeToRelativePath(imageUrl);
        } else {
          const errorText = await response.text();
          throw new Error('Upload failed: ' + errorText);
        }
      } catch (error) {
        // Silently handle image upload error
        throw new Error('Không thể upload ảnh. Vui lòng thử lại.');
      }
    },
    automatic_uploads: true,
    file_picker_types: 'image',
    // Image upload settings
    images_upload_url: '/api/tour/content-image',
    images_upload_base_path: '/uploads/tours/content/',
    images_upload_credentials: true,
    // File picker configuration
    file_picker_callback: function (callback, value, meta) {
      if (meta.filetype === 'image') {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = function () {
          const file = this.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function () {
              callback(reader.result, {
                alt: file.name
              });
            };
            reader.readAsDataURL(file);
          }
        };
      }
    }
  });
  const [formData, setFormData] = useState({
    tourDescription: '',
    tourSchedule: '',
    itinerary: [],
    mainSectionTitle: t('tourWizard.step2.itinerary.mainSectionTitle'),
    mainSectionColor: '#4caf50',
    appendices: []
  });
  const [initialized, setInitialized] = useState(false);
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
  const [colorPickerInitialColor, setColorPickerInitialColor] = useState('#4caf50');
  const [currentTarget, setCurrentTarget] = useState(null); // 'main' or day index or 'appendix-N'
  const [newAppendixTitle, setNewAppendixTitle] = useState('PHỤ LỤC / GHI CHÚ');
  const [fieldErrors, setFieldErrors] = useState({});

  // Listen for validation trigger from parent (TourWizard) - similar to Step2Details in TourBookingWizard
  useEffect(() => {
    const handleValidateAll = () => {
      // Use latest values from both formData and tourData to ensure we have the most current values
      const currentTourSchedule = formData.tourSchedule || tourData.tourSchedule || '';
      const currentTourDescription = formData.tourDescription || tourData.tourDescription || '';

      // Validate required fields and show errors
      const errors = {};

      // Check tourDescription - must be non-empty after trimming
      if (!currentTourDescription || !String(currentTourDescription).trim()) {
        errors.tourDescription = t('toast.required', { field: t('tourWizard.step2.tourDescription.title') }) || 'Mô tả tour là bắt buộc';
      }

      // Check tourSchedule (Schedule Summary) - must be non-empty after trimming
      // Detailed Itinerary is optional, no validation needed
      if (!currentTourSchedule || !String(currentTourSchedule).trim()) {
        errors.tourSchedule = t('toast.required', { field: t('tourWizard.step2.fields.tourSchedule') }) || 'Tóm tắt lịch trình là bắt buộc';
      }

      // Set errors and ensure they are displayed
      // Force a re-render by setting errors
      setFieldErrors(errors);

      // Notify parent about validation status immediately
      window.dispatchEvent(new CustomEvent('stepValidationStatus', {
        detail: { step: 2, hasErrors: Object.keys(errors).length > 0 }
      }));

      // Scroll to first error field if there are errors
      if (Object.keys(errors).length > 0) {
        setTimeout(() => {
          const firstErrorKey = Object.keys(errors)[0];
          let errorElement = null;

          // Try to find the element by ID or name
          if (firstErrorKey === 'tourDescription') {
            errorElement = document.getElementById('tourDescription') ||
              document.querySelector('[name="tourDescription"]');
          } else if (firstErrorKey === 'tourSchedule') {
            errorElement = document.getElementById('tourSchedule') ||
              document.querySelector('[name="tourSchedule"]');
          }

          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (errorElement.focus && typeof errorElement.focus === 'function') {
              errorElement.focus();
            }
          }
        }, 100);
      }
    };

    const handleClearErrors = () => {
      setFieldErrors({});
      // Notify parent that errors are cleared
      window.dispatchEvent(new CustomEvent('stepValidationStatus', {
        detail: { step: 2, hasErrors: false }
      }));
    };

    window.addEventListener('validateStep2', handleValidateAll);
    window.addEventListener('clearStepErrors', (event) => {
      if (event.detail?.step === 2) {
        handleClearErrors();
      }
    });
    return () => {
      window.removeEventListener('validateStep2', handleValidateAll);
      window.removeEventListener('clearStepErrors', handleClearErrors);
    };
  }, [formData, tourData, t]);

  // Handler for color picker apply
  const handleColorApply = (selectedColor) => {
    if (currentTarget === 'main') {
      updateFormData('mainSectionColor', selectedColor);
    } else if (typeof currentTarget === 'number') {
      updateDay(currentTarget, 'dayColor', selectedColor);
    } else if (typeof currentTarget === 'string' && currentTarget.startsWith('appendix-')) {
      const appendixIndex = parseInt(currentTarget.split('-')[1]);
      const newFormData = {
        ...formData,
        appendices: formData.appendices.map((app, i) =>
          i === appendixIndex ? { ...app, color: selectedColor } : app
        )
      };
      setFormData(newFormData);
      updateTourData(newFormData);
    }
  };

  // Helper to open color picker with initial color
  const openColorPicker = (target, initialColor) => {
    setCurrentTarget(target);
    setColorPickerInitialColor(initialColor || '#4caf50');
    setShowCustomColorPicker(true);
  };

  // Initialize once from Step 1 and allow user to customize freely afterwards
  useEffect(() => {
    if (initialized) return;
    const duration = parseInt(tourData.duration) || 1;
    let newItinerary = Array.isArray(tourData.itinerary) && tourData.itinerary.length > 0
      ? tourData.itinerary
      : Array.from({ length: duration }, (_, i) => ({
        day: i + 1,
        activities: '',
        dayTitle: '',
        dayDescription: t('tourWizard.step2.day.defaultMeal'),
        dayColor: '#10b981',
        titleAlignment: 'left'
      }));
    newItinerary = newItinerary.map((day, index) => ({
      ...day,
      day: index + 1,
      dayTitle: day.dayTitle || '',
      dayDescription: day.dayDescription || t('tourWizard.step2.day.defaultMeal'),
      titleAlignment: day.titleAlignment || 'left'
    }));
    setFormData({
      tourDescription: tourData.tourDescription || '',
      tourSchedule: tourData.tourSchedule || '',
      itinerary: newItinerary,
      mainSectionTitle: tourData.mainSectionTitle || t('tourWizard.step2.itinerary.mainSectionTitle'),
      mainSectionColor: tourData.mainSectionColor || '#3498db'
    });
    setInitialized(true);
  }, [initialized, tourData.duration, tourData.itinerary, tourData.tourDescription, tourData.tourSchedule, tourData.mainSectionTitle, tourData.mainSectionColor]);

  // React to language changes: if user hasn't customized, keep defaults in new language
  useEffect(() => {
    const defaultSectionTitles = [
      'ĐIỂM ĐẾN VÀ HÀNH TRÌNH',
      'DESTINATIONS & ITINERARY',
      '목적지 & 일정'
    ];
    const defaultMeals = [
      'Ăn trưa – tối',
      'Lunch – Dinner',
      '점심 – 저녁'
    ];

    const newDefaultTitle = t('tourWizard.step2.itinerary.mainSectionTitle');
    const newDefaultMeal = t('tourWizard.step2.day.defaultMeal');

    setFormData(prev => {
      const shouldUpdateTitle = !prev.mainSectionTitle || defaultSectionTitles.includes(prev.mainSectionTitle.trim());
      const updatedItinerary = (prev.itinerary || []).map(d => {
        const desc = d.dayDescription;
        const shouldUpdateDesc = !desc || defaultMeals.includes(String(desc).trim());
        return shouldUpdateDesc ? { ...d, dayDescription: newDefaultMeal } : d;
      });
      return {
        ...prev,
        mainSectionTitle: shouldUpdateTitle ? newDefaultTitle : prev.mainSectionTitle,
        itinerary: updatedItinerary
      };
    });
  }, [i18n.language]);



  const updateDay = (index, field, value) => {
    const newFormData = {
      ...formData,
      itinerary: formData.itinerary.map((day, i) =>
        i === index ? { ...day, [field]: value } : day
      )
    };
    setFormData(newFormData);
    updateTourData(newFormData);
  };

  const updateFormData = (field, value) => {
    const newFormData = {
      ...formData,
      [field]: value
    };
    setFormData(newFormData);
    updateTourData(newFormData);
  };

  // Helper function to clean HTML content
  const cleanHtmlContent = (content) => {
    if (!content) return '';

    let cleaned = content;

    // Remove all <p> tags and their content, keeping only the text inside
    cleaned = cleaned.replace(/<p[^>]*>(.*?)<\/p>/gs, (match, innerContent) => {
      // If <p> contains only text (no other HTML tags), return just the text
      if (!innerContent.includes('<') && !innerContent.includes('>')) {
        return innerContent.trim();
      }
      // If <p> contains other HTML tags, keep the inner content but remove <p>
      return innerContent;
    });

    // Remove empty <p> tags
    cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/g, '');

    // Remove multiple consecutive <br> tags
    cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/g, '<br>');

    // Remove <br> at the beginning and end
    cleaned = cleaned.replace(/^(<br\s*\/?>\s*)+|(<br\s*\/?>\s*)+$/g, '');

    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  };


  const addItineraryDayAfter = (index) => {
    const newDay = {
      day: index + 2,
      activities: '',
      dayTitle: '',
      dayDescription: 'Ăn trưa – tối',
      dayColor: '#10b981'
    };
    const list = [...formData.itinerary];
    list.splice(index + 1, 0, newDay);
    const reindexed = list.map((d, i) => ({ ...d, day: i + 1 }));
    const newFormData = { ...formData, itinerary: reindexed };
    setFormData(newFormData);
    updateTourData(newFormData);
    showInfo('Đã thêm một ngày lịch trình.');
  };

  const removeItineraryDay = (index) => {
    if ((formData.itinerary?.length || 0) <= 1) {
      // Cannot delete content - validation handled in UI
      return;
    }
    const list = formData.itinerary.filter((_, i) => i !== index).map((d, i) => ({ ...d, day: i + 1 }));
    const newFormData = { ...formData, itinerary: list };
    setFormData(newFormData);
    updateTourData(newFormData);
  };


  return (
    <div className={styles['step2-container']}>
      <div className={styles['step-header']}>
        <h2 className={styles['step-title']}>{t('tourWizard.step2.title')}</h2>
        <p className={styles['step-subtitle']}>{t('tourWizard.step2.subtitle')}</p>
        <div className={styles['warning-message']}>
          <AlertTriangle className={styles['warning-icon']} size={18} strokeWidth={1.5} />
          <span>{t('tourWizard.step2.warning')}</span>
        </div>
      </div>

      {/* Tour Description */}
      <div className={styles['tour-description-section']}>
        <h3>
          <FileText className={styles['section-icon']} size={20} strokeWidth={1.5} />
          {t('tourWizard.step2.tourDescription.title')}
          <span className={styles['required-asterisk']}>*</span>
        </h3>
        <p className={styles['section-description']}>
          {t('tourWizard.step2.tourDescription.description')}
        </p>
        <textarea
          id="tourDescription"
          name="tourDescription"
          className={`${styles['form-textarea']} ${fieldErrors.tourDescription ? styles['error'] : ''}`}
          rows={10}
          value={formData.tourDescription || ''}
          placeholder={t('tourWizard.step2.tourDescription.description')}
          onChange={(e) => {
            const newFormData = { ...formData, tourDescription: e.target.value };
            setFormData(newFormData);
            updateTourData(newFormData);
            // Clear error for this field when user starts typing
            if (fieldErrors.tourDescription) {
              setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.tourDescription;
                // Notify parent about validation status change
                const hasErrors = Object.keys(newErrors).length > 0;
                window.dispatchEvent(new CustomEvent('stepValidationStatus', {
                  detail: { step: 2, hasErrors }
                }));
                return newErrors;
              });
            }
          }}
          onKeyDown={(e) => {
            // Cho phép phím mũi tên, Enter xuống dòng, Tab, Backspace... mặc định
            // Không cần chặn gì ở đây vì textarea xử lý chuẩn
          }}
        />
        {fieldErrors.tourDescription && (
          <span className={styles['error-message']}>{fieldErrors.tourDescription}</span>
        )}
      </div>

      {/* Tour Schedule Summary */}
      <div className={styles['tour-schedule-section']}>
        <h3>
          <Clock className={styles['section-icon']} size={20} strokeWidth={1.5} />
          {t('tourWizard.step2.fields.tourSchedule')}
          <span className={styles['required-asterisk']}>*</span>
        </h3>
        <p className={styles['section-description']}>
          {t('tourWizard.step2.tourSchedule.description')}
        </p>
        <input
          type="text"
          id="tourSchedule"
          name="tourSchedule"
          value={formData.tourSchedule || ''}
          placeholder={t('tourWizard.step2.tourSchedule.placeholder')}
          onChange={(e) => {
            const newFormData = { ...formData, tourSchedule: e.target.value };
            setFormData(newFormData);
            updateTourData(newFormData);
            // Clear error for this field when user starts typing
            if (fieldErrors.tourSchedule) {
              setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.tourSchedule;
                // Notify parent about validation status change
                const hasErrors = Object.keys(newErrors).length > 0;
                window.dispatchEvent(new CustomEvent('stepValidationStatus', {
                  detail: { step: 2, hasErrors }
                }));
                return newErrors;
              });
            }
          }}
          className={`${styles['form-input']} ${fieldErrors.tourSchedule ? styles['error'] : ''}`}
        />
        {fieldErrors.tourSchedule && (
          <span className={styles['error-message']}>{fieldErrors.tourSchedule}</span>
        )}
      </div>

      {/* Itinerary Days */}
      <div className={styles['itinerary-section']} data-itinerary-section>
        {/* Main Header hidden as requested */}

        {/* Color Picker Modal */}
        <ColorPickerModal
          isOpen={showCustomColorPicker}
          onClose={() => setShowCustomColorPicker(false)}
          onApply={handleColorApply}
          initialColor={colorPickerInitialColor}
        />

        {formData.itinerary.map((day, index) => (
          <div
            key={`day-${day.day}-${index}`}
            className={styles['day-card']}
            style={{
              '--day-color': day.dayColor || '#10b981',
              '--day-color-dark': adjustColor(day.dayColor || '#10b981', -20)
            }}
          >
            {/* Day Header - Customizable Color Bar with Editable Title */}
            <div
              className={styles['day-header-bar']}
              style={{
                background: `linear-gradient(135deg, ${day.dayColor || '#10b981'}, ${adjustColor(day.dayColor || '#10b981', -20)})`
              }}
            >
              <div className={styles['day-header-content']}>
                <div className={styles['single-day-title-container']}>
                  <input
                    type="text"
                    className={`${styles['single-day-title-input']} ${day.dayTitle ? styles['customized'] : ''}`}
                    value={day.dayTitle || ''}
                    onChange={(e) => updateDay(index, 'dayTitle', e.target.value)}
                    placeholder={t('tourWizard.step2.placeholders.dayTitle')}
                    title={t('tourWizard.step2.titles.editDayTitle')}
                    style={{ textAlign: day.titleAlignment || 'left' }}
                  />
                  <div className={styles['title-controls']}>
                    <div className={styles['alignment-buttons']}>
                      <button
                        type="button"
                        className={`${styles['align-btn']} ${(day.titleAlignment || 'left') === 'left' ? styles['active'] : ''}`}
                        onClick={() => {
                          const currentAlignment = day.titleAlignment || 'left';
                          if (currentAlignment === 'left') {
                            updateDay(index, 'titleAlignment', 'left');
                          } else {
                            updateDay(index, 'titleAlignment', 'left');
                          }
                        }}
                        title={t('tourWizard.step2.alignment.left')}
                      >
                        <div className={`${styles['align-icon']} ${styles['left-align']}`}>
                          <div className={styles['line']}></div>
                          <div className={styles['line']}></div>
                          <div className={styles['line']}></div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`${styles['align-btn']} ${day.titleAlignment === 'center' ? styles['active'] : ''}`}
                        onClick={() => {
                          const currentAlignment = day.titleAlignment || 'left';
                          if (currentAlignment === 'center') {
                            updateDay(index, 'titleAlignment', 'left');
                          } else {
                            updateDay(index, 'titleAlignment', 'center');
                          }
                        }}
                        title={t('tourWizard.step2.alignment.center')}
                      >
                        <div className={`${styles['align-icon']} ${styles['center-align']}`}>
                          <div className={styles['line']}></div>
                          <div className={styles['line']}></div>
                          <div className={styles['line']}></div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`${styles['align-btn']} ${day.titleAlignment === 'right' ? styles['active'] : ''}`}
                        onClick={() => {
                          const currentAlignment = day.titleAlignment || 'left';
                          if (currentAlignment === 'right') {
                            updateDay(index, 'titleAlignment', 'left');
                          } else {
                            updateDay(index, 'titleAlignment', 'right');
                          }
                        }}
                        title={t('tourWizard.step2.alignment.right')}
                      >
                        <div className={`${styles['align-icon']} ${styles['right-align']}`}>
                          <div className={styles['line']}></div>
                          <div className={styles['line']}></div>
                          <div className={styles['line']}></div>
                        </div>
                      </button>
                    </div>
                    {day.dayTitle && (
                      <button
                        type="button"
                        className={styles['reset-title-btn']}
                        onClick={() => updateDay(index, 'dayTitle', '')}
                        title={t('tourWizard.step2.titles.clearDayTitle')}
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles['color-picker-container']}>
                  <div className={styles['color-presets']}>
                    {[
                      '#e91e63', // Pink
                      '#2196f3', // Blue
                      '#4caf50', // Green
                      '#ff9800'  // Orange
                    ].map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`${styles['color-preset']} ${day.dayColor === color ? styles['active'] : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateDay(index, 'dayColor', color)}
                        title={t('tourWizard.step2.color.choose', { color })}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles['custom-color-btn']}
                    title={t('tourWizard.step2.color.customize')}
                    onClick={() => openColorPicker(index, day.dayColor || '#4caf50')}
                  >
                    🎯
                  </button>
                </div>
              </div>
            </div>

            <div className={styles['day-content']}>
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>
                  <List className={styles['label-icon']} size={18} />
                  {t('tourWizard.step2.activities.label')}
                </label>
                <Editor
                  apiKey={import.meta.env.VITE_TINYMCE_API_KEY || 'no-api-key'}
                  value={day.activities}
                  init={getTinyMCEConfig(600)}
                  onEditorChange={(content) => updateDay(index, 'activities', content)}
                />
              </div>

              <div className={`${styles['day-actions']} ${styles['below-editor']}`}>
                <button
                  type="button"
                  className={styles['btn-add-small']}
                  title={t('tourWizard.step2.actions.addContentAfter')}
                  onClick={() => addItineraryDayAfter(index)}
                >
                  {t('tourWizard.step2.actions.addContent')}
                </button>
                <button
                  type="button"
                  className={styles['btn-remove-small']}
                  title={t('tourWizard.step2.actions.removeThis')}
                  onClick={() => removeItineraryDay(index)}
                >
                  {t('tourWizard.step2.actions.removeContent')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Appendices Section removed */}

    </div>
  );
};

export default Step2Itinerary;
