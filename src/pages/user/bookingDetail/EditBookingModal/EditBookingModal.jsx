import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useToast } from '../../../../contexts/ToastContext';
import { DeleteConfirmModal } from '../../../../components/modals';
import { formatDateForAPI, formatGender, formatNationality } from '../../../../utils/bookingFormatter';
import styles from './EditBookingModal.module.css';

/**
 * Edit Booking Modal - Inline form with tabs (similar to EditTourModal)
 */
const EditBookingModal = ({ isOpen, onClose, onConfirm, booking, guests = [] }) => {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');
  const [error, setError] = useState('');
  const [modalContainerRef, setModalContainerRef] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [formData, setFormData] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    contactAddress: '',
    pickupPoint: '',
    note: '',
    departureDate: '',
    adultsCount: 0,
    childrenCount: 0,
    babiesCount: 0,
    guests: []
  });

  useEffect(() => {
    if (!modalContainerRef) {
      const root = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
      setModalContainerRef(root || (typeof document !== 'undefined' ? document.body : null));
    }
  }, [modalContainerRef]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (booking && isOpen) {
      let departureDate = '';
      if (booking.departureDate) {
        try {
          const date = new Date(booking.departureDate);
          if (!isNaN(date.getTime())) {
            departureDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        } catch {
          departureDate = '';
        }
      }

      const organizedGuests = {
        adult: [],
        child: [],
        infant: []
      };

      if (Array.isArray(guests) && guests.length > 0) {
        guests.forEach((guest) => {
          const guestData = {
            fullName: guest.fullName || '',
            birthDate: guest.birthDate ? (() => {
              try {
                const d = new Date(guest.birthDate);
                return d.toISOString().split('T')[0];
              } catch {
                return '';
              }
            })() : '',
            gender: guest.gender || 'MALE',
            idNumber: guest.idNumber || '',
            nationality: guest.nationality || 'Vietnamese',
            bookingGuestType: guest.bookingGuestType || 'ADULT'
          };

          if (guest.bookingGuestType === 'ADULT') {
            organizedGuests.adult.push(guestData);
          } else if (guest.bookingGuestType === 'CHILD') {
            organizedGuests.child.push(guestData);
          } else if (guest.bookingGuestType === 'BABY') {
            organizedGuests.infant.push(guestData);
          }
        });
      }

      setFormData({
        contactName: booking.contactName || '',
        contactPhone: booking.contactPhone || '',
        contactEmail: booking.contactEmail || '',
        contactAddress: booking.contactAddress || '',
        pickupPoint: booking.pickupPoint || '',
        note: booking.note || '',
        departureDate: departureDate,
        adultsCount: booking.adultsCount || organizedGuests.adult.length || 0,
        childrenCount: booking.childrenCount || organizedGuests.child.length || 0,
        babiesCount: booking.babiesCount || organizedGuests.infant.length || 0,
        guests: [
          ...organizedGuests.adult,
          ...organizedGuests.child,
          ...organizedGuests.infant
        ]
      });
    }
  }, [booking, guests, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGuestChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      guests: prev.guests.map((guest, i) => 
        i === index ? { ...guest, [field]: value } : guest
      )
    }));
  };

  const handleDateChange = (dateString) => {
    setFormData(prev => ({
      ...prev,
      departureDate: dateString
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.contactName?.trim()) errors.push('Họ tên liên hệ');
    if (!formData.contactPhone?.trim()) errors.push('Số điện thoại');
    if (!formData.contactEmail?.trim()) errors.push('Email');
    if (!formData.contactAddress?.trim()) errors.push('Địa chỉ');
    if (!formData.departureDate) errors.push('Ngày khởi hành');
    if (formData.adultsCount < 1) errors.push('Ít nhất 1 người lớn');

    const totalGuests = formData.adultsCount + formData.childrenCount + formData.babiesCount;
    if (totalGuests !== formData.guests.length) {
      errors.push('Số lượng khách không khớp với danh sách');
    }

    formData.guests.forEach((guest, index) => {
      if (!guest.fullName?.trim()) errors.push(`Khách ${index + 1}: Họ tên`);
      if (!guest.birthDate) errors.push(`Khách ${index + 1}: Ngày sinh`);
    });

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setError(`Vui lòng nhập đầy đủ: ${errors.join(', ')}`);
      return;
    }

    const formDataForConfirm = {
      contactName: formData.contactName.trim(),
      contactAddress: formData.contactAddress.trim(),
      contactPhone: formData.contactPhone.trim(),
      contactEmail: formData.contactEmail.trim(),
      pickupPoint: formData.pickupPoint?.trim() || '',
      note: formData.note?.trim() || '',
      departureDate: formData.departureDate,
      adultsCount: formData.adultsCount,
      childrenCount: formData.childrenCount,
      babiesCount: formData.babiesCount,
      guests: formData.guests.map(guest => ({
        fullName: guest.fullName.trim(),
        birthDate: guest.birthDate,
        gender: guest.gender,
        idNumber: guest.idNumber?.trim() || '',
        nationality: guest.nationality || 'Vietnamese',
        bookingGuestType: guest.bookingGuestType
      }))
    };

    setPendingFormData(formDataForConfirm);
    setShowConfirmModal(true);
  };

  const handleConfirmUpdate = () => {
    if (!pendingFormData) return;
    
    setShowConfirmModal(false);
    onConfirm(pendingFormData);
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  };

  const getGenderLabel = (gender) => {
    switch (gender) {
      case 'MALE': return t('editBookingModal.gender.male');
      case 'FEMALE': return t('editBookingModal.gender.female');
      case 'OTHER': return t('editBookingModal.gender.other');
      default: return gender || t('editBookingModal.gender.male');
    }
  };

  const getGuestTypeLabel = (type) => {
    switch (type) {
      case 'ADULT': return t('editBookingModal.guestTypes.adult');
      case 'CHILD': return t('editBookingModal.guestTypes.child');
      case 'BABY': return t('editBookingModal.guestTypes.baby');
      default: return type || t('editBookingModal.guestTypes.adult');
    }
  };

  if (!isOpen || !booking) return null;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const modalNode = (
    <>
      <div className={styles['modal-overlay']} onClick={handleBackdrop}>
        <div className={styles['edit-booking-modal']} onClick={(e) => e.stopPropagation()}>
          <div className={styles['modal-panel']}>
            <div className={styles['modal-header']}>
              <h2>{t('editBookingModal.title')}</h2>
              <button
                type="button"
                className={styles['modal-close']}
                onClick={onClose}
                disabled={loading}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles['edit-form']}>
            <div className={styles['tabs-container']}>
              <button
                type="button"
                className={`${styles['tab']} ${activeTab === 'contact' ? styles['active'] : ''}`}
                onClick={() => setActiveTab('contact')}
              >
                {t('editBookingModal.tabs.contact')}
              </button>
              <button
                type="button"
                className={`${styles['tab']} ${activeTab === 'guests' ? styles['active'] : ''}`}
                onClick={() => setActiveTab('guests')}
              >
                {t('editBookingModal.tabs.guests', { count: formData.guests.length })}
              </button>
              <button
                type="button"
                className={`${styles['tab']} ${activeTab === 'review' ? styles['active'] : ''}`}
                onClick={() => setActiveTab('review')}
              >
                {t('editBookingModal.tabs.review')}
              </button>
            </div>

            <div className={styles['tab-content']}>
              {activeTab === 'contact' && (
                <div className={styles['form-section']}>
                  <h3>{t('editBookingModal.contactSection.title')}</h3>
                  
                  <div className={styles['form-row']}>
                    <div className={styles['form-group']}>
                      <label htmlFor="contactName">
                        {t('booking.step1.fields.fullName')} <span className={styles['required']}>*</span>
                      </label>
                      <input
                        type="text"
                        id="contactName"
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className={styles['form-group']}>
                      <label htmlFor="departureDate">
                        {t('payment.departureDate')} <span className={styles['required']}>*</span>
                      </label>
                      <input
                        type="date"
                        id="departureDate"
                        name="departureDate"
                        value={formData.departureDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles['form-row']}>
                    <div className={styles['form-group']}>
                      <label htmlFor="contactPhone">
                        {t('booking.step1.fields.phone')} <span className={styles['required']}>*</span>
                      </label>
                      <input
                        type="tel"
                        id="contactPhone"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className={styles['form-group']}>
                      <label htmlFor="contactEmail">
                        {t('booking.step1.fields.email')} <span className={styles['required']}>*</span>
                      </label>
                      <input
                        type="email"
                        id="contactEmail"
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="contactAddress">
                      {t('booking.step1.fields.address')} <span className={styles['required']}>*</span>
                    </label>
                    <input
                      type="text"
                      id="contactAddress"
                      name="contactAddress"
                      value={formData.contactAddress}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="pickupPoint">{t('booking.step1.fields.pickupPoint')}</label>
                    <input
                      type="text"
                      id="pickupPoint"
                      name="pickupPoint"
                      value={formData.pickupPoint}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="note">{t('booking.step1.fields.note')}</label>
                    <textarea
                      id="note"
                      name="note"
                      value={formData.note}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'guests' && (
                <div className={styles['form-section']}>
                  <h3>{t('editBookingModal.guestsSection.title', { count: formData.guests.length })}</h3>
                  
                  {formData.guests.length === 0 ? (
                    <p className={styles['empty-message']}>{t('editBookingModal.guestsSection.empty')}</p>
                  ) : (
                    <div className={styles['guests-list']}>
                      {formData.guests.map((guest, index) => (
                        <div key={index} className={styles['guest-card']}>
                          <div className={styles['guest-header']}>
                            <h4>
                              {t('editBookingModal.guestsSection.guestTitle', {
                                index: index + 1,
                                type: getGuestTypeLabel(guest.bookingGuestType)
                              })}
                            </h4>
                          </div>

                          <div className={styles['form-row']}>
                            <div className={styles['form-group']}>
                              <label>
                                {t('booking.step1.fields.fullName')} <span className={styles['required']}>*</span>
                              </label>
                              <input
                                type="text"
                                value={guest.fullName}
                                onChange={(e) => handleGuestChange(index, 'fullName', e.target.value)}
                                required
                              />
                            </div>

                            <div className={styles['form-group']}>
                              <label>
                                {t('editBookingModal.guests.labelBirthDate')} <span className={styles['required']}>*</span>
                              </label>
                              <input
                                type="date"
                                value={guest.birthDate}
                                onChange={(e) => handleGuestChange(index, 'birthDate', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                required
                              />
                            </div>
                          </div>

                          <div className={styles['form-row']}>
                            <div className={styles['form-group']}>
                              <label>{t('booking.step1.fields.gender')}</label>
                              <select
                                value={guest.gender}
                                onChange={(e) => handleGuestChange(index, 'gender', e.target.value)}
                              >
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="OTHER">Khác</option>
                              </select>
                            </div>

                            <div className={styles['form-group']}>
                              <label>{t('editBookingModal.fields.nationality')}</label>
                              <input
                                type="text"
                                value={guest.nationality}
                                onChange={(e) => handleGuestChange(index, 'nationality', e.target.value)}
                                placeholder={t('editBookingModal.placeholders.nationality')}
                              />
                            </div>
                          </div>

                          <div className={styles['form-group']}>
                            <label>{t('editBookingModal.fields.idNumber')}</label>
                            <input
                              type="text"
                              value={guest.idNumber}
                              onChange={(e) => handleGuestChange(index, 'idNumber', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'review' && (
                <div className={styles['form-section']}>
                  <h3>{t('editBookingModal.reviewSection.title')}</h3>
                  
                  <div className={styles['review-section']}>
                    <h4>{t('editBookingModal.reviewSection.contactInfoTitle')}</h4>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>{t('booking.step1.fields.fullName')}:</span>
                      <span className={styles['value']}>{formData.contactName || '-'}</span>
                    </div>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>{t('booking.step1.fields.phone')}:</span>
                      <span className={styles['value']}>{formData.contactPhone || '-'}</span>
                    </div>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>{t('booking.step1.fields.email')}:</span>
                      <span className={styles['value']}>{formData.contactEmail || '-'}</span>
                    </div>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>{t('booking.step1.fields.address')}:</span>
                      <span className={styles['value']}>{formData.contactAddress || '-'}</span>
                    </div>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>{t('booking.step1.fields.pickupPoint')}:</span>
                      <span className={styles['value']}>{formData.pickupPoint || '-'}</span>
                    </div>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>{t('payment.departureDate')}:</span>
                      <span className={styles['value']}>
                        {formData.departureDate 
                          ? new Date(formData.departureDate).toLocaleDateString('vi-VN')
                          : '-'}
                      </span>
                    </div>
                  </div>

                  <div className={styles['review-section']}>
                    <h4>{t('editBookingModal.reviewSection.guestsTitle', { count: formData.guests.length })}</h4>
                    {formData.guests.map((guest, index) => (
                      <div key={index} className={styles['guest-review']}>
                        <strong>
                          {t('editBookingModal.reviewSection.guestSummary', {
                            index: index + 1,
                            type: getGuestTypeLabel(guest.bookingGuestType)
                          })}
                        </strong>
                        <div className={styles['review-item']}>
                          <span className={styles['label']}>{t('booking.step1.fields.fullName')}:</span>
                          <span className={styles['value']}>{guest.fullName || '-'}</span>
                        </div>
                        <div className={styles['review-item']}>
                          <span className={styles['label']}>{t('editBookingModal.guests.labelBirthDate')}:</span>
                          <span className={styles['value']}>
                            {guest.birthDate 
                              ? new Date(guest.birthDate).toLocaleDateString('vi-VN')
                              : '-'}
                          </span>
                        </div>
                        <div className={styles['review-item']}>
                          <span className={styles['label']}>{t('booking.step1.fields.gender')}:</span>
                          <span className={styles['value']}>{getGenderLabel(guest.gender)}</span>
                        </div>
                        {guest.idNumber && (
                          <div className={styles['review-item']}>
                            <span className={styles['label']}>{t('editBookingModal.fields.idNumberShort')}:</span>
                            <span className={styles['value']}>{guest.idNumber}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles['modal-actions']}>
              <button 
                type="button" 
                onClick={onClose} 
                className={styles['btn-cancel']}
                disabled={loading}
              >
                {t('common.cancel') || 'Hủy'}
              </button>
              <button 
                type="submit" 
                className={styles['btn-primary']}
                disabled={loading}
              >
                {t('editBookingModal.actions.submit')}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <DeleteConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setPendingFormData(null);
          }}
          onConfirm={handleConfirmUpdate}
          title={t('editBookingModal.confirmModal.title')}
          message={t('editBookingModal.confirmModal.message')}
          confirmText={t('common.confirm')}
          cancelText={t('common.cancel')}
          icon="✓"
          danger={false}
          disableBackdropClose={false}
        />
      )}
    </>
  );

  if (!modalContainerRef) return modalNode;
  return createPortal(modalNode, modalContainerRef);
};

export default EditBookingModal;
