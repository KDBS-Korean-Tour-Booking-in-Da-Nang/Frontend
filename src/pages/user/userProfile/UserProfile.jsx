import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { Modal } from '../../../components';
import { updateUserProfile, validateUserProfile } from '../../../services/userService';
import { DatePicker } from 'react-rainbow-components';
import { Calendar } from 'lucide-react';
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
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import styles from './UserProfile.module.css';

const UserProfile = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser, getToken, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showSuccess, showError } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
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
  const isSocialProvider = (user?.authProvider === 'GOOGLE' || user?.authProvider === 'NAVER');
  const [nameError, setNameError] = useState('');
  const [dobError, setDobError] = useState('');
  const [editingFields, setEditingFields] = useState(new Set());
  const isDeletingRef = useRef(false);
  const datePickerRef = useRef(null); // Ref for DatePicker to trigger programmatically

  // All users can change avatar regardless of login method

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
      setDobError(t('profile.errors.mustBe13') || 'Bạn phải từ 13 tuổi trở lên');
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
    { id: 'profile', label: 'Thông tin cá nhân', icon: UserIcon },
    
    { id: 'settings', label: 'Cài đặt', icon: CogIcon },
    { id: 'security', label: 'Bảo mật', icon: ShieldCheckIcon },
    { id: 'favorites', label: 'Yêu thích', icon: HeartIcon },
    { id: 'payments', label: 'Thanh toán', icon: CreditCardIcon },
    { id: 'notifications', label: 'Thông báo', icon: BellIcon }
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
      setNameError(t('toast.name_required') || 'Không để trống tên');
    } else if (!isValidUsername(sanitized)) {
      setNameError('Tên không hợp lệ: không bắt đầu bằng số, không chứa ký tự đặc biệt.');
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
        setNameError(t('toast.name_required') || 'Không để trống tên');
      } else {
        setNameError('Tên không hợp lệ: không bắt đầu bằng số, không chứa ký tự đặc biệt.');
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
      showError('Kích thước ảnh không được vượt quá 5MB');
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      showError('Định dạng ảnh không được hỗ trợ (chỉ chấp nhận JPG, PNG, GIF, WebP)');
      return;
    }
    
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

    // Real-time guard: name required
    const trimmedName = (userData.name || '').trim();
    if (!trimmedName) {
      setNameError(t('toast.name_required') || 'Không để trống tên');
      showError('toast.name_required');
      return;
    }

    // Additional name validation for LOCAL users only
    if (!isSocialProvider) {
      const name = (userData.name || '').trim();
      // Must start with a letter; allow letters (including accents), spaces, and digits after the first letter; no special characters
      const nameRegex = /^[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ\s\d]*$/;
      if (!nameRegex.test(name)) {
        showError('Tên không hợp lệ: không bắt đầu bằng số, không chứa ký tự đặc biệt.');
        return;
      }
    }
    
    // Normalize DOB to ISO before validation
    const normalizedDob = parseDateFromDisplayToISO(userData.dob || '');
    // Only validate DOB if user entered something - allow empty DOB
    if (userData.dob && userData.dob.trim() && !normalizedDob) {
      showError(t('booking.errors.dobInvalidFormat') || 'Ngày sinh không hợp lệ');
      return;
    }
    // Prepare data for validation: use normalized DOB if available, otherwise empty
    const dataForValidation = {
      ...userData,
      dob: normalizedDob || ''
    };
    const validation = validateUserProfile(dataForValidation);
    if (!validation.isValid) {
      // Only show toast error, don't set updateError state
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
        throw new Error('Không tìm thấy token xác thực');
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
      
      showSuccess('Cập nhật thông tin thành công!');
      
      // Clear avatar file after successful update
      setAvatarFile(null);
      
      // Close modal immediately after successful update
      setIsEditModalOpen(false);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi cập nhật thông tin';
      // Only show toast error, don't set updateError state
      showError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  const getLanguageName = (lang) => {
    const languages = {
      'vi': 'Tiếng Việt',
      'en': 'English',
      'ko': '한국어'
    };
    return languages[lang] || 'Tiếng Việt';
  };

  const getFlagFileName = (lang) => {
    const flagMap = {
      'vi': 'VN',
      'en': 'EN',
      'ko': 'KR'
    };
    return flagMap[lang] || 'VN';
  };

  const getThemeName = (currentTheme) => {
    return currentTheme === 'light' ? 'Sáng' : 'Tối';
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setShowLanguageDropdown(false);
  };

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    setShowThemeDropdown(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className={styles['profile-info']}>
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Họ và tên</label>
              <div className={`${styles['info-value']} ${!user?.username && !user?.name ? styles['empty'] : ''}`}>
                {user?.username || user?.name || 'Chưa cập nhật'}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Email</label>
              <div className={styles['info-value']}>
                {user?.email || 'Chưa cập nhật'}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Số điện thoại</label>
              <div className={`${styles['info-value']} ${!user?.phone ? styles['empty'] : ''}`}>
                {user?.phone || 'Chưa cập nhật'}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Ngày sinh</label>
              <div className={`${styles['info-value']} ${!user?.dob ? styles['empty'] : ''}`}>
                {user?.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Giới tính</label>
              <div className={`${styles['info-value']} ${!user?.gender ? styles['empty'] : ''}`}>
                {user?.gender ? (user.gender === 'M' ? 'Nam' : user.gender === 'F' ? 'Nữ' : user.gender === 'O' ? 'Khác' : user.gender) : 'Chưa cập nhật'}
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Địa chỉ</label>
              <div className={`${styles['info-value']} ${!user?.address ? styles['empty'] : ''}`}>
                {user?.address || 'Chưa cập nhật'}
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
              <label className={styles['info-label']}>Ngôn ngữ</label>
              <div className={styles['dropdown-container']}>
                <button 
                  className={styles['setting-dropdown']}
                  onClick={() => {
                    setShowLanguageDropdown(!showLanguageDropdown);
                    setShowThemeDropdown(false);
                  }}
                >
                  <img 
                    src={`/${getFlagFileName(i18n.language)}.png`} 
                    alt={i18n.language} 
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
                      <img src="/VN.png" alt="VN" className={styles['flag-icon']} />
                      <span>Tiếng Việt</span>
                    </button>
                    <button 
                      className={`${styles['dropdown-option']} ${i18n.language === 'en' ? styles['active'] : ''}`}
                      onClick={() => changeLanguage('en')}
                    >
                      <img src="/EN.png" alt="EN" className={styles['flag-icon']} />
                      <span>English</span>
                    </button>
                    <button 
                      className={`${styles['dropdown-option']} ${i18n.language === 'ko' ? styles['active'] : ''}`}
                      onClick={() => changeLanguage('ko')}
                    >
                      <img src="/KR.png" alt="KR" className={styles['flag-icon']} />
                      <span>한국어</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Theme Selector */}
            <div className={styles['setting-group']}>
              <label className={styles['info-label']}>Chủ đề</label>
              <div className={styles['dropdown-container']}>
                <button 
                  className={styles['setting-dropdown']}
                  onClick={() => {
                    setShowThemeDropdown(!showThemeDropdown);
                    setShowLanguageDropdown(false);
                  }}
                >
                  {theme === 'light' ? (
                    <SunIcon className={styles['theme-icon']} />
                  ) : (
                    <MoonIcon className={styles['theme-icon']} />
                  )}
                  <span>{getThemeName(theme)}</span>
                  <ChevronDownIcon className={styles['chevron-icon']} />
                </button>
                {showThemeDropdown && (
                  <div className={styles['dropdown-menu']}>
                    <button 
                      className={`${styles['dropdown-option']} ${theme === 'light' ? styles['active'] : ''}`}
                      onClick={() => changeTheme('light')}
                    >
                      <SunIcon className={styles['theme-icon']} />
                      <span>Sáng</span>
                    </button>
                    <button 
                      className={`${styles['dropdown-option']} ${theme === 'dark' ? styles['active'] : ''}`}
                      onClick={() => changeTheme('dark')}
                    >
                      <MoonIcon className={styles['theme-icon']} />
                      <span>Tối</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className={styles['profile-info']}>
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Mật khẩu</label>
              <div className={styles['info-value']}>
                ••••••••
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Xác thực 2 bước</label>
              <div className={styles['info-value']}>
                Chưa bật
              </div>
            </div>
          </div>
        );
      
      case 'favorites':
        return (
          <div className={styles['profile-info']}>
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Tour yêu thích</label>
              <div className={styles['info-value']}>
                Chưa có tour yêu thích nào
              </div>
            </div>
          </div>
        );
      
      case 'payments':
        return (
          <div className={styles['profile-info']}>
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Phương thức thanh toán</label>
              <div className={styles['info-value']}>
                Chưa có phương thức thanh toán nào
              </div>
            </div>
          </div>
        );
      
      case 'notifications':
        return (
          <div className={styles['profile-info']}>
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Email thông báo</label>
              <div className={styles['info-value']}>
                Bật
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Thông báo đẩy</label>
              <div className={styles['info-value']}>
                Bật
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
                Chỉnh sửa
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
        title="Chỉnh sửa thông tin"
        size="lg"
      >
        {/* Success messages removed - only show toast notifications */}

        {/* Error messages removed - only show toast notifications */}

        <form onSubmit={handleEditSubmit} className="space-y-4">
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
                Chọn ảnh đại diện
              </label>
           </div>

          <div className={styles['form-group']}>
            <label htmlFor="name" className={styles['form-label']}>
              Họ tên
            </label>
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
            <label htmlFor="email" className={styles['form-label']}>
              Email
            </label>
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
            <label htmlFor="phone" className={styles['form-label']}>
              Số điện thoại
            </label>
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
            <label htmlFor="dob" className={styles['form-label']}>
              Ngày sinh
            </label>
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
                  // real-time: only validate when looks like complete
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
                    // Trigger the hidden DatePicker
                    if (datePickerRef.current) {
                      const input = datePickerRef.current.querySelector('input') || datePickerRef.current.querySelector('button');
                      if (input) {
                        input.focus();
                        input.click();
                      }
                    }
                  }}
                  title="Open date picker"
                >
                  <Calendar className={styles['calendar-icon']} />
                </button>
                <div ref={datePickerRef} style={{ position: 'absolute', left: '-9999px', opacity: 0, width: '1px', height: '1px', overflow: 'hidden' }}>
                  <DatePicker
                    value={(() => {
                      if (!editForm.dob) return null;
                      const iso = parseDateFromDisplayToISO(editForm.dob);
                      return iso ? new Date(iso) : null;
                    })()}
                    onChange={(date) => {
                      if (date) {
                        // Use local date components to avoid timezone issues
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
                  />
                </div>
              </div>
            </div>
            {dobError && (
              <div className={styles['field-hint']} style={{ color: '#e11d48' }}>{dobError}</div>
            )}
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="gender" className={styles['form-label']}>
              Giới tính
            </label>
            <select
              id="gender"
              name="gender"
              value={editForm.gender}
              onChange={handleEditChange}
              className={styles['form-select']}
            >
              <option value="">Chưa cập nhật</option>
              <option value="M">Nam</option>
              <option value="F">Nữ</option>
              <option value="O">Khác</option>
            </select>
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="address" className={styles['form-label']}>
              Địa chỉ
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={editForm.address}
              onChange={handleEditChange}
              className={styles['form-input']}
              placeholder="Nhập địa chỉ (không bắt buộc)"
            />
          </div>

          {/* Removed CCCD/CMND update field as requested */}

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
              Hủy
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
                  Đang cập nhật...
                </div>
              ) : (
                'Lưu thay đổi'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserProfile;

