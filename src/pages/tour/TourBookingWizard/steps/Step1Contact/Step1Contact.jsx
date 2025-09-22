import React, { useState, useEffect } from 'react';
import { useBooking } from '../../../../../contexts/TourBookingContext';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import styles from './Step1Contact.module.css';

const Step1Contact = () => {
  const { contact, setContact } = useBooking();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);
  const [usePersonalInfo, setUsePersonalInfo] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());
  const [touchedFields, setTouchedFields] = useState(new Set());
  
  // Handle auto-fill from user personal info
  const handleUsePersonalInfo = (checked) => {
    setUsePersonalInfo(checked);
    
    if (checked && user) {
      const newContact = { ...contact };
      const newAutoFilledFields = new Set();
      
      // Map user data to contact fields
      if (user.fullName) {
        newContact.fullName = user.fullName;
        newAutoFilledFields.add('fullName');
      }
      if (user.email) {
        newContact.email = user.email;
        newAutoFilledFields.add('email');
      }
      if (user.phone) {
        newContact.phone = user.phone;
        newAutoFilledFields.add('phone');
      }
      if (user.address) {
        newContact.address = user.address;
        newAutoFilledFields.add('address');
      }
      
      setContact(newContact);
      setAutoFilledFields(newAutoFilledFields);
    } else {
      // Clear auto-filled fields when unchecked
      setAutoFilledFields(new Set());
    }
  };

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
          newErrors.fullName = t('booking.errors.fullNameRequired');
        } else {
          delete newErrors.fullName;
        }
        break;
      }

      case 'phone': {
        // Updated regex: Vietnamese format (0xxxxxxxxx) or international formats with space
        const vietnameseRegex = /^0\d{9}$/;
        const internationalRegex = /^\+(\d{1,3})\s?\d{6,14}$/;
        
        if (!value.trim()) {
          newErrors.phone = t('booking.errors.phoneRequired');
        } else if (!vietnameseRegex.test(value) && !internationalRegex.test(value)) {
          newErrors.phone = t('booking.errors.phoneInvalid');
        } else {
          delete newErrors.phone;
        }
        break;
      }

      case 'email': {
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!value.trim()) {
          newErrors.email = t('booking.errors.emailRequired');
        } else if (!emailRegex.test(value)) {
          newErrors.email = t('booking.errors.emailInvalid');
        } else if (user && user.email && value.trim().toLowerCase() !== user.email.toLowerCase()) {
          newErrors.email = t('booking.errors.emailMismatch');
        } else {
          delete newErrors.email;
        }
        break;
      }

      case 'address': {
        if (!value.trim()) {
          newErrors.address = t('booking.errors.addressRequired');
        } else {
          delete newErrors.address;
        }
        break;
      }

      case 'pickupPoint': {
        if (!value.trim()) {
          newErrors.pickupPoint = t('booking.errors.pickupPointRequired');
        } else {
          delete newErrors.pickupPoint;
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
    const requiredFields = ['fullName', 'phone', 'email', 'address', 'pickupPoint'];
    const allValid = requiredFields.every(field => {
      const value = contact[field];
      // Always check validation for real-time feedback
      return value?.trim() && !errors[field];
    });
    setIsValid(allValid);
  }, [contact, errors]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for phone number input
    let processedValue = value;
    if (name === 'phone') {
      // Allow only digits and + at the beginning
      // Remove any non-digit characters except + at the start
      if (value.startsWith('+')) {
        // Keep + at the beginning and allow only digits after
        let digits = value.slice(1).replace(/[^0-9]/g, '');
        
        // Handle different country codes
        if (value.startsWith('+84')) {
          // Vietnam: Remove leading 0 and country code from digits
          digits = digits.replace(/^84/, '').replace(/^0+/, '');
          processedValue = '+84' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+1')) {
          // US/Canada: Remove leading 0 and country code from digits
          digits = digits.replace(/^1/, '').replace(/^0+/, '');
          processedValue = '+1' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+86')) {
          // China: Remove leading 0 and country code from digits
          digits = digits.replace(/^86/, '').replace(/^0+/, '');
          processedValue = '+86' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+82')) {
          // South Korea: Remove leading 0 and country code from digits
          digits = digits.replace(/^82/, '').replace(/^0+/, '');
          processedValue = '+82' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+81')) {
          // Japan: Remove leading 0 and country code from digits
          digits = digits.replace(/^81/, '').replace(/^0+/, '');
          processedValue = '+81' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+66')) {
          // Thailand: Remove leading 0 and country code from digits
          digits = digits.replace(/^66/, '').replace(/^0+/, '');
          processedValue = '+66' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+65')) {
          // Singapore: Remove leading 0 and country code from digits
          digits = digits.replace(/^65/, '').replace(/^0+/, '');
          processedValue = '+65' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+60')) {
          // Malaysia: Remove leading 0 and country code from digits
          digits = digits.replace(/^60/, '').replace(/^0+/, '');
          processedValue = '+60' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+63')) {
          // Philippines: Remove leading 0 and country code from digits
          digits = digits.replace(/^63/, '').replace(/^0+/, '');
          processedValue = '+63' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+44')) {
          // UK: Remove leading 0 and country code from digits
          digits = digits.replace(/^44/, '').replace(/^0+/, '');
          processedValue = '+44' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+33')) {
          // France: Remove leading 0 and country code from digits
          digits = digits.replace(/^33/, '').replace(/^0+/, '');
          processedValue = '+33' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+49')) {
          // Germany: Remove leading 0 and country code from digits
          digits = digits.replace(/^49/, '').replace(/^0+/, '');
          processedValue = '+49' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+39')) {
          // Italy: Remove leading 0 and country code from digits
          digits = digits.replace(/^39/, '').replace(/^0+/, '');
          processedValue = '+39' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+34')) {
          // Spain: Remove leading 0 and country code from digits
          digits = digits.replace(/^34/, '').replace(/^0+/, '');
          processedValue = '+34' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+7')) {
          // Russia/Kazakhstan: Remove leading 0 and country code from digits
          digits = digits.replace(/^7/, '').replace(/^0+/, '');
          processedValue = '+7' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+91')) {
          // India: Remove leading 0 and country code from digits
          digits = digits.replace(/^91/, '').replace(/^0+/, '');
          processedValue = '+91' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+61')) {
          // Australia: Remove leading 0 and country code from digits
          digits = digits.replace(/^61/, '').replace(/^0+/, '');
          processedValue = '+61' + (digits ? ' ' + digits : '');
        } else {
          // For other countries, keep digits as is with space
          processedValue = '+' + (digits ? digits.replace(/(\d{2,3})(\d+)/, '$1 $2') : '');
        }
      } else {
        // Allow only digits if no + at the beginning
        processedValue = value.replace(/[^0-9]/g, '');
      }
    }
    
    setContact({ [name]: processedValue });
    
    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(name));
    
    // Always validate on change for real-time feedback
    validateField(name, processedValue);
    
    // If user manually edits an auto-filled field, remove it from auto-filled set
    if (autoFilledFields.has(name)) {
      const newAutoFilledFields = new Set(autoFilledFields);
      newAutoFilledFields.delete(name);
      setAutoFilledFields(newAutoFilledFields);
    }
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    setTouchedFields(prev => new Set(prev).add(name));
    validateField(name, value);
  };


  // Navigation is handled by parent component

  return (
    <div className={styles['contact-form']}>
      {/* Personal Info Auto-fill Option */}
      {user && (
        <div className={styles['personal-info-option']}>
          <label className={styles['checkbox-label']}>
            <input
              type="checkbox"
              className={styles['checkbox-input']}
              checked={usePersonalInfo}
              onChange={(e) => handleUsePersonalInfo(e.target.checked)}
            />
            <span className={styles['checkbox-text']}>
              {t('booking.step1.usePersonalInfo')}
            </span>
          </label>
          
          {usePersonalInfo && (
            <div className={styles['auto-fill-notice']}>
              <span className={styles['notice-icon']}>ℹ️</span>
              <span className={styles['notice-text']}>
                {t('booking.step1.autoFillNotice')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>{t('booking.step1.sectionTitle')}</h3>
        
        <div className={styles['form-grid']}>
          <div className={styles['form-group']}>
            <label htmlFor="fullName" className={`${styles['form-label']} ${styles['required']}`}>
              {t('booking.step1.fields.fullName')}
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={contact.fullName}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`${styles['form-input']} ${errors.fullName ? styles['error'] : ''} ${autoFilledFields.has('fullName') ? styles['auto-filled'] : ''}`}
              placeholder={t('booking.step1.placeholders.fullName')}
              required
            />
            {errors.fullName && (
              <span className={styles['form-error']}>{errors.fullName}</span>
            )}
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="phone" className={`${styles['form-label']} ${styles['required']}`}>
              {t('booking.step1.fields.phone')}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={contact.phone}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`${styles['form-input']} ${errors.phone ? styles['error'] : ''} ${autoFilledFields.has('phone') ? styles['auto-filled'] : ''}`}
              placeholder={t('booking.step1.placeholders.phone')}
              required
            />
            {errors.phone && (
              <span className={styles['form-error']}>{errors.phone}</span>
            )}
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="email" className={`${styles['form-label']} ${styles['required']}`}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={contact.email}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`${styles['form-input']} ${errors.email ? styles['error'] : ''} ${autoFilledFields.has('email') ? styles['auto-filled'] : ''}`}
              placeholder="example@email.com"
              required
            />
            {errors.email && (
              <span className={styles['form-error']}>{errors.email}</span>
            )}
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="address" className={`${styles['form-label']} ${styles['required']}`}>
              {t('booking.step1.fields.address')}
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={contact.address}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`${styles['form-input']} ${errors.address ? styles['error'] : ''} ${autoFilledFields.has('address') ? styles['auto-filled'] : ''}`}
              placeholder={t('booking.step1.placeholders.address')}
              required
            />
            {errors.address && (
              <span className={styles['form-error']}>{errors.address}</span>
            )}
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="pickupPoint" className={`${styles['form-label']} ${styles['required']}`}>
              {t('booking.step1.fields.pickupPoint')}
            </label>
            <input
              type="text"
              id="pickupPoint"
              name="pickupPoint"
              value={contact.pickupPoint}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`${styles['form-input']} ${errors.pickupPoint ? styles['error'] : ''}`}
              placeholder={t('booking.step1.placeholders.pickupPoint')}
              required
            />
            {errors.pickupPoint && (
              <span className={styles['form-error']}>{errors.pickupPoint}</span>
            )}
          </div>

          <div className={styles['form-group']} style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="note" className={styles['form-label']}>
              {t('booking.step1.fields.note')}
            </label>
            <textarea
              id="note"
              name="note"
              value={contact.note}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={styles['form-textarea']}
              placeholder={t('booking.step1.placeholders.note')}
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
