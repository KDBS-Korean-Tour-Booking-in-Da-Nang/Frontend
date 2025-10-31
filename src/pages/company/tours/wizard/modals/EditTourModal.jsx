import { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS, getImageUrl } from '../../../../../config/api';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tinymce/tinymce-react';
import { useToast } from '../../../../../contexts/ToastContext';
import styles from './EditTourModal.module.css';

const EditTourModal = ({ isOpen, onClose, tour, onSave }) => {
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();
  const blobUrlRef = useRef(null);

  const htmlToText = (html) => {
    if (!html) return '';
    return String(html)
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*\/p\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const isNonEmptyText = (value) => {
    return String(value ?? '').trim().length > 0;
  };

  // Helpers for numbers/date
  const preventInvalidNumberKeys = (e) => {
    if (['e','E','+','-','.'].includes(e.key)) e.preventDefault();
  };
  const nowLocalDateTime = () => {
    const now = new Date();
    now.setSeconds(0,0);
    const pad = (n) => String(n).padStart(2,'0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

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
    toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
    // Prevent automatic <p> tags
    forced_root_block: false,
    force_br_newlines: true,
    force_p_newlines: false,
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
        const response = await fetch(API_ENDPOINTS.TOURS + '/content-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
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
        showError('toast.tour.upload_image_failed');
        throw new Error('Không thể upload ảnh. Vui lòng thử lại.');
      }
    },
    automatic_uploads: true,
    file_picker_types: 'image'
  });
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    tourName: '',
    tourDescription: '',
    tourDuration: '',
    tourDeparturePoint: '',
    tourVehicle: '',
    tourType: '',
    amount: '',
    adultPrice: '',
    childrenPrice: '',
    babyPrice: '',
    tourStatus: 'ACTIVE',
    
    // Step 2: Itinerary
    itinerary: [],
    tourSchedule: '',
    
    // Step 3: Pricing
    surcharges: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#4caf50');
  const [currentTarget, setCurrentTarget] = useState(null);
  const [currentHue, setCurrentHue] = useState(180);
  const [saturation, setSaturation] = useState(0.8);
  const [brightness, setBrightness] = useState(0.8);

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

  const toDatetimeLocalValue = (value) => {
    if (!value) return '';
    try {
      // Accept ISO strings with seconds/zone; normalize to YYYY-MM-DDTHH:mm for input[type=datetime-local]
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        // Fallback: trim seconds if already like 2025-09-16T12:34:56
        const idx = value.indexOf('T');
        if (idx > 0) return value.substring(0, 16);
        return '';
      }
      const pad = (n) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (tour && isOpen) {
      setFormData({
        // Step 1: Basic Info
        tourName: tour.tourName || '',
        tourDescription: htmlToText(tour.tourDescription || ''),
        tourDuration: tour.tourDuration || '',
        tourDeparturePoint: tour.tourDeparturePoint || '',
        tourVehicle: tour.tourVehicle || '',
        tourType: tour.tourType || '',
        amount: tour.amount || '',
        adultPrice: tour.adultPrice || '',
        childrenPrice: tour.childrenPrice || '',
        babyPrice: tour.babyPrice || '',
        tourStatus: tour.tourStatus || 'ACTIVE',
        
        // Step 2: Itinerary - normalize from backend contents
        itinerary: Array.isArray(tour.contents)
          ? tour.contents.map((c, idx) => ({
              dayNumber: idx + 1,
              title: c.tourContentTitle || '',
              description: c.tourContentDescription || '',
              images: c.images || [],
              dayColor: c.dayColor || '#10b981',
              titleAlignment: c.titleAlignment || 'left'
            }))
          : [],
        tourSchedule: tour.tourSchedule || '',
        
        // Step 3: Pricing
        surcharges: tour.surcharges ? (() => {
          try { return JSON.parse(tour.surcharges); } 
          catch { return []; }
        })() : [],
        
        // Step 4: Media
        tourImgPath: (() => {
          const path = tour.tourImgPath || '';
          console.log('Original tourImgPath from database:', path);
          return path;
        })()
      });
    }
  }, [tour, isOpen]);

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

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup any blob URLs when component unmounts
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []); // Empty dependency array to only run on unmount

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItineraryChange = (dayIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary.map((day, index) => 
        index === dayIndex ? { ...day, [field]: value } : day
      )
    }));
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showError('toast.tour.file_size_exceeded');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('toast.tour.invalid_file_format');
        return;
      }

      // Cleanup old blob URL if exists
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      blobUrlRef.current = previewUrl;
      
      setFormData(prev => ({
        ...prev,
        tourImgPath: previewUrl,
        coverImageFile: file
      }));
    }
  };


  const addItineraryDay = () => {
    const newDay = {
      dayNumber: formData.itinerary.length + 1,
      title: '',
      description: '',
      images: [],
      dayColor: '#10b981',
      titleAlignment: 'left'
    };
    setFormData(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, newDay]
    }));
  };

  const addItineraryDayAfter = (dayIndex) => {
    const newDay = {
      dayNumber: dayIndex + 2,
      title: '',
      description: '',
      images: [],
      dayColor: '#10b981',
      titleAlignment: 'left'
    };
    const list = [...formData.itinerary];
    list.splice(dayIndex + 1, 0, newDay);
    const reindexed = list.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    setFormData(prev => ({ ...prev, itinerary: reindexed }));
  };

  const removeItineraryDay = (dayIndex) => {
    if ((formData.itinerary?.length || 0) <= 1) {
      showError('toast.tour.itinerary_required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary.filter((_, index) => index !== dayIndex)
        .map((day, index) => ({ ...day, dayNumber: index + 1 }))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Strict validation: all inputs must be non-empty
    const errors = [];
    if (!isNonEmptyText(formData.tourName)) errors.push('Tên tour');
    if (!isNonEmptyText(formData.tourDescription)) errors.push('Mô tả tour');
    if (!isNonEmptyText(formData.tourDuration)) errors.push('Thời lượng tour');
    if (!isNonEmptyText(formData.tourDeparturePoint)) errors.push('Điểm khởi hành');
    if (!isNonEmptyText(formData.tourVehicle)) errors.push('Phương tiện');
    if (!isNonEmptyText(formData.tourType)) errors.push('Loại tour');
    if (!isNonEmptyText(formData.tourSchedule)) errors.push('Tóm tắt lịch trình');

    const amount = parseInt(formData.amount);
    const adultPrice = parseFloat(formData.adultPrice);
    const childrenPrice = parseFloat(formData.childrenPrice);
    const babyPrice = parseFloat(formData.babyPrice);
    if (!Number.isFinite(amount) || amount < 1) errors.push('Số lượng chỗ (>=1)');
    if (!Number.isFinite(adultPrice) || adultPrice < 0) errors.push('Giá người lớn (>=0)');
    if (!Number.isFinite(childrenPrice) || childrenPrice < 0) errors.push('Giá trẻ em (>=0)');
    if (!Number.isFinite(babyPrice) || babyPrice < 0) errors.push('Giá em bé (>=0)');

    if (!Array.isArray(formData.itinerary) || formData.itinerary.length === 0) {
      errors.push('Lịch trình (ít nhất 1 ngày)');
    } else {
      formData.itinerary.forEach((day, idx) => {
        if (!isNonEmptyText(day.title)) errors.push(`Tiêu đề ngày ${idx + 1}`);
        if (!isNonEmptyText(htmlToText(day.description))) errors.push(`Mô tả ngày ${idx + 1}`);
        if (!isNonEmptyText(day.dayColor)) errors.push(`Màu ngày ${idx + 1}`);
        if (!isNonEmptyText(day.titleAlignment)) errors.push(`Căn lề tiêu đề ngày ${idx + 1}`);
      });
    }

    // Require cover image (either existing or newly uploaded)
    if (!isNonEmptyText(formData.tourImgPath) && !formData.coverImageFile) {
      errors.push('Ảnh bìa');
    }

    if (errors.length > 0) {
      showError(`Vui lòng nhập đầy đủ: ${errors.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      
      // Get current user data
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const savedUser = storage.getItem('user');
      const token = storage.getItem('token');
      
      if (!savedUser || !token) {
        showError('toast.tour.user_info_not_found');
        return;
      }
      
      const userData = JSON.parse(savedUser);
      const userEmail = userData.email;
      
      if (!userEmail) {
        showError('toast.tour.user_email_not_found');
        return;
      }

      // Prepare tour data
      const tourRequest = {
        companyEmail: userEmail,
        tourName: formData.tourName,
        tourDescription: formData.tourDescription,
        tourDuration: formData.tourDuration,
        tourDeparturePoint: formData.tourDeparturePoint,
        tourVehicle: formData.tourVehicle,
        tourType: formData.tourType,
        amount: amount,
        adultPrice: adultPrice,
        childrenPrice: childrenPrice,
        babyPrice: babyPrice,
        tourSchedule: formData.tourSchedule || '',
        contents: (formData.itinerary || []).map((day, index) => ({
          tourContentTitle: day.title || `Ngày ${index + 1}`,
          tourContentDescription: day.description || '',
          images: day.images || []
        }))
      };

      // Create a Blob with the JSON data
      const jsonBlob = new Blob([JSON.stringify(tourRequest)], { type: 'application/json' });
      formDataToSend.append('data', jsonBlob);

      // Add cover image file if exists
      if (formData.coverImageFile) {
        formDataToSend.append('tourImg', formData.coverImageFile);
      }

      // Call API to update tour
      const response = await fetch(API_ENDPOINTS.TOUR_BY_ID(tour.id ?? tour.tourId), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        showSuccess({ i18nKey: 'toast.save_success' });
        // Close modal immediately
        onClose();
        // Refresh data after successful save
        if (onSave) {
          onSave();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showError(errorData.message || 'toast.save_error');
      }
    } catch (error) {
      console.error('Error updating tour:', error);
      showError('toast.save_error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles['modal-overlay']} onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className={styles['edit-tour-modal']} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles['modal-header']}>
          <h2>{t('tourManagement.edit.title')}</h2>
          <button className={styles['close-btn']} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles['edit-form']}>
          {/* Tabs */}
          <div className={styles['tabs-container']}>
            <button
              type="button"
              className={`${styles['tab']} ${activeTab === 'basic' ? styles['active'] : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              {t('tourManagement.edit.tabs.basic')}
            </button>
            <button
              type="button"
              className={`${styles['tab']} ${activeTab === 'itinerary' ? styles['active'] : ''}`}
              onClick={() => setActiveTab('itinerary')}
            >
              {t('tourManagement.edit.tabs.itinerary')}
            </button>
            <button
              type="button"
              className={`${styles['tab']} ${activeTab === 'pricing' ? styles['active'] : ''}`}
              onClick={() => setActiveTab('pricing')}
            >
              {t('tourManagement.edit.tabs.pricing')}
            </button>
            <button
              type="button"
              className={`${styles['tab']} ${activeTab === 'media' ? styles['active'] : ''}`}
              onClick={() => setActiveTab('media')}
            >
              {t('tourManagement.edit.tabs.media')}
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles['tab-content']}>
            {activeTab === 'basic' && (
              <div className={styles['form-section']}>
                <h3>{t('tourManagement.edit.basic.title')}</h3>
                <div className={styles['form-group']}>
                  <label htmlFor="tourName">{t('tourManagement.edit.basic.fields.tourName')}</label>
                  <input
                    type="text"
                    id="tourName"
                    name="tourName"
                    value={formData.tourName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className={styles['form-group']}>
                  <label htmlFor="tourDescription">{t('tourManagement.edit.basic.fields.tourDescription')}</label>
                  <textarea
                    id="tourDescription"
                    className={styles['form-input']}
                    rows={6}
                    value={formData.tourDescription}
                    placeholder="Nhập mô tả văn bản (không chèn hình ảnh)..."
                    onChange={(e) => setFormData(prev => ({ ...prev, tourDescription: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label htmlFor="tourDuration">{t('tourManagement.edit.basic.fields.tourDuration')}</label>
                    <input
                      type="text"
                      id="tourDuration"
                      name="tourDuration"
                      value={formData.tourDuration}
                      onChange={handleInputChange}
                      placeholder={t('tourManagement.edit.basic.placeholders.tourDuration')}
                      required
                    />
                  </div>
                  
                  <div className={styles['form-group']}>
                    <label htmlFor="tourDeparturePoint">{t('tourManagement.edit.basic.fields.tourDeparturePoint')}</label>
                    <input
                      type="text"
                      id="tourDeparturePoint"
                      name="tourDeparturePoint"
                      value={formData.tourDeparturePoint}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label htmlFor="tourVehicle">{t('tourManagement.edit.basic.fields.tourVehicle')}</label>
                    <input
                      type="text"
                      id="tourVehicle"
                      name="tourVehicle"
                      value={formData.tourVehicle}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className={styles['form-group']}>
                    <label htmlFor="tourType">{t('tourManagement.edit.basic.fields.tourType')}</label>
                    <select
                      id="tourType"
                      name="tourType"
                      value={formData.tourType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">{t('tourManagement.edit.basic.placeholders.selectTourType')}</option>
                      <option value="resort">{t('common.tourTypes.resort')}</option>
                      <option value="culture">{t('common.tourTypes.culture')}</option>
                      <option value="adventure">{t('common.tourTypes.adventure')}</option>
                      <option value="team-building">{t('common.tourTypes.teamBuilding')}</option>
                      <option value="food">{t('common.tourTypes.food')}</option>
                      <option value="photography">{t('common.tourTypes.photography')}</option>
                      <option value="religious">{t('common.tourTypes.religious')}</option>
                      <option value="other">{t('common.tourTypes.other')}</option>
                    </select>
                  </div>
                </div>

                <div className={styles['form-section']}>
                  <h3>{t('tourManagement.edit.basic.priceCapacityTitle')}</h3>
                  <div className={styles['form-row']}>
                    <div className={styles['form-group']}>
                      <label htmlFor="amount">{t('tourManagement.edit.basic.fields.amount')}</label>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        min="1"
                        required
                      />
                    </div>
                    
                    <div className={styles['form-group']}>
                      <label htmlFor="tourStatus">{t('tourManagement.edit.basic.fields.tourStatus')}</label>
                      <select
                        id="tourStatus"
                        name="tourStatus"
                        value={formData.tourStatus}
                        onChange={handleInputChange}
                      >
                        <option value="ACTIVE">{t('tourManagement.status.active')}</option>
                        <option value="INACTIVE">{t('tourManagement.status.inactive')}</option>
                        <option value="DRAFT">{t('tourManagement.status.draft')}</option>
                      </select>
                    </div>
                  </div>

                  

                  {/* Removed pricing inputs from Basic tab; pricing is handled in the Pricing tab */}
                </div>
              </div>
            )}

            {activeTab === 'itinerary' && (
              <div className={styles['form-section']}>
                <h3>{t('tourManagement.edit.itinerary.title')}</h3>
                
                {/* Tour Schedule Summary */}
                <div className={styles['form-group']}>
                  <label htmlFor="tourSchedule">{t('tourWizard.step2.fields.tourSchedule')}</label>
                  <input
                    type="text"
                    id="tourSchedule"
                    name="tourSchedule"
                    value={formData.tourSchedule || ''}
                    onChange={handleInputChange}
                    placeholder="Nhập tóm tắt lịch trình tour..."
                    required
                  />
                </div>
                
                {/* Itinerary Days */}
                <div className={styles['itinerary-section']}>
                  <div className={styles['section-header']}>
                    <h4>{t('tourManagement.edit.itinerary.dailyTitle')}</h4>
                  </div>

                  {formData.itinerary.map((day, index) => (
                    <div key={index} className={styles['itinerary-day']}>
                      {/* Day Header with Color and Alignment Controls */}
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
                              className={`${styles['single-day-title-input']} ${day.title ? styles['customized'] : ''}`}
                              value={day.title || ''}
                              onChange={(e) => handleItineraryChange(index, 'title', e.target.value)}
                              placeholder={`Ngày ${day.dayNumber}`}
                              required
                              style={{ textAlign: day.titleAlignment || 'left' }}
                            />
                            <div className={styles['title-controls']}>
                              <div className={styles['alignment-buttons']}>
                                <button
                                  type="button"
                                  className={`${styles['align-btn']} ${(day.titleAlignment || 'left') === 'left' ? styles['active'] : ''}`}
                                  onClick={() => handleItineraryChange(index, 'titleAlignment', 'left')}
                                  title="Căn trái"
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
                                  onClick={() => handleItineraryChange(index, 'titleAlignment', 'center')}
                                  title="Căn giữa"
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
                                  onClick={() => handleItineraryChange(index, 'titleAlignment', 'right')}
                                  title="Căn phải"
                                >
                                  <div className={`${styles['align-icon']} ${styles['right-align']}`}>
                                    <div className={styles['line']}></div>
                                    <div className={styles['line']}></div>
                                    <div className={styles['line']}></div>
                                  </div>
                                </button>
                              </div>
                              {day.title && (
                                <button
                                  type="button"
                                  className={styles['reset-title-btn']}
                                  onClick={() => handleItineraryChange(index, 'title', '')}
                                  title="Xóa tiêu đề"
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
                                  onClick={() => handleItineraryChange(index, 'dayColor', color)}
                                  title={`Chọn màu ${color}`}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              className={styles['custom-color-btn']}
                              title="Tùy chỉnh màu sắc"
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

                      <div className={styles['form-group']}>
                        <label htmlFor={`day-description-${index}`}>{t('tourManagement.edit.itinerary.fields.dayDescription')}</label>
                        <Editor
                          apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                          value={day.description}
                          onEditorChange={(content) => 
                            handleItineraryChange(index, 'description', content)
                          }
                          init={{
                            height: 600,
                            menubar: false,
                            statusbar: false,
                            branding: false,
                            plugins: [
                              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                              'insertdatetime', 'media', 'table', 'help'
                            ],
                            toolbar: 'undo redo | blocks | ' +
                              'bold italic forecolor | alignleft aligncenter ' +
                              'alignright alignjustify | bullist numlist outdent indent | ' +
                              'table tabledelete | tableprops tablerowprops tablecellprops | ' +
                              'tableinsertrowbefore tableinsertrowafter tabledeleterow | ' +
                              'tableinsertcolbefore tableinsertcolafter tabledeletecol | removeformat | help',
                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                            forced_root_block: 'div',
                            remove_redundant_brs: true,
                            cleanup: true,
                            cleanup_on_startup: true,
                            verify_html: false,
                            entity_encoding: 'raw',
                            convert_urls: false
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                        <button
                          type="button"
                          className={styles['btn-add-day']}
                          onClick={() => addItineraryDayAfter(index)}
                        >
                          {t('tourManagement.edit.itinerary.actions.addDay')}
                        </button>
                        <button
                          type="button"
                          className={styles['btn-remove-day']}
                          onClick={() => removeItineraryDay(index)}
                        >
                          {t('tourManagement.edit.itinerary.actions.removeDay')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>


              </div>
            )}

            {activeTab === 'pricing' && (
              <div className={styles['form-section']}>
                <h3>{t('tourManagement.edit.pricing.title')}</h3>
                
                {/* Pricing Fields */}
                <div className={styles['pricing-grid']}>
                  <div className={styles['form-group']}>
                    <label htmlFor="adultPrice">{t('tourManagement.edit.pricing.fields.adultPrice')}</label>
                    <input
                      type="number"
                      id="adultPrice"
                      name="adultPrice"
                      value={formData.adultPrice}
                      min="0"
                      onKeyDown={preventInvalidNumberKeys}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setFormData(prev => ({ ...prev, adultPrice: e.target.value.replace(/[^0-9]/g,'') }))}
                      required
                    />
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="childrenPrice">{t('tourManagement.edit.pricing.fields.childrenPrice')}</label>
                    <input
                      type="number"
                      id="childrenPrice"
                      name="childrenPrice"
                      value={formData.childrenPrice}
                      min="0"
                      onKeyDown={preventInvalidNumberKeys}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setFormData(prev => ({ ...prev, childrenPrice: e.target.value.replace(/[^0-9]/g,'') }))}
                      required
                    />
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="babyPrice">{t('tourManagement.edit.pricing.fields.babyPrice')}</label>
                    <input
                      type="number"
                      id="babyPrice"
                      name="babyPrice"
                      value={formData.babyPrice}
                      min="0"
                      onKeyDown={preventInvalidNumberKeys}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setFormData(prev => ({ ...prev, babyPrice: e.target.value.replace(/[^0-9]/g,'') }))}
                      required
                    />
                  </div>
                </div>
                
                {/* Policies removed: consolidated into tourDescription shown at bottom of FE */}
              </div>
            )}

            {activeTab === 'media' && (
              <div className={styles['form-section']}>
                <h3>{t('tourManagement.edit.media.title')}</h3>
                
                {/* Cover Image Upload */}
                <div className={styles['form-group']}>
                  <label htmlFor="coverImage">{t('tourManagement.edit.media.coverLabel')}</label>
                  <div className={styles['image-upload-container']}>
                    <input
                      type="file"
                      id="coverImage"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      className={styles['file-input']}
                      required={!formData.tourImgPath}
                    />
                    
                    <div className={styles['current-image']}>
                      {formData.tourImgPath ? (
                        <label htmlFor="coverImage" className={`${styles['image-preview']} ${styles['clickable']}`}>
                          <img 
                            key={formData.tourImgPath}
                            src={(() => {
                              const imgPath = formData.tourImgPath;
                              if (!imgPath) return '';
                              if (imgPath.startsWith('blob:') || imgPath.startsWith('http')) return imgPath;
                              const normalized = imgPath.startsWith('/uploads')
                                ? imgPath
                                : `/uploads/tours/thumbnails/${imgPath.split('/').pop()}`;
                              return getImageUrl(normalized);
                            })()} 
                            alt="Current cover" 
                            className={styles['preview-image']}
                            onError={(e) => {
                              console.log('Image load error:', formData.tourImgPath);
                              e.target.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', formData.tourImgPath);
                            }}
                          />
                          <div className={styles['image-overlay']}>
                            <span className={styles['current-label']}>{t('tourManagement.edit.media.changeImage')}</span>
                          </div>
                        </label>
                      ) : (
                        <label htmlFor="coverImage" className={`${styles['no-image']} ${styles['clickable']}`}>
                          <div className={styles['no-image-icon']}>🖼️</div>
                          <p>{t('tourManagement.edit.media.selectImage')}</p>
                        </label>
                      )}
                    </div>
                    
                    <div className={styles['upload-section']}>
                      <p className={styles['upload-hint']}>
                        {t('tourManagement.edit.media.hint')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles['modal-actions']}>
            <button type="button" onClick={onClose} className={styles['btn-cancel']}>
              {t('common.cancel')}
            </button>
            <button type="submit" className={styles['btn-save']} disabled={loading}>
              {loading ? t('tourManagement.edit.saving') : t('tourManagement.edit.save')}
            </button>
          </div>
        </form>

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
                      if (typeof currentTarget === 'number') {
                        handleItineraryChange(currentTarget, 'dayColor', customColor);
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
      </div>
    </div>
  );
};

export default EditTourModal;