import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useChat } from '../../../contexts/ChatContext';
import { API_ENDPOINTS, createAuthHeaders } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import styles from './NavbarCompany.module.css';
import { NotificationDropdown, ChatBox, ChatDropdown, WebSocketStatus } from '../../';
import { useNotifications } from '../../../contexts/NotificationContext';
 

const NavbarCompany = () => {
  const { user, logout, getToken } = useAuth();
  const { unreadCount, fetchList, fetchUnreadCount } = useNotifications();
  const fetchListRef = useRef(fetchList);
  useEffect(() => { fetchListRef.current = fetchList; }, [fetchList]);
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Lấy số lượng thông báo chưa đọc khi component mount và khi user thay đổi
  useEffect(() => {
    if (user?.email && fetchUnreadCount) {
      fetchUnreadCount();
    }
  }, [user?.email, fetchUnreadCount]);

  // Hàm làm mới số dư từ API
  const refreshBalance = useCallback(async () => {
    if (!user || user.role !== 'COMPANY') {
      setBalance(null);
      return;
    }

    setIsLoadingBalance(true);
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.GET_USER(user.email), {
        headers: createAuthHeaders(token)
      });

      if (response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const userData = await response.json();
        const newBalance = userData.balance || 0;
        setBalance(newBalance);
        if (user.balance !== newBalance) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { balance: newBalance } }));
          }
        }
      }
    } catch {
      setBalance(0);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [user, getToken]);

  // Lấy số dư từ API
  useEffect(() => {
    const loadBalance = async () => {
      if (!user || user.role !== 'COMPANY') {
        setBalance(null);
        return;
      }

      if (user.balance !== undefined && user.balance !== null) {
        setBalance(user.balance);
      }

      refreshBalance();
    };

    loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, getToken, refreshBalance]);

  // Lắng nghe sự kiện cập nhật số dư
  useEffect(() => {
    if (!user || user.role !== 'COMPANY') {
      return;
    }

    const handleBalanceUpdate = async (event) => {
      if (event.detail?.balance !== undefined) {
        setBalance(event.detail.balance);
      } else {
        setIsLoadingBalance(true);
        try {
          const token = getToken();
          if (token) {
            const response = await fetch(API_ENDPOINTS.GET_USER(user.email), {
              headers: createAuthHeaders(token)
            });

            if (response.status === 401) {
              await checkAndHandle401(response);
              return;
            }

            if (response.ok) {
              const userData = await response.json();
              const newBalance = userData.balance || 0;
              setBalance(newBalance);
            }
          }
        } catch {
          // Silently fail
        } finally {
          setIsLoadingBalance(false);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('balanceUpdated', handleBalanceUpdate);
      return () => {
        window.removeEventListener('balanceUpdated', handleBalanceUpdate);
      };
    }
  }, [user?.email, user?.role, getToken]);

  // Định dạng số dư với 2 chữ số thập phân
  const formatBalance = (bal) => {
    if (bal === null || bal === undefined) return '0.00';
    const num = typeof bal === 'string' ? parseFloat(bal) : bal;
    if (isNaN(num)) return '0.00';
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };
  
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

  // COMPANY có thể sử dụng tất cả ngôn ngữ bao gồm tiếng Việt
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Xác định xem có hiển thị tiếng Việt không (chỉ cho COMPANY role)
  const showVietnamese = user && user.role === 'COMPANY';

  const toggleNotification = () => {
    if (isCompanyPending) {
      navigate('/company-info');
      return;
    }
    setIsNotificationOpen(!isNotificationOpen);
  };

  const toggleChat = () => {
    if (isCompanyPending) {
      navigate('/company-info');
      return;
    }
    chatActions.toggleChatDropdown();
  };

  // Xử lý hành vi scroll: trên trang forum và dashboard luôn hiển thị, các trang khác ẩn khi scroll xuống
  useEffect(() => {
    const isForumPage = location.pathname === '/forum' || location.pathname.startsWith('/forum/');
    const isDashboardPage = location.pathname.startsWith('/company/');
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (isForumPage || isDashboardPage) {
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

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  const hasUnreadNotifications = unreadCount > 0;
  const hasUnreadMessages = !!chatState?.hasUnreadMessages;

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
              <>
                <a href="#" onClick={disableIfPending} className={`${styles['nav-link']}${disabledClass}`}>{t('nav.home')}</a>
                <a href="#" onClick={disableIfPending} className={`${styles['nav-link']}${disabledClass}`}>{t('nav.forum')}</a>
                <a href="#" onClick={disableIfPending} className={`${styles['nav-link']}${disabledClass}`}>{t('nav.tourBooking')}</a>
                <a href="#" onClick={disableIfPending} className={`${styles['nav-link']}${disabledClass}`}>{t('nav.article')}</a>
                <a href="#" onClick={disableIfPending} className={`${styles['nav-link']}${disabledClass}`}>{t('nav.about')}</a>
                <a href="#" onClick={disableIfPending} className={`${styles['nav-link']}${disabledClass}`}>{t('nav.contact')}</a>
              </>
            ) : (
              <>
                <Link to="/" className={styles['nav-link']}>{t('nav.home')}</Link>
                <Link to="/forum" className={styles['nav-link']}>{t('nav.forum')}</Link>
                <Link to="/tour" className={styles['nav-link']}>{t('nav.tourBooking')}</Link>
                <Link to="/article" className={styles['nav-link']}>{t('nav.article')}</Link>
                <Link to="/about" className={styles['nav-link']}>{t('nav.about')}</Link>
                <Link to="/contact" className={styles['nav-link']}>{t('nav.contact')}</Link>
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
                    {hasUnreadNotifications && (
                      <span className={styles['notification-dot']} />
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
                    {hasUnreadMessages && (
                      <span className={styles['notification-dot']} />
                    )}
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

                {/* Balance - Always show for COMPANY users */}
                {user.role === 'COMPANY' && (
                  <div className={styles['balance-container']}>
                    <span className={styles['balance-amount']}>
                      {isLoadingBalance ? '...' : formatBalance(balance)}
                    </span>
                    <button className={styles['balance-add']} title="Add balance">
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
                      {(user.name || user.email || 'C').charAt(0).toUpperCase()}
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
                          {(user.name || user.email || 'C').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={styles['dropdown-user-info']}>
                        <div className={styles['user-info-row']}>
                          <h4>{user.name || user.email}</h4>
                          
                        </div>
                        <p>{t(`profileRole.${user.role || 'COMPANY'}`, user.role ? undefined : {})}</p>
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

export default NavbarCompany;
