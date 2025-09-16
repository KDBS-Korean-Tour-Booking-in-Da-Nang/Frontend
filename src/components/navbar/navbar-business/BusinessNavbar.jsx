import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Bars3Icon,
  XMarkIcon,
  BuildingOfficeIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  MapIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import styles from '../navbar-user/Navbar.module.css';

const BusinessNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
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

  // Check if current path is active
  const isActive = (path) => {
    if (path === '/business/tours') {
      return location.pathname.startsWith('/business/tours');
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
                src="/logo.jpg"
                alt="KDBS Logo"
                className={styles.logo}
              />
              <span className={styles['brand-name']}>{t('brand')} Business</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className={styles['nav-links']}>
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
              {t('nav.tours')}
            </Link>

            {/* Business Management Section */}
            <div className="relative group">
              <button className={`${styles['nav-link']} ${isActive('/business/tours') ? styles.active : ''} flex items-center gap-1`}>
                <BuildingOfficeIcon className="w-4 h-4" />
                Quản lý Business
                <span className="text-xs">▼</span>
              </button>
              
              {/* Business Dropdown Menu */}
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  <Link
                    to="/business/tours"
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <MapIcon className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">Quản lý Tours</div>
                      <div className="text-sm text-gray-500">Tạo và quản lý tours</div>
                    </div>
                  </Link>
                  
                  <Link
                    to="/business/analytics"
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ChartBarIcon className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium">Thống kê & Báo cáo</div>
                      <div className="text-sm text-gray-500">Xem doanh thu và thống kê</div>
                    </div>
                  </Link>

                  <Link
                    to="/business/orders"
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ClipboardDocumentListIcon className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">Quản lý Đơn hàng</div>
                      <div className="text-sm text-gray-500">Xem và xử lý đơn hàng</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <Link
              to="/news"
              className={`${styles['nav-link']} ${isActive('/news') ? styles.active : ''}`}
            >
              {t('nav.news')}
            </Link>

            <Link
              to="/self-travel"
              className={`${styles['nav-link']} ${isActive('/self-travel') ? styles.active : ''}`}
            >
              {t('nav.selfTravel')}
            </Link>

            <Link
              to="/contact"
              className={`${styles['nav-link']} ${isActive('/contact') ? styles.active : ''}`}
            >
              {t('nav.contact')}
            </Link>
          </div>

          {/* Right Section */}
          <div className={styles['right-section']}>
            {user ? (
              <>
                {/* Notifications */}
                <div className={styles['notification-icon']}>
                  <BellIcon />
                  <span className={styles['notification-badge']}>1</span>
                </div>

                {/* Messages */}
                <div className={styles['notification-icon']}>
                  <ChatBubbleLeftRightIcon />
                  <span className={styles['notification-badge']}>1</span>
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
                        <h4>{user.name || user.email}</h4>
                        <p className="text-primary font-medium">{user.role} - Business</p>
                      </div>
                    </div>

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
                <Link to="/login" className={styles['nav-link']}>
                  {t('nav.login')}
                </Link>
                <Link to="/register" className={styles['nav-link']}>
                  {t('nav.register')}
                </Link>
              </>
            )}

            {/* Language Switcher */}
            <div className={styles['language-switcher']}>
              <button className={styles['language-button']}>
                {i18n.language?.toUpperCase() || 'VI'}
              </button>
              <div className={styles['language-dropdown']}>
                <button onClick={() => changeLanguage('vi')} className={styles['language-option']}>
                  {t('lang.vi')}
                </button>
                <button onClick={() => changeLanguage('en')} className={styles['language-option']}>
                  {t('lang.en')}
                </button>
                <button onClick={() => changeLanguage('ko')} className={styles['language-option']}>
                  {t('lang.ko')}
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
            {t('nav.tours')}
          </Link>

          {/* Business Management Mobile */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="text-sm font-medium text-gray-500 px-4 mb-2">Business Management</div>
            <Link
              to="/business/tours"
              className={`${styles['mobile-nav-link']} ${isActive('/business/tours') ? styles.active : ''} flex items-center gap-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              <MapIcon className="w-4 h-4" />
              Quản lý Tours
            </Link>
            
            <Link
              to="/business/analytics"
              className={`${styles['mobile-nav-link']} flex items-center gap-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              <ChartBarIcon className="w-4 h-4" />
              Thống kê & Báo cáo
            </Link>

            <Link
              to="/business/orders"
              className={`${styles['mobile-nav-link']} flex items-center gap-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              <ClipboardDocumentListIcon className="w-4 h-4" />
              Quản lý Đơn hàng
            </Link>
          </div>

          <Link
            to="/news"
            className={`${styles['mobile-nav-link']} ${isActive('/news') ? styles.active : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.news')}
          </Link>

          <Link
            to="/self-travel"
            className={`${styles['mobile-nav-link']} ${isActive('/self-travel') ? styles.active : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.selfTravel')}
          </Link>

          <Link
            to="/contact"
            className={`${styles['mobile-nav-link']} ${isActive('/contact') ? styles.active : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            {t('nav.contact')}
          </Link>

          {user && (
            <div className={styles['mobile-user-section']}>
              <div className={styles['mobile-user-info']}>
                <div className={styles['mobile-user-name']}>{user.name || user.email}</div>
                <div className={styles['mobile-user-role']}>{user.role} - Business</div>
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
    </>
  );
};

export default BusinessNavbar;
