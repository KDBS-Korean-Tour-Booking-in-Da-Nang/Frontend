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
    cancelledBookings: 0,
    bookingStatusMap: {}
  });
  const [bookingCountData, setBookingCountData] = useState([]);
  const [period, setPeriod] = useState('thisMonth');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
  const fetchDashboardData = useCallback(async () => {
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

      // Fetch tour statistics
      let totalTours = 0;
      let activeTours = 0;
      try {
        const toursStatsRes = await fetch(API_ENDPOINTS.TOUR_COMPANY_STATISTICS(companyId), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (toursStatsRes.status === 401) {
          await checkAndHandle401(toursStatsRes);
          return;
        }
        
        if (toursStatsRes.ok) {
          const toursStats = await toursStatsRes.json();
          totalTours = toursStats.totalTours || 0;
          // Active tours are tours with PUBLIC status
          activeTours = toursStats.byStatus?.PUBLIC || 0;
        }
      } catch (e) {
        console.error('Error fetching tour statistics:', e);
      }

      // Fetch booking statistics
      let totalBookings = 0;
      let pendingBookings = 0;
      let completedBookings = 0;
      let cancelledBookings = 0;
      let bookingStatusMap = {};
      try {
        const bookingsStatsRes = await fetch(API_ENDPOINTS.BOOKING_COMPANY_STATISTICS(companyId), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (bookingsStatsRes.status === 401) {
          await checkAndHandle401(bookingsStatsRes);
          return;
        }
        
        if (bookingsStatsRes.ok) {
          const bookingsStats = await bookingsStatsRes.json();
          totalBookings = bookingsStats.totalBookings || 0;
          
          // Extract status counts from byStatus map
          const byStatus = bookingsStats.byStatus || {};
          
          // Store all status map for booking status chart
          Object.keys(byStatus).forEach(status => {
            bookingStatusMap[status] = byStatus[status] || 0;
          });
          
          // Pending bookings: various pending/waiting states
          pendingBookings = (byStatus.BOOKING_SUCCESS_PENDING || 0) +
                          (byStatus.PENDING_PAYMENT || 0) +
                          (byStatus.PENDING_DEPOSIT_PAYMENT || 0) +
                          (byStatus.PENDING_BALANCE_PAYMENT || 0) +
                          (byStatus.WAITING_FOR_APPROVED || 0) +
                          (byStatus.WAITING_FOR_UPDATE || 0);
          
          // Completed bookings: success states
          completedBookings = (byStatus.BOOKING_SUCCESS || 0) +
                            (byStatus.BOOKING_SUCCESS_WAIT_FOR_CONFIRMED || 0) +
                            (byStatus.BOOKING_BALANCE_SUCCESS || 0);
          
          // Cancelled bookings
          cancelledBookings = byStatus.BOOKING_CANCELLED || 0;
        }
      } catch (e) {
        console.error('Error fetching booking statistics:', e);
      }
      
      // Use balance from API as total revenue
      const currentBalance = balance !== null ? balance : 0;

      setStats({
        totalTours,
        totalBookings,
        totalRevenue: currentBalance,
        activeTours,
        pendingBookings,
        completedBookings,
        cancelledBookings,
        bookingStatusMap
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, balance, getToken, fetchBalance]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fetch monthly booking count statistics separately when year changes
  const fetchMonthlyBookingCount = useCallback(async () => {
    if (!companyId) {
      return;
    }

    try {
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const token = storage.getItem('token');

      if (!token) return;

      let bookingCountByMonth = Array(12).fill(0);
      const monthlyBookingCountRes = await fetch(API_ENDPOINTS.BOOKING_COMPANY_MONTHLY_BOOKING_COUNT(companyId, selectedYear), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (monthlyBookingCountRes.status === 401) {
        await checkAndHandle401(monthlyBookingCountRes);
        return;
      }
      
      if (monthlyBookingCountRes.ok) {
        const monthlyBookingCountData = await monthlyBookingCountRes.json();
        const monthlyBookingCount = monthlyBookingCountData.monthlyBookingCount || {};
        
        // Convert map to array (month 1-12 -> index 0-11)
        // Handle both string keys ("1", "2") and number keys (1, 2) from JSON
        bookingCountByMonth = Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          // Try number key first, then string key
          const count = monthlyBookingCount[month] ?? monthlyBookingCount[String(month)];
          if (count !== undefined && count !== null) {
            return typeof count === 'number' ? count : parseInt(count, 10);
          }
          return 0;
        });
      }
      
      setBookingCountData(bookingCountByMonth);
    } catch (e) {
      console.error('Error fetching monthly booking count:', e);
    }
  }, [companyId, selectedYear, getToken]);

  useEffect(() => {
    fetchMonthlyBookingCount();
  }, [fetchMonthlyBookingCount]);


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

  // Bookings chart options
  const bookingsChartOptions = {
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

  const bookingsChartSeries = [{
    name: 'Bookings',
    data: bookingCountData || []
  }];

  // Booking status donut chart - show all statuses
  const bookingStatusMap = stats.bookingStatusMap || {};
  const statusColors = [
    '#1a8eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4',
    '#6366f1', '#a855f7', '#eab308', '#22c55e', '#3b82f6'
  ];
  
  // Mapping for short status names
  const statusShortNames = {
    'PENDING_PAYMENT': 'Pending Payment',
    'PENDING_DEPOSIT_PAYMENT': 'Pending Deposit',
    'PENDING_BALANCE_PAYMENT': 'Pending Balance',
    'WAITING_FOR_APPROVED': 'Waiting Approval',
    'BOOKING_REJECTED': 'Rejected',
    'WAITING_FOR_UPDATE': 'Waiting Update',
    'BOOKING_FAILED': 'Failed',
    'BOOKING_BALANCE_SUCCESS': 'Balance Success',
    'BOOKING_SUCCESS_PENDING': 'Success Pending',
    'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED': 'Wait Confirmed',
    'BOOKING_UNDER_COMPLAINT': 'Complaint',
    'BOOKING_SUCCESS': 'Success',
    'BOOKING_CANCELLED': 'Cancelled'
  };
  
  // Get all statuses that have count > 0
  const statusEntries = Object.entries(bookingStatusMap)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a); // Sort by count descending

  const bookingStatusLabels = statusEntries.map(([status]) => {
    // Use short name if available, otherwise format the status name
    return statusShortNames[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  });
  
  const bookingStatusSeries = statusEntries.map(([_, count]) => count);
  
  const bookingStatusOptions = {
    chart: {
      type: 'donut',
      height: 350
    },
    colors: statusColors.slice(0, bookingStatusLabels.length),
    labels: bookingStatusLabels,
    legend: {
      position: 'bottom',
      fontSize: '12px',
      labels: {
        colors: '#64748b'
      },
      formatter: function(seriesName, opts) {
        return seriesName + ": " + opts.w.globals.series[opts.seriesIndex];
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
      theme: 'light',
      y: {
        formatter: (val) => val + ' bookings'
      }
    }
  };

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
        {/* Bookings Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Bookings Overview</h3>
              <p className={styles.chartSubtitle}>Monthly booking trends</p>
            </div>
            <select
              className={styles.yearSelect}
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 6 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          <div className={styles.chartContainer}>
            {bookingCountData.length > 0 ? (
              <Chart
                key={`bookings-chart-${selectedYear}`}
                options={bookingsChartOptions}
                series={bookingsChartSeries}
                type="area"
                height={350}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '350px', color: '#64748b' }}>
                Loading chart data...
              </div>
            )}
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
