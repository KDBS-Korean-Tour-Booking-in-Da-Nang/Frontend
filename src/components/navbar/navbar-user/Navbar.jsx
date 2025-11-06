import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useChat } from '../../../contexts/ChatContext';
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
import NotificationDropdown from '../../NotificationDropdown';
import ChatBox from '../../ChatBox';
import ChatDropdown from '../../ChatDropdown';
import WebSocketStatus from '../../WebSocketStatus';
import { useNotifications } from '../../../contexts/NotificationContext';
import websocketService from '../../../services/websocketService';
 

const Navbar = () => {
  const { user, logout, getToken } = useAuth();
  const { unreadCount, fetchList } = useNotifications();
  const fetchListRef = useRef(fetchList);
  useEffect(() => { fetchListRef.current = fetchList; }, [fetchList]);
  
  // Add error boundary for chat context
  let chatState, chatActions;
  try {
    const chatContext = useChat();
    chatState = chatContext.state;
    chatActions = chatContext.actions;
  } catch (error) {
    console.warn('Chat context not available:', error.message);
    // Provide fallback values
    chatState = { isChatDropdownOpen: false, isChatBoxOpen: false };
    chatActions = { 
      toggleChatDropdown: () => {}, 
      closeChatDropdown: () => {},
      closeChatBox: () => {}
    };
  }
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const toggleNotification = () => {
    if (isCompanyPending) {
      navigate('/company-info');
      return;
    }
    setIsNotificationOpen(!isNotificationOpen);
    // Don't close chat when opening notification
  };

  const toggleChat = () => {
    if (isCompanyPending) {
      navigate('/company-info');
      return;
    }
    chatActions.toggleChatDropdown();
    // Don't close notification when opening chat
  };

  

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

  // Notification WS subscriptions are managed centrally by NotificationProvider

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

  const isCompanyPending = (user && (user.role === 'COMPANY' || user.role === 'BUSINESS') && user.status === 'COMPANY_PENDING');
  const isLockedToCompanyInfo = isCompanyPending;

  const disableIfPending = (e) => {
    if (isCompanyPending) {
      e.preventDefault();
      e.stopPropagation();
      navigate('/company-info');
    }
  };

  const disabledClass = isLockedToCompanyInfo ? ' cursor-not-allowed opacity-50' : '';

  return (
    <>
      <nav className={`${styles.navbar} ${!isVisible ? styles.hidden : ''} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles['navbar-container']}>
          {/* Logo Section */}
          <div className={styles['logo-section']}>
            {isLockedToCompanyInfo ? (
              <Link to="/company-info" className={styles['logo-section']} onClick={(e) => { e.stopPropagation(); }}>
                <img
                  src="/logoKDBS.png"
                  alt="KDBS Logo"
                  className={styles.logo}
                />
              </Link>
            ) : (
              <Link to="/" className={styles['logo-section']}>
                <img
                  src="/logoKDBS.png"
                  alt="KDBS Logo"
                  className={styles.logo}
                />
              </Link>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className={styles['nav-links']} style={{ overflow: 'visible' }}>
            {isLockedToCompanyInfo ? (
              // Render disabled lookalike links that redirect to company-info
              <>
                <a href="#" onClick={disableIfPending} className={`${styles['nav-link']}${disabledClass}`}>{t('nav.home')}</a>
                <a href="#" onClick={disableIfPending} className={`${styles['nav-link']}${disabledClass}`}>{t('nav.forum')}</a>
                <a href="#" onClick={disableIfPending} className={`${styles['nav-link']}${disabledClass}`}>{t('nav.tourBooking')}</a>
                <a href="#" onClick={disableIfPending} className={`${styles['nav-link']}${disabledClass}`}>{t('nav.news')}</a>
              </>
            ) : (
              <>
                <Link to="/" className={styles['nav-link']}>{t('nav.home')}</Link>
                <Link to="/forum" className={styles['nav-link']}>{t('nav.forum')}</Link>
                <Link to="/tour" className={styles['nav-link']}>{t('nav.tourBooking')}</Link>
                <Link to="/news" className={styles['nav-link']}>{t('nav.news')}</Link>
              </>
            )}
          </div>

          {/* Right Section */}
          <div className={styles['right-section']}>
            {user ? (
              <>
                {/* Notifications */}
                <div className={`${styles['notification-icon']} ${styles['notification-container']}`}>
                  <button 
                    className={`${styles['notification-button']}${disabledClass}`}
                    onClick={isLockedToCompanyInfo ? disableIfPending : toggleNotification}
                    data-notification-button
                    disabled={isLockedToCompanyInfo}
                  >
                    <BellIcon />
                    {unreadCount > 0 && (
                      <span className={styles['notification-badge']}>{unreadCount}</span>
                    )}
                  </button>
                  {!isLockedToCompanyInfo && (
                    <NotificationDropdown 
                      isOpen={isNotificationOpen} 
                      onClose={() => setIsNotificationOpen(false)} 
                    />
                  )}
                </div>

                {/* Messages */}
                <div className={`${styles['notification-icon']} ${styles['notification-container']}`}>
                  <button 
                    className={`${styles['notification-button']}${disabledClass}`}
                    onClick={isLockedToCompanyInfo ? disableIfPending : toggleChat}
                    data-chat-button
                    disabled={isLockedToCompanyInfo}
                  >
                    <ChatBubbleLeftRightIcon />
                    <span className={styles['notification-badge']}>1</span>
                  </button>
                  {!isLockedToCompanyInfo && (
                    <ChatDropdown 
                      isOpen={chatState.isChatDropdownOpen} 
                      onClose={chatActions.closeChatDropdown} 
                    />
                  )}
                </div>

                {/* WebSocket Status */}
                {!isLockedToCompanyInfo && (
                  <div style={{ display: 'none' }}>
                    <WebSocketStatus />
                  </div>
                )}

                {/* Balance - Only show for COMPANY users */}
                {user.role === 'COMPANY' && (
                  <div className={styles['balance-container']}>
                    <span className={styles['balance-amount']}>10.000</span>
                    <button className={styles['balance-add']}>
                      <PlusIcon />
                    </button>
                  </div>
                )}

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
                          
                        </div>
                        <p>{t(`profileRole.${user.role || 'USER'}`, user.role ? undefined : {})}</p>
                      </div>
                    </div>

                    {user.role === 'COMPANY' && !isLockedToCompanyInfo && (
                      <Link 
                        to="/company/dashboard" 
                        className={styles['dropdown-item']}
                      >
                        <BuildingOfficeIcon className="w-4 h-4" />
                        {t('nav.dashboard')}
                      </Link>
                    )}
                    {!isLockedToCompanyInfo ? (
                      <Link 
                        to="/profile" 
                        className={styles['dropdown-item']}
                      >
                        {t('nav.profileFull')}
                      </Link>
                    ) : (
                      <button onClick={disableIfPending} className={`${styles['dropdown-item']}${disabledClass}`}>
                        {t('nav.profileFull')}
                      </button>
                    )}
                    
                    {/* Removed Company Info entry from dropdown as requested */}
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
          {!isLockedToCompanyInfo && (
            <>
              <Link
                to="/"
                className={styles['mobile-nav-link']}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.home')}
              </Link>

              <Link
                to="/forum"
                className={styles['mobile-nav-link']}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.forum')}
              </Link>

              <Link
                to="/tour"
                className={styles['mobile-nav-link']}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.tourBooking')}
              </Link>

              <Link
                to="/news"
                className={styles['mobile-nav-link']}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.news')}
              </Link>
            </>
          )}

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
      {!isLockedToCompanyInfo && (
        <ChatBox 
          isOpen={chatState.isChatBoxOpen} 
          onClose={chatActions.closeChatBox} 
        />
      )}

      
    </>
  );
};

export default Navbar; 