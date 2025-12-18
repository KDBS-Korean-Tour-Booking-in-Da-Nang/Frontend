import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Chart from 'react-apexcharts';
import {
  MapPin,
  DollarSign,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  Globe,
  User,
  FileText,
  Clock,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { API_ENDPOINTS, createAuthHeaders } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import { useAuth } from '../../../contexts/AuthContext';
import worldMapData from '../../../assets/data/world-110m.json';

// World map geo data import local để tránh CORS issues
const geoData = worldMapData;

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  // Khởi tạo balance từ user object nếu có: nếu user.role === 'ADMIN' và user.balance !== undefined/null thì dùng user.balance, nếu không trả về null
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

  // Đồng bộ balance với user object khi user thay đổi: nếu user.role === 'ADMIN' và user.balance có giá trị thì set balance, nếu balance vẫn null (initial state) thì set = 0, nếu không phải ADMIN thì set null
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      if (user.balance !== undefined && user.balance !== null) {
        setBalance(user.balance);
      } else if (balance === null) {
        setBalance(0);
      }
    } else {
      setBalance(null);
    }
  }, [user?.balance, user?.role]);

  // Lắng nghe balance update events: nếu balance được provide trong event thì dùng trực tiếp, nếu không thì refresh từ user object
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      return;
    }

    const handleBalanceUpdate = (event) => {
      if (event.detail?.balance !== undefined) {
        setBalance(event.detail.balance);
      } else {
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

        const totalRevenue = balance !== null ? balance : 0;

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

        const completedBookings = bookingStats.byStatus?.BOOKING_SUCCESS || bookingStats.byStatus?.BOOKING_BALANCE_SUCCESS || 0;

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
        // Silently handle error
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [getToken, balance]);

  // Format currency sang KRW: chia VND cho 18 và format với Intl.NumberFormat ko-KR
  const formatCurrency = (value) => {
    const krwValue = Math.round(Number(value) / 18);
    return new Intl.NumberFormat('ko-KR').format(krwValue) + ' KRW';
  };

  // Stats cards data với pastel colors: định nghĩa các card hiển thị total revenue, customer management, staff management, company management, article management, tour management với icon, màu sắc và giá trị tương ứng
  const statsCards = [
    {
      name: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: '+15%',
      changeType: 'positive',
      icon: DollarSign,
      bgColor: '#FFF4E6',
      iconColor: '#FFB84D',
      borderColor: '#FFE5CC'
    },
    {
      name: 'Customer Management',
      value: stats.customerManagement.totalCustomers,
      change: '+5%',
      changeType: 'positive',
      icon: User,
      bgColor: '#E6F3FF',
      iconColor: '#66B3FF',
      borderColor: '#CCE6FF'
    },
    {
      name: 'Staff Management',
      value: stats.staffManagement.totalStaff,
      change: '+3%',
      changeType: 'positive',
      icon: Users,
      bgColor: '#F0E6FF',
      iconColor: '#B380FF',
      borderColor: '#E0CCFF'
    },
    {
      name: 'Company Management',
      value: stats.companyManagement.totalCompanies,
      change: '+8%',
      changeType: 'positive',
      icon: Building2,
      bgColor: '#E8F5E9',
      iconColor: '#8BC34A',
      borderColor: '#C8E6C9'
    },
    {
      name: 'Article Management',
      value: stats.articleManagement.totalArticles,
      change: '+12%',
      changeType: 'positive',
      icon: FileText,
      bgColor: '#E6E6FF',
      iconColor: '#8080FF',
      borderColor: '#CCCCFF'
    },
    {
      name: 'Tour Management',
      value: stats.tourManagement.totalTours,
      change: '+10%',
      changeType: 'positive',
      icon: MapPin,
      bgColor: '#FFE6F0',
      iconColor: '#FF80B3',
      borderColor: '#FFCCE0'
    }
  ];

  // Booking trend data (last 6 tháng từ monthlyBookingCount): tính currentMonth, tạo array 6 tháng gần nhất, lấy data từ monthlyBookingCount cho mỗi tháng
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
        width: 2.5,
        colors: ['#66B3FF']
      },
      colors: ['#66B3FF'],
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

  // Tour status distribution từ tour statistics byStatus: tạo series và labels cho donut chart (PUBLIC, NOT_APPROVED, DISABLED), format labels theo i18n language
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
      colors: ['#66B3FF', '#FFB84D', '#FF80B3'],
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

  // Booking status data cho cards từ booking statistics: lấy counts cho các status (BOOKING_SUCCESS, BOOKING_BALANCE_SUCCESS, BOOKING_PENDING, BOOKING_CANCELLED), tính percentage và tạo cards với pastel colors
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
      icon: CheckCircle2,
      bgColor: '#E6F3FF',
      iconColor: '#66B3FF',
      borderColor: '#CCE6FF'
    },
    {
      label: i18n.language === 'ko' ? '대기 중' : i18n.language === 'en' ? 'Pending' : 'Đang chờ',
      value: getBookingStatusCount('PENDING_PAYMENT') + getBookingStatusCount('PENDING_DEPOSIT_PAYMENT') + getBookingStatusCount('PENDING_BALANCE_PAYMENT'),
      percentage: totalBookings > 0
        ? Math.round((((getBookingStatusCount('PENDING_PAYMENT') + getBookingStatusCount('PENDING_DEPOSIT_PAYMENT') + getBookingStatusCount('PENDING_BALANCE_PAYMENT')) / totalBookings) * 100))
        : 0,
      icon: Clock,
      bgColor: '#FFF4E6',
      iconColor: '#FFB84D',
      borderColor: '#FFE5CC'
    },
    {
      label: i18n.language === 'ko' ? '취소됨' : i18n.language === 'en' ? 'Cancelled' : 'Đã hủy',
      value: getBookingStatusCount('CANCELLED'),
      percentage: totalBookings > 0
        ? Math.round((getBookingStatusCount('CANCELLED') / totalBookings) * 100)
        : 0,
      icon: XCircle,
      bgColor: '#FFE6F0',
      iconColor: '#FF80B3',
      borderColor: '#FFCCE0'
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66B3FF]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-[#FAFAFA] min-h-screen">
      {/* Page header */}
      <div className="bg-white rounded-[24px] shadow-sm p-8 border border-[#F0F0F0]">
        <h1 className="text-3xl font-semibold text-gray-800">{t('admin.dashboard.title')}</h1>
        <p className="mt-2 text-gray-500">{t('admin.dashboard.subtitle')}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-[28px] shadow-sm border border-[#F0F0F0] hover:shadow-md transition-all duration-300"
              style={{ backgroundColor: stat.bgColor }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-800 mb-2">{stat.value}</p>
                    <div className={`mt-2 flex items-center text-sm font-medium ${stat.changeType === 'positive' ? 'text-[#4DD0E1]' : 'text-[#FF80B3]'
                      }`}>
                      {stat.changeType === 'positive' ? (
                        <ArrowUp className="h-4 w-4 mr-1" strokeWidth={2} />
                      ) : (
                        <ArrowDown className="h-4 w-4 mr-1" strokeWidth={2} />
                      )}
                      <span>{stat.change}</span>
                      <span className="ml-1 text-gray-400 text-xs">{t('admin.dashboard.changeFromLastMonth')}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-[20px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                    <Icon className="h-7 w-7" style={{ color: stat.iconColor }} strokeWidth={1.5} />
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
        <div className="bg-white rounded-[28px] shadow-sm p-6 border border-[#F0F0F0]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Booking Trend</h3>
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
        <div className="bg-white rounded-[28px] shadow-sm p-6 border border-[#F0F0F0]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Tour Status</h3>
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
      <div className="bg-white rounded-[28px] shadow-sm p-6 border border-[#F0F0F0]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Booking Status</h3>
            <p className="text-sm text-gray-500 mt-1">Total: {stats.bookingManagement.totalBookings || 0} bookings</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bookingStatusCards.map((status) => {
            const Icon = status.icon;
            return (
              <div
                key={status.label}
                className="rounded-[28px] p-6 hover:shadow-lg transition-all duration-300 border"
                style={{
                  backgroundColor: status.bgColor,
                  borderColor: status.borderColor
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-[20px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                    <Icon className="h-6 w-6" style={{ color: status.iconColor }} strokeWidth={1.5} />
                  </div>
                  <span className="text-2xl font-semibold" style={{ color: status.iconColor }}>
                    {status.percentage}%
                  </span>
                </div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">{status.label}</h4>
                <p className="text-3xl font-semibold text-gray-800 mb-4">{status.value}</p>
                <div className="w-full bg-white/50 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${status.percentage}%`,
                      backgroundColor: status.iconColor
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* World Map Section */}
      <div className="bg-white rounded-[28px] shadow-sm p-6 border border-[#F0F0F0]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Globe className="h-5 w-5" style={{ color: '#66B3FF' }} strokeWidth={1.5} />
              {t('admin.dashboard.worldMap.title')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{t('admin.dashboard.worldMap.subtitle')}</p>
          </div>
          <select className="text-sm border border-[#E0E0E0] rounded-[20px] px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white">
            <option>{t('admin.dashboard.worldMap.timeFilter.today')}</option>
            <option>{t('admin.dashboard.worldMap.timeFilter.thisWeek')}</option>
            <option>{t('admin.dashboard.worldMap.timeFilter.thisMonth')}</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* World Map */}
          <div className="relative bg-[#FAFAFA] rounded-[24px] overflow-hidden border border-[#E0E0E0]">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <button className="bg-white hover:bg-[#F5F5F5] text-gray-700 p-2 rounded-[16px] shadow-sm border border-[#E0E0E0] transition-colors">
                <span className="text-lg font-semibold">+</span>
              </button>
              <button className="bg-white hover:bg-[#F5F5F5] text-gray-700 p-2 rounded-[16px] shadow-sm border border-[#E0E0E0] transition-colors">
                <span className="text-lg font-semibold">−</span>
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
                        fill={isHighlighted ? '#66B3FF' : '#F0F0F0'}
                        stroke={isHighlighted ? '#4DA3FF' : '#E0E0E0'}
                        strokeWidth={isHighlighted ? 1.5 : 0.5}
                        style={{
                          default: {
                            outline: 'none',
                            transition: 'all 0.3s ease'
                          },
                          hover: {
                            fill: isHighlighted ? '#4DA3FF' : '#E0E0E0',
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
                    fill="#66B3FF"
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
                className="flex items-center justify-between p-4 bg-[#FAFAFA] rounded-[24px] hover:bg-[#F5F5F5] transition-colors border border-[#E0E0E0]"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-[16px] bg-white border-2 border-[#E0E0E0] flex items-center justify-center text-lg font-semibold text-gray-600">
                    {country.code}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{country.name}</h4>
                    <p className="text-sm text-gray-500">{country.users.toLocaleString()} {t('admin.dashboard.worldMap.users')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-white/60 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${country.percentage}%`,
                        backgroundColor: country.code === 'VN' || country.code === 'KR'
                          ? '#66B3FF'
                          : '#8BC34A'
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
        <div className="rounded-[28px] shadow-sm p-6 border border-[#E0E0E0]" style={{ backgroundColor: '#E6F3FF' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#4D8FCC' }}>Completed Tours</p>
              <p className="text-3xl font-semibold text-gray-800">{stats.completedBookings || 0}</p>
            </div>
            <CheckCircle2 className="h-12 w-12" style={{ color: '#66B3FF' }} strokeWidth={1.5} />
          </div>
        </div>

        <div className="rounded-[28px] shadow-sm p-6 border border-[#E0E0E0]" style={{ backgroundColor: '#E8F5E9' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#8BC34A' }}>Companies</p>
              <p className="text-3xl font-semibold text-gray-800">{stats.companyManagement.totalCompanies || 0}</p>
            </div>
            <Building2 className="h-12 w-12" style={{ color: '#8BC34A' }} strokeWidth={1.5} />
          </div>
        </div>

        <div className="rounded-[28px] shadow-sm p-6 border border-[#E0E0E0]" style={{ backgroundColor: '#F0E6FF' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#9966CC' }}>Completion Rate</p>
              <p className="text-3xl font-semibold text-gray-800">
                {stats.bookingManagement.totalBookings > 0
                  ? Math.round((stats.completedBookings / stats.bookingManagement.totalBookings) * 100)
                  : 0}%
              </p>
            </div>
            <DollarSign className="h-12 w-12" style={{ color: '#B380FF' }} strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
