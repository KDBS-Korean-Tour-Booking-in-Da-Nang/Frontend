import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useChat } from '../../../contexts/ChatContext';
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import styles from './Navbar.module.css';
import { NotificationDropdown, ChatBox, ChatDropdown, WebSocketStatus } from '../../';
import { useNotifications } from '../../../contexts/NotificationContext';
 

const Navbar = () => {
  const { user, logout, getToken } = useAuth();
  const { unreadCount, fetchList, fetchUnreadCount } = useNotifications();
  const fetchListRef = useRef(fetchList);
  useEffect(() => { fetchListRef.current = fetchList; }, [fetchList]);

  // Lấy số lượng thông báo chưa đọc khi component mount và khi user thay đổi
  useEffect(() => {
    if (user?.email && fetchUnreadCount) {
      fetchUnreadCount();
    }
  }, [user?.email, fetchUnreadCount]);
  
  // Xử lý lỗi cho chat context
  let chatState, chatActions;
  try {
    const chatContext = useChat();
    chatState = chatContext.state;
    chatActions = chatContext.actions;
  } catch (error) {
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

  // Đặt ngôn ngữ mặc định là tiếng Anh cho USER role và GUEST
  useEffect(() => {
    const currentLang = i18n.language;
    if (!user || user.role === 'USER') {
      if (!currentLang || currentLang === 'vi') {
        i18n.changeLanguage('en');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, i18n.language]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng) => {
    if ((!user || user.role === 'USER') && lng === 'vi') {
      return;
    }
    i18n.changeLanguage(lng);
  };

  const showVietnamese = false;

  const toggleNotification = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const toggleChat = () => {
    chatActions.toggleChatDropdown();
  };

  // Xử lý hành vi scroll: trên trang forum luôn hiển thị, các trang khác ẩn khi scroll xuống
  useEffect(() => {
    const isForumPage = location.pathname === '/forum' || location.pathname.startsWith('/forum/');
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (isForumPage) {
        setIsVisible(true);
        setIsScrolled(currentScrollY > 10);
      } else {
        if (currentScrollY < 10) {
          setIsVisible(true);
          setIsScrolled(false);
        } else {
          setIsScrolled(true);
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false);
          } else {
            setIsVisible(true);
          }
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, location.pathname]);

  // Kiểm tra xem path hiện tại có active không
  const isActive = (path) => {
    if (path === '/tour') {
      return location.pathname === '/tour' || location.pathname.startsWith('/tour/');
    }
    if (path === '/article') {
      return location.pathname === '/article' || location.pathname.startsWith('/article/');
    }
    if (path === '/about') {
      return location.pathname === '/about';
    }
    return location.pathname === path;
  };

  const isLockedToCompanyInfo = false;
  const disabledClass = '';

  const hasUnreadNotifications = unreadCount > 0;
  const hasUnreadMessages = !!chatState?.hasUnreadMessages;

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
            <Link to="/" className={styles['nav-link']}>{t('nav.home')}</Link>
            <Link to="/forum" className={styles['nav-link']}>{t('nav.forum')}</Link>
            <Link to="/tour" className={styles['nav-link']}>{t('nav.tourBooking')}</Link>
            <Link to="/article" className={styles['nav-link']}>{t('nav.article')}</Link>
            <Link to="/about" className={styles['nav-link']}>{t('nav.about')}</Link>
            <Link to="/contact" className={styles['nav-link']}>{t('nav.contact')}</Link>
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
                    {hasUnreadNotifications && (
                      <span className={styles['notification-dot']} />
                    )}
                  </button>
                  <NotificationDropdown 
                    isOpen={isNotificationOpen} 
                    onClose={() => setIsNotificationOpen(false)} 
                  />
                </div>

                {/* Messages */}
                <div className={`${styles['notification-icon']} ${styles['notification-container']}`}>
                  <button 
                    className={styles['notification-button']}
                    onClick={toggleChat}
                    data-chat-button
                  >
                    <ChatBubbleLeftRightIcon />
                    {hasUnreadMessages && (
                      <span className={styles['notification-dot']} />
                    )}
                  </button>
                  <ChatDropdown 
                    isOpen={chatState.isChatDropdownOpen} 
                    onClose={chatActions.closeChatDropdown} 
                  />
                </div>

                {/* WebSocket Status */}
                <div style={{ display: 'none' }}>
                  <WebSocketStatus />
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
                          
                        </div>
                        <p>{t(`profileRole.${user.role || 'USER'}`, user.role ? undefined : {})}</p>
                      </div>
                    </div>

                    <Link 
                      to="/profile" 
                      className={styles['dropdown-item']}
                    >
                      {t('nav.profileFull')}
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
                {!i18n.language && (showVietnamese ? <img src="/VN.png" alt="Vietnam" className={styles['language-flag']} /> : <img src="/EN.png" alt="English" className={styles['language-flag']} />)}
              </button>
              <div className={styles['language-dropdown']}>
                {showVietnamese && (
                  <button onClick={() => changeLanguage('vi')} className={`${styles['language-option']} ${i18n.language === 'vi' ? 'active ' + styles['active'] : ''}`}>
                    <img src="/VN.png" alt="Vietnam" className={styles['language-flag']} />
                    <span className={styles['language-text']}>{t('lang.vi')}</span>
                  </button>
                )}
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
            to="/article"
            className={styles['mobile-nav-link']}
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.article')}
          </Link>

          <Link
            to="/about"
            className={styles['mobile-nav-link']}
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.about')}
          </Link>

          <Link
            to="/contact"
            className={styles['mobile-nav-link']}
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.contact')}
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
        isOpen={chatState.isChatBoxOpen} 
        onClose={chatActions.closeChatBox} 
      />
      
    </>
  );
};

export default Navbar; 