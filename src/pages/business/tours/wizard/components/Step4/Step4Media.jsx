import { useState, useEffect } from 'react';
import { useToast } from '../../../../../../contexts/ToastContext';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import TourCard from './TourCard';
import './Step4Media.css';

const Step4Media = () => {
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
        showError('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, GIF, WebP, etc.)');
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        showError('Kích thước file không được vượt quá 10MB');
        return;
      }
      
      const newFormData = { ...formData, thumbnail: file };
      setFormData(newFormData);
      updateTourData(newFormData);
    }
  };



  return (
    <div className="step4-container">
      <h2 className="section-title">Hình ảnh & Tệp đính kèm</h2>

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
                <div className="upload-text">Thay đổi ảnh</div>
                <div className="upload-subtext">
                  {formData.thumbnail.name} • {(formData.thumbnail.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">📷</div>
                <div className="upload-text">Click để chọn ảnh cover</div>
                <div className="upload-subtext">
                  Hỗ trợ: JPG, PNG, GIF, WebP, SVG<br/>
                  Kích thước khuyến nghị: 1200x800px (tối đa 10MB)
                </div>
              </div>
            )}
          </label>
        </div>
      </div>


      {/* Preview */}
      <div className="preview-container">
        <h3 className="preview-title">Preview Tour</h3>
        
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
            <h5>Thông tin tour preview:</h5>
            <ul>
              <li><strong>Tên tour:</strong> {tourData.tourName || 'Chưa có tên'}</li>
              <li><strong>Thời gian:</strong> {tourData.duration || '0'} ngày {tourData.nights || '0'} đêm</li>
              <li><strong>Giá người lớn:</strong> {tourData.adultPrice ? `${new Intl.NumberFormat('vi-VN').format(tourData.adultPrice)} VNĐ` : 'Chưa có giá'}</li>
              <li><strong>Hình ảnh:</strong> {formData.thumbnail ? 'Đã upload' : 'Chưa có'}</li>
              <li><strong>Trạng thái:</strong> Sẽ hiển thị trong danh sách tour</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4Media;
