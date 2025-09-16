import { useState, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import './Step2Itinerary.css';

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
  const { tourData, updateTourData } = useTourWizardContext();

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
      'removeformat | help',
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
    tourDescription: '',
    itinerary: [],
    mainSectionTitle: 'ĐIỂM ĐẾN VÀ HÀNH TRÌNH',
    mainSectionColor: '#4caf50'
  });
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#4caf50');
  const [currentTarget, setCurrentTarget] = useState(null); // 'main' or day index
  const [currentHue, setCurrentHue] = useState(180); // 0-360
  const [saturation, setSaturation] = useState(0.8); // 0-1
  const [brightness, setBrightness] = useState(0.8); // 0-1

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

  // Update form data when tourData changes
  useEffect(() => {
    const duration = parseInt(tourData.duration) || 1;
    
    // Auto-generate itinerary days based on duration from Step 1
    let newItinerary = tourData.itinerary || [];
    
    // If we have fewer days than duration, add missing days
    while (newItinerary.length < duration) {
      newItinerary.push({
        day: newItinerary.length + 1,
        activities: '',
        images: [],
        services: [],
        dayTitle: '',
        dayDescription: 'Ăn trưa – tối',
        dayColor: '#10b981' // Default green color
      });
    }
    
    // If we have more days than duration, remove extra days
    if (newItinerary.length > duration) {
      newItinerary = newItinerary.slice(0, duration);
    }
    
    // Update day numbers; keep titles empty unless user customizes
    newItinerary = newItinerary.map((day, index) => ({
      ...day,
      day: index + 1,
      dayTitle: day.dayTitle || '',
      dayDescription: day.dayDescription || 'Ăn trưa – tối'
    }));
    
    setFormData({
      tourDescription: tourData.tourDescription || '',
      itinerary: newItinerary,
      mainSectionTitle: tourData.mainSectionTitle || 'ĐIỂM ĐẾN VÀ HÀNH TRÌNH',
      mainSectionColor: tourData.mainSectionColor || '#3498db'
    });
  }, [tourData.duration, tourData.itinerary, tourData.tourDescription, tourData.mainSectionTitle, tourData.mainSectionColor]);



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

  const handleImageUpload = (dayIndex, files) => {
    const newImages = Array.from(files).slice(0, 5); // Max 5 images
    updateDay(dayIndex, 'images', newImages);
  };

  const addService = (dayIndex) => {
    const newService = { name: '', price: '', type: 'food' };
    const newFormData = {
      ...formData,
      itinerary: formData.itinerary.map((day, i) => 
        i === dayIndex ? { 
          ...day, 
          services: [...(day.services || []), newService] 
        } : day
      )
    };
    setFormData(newFormData);
    updateTourData(newFormData);
  };

  const updateService = (dayIndex, serviceIndex, field, value) => {
    const newFormData = {
      ...formData,
      itinerary: formData.itinerary.map((day, i) => 
        i === dayIndex ? {
          ...day,
          services: day.services.map((service, j) => 
            j === serviceIndex ? { ...service, [field]: value } : service
          )
        } : day
      )
    };
    setFormData(newFormData);
    updateTourData(newFormData);
  };

  const removeService = (dayIndex, serviceIndex) => {
    const newFormData = {
      ...formData,
      itinerary: formData.itinerary.map((day, i) => 
        i === dayIndex ? {
          ...day,
          services: day.services.filter((_, j) => j !== serviceIndex)
        } : day
      )
    };
    setFormData(newFormData);
    updateTourData(newFormData);
  };


  return (
    <div className="step2-container">
      <div className="step-header">
        <h2 className="step-title">Lịch trình chi tiết</h2>
        <p className="step-subtitle">Thiết lập chi tiết lịch trình từng ngày</p>
        <div className="step-instructions">
          <p><strong>💡 Hướng dẫn:</strong> Bạn có thể tùy chỉnh hoàn toàn các tiêu đề trong lịch trình:</p>
          <div className="title-examples">
            <p><strong>🔧 Các phần có thể tùy chỉnh:</strong></p>
            <ul>
              <li><strong>Tiêu đề phần:</strong> "ĐIỂM ĐẾN VÀ HÀNH TRÌNH" → "LỊCH TRÌNH CHI TIẾT"</li>
              <li><strong>Tiêu đề ngày:</strong> "NGÀY 1 - TOUR ĐÀ NẴNG" → "NGÀY 1 - ĐÀ NẴNG – HUẾ - GALA DINNER"</li>
            </ul>
            <p><strong>📝 Ví dụ tiêu đề ngày:</strong></p>
            <ul>
              <li>"NGÀY 1 - ĐÀ NẴNG – HUẾ - GALA DINNER"</li>
              <li>"DAY 1 - HỘI AN - LÀNG GỐM THANH HÀ"</li>
              <li>"CHƯƠNG 1 - BA NA HILLS - CẦU VÀNG"</li>
              <li>"BUỔI 1 - THAM QUAN ĐÀ NẴNG"</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tour Description */}
      <div className="tour-description-section">
        <h3>Mô tả tour *</h3>
        <p className="section-description">
          Mô tả tổng quan về tour, điểm nổi bật và lợi ích cho khách hàng
        </p>
        <Editor
          apiKey={import.meta.env.VITE_TINYMCE_API_KEY || 'no-api-key'}
          value={formData.tourDescription}
          init={getTinyMCEConfig(300)}
          onEditorChange={(content) => {
            const cleanedContent = cleanHtmlContent(content);
            const newFormData = { ...formData, tourDescription: cleanedContent };
            setFormData(newFormData);
            updateTourData(newFormData);
          }}
        />
      </div>

      {/* Itinerary Days */}
      <div className="itinerary-section">
        {/* Main Header - Customizable Color Bar */}
        <div className="itinerary-main-header">
          <div 
            className="main-title-container"
            style={{
              background: `linear-gradient(135deg, ${formData.mainSectionColor}, ${adjustColor(formData.mainSectionColor, -20)})`,
              boxShadow: `0 4px 15px ${formData.mainSectionColor}40`
            }}
          >
            <div className="single-day-title-container">
              <input
                type="text"
                className="single-day-title-input"
                value={formData.mainSectionTitle}
                onChange={(e) => updateFormData('mainSectionTitle', e.target.value)}
                placeholder="Tùy chỉnh tiêu đề phần (ví dụ: LỊCH TRÌNH CHI TIẾT)"
                title="Nhấp để tùy chỉnh tiêu đề phần"
              />
              {formData.mainSectionTitle !== 'ĐIỂM ĐẾN VÀ HÀNH TRÌNH' && (
                <button
                  type="button"
                  className="reset-title-btn"
                  onClick={() => updateFormData('mainSectionTitle', 'ĐIỂM ĐẾN VÀ HÀNH TRÌNH')}
                  title="Reset về tiêu đề mặc định"
                >
                  ↺
                </button>
              )}
            </div>
            <div className="color-picker-container">
              <div className="color-presets">
                {[
                  '#e91e63', // Pink
                  '#2196f3', // Blue
                  '#4caf50', // Green
                  '#ff9800'  // Orange
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-preset ${formData.mainSectionColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateFormData('mainSectionColor', color)}
                    title={`Chọn màu ${color}`}
                  />
                ))}
              </div>
              <button
                type="button"
                className="custom-color-btn"
                title="Tùy chỉnh màu sắc"
                onClick={() => {
                  setCurrentTarget('main');
                  setCustomColor(formData.mainSectionColor);
                  setShowCustomColorPicker(true);
                }}
              >
                🎯
              </button>
            </div>
          </div>
        </div>

        {/* Custom Color Picker Modal */}
        {showCustomColorPicker && (
          <div className="custom-color-picker-modal">
            <div className="color-picker-content">
              <div className="color-picker-header">
                <h3>Tùy chỉnh màu sắc</h3>
                <button 
                  className="close-picker-btn"
                  onClick={() => setShowCustomColorPicker(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="color-picker-body">
                <div className="color-gradient-area">
                  <div 
                    className="color-gradient-square" 
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
                      className="color-selector"
                      style={{
                        left: `${saturation * 200 - 6}px`,
                        top: `${(1 - brightness) * 150 - 6}px`
                      }}
                    ></div>
                  </div>
                  <div className="hue-slider-container">
                    <div 
                      className="hue-slider"
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
                        className="hue-selector"
                        style={{
                          left: `${(currentHue / 360) * 200 - 8}px`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="color-tools">
                  <div className="eyedropper-tool">
                    <button className="eyedropper-btn" title="Eyedropper">
                      🎯
                    </button>
                  </div>
                  <div className="current-color-swatch">
                    <div 
                      className="color-swatch"
                      style={{ backgroundColor: customColor }}
                    ></div>
                  </div>
                </div>
                
                <div className="rgb-inputs">
                  <div className="rgb-input-group">
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
                      className="rgb-input"
                    />
                  </div>
                  <div className="rgb-input-group">
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
                      className="rgb-input"
                    />
                  </div>
                  <div className="rgb-input-group">
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
                      className="rgb-input"
                    />
                  </div>
                </div>
                
                <div className="color-picker-actions">
                  <button 
                    className="apply-color-btn"
                    onClick={() => {
                      if (currentTarget === 'main') {
                        updateFormData('mainSectionColor', customColor);
                      } else if (currentTarget !== null) {
                        updateDay(currentTarget, 'dayColor', customColor);
                      }
                      setShowCustomColorPicker(false);
                    }}
                  >
                    Áp dụng
                  </button>
                  <button 
                    className="cancel-color-btn"
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
            className="day-card"
            style={{
              '--day-color': day.dayColor || '#10b981',
              '--day-color-dark': adjustColor(day.dayColor || '#10b981', -20)
            }}
          >
            {/* Day Header - Customizable Color Bar with Editable Title */}
            <div 
              className="day-header-bar"
              style={{
                background: `linear-gradient(135deg, ${day.dayColor || '#10b981'}, ${adjustColor(day.dayColor || '#10b981', -20)})`
              }}
            >
              <div className="day-header-content">
                <div className="single-day-title-container">
                  <input
                    type="text"
                    className={`single-day-title-input ${day.dayTitle ? 'customized' : ''}`}
                    value={day.dayTitle || ''}
                    onChange={(e) => updateDay(index, 'dayTitle', e.target.value)}
                    placeholder="Nhập tiêu đề ngày (ví dụ: NGÀY 1 - ĐÀ NẴNG – HUẾ - GALA DINNER)"
                    title="Nhấp để tùy chỉnh toàn bộ tiêu đề ngày"
                  />
                  {day.dayTitle && (
                    <button
                      type="button"
                      className="reset-title-btn"
                      onClick={() => updateDay(index, 'dayTitle', '')}
                      title="Xóa tiêu đề ngày"
                    >
                      ↺
                    </button>
                  )}
                </div>
                <span className="day-description">({day.dayDescription || 'Ăn trưa – tối'})</span>
                <div className="color-picker-container">
                  <div className="color-presets">
                    {[
                      '#e91e63', // Pink
                      '#2196f3', // Blue
                      '#4caf50', // Green
                      '#ff9800'  // Orange
                    ].map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`color-preset ${day.dayColor === color ? 'active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateDay(index, 'dayColor', color)}
                        title={`Chọn màu ${color}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="custom-color-btn"
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

            <div className="day-content">
              <div className="form-group">
                <label className="form-label">Hoạt động & địa điểm *</label>
                <Editor
                  apiKey={import.meta.env.VITE_TINYMCE_API_KEY || 'no-api-key'}
                  value={day.activities}
                  init={getTinyMCEConfig(300)}
                  onEditorChange={(content) => updateDay(index, 'activities', cleanHtmlContent(content))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hình ảnh minh họa (tối đa 5 ảnh)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(index, e.target.files)}
                  className="form-input"
                />
                {day.images.length > 0 && (
                  <div className="image-preview">
                {day.images.map((img, imgIndex) => (
                  <div key={`img-${day.day}-${imgIndex}`} className="preview-item">
                        <img src={URL.createObjectURL(img)} alt={`Preview ${imgIndex}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Services */}
              <div className="services-section">
                <div className="services-header">
                  <label className="form-label">Dịch vụ kèm theo</label>
                  <button 
                    type="button" 
                    className="btn-add-small"
                    onClick={() => addService(index)}
                  >
                    + Thêm dịch vụ
                  </button>
                </div>

                {day.services?.map((service, serviceIndex) => (
                  <div key={`service-${day.day}-${serviceIndex}`} className="service-item">
                    <select
                      value={service.type}
                      onChange={(e) => updateService(index, serviceIndex, 'type', e.target.value)}
                      className="form-select"
                    >
                      <option value="food">Ăn uống</option>
                      <option value="ticket">Vé tham quan</option>
                      <option value="transport">Vận chuyển</option>
                      <option value="other">Khác</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Tên dịch vụ"
                      value={service.name}
                      onChange={(e) => updateService(index, serviceIndex, 'name', e.target.value)}
                      className="form-input"
                    />
                    <input
                      type="number"
                      placeholder="Giá (VNĐ)"
                      value={service.price}
                      onChange={(e) => updateService(index, serviceIndex, 'price', e.target.value)}
                      className="form-input"
                    />
                    <button 
                      type="button" 
                      className="btn-remove-small"
                      onClick={() => removeService(index, serviceIndex)}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Step2Itinerary;
