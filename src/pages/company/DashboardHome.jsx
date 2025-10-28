import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  ChartBarIcon,
  MapIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  CurrencyDollarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import styles from './DashboardHome.module.css';

const DashboardHome = () => {
  const { t } = useTranslation();

  // Mock data for charts and statistics
  const stats = [
    {
      title: t('companyDashboard.stats.totalTours'),
      value: '24',
      change: '+12%',
      changeType: 'positive',
      icon: MapIcon,
      color: 'blue'
    },
    {
      title: t('companyDashboard.stats.totalBookings'),
      value: '186',
      change: '+8%',
      changeType: 'positive',
      icon: ClipboardDocumentListIcon,
      color: 'green'
    },
    {
      title: t('companyDashboard.stats.totalRevenue'),
      value: '₫45.2M',
      change: '+15%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      color: 'purple'
    },
    {
      title: t('companyDashboard.stats.totalViews'),
      value: '2.4K',
      change: '+23%',
      changeType: 'positive',
      icon: EyeIcon,
      color: 'orange'
    }
  ];

  const quickActions = [
    {
      title: t('companyDashboard.quickActions.createTour'),
      description: t('companyDashboard.quickActions.createTourDesc'),
      icon: MapIcon,
      link: '/company/tours/wizard',
      color: 'blue'
    },
    {
      title: t('companyDashboard.quickActions.viewAnalytics'),
      description: t('companyDashboard.quickActions.viewAnalyticsDesc'),
      icon: ChartBarIcon,
      link: '/company/analytics',
      color: 'green'
    },
    {
      title: t('companyDashboard.quickActions.manageOrders'),
      description: t('companyDashboard.quickActions.manageOrdersDesc'),
      icon: ClipboardDocumentListIcon,
      link: '/company/orders',
      color: 'purple'
    },
    {
      title: t('companyDashboard.quickActions.companyInfo'),
      description: t('companyDashboard.quickActions.companyInfoDesc'),
      icon: BuildingOfficeIcon,
      link: '/company/company-info',
      color: 'orange'
    }
  ];

  return (
    <div className={styles.dashboardHome}>
      {/* Welcome Section */}
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.welcomeTitle}>
            {t('companyDashboard.welcome.title')}
          </h1>
          <p className={styles.welcomeSubtitle}>
            {t('companyDashboard.welcome.subtitle')}
          </p>
        </div>
        <div className={styles.welcomeActions}>
          <Link 
            to="/company/tours/wizard" 
            className={styles.primaryButton}
          >
            <MapIcon className="w-5 h-5" />
            {t('companyDashboard.welcome.createTour')}
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className={styles.statsGrid}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`${styles.statCard} ${styles[stat.color]}`}>
              <div className={styles.statContent}>
                <div className={styles.statIcon}>
                  <Icon className="w-8 h-8" />
                </div>
                <div className={styles.statInfo}>
                  <h3 className={styles.statValue}>{stat.value}</h3>
                  <p className={styles.statTitle}>{stat.title}</p>
                </div>
              </div>
              <div className={`${styles.statChange} ${styles[stat.changeType]}`}>
                <ArrowTrendingUpIcon className="w-4 h-4" />
                <span>{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActionsSection}>
        <h2 className={styles.sectionTitle}>
          {t('companyDashboard.quickActions.title')}
        </h2>
        <div className={styles.quickActionsGrid}>
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.link}
                className={`${styles.quickActionCard} ${styles[action.color]}`}
              >
                <div className={styles.quickActionIcon}>
                  <Icon className="w-8 h-8" />
                </div>
                <div className={styles.quickActionContent}>
                  <h3 className={styles.quickActionTitle}>{action.title}</h3>
                  <p className={styles.quickActionDescription}>
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsSection}>
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>
              {t('companyDashboard.charts.bookingTrends')}
            </h2>
            <div className={styles.chartPeriod}>
              <select className={styles.chartSelect}>
                <option value="7d">{t('companyDashboard.charts.last7Days')}</option>
                <option value="30d">{t('companyDashboard.charts.last30Days')}</option>
                <option value="90d">{t('companyDashboard.charts.last90Days')}</option>
              </select>
            </div>
          </div>
          <div className={styles.chartPlaceholder}>
            <ChartBarIcon className="w-16 h-16 text-gray-400" />
            <p className={styles.chartPlaceholderText}>
              {t('companyDashboard.charts.chartPlaceholder')}
            </p>
          </div>
        </div>

        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>
              {t('companyDashboard.charts.revenueChart')}
            </h2>
            <div className={styles.chartPeriod}>
              <select className={styles.chartSelect}>
                <option value="monthly">{t('companyDashboard.charts.monthly')}</option>
                <option value="quarterly">{t('companyDashboard.charts.quarterly')}</option>
                <option value="yearly">{t('companyDashboard.charts.yearly')}</option>
              </select>
            </div>
          </div>
          <div className={styles.chartPlaceholder}>
            <CurrencyDollarIcon className="w-16 h-16 text-gray-400" />
            <p className={styles.chartPlaceholderText}>
              {t('companyDashboard.charts.chartPlaceholder')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
