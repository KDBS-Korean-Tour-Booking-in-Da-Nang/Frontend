import { useState, useEffect } from 'react';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tinymce/tinymce-react';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import styles from './Step2Itinerary.module.css';

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
  const [customColor, setCustomColor] = useState('#4caf50');
  const [currentTarget, setCurrentTarget] = useState(null); // 'main' or day index
  const [currentHue, setCurrentHue] = useState(180); // 0-360
  const [saturation, setSaturation] = useState(0.8); // 0-1
  const [brightness, setBrightness] = useState(0.8); // 0-1
  const [newAppendixTitle, setNewAppendixTitle] = useState('PHỤ LỤC / GHI CHÚ');
  const [fieldErrors, setFieldErrors] = useState({});

  // Listen for validation trigger from parent (TourWizard) - similar to Step2Details in TourBookingWizard
  useEffect(() => {
    const handleValidateAll = () => {
      // Use latest values from both formData and tourData to ensure we have the most current values
      const currentItinerary = formData.itinerary && formData.itinerary.length > 0 
        ? formData.itinerary 
        : (tourData.itinerary && tourData.itinerary.length > 0 ? tourData.itinerary : []);
      
      const currentTourSchedule = formData.tourSchedule || tourData.tourSchedule || '';
      const currentTourDescription = formData.tourDescription || tourData.tourDescription || '';
      
      // Validate all required fields and show errors
      const errors = {};
      
      // Check itinerary - must have at least one day with content (activities not empty)
      const hasValidItinerary = currentItinerary && 
        currentItinerary.length > 0 && 
        currentItinerary.some(day => day.activities && String(day.activities).trim().length > 0);
      
      if (!hasValidItinerary) {
        errors.itinerary = t('toast.required', { field: t('tourWizard.step2.title') }) || 'Lịch trình là bắt buộc';
      }
      
      // Check tourDescription - must be non-empty after trimming
      if (!currentTourDescription || !String(currentTourDescription).trim()) {
        errors.tourDescription = t('toast.required', { field: t('tourWizard.step2.tourDescription.title') }) || 'Mô tả tour là bắt buộc';
      }
      
      // Check tourSchedule - must be non-empty after trimming
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

  // Helper function to convert HSV to RGB
  const hsvToRgb = (h, s, v) => {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  // Helper function to convert RGB to hex
  const rgbToHex = (r, g, b) => {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Update color gradient when hue changes
  useEffect(() => {
    if (showCustomColorPicker) {
      const gradientSquare = document.getElementById('color-gradient-square');
      if (gradientSquare) {
        const ctx = document.createElement('canvas');
        ctx.width = 200;
        ctx.height = 150;
        const canvas = ctx.getContext('2d');
        
        // Create the saturation/brightness gradient with current hue
        for (let x = 0; x < 200; x++) {
          for (let y = 0; y < 150; y++) {
            const sat = x / 200;
            const bright = 1 - (y / 150);
            const { r, g, b } = hsvToRgb(currentHue, sat, bright);
            canvas.fillStyle = `rgb(${r}, ${g}, ${b})`;
            canvas.fillRect(x, y, 1, 1);
          }
        }
        
        gradientSquare.style.backgroundImage = `url(${ctx.toDataURL()})`;
      }
    }
  }, [showCustomColorPicker, currentHue]);

  // Update customColor when saturation/brightness changes
  useEffect(() => {
    const { r, g, b } = hsvToRgb(currentHue, saturation, brightness);
    setCustomColor(rgbToHex(r, g, b));
  }, [currentHue, saturation, brightness]);

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
    // Clear itinerary error when user adds content
    if (fieldErrors.itinerary) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.itinerary;
        // Notify parent about validation status change
        const hasErrors = Object.keys(newErrors).length > 0;
        window.dispatchEvent(new CustomEvent('stepValidationStatus', { 
          detail: { step: 2, hasErrors } 
        }));
        return newErrors;
      });
    }
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
        <div className={styles['step-instructions']}>
          <p><strong>💡 {t('tourWizard.step2.instructions.title')}</strong> {t('tourWizard.step2.instructions.description')}</p>
          <div className={styles['title-examples']}>
            <p><strong>🔧 {t('tourWizard.step2.instructions.customizable')}</strong></p>
            <ul>
              <li><strong>{t('tourWizard.step2.instructions.sectionTitle')}</strong></li>
              <li><strong>{t('tourWizard.step2.instructions.dayTitle')}</strong></li>
            </ul>
            <p><strong>📝 {t('tourWizard.step2.instructions.examples')}</strong></p>
            <ul>
              <li>
                {`"${t('tourWizard.step2.prefix.day', { n: 1 })} - ${t('tourWizard.step2.examples.c1')}"`}
              </li>
              <li>
                {`"${t('tourWizard.step2.prefix.day', { n: 1 })} - ${t('tourWizard.step2.examples.c2')}"`}
              </li>
              <li>
                {`"${t('tourWizard.step2.prefix.chapter', { n: 1 })} - ${t('tourWizard.step2.examples.c3')}"`}
              </li>
              <li>
                {`"${t('tourWizard.step2.prefix.session', { n: 1 })} - ${t('tourWizard.step2.examples.c4')}"`}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tour Description */}
      <div className={styles['tour-description-section']}>
        <h3>
          {t('tourWizard.step2.tourDescription.title')}
          {fieldErrors.tourDescription && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
        </h3>
        <p className={styles['section-description']}>
          {t('tourWizard.step2.tourDescription.description')}
        </p>
        <textarea
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
            // Clear itinerary error if user adds content
            if (fieldErrors.itinerary && newFormData.itinerary && newFormData.itinerary.length > 0) {
              setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.itinerary;
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
          <div className={styles['error-message']} style={{ marginTop: '0.5rem', color: '#e11d48', fontSize: '0.875rem' }}>
            {fieldErrors.tourDescription}
          </div>
        )}
      </div>

      {/* Tour Schedule Summary */}
      <div className={styles['tour-schedule-section']}>
        <h3>
          {t('tourWizard.step2.fields.tourSchedule')}
          {fieldErrors.tourSchedule && <span style={{ color: '#e11d48', marginLeft: '0.25rem' }}>*</span>}
        </h3>
        <p className={styles['section-description']}>
          {t('tourWizard.step2.tourSchedule.description')}
        </p>
        <input
          type="text"
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
          <div className={styles['error-message']} style={{ marginTop: '0.5rem', color: '#e11d48', fontSize: '0.875rem' }}>
            {fieldErrors.tourSchedule}
          </div>
        )}
      </div>

      {/* Itinerary Days */}
      <div className={styles['itinerary-section']}>
        {/* Main Header hidden as requested */}
        {fieldErrors.itinerary && (
          <div className={styles['error-message']} style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#e11d48', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
            {fieldErrors.itinerary}
          </div>
        )}

        {/* Custom Color Picker Modal */}
        {showCustomColorPicker && (
          <div className={styles['custom-color-picker-modal']}>
            <div className={styles['color-picker-content']}>
              <div className={styles['color-picker-header']}>
                <h3>Tùy chỉnh màu sắc</h3>
                <button 
                  className={styles['close-picker-btn']}
                  onClick={() => setShowCustomColorPicker(false)}
                >
                  ×
                </button>
              </div>
              
              <div className={styles['color-picker-body']}>
                <div className={styles['color-gradient-area']}>
                  <div 
                    className={styles['color-gradient-square']} 
                    id="color-gradient-square"
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      
                      const newSaturation = Math.max(0, Math.min(1, x / 200));
                      const newBrightness = Math.max(0, Math.min(1, 1 - (y / 150)));
                      
                      setSaturation(newSaturation);
                      setBrightness(newBrightness);
                    }}
                    onMouseMove={(e) => {
                      if (e.buttons === 1) { // Left mouse button is pressed
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        
                        const newSaturation = Math.max(0, Math.min(1, x / 200));
                        const newBrightness = Math.max(0, Math.min(1, 1 - (y / 150)));
                        
                        setSaturation(newSaturation);
                        setBrightness(newBrightness);
                      }
                    }}
                  >
                    <div 
                      className={styles['color-selector']}
                      style={{
                        left: `${saturation * 200 - 6}px`,
                        top: `${(1 - brightness) * 150 - 6}px`
                      }}
                    ></div>
                  </div>
                  <div className={styles['hue-slider-container']}>
                    <div 
                      className={styles['hue-slider']}
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const newHue = Math.max(0, Math.min(360, (x / rect.width) * 360));
                        setCurrentHue(newHue);
                      }}
                      onMouseMove={(e) => {
                        if (e.buttons === 1) { // Left mouse button is pressed
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const newHue = Math.max(0, Math.min(360, (x / rect.width) * 360));
                          setCurrentHue(newHue);
                        }
                      }}
                    >
                      <div 
                        className={styles['hue-selector']}
                        style={{
                          left: `${(currentHue / 360) * 200 - 8}px`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className={styles['color-tools']}>
                  <div className={styles['eyedropper-tool']}>
                    <button className={styles['eyedropper-btn']} title="Eyedropper">
                      🎯
                    </button>
                  </div>
                  <div className={styles['current-color-swatch']}>
                    <div 
                      className={styles['color-swatch']}
                      style={{ backgroundColor: customColor }}
                    ></div>
                  </div>
                </div>
                
                <div className={styles['rgb-inputs']}>
                  <div className={styles['rgb-input-group']}>
                    <label>R</label>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={parseInt(customColor.slice(1, 3), 16)}
                      onChange={(e) => {
                        const r = parseInt(e.target.value) || 0;
                        const g = parseInt(customColor.slice(3, 5), 16);
                        const b = parseInt(customColor.slice(5, 7), 16);
                        setCustomColor(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
                      }}
                      className={styles['rgb-input']}
                    />
                  </div>
                  <div className={styles['rgb-input-group']}>
                    <label>G</label>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={parseInt(customColor.slice(3, 5), 16)}
                      onChange={(e) => {
                        const r = parseInt(customColor.slice(1, 3), 16);
                        const g = parseInt(e.target.value) || 0;
                        const b = parseInt(customColor.slice(5, 7), 16);
                        setCustomColor(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
                      }}
                      className={styles['rgb-input']}
                    />
                  </div>
                  <div className={styles['rgb-input-group']}>
                    <label>B</label>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={parseInt(customColor.slice(5, 7), 16)}
                      onChange={(e) => {
                        const r = parseInt(customColor.slice(1, 3), 16);
                        const g = parseInt(customColor.slice(3, 5), 16);
                        const b = parseInt(e.target.value) || 0;
                        setCustomColor(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
                      }}
                      className={styles['rgb-input']}
                    />
                  </div>
                </div>
                
                <div className={styles['color-picker-actions']}>
                  <button 
                    className={styles['apply-color-btn']}
                    onClick={() => {
                      if (currentTarget === 'main') {
                        updateFormData('mainSectionColor', customColor);
                      } else if (typeof currentTarget === 'number') {
                        updateDay(currentTarget, 'dayColor', customColor);
                      } else if (typeof currentTarget === 'string' && currentTarget.startsWith('appendix-')) {
                        const appendixIndex = parseInt(currentTarget.split('-')[1]);
                        const newFormData = {
                          ...formData,
                          appendices: formData.appendices.map((app, i) => 
                            i === appendixIndex ? { ...app, color: customColor } : app
                          )
                        };
                        setFormData(newFormData);
                        updateTourData(newFormData);
                      }
                      setShowCustomColorPicker(false);
                    }}
                  >
                    Áp dụng
                  </button>
                  <button 
                    className={styles['cancel-color-btn']}
                    onClick={() => setShowCustomColorPicker(false)}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <span className={styles['day-description']}>({day.dayDescription || t('tourWizard.step2.day.defaultMeal')})</span>
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
                    onClick={() => {
                      setCurrentTarget(index);
                      setCustomColor(day.dayColor || '#4caf50');
                      setShowCustomColorPicker(true);
                    }}
                  >
                    🎯
                  </button>
                </div>
              </div>
            </div>

            <div className={styles['day-content']}>
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>{t('tourWizard.step2.activities.label')}</label>
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
