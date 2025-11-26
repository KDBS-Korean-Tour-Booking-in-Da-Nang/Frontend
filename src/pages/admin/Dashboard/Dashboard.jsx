import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import {
  MapIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  EyeIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { API_ENDPOINTS } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import worldMapData from '../../../assets/data/world-110m.json';

// World map geo data imported locally to avoid CORS issues
const geoData = worldMapData;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTours: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    activeTours: 0,
    pendingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalCompanies: 0
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const remembered = localStorage.getItem('rememberMe') === 'true';
        const storage = remembered ? localStorage : sessionStorage;
        const token = storage.getItem('token');

        if (!token) {
          setLoading(false);
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch all tours
        const toursRes = await fetch(API_ENDPOINTS.TOURS, { headers });
        
        // Handle 401 if token expired
        if (!toursRes.ok && toursRes.status === 401) {
          await checkAndHandle401(toursRes);
          return;
        }
        
        const tours = toursRes.ok ? await toursRes.json() : [];
        const toursArray = Array.isArray(tours) ? tours : [];

        // Fetch all users
        const usersRes = await fetch(API_ENDPOINTS.USERS, { headers });
        
        // Handle 401 if token expired
        if (!usersRes.ok && usersRes.status === 401) {
          await checkAndHandle401(usersRes);
          return;
        }
        
        const users = usersRes.ok ? await usersRes.json() : [];
        const usersArray = Array.isArray(users) ? users : [];
        
        // Extract users from API response if wrapped
        const allUsers = usersArray.result || usersArray;
        const usersList = Array.isArray(allUsers) ? allUsers : [];

        // Fetch bookings - we'll need to aggregate from all users
        // For now, we'll use a mock approach or fetch from a summary endpoint if available
        let bookingsArray = [];
        try {
          // Try to fetch bookings for a few sample users or use a different approach
          // This is a limitation - ideally there should be an admin endpoint for all bookings
          // For now, we'll calculate from available data
        } catch (e) {
          console.error('Error fetching bookings:', e);
        }

        // Calculate stats
        const totalTours = toursArray.length;
        const activeTours = toursArray.filter(t => t.status === 'ACTIVE' || !t.status).length;
        const totalUsers = usersList.length;
        const totalCompanies = usersList.filter(u => u.role === 'COMPANY').length;
        
        // Calculate tour categories
        const tourCategories = {
          domestic: toursArray.filter(t => t.category === 'domestic').length,
          international: toursArray.filter(t => t.category === 'international').length,
          day: toursArray.filter(t => t.category === 'day' || !t.category).length
        };

        // Mock booking data for demonstration
        // In production, this should come from an admin API endpoint
        const mockBookings = [];
        const mockTotalBookings = Math.floor(totalTours * 2.5); // Estimate
        const mockPendingBookings = Math.floor(mockTotalBookings * 0.15);
        const mockCompletedBookings = Math.floor(mockTotalBookings * 0.75);
        const mockCancelledBookings = Math.floor(mockTotalBookings * 0.10);
        const mockTotalRevenue = mockCompletedBookings * 2500000; // Average booking value

        setStats({
          totalTours,
          totalBookings: mockTotalBookings,
          totalRevenue: mockTotalRevenue,
          totalUsers,
          activeTours,
          pendingBookings: mockPendingBookings,
          completedBookings: mockCompletedBookings,
          cancelledBookings: mockCancelledBookings,
          totalCompanies,
          tourCategories
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  };

  // Stats cards data
  const statsCards = [
    {
      name: 'Tổng số Tour',
      value: stats.totalTours,
      change: '+12%',
      changeType: 'positive',
      icon: MapIcon,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-l-blue-500'
    },
    {
      name: 'Tổng số Đặt Tour',
      value: stats.totalBookings,
      change: '+8%',
      changeType: 'positive',
      icon: ClipboardDocumentListIcon,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-l-green-500'
    },
    {
      name: 'Tổng Doanh Thu',
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
      name: 'Tổng số Người Dùng',
      value: stats.totalUsers,
      change: '+5%',
      changeType: 'positive',
      icon: UserGroupIcon,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-l-purple-500'
    },
    {
      name: 'Tour Đang Hoạt Động',
      value: stats.activeTours,
      change: '+3%',
      changeType: 'positive',
      icon: EyeIcon,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'border-l-indigo-500'
    },
    {
      name: 'Đặt Tour Đang Chờ',
      value: stats.pendingBookings,
      change: '-2%',
      changeType: 'negative',
      icon: ClockIcon,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-l-orange-500'
    }
  ];

  // Booking trend data (last 6 months)
  const bookingTrendData = {
    series: [{
      name: 'Số lượng đặt tour',
      data: [45, 52, 48, 61, 55, 67]
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
        width: 3
      },
      colors: ['#2979FF'],
      xaxis: {
        categories: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6']
      },
      yaxis: {
        title: {
          text: 'Số lượng'
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
        theme: 'light'
      }
    }
  };

  // Tour category distribution
  const tourCategoryData = {
    series: [
      stats.tourCategories?.domestic || 0,
      stats.tourCategories?.international || 0,
      stats.tourCategories?.day || 0
    ],
    options: {
      chart: {
        type: 'donut',
        height: 350
      },
      labels: ['Trong nước', 'Nước ngoài', 'Trong ngày'],
      colors: ['#2979FF', '#36C2A8', '#6EDDCB'],
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
                label: 'Tổng Tour',
                fontSize: '14px',
                fontWeight: 600,
                formatter: function () {
                  return stats.totalTours;
                }
              }
            }
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return val + ' tour';
          }
        }
      }
    }
  };

  // Booking status data for cards
  const bookingStatusCards = [
    {
      label: 'Hoàn thành',
      value: stats.completedBookings,
      percentage: stats.totalBookings > 0 
        ? Math.round((stats.completedBookings / stats.totalBookings) * 100) 
        : 0,
      icon: CheckCircleIcon,
      color: '#2979FF',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      label: 'Đang chờ',
      value: stats.pendingBookings,
      percentage: stats.totalBookings > 0 
        ? Math.round((stats.pendingBookings / stats.totalBookings) * 100) 
        : 0,
      icon: ClockIcon,
      color: '#36C2A8',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    {
      label: 'Đã hủy',
      value: stats.cancelledBookings,
      percentage: stats.totalBookings > 0 
        ? Math.round((stats.cancelledBookings / stats.totalBookings) * 100) 
        : 0,
      icon: XCircleIcon,
      color: '#6EDDCB',
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-600',
      borderColor: 'border-teal-200'
    }
  ];

  // Top countries data (mock data for map)
  const topCountries = [
    { name: 'Việt Nam', code: 'VN', users: 1240, percentage: 80, coordinates: [108.2772, 14.0583] },
    { name: 'Hàn Quốc', code: 'KR', users: 980, percentage: 65, coordinates: [127.7669, 35.9078] },
    { name: 'Nhật Bản', code: 'JP', users: 750, percentage: 50, coordinates: [138.2529, 36.2048] },
    { name: 'Thái Lan', code: 'TH', users: 620, percentage: 42, coordinates: [100.9925, 15.8700] },
    { name: 'Singapore', code: 'SG', users: 450, percentage: 30, coordinates: [103.8198, 1.3521] }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Page header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Quản Trị</h1>
        <p className="mt-2 text-gray-600">Tổng quan về hệ thống quản lý tour và đặt tour</p>
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
                    <div className={`mt-2 flex items-center text-sm font-semibold ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.changeType === 'positive' ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      <span>{stat.change}</span>
                      <span className="ml-1 text-gray-500 text-xs">so với tháng trước</span>
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
            <h3 className="text-lg font-semibold text-gray-900">Xu hướng Đặt Tour</h3>
            <span className="text-sm text-gray-500">6 tháng gần nhất</span>
          </div>
          <Chart
            options={bookingTrendData.options}
            series={bookingTrendData.series}
            type="line"
            height={350}
          />
        </div>

        {/* Tour Category Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Phân Loại Tour</h3>
            <span className="text-sm text-gray-500">Tổng: {stats.totalTours} tour</span>
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
            <h3 className="text-lg font-semibold text-gray-900">Trạng Thái Đặt Tour</h3>
            <p className="text-sm text-gray-500 mt-1">Tổng: {stats.totalBookings} đặt tour</p>
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
              <GlobeAltIcon className="h-5 w-5 text-blue-600" />
              Top Quốc Gia
            </h3>
            <p className="text-sm text-gray-500 mt-1">Phân bố người dùng theo quốc gia</p>
          </div>
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Hôm nay</option>
            <option>Tuần này</option>
            <option>Tháng này</option>
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
            {topCountries.map((country, index) => (
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
                    <p className="text-sm text-gray-500">{country.users.toLocaleString()} Users</p>
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
              <p className="text-blue-100 text-sm font-medium mb-1">Tour Hoàn Thành</p>
              <p className="text-3xl font-bold">{stats.completedBookings}</p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Doanh Nghiệp</p>
              <p className="text-3xl font-bold">{stats.totalCompanies}</p>
            </div>
            <BuildingOfficeIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Tỷ Lệ Hoàn Thành</p>
              <p className="text-3xl font-bold">
                {stats.totalBookings > 0
                  ? Math.round((stats.completedBookings / stats.totalBookings) * 100)
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
