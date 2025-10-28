import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { Modal } from '../../../components';
import { API_ENDPOINTS } from '../../../config/api';
import { updateUserProfile, validateUserProfile } from '../../../services/userService';
import { 
  PencilIcon, 
  EyeIcon, 
  UserIcon, 
  CogIcon, 
  ShieldCheckIcon,
  HeartIcon,
  CreditCardIcon,
  BellIcon,
  StarIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import styles from './UserProfile.module.css';

const UserProfile = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser, getToken } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showSuccess, showError } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.username || user?.name || '',
    phone: user?.phone || '',
    dob: user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : '',
    gender: user?.gender || '',
    cccd: user?.cccd || ''
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '/default-avatar.png');
  const [avatarFile, setAvatarFile] = useState(null);
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // All users can change avatar regardless of login method

  // Update editForm when user data changes (after successful update)
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user?.username || user?.name || '',
        phone: user?.phone || '',
        dob: user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : '',
        gender: user?.gender || '',
        cccd: user?.cccd || ''
      });
      // Only update avatarPreview if user.avatar has actually changed and no file is selected
      if (user.avatar !== avatarPreview && !avatarFile) {
        setAvatarPreview(user?.avatar || '/default-avatar.png');
      }
    }
  }, [user, avatarPreview, !!avatarFile]); // Use !!avatarFile to convert to boolean

  // Fetch premium status
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        setPremiumLoading(true);
        const token = getToken();
        if (!token) {
          console.log('No token available for premium status check');
          return;
        }

        const response = await fetch(API_ENDPOINTS.PREMIUM_STATUS, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Backend might return { result: { ... } } or direct object
          setPremiumStatus(data?.result || data);
        }
      } catch (error) {
        console.error('Error fetching premium status:', error);
      } finally {
        setPremiumLoading(false);
      }
    };

    if (user) {
      fetchPremiumStatus();
    }
  }, [user, getToken]);

  const sidebarMenuItems = [
    { id: 'profile', label: 'Thông tin cá nhân', icon: UserIcon },
    { id: 'premium', label: 'Premium', icon: StarIcon },
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
      cccd: editForm.cccd,
      avatarFile: avatarFile // Include avatar file if selected
    };
    
    // Validate user data
    const validation = validateUserProfile(userData);
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
      
      // Call API to update user profile
      const result = await updateUserProfile(userData, token);
      
      // Use avatar URL from backend response if available, otherwise keep current
      const newAvatarUrl = result?.avatar || user.avatar || '/default-avatar.png';
      
      // Update local user state with the response
      const updatedUser = {
        ...user,
        username: editForm.name, // Map name to username for backend compatibility
        name: editForm.name,
        phone: editForm.phone,
        dob: editForm.dob,
        gender: editForm.gender,
        cccd: editForm.cccd,
        avatar: newAvatarUrl
      };
      
      updateUser(updatedUser);
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
              <label className={styles['info-label']}>CCCD/CMND</label>
              <div className={`${styles['info-value']} ${!user?.cccd ? styles['empty'] : ''}`}>
                {user?.cccd || 'Chưa cập nhật'}
              </div>
            </div>
          </div>
        );

      case 'premium':
        return (
          <div className={styles['profile-info']}>
            <div className={styles['premium-status']}>
              <div className={styles['premium-header']}>
                <StarIcon className={styles['premium-icon']} />
                <h3>Premium Status</h3>
              </div>
              
              {premiumLoading ? (
                <div className={styles['loading']}>
                  <div className={styles['spinner']}></div>
                  <p>Đang tải thông tin premium...</p>
                </div>
              ) : premiumStatus?.isPremium ? (
                <div className={styles['premium-active']}>
                  <div className={styles['premium-badge']}>Active</div>
                  <div className={styles['premium-details']}>
                    <p><strong>Valid until:</strong> {new Date(premiumStatus.expirationDate).toLocaleDateString('vi-VN')}</p>
                    <p><strong>Status:</strong> Premium Member</p>
                  </div>
                </div>
              ) : (
                <div className={styles['premium-inactive']}>
                  <div className={styles['premium-badge-inactive']}>Inactive</div>
                  <div className={styles['premium-details']}>
                    <p>Bạn chưa có gói Premium. Nâng cấp để tận hưởng các tính năng đặc biệt!</p>
                  </div>
                </div>
              )}
            </div>
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
                    dob: user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : '',
                    gender: user?.gender || '',
                    cccd: user?.cccd || ''
                  });
                  // Keep current avatar, don't reset to default
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
            dob: user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : '',
            gender: user?.gender || '',
            cccd: user?.cccd || ''
          });
          // Keep current avatar, don't reset to default
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
              onChange={handleEditChange}
              className={styles['form-input']}
            />
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
            <input
              type="date"
              id="dob"
              name="dob"
              value={editForm.dob}
              onChange={handleEditChange}
              className={styles['form-input']}
            />
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
            <label htmlFor="cccd" className={styles['form-label']}>
              CCCD/CMND
            </label>
            <input
              type="text"
              id="cccd"
              name="cccd"
              value={editForm.cccd}
              onChange={handleEditChange}
              className={styles['form-input']}
            />
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
                  dob: user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : '',
                  gender: user?.gender || '',
                  cccd: user?.cccd || ''
                });
                // Keep current avatar, don't reset to default
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
