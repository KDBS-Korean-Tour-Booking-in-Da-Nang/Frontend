import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  MapIcon,
  BuildingOfficeIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import styles from './BusinessDashboard.module.css';

const BusinessDashboard = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    {
      path: '/business/dashboard',
      icon: HomeIcon,
      label: t('businessDashboard.sidebar.dashboard'),
      exact: true
    },
    {
      path: '/business/tours',
      icon: MapIcon,
      label: t('businessDashboard.sidebar.tourManagement'),
      exact: false
    },
    {
      path: '/business/orders',
      icon: ClipboardDocumentListIcon,
      label: t('businessDashboard.sidebar.orders'),
      exact: true
    },
    {
      path: '/business/analytics',
      icon: ChartBarIcon,
      label: t('businessDashboard.sidebar.analytics'),
      exact: true
    },
    {
      path: '/business/business-info',
      icon: BuildingOfficeIcon,
      label: t('businessDashboard.sidebar.businessInfo'),
      exact: true
    }
  ];

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.dashboardContainer}>
      
      <div className={styles.dashboardContent}>
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarLogo}>
              <BuildingOfficeIcon className={styles.logoIcon} />
              <span className={styles.logoText}>{t('businessDashboard.sidebar.title')}</span>
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
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navItem} ${isActive(item) ? styles.navItemActive : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
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
              {menuItems.find(item => isActive(item))?.label || t('businessDashboard.sidebar.dashboard')}
            </h1>
          </div>

          {/* Content Area */}
          <div className={styles.contentArea}>
            <Outlet />
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

export default BusinessDashboard;
