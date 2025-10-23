import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { Modal } from '../../../components';
import { API_ENDPOINTS } from '../../../config/api';
import { 
  PencilIcon, 
  EyeIcon, 
  UserIcon, 
  CogIcon, 
  ShieldCheckIcon,
  HeartIcon,
  CreditCardIcon,
  BellIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import styles from './UserProfile.module.css';

const UserProfile = () => {
  const { t } = useTranslation();
  const { user, updateUser, getToken } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [editForm, setEditForm] = useState({
    name: user?.username || user?.name || '',
    phone: user?.phone || '',
    dob: user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : '',
    gender: user?.gender || '',
    cccd: user?.cccd || ''
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [premiumLoading, setPremiumLoading] = useState(false);

  // Check if user logged in via OAuth (Google/Naver)
  // Multiple detection methods for OAuth
  const userProvider = user?.provider || user?.authProvider || user?.loginProvider || user?.oauthProvider;
  const hasGoogleAvatar = user?.avatar && (user.avatar.includes('googleusercontent.com') || user.avatar.includes('googleapis.com'));
  const hasNaverAvatar = user?.avatar && user.avatar.includes('naver.com');
  
  // Check if user has OAuth-style avatar (external URL)
  const hasExternalAvatar = user?.avatar && (user.avatar.startsWith('http') && !user.avatar.includes('localhost'));
  
  // OAuth detection logic
  const isOAuthByProvider = userProvider && (
    userProvider.toLowerCase().includes('google') || 
    userProvider.toLowerCase().includes('naver') ||
    userProvider.toLowerCase().includes('oauth')
  );
  
  const isOAuthByAvatar = hasGoogleAvatar || hasNaverAvatar || hasExternalAvatar;
  
  // Force OAuth detection if user has external avatar (Google/Naver style)
  const forceOAuthDetection = user?.avatar && (
    user.avatar.includes('googleusercontent.com') || 
    user.avatar.includes('googleapis.com') ||
    user.avatar.includes('naver.com') ||
    (user.avatar.startsWith('https://') && !user.avatar.includes('localhost'))
  );
  
  // Final OAuth check - if either provider or avatar indicates OAuth
  const finalIsOAuthUser = isOAuthByProvider || isOAuthByAvatar || forceOAuthDetection;
  const finalIsGoogleUser = (userProvider && userProvider.toLowerCase().includes('google')) || hasGoogleAvatar || (user?.avatar && user.avatar.includes('google'));
  const finalIsNaverUser = (userProvider && userProvider.toLowerCase().includes('naver')) || hasNaverAvatar || (user?.avatar && user.avatar.includes('naver'));
  
  // Debug: Log user info to console
  console.log('=== USER PROFILE DEBUG ===');
  console.log('User object:', user);
  console.log('User provider:', userProvider);
  console.log('User avatar:', user?.avatar);
  console.log('Has Google avatar:', hasGoogleAvatar);
  console.log('Has Naver avatar:', hasNaverAvatar);
  console.log('Has external avatar:', hasExternalAvatar);
  console.log('Force OAuth detection:', forceOAuthDetection);
  console.log('Is OAuth by provider:', isOAuthByProvider);
  console.log('Is OAuth by avatar:', isOAuthByAvatar);
  console.log('Final is OAuth user:', finalIsOAuthUser);
  console.log('Final is Google user:', finalIsGoogleUser);
  console.log('Final is Naver user:', finalIsNaverUser);
  console.log('========================');

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
    
    // Save the file for later upload
    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updatedUser = {
      ...user,
      ...editForm,
      avatar: avatarPreview
    };
    updateUser(updatedUser);
    setIsEditModalOpen(false);
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
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
                {user?.gender || 'Chưa cập nhật'}
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
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Ngôn ngữ</label>
              <div className={styles['info-value']}>
                Tiếng Việt
              </div>
            </div>
            
            <div className={styles['info-group']}>
              <label className={styles['info-label']}>Chủ đề</label>
              <div className={styles['info-value']}>
                Sáng
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
                <div className={styles['avatar-placeholder']}>
                  {getInitials(user.username || user.name)}
                </div>
              )}
            </div>
            <h3 className={styles['user-name']}>{user.username || user.name}</h3>
            <p className={styles['user-email']}>{user.email}</p>
            {finalIsOAuthUser && (
              <p className={styles['oauth-provider']}>
                Đăng nhập qua {finalIsGoogleUser ? 'Google' : 'Naver'}
              </p>
            )}
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
                onClick={() => setIsEditModalOpen(true)}
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
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa thông tin"
        size="lg"
      >
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
               <div className={styles['avatar-preview-placeholder']}>
                 {getInitials(editForm.name)}
               </div>
             )}
             
             {/* OAuth users cannot change avatar */}
             {finalIsOAuthUser ? (
               <div className={styles['oauth-avatar-info']}>
                 <div className={styles['oauth-avatar-badge']}>
                   {finalIsGoogleUser && (
                     <div className={styles['google-badge']}>
                       <svg width="20" height="20" viewBox="0 0 24 24">
                         <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                         <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                         <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                         <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                       </svg>
                     </div>
                   )}
                   {finalIsNaverUser && (
                     <div className={styles['naver-badge']}>
                       <svg width="20" height="20" viewBox="0 0 24 24">
                         <path fill="#03C75A" d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845Z"/>
                       </svg>
                     </div>
                   )}
                 </div>
                 <p className={styles['oauth-avatar-text']}>
                   Ảnh đại diện được đồng bộ từ {finalIsGoogleUser ? 'Google' : 'Naver'}
                 </p>
                 <p className={styles['oauth-avatar-note']}>
                   Để thay đổi ảnh đại diện, vui lòng cập nhật trên {finalIsGoogleUser ? 'Google' : 'Naver'}
                 </p>
               </div>
             ) : (
               <>
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
               </>
             )}
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
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
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
              onClick={() => setIsEditModalOpen(false)}
              className={styles['btn-secondary']}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={styles['btn-primary']}
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserProfile;
