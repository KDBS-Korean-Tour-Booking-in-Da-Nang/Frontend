import { useState, useEffect } from 'react';
import { useTourWizardContext } from '../../../../../../contexts/TourWizardContext';
import './Step1BasicInfo.css';

const Step1BasicInfo = () => {
  const { tourData, updateTourData } = useTourWizardContext();
  const [formData, setFormData] = useState({
    tourName: '',
    departurePoint: 'Đà Nẵng', // Default departure point
    duration: '',
    nights: '',
    tourType: '',
    maxCapacity: '',
    bookingDeadline: ''
  });

  // Update form data when tourData changes
  useEffect(() => {
    setFormData({
      tourName: tourData.tourName || '',
      departurePoint: tourData.departurePoint || 'Đà Nẵng', // Default departure point
      duration: tourData.duration || '',
      nights: tourData.nights || '',
      tourType: tourData.tourType || '',
      maxCapacity: tourData.maxCapacity || '',
      bookingDeadline: tourData.bookingDeadline || ''
    });
  }, [tourData]);

  const tourTypes = [
    { value: 'resort', label: 'Nghỉ dưỡng' },
    { value: 'culture', label: 'Văn hóa' },
    { value: 'adventure', label: 'Mạo hiểm' },
    { value: 'team-building', label: 'Team Building' },
    { value: 'food', label: 'Ẩm thực' },
    { value: 'photography', label: 'Nhiếp ảnh' },
    { value: 'religious', label: 'Tâm linh' },
    { value: 'other', label: 'Khác' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    setFormData(newFormData);
    updateTourData(newFormData);
  };


  return (
    <div className="step1-container">
      <div className="step-header">
        <h2 className="step-title">Thông tin cơ bản</h2>
        <p className="step-subtitle">Nhập thông tin cơ bản của tour</p>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="tourName" className="form-label">
            Tên tour *
          </label>
          <input
            type="text"
            id="tourName"
            name="tourName"
            value={formData.tourName}
            onChange={handleChange}
            className="form-input"
            placeholder="Ví dụ: Tour Đà Nẵng - Hội An 3N2Đ, Tour Hàn Quốc 5N4Đ"
          />
        </div>

        <div className="form-group">
          <label htmlFor="tourType" className="form-label">
            Loại hình tour *
          </label>
          <select
            id="tourType"
            name="tourType"
            value={formData.tourType}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">Chọn loại hình tour</option>
            {tourTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="departurePoint" className="form-label">
            Điểm khởi hành
          </label>
          <select
            id="departurePoint"
            name="departurePoint"
            value={formData.departurePoint}
            onChange={handleChange}
            className="form-select"
            disabled
          >
            <option value="Đà Nẵng">Đà Nẵng</option>
          </select>
          <small className="form-help">Tất cả tour đều khởi hành từ Đà Nẵng</small>
        </div>


        <div className="form-group">
          <label htmlFor="duration" className="form-label">
            Số ngày *
          </label>
          <input
            type="number"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            className="form-input"
            placeholder="Ví dụ: 3"
            min="1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="nights" className="form-label">
            Số đêm *
          </label>
          <input
            type="number"
            id="nights"
            name="nights"
            value={formData.nights}
            onChange={handleChange}
            className="form-input"
            placeholder="Ví dụ: 2"
            min="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="maxCapacity" className="form-label">
            Số chỗ tối đa *
          </label>
          <input
            type="number"
            id="maxCapacity"
            name="maxCapacity"
            value={formData.maxCapacity}
            onChange={handleChange}
            className="form-input"
            placeholder="Ví dụ: 30"
            min="1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="bookingDeadline" className="form-label">
            Hạn chót đặt chỗ *
          </label>
          <input
            type="datetime-local"
            id="bookingDeadline"
            name="bookingDeadline"
            value={formData.bookingDeadline}
            onChange={handleChange}
            className="form-input"
            placeholder="Chọn ngày giờ hạn chót đặt chỗ"
          />
          <small className="form-help">Thời gian hạn chót để khách hàng đặt tour</small>
        </div>
      </div>

      <div className="step-summary">
        <h3>Tóm tắt thông tin</h3>
        <div className="summary-content">
          <p><strong>Tên tour:</strong> {formData.tourName || 'Chưa nhập'}</p>
          <p><strong>Loại hình:</strong> {tourTypes.find(t => t.value === formData.tourType)?.label || 'Chưa chọn'}</p>
          <p><strong>Điểm khởi hành:</strong> {formData.departurePoint || 'Chưa nhập'}</p>
          <p><strong>Thời gian:</strong> {formData.duration || 'Chưa nhập'} ngày {formData.nights ? `${formData.nights} đêm` : ''}</p>
          <p><strong>Số chỗ tối đa:</strong> {formData.maxCapacity || 'Chưa nhập'} khách</p>
          <p><strong>Hạn đặt chỗ:</strong> {formData.bookingDeadline || 'Chưa nhập'}</p>
        </div>
      </div>
    </div>
  );
};

export default Step1BasicInfo;
