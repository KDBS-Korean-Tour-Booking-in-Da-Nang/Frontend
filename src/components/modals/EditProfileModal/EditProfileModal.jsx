import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { X, User, Phone, Upload } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { updateUserProfile, validateUserProfile } from '../../../services/userService';
import { getAvatarUrl } from '../../../config/api';
import styles from './EditProfileModal.module.css';

const EditProfileModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, getToken, refreshUser, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [avatarPreview, setAvatarPreview] = useState('/default-avatar.png');
  const [avatarFile, setAvatarFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const modalContainerRef = useRef(null);
  const bodyOverflowRef = useRef('');

  // Initialize form data when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.username || user.name || '',
        phone: user.phone || ''
      });
      setAvatarPreview(user.avatar ? getAvatarUrl(user.avatar) : '/default-avatar.png');
      setAvatarFile(null);
      setErrors({});
    }
  }, [isOpen, user]);

  // Resolve portal container once on mount
  useEffect(() => {
    if (!modalContainerRef.current) {
      const root = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
      modalContainerRef.current = root || (typeof document !== 'undefined' ? document.body : null);
    }
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!modalContainerRef.current || typeof document === 'undefined') return;
    if (isOpen) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = bodyOverflowRef.current || '';
      };
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, avatar: t('profile.errors.avatarTooLarge') || 'Kích thước ảnh không được vượt quá 5MB' }));
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, avatar: t('profile.errors.avatarInvalidFormat') || 'Định dạng ảnh không được hỗ trợ' }));
      return;
    }

    // Clear avatar error
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.avatar;
      return newErrors;
    });

    // Set file and preview
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.email) {
      showError(t('common.errors.loginRequired') || 'Vui lòng đăng nhập');
      return;
    }

    // Validate form data
    const userData = {
      email: user.email,
      name: formData.name,
      phone: formData.phone,
      avatarFile: avatarFile,
      currentAvatarUrl: user.avatar
    };

    const validation = validateUserProfile(userData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      if (firstError) {
        showError(firstError);
      }
      return;
    }

    try {
      setIsUpdating(true);
      const token = getToken();
      
      if (!token) {
        throw new Error(t('common.errors.loginRequired') || 'Vui lòng đăng nhập');
      }

      // Update user profile
      const result = await updateUserProfile(userData, token);
      
      // Refresh user data
      try {
        await refreshUser();
      } catch (refreshError) {
        // Fallback to local update
        const updatedUser = {
          ...user,
          username: formData.name,
          name: formData.name,
          phone: formData.phone,
          avatar: result?.avatar || user.avatar
        };
        updateUser(updatedUser);
      }

      showSuccess(t('profile.toast.updateSuccess') || 'Cập nhật thông tin thành công');
      onClose();
    } catch (error) {
      const errorMessage = error?.message || t('profile.errors.updateFailed') || 'Không thể cập nhật thông tin';
      showError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !isUpdating) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !isUpdating) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalNode = (
    <div 
      className={styles['modal-overlay']} 
      onClick={handleBackdrop}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className={styles['modal-container']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['modal-header']}>
          <h2 className={styles['modal-title']}>
            {t('profile.editModalTitle') || 'Edit Profile'}
          </h2>
          <button
            type="button"
            className={styles['modal-close']}
            onClick={onClose}
            disabled={isUpdating}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles['modal-form']}>
          {/* Avatar Upload */}
          <div className={styles['avatar-section']}>
            <div className={styles['avatar-preview-container']}>
              <img 
                src={avatarPreview} 
                alt="Avatar preview" 
                className={styles['avatar-preview']}
                onError={(e) => {
                  e.target.src = '/default-avatar.png';
                }}
              />
            </div>
            <label htmlFor="avatar-upload" className={styles['avatar-upload-label']}>
              <Upload size={16} strokeWidth={2} />
              <span>{t('profile.actions.chooseAvatar') || 'Choose Avatar'}</span>
            </label>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarChange}
              className={styles['avatar-input']}
              disabled={isUpdating}
            />
            {errors.avatar && (
              <div className={styles['error-message']}>{errors.avatar}</div>
            )}
          </div>

          {/* Form Fields */}
          <div className={styles['form-fields']}>
            <div className={styles['form-group']}>
              <label htmlFor="name" className={styles['form-label']}>
                <User size={16} strokeWidth={2} />
                <span>{t('profile.labels.fullName') || 'Full Name'}</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={styles['form-input']}
                disabled={isUpdating}
                required
              />
              {errors.name && (
                <div className={styles['error-message']}>{errors.name}</div>
              )}
            </div>

            <div className={styles['form-group']}>
              <label htmlFor="phone" className={styles['form-label']}>
                <Phone size={16} strokeWidth={2} />
                <span>{t('profile.labels.phone') || 'Phone'}</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={styles['form-input']}
                disabled={isUpdating}
              />
              {errors.phone && (
                <div className={styles['error-message']}>{errors.phone}</div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className={styles['modal-actions']}>
            <button
              type="button"
              onClick={onClose}
              className={styles['btn-cancel']}
              disabled={isUpdating}
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              className={styles['btn-save']}
              disabled={isUpdating}
            >
              {isUpdating ? (t('common.processing') || 'Processing...') : (t('profile.actions.save') || 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!modalContainerRef.current) return modalNode;
  return createPortal(modalNode, modalContainerRef.current);
};

export default EditProfileModal;

