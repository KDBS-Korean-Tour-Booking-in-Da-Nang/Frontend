import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useToast } from '../../../contexts/ToastContext';
import { DeleteConfirmModal } from '../../../components/modals';
import { formatDateForAPI, formatGender, formatNationality } from '../../../utils/bookingFormatter';
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

  // Initialize form data from booking and guests
  useEffect(() => {
    if (booking && isOpen) {
      // Parse departure date
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

      // Organize guests by type
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

    // Validate guests
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

    // Prepare data for confirmation
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

    // Show confirmation modal inside edit modal
    setPendingFormData(formDataForConfirm);
    setShowConfirmModal(true);
  };

  const handleConfirmUpdate = () => {
    if (!pendingFormData) return;
    
    // Close confirmation modal
    setShowConfirmModal(false);
    
    // Call onConfirm to trigger update in parent component
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
      case 'MALE': return 'Nam';
      case 'FEMALE': return 'Nữ';
      case 'OTHER': return 'Khác';
      default: return gender || 'Nam';
    }
  };

  const getGuestTypeLabel = (type) => {
    switch (type) {
      case 'ADULT': return 'Người lớn';
      case 'CHILD': return 'Trẻ em';
      case 'BABY': return 'Em bé';
      default: return type || 'Người lớn';
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
              <h2>Chỉnh sửa booking</h2>
              <button
                type="button"
                className={styles['modal-close']}
                onClick={onClose}
                disabled={loading}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles['edit-form']}>
            {/* Tabs */}
            <div className={styles['tabs-container']}>
              <button
                type="button"
                className={`${styles['tab']} ${activeTab === 'contact' ? styles['active'] : ''}`}
                onClick={() => setActiveTab('contact')}
              >
                Thông tin liên hệ
              </button>
              <button
                type="button"
                className={`${styles['tab']} ${activeTab === 'guests' ? styles['active'] : ''}`}
                onClick={() => setActiveTab('guests')}
              >
                Danh sách khách ({formData.guests.length})
              </button>
              <button
                type="button"
                className={`${styles['tab']} ${activeTab === 'review' ? styles['active'] : ''}`}
                onClick={() => setActiveTab('review')}
              >
                Xem lại
              </button>
            </div>

            {/* Tab Content */}
            <div className={styles['tab-content']}>
              {activeTab === 'contact' && (
                <div className={styles['form-section']}>
                  <h3>Thông tin liên hệ</h3>
                  
                  <div className={styles['form-row']}>
                    <div className={styles['form-group']}>
                      <label htmlFor="contactName">
                        Họ tên <span className={styles['required']}>*</span>
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
                        Ngày khởi hành <span className={styles['required']}>*</span>
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
                        Số điện thoại <span className={styles['required']}>*</span>
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
                        Email <span className={styles['required']}>*</span>
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
                      Địa chỉ <span className={styles['required']}>*</span>
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
                    <label htmlFor="pickupPoint">Điểm đón</label>
                    <input
                      type="text"
                      id="pickupPoint"
                      name="pickupPoint"
                      value={formData.pickupPoint}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="note">Ghi chú</label>
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
                  <h3>Danh sách khách ({formData.guests.length})</h3>
                  
                  {formData.guests.length === 0 ? (
                    <p className={styles['empty-message']}>Chưa có thông tin khách</p>
                  ) : (
                    <div className={styles['guests-list']}>
                      {formData.guests.map((guest, index) => (
                        <div key={index} className={styles['guest-card']}>
                          <div className={styles['guest-header']}>
                            <h4>
                              Khách {index + 1} - {getGuestTypeLabel(guest.bookingGuestType)}
                            </h4>
                          </div>

                          <div className={styles['form-row']}>
                            <div className={styles['form-group']}>
                              <label>
                                Họ tên <span className={styles['required']}>*</span>
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
                                Ngày sinh <span className={styles['required']}>*</span>
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
                              <label>Giới tính</label>
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
                              <label>Quốc tịch</label>
                              <input
                                type="text"
                                value={guest.nationality}
                                onChange={(e) => handleGuestChange(index, 'nationality', e.target.value)}
                                placeholder="Vietnamese"
                              />
                            </div>
                          </div>

                          <div className={styles['form-group']}>
                            <label>CMND/CCCD/Passport</label>
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
                  <h3>Xem lại thông tin</h3>
                  
                  <div className={styles['review-section']}>
                    <h4>Thông tin liên hệ</h4>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>Họ tên:</span>
                      <span className={styles['value']}>{formData.contactName || '-'}</span>
                    </div>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>Số điện thoại:</span>
                      <span className={styles['value']}>{formData.contactPhone || '-'}</span>
                    </div>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>Email:</span>
                      <span className={styles['value']}>{formData.contactEmail || '-'}</span>
                    </div>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>Địa chỉ:</span>
                      <span className={styles['value']}>{formData.contactAddress || '-'}</span>
                    </div>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>Điểm đón:</span>
                      <span className={styles['value']}>{formData.pickupPoint || '-'}</span>
                    </div>
                    <div className={styles['review-item']}>
                      <span className={styles['label']}>Ngày khởi hành:</span>
                      <span className={styles['value']}>
                        {formData.departureDate 
                          ? new Date(formData.departureDate).toLocaleDateString('vi-VN')
                          : '-'}
                      </span>
                    </div>
                  </div>

                  <div className={styles['review-section']}>
                    <h4>Danh sách khách ({formData.guests.length})</h4>
                    {formData.guests.map((guest, index) => (
                      <div key={index} className={styles['guest-review']}>
                        <strong>Khách {index + 1} ({getGuestTypeLabel(guest.bookingGuestType)}):</strong>
                        <div className={styles['review-item']}>
                          <span className={styles['label']}>Họ tên:</span>
                          <span className={styles['value']}>{guest.fullName || '-'}</span>
                        </div>
                        <div className={styles['review-item']}>
                          <span className={styles['label']}>Ngày sinh:</span>
                          <span className={styles['value']}>
                            {guest.birthDate 
                              ? new Date(guest.birthDate).toLocaleDateString('vi-VN')
                              : '-'}
                          </span>
                        </div>
                        <div className={styles['review-item']}>
                          <span className={styles['label']}>Giới tính:</span>
                          <span className={styles['value']}>{getGenderLabel(guest.gender)}</span>
                        </div>
                        {guest.idNumber && (
                          <div className={styles['review-item']}>
                            <span className={styles['label']}>CMND/CCCD:</span>
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
                Xác nhận cập nhật
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>

      {/* Confirmation Modal - rendered separately with higher z-index */}
      {showConfirmModal && (
        <DeleteConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setPendingFormData(null);
          }}
          onConfirm={handleConfirmUpdate}
          title="Xác nhận cập nhật booking"
          message="Bạn chắc chắn cập nhật đúng thông tin chứ?"
          confirmText="Xác nhận"
          cancelText="Hủy"
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
