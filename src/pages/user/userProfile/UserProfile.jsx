import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { Modal } from '../../../components';
import { updateUserProfile, validateUserProfile, changeUserPassword } from '../../../services/userService';
import { DatePicker } from 'react-rainbow-components';
import { Calendar, UserRound, Phone, Mail, MapPin, Venus, Mars } from 'lucide-react';
import { 
  PencilIcon, 
  EyeIcon, 
  UserIcon, 
  CogIcon, 
  ShieldCheckIcon,
  HeartIcon,
  CreditCardIcon,
  BellIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import styles from './UserProfile.module.css';

const GenderLabelIcon = () => (
  <span className={styles['gender-label-icon']}>
    <Mars />
    <Venus />
  </span>
);

const UserProfile = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser, getToken, refreshUser } = useAuth();
  const { showSuccess } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.username || user?.name || '',
    phone: user?.phone || '',
    dob: user?.dob ? (()=>{ try { return formatDateFromNormalizedSafe(user.dob); } catch { return ''; } })() : '',
    gender: user?.gender || '',
    address: user?.address || ''
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '/default-avatar.png');
  const [avatarFile, setAvatarFile] = useState(null);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const isSocialProvider = (user?.authProvider === 'GOOGLE' || user?.authProvider === 'NAVER');
  const [nameError, setNameError] = useState('');
  const [dobError, setDobError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [editingFields, setEditingFields] = useState(new Set());
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // Check if user is OAuth-only (no real password) from localStorage
  const [isOAuthOnly, setIsOAuthOnly] = useState(() => {
    if (user?.email) {
      try {
        const oauthOnlyFlag = localStorage.getItem(`isOAuthOnly_${user.email}`);
        const hasPasswordFlag = localStorage.getItem(`hasPassword_${user.email}`);
        
        // If explicitly marked as OAuth-only, hide form
        if (oauthOnlyFlag === 'true') {
          return true;
        }
        
        // If social provider and no hasPassword flag, assume OAuth-only (hide form)
        // This handles: user logs in with Google for first time → no form shown
        if (isSocialProvider && hasPasswordFlag !== 'true') {
          return true;
        }
        
        return false;
      } catch {
        // If error reading localStorage, check if social provider
        return isSocialProvider;
      }
    }
    return false;
  });
  const localeMap = {
    vi: 'vi-VN',
    en: 'en-US',
    ko: 'ko-KR'
  };

  const notUpdatedLabel = t('profile.notUpdated');

  const getLanguageName = (lang) => {
    const key = `lang.${lang}`;
    const translated = t(key);
    return translated || t('lang.vi');
  };

  const getFlagFileName = (lang) => {
    const flagMap = {
      vi: 'VN',
      en: 'EN',
      ko: 'KR'
    };
    return flagMap[lang] || 'VN';
  };

  const formatGenderLabel = (gender) => {
    if (!gender) return notUpdatedLabel;
    if (gender === 'M') return t('profile.genderOptions.male');
    if (gender === 'F') return t('profile.genderOptions.female');
    if (gender === 'O') return t('profile.genderOptions.other');
    return gender;
  };

  const formatDobForDisplay = (dob) => {
    if (!dob) return notUpdatedLabel;
    try {
      return new Date(dob).toLocaleDateString(localeMap[i18n.language] || 'vi-VN');
    } catch {
      return notUpdatedLabel;
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setPasswordErrors({});
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value
    }));
    setPasswordErrors((prev) => ({
      ...prev,
      [name]: ''
    }));
  };

  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordForm.currentPassword.trim()) {
      errors.currentPassword = t('profile.password.errors.currentRequired');
    }
    if (!passwordForm.newPassword.trim()) {
      errors.newPassword = t('profile.password.errors.newRequired');
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = t('profile.password.errors.minLength');
    } else if (passwordForm.newPassword === passwordForm.currentPassword) {
      errors.newPassword = t('profile.password.errors.sameAsCurrent');
    }
    if (!passwordForm.confirmNewPassword.trim()) {
      errors.confirmNewPassword = t('profile.password.errors.confirmRequired');
    } else if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      errors.confirmNewPassword = t('profile.password.errors.match');
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;
    try {
      setIsChangingPassword(true);
      const token = getToken();
      if (!token) {
        throw new Error(t('profile.errors.tokenMissing'));
      }
      await changeUserPassword(
        {
          email: user?.email,
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        token
      );
      showSuccess(t('profile.password.success'));
      resetPasswordForm();
      // Mark user as having password if change succeeds (user has real password)
      // This proves user has a real password, not OAuth dummy password
      if (user?.email) {
        try {
          localStorage.setItem(`hasPassword_${user.email}`, 'true');
          localStorage.removeItem(`isOAuthOnly_${user.email}`);
          setIsOAuthOnly(false);
        } catch {}
      }
    } catch (error) {
      // Check if it's an OAuth-only user error
      const errorMessage = error?.message || '';
      let message = errorMessage;
      let isOAuthError = false;
      
      // If backend returns error for OAuth-only users, show specific message
      if (errorMessage.toLowerCase().includes('oauth') || 
          errorMessage.toLowerCase().includes('social') ||
          errorMessage.toLowerCase().includes('google') ||
          errorMessage.toLowerCase().includes('naver') ||
          errorMessage.toLowerCase().includes('không có mật khẩu') ||
          errorMessage.toLowerCase().includes('does not have a password') ||
          errorMessage.toLowerCase().includes('비밀번호가 없습니다') ||
          errorMessage.toLowerCase().includes('cannot change password') ||
          errorMessage.toLowerCase().includes('không thể đổi mật khẩu')) {
        isOAuthError = true;
        message = t('profile.password.errors.oauthOnly') || 'Tài khoản này đăng nhập qua Google/Naver và không có mật khẩu. Không thể đổi mật khẩu.';
        
        // Save OAuth-only status to localStorage
        if (user?.email) {
          try {
            localStorage.setItem(`isOAuthOnly_${user.email}`, 'true');
            setIsOAuthOnly(true);
          } catch {}
        }
      } else if (!message) {
        message = t('profile.password.errors.generic');
      }
      setPasswordErrors({ general: message });
    } finally {
      setIsChangingPassword(false);
    }
  };
  const isDeletingRef = useRef(false);
  const datePickerRef = useRef(null); // Ref for DatePicker to trigger programmatically

  // All users can change avatar regardless of login method

  // Update isOAuthOnly when user email or authProvider changes
  useEffect(() => {
    if (user?.email) {
      try {
        const oauthOnlyFlag = localStorage.getItem(`isOAuthOnly_${user.email}`);
        const hasPasswordFlag = localStorage.getItem(`hasPassword_${user.email}`);
        
        // If explicitly marked as OAuth-only, hide form
        if (oauthOnlyFlag === 'true') {
          setIsOAuthOnly(true);
          return;
        }
        
        // If explicitly marked as having password, show form
        // This handles: user registered email+password → logged in Google → can change password
        if (hasPasswordFlag === 'true') {
          setIsOAuthOnly(false);
          return;
        }
        
        // If social provider and no flags, assume OAuth-only (hide form)
        // This handles: 
        // - User logs in with Google for first time → no form shown
        // - User logs in with Google again (already in DB) → no form shown (still OAuth-only)
        if (isSocialProvider) {
          setIsOAuthOnly(true);
          return;
        }
        
        // If not social provider, show form (user registered with email+password)
        setIsOAuthOnly(false);
      } catch {
        // If error reading localStorage, check if social provider
        setIsOAuthOnly(isSocialProvider);
      }
    } else {
      setIsOAuthOnly(false);
    }
  }, [user?.email, isSocialProvider]);

  // Fetch user data on component mount and after updates
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.email) {
        try {
          // Use refreshUser from AuthContext to ensure consistency
          await refreshUser();
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Don't show error toast on mount, only log it
        }
      }
    };

    fetchUserData();
  }, []); // Only run on mount

  // Update editForm when user data changes (after successful update)
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user?.username || user?.name || '',
        phone: user?.phone || '',
        dob: user?.dob ? formatDateFromNormalizedSafe(user.dob) : '',
        gender: user?.gender || '',
        address: user?.address || ''
      });
      // Only update avatarPreview if no file is currently selected
      // This ensures we don't override user's current avatar selection
      if (!avatarFile) {
        setAvatarPreview(user?.avatar || '/default-avatar.png');
      }
    }
  }, [user, i18n.language]); // Reformat DOB on language change

  const getDateSeparator = () => {
    switch (i18n.language) {
      case 'ko': return '.';
      case 'vi':
      case 'en':
      default: return '/';
    }
  };

  const formatDateFromNormalizedSafe = (val) => {
    try {
      let iso = '';
      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) iso = val; else if (val) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) iso = d.toISOString().slice(0,10);
      }
      if (!iso) return '';
      const [y,m,d] = iso.split('-');
      const sep = getDateSeparator();
      if (i18n.language === 'ko') return `${y}${sep}${m}${sep}${d}`;
      if (i18n.language === 'vi') return `${d}${sep}${m}${sep}${y}`;
      return `${m}${sep}${d}${sep}${y}`;
    } catch { return ''; }
  };

  const parseDateFromDisplayToISO = (display) => {
    if (!display) return '';
    const sep = getDateSeparator();
    const parts = display.split(sep);
    if (parts.length !== 3) return '';
    let y,m,d;
    if (i18n.language === 'ko') { y=parts[0]; m=parts[1]; d=parts[2]; }
    else if (i18n.language === 'vi') { d=parts[0]; m=parts[1]; y=parts[2]; }
    else { m=parts[0]; d=parts[1]; y=parts[2]; }
    if (!(y && m && d)) return '';
    const iso = `${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    const test = new Date(iso);
    return isNaN(test.getTime()) ? '' : iso;
  };

  const validateDob = (displayValue) => {
    const iso = parseDateFromDisplayToISO(displayValue || '');
    if (!displayValue || !iso) {
      setDobError(t('booking.errors.dobInvalidFormat'));
      return false;
    }
    const birth = new Date(iso);
    const today = new Date();
    // must be strictly in the past
    if (birth.getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
      setDobError(t('booking.errors.dobInvalidFormat'));
      return false;
    }
    let age = today.getFullYear() - birth.getFullYear();
    const md = today.getMonth() - birth.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
    // Require at least 13 years old
    if (age < 13) {
      setDobError(t('profile.errors.mustBe13'));
      return false;
    }
    // No upper age limit, just check for negative age (future date)
    if (age < 0) {
      setDobError(t('booking.errors.dobInvalidFormat'));
      return false;
    }
    setDobError('');
    return true;
  };

  const formatDobInputOnType = (value) => {
    if (!value) return '';
    const sep = getDateSeparator();
    const clean = value.replace(/[^\d\/\.]/g, '');
    const prevEndsSep = (editForm.dob || '').endsWith(sep);
    const parts = clean.split(sep);
    // deletion mode
    if (isDeletingRef.current) return clean;
    // Allow incomplete parts without forcing
    const incomplete = parts.some((p, idx)=>{
      if (i18n.language === 'ko') return (idx===0 ? p.length>0 && p.length<4 : p.length>0 && p.length<2);
      return p.length>0 && p.length<2;
    });
    if (incomplete) return clean;
    // Auto-insert separators when parts complete
    if (i18n.language === 'vi') {
      if (parts.length===1 && parts[0].length===2) return parts[0]+sep;
      if (parts.length===2 && parts[1].length===2) return parts[0]+sep+parts[1]+sep;
    } else if (i18n.language === 'en') {
      if (parts.length===1 && parts[0].length===2) return parts[0]+sep;
      if (parts.length===2 && parts[1].length===2) return parts[0]+sep+parts[1]+sep;
    } else { // ko YYYY.MM.DD
      if (parts.length===1 && parts[0].length===4) return parts[0]+sep;
      if (parts.length===2 && parts[1].length===2) return parts[0]+sep+parts[1]+sep;
    }
    return clean;
  };

  

  const sidebarMenuItems = [
    { id: 'profile', label: t('profile.sidebar.profile'), icon: UserIcon },
    { id: 'settings', label: t('profile.sidebar.settings'), icon: CogIcon },
    { id: 'changePassword', label: t('profile.sidebar.changePassword'), icon: ShieldCheckIcon },
    { id: 'favorites', label: t('profile.sidebar.favorites'), icon: HeartIcon },
    { id: 'payments', label: t('profile.sidebar.payments'), icon: CreditCardIcon },
    { id: 'notifications', label: t('profile.sidebar.notifications'), icon: BellIcon }
  ];

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isValidUsername = (val) => {
    if (val === undefined || val === null) return false;
    const trimmed = String(val).normalize('NFC').trim();
    if (trimmed.length === 0) return false; // name cannot be empty in edit modal
    // Start with a letter; allow any letters (all languages), combining marks, digits, and spaces
    const usernameRegex = /^\p{L}[\p{L}\p{M}\p{N}\s]*$/u;
    return usernameRegex.test(trimmed);
  };

  const sanitizeUsername = (val) => {
    const str = String(val || '').normalize('NFC');
    // Keep Unicode letters, combining marks, digits, and spaces only
    let cleaned = str.replace(/[^\p{L}\p{M}\p{N}\s]/gu, '');
    // Ensure the first non-space character is a letter; drop leading digits
    cleaned = cleaned.replace(/^[\s\p{N}]+/u, '');
    return cleaned;
  };

  const handleNameChange = (e) => {
    const input = e.target.value;
    const sanitized = sanitizeUsername(input);
    setEditForm(prev => ({ ...prev, name: sanitized }));
    const trimmed = (sanitized || '').trim();
    if (!trimmed) {
      setNameError(t('toast.name_required'));
    } else if (!isValidUsername(sanitized)) {
      setNameError(t('profile.errors.invalidName'));
    } else {
      setNameError('');
    }
  };

  const handleNameBeforeInput = () => {
    // Allow IME composition and let onChange sanitize/validate.
    // Intentionally left empty to avoid blocking Vietnamese diacritics input.
  };

  const handleNamePaste = (e) => {
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const current = target.value;
    const next = current.slice(0, start) + pasted + current.slice(end);
    const nextSanitized = sanitizeUsername(next);
    if (!isValidUsername(nextSanitized)) {
      e.preventDefault();
      const inserted = sanitizeUsername(pasted);
      const fixed = current.slice(0, start) + inserted + current.slice(end);
      setEditForm(prev => ({ ...prev, name: fixed }));
      const trimmedInserted = (inserted || '').trim();
      if (!trimmedInserted) {
        setNameError(t('toast.name_required'));
      } else {
        setNameError(t('profile.errors.invalidName'));
      }
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    
    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      setAvatarError(t('profile.errors.avatarSize') || 'Kích thước ảnh không được vượt quá 5MB');
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      setAvatarError(t('profile.errors.avatarFormat') || 'Định dạng ảnh không được hỗ trợ');
      return;
    }
    
    setAvatarError(''); // Clear error if validation passes
    
    // Save the file for later upload
    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare user data for API
    const userData = {
      name: editForm.name,
      email: user?.email, // Keep original email
      phone: editForm.phone,
      dob: editForm.dob,
      gender: editForm.gender,
      address: editForm.address,
      avatarFile: avatarFile, // Include avatar file if selected
      currentAvatarUrl: user?.avatar // Provide current avatar so FE can reattach if no new file
    };

    // Clear previous errors
    setNameError('');
    setDobError('');
    setUpdateError('');
    
    // Real-time guard: name required
    const trimmedName = (userData.name || '').trim();
    if (!trimmedName) {
      const errorMsg = t('toast.name_required') || 'Tên là bắt buộc';
      setNameError(errorMsg);
      setUpdateError(errorMsg);
      return;
    }

    // Additional name validation for LOCAL users only
    if (!isSocialProvider) {
      const name = (userData.name || '').trim();
      // Must start with a letter; allow letters (including accents), spaces, and digits after the first letter; no special characters
      const nameRegex = /^[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ\s\d]*$/;
      if (!nameRegex.test(name)) {
        const errorMsg = t('profile.errors.invalidName') || 'Tên không hợp lệ';
        setNameError(errorMsg);
        setUpdateError(errorMsg);
        return;
      }
    }
    
    // Normalize DOB to ISO before validation
    const normalizedDob = parseDateFromDisplayToISO(userData.dob || '');
    // Only validate DOB if user entered something - allow empty DOB
    if (userData.dob && userData.dob.trim() && !normalizedDob) {
      const errorMsg = t('booking.errors.dobInvalidFormat') || 'Định dạng ngày sinh không hợp lệ';
      setDobError(errorMsg);
      setUpdateError(errorMsg);
      return;
    }
    // Prepare data for validation: use normalized DOB if available, otherwise empty
    const dataForValidation = {
      ...userData,
      dob: normalizedDob || ''
    };
    const validation = validateUserProfile(dataForValidation);
    if (!validation.isValid) {
      // Set field-level errors
      if (validation.errors.name) setNameError(validation.errors.name);
      if (validation.errors.dob) setDobError(validation.errors.dob);
      if (validation.errors.phone) setUpdateError(validation.errors.phone);
      if (validation.errors.email) setUpdateError(validation.errors.email);
      // Show first error as general error
      const firstError = Object.values(validation.errors)[0];
      if (firstError && !updateError) {
        setUpdateError(firstError);
      }
      return;
    }
    
    try {
      setIsUpdating(true);
      const token = getToken();
      
      if (!token) {
        throw new Error(t('profile.errors.tokenMissing'));
      }
      
      // Call API to update user profile with normalized DOB
      const result = await updateUserProfile({ ...userData, dob: normalizedDob || '' }, token);
      
      // Use avatar URL from backend response if available, otherwise keep current
      const newAvatarUrl = result?.avatar || user.avatar || '/default-avatar.png';
      
      // Fetch fresh user data from server after update using refreshUser
      try {
        const refreshedUser = await refreshUser();
        if (refreshedUser) {
          // refreshUser already updates the context, but we may need to merge avatar URL
          if (newAvatarUrl && newAvatarUrl !== refreshedUser.avatar) {
            const updatedUser = {
              ...refreshedUser,
              avatar: newAvatarUrl
            };
            updateUser(updatedUser);
          }
        } else {
          // Fallback to local update if refresh fails
          const updatedUser = {
            ...user,
            username: editForm.name,
            name: editForm.name,
            phone: editForm.phone,
            dob: normalizedDob || '',
            gender: editForm.gender,
            address: editForm.address,
            avatar: newAvatarUrl
          };
          updateUser(updatedUser);
        }
      } catch (fetchError) {
        console.error('Error fetching updated user data:', fetchError);
        // Fallback to local update if fetch fails
        const updatedUser = {
          ...user,
          username: editForm.name,
          name: editForm.name,
          phone: editForm.phone,
          dob: normalizedDob || '',
          gender: editForm.gender,
          address: editForm.address,
          avatar: newAvatarUrl
        };
        updateUser(updatedUser);
      }
      
      showSuccess(t('profile.toast.updateSuccess'));
      
      // Clear avatar file after successful update
      setAvatarFile(null);
      
      // Close modal immediately after successful update
      setIsEditModalOpen(false);
      
    } catch (error) {
      const errorMessage = error.message || t('profile.errors.updateFailed') || 'Cập nhật thông tin thất bại';
      setUpdateError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };


  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setShowLanguageDropdown(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className={styles['profile-info']}>
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>{t('profile.labels.fullName')}</label>
              <div className={`${styles['info-value']} ${!user?.username && !user?.name ? styles['empty'] : ''}`}>
                {user?.username || user?.name || notUpdatedLabel}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>{t('profile.labels.email')}</label>
              <div className={styles['info-value']}>
                {user?.email || notUpdatedLabel}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>{t('profile.labels.phone')}</label>
              <div className={`${styles['info-value']} ${!user?.phone ? styles['empty'] : ''}`}>
                {user?.phone || notUpdatedLabel}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>{t('profile.labels.dob')}</label>
              <div className={`${styles['info-value']} ${!user?.dob ? styles['empty'] : ''}`}>
                {formatDobForDisplay(user?.dob)}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>{t('profile.labels.gender')}</label>
              <div className={`${styles['info-value']} ${!user?.gender ? styles['empty'] : ''}`}>
                {formatGenderLabel(user?.gender)}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>{t('profile.labels.address')}</label>
              <div className={`${styles['info-value']} ${!user?.address ? styles['empty'] : ''}`}>
                {user?.address || notUpdatedLabel}
              </div>
            </div>
            
            {/* CCCD/CMND field removed from profile view */}
          </div>
        );

      
      
      case 'settings':
        return (
          <div className={styles['profile-info']}>
            {/* Language Selector */}
            <div className={styles['setting-group']}>
              <label className={styles['info-label']}>{t('profile.settings.language')}</label>
              <div className={`${styles['dropdown-container']} ${styles['language-dropdown']}`}>
                <button 
                  className={styles['setting-dropdown']}
                  onClick={() => {
                    setShowLanguageDropdown(!showLanguageDropdown);
                    setShowThemeDropdown(false);
                  }}
                >
                  <img 
                    src={`/${getFlagFileName(i18n.language)}.png`} 
                    alt={getLanguageName(i18n.language)} 
                    className={styles['flag-icon']}
                  />
                  <span>{getLanguageName(i18n.language)}</span>
                  <ChevronDownIcon className={styles['chevron-icon']} />
                </button>
                {showLanguageDropdown && (
                  <div className={styles['dropdown-menu']}>
                    <button 
                      className={`${styles['dropdown-option']} ${i18n.language === 'vi' ? styles['active'] : ''}`}
                      onClick={() => changeLanguage('vi')}
                    >
                      <img src="/VN.png" alt={getLanguageName('vi')} className={styles['flag-icon']} />
                      <span>{getLanguageName('vi')}</span>
                    </button>
                    <button 
                      className={`${styles['dropdown-option']} ${i18n.language === 'en' ? styles['active'] : ''}`}
                      onClick={() => changeLanguage('en')}
                    >
                      <img src="/EN.png" alt={getLanguageName('en')} className={styles['flag-icon']} />
                      <span>{getLanguageName('en')}</span>
                    </button>
                    <button 
                      className={`${styles['dropdown-option']} ${i18n.language === 'ko' ? styles['active'] : ''}`}
                      onClick={() => changeLanguage('ko')}
                    >
                      <img src="/KR.png" alt={getLanguageName('ko')} className={styles['flag-icon']} />
                      <span>{getLanguageName('ko')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        );
      
      case 'changePassword':
        return (
          <div className={styles['profile-info']}>
            {isOAuthOnly ? (
              <div className={styles['info-group']}>
                <div className={`${styles['info-value']} ${styles['empty']}`}>
                  {t('profile.password.socialDisabled')}
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                <div className={styles['form-group']}>
                  <label htmlFor="currentPassword" className={styles['form-label']}>
                    {t('profile.password.current')}
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordInputChange}
                    className={styles['form-input']}
                  />
                  {passwordErrors.currentPassword && (
                    <div className={styles['field-hint']} style={{ color: '#e11d48' }}>
                      {passwordErrors.currentPassword}
                    </div>
                  )}
                </div>

                <div className={styles['form-group']}>
                  <label htmlFor="newPassword" className={styles['form-label']}>
                    {t('profile.password.new')}
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordInputChange}
                    className={styles['form-input']}
                  />
                  {passwordErrors.newPassword && (
                    <div className={styles['field-hint']} style={{ color: '#e11d48' }}>
                      {passwordErrors.newPassword}
                    </div>
                  )}
                </div>

                <div className={styles['form-group']}>
                  <label htmlFor="confirmNewPassword" className={styles['form-label']}>
                    {t('profile.password.confirm')}
                  </label>
                  <input
                    type="password"
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    value={passwordForm.confirmNewPassword}
                    onChange={handlePasswordInputChange}
                    className={styles['form-input']}
                  />
                  {passwordErrors.confirmNewPassword && (
                    <div className={styles['field-hint']} style={{ color: '#e11d48' }}>
                      {passwordErrors.confirmNewPassword}
                    </div>
                  )}
                </div>

                <div className={styles['form-actions']}>
                  <button
                    type="submit"
                    className={styles['btn-primary']}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? t('profile.password.processing') : t('profile.password.submit')}
                  </button>
                </div>
              </form>
            )}
          </div>
        );
      
      case 'favorites':
        return (
          <div className={styles['profile-info']}>
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>{t('profile.favorites.title')}</label>
              <div className={`${styles['info-value']} ${styles['empty']}`}>
                {t('profile.favorites.empty')}
              </div>
            </div>
          </div>
        );
      
      case 'payments':
        return (
          <div className={styles['profile-info']}>
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>{t('profile.payments.title')}</label>
              <div className={`${styles['info-value']} ${styles['empty']}`}>
                {t('profile.payments.empty')}
              </div>
            </div>
          </div>
        );
      
      case 'notifications':
        return (
          <div className={styles['profile-info']}>
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>{t('profile.notifications.email')}</label>
              <div className={styles['info-value']}>
                {t('profile.notifications.enabled')}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>{t('profile.notifications.push')}</label>
              <div className={styles['info-value']}>
                {t('profile.notifications.enabled')}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className={styles['user-profile-container']}>
        <div className={styles['user-profile-wrapper']}>
          <div className={styles['content-area']}>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('profile.loginRequired')}</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['user-profile-container']}>
      <div className={styles['user-profile-wrapper']}>
        {/* Sidebar */}
        <div className={styles['sidebar']}>
          <div className={styles['sidebar-header']}>
            <div className={styles['avatar-container']}>
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt="avatar" 
                  className={styles['avatar']} 
                />
              ) : (
                <img 
                  src="/default-avatar.png" 
                  alt="default avatar" 
                  className={styles['avatar']} 
                />
              )}
            </div>
             <h3 className={styles['user-name']}>{user.username || user.name}</h3>
             <p className={styles['user-email']}>{user.email}</p>
          </div>
          
          <ul className={styles['sidebar-menu']}>
            {sidebarMenuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.id} className={styles['menu-item']}>
                  <button
                    className={`${styles['menu-link']} ${activeTab === item.id ? styles['active'] : ''}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <IconComponent className={styles['menu-icon']} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Content Area */}
        <div className={styles['content-area']}>
          <div className={styles['content-header']}>
            <h1 className={styles['content-title']}>
              {sidebarMenuItems.find(item => item.id === activeTab)?.label}
            </h1>
            {activeTab === 'profile' && (
              <button
                className={styles['edit-button']}
                onClick={() => {
                  // Reset form to current user data when opening modal
                  setEditForm({
                    name: user?.username || user?.name || '',
                    phone: user?.phone || '',
                    dob: user?.dob ? formatDateFromNormalizedSafe(user.dob) : '',
                    gender: user?.gender || '',
                    address: user?.address || ''
                  });
                  // Set avatar preview to current user avatar
                  setAvatarPreview(user?.avatar || '/default-avatar.png');
                  setAvatarFile(null);
                  setIsEditModalOpen(true);
                }}
              >
                <PencilIcon className={styles['edit-icon']} />
                {t('profile.actions.edit')}
              </button>
            )}
          </div>
          
          {renderContent()}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setAvatarFile(null);
          // Reset form to current user data when closing modal
          setEditForm({
            name: user?.username || user?.name || '',
            phone: user?.phone || '',
            dob: user?.dob ? formatDateFromNormalizedSafe(user.dob) : '',
            gender: user?.gender || '',
            address: user?.address || '',
            cccd: user?.cccd || ''
          });
          // Reset avatar preview to current user avatar
          setAvatarPreview(user?.avatar || '/default-avatar.png');
        }}
        title={t('profile.editModalTitle')}
        size="lg"
      >
        {/* Success messages removed - only show toast notifications */}

        {updateError && (
          <div className={styles['field-hint']} style={{ color: '#e11d48', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem' }}>
            {updateError}
          </div>
        )}

        <form onSubmit={handleEditSubmit} className={styles['edit-form']}>
          <div className={styles['modal-card']}>
           <div className={styles['avatar-upload']}>
             {/* Show avatar preview (current or newly selected) */}
             {avatarPreview ? (
               <img 
                 src={avatarPreview} 
                 alt="avatar preview" 
                 className={styles['avatar-preview']} 
               />
             ) : (
               <img 
                 src="/default-avatar.png" 
                 alt="default avatar" 
                 className={styles['avatar-preview']} 
               />
             )}
             
              {/* All users can change avatar */}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                id="avatar-upload"
                className={styles['file-input']}
              />
              <label htmlFor="avatar-upload" className={styles['file-label']}>
                {t('profile.actions.chooseAvatar')}
              </label>
           </div>

            <div className={styles['fields-grid']}>
              <div className={styles['field-column']}>
                <div className={styles['form-group']}>
                  <div className={styles['label-with-icon']}>
                    <UserRound className={styles['label-icon']} />
                    <label htmlFor="name" className={styles['form-label']}>
                      {t('profile.labels.fullName')}
                    </label>
                  </div>
            <input
              type="text"
              id="name"
              name="name"
              value={editForm.name}
              onChange={handleNameChange}
              onBeforeInput={handleNameBeforeInput}
              onPaste={handleNamePaste}
              className={styles['form-input']}
            />
            {!!nameError && (
              <div className={styles['field-hint']} style={{ color: '#e11d48' }}>{nameError}</div>
            )}
          </div>

                <div className={styles['form-group']}>
                  <div className={styles['label-with-icon']}>
                    <Phone className={styles['label-icon']} />
                    <label htmlFor="phone" className={styles['form-label']}>
                      {t('profile.labels.phone')}
                    </label>
                  </div>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={editForm.phone}
              onChange={handleEditChange}
              className={styles['form-input']}
            />
          </div>

                <div className={styles['form-group']}>
                  <div className={styles['label-with-icon']}>
                    <GenderLabelIcon />
                    <label htmlFor="gender" className={styles['form-label']}>
                      {t('profile.labels.gender')}
                    </label>
                  </div>
                  <select
                    id="gender"
                    name="gender"
                    value={editForm.gender}
                    onChange={handleEditChange}
                    className={styles['form-select']}
                  >
                    <option value="">{t('profile.genderOptions.unknown')}</option>
                    <option value="M">{t('profile.genderOptions.male')}</option>
                    <option value="F">{t('profile.genderOptions.female')}</option>
                    <option value="O">{t('profile.genderOptions.other')}</option>
                  </select>
                </div>
              </div>

              <div className={styles['field-column']}>
                <div className={styles['form-group']}>
                  <div className={styles['label-with-icon']}>
                    <Mail className={styles['label-icon']} />
                    <label htmlFor="email" className={styles['form-label']}>
                      {t('profile.labels.email')}
                    </label>
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={user?.email || ''}
                    readOnly
                    className={`${styles['form-input']} ${styles['readonly-input']}`}
                  />
                </div>

                <div className={styles['form-group']}>
                  <div className={styles['label-with-icon']}>
                    <Calendar className={styles['label-icon']} />
                    <label htmlFor="dob" className={styles['form-label']}>
                      {t('profile.labels.dob')}
                    </label>
                  </div>
            <div className={styles['date-input-container']}>
              <input
                type="text"
                id="dob"
                name="dob"
                value={editForm.dob}
                onFocus={() => setEditingFields(prev => new Set(prev).add('dob'))}
                onChange={(e) => {
                  const raw = e.target.value;
                  const formatted = formatDobInputOnType(raw);
                  setEditForm(prev => ({ ...prev, dob: formatted }));
                  if (formatted.split(getDateSeparator()).join('').length >= 6) {
                    validateDob(formatted);
                  } else {
                    setDobError('');
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Backspace') isDeletingRef.current = true; else if (e.key.length===1) isDeletingRef.current = false; if (e.key==='Enter') e.currentTarget.blur(); }}
                onBlur={(e) => {
                  setEditingFields(prev => { const s=new Set(prev); s.delete('dob'); return s; });
                  validateDob(e.target.value);
                }}
                className={`${styles['form-input']} ${styles['date-input']} ${dobError ? styles['error'] || '' : ''}`}
                placeholder={(() => { const sep=getDateSeparator(); return i18n.language==='ko' ? `YYYY${sep}MM${sep}DD` : (i18n.language==='vi'?`DD${sep}MM${sep}YYYY`:`MM${sep}DD${sep}YYYY`); })()}
                title={t('booking.step1.placeholders.dateFormat', { format: (()=>{ const sep=getDateSeparator(); return i18n.language==='ko' ? `YYYY${sep}MM${sep}DD` : (i18n.language==='vi'?`DD${sep}MM${sep}YYYY`:`MM${sep}DD${sep}YYYY`); })() })}
              />
              <div className={styles['date-picker-wrapper']}>
                <button
                  type="button"
                  className={styles['calendar-button']}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (datePickerRef.current) {
                      datePickerRef.current.focus?.();
                      datePickerRef.current.click?.();
                    }
                  }}
                title={t('profile.datePicker.open')}
                >
                  <Calendar className={styles['calendar-icon']} />
                </button>
                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, width: '1px', height: '1px', overflow: 'hidden' }}>
                  <DatePicker
                    ref={datePickerRef}
                    value={(() => {
                      if (!editForm.dob) return null;
                      const iso = parseDateFromDisplayToISO(editForm.dob);
                      return iso ? new Date(iso) : null;
                    })()}
                    onChange={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const iso = `${year}-${month}-${day}`;
                        const displayValue = formatDateFromNormalizedSafe(iso);
                        setEditForm(prev => ({ ...prev, dob: displayValue }));
                        setEditingFields(prev => { const s=new Set(prev); s.delete('dob'); return s; });
                        validateDob(displayValue);
                      }
                    }}
                    minDate={new Date('1900-01-01')}
                    maxDate={new Date()}
                    onFocus={() => {}}
                    onBlur={() => {}}
                    onClick={() => {}}
                  />
                </div>
              </div>
            </div>
            {dobError && (
              <div className={styles['field-hint']} style={{ color: '#e11d48' }}>{dobError}</div>
            )}
          </div>

                <div className={styles['form-group']}>
                  <div className={styles['label-with-icon']}>
                    <MapPin className={styles['label-icon']} />
                    <label htmlFor="address" className={styles['form-label']}>
                      {t('profile.labels.address')}
                    </label>
                  </div>
            <input
              type="text"
              id="address"
              name="address"
              value={editForm.address}
              onChange={handleEditChange}
              className={styles['form-input']}
              placeholder={t('profile.placeholders.addressOptional')}
            />
                </div>
              </div>
            </div>
          </div>

          <div className={styles['form-actions']}>
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setAvatarFile(null);
                // Reset form to current user data when canceling
                setEditForm({
                  name: user?.username || user?.name || '',
                  phone: user?.phone || '',
                  dob: user?.dob ? formatDateFromNormalizedSafe(user.dob) : '',
                  gender: user?.gender || '',
                  address: user?.address || ''
                });
                // Reset avatar preview to current user avatar
                setAvatarPreview(user?.avatar || '/default-avatar.png');
              }}
              className={styles['btn-secondary']}
              disabled={isUpdating}
            >
              {t('profile.actions.cancel')}
            </button>
            <button
              type="submit"
              className={styles['btn-primary']}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('profile.actions.updating')}
                </div>
              ) : (
                t('profile.actions.save')
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserProfile;

