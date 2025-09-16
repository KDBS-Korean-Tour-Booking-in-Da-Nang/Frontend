import { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS, getImageUrl } from '../../../../../config/api';
import { Editor } from '@tinymce/tinymce-react';
import { useToast } from '../../../../../contexts/ToastContext';
import './EditTourModal.css';

const EditTourModal = ({ isOpen, onClose, tour, onSave }) => {
  const { showError, showSuccess } = useToast();
  const blobUrlRef = useRef(null);

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
        showError('Không thể upload ảnh. Vui lòng thử lại.');
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
    bookingDeadline: '',
    
    // Step 2: Itinerary
    itinerary: [],
    
    // Step 3: Pricing
    surchargePolicy: '',
    cancellationPolicy: '',
    surcharges: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (tour && isOpen) {
      setFormData({
        // Step 1: Basic Info
        tourName: tour.tourName || '',
        tourDescription: tour.tourDescription || '',
        tourDuration: tour.tourDuration || '',
        tourDeparturePoint: tour.tourDeparturePoint || '',
        tourVehicle: tour.tourVehicle || '',
        tourType: tour.tourType || '',
        amount: tour.amount || '',
        adultPrice: tour.adultPrice || '',
        childrenPrice: tour.childrenPrice || '',
        babyPrice: tour.babyPrice || '',
        tourStatus: tour.tourStatus || 'ACTIVE',
        bookingDeadline: tour.bookingDeadline || '',
        
        // Step 2: Itinerary - normalize from backend contents
        itinerary: Array.isArray(tour.contents)
          ? tour.contents.map((c, idx) => ({
              dayNumber: idx + 1,
              title: c.tourContentTitle || '',
              description: c.tourContentDescription || '',
              images: c.images || []
            }))
          : [],
        
        // Step 3: Pricing
        surchargePolicy: tour.surchargePolicy || '',
        cancellationPolicy: tour.cancellationPolicy || '',
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
        showError('Kích thước file không được vượt quá 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Chỉ được upload file ảnh');
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

  const removeItineraryDay = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary.filter((_, index) => index !== dayIndex)
        .map((day, index) => ({ ...day, dayNumber: index + 1 }))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tourName.trim()) {
      showError('Tên tour là bắt buộc');
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
        showError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        return;
      }
      
      const userData = JSON.parse(savedUser);
      const userEmail = userData.email;
      
      if (!userEmail) {
        showError('Không tìm thấy email người dùng. Vui lòng đăng nhập lại.');
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
        tourSchedule: tour.tourSchedule || '',
        bookingDeadline: formData.bookingDeadline || null,
        surchargePolicy: formData.surchargePolicy,
        cancellationPolicy: formData.cancellationPolicy,
        surcharges: formData.surcharges,
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
        showSuccess('Cập nhật tour thành công!');
        // Close modal immediately
        onClose();
        // Refresh data after successful save
        if (onSave) {
          onSave();
        }
      } else {
        const errorData = await response.json();
        showError(errorData.message || 'Có lỗi xảy ra khi cập nhật tour');
      }
    } catch (error) {
      console.error('Error updating tour:', error);
      showError('Có lỗi xảy ra khi cập nhật tour. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="edit-tour-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>Chỉnh sửa tour</h2>
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
              Thông tin cơ bản
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'itinerary' ? 'active' : ''}`}
              onClick={() => setActiveTab('itinerary')}
            >
              Lịch trình
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'pricing' ? 'active' : ''}`}
              onClick={() => setActiveTab('pricing')}
            >
              Giá cả & chính sách
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              Media
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'basic' && (
              <div className="form-section">
                <h3>Thông tin cơ bản</h3>
                <div className="form-group">
                  <label htmlFor="tourName">Tên tour *</label>
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
                  <label htmlFor="tourDescription">Mô tả tour</label>
                  <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                    value={formData.tourDescription}
                    onEditorChange={(content) => 
                      setFormData(prev => ({ ...prev, tourDescription: content }))
                    }
                    init={getTinyMCEConfig(200)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="tourDuration">Thời gian</label>
                    <input
                      type="text"
                      id="tourDuration"
                      name="tourDuration"
                      value={formData.tourDuration}
                      onChange={handleInputChange}
                      placeholder="VD: 5 ngày 4 đêm"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="tourDeparturePoint">Điểm khởi hành</label>
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
                    <label htmlFor="tourVehicle">Phương tiện</label>
                    <input
                      type="text"
                      id="tourVehicle"
                      name="tourVehicle"
                      value={formData.tourVehicle}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="tourType">Loại tour</label>
                    <select
                      id="tourType"
                      name="tourType"
                      value={formData.tourType}
                      onChange={handleInputChange}
                    >
                      <option value="">Chọn loại tour</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                      <option value="Luxury">Luxury</option>
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Giá cả & sức chứa</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="amount">Sức chứa (người)</label>
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
                      <label htmlFor="tourStatus">Trạng thái</label>
                      <select
                        id="tourStatus"
                        name="tourStatus"
                        value={formData.tourStatus}
                        onChange={handleInputChange}
                      >
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="INACTIVE">Tạm dừng</option>
                        <option value="DRAFT">Bản nháp</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="bookingDeadline">Hạn đặt tour</label>
                      <input
                        type="datetime-local"
                        id="bookingDeadline"
                        name="bookingDeadline"
                        value={formData.bookingDeadline}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="adultPrice">Giá người lớn (VNĐ)</label>
                      <input
                        type="number"
                        id="adultPrice"
                        name="adultPrice"
                        value={formData.adultPrice}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="childrenPrice">Giá trẻ em (VNĐ)</label>
                      <input
                        type="number"
                        id="childrenPrice"
                        name="childrenPrice"
                        value={formData.childrenPrice}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="babyPrice">Giá em bé (VNĐ)</label>
                    <input
                      type="number"
                      id="babyPrice"
                      name="babyPrice"
                      value={formData.babyPrice}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'itinerary' && (
              <div className="form-section">
                <h3>Lịch trình tour</h3>
                
                {/* Tour Description */}
                <div className="form-group">
                  <label htmlFor="tourDescription">Mô tả tour</label>
                  <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                    value={formData.tourDescription}
                    onEditorChange={(content) => 
                      setFormData(prev => ({ ...prev, tourDescription: content }))
                    }
                    init={getTinyMCEConfig(300)}
                  />
                </div>

                {/* Itinerary Days */}
                <div className="itinerary-section">
                  <div className="section-header">
                    <h4>Lịch trình từng ngày</h4>
                    <button
                      type="button"
                      onClick={addItineraryDay}
                      className="btn-add-day"
                    >
                      + Thêm ngày
                    </button>
                  </div>

                  {formData.itinerary.map((day, index) => (
                    <div key={index} className="itinerary-day">
                      <div className="day-header">
                        <h5>Ngày {day.dayNumber}</h5>
                        {formData.itinerary.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItineraryDay(index)}
                            className="btn-remove-day"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor={`day-title-${index}`}>Tiêu đề ngày</label>
                        <input
                          type="text"
                          id={`day-title-${index}`}
                          value={day.title}
                          onChange={(e) => handleItineraryChange(index, 'title', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`day-description-${index}`}>Mô tả chi tiết</label>
                        <Editor
                          apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                          value={day.description}
                          onEditorChange={(content) => 
                            handleItineraryChange(index, 'description', content)
                          }
                          init={{
                            height: 200,
                            menubar: false,
                            plugins: [
                              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                              'insertdatetime', 'media', 'table', 'help', 'wordcount'
                            ],
                            toolbar: 'undo redo | blocks | ' +
                              'bold italic forecolor | alignleft aligncenter ' +
                              'alignright alignjustify | bullist numlist outdent indent | ' +
                              'removeformat | help',
                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                            forced_root_block: false,
                            force_br_newlines: true,
                            force_p_newlines: false,
                            remove_redundant_brs: true,
                            cleanup: true,
                            cleanup_on_startup: true,
                            verify_html: false,
                            entity_encoding: 'raw',
                            convert_urls: false
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>


              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="form-section">
                <h3>Giá cả & chính sách</h3>
                
                {/* Pricing Fields */}
                <div className="pricing-grid">
                  <div className="form-group">
                    <label htmlFor="adultPrice">Giá người lớn (₫)</label>
                    <input
                      type="number"
                      id="adultPrice"
                      name="adultPrice"
                      value={formData.adultPrice}
                      onChange={handleInputChange}
                      placeholder="Nhập giá cho người lớn"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="childrenPrice">Giá trẻ em (₫)</label>
                    <input
                      type="number"
                      id="childrenPrice"
                      name="childrenPrice"
                      value={formData.childrenPrice}
                      onChange={handleInputChange}
                      placeholder="Nhập giá cho trẻ em"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="babyPrice">Giá em bé (₫)</label>
                    <input
                      type="number"
                      id="babyPrice"
                      name="babyPrice"
                      value={formData.babyPrice}
                      onChange={handleInputChange}
                      placeholder="Nhập giá cho em bé"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="surchargePolicy">Chính sách phụ thu</label>
                  <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                    value={formData.surchargePolicy}
                    onEditorChange={(content) => 
                      setFormData(prev => ({ ...prev, surchargePolicy: content }))
                    }
                    init={getTinyMCEConfig(200)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cancellationPolicy">Chính sách hủy tour</label>
                  <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                    value={formData.cancellationPolicy}
                    onEditorChange={(content) => 
                      setFormData(prev => ({ ...prev, cancellationPolicy: content }))
                    }
                    init={getTinyMCEConfig(200)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="form-section">
                <h3>Ảnh cover tour</h3>
                
                {/* Cover Image Upload */}
                <div className="form-group">
                  <label htmlFor="coverImage">Ảnh cover tour</label>
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
                            <span className="current-label">Thay đổi ảnh</span>
                          </div>
                        </label>
                      ) : (
                        <label htmlFor="coverImage" className="no-image clickable">
                          <div className="no-image-icon">🖼️</div>
                          <p>Chọn ảnh cover</p>
                        </label>
                      )}
                    </div>
                    
                    <div className="upload-section">
                      <p className="upload-hint">
                        Hỗ trợ: JPG, PNG, GIF. Kích thước tối đa: 5MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Hủy
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTourModal;