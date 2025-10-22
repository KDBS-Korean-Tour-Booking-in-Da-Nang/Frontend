import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  StarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import styles from './Navbar.module.css';
import PremiumModal from '../../../pages/user/premium/PremiumModal';
import NotificationDropdown from '../../NotificationDropdown';
import ChatBox from '../../ChatBox';
import { API_ENDPOINTS } from '../../../config/api';

const Navbar = () => {
  const { user, logout, getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const toggleNotification = () => {
    setIsNotificationOpen(!isNotificationOpen);
    // Don't close chat when opening notification
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    // Don't close notification when opening chat
  };

  // Fetch premium status
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      // Skip premium check for STAFF and ADMIN roles
      if (user && (user.role === 'STAFF' || user.role === 'ADMIN')) {
        console.log('Skipping premium check for staff/admin user');
        return;
      }

      try {
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
          // Backend trả về format: { message: "...", result: { isPremium: true/false, expirationDate: "..." } }
          setPremiumStatus(data.result);
        } else {
          console.error('Failed to fetch premium status:', response.status);
        }
      } catch (error) {
        console.error('Error fetching premium status:', error);
      }
    };

    if (user) {
      fetchPremiumStatus();
    }
  }, [user, getToken]);

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show navbar when at top
      if (currentScrollY < 10) {
        setIsVisible(true);
        setIsScrolled(false);
      } else {
        setIsScrolled(true);

        // Hide navbar when scrolling down, show when scrolling up
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Check if current path is active
  const isActive = (path) => {
    if (path === '/tour') {
      // For tour, also check if we're on tour detail page
      return location.pathname === '/tour' || location.pathname.startsWith('/tour/');
    }
    if (path === '/news') {
      // For news, also check if we're on news detail page
      return location.pathname === '/news' || location.pathname.startsWith('/news/');
    }
    return location.pathname === path;
  };

  return (
    <>
      <nav className={`${styles.navbar} ${!isVisible ? styles.hidden : ''} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles['navbar-container']}>
          {/* Logo Section */}
          <div className={styles['logo-section']}>
            <Link to="/" className={styles['logo-section']}>
              <img
                src="/logoKDBS.png"
                alt="KDBS Logo"
                className={styles.logo}
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className={styles['nav-links']} style={{ overflow: 'visible' }}>
            <Link
              to="/"
              className={`${styles['nav-link']} ${isActive('/') ? styles.active : ''}`}
            >
              {t('nav.home')}
            </Link>

            <Link
              to="/forum"
              className={`${styles['nav-link']} ${isActive('/forum') ? styles.active : ''}`}
            >
              {t('nav.forum')}
            </Link>

            <Link
              to="/tour"
              className={`${styles['nav-link']} ${isActive('/tour') ? styles.active : ''}`}
            >
              {t('nav.tourBooking')}
            </Link>

            <Link
              to="/news"
              className={`${styles['nav-link']} ${isActive('/news') ? styles.active : ''}`}
            >
              {t('nav.news')}
            </Link>
          </div>

          {/* Right Section */}
          <div className={styles['right-section']}>
            {user ? (
              <>
                {/* Notifications */}
                <div className={`${styles['notification-icon']} ${styles['notification-container']}`}>
                  <button 
                    className={styles['notification-button']}
                    onClick={toggleNotification}
                    data-notification-button
                  >
                    <BellIcon />
                    <span className={styles['notification-badge']}>3</span>
                  </button>
                  <NotificationDropdown 
                    isOpen={isNotificationOpen} 
                    onClose={() => setIsNotificationOpen(false)} 
                  />
                </div>

                {/* Messages */}
                <div className={styles['notification-icon']}>
                  <button 
                    className={styles['notification-button']}
                    onClick={toggleChat}
                    data-chat-button
                  >
                    <ChatBubbleLeftRightIcon />
                    <span className={styles['notification-badge']}>1</span>
                  </button>
                </div>

                {/* Balance */}
                <div className={styles['balance-container']}>
                  <span className={styles['balance-amount']}>10.000</span>
                  <button className={styles['balance-add']}>
                    <PlusIcon />
                  </button>
                </div>

                {/* User Profile */}
                <div className={styles['user-profile']}>
                  {user.avatar ? (
                    <img src={user.avatar} alt="avatar" className={styles['user-avatar']} />
                  ) : (
                    <div className={styles['user-avatar-placeholder']}>
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={styles['user-dropdown']}>▼</div>

                  {/* Dropdown Menu */}
                  <div className={styles['dropdown-menu']}>
                    <div className={styles['dropdown-header']}>
                      {user.avatar ? (
                        <img src={user.avatar} alt="avatar" className={styles['dropdown-avatar']} />
                      ) : (
                        <div className={styles['dropdown-avatar-placeholder']}>
                          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={styles['dropdown-user-info']}>
                        <div className={styles['user-info-row']}>
                          <h4>{user.name || user.email}</h4>
                          <button 
                            className={`${styles['premium-icon']} ${premiumStatus?.isPremium ? styles['premium-active'] : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsPremiumModalOpen(true);
                            }}
                            title={premiumStatus?.isPremium ? t('premium.title') : t('premium.title')}
                          >
                            <StarIcon />
                          </button>
                        </div>
                        <p>{t(`profileRole.${user.role || 'USER'}`, user.role ? undefined : {})} {premiumStatus?.isPremium && <span className={styles['premium-badge']}>{t('premium.title')}</span>}</p>
                      </div>
                    </div>

                    {user.role === 'COMPANY' && (
                      <Link to="/business/dashboard" className={styles['dropdown-item']}>
                        <BuildingOfficeIcon className="w-4 h-4" />
                        {t('nav.dashboard')}
                      </Link>
                    )}
                    <Link to="/profile" className={styles['dropdown-item']}>
                      {t('nav.profileFull')}
                    </Link>
                    <Link to="/business-info" className={styles['dropdown-item']}>
                      {t('nav.businessInfo')}
                    </Link>
                    <button onClick={handleLogout} className={`${styles['dropdown-item']} ${styles.logout}`}>
                      {t('nav.logout')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className={`${styles['login-button']} ${isActive('/login') ? styles['login-active'] : ''}`}
                >
                  {t('nav.login')}
                </Link>
                <Link 
                  to="/register" 
                  className={`${styles['register-button']} ${isActive('/register') ? styles['register-active'] : ''}`}
                >
                  {t('nav.register')}
                </Link>
              </>
            )}

            {/* Language Switcher */}
            <div className={styles['language-switcher']}>
              <button className={styles['language-button']}>
                {i18n.language === 'vi' && <img src="/VN.png" alt="Vietnam" className={styles['language-flag']} />}
                {i18n.language === 'en' && <img src="/EN.png" alt="English" className={styles['language-flag']} />}
                {i18n.language === 'ko' && <img src="/KR.png" alt="Korean" className={styles['language-flag']} />}
                {!i18n.language && <img src="/VN.png" alt="Vietnam" className={styles['language-flag']} />}
              </button>
              <div className={styles['language-dropdown']}>
                <button onClick={() => changeLanguage('vi')} className={`${styles['language-option']} ${i18n.language === 'vi' ? 'active ' + styles['active'] : ''}`}>
                  <img src="/VN.png" alt="Vietnam" className={styles['language-flag']} />
                  <span className={styles['language-text']}>{t('lang.vi')}</span>
                </button>
                <button onClick={() => changeLanguage('en')} className={`${styles['language-option']} ${i18n.language === 'en' ? 'active ' + styles['active'] : ''}`}>
                  <img src="/EN.png" alt="English" className={styles['language-flag']} />
                  <span className={styles['language-text']}>{t('lang.en')}</span>
                </button>
                <button onClick={() => changeLanguage('ko')} className={`${styles['language-option']} ${i18n.language === 'ko' ? 'active ' + styles['active'] : ''}`}>
                  <img src="/KR.png" alt="Korean" className={styles['language-flag']} />
                  <span className={styles['language-text']}>{t('lang.ko')}</span>
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={styles['mobile-menu-button']}
            >
              {isMenuOpen ? <XMarkIcon /> : <Bars3Icon />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className={`${styles['mobile-menu']} ${isMenuOpen ? styles.open : ''}`}>
        <div className={styles['mobile-nav-links']}>
          <Link
            to="/"
            className={`${styles['mobile-nav-link']} ${isActive('/') ? styles.active : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.home')}
          </Link>

          <Link
            to="/forum"
            className={`${styles['mobile-nav-link']} ${isActive('/forum') ? styles.active : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.forum')}
          </Link>

          <Link
            to="/tour"
            className={`${styles['mobile-nav-link']} ${isActive('/tour') ? styles.active : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.tourBooking')}
          </Link>

          <Link
            to="/news"
            className={`${styles['mobile-nav-link']} ${isActive('/news') ? styles.active : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.news')}
          </Link>

          {user && (
            <div className={styles['mobile-user-section']}>
              <div className={styles['mobile-user-info']}>
                <div className={styles['mobile-user-name']}>{user.name || user.email}</div>
                <div className={styles['mobile-user-role']}>{user.role}</div>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className={styles['mobile-logout']}
              >
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Box */}
      <ChatBox 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />

      {/* Premium Modal */}
      <PremiumModal 
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />
    </>
  );
};

export default Navbar; 