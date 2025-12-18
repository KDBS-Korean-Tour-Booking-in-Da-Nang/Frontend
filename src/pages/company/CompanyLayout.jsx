import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  HomeIcon,
  ClipboardDocumentListIcon,
  MapIcon,
  BuildingOfficeIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import styles from './CompanyLayout.module.css';

const CompanyLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const contentAreaRef = useRef(null);
  const { user } = useAuth();
  const prevLocationRef = useRef(location.pathname);

  // Build sidebar menu items: hiển thị Company Info chỉ khi status là COMPANY_PENDING, các menu items khác (dashboard, tours, bookings, vouchers) luôn hiển thị
  const menuItems = [
    {
      path: '/company/dashboard',
      icon: HomeIcon,
      label: t('companyDashboard.sidebar.dashboard'),
      exact: true
    },
    {
      path: '/company/tours',
      icon: MapIcon,
      label: t('companyDashboard.sidebar.tourManagement'),
      exact: false
    },
    {
      path: '/company/bookings',
      icon: ClipboardDocumentListIcon,
      label: t('companyDashboard.sidebar.bookingManagement'),
      exact: false
    },
    {
      path: '/company/vouchers',
      icon: UserIcon,
      label: t('companyDashboard.sidebar.voucherManagement'),
      exact: true
    },
    ...(user?.status === 'COMPANY_PENDING'
      ? [{
          path: '/company/company-info',
          icon: BuildingOfficeIcon,
          label: t('companyDashboard.sidebar.companyInfo'),
          exact: true
        }]
      : [])
  ];

  // Check if menu item is active based on current pathname
  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  // Toggle sidebar open/closed state: đảo ngược giá trị sidebarOpen
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Xử lý smooth page transitions: chỉ trigger transition nếu pathname thực sự thay đổi, scroll to top smoothly (ưu tiên contentAreaRef, fallback window), update contentKey để trigger re-render, update prevLocationRef
  useEffect(() => {
    if (prevLocationRef.current !== location.pathname) {
      if (contentAreaRef.current) {
        contentAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      setContentKey(prev => prev + 1);

      prevLocationRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Đóng sidebar khi navigation item được click (mobile): set sidebarOpen = false
  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={styles.dashboardContainer}>
      
      <div className={styles.dashboardContent}>
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarLogo}>
              <BuildingOfficeIcon className={styles.logoIcon} />
              <span className={styles.logoText}>{t('companyDashboard.sidebar.title')}</span>
            </div>
            <button 
              className={styles.sidebarToggle}
              onClick={toggleSidebar}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <nav className={styles.sidebarNav}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  onClick={handleNavClick}
                >
                  <Icon className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                  {active && <div className={styles.activeIndicator} />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {/* Mobile Sidebar Toggle */}
          <div className={styles.mobileHeader}>
            <button 
              className={styles.mobileToggle}
              onClick={toggleSidebar}
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h1 className={styles.pageTitle}>
              {menuItems.find(item => isActive(item))?.label || t('companyDashboard.sidebar.dashboard')}
            </h1>
          </div>

          {/* Content Area */}
          <div 
            ref={contentAreaRef}
            className={styles.contentArea}
            key={contentKey}
          >
            <div className={styles.contentWrapper}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className={styles.mobileOverlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default CompanyLayout;
