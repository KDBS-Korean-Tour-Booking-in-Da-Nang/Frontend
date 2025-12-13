import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Chart from 'react-apexcharts';
import {
  MapIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  UserIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { API_ENDPOINTS, createAuthHeaders } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import { useAuth } from '../../../contexts/AuthContext';
import worldMapData from '../../../assets/data/world-110m.json';

// World map geo data imported locally to avoid CORS issues
const geoData = worldMapData;

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  // Initialize balance from user object if available
  const [balance, setBalance] = useState(() => {
    if (user?.role === 'ADMIN' && user?.balance !== undefined && user?.balance !== null) {
      return user.balance;
    }
    return null;
  });
  const [stats, setStats] = useState({
    totalRevenue: 0,
    customerManagement: {
      totalCustomers: 0
    },
    staffManagement: {
      totalStaff: 0
    },
    companyManagement: {
      totalCompanies: 0
    },
    articleManagement: {
      totalArticles: 0
    },
    tourManagement: {
      totalTours: 0,
      byStatus: {}
    },
    bookingManagement: {
      totalBookings: 0,
      byStatus: {}
    },
    monthlyBookingCount: {},
    completedBookings: 0
  });

  // Sync balance with user object when user changes
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      if (user.balance !== undefined && user.balance !== null) {
        setBalance(user.balance);
      } else if (balance === null) {
        // Only set to 0 if balance is still null (initial state)
        setBalance(0);
      }
    } else {
      setBalance(null);
    }
  }, [user?.balance, user?.role]);

  // Listen for balance update events
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      return;
    }

    const handleBalanceUpdate = (event) => {
      // If balance is provided in event, use it directly
      if (event.detail?.balance !== undefined) {
        setBalance(event.detail.balance);
      } else {
        // Otherwise, refresh from user object
        if (user.balance !== undefined && user.balance !== null) {
          setBalance(user.balance);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('balanceUpdated', handleBalanceUpdate);
      return () => {
        window.removeEventListener('balanceUpdated', handleBalanceUpdate);
      };
    }
  }, [user]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = getToken();

        if (!token) {
          setLoading(false);
          return;
        }

        const headers = createAuthHeaders(token);

        // Total Revenue should use balance from API (same as company dashboard)
        // Balance is already synced with user object via useEffect above
        const totalRevenue = balance !== null ? balance : 0;

        // Fetch Tour Statistics
        let tourStats = { totalTours: 0, byStatus: {} };
        try {
          const tourStatsRes = await fetch(API_ENDPOINTS.ADMIN_TOUR_STATISTICS, { headers });
          if (tourStatsRes.ok && tourStatsRes.status !== 401) {
            tourStats = await tourStatsRes.json();
          } else if (tourStatsRes.status === 401) {
            await checkAndHandle401(tourStatsRes);
            return;
          }
        } catch {
          // Silently handle error
        }

        // Fetch Booking Statistics
        let bookingStats = { totalBookings: 0, byStatus: {} };
        try {
          const bookingStatsRes = await fetch(API_ENDPOINTS.ADMIN_BOOKING_STATISTICS, { headers });
          if (bookingStatsRes.ok && bookingStatsRes.status !== 401) {
            bookingStats = await bookingStatsRes.json();
          } else if (bookingStatsRes.status === 401) {
            await checkAndHandle401(bookingStatsRes);
            return;
          }
        } catch {
          // Silently handle error
        }

        // Fetch Monthly Booking Count (for last 6 months)
        const currentYear = new Date().getFullYear();
        let monthlyBookingCount = {};
        try {
          const monthlyRes = await fetch(API_ENDPOINTS.ADMIN_MONTHLY_BOOKING_COUNT(currentYear), { headers });
          if (monthlyRes.ok && monthlyRes.status !== 401) {
            const monthlyData = await monthlyRes.json();
            monthlyBookingCount = monthlyData.monthlyBookingCount || {};
          } else if (monthlyRes.status === 401) {
            await checkAndHandle401(monthlyRes);
            return;
          }
        } catch {
          // Silently handle error
        }

        // Calculate completed bookings from booking statistics
        const completedBookings = bookingStats.byStatus?.BOOKING_SUCCESS || bookingStats.byStatus?.BOOKING_BALANCE_SUCCESS || 0;

        // Fetch Customer Count (Unbanned Users with role USER)
        let totalCustomers = 0;
        try {
          const customerRes = await fetch(API_ENDPOINTS.ADMIN_COUNT_UNBANNED_USERS, { headers });
          if (customerRes.ok && customerRes.status !== 401) {
            totalCustomers = await customerRes.json();
          } else if (customerRes.status === 401) {
            await checkAndHandle401(customerRes);
            return;
          }
        } catch {
          // Silently handle error
        }

        // Fetch Staff Count (Unbanned Staff)
        let totalStaff = 0;
        try {
          const staffRes = await fetch(API_ENDPOINTS.ADMIN_COUNT_UNBANNED_STAFF, { headers });
          if (staffRes.ok && staffRes.status !== 401) {
            totalStaff = await staffRes.json();
          } else if (staffRes.status === 401) {
            await checkAndHandle401(staffRes);
            return;
          }
        } catch {
          // Silently handle error
        }

        // Fetch Company Count (Unbanned Companies)
        let totalCompanies = 0;
        try {
          const companyRes = await fetch(API_ENDPOINTS.ADMIN_COUNT_UNBANNED_COMPANIES, { headers });
          if (companyRes.ok && companyRes.status !== 401) {
            totalCompanies = await companyRes.json();
          } else if (companyRes.status === 401) {
            await checkAndHandle401(companyRes);
            return;
          }
        } catch {
          // Silently handle error
        }

        // Fetch Article Count (Approved Articles)
        let totalArticles = 0;
        try {
          const articleRes = await fetch(API_ENDPOINTS.ADMIN_COUNT_APPROVED_ARTICLES, { headers });
          if (articleRes.ok && articleRes.status !== 401) {
            totalArticles = await articleRes.json();
          } else if (articleRes.status === 401) {
            await checkAndHandle401(articleRes);
            return;
          }
        } catch {
          // Silently handle error
        }

        setStats({
          totalRevenue,
          customerManagement: {
            totalCustomers: totalCustomers || 0
          },
          staffManagement: {
            totalStaff: totalStaff || 0
          },
          companyManagement: {
            totalCompanies: totalCompanies || 0
          },
          articleManagement: {
            totalArticles: totalArticles || 0
          },
          tourManagement: {
            totalTours: tourStats?.totalTours || 0,
            byStatus: tourStats?.byStatus || {}
          },
          bookingManagement: {
            totalBookings: bookingStats?.totalBookings || 0,
            byStatus: bookingStats?.byStatus || {}
          },
          monthlyBookingCount: monthlyBookingCount || {},
          completedBookings: completedBookings
        });
      } catch {
        // Silently handle error fetching dashboard data
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [getToken, balance]);

  // Format currency as KRW (VND / 18)
  const formatCurrency = (value) => {
    const krwValue = Math.round(Number(value) / 18);
    return new Intl.NumberFormat('ko-KR').format(krwValue) + ' KRW';
  };

  // Stats cards data
  const statsCards = [
    {
      name: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: '+15%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      borderColor: 'border-l-yellow-500'
    },
    {
      name: 'Customer Management',
      value: stats.customerManagement.totalCustomers,
      change: '+5%',
      changeType: 'positive',
      icon: UserIcon,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-l-blue-500'
    },
    {
      name: 'Staff Management',
      value: stats.staffManagement.totalStaff,
      change: '+3%',
      changeType: 'positive',
      icon: UserGroupIcon,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-l-purple-500'
    },
    {
      name: 'Company Management',
      value: stats.companyManagement.totalCompanies,
      change: '+8%',
      changeType: 'positive',
      icon: BuildingOfficeIcon,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-l-green-500'
    },
    {
      name: 'Article Management',
      value: stats.articleManagement.totalArticles,
      change: '+12%',
      changeType: 'positive',
      icon: DocumentTextIcon,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-l-indigo-500'
    },
    {
      name: 'Tour Management',
      value: stats.tourManagement.totalTours,
      change: '+10%',
      changeType: 'positive',
      icon: MapIcon,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-l-orange-500'
    }
  ];

  // Booking trend data (last 6 months from monthlyBookingCount)
  const getLast6MonthsData = () => {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const months = [];
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthNum = currentMonth - i;
      const monthKey = monthNum > 0 ? monthNum : monthNum + 12;
      months.push(monthKey);
      data.push(stats.monthlyBookingCount[monthKey] || 0);
    }
    
    return { months, data };
  };

  const { months: last6Months, data: last6MonthsData } = getLast6MonthsData();
  
  const monthNames = i18n.language === 'ko'
    ? ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    : i18n.language === 'en'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const bookingTrendData = {
    series: [{
      name: 'Bookings',
      data: last6MonthsData
    }],
    options: {
      chart: {
        type: 'line',
        height: 350,
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 3,
        colors: ['#4c9dff']
      },
      colors: ['#4c9dff'],
      xaxis: {
        categories: last6Months.map(m => monthNames[m - 1] || `Month ${m}`)
      },
      yaxis: {
        title: {
          text: i18n.language === 'ko' ? '수량' : i18n.language === 'en' ? 'Quantity' : 'Số lượng'
        }
      },
      grid: {
        borderColor: '#e7e7e7',
        row: {
          colors: ['#f3f3f3', 'transparent'],
          opacity: 0.5
        }
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val) => val + ' bookings'
        }
      }
    }
  };

  // Tour status distribution (from tour statistics byStatus)
  const tourStatusData = stats.tourManagement.byStatus || {};
  const tourStatusSeries = [
    tourStatusData.PUBLIC || 0,
    tourStatusData.NOT_APPROVED || 0,
    tourStatusData.DISABLED || 0
  ];
  const tourStatusLabels = i18n.language === 'ko'
    ? ['공개', '미승인', '비활성화']
    : i18n.language === 'en'
      ? ['Public', 'Not Approved', 'Disabled']
      : ['Công khai', 'Chưa duyệt', 'Vô hiệu hóa'];

  const tourCategoryData = {
    series: tourStatusSeries,
    options: {
      chart: {
        type: 'donut',
        height: 350
      },
      labels: tourStatusLabels,
      colors: ['#4c9dff', '#f59e0b', '#ef4444'],
      legend: {
        position: 'bottom',
        fontSize: '14px'
      },
      dataLabels: {
        enabled: true,
        formatter: function (val) {
          return Math.round(val) + '%';
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '16px',
                fontWeight: 600
              },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 700,
                formatter: function (val) {
                  return val + '%';
                }
              },
              total: {
                show: true,
                label: i18n.language === 'ko' ? '총 투어' : i18n.language === 'en' ? 'Total Tours' : 'Tổng Tour',
                fontSize: '14px',
                fontWeight: 600,
                formatter: function () {
                  return stats.tourManagement.totalTours || 0;
                }
              }
            }
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return val + (i18n.language === 'ko' ? ' 투어' : i18n.language === 'en' ? ' tours' : ' tour');
          }
        }
      }
    }
  };

  // Booking status data for cards (from booking statistics)
  const bookingStatusData = stats.bookingManagement.byStatus || {};
  const totalBookings = stats.bookingManagement.totalBookings || 0;
  
  const getBookingStatusCount = (status) => bookingStatusData[status] || 0;
  
  const bookingStatusCards = [
    {
      label: i18n.language === 'ko' ? '성공' : i18n.language === 'en' ? 'Success' : 'Thành công',
      value: getBookingStatusCount('BOOKING_SUCCESS') + getBookingStatusCount('BOOKING_BALANCE_SUCCESS'),
      percentage: totalBookings > 0
        ? Math.round(((getBookingStatusCount('BOOKING_SUCCESS') + getBookingStatusCount('BOOKING_BALANCE_SUCCESS')) / totalBookings) * 100)
        : 0,
      icon: CheckCircleIcon,
      color: '#4c9dff',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      label: i18n.language === 'ko' ? '대기 중' : i18n.language === 'en' ? 'Pending' : 'Đang chờ',
      value: getBookingStatusCount('PENDING_PAYMENT') + getBookingStatusCount('PENDING_DEPOSIT_PAYMENT') + getBookingStatusCount('PENDING_BALANCE_PAYMENT'),
      percentage: totalBookings > 0
        ? Math.round((((getBookingStatusCount('PENDING_PAYMENT') + getBookingStatusCount('PENDING_DEPOSIT_PAYMENT') + getBookingStatusCount('PENDING_BALANCE_PAYMENT')) / totalBookings) * 100))
        : 0,
      icon: ClockIcon,
      color: '#f59e0b',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200'
    },
    {
      label: i18n.language === 'ko' ? '취소됨' : i18n.language === 'en' ? 'Cancelled' : 'Đã hủy',
      value: getBookingStatusCount('CANCELLED'),
      percentage: totalBookings > 0
        ? Math.round((getBookingStatusCount('CANCELLED') / totalBookings) * 100)
        : 0,
      icon: XCircleIcon,
      color: '#ef4444',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200'
    }
  ];

  // Top countries data (mock data for map)
  const topCountries = i18n.language === 'ko'
    ? [
      { name: '베트남', code: 'VN', users: 1240, percentage: 80, coordinates: [108.2772, 14.0583] },
      { name: '한국', code: 'KR', users: 980, percentage: 65, coordinates: [127.7669, 35.9078] },
      { name: '일본', code: 'JP', users: 750, percentage: 50, coordinates: [138.2529, 36.2048] },
      { name: '태국', code: 'TH', users: 620, percentage: 42, coordinates: [100.9925, 15.8700] },
      { name: '싱가포르', code: 'SG', users: 450, percentage: 30, coordinates: [103.8198, 1.3521] }
    ]
    : i18n.language === 'en'
      ? [
        { name: 'Vietnam', code: 'VN', users: 1240, percentage: 80, coordinates: [108.2772, 14.0583] },
        { name: 'South Korea', code: 'KR', users: 980, percentage: 65, coordinates: [127.7669, 35.9078] },
        { name: 'Japan', code: 'JP', users: 750, percentage: 50, coordinates: [138.2529, 36.2048] },
        { name: 'Thailand', code: 'TH', users: 620, percentage: 42, coordinates: [100.9925, 15.8700] },
        { name: 'Singapore', code: 'SG', users: 450, percentage: 30, coordinates: [103.8198, 1.3521] }
      ]
      : [
        { name: 'Việt Nam', code: 'VN', users: 1240, percentage: 80, coordinates: [108.2772, 14.0583] },
        { name: 'Hàn Quốc', code: 'KR', users: 980, percentage: 65, coordinates: [127.7669, 35.9078] },
        { name: 'Nhật Bản', code: 'JP', users: 750, percentage: 50, coordinates: [138.2529, 36.2048] },
        { name: 'Thái Lan', code: 'TH', users: 620, percentage: 42, coordinates: [100.9925, 15.8700] },
        { name: 'Singapore', code: 'SG', users: 450, percentage: 30, coordinates: [103.8198, 1.3521] }
      ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c9dff]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Page header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.dashboard.title')}</h1>
        <p className="mt-2 text-gray-600">{t('admin.dashboard.subtitle')}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className={`bg-white rounded-lg shadow-sm border-l-4 ${stat.borderColor} hover:shadow-md transition-shadow duration-200`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <div className={`mt-2 flex items-center text-sm font-semibold ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {stat.changeType === 'positive' ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      <span>{stat.change}</span>
                      <span className="ml-1 text-gray-500 text-xs">{t('admin.dashboard.changeFromLastMonth')}</span>
                    </div>
                  </div>
                  <div className={`${stat.bgColor} p-4 rounded-lg`}>
                    <Icon className={`h-8 w-8 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Trend */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Booking Trend</h3>
            <span className="text-sm text-gray-500">Last 6 months</span>
          </div>
          <Chart
            options={bookingTrendData.options}
            series={bookingTrendData.series}
            type="line"
            height={350}
          />
        </div>

        {/* Tour Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tour Status</h3>
            <span className="text-sm text-gray-500">Total: {stats.tourManagement.totalTours || 0} tours</span>
          </div>
          <Chart
            options={tourCategoryData.options}
            series={tourCategoryData.series}
            type="donut"
            height={350}
          />
        </div>
      </div>

      {/* Booking Status Cards - Redesigned */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Booking Status</h3>
            <p className="text-sm text-gray-500 mt-1">Total: {stats.bookingManagement.totalBookings || 0} bookings</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bookingStatusCards.map((status) => {
            const Icon = status.icon;
            return (
              <div
                key={status.label}
                className={`border-2 ${status.borderColor} rounded-xl p-6 hover:shadow-lg transition-all duration-200 ${status.bgColor}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${status.bgColor}`}>
                    <Icon className={`h-6 w-6 ${status.iconColor}`} />
                  </div>
                  <span className={`text-2xl font-bold ${status.iconColor}`}>
                    {status.percentage}%
                  </span>
                </div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">{status.label}</h4>
                <p className="text-3xl font-bold text-gray-900 mb-4">{status.value}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500`}
                    style={{
                      width: `${status.percentage}%`,
                      backgroundColor: status.color
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* World Map Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GlobeAltIcon className="h-5 w-5 text-[#4c9dff]" />
              {t('admin.dashboard.worldMap.title')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{t('admin.dashboard.worldMap.subtitle')}</p>
          </div>
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>{t('admin.dashboard.worldMap.timeFilter.today')}</option>
            <option>{t('admin.dashboard.worldMap.timeFilter.thisWeek')}</option>
            <option>{t('admin.dashboard.worldMap.timeFilter.thisMonth')}</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* World Map */}
          <div className="relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <button className="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-lg shadow-sm border border-gray-200 transition-colors">
                <span className="text-lg font-bold">+</span>
              </button>
              <button className="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-lg shadow-sm border border-gray-200 transition-colors">
                <span className="text-lg font-bold">−</span>
              </button>
            </div>
            <ComposableMap
              projectionConfig={{
                scale: 150,
                center: [120, 10]
              }}
              style={{ width: '100%', height: '400px' }}
            >
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const isHighlighted = geo.properties.ISO_A2 === 'VN' || geo.properties.ISO_A2 === 'KR';
                    return (
                      <Geography
                        key={geo.rsmKey || geo.properties.ISO_A3 || geo.properties.name}
                        geography={geo}
                        fill={isHighlighted ? '#2979FF' : '#E5E7EB'}
                        stroke={isHighlighted ? '#1976D2' : '#D1D5DB'}
                        strokeWidth={isHighlighted ? 1.5 : 0.5}
                        style={{
                          default: {
                            outline: 'none',
                            transition: 'all 0.3s ease'
                          },
                          hover: {
                            fill: isHighlighted ? '#1976D2' : '#D1D5DB',
                            outline: 'none',
                            cursor: 'pointer'
                          },
                          pressed: {
                            outline: 'none'
                          }
                        }}
                      />
                    );
                  })
                }
              </Geographies>
              {topCountries.map((country) => (
                <Marker key={country.code} coordinates={country.coordinates}>
                  <circle
                    r={8}
                    fill="#2979FF"
                    stroke="#fff"
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                  />
                </Marker>
              ))}
            </ComposableMap>
          </div>

          {/* Country List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {topCountries.map((country) => (
              <div
                key={country.code}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600">
                    {country.code}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{country.name}</h4>
                    <p className="text-sm text-gray-500">{country.users.toLocaleString()} {t('admin.dashboard.worldMap.users')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${country.percentage}%`,
                        backgroundColor: country.code === 'VN' || country.code === 'KR'
                          ? '#2979FF'
                          : '#36C2A8'
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                    {country.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Completed Tours</p>
              <p className="text-3xl font-bold">{stats.completedBookings || 0}</p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Companies</p>
              <p className="text-3xl font-bold">{stats.companyManagement.totalCompanies || 0}</p>
            </div>
            <BuildingOfficeIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Completion Rate</p>
              <p className="text-3xl font-bold">
                {stats.bookingManagement.totalBookings > 0
                  ? Math.round((stats.completedBookings / stats.bookingManagement.totalBookings) * 100)
                  : 0}%
              </p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
