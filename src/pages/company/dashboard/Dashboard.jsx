import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Chart from 'react-apexcharts';
import {
  MapIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [stats, setStats] = useState({
    totalTours: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeTours: 0,
    pendingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [period, setPeriod] = useState('thisMonth');

  // Fetch user balance from API
  const fetchBalance = useCallback(async () => {
    if (!user || user.role !== 'COMPANY') {
      setBalance(null);
      return;
    }

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.GET_USER(user.email), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const userData = await response.json();
        setBalance(userData.balance || 0);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
      setBalance(0);
    }
  }, [user, getToken]);

  // Extract companyId from user object (try multiple possible field names)
  useEffect(() => {
    if (!user) {
      setCompanyId(null);
      return;
    }

    const isCompanyUser = user.role === 'COMPANY' || user.role === 'BUSINESS';
    if (!isCompanyUser) {
      setCompanyId(null);
      return;
    }

    const derivedCompanyId =
      user.companyId ??
      user.companyID ??
      user.company?.companyId ??
      user.company?.id ??
      user.id ??
      null;

    setCompanyId(derivedCompanyId ?? null);
  }, [user]);

  // Listen for balance update events and refresh balance when event is fired
  useEffect(() => {
    const handleBalanceUpdate = () => {
      fetchBalance();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('balanceUpdated', handleBalanceUpdate);
      return () => {
        window.removeEventListener('balanceUpdated', handleBalanceUpdate);
      };
    }
  }, [user?.email, getToken, fetchBalance]);

  // Fetch all dashboard data: tours, bookings, calculate stats and revenue chart data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const remembered = localStorage.getItem('rememberMe') === 'true';
        const storage = remembered ? localStorage : sessionStorage;
        const token = storage.getItem('token');

        if (!token) return;

        // Fetch balance first
        await fetchBalance();

        // Fetch tours
        const toursRes = await fetch(API_ENDPOINTS.TOURS_BY_COMPANY_ID(companyId), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Handle 401 unauthorized if token expired
        if (!toursRes.ok && toursRes.status === 401) {
          await checkAndHandle401(toursRes);
          return;
        }
        
        const tours = toursRes.ok ? await toursRes.json() : [];
        let toursArray = Array.isArray(tours) ? tours : [];
        if (toursArray.length === 0) {
          const mockStatuses = ['ACTIVE', 'ACTIVE', 'INACTIVE', 'ACTIVE'];
          toursArray = mockStatuses.map((status, index) => ({
            id: `mock-tour-${index + 1}`,
            name: `Mock Tour ${index + 1}`,
            status
          }));
        }

        // Fetch bookings for company
        let bookingsArray = [];
        if (user?.email) {
          try {
            const bookingsRes = await fetch(API_ENDPOINTS.BOOKING_BY_EMAIL(user.email), {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            // Handle 401 unauthorized if token expired
            if (!bookingsRes.ok && bookingsRes.status === 401) {
              await checkAndHandle401(bookingsRes);
              return;
            }
            
            if (bookingsRes.ok) {
              const bookings = await bookingsRes.json();
              bookingsArray = Array.isArray(bookings) ? bookings : [];
            }
          } catch (e) {
            // Silently handle error fetching bookings
          }
        }
        if (bookingsArray.length === 0) {
          const now = new Date();
          const monthOffsetDate = (offset) => {
            const date = new Date(now);
            date.setMonth(date.getMonth() - offset);
            return date.toISOString();
          };
          bookingsArray = [
            { id: 'mock-booking-1', status: 'COMPLETED', totalPrice: 5200000, createdAt: monthOffsetDate(0) },
            { id: 'mock-booking-2', status: 'COMPLETED', totalPrice: 4800000, createdAt: monthOffsetDate(1) },
            { id: 'mock-booking-3', status: 'PENDING', totalPrice: 3100000, createdAt: monthOffsetDate(0) },
            { id: 'mock-booking-4', status: 'CANCELLED', totalPrice: 1500000, createdAt: monthOffsetDate(2) },
            { id: 'mock-booking-5', status: 'COMPLETED', totalPrice: 6900000, createdAt: monthOffsetDate(3) },
            { id: 'mock-booking-6', status: 'COMPLETED', totalPrice: 4200000, createdAt: monthOffsetDate(4) },
            { id: 'mock-booking-7', status: 'PENDING', totalPrice: 2800000, createdAt: monthOffsetDate(1) },
            { id: 'mock-booking-8', status: 'COMPLETED', totalPrice: 3600000, createdAt: monthOffsetDate(5) }
          ];
        }

        // Calculate dashboard statistics from tours and bookings
        const totalTours = toursArray.length;
        const activeTours = toursArray.filter(t => t.status === 'ACTIVE').length;
        const totalBookings = bookingsArray.length;
        const pendingBookings = bookingsArray.filter(b => b.status === 'PENDING').length;
        const completedBookings = bookingsArray.filter(b => b.status === 'COMPLETED').length;
        const cancelledBookings = bookingsArray.filter(b => b.status === 'CANCELLED').length;
        
        // Use balance from API as total revenue
        const totalRevenue = balance !== null ? balance : 0;

        // Generate revenue chart data by grouping bookings by month
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const revenueByMonth = months.map((month, index) => {
          // Mock data - in real app, group bookings by month
          const monthBookings = bookingsArray.filter(b => {
            if (!b.createdAt) return false;
            const date = new Date(b.createdAt);
            return date.getMonth() === index;
          });
          return monthBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        });

        setStats({
          totalTours,
          totalBookings,
          totalRevenue,
          activeTours,
          pendingBookings,
          completedBookings,
          cancelledBookings
        });
        setRevenueData(revenueByMonth);
      } catch (error) {
        // Silently handle error fetching dashboard data
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [companyId, user, balance, getToken, fetchBalance]);

  // Stats cards data
  const statsCards = [
    {
      label: t('companyDashboard.stats.totalTours') || 'Total Tours',
      value: stats.totalTours,
      icon: MapIcon,
      color: '#1a8eea',
      bgColor: '#e6f2ff',
      change: '+12%',
      trend: 'up'
    },
    {
      label: t('companyDashboard.stats.totalBookings') || 'Total Bookings',
      value: stats.totalBookings,
      icon: ClipboardDocumentListIcon,
      color: '#10b981',
      bgColor: '#d1fae5',
      change: '+8%',
      trend: 'up'
    },
    {
      label: t('companyDashboard.stats.totalRevenue') || 'Total Revenue',
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue),
      icon: CurrencyDollarIcon,
      color: '#f59e0b',
      bgColor: '#fef3c7',
      change: '+15%',
      trend: 'up'
    },
    {
      label: t('companyDashboard.stats.activeTours'),
      value: stats.activeTours,
      icon: EyeIcon,
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      change: '+5%',
      trend: 'up'
    }
  ];

  // Revenue chart options
  const revenueChartOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: ['#1a8eea'],
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '12px'
        },
        formatter: (value) => {
          if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
          if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
          return value.toFixed(0);
        }
      }
    },
    grid: {
      borderColor: '#f0f0f0',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px'
      }
    }
  };

  const revenueChartSeries = [{
    name: 'Revenue',
    data: revenueData
  }];

  // Booking status donut chart
  const bookingStatusOptions = {
    chart: {
      type: 'donut',
      height: 350
    },
    colors: ['#1a8eea', '#10b981', '#f59e0b', '#ef4444'],
    labels: [
      t('companyDashboard.dashboard.chartLabels.pending'),
      t('companyDashboard.dashboard.chartLabels.completed'),
      t('companyDashboard.dashboard.chartLabels.active'),
      t('companyDashboard.dashboard.chartLabels.cancelled')
    ],
    legend: {
      position: 'bottom',
      fontSize: '14px',
      labels: {
        colors: '#64748b'
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => val.toFixed(1) + '%'
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: t('companyDashboard.dashboard.chartLabels.totalBookings'),
              fontSize: '16px',
              fontWeight: 600,
              color: '#1e293b',
              formatter: () => stats.totalBookings.toString()
            }
          }
        }
      }
    },
    tooltip: {
      theme: 'light'
    }
  };

  const bookingStatusSeries = [
    stats.pendingBookings,
    stats.completedBookings,
    stats.totalBookings - stats.pendingBookings - stats.completedBookings - stats.cancelledBookings,
    stats.cancelledBookings
  ];

  if (loading) {
    return (
      <div className={styles.dashboardRoot}>
        <div className={styles.loading}>{t('companyDashboard.dashboard.loading')}</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardRoot}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.dashboardPageTitle}>{t('companyDashboard.sidebar.dashboard')}</h1>
          <p className={styles.dashboardPageSubtitle}>
            {t('companyDashboard.header.subtitle') || 'Overview and analytics'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <select 
            className={styles.periodSelect}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="thisMonth">{t('companyDashboard.filters.thisMonth') || 'This Month'}</option>
            <option value="thisQuarter">{t('companyDashboard.filters.thisQuarter') || 'This Quarter'}</option>
            <option value="thisYear">{t('companyDashboard.filters.thisYear') || 'This Year'}</option>
            <option value="lastYear">{t('companyDashboard.filters.lastYear') || 'Last Year'}</option>
          </select>
          <button className={styles.downloadButton}>
            <CalendarIcon className={styles.downloadIcon} />
            {t('companyDashboard.actions.download') || 'Download Report'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={styles.statCard}>
              <div className={styles.statCardHeader}>
                <div className={styles.statIcon} style={{ backgroundColor: card.bgColor, color: card.color }}>
                  <Icon className={styles.icon} />
                </div>
                <span className={styles.statChange} data-trend={card.trend}>
                  {card.trend === 'up' ? (
                    <ArrowUpIcon className={styles.trendIcon} />
                  ) : (
                    <ArrowDownIcon className={styles.trendIcon} />
                  )}
                  {card.change}
                </span>
              </div>
              <div className={styles.statCardBody}>
                <div className={styles.statValue}>{card.value}</div>
                <div className={styles.statLabel}>{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        {/* Revenue Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>{t('companyDashboard.dashboard.revenueOverview')}</h3>
              <p className={styles.chartSubtitle}>{t('companyDashboard.dashboard.revenueTrends')}</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <Chart
              options={revenueChartOptions}
              series={revenueChartSeries}
              type="area"
              height={350}
            />
          </div>
        </div>

        {/* Booking Status Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>{t('companyDashboard.dashboard.bookingStatus')}</h3>
              <p className={styles.chartSubtitle}>{t('companyDashboard.dashboard.bookingDistribution')}</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <Chart
              options={bookingStatusOptions}
              series={bookingStatusSeries}
              type="donut"
              height={350}
            />
          </div>
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoCardHeader}>
            <UserGroupIcon className={styles.infoIcon} />
            <h3 className={styles.infoTitle}>{t('companyDashboard.dashboard.quickStats')}</h3>
          </div>
          <div className={styles.infoContent}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t('companyDashboard.dashboard.pendingBookings')}</span>
              <span className={styles.infoValue}>{stats.pendingBookings}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t('companyDashboard.dashboard.completed')}</span>
              <span className={styles.infoValue}>{stats.completedBookings}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t('companyDashboard.dashboard.cancelled')}</span>
              <span className={styles.infoValue}>{stats.cancelledBookings}</span>
            </div>
          </div>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoCardHeader}>
            <MapIcon className={styles.infoIcon} />
            <h3 className={styles.infoTitle}>{t('companyDashboard.dashboard.tourStatus')}</h3>
          </div>
          <div className={styles.infoContent}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t('companyDashboard.dashboard.activeTours')}</span>
              <span className={styles.infoValue}>{stats.activeTours}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t('companyDashboard.dashboard.totalTours')}</span>
              <span className={styles.infoValue}>{stats.totalTours}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t('companyDashboard.dashboard.inactive')}</span>
              <span className={styles.infoValue}>{stats.totalTours - stats.activeTours}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
