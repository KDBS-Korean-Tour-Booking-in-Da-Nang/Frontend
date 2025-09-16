import { useState, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import './Step3Pricing.css';

const Step3Pricing = () => {
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
    toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link | removeformat | code | help',
    branding: false,
    content_style: 'body { font-family: Inter, system-ui, Arial, sans-serif; font-size: 14px }',
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
    adultPrice: '',
    childrenPrice: '',
    babyPrice: '',
    surchargePolicy: '',
    cancellationPolicy: ''
  });

  const [surcharges, setSurcharges] = useState([]);

  // Update form data when tourData changes
  useEffect(() => {
    setFormData({
      adultPrice: tourData.adultPrice || '',
      childrenPrice: tourData.childrenPrice || '',
      babyPrice: tourData.babyPrice || '',
      surchargePolicy: tourData.surchargePolicy || '',
      cancellationPolicy: tourData.cancellationPolicy || ''
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
        <h2 className="step-title">Giá & chính sách</h2>
        <p className="step-subtitle">Thiết lập giá và chính sách tour</p>
      </div>

      {/* Pricing */}
      <div className="pricing-section">
        <h3>Giá tour</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="adultPrice" className="form-label">
              Giá người lớn (≥ 12 tuổi) *
            </label>
            <input
              type="number"
              id="adultPrice"
              name="adultPrice"
              value={formData.adultPrice}
              onChange={(e) => {
                const newFormData = { ...formData, adultPrice: e.target.value };
                setFormData(newFormData);
                updateTourData(newFormData);
              }}
              className="form-input"
              placeholder="Ví dụ: 2500000"
              min="0"
            />
            <small className="form-help">VNĐ / người</small>
          </div>

          <div className="form-group">
            <label htmlFor="childrenPrice" className="form-label">
              Giá trẻ em (2-11 tuổi)
            </label>
            <input
              type="number"
              id="childrenPrice"
              name="childrenPrice"
              value={formData.childrenPrice}
              onChange={(e) => {
                const newFormData = { ...formData, childrenPrice: e.target.value };
                setFormData(newFormData);
                updateTourData(newFormData);
              }}
              className="form-input"
              placeholder="Ví dụ: 1800000"
              min="0"
            />
            <small className="form-help">VNĐ / trẻ em</small>
          </div>

          <div className="form-group">
            <label htmlFor="babyPrice" className="form-label">
              Giá em bé (dưới 2 tuổi)
            </label>
            <input
              type="number"
              id="babyPrice"
              name="babyPrice"
              value={formData.babyPrice}
              onChange={(e) => {
                const newFormData = { ...formData, babyPrice: e.target.value };
                setFormData(newFormData);
                updateTourData(newFormData);
              }}
              className="form-input"
              placeholder="Ví dụ: 500000"
              min="0"
            />
            <small className="form-help">VNĐ / em bé</small>
          </div>
        </div>

        {/* Price Summary */}
        <div className="price-summary">
          <h4>Tóm tắt giá</h4>
          <div className="summary-grid">
            <div className="price-item">
              <span className="price-label">Người lớn:</span>
              <span className="price-value">{formatPrice(formData.adultPrice)}</span>
            </div>
            <div className="price-item">
              <span className="price-label">Trẻ em:</span>
              <span className="price-value">{formatPrice(formData.childrenPrice)}</span>
            </div>
            <div className="price-item">
              <span className="price-label">Em bé:</span>
              <span className="price-value">{formatPrice(formData.babyPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Surcharges */}
      <div className="surcharges-section">
        <div className="section-header">
          <h3>Phụ thu</h3>
          <button 
            type="button" 
            className="btn-add" 
            onClick={addSurcharge}
          >
            + Thêm phụ thu
          </button>
        </div>

        {surcharges.map((surcharge, index) => (
          <div key={index} className="surcharge-item">
            <select
              value={surcharge.type}
              onChange={(e) => updateSurcharge(index, 'type', e.target.value)}
              className="form-select"
            >
              <option value="holiday">Dịp lễ Tết</option>
              <option value="weekend">Cuối tuần</option>
              <option value="single-room">Phòng đơn</option>
              <option value="peak-season">Mùa cao điểm</option>
              <option value="other">Khác</option>
            </select>
            <input
              type="text"
              placeholder="Tên phụ thu"
              value={surcharge.name}
              onChange={(e) => updateSurcharge(index, 'name', e.target.value)}
              className="form-input"
            />
            <input
              type="number"
              placeholder="Phần trăm (%)"
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
            <label className="form-label">Mô tả phụ thu</label>
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

      {/* Policies */}
      <div className="policies-section">
        <h3>Chính sách</h3>
        
        <div className="form-group">
          <label htmlFor="surchargePolicy" className="form-label">
            Chính sách phụ thu
          </label>
          <Editor
            apiKey={import.meta.env.VITE_TINYMCE_API_KEY || 'no-api-key'}
            value={formData.surchargePolicy}
            init={getTinyMCEConfig(200)}
            onEditorChange={(content) => {
              const newFormData = { ...formData, surchargePolicy: content };
              setFormData(newFormData);
              updateTourData(newFormData);
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cancellationPolicy" className="form-label">
            Chính sách hủy/hoàn tiền *
          </label>
          <Editor
            apiKey={import.meta.env.VITE_TINYMCE_API_KEY || 'no-api-key'}
            value={formData.cancellationPolicy}
            init={getTinyMCEConfig(200)}
            onEditorChange={(content) => {
              const newFormData = { ...formData, cancellationPolicy: content };
              setFormData(newFormData);
              updateTourData(newFormData);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Step3Pricing;
