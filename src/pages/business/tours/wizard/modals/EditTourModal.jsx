import { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS, getImageUrl } from '../../../../../config/api';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tinymce/tinymce-react';
import { useToast } from '../../../../../contexts/ToastContext';
import './EditTourModal.css';

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
      
      try {
        const response = await fetch(API_ENDPOINTS.TOURS + '/content-image', {
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
              images: c.images || []
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
      images: []
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
      images: []
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
    
    if (!formData.tourName.trim()) {
      showError('toast.tour.name_required');
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
        amount: parseInt(formData.amount) || 30,
        adultPrice: parseFloat(formData.adultPrice) || 0,
        childrenPrice: parseFloat(formData.childrenPrice) || 0,
        babyPrice: parseFloat(formData.babyPrice) || 0,
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
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="edit-tour-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{t('tourManagement.edit.title')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
          {/* Tabs */}
          <div className="tabs-container">
            <button
              type="button"
              className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              {t('tourManagement.edit.tabs.basic')}
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'itinerary' ? 'active' : ''}`}
              onClick={() => setActiveTab('itinerary')}
            >
              {t('tourManagement.edit.tabs.itinerary')}
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'pricing' ? 'active' : ''}`}
              onClick={() => setActiveTab('pricing')}
            >
              {t('tourManagement.edit.tabs.pricing')}
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              {t('tourManagement.edit.tabs.media')}
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'basic' && (
              <div className="form-section">
                <h3>{t('tourManagement.edit.basic.title')}</h3>
                <div className="form-group">
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
                
                <div className="form-group">
                  <label htmlFor="tourDescription">{t('tourManagement.edit.basic.fields.tourDescription')}</label>
                  <textarea
                    id="tourDescription"
                    className="form-input"
                    rows={6}
                    value={formData.tourDescription}
                    placeholder="Nhập mô tả văn bản (không chèn hình ảnh)..."
                    onChange={(e) => setFormData(prev => ({ ...prev, tourDescription: e.target.value }))}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="tourDuration">{t('tourManagement.edit.basic.fields.tourDuration')}</label>
                    <input
                      type="text"
                      id="tourDuration"
                      name="tourDuration"
                      value={formData.tourDuration}
                      onChange={handleInputChange}
                      placeholder={t('tourManagement.edit.basic.placeholders.tourDuration')}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="tourDeparturePoint">{t('tourManagement.edit.basic.fields.tourDeparturePoint')}</label>
                    <input
                      type="text"
                      id="tourDeparturePoint"
                      name="tourDeparturePoint"
                      value={formData.tourDeparturePoint}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="tourVehicle">{t('tourManagement.edit.basic.fields.tourVehicle')}</label>
                    <input
                      type="text"
                      id="tourVehicle"
                      name="tourVehicle"
                      value={formData.tourVehicle}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="tourType">{t('tourManagement.edit.basic.fields.tourType')}</label>
                    <select
                      id="tourType"
                      name="tourType"
                      value={formData.tourType}
                      onChange={handleInputChange}
                    >
                      <option value="">{t('tourManagement.edit.basic.placeholders.selectTourType')}</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                      <option value="Luxury">Luxury</option>
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <h3>{t('tourManagement.edit.basic.priceCapacityTitle')}</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="amount">{t('tourManagement.edit.basic.fields.amount')}</label>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        min="1"
                      />
                    </div>
                    
                    <div className="form-group">
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
              <div className="form-section">
                <h3>{t('tourManagement.edit.itinerary.title')}</h3>
                
                {/* Tour Schedule Summary */}
                <div className="form-group">
                  <label htmlFor="tourSchedule">{t('tourWizard.step2.fields.tourSchedule')}</label>
                  <input
                    type="text"
                    id="tourSchedule"
                    name="tourSchedule"
                    value={formData.tourSchedule || ''}
                    onChange={handleInputChange}
                    placeholder="Nhập tóm tắt lịch trình tour..."
                  />
                </div>
                
                {/* Itinerary Days */}
                <div className="itinerary-section">
                  <div className="section-header">
                    <h4>{t('tourManagement.edit.itinerary.dailyTitle')}</h4>
                  </div>

                  {formData.itinerary.map((day, index) => (
                    <div key={index} className="itinerary-day">
                      <div className="day-header">
                        <h5>{t('tourManagement.edit.itinerary.dayN', { day: day.dayNumber })}</h5>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor={`day-title-${index}`}>{t('tourManagement.edit.itinerary.fields.dayTitle')}</label>
                        <input
                          type="text"
                          id={`day-title-${index}`}
                          value={day.title}
                          onChange={(e) => handleItineraryChange(index, 'title', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
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
                          className="btn-add-day"
                          onClick={() => addItineraryDayAfter(index)}
                        >
                          {t('tourManagement.edit.itinerary.actions.addDay')}
                        </button>
                        <button
                          type="button"
                          className="btn-remove-day"
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
              <div className="form-section">
                <h3>{t('tourManagement.edit.pricing.title')}</h3>
                
                {/* Pricing Fields */}
                <div className="pricing-grid">
                  <div className="form-group">
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
                    />
                  </div>

                  <div className="form-group">
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
                    />
                  </div>

                  <div className="form-group">
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
                    />
                  </div>
                </div>
                
                {/* Policies removed: consolidated into tourDescription shown at bottom of FE */}
              </div>
            )}

            {activeTab === 'media' && (
              <div className="form-section">
                <h3>{t('tourManagement.edit.media.title')}</h3>
                
                {/* Cover Image Upload */}
                <div className="form-group">
                  <label htmlFor="coverImage">{t('tourManagement.edit.media.coverLabel')}</label>
                  <div className="image-upload-container">
                    <input
                      type="file"
                      id="coverImage"
                      accept="image/*"
                      onChange={handleCoverImageChange}
                      className="file-input"
                    />
                    
                    <div className="current-image">
                      {formData.tourImgPath ? (
                        <label htmlFor="coverImage" className="image-preview clickable">
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
                            className="preview-image"
                            onError={(e) => {
                              console.log('Image load error:', formData.tourImgPath);
                              e.target.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', formData.tourImgPath);
                            }}
                          />
                          <div className="image-overlay">
                            <span className="current-label">{t('tourManagement.edit.media.changeImage')}</span>
                          </div>
                        </label>
                      ) : (
                        <label htmlFor="coverImage" className="no-image clickable">
                          <div className="no-image-icon">🖼️</div>
                          <p>{t('tourManagement.edit.media.selectImage')}</p>
                        </label>
                      )}
                    </div>
                    
                    <div className="upload-section">
                      <p className="upload-hint">
                        {t('tourManagement.edit.media.hint')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? t('tourManagement.edit.saving') : t('tourManagement.edit.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTourModal;