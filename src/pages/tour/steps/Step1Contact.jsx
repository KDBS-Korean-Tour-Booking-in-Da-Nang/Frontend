import React, { useState, useEffect } from 'react';
import { useBooking } from '../../../contexts/TourBookingContext';
import './Step1Contact.css';

const Step1Contact = () => {
  const { contact, setContact } = useBooking();
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);
  
  // Expose isValid to parent component for navigation validation
  useEffect(() => {
    // This could be used by parent component if needed
    window.bookingStep1Valid = isValid;
  }, [isValid]);

  // Validation rules
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'fullName': {
        if (!value.trim()) {
          newErrors.fullName = 'Họ tên là bắt buộc';
        } else {
          delete newErrors.fullName;
        }
        break;
      }

      case 'phone': {
        const phoneRegex = /^(0|\+84)\d{9,10}$/;
        if (!value.trim()) {
          newErrors.phone = 'Số điện thoại là bắt buộc';
        } else if (!phoneRegex.test(value)) {
          newErrors.phone = 'Số điện thoại không hợp lệ (VD: 0123456789 hoặc +84123456789)';
        } else {
          delete newErrors.phone;
        }
        break;
      }

      case 'email': {
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!value.trim()) {
          newErrors.email = 'Email là bắt buộc';
        } else if (!emailRegex.test(value)) {
          newErrors.email = 'Email không hợp lệ';
        } else {
          delete newErrors.email;
        }
        break;
      }

      case 'address': {
        if (!value.trim()) {
          newErrors.address = 'Địa chỉ là bắt buộc';
        } else {
          delete newErrors.address;
        }
        break;
      }

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if all required fields are valid
  useEffect(() => {
    const requiredFields = ['fullName', 'phone', 'email', 'address'];
    const allValid = requiredFields.every(field => {
      const value = contact[field];
      return value?.trim() && !errors[field];
    });
    setIsValid(allValid);
  }, [contact, errors]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setContact({ [name]: value });
    validateField(name, value);
  };

  // Navigation is handled by parent component

  return (
    <div className="contact-form">
      <div className="form-section">
        <h3 className="section-title">Thông tin liên hệ</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="fullName" className="form-label required">
              Họ và tên
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={contact.fullName}
              onChange={handleInputChange}
              className={`form-input ${errors.fullName ? 'error' : ''}`}
              placeholder="Nhập họ và tên đầy đủ"
              required
            />
            {errors.fullName && (
              <span className="form-error">{errors.fullName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label required">
              Số điện thoại
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={contact.phone}
              onChange={handleInputChange}
              className={`form-input ${errors.phone ? 'error' : ''}`}
              placeholder="0123456789 hoặc +84123456789"
              required
            />
            {errors.phone && (
              <span className="form-error">{errors.phone}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label required">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={contact.email}
              onChange={handleInputChange}
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="example@email.com"
              required
            />
            {errors.email && (
              <span className="form-error">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="address" className="form-label required">
              Địa chỉ
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={contact.address}
              onChange={handleInputChange}
              className={`form-input ${errors.address ? 'error' : ''}`}
              placeholder="Nhập địa chỉ đầy đủ"
              required
            />
            {errors.address && (
              <span className="form-error">{errors.address}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="pickupPoint" className="form-label">
              Điểm đón
            </label>
            <input
              type="text"
              id="pickupPoint"
              name="pickupPoint"
              value={contact.pickupPoint}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Nhập điểm đón (tùy chọn)"
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="note" className="form-label">
              Ghi chú
            </label>
            <textarea
              id="note"
              name="note"
              value={contact.note}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="Nhập ghi chú thêm (tùy chọn)"
              rows="3"
            />
          </div>
        </div>
      </div>

      {/* Navigation is handled by parent component */}
    </div>
  );
};

// No props needed - navigation handled by parent

export default Step1Contact;
