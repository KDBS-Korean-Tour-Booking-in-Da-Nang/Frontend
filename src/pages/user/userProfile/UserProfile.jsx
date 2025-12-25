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
  const currentLanguage = i18n.language || 'vi';
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
  
  // Kiểm tra xem user có phải OAuth-only (không có mật khẩu thật) không từ localStorage
  // Logic: nếu user đăng nhập qua Google/Naver và chưa từng đặt mật khẩu thì ẩn form đổi mật khẩu
  const [isOAuthOnly, setIsOAuthOnly] = useState(() => {
    if (user?.email) {
      try {
        const oauthOnlyFlag = localStorage.getItem(`isOAuthOnly_${user.email}`);
        const hasPasswordFlag = localStorage.getItem(`hasPassword_${user.email}`);
        
        // Nếu được đánh dấu rõ ràng là OAuth-only, ẩn form
        if (oauthOnlyFlag === 'true') {
          return true;
        }
        
        // Nếu là social provider và không có flag hasPassword, giả định OAuth-only (ẩn form)
        // Xử lý trường hợp: user đăng nhập với Google lần đầu → không hiển thị form
        if (isSocialProvider && hasPasswordFlag !== 'true') {
          return true;
        }
        
        return false;
      } catch {
        // Nếu lỗi khi đọc localStorage, kiểm tra xem có phải social provider không
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

  // Simple role helper: treat explicit COMPANY role or roles array containing COMPANY as company user
  const isCompanyUser = !!(
    user?.role === 'COMPANY' ||
    user?.role === 'ROLE_COMPANY' ||
    (Array.isArray(user?.roles) && (user.roles.includes('COMPANY') || user.roles.includes('ROLE_COMPANY')))
  );

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

  // Block space character input in password
  const handlePasswordBeforeInput = (e) => {
    const { data } = e;
    if (data == null) return;
    if (data === ' ' || data === '\u00A0') {
      e.preventDefault();
    }
  };

  // Handle paste in password: remove spaces
  const handlePasswordPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const cleaned = pasted.replace(/\s/g, '');
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const current = target.value;
    const newValue = current.slice(0, start) + cleaned + current.slice(end);
    
    setPasswordForm((prev) => ({
      ...prev,
      [target.name]: newValue
    }));
    setPasswordErrors((prev) => ({
      ...prev,
      [target.name]: ''
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    // Remove all spaces from password fields
    const cleaned = value.replace(/\s/g, '');
    setPasswordForm((prev) => ({
      ...prev,
      [name]: cleaned
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
  const previousDobValueRef = useRef('');
  const datePickerRef = useRef(null);
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

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.email) {
        try {
          await refreshUser();
        } catch {
        }
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user?.username || user?.name || '',
        phone: user?.phone || '',
        dob: user?.dob ? formatDateFromNormalizedSafe(user.dob) : '',
        gender: user?.gender || '',
        address: user?.address || ''
      });
      if (!avatarFile) {
        setAvatarPreview(user?.avatar || '/default-avatar.png');
      }
    }
  }, [user, i18n.language]);

  const getDateSeparator = () => {
    switch (currentLanguage) {
      case 'vi': return '/';
      case 'en': return '/';
      case 'ko': return '.';
      default: return '/';
    }
  };

  // Format ngày từ giá trị đã normalized (ISO format) sang định dạng hiển thị theo ngôn ngữ
  // Hỗ trợ: vi (DD/MM/YYYY), en (MM/DD/YYYY), ko (YYYY.MM.DD)
  const formatDateFromNormalizedSafe = (val) => {
    try {
      let iso = '';
      // Nếu đã là ISO format (YYYY-MM-DD), dùng trực tiếp
      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) iso = val;
      // Nếu không, thử parse thành Date rồi chuyển sang ISO
      else if (val) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) iso = d.toISOString().slice(0, 10);
      }
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      const sep = getDateSeparator();
      // Format theo ngôn ngữ: ko (YYYY.MM.DD), vi (DD/MM/YYYY), en (MM/DD/YYYY)
      if (currentLanguage === 'ko') return `${y}${sep}${m}${sep}${d}`;
      if (currentLanguage === 'vi') return `${d}${sep}${m}${sep}${y}`;
      return `${m}${sep}${d}${sep}${y}`;
    } catch {
      return '';
    }
  };

  // Parse ngày từ định dạng hiển thị về ISO format (YYYY-MM-DD)
  // Hỗ trợ các định dạng: vi (DD/MM/YYYY), en (MM/DD/YYYY), ko (YYYY.MM.DD)
  const parseDateFromDisplay = (displayValue) => {
    if (!displayValue || displayValue.trim() === '') {
      return null;
    }

    const separator = getDateSeparator();
    const parts = displayValue.split(separator);
    
    // Phải có đúng 3 phần (ngày, tháng, năm)
    if (parts.length !== 3) {
      return null;
    }

    let day, month, year;
    
    // Parse theo định dạng của từng ngôn ngữ
    switch (currentLanguage) {
      case 'vi': // DD/MM/YYYY
        day = parts[0];
        month = parts[1];
        year = parts[2];
        break;
      case 'ko': // YYYY.MM.DD
        year = parts[0];
        month = parts[1];
        day = parts[2];
        break;
      default: // MM/DD/YYYY
        month = parts[0];
        day = parts[1];
        year = parts[2];
        break;
    }
    
    // Tạo Date object và chuyển sang ISO format
    const date = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  };

  const validateDateInput = (inputValue) => {
    if (!inputValue || inputValue.trim() === '') {
      return null;
    }

    const parsedDate = parseDateFromDisplay(inputValue);
    
    if (parsedDate) {
      return parsedDate;
    }
    
    return null;
  };

  // Validate ngày sinh: kiểm tra format và tính hợp lệ
  const validateDob = (displayValue) => {
    // Cho phép để trống (optional field)
    if (!displayValue || !displayValue.trim()) {
      setDobError('');
      return true;
    }

    // Parse và normalize ngày từ định dạng hiển thị
    const normalized = validateDateInput(displayValue);
    if (!normalized) {
      setDobError(t('booking.errors.dobInvalidFormat'));
      return false;
    }

    const birth = new Date(normalized);
    const today = new Date();
    if (birth.getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
      setDobError(t('booking.errors.dobInvalidFormat'));
      return false;
    }
    let age = today.getFullYear() - birth.getFullYear();
    const md = today.getMonth() - birth.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 13) {
      setDobError(t('profile.errors.mustBe13'));
      return false;
    }
    if (age < 0) {
      setDobError(t('booking.errors.dobInvalidFormat'));
      return false;
    }
    setDobError('');
    return true;
  };

  // Live DOB formatter when typing – logic synced with Step1Contact.formatDateInput
  const formatDobInput = (value, fieldKey) => {
    if (!value) return '';
    
    // Only allow numbers and separators
    const cleanValue = value.replace(/[^\d\/\.]/g, '');
    
    const separator = getDateSeparator();
    let parts = cleanValue.split(separator);
    
    const previousValue = previousDobValueRef.current;
    const isDeletingNow = cleanValue.length < previousValue.length;
    
    const isDeletingTrailingSeparator =
      previousValue.endsWith(separator) &&
      !cleanValue.endsWith(separator) &&
      cleanValue.length === previousValue.length - 1;
    
    const isDeletingLastSeparator =
      previousValue.endsWith(separator) &&
      !cleanValue.endsWith(separator) &&
      cleanValue.length === previousValue.length - 1 &&
      cleanValue.split(separator).every(part => part.length >= 2 || part === '');
    
    const isInDeletionMode = isDeletingRef.current;
    const shouldBeFormatted = previousValue.includes(separator) || cleanValue.includes(separator);
    const isDeletingFromFormatted =
      shouldBeFormatted &&       cleanValue.length <= previousValue.replace(/[\/\.]/g, '').length;
    
    previousDobValueRef.current = cleanValue;
    const isLeapYear = (year) =>
      (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

    const getDaysInMonth = (month, year) => {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if ([1, 3, 5, 7, 8, 10, 12].includes(m)) return 31;
      if ([4, 6, 9, 11].includes(m)) return 30;
      if (m === 2) return isLeapYear(y) ? 29 : 28;
      return 31;
    };

    const validateAndFormat = (day, month, year) => {
      const currentYear = new Date().getFullYear();
      const minYear = 1900;
      const maxYear = currentYear;

      if (year && year.length === 4) {
        let y = parseInt(year, 10);
        if (y < minYear) y = minYear;
        if (y > maxYear) y = maxYear;
        year = String(y);
      }

      if (month && month.length === 2) {
        let m = parseInt(month, 10);
        if (m < 1) m = 1;
        if (m > 12) m = 12;
        month = String(m).padStart(2, '0');
      }

      if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
        let d = parseInt(day, 10);
        const daysInMonth = getDaysInMonth(month, year);
        if (d < 1) d = 1;
        if (d > daysInMonth) d = daysInMonth;
        day = String(d).padStart(2, '0');
      }

      return { day, month, year };
    };

    if (isDeletingNow || isDeletingTrailingSeparator || isDeletingLastSeparator || isInDeletionMode || isDeletingFromFormatted) {
      isDeletingRef.current = true;
      return cleanValue;
    }

    if (isDeletingRef.current && !isDeletingNow && !isDeletingTrailingSeparator && !isDeletingLastSeparator && !isInDeletionMode && !isDeletingFromFormatted) {
      isDeletingRef.current = false;
    }

    if (isDeletingRef.current) return cleanValue;
    if (cleanValue === separator) return cleanValue;
    if (cleanValue.endsWith(separator)) return cleanValue;

    const hasEmptyParts = parts.some(part => part === '');
    if (hasEmptyParts) return cleanValue;

    const currentLanguage =
      i18n.language && i18n.language.startsWith('ko')
        ? 'ko'
        : i18n.language && i18n.language.startsWith('en')
        ? 'en'
        : 'vi';

    const hasIncompleteParts = parts.some(part => {
      if (currentLanguage === 'ko') {
        return part.length > 0 && (
          (part === parts[0] && part.length < 4) ||
          (part !== parts[0] && part.length < 2)
        );
      }
      return part.length > 0 && part.length < 2;
    });
    if (hasIncompleteParts) return cleanValue;

    switch (currentLanguage) {
      case 'vi': { // DD/MM/YYYY
        if (parts.length === 1) {
          let day = parts[0];
          if (day.length > 2) day = day.substring(0, 2);
          if (parseInt(day, 10) > 31) day = '31';
          if (parseInt(day, 10) > 3 && day.length === 1) day = '0' + day;
          if (day.length === 2 && parseInt(day, 10) > 3) return day + separator;
          return day;
        }
        if (parts.length === 2) {
          let day = parts[0];
          let month = parts[1];
          if (day.length > 2) day = day.substring(0, 2);
          if (parseInt(day, 10) > 31) day = '31';
          if (parseInt(day, 10) > 3 && day.length === 1) day = '0' + day;
          if (month.length > 2) month = month.substring(0, 2);
          if (parseInt(month, 10) > 12) month = '12';
          if (parseInt(month, 10) > 1 && month.length === 1) month = '0' + month;
          if (month === '') return day;
          if (month.length === 2 && parseInt(month, 10) > 1) return day + separator + month + separator;
          return day + separator + month;
        }
        if (parts.length === 3) {
          let day = parts[0];
          let month = parts[1];
          let year = parts[2];
          if (year === '') return day + separator + month;
          if (month === '') return day;
          if (year.length > 4) year = year.substring(0, 4);
          if (year.length === 4) {
            const validated = validateAndFormat(day, month, year);
            return `${validated.day}${separator}${validated.month}${separator}${validated.year}`;
          }
          return day + separator + month + separator + year;
        }
        break;
      }
      case 'en': { // MM/DD/YYYY
        if (parts.length === 1) {
          let month = parts[0];
          if (month.length > 2) month = month.substring(0, 2);
          if (parseInt(month, 10) > 12) month = '12';
          if (parseInt(month, 10) > 1 && month.length === 1) month = '0' + month;
          if (month.length === 2 && parseInt(month, 10) > 1) return month + separator;
          return month;
        }
        if (parts.length === 2) {
          let month = parts[0];
          let day = parts[1];
          if (month.length > 2) month = month.substring(0, 2);
          if (parseInt(month, 10) > 12) month = '12';
          if (parseInt(month, 10) > 1 && month.length === 1) month = '0' + month;
          if (day.length > 2) day = day.substring(0, 2);
          if (parseInt(day, 10) > 31) day = '31';
          if (parseInt(day, 10) > 3 && day.length === 1) day = '0' + day;
          if (day === '') return month;
          if (day.length === 2 && parseInt(day, 10) > 3) return month + separator + day + separator;
          return month + separator + day;
        }
        if (parts.length === 3) {
          let month = parts[0];
          let day = parts[1];
          let year = parts[2];
          if (year === '') return month + separator + day;
          if (day === '') return month;
          if (year.length > 4) year = year.substring(0, 4);
          if (year.length === 4) {
            const validated = validateAndFormat(day, month, year);
            return `${validated.month}${separator}${validated.day}${separator}${validated.year}`;
          }
          return month + separator + day + separator + year;
        }
        break;
      }
      case 'ko': { // YYYY.MM.DD
        if (parts.length === 1) {
          let year = parts[0];
          if (year.length > 4) year = year.substring(0, 4);
          if (year.length === 4) {
            const currentYear = new Date().getFullYear();
            let y = parseInt(year, 10);
            if (y > currentYear) y = currentYear;
            if (y < 1900) y = 1900;
            year = String(y);
          }
          if (year.length === 4) return year + separator;
          return year;
        }
        if (parts.length === 2) {
          let year = parts[0];
          let month = parts[1];
          if (year.length > 4) year = year.substring(0, 4);
          if (year.length === 4) {
            const currentYear = new Date().getFullYear();
            let y = parseInt(year, 10);
            if (y > currentYear) y = currentYear;
            if (y < 1900) y = 1900;
            year = String(y);
          }
          if (month.length > 2) month = month.substring(0, 2);
          if (parseInt(month, 10) > 12) month = '12';
          if (parseInt(month, 10) > 1 && month.length === 1) month = '0' + month;
          if (month === '') return year;
          if (month.length === 2 && parseInt(month, 10) > 1) return year + separator + month + separator;
          return year + separator + month;
        }
        if (parts.length === 3) {
          let year = parts[0];
          let month = parts[1];
          let day = parts[2];
          if (day === '') return year + separator + month;
          if (month === '') return year;
          if (year.length > 4) year = year.substring(0, 4);
          if (day.length > 2) day = day.substring(0, 2);
          if (parseInt(day, 10) > 31) day = '31';
          if (parseInt(day, 10) > 3 && day.length === 1) day = '0' + day;
          if (year.length === 4) {
            const validated = validateAndFormat(day, month, year);
            return `${validated.year}${separator}${validated.month}${separator}${validated.day}`;
          }
          return year + separator + month + separator + day;
        }
        break;
      }
      default:
        break;
    }

    return cleanValue;
  };

  // Determine if profile form has any changes compared to current user data
  const getUserProfileBaseline = () => ({
    name: user?.username || user?.name || '',
    phone: user?.phone || '',
    dob: user?.dob ? formatDateFromNormalizedSafe(user.dob) : '',
    gender: user?.gender || '',
    address: user?.address || ''
  });

  const hasProfileChanges = () => {
    if (!user) return false;
    const baseline = getUserProfileBaseline();
    if ((baseline.name || '') !== (editForm.name || '')) return true;
    if ((baseline.phone || '') !== (editForm.phone || '')) return true;
    if ((baseline.dob || '') !== (editForm.dob || '')) return true;
    if ((baseline.gender || '') !== (editForm.gender || '')) return true;
    if ((baseline.address || '') !== (editForm.address || '')) return true;
    if (avatarFile) return true;
    return false;
  };

  

  const sidebarMenuItems = [
    { id: 'profile', label: t('profile.sidebar.profile'), icon: UserIcon },
    { id: 'settings', label: t('profile.sidebar.settings'), icon: CogIcon },
    { id: 'changePassword', label: t('profile.sidebar.changePassword'), icon: ShieldCheckIcon }
  ];

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Chỉ cho phép số và dấu +
    const filteredValue = value.replace(/[^0-9+]/g, '');
    // Đảm bảo dấu + chỉ ở đầu
    const finalValue = filteredValue.includes('+') 
      ? '+' + filteredValue.replace(/\+/g, '') 
      : filteredValue;
    setEditForm(prev => ({
      ...prev,
      phone: finalValue
    }));
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    // Chỉ cho phép số và dấu +
    const filteredValue = paste.replace(/[^0-9+]/g, '');
    // Đảm bảo dấu + chỉ ở đầu
    const finalValue = filteredValue.includes('+') 
      ? '+' + filteredValue.replace(/\+/g, '') 
      : filteredValue;
    setEditForm(prev => ({
      ...prev,
      phone: finalValue
    }));
  };

  const isValidUsername = (val) => {
    if (val === undefined || val === null) return false;
    const trimmed = String(val).normalize('NFC').trim();
    if (trimmed.length === 0) return false;
    const usernameRegex = /^\p{L}[\p{L}\p{M}\p{N}\s]*$/u;
    return usernameRegex.test(trimmed);
  };

  const sanitizeUsername = (val) => {
    const str = String(val || '').normalize('NFC');
    let cleaned = str.replace(/[^\p{L}\p{M}\p{N}\s]/gu, '');
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
    
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      setAvatarError(t('profile.errors.avatarSize') || 'Kích thước ảnh không được vượt quá 5MB');
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      setAvatarError(t('profile.errors.avatarFormat') || 'Định dạng ảnh không được hỗ trợ');
      return;
    }
    
    setAvatarError('');
    setAvatarFile(file);
    
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    const userData = {
      name: editForm.name,
      email: user?.email, // Keep original email
      phone: editForm.phone,
      dob: editForm.dob,
      gender: editForm.gender,
      address: editForm.address,
      avatarFile: avatarFile,
      currentAvatarUrl: user?.avatar
    };

    setNameError('');
    setDobError('');
    setUpdateError('');
    
    const trimmedName = (userData.name || '').trim();
    if (!trimmedName) {
      const errorMsg = t('toast.name_required') || 'Tên là bắt buộc';
      setNameError(errorMsg);
      setUpdateError(errorMsg);
      return;
    }

    if (!isSocialProvider) {
      const name = (userData.name || '').trim();
      const nameRegex = /^[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ\s\d]*$/;
      if (!nameRegex.test(name)) {
        const errorMsg = t('profile.errors.invalidName') || 'Tên không hợp lệ';
        setNameError(errorMsg);
        setUpdateError(errorMsg);
        return;
      }
    }
    
    const normalizedDob = validateDateInput(userData.dob || '');
    if (userData.dob && userData.dob.trim() && !normalizedDob) {
      const errorMsg = t('booking.errors.dobInvalidFormat') || 'Định dạng ngày sinh không hợp lệ';
      setDobError(errorMsg);
      setUpdateError(errorMsg);
      return;
    }
    const dataForValidation = {
      ...userData,
      dob: normalizedDob || ''
    };
    const validation = validateUserProfile(dataForValidation, t);
    if (!validation.isValid) {
      if (validation.errors.name) setNameError(validation.errors.name);
      if (validation.errors.dob) setDobError(validation.errors.dob);
      if (validation.errors.phone) setUpdateError(validation.errors.phone);
      if (validation.errors.email) setUpdateError(validation.errors.email);
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
      
      const result = await updateUserProfile({ ...userData, dob: normalizedDob || '' }, token);
      
      const newAvatarUrl = result?.avatar || user.avatar || '/default-avatar.png';
      
      try {
        const refreshedUser = await refreshUser();
        if (refreshedUser) {
          if (newAvatarUrl && newAvatarUrl !== refreshedUser.avatar) {
            const updatedUser = {
              ...refreshedUser,
              avatar: newAvatarUrl
            };
            updateUser(updatedUser);
          }
        } else {
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
      } catch {
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
      
      setAvatarFile(null);
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
                    {isCompanyUser && (
                      <button 
                        className={`${styles['dropdown-option']} ${i18n.language === 'vi' ? styles['active'] : ''}`}
                        onClick={() => changeLanguage('vi')}
                      >
                        <img src="/VN.png" alt={getLanguageName('vi')} className={styles['flag-icon']} />
                        <span>{getLanguageName('vi')}</span>
                      </button>
                    )}
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
                    onBeforeInput={handlePasswordBeforeInput}
                    onPaste={handlePasswordPaste}
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
                    onBeforeInput={handlePasswordBeforeInput}
                    onPaste={handlePasswordPaste}
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
                    onBeforeInput={handlePasswordBeforeInput}
                    onPaste={handlePasswordPaste}
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

        <div className={styles['content-area']}>
          <div className={styles['content-header']}>
            <h1 className={styles['content-title']}>
              {sidebarMenuItems.find(item => item.id === activeTab)?.label}
            </h1>
            {activeTab === 'profile' && (
              <button
                className={styles['edit-button']}
                onClick={() => {
                  setEditForm({
                    name: user?.username || user?.name || '',
                    phone: user?.phone || '',
                    dob: user?.dob ? formatDateFromNormalizedSafe(user.dob) : '',
                    gender: user?.gender || '',
                    address: user?.address || ''
                  });
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

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setAvatarFile(null);
          setEditForm({
            name: user?.username || user?.name || '',
            phone: user?.phone || '',
            dob: user?.dob ? formatDateFromNormalizedSafe(user.dob) : '',
            gender: user?.gender || '',
            address: user?.address || '',
            cccd: user?.cccd || ''
          });
          setAvatarPreview(user?.avatar || '/default-avatar.png');
        }}
        title={t('profile.editModalTitle')}
        size="lg"
      >
        {updateError && (
          <div className={styles['field-hint']} style={{ color: '#e11d48', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem' }}>
            {updateError}
          </div>
        )}

        <form onSubmit={handleEditSubmit} className={styles['edit-form']}>
          <div className={styles['modal-card']}>
           <div className={styles['avatar-upload']}>
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
              onChange={handlePhoneChange}
              onPaste={handlePhonePaste}
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
                  const clean = raw.replace(/[^\d\/\.]/g, '');
                  const formatted = formatDobInput(clean, 'dob');
                  setEditForm(prev => ({ ...prev, dob: formatted }));
                  const digitsCount = formatted.replace(/[^\d]/g, '').length;
                  if (digitsCount >= 6) {
                    validateDob(formatted);
                  } else {
                    setDobError('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace') {
                    isDeletingRef.current = true;
                  } else if (e.key.length === 1) {
                    isDeletingRef.current = false;
                  }
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
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
                      const iso = validateDateInput(editForm.dob || '');
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
                setEditForm({
                  name: user?.username || user?.name || '',
                  phone: user?.phone || '',
                  dob: user?.dob ? formatDateFromNormalizedSafe(user.dob) : '',
                  gender: user?.gender || '',
                  address: user?.address || ''
                });
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
              disabled={isUpdating || !hasProfileChanges()}
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

