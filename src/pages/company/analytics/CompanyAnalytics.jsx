import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const CompanyAnalytics = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30days');

  // Check if user has company role
  const isBusinessUser = user && user.role === 'COMPANY';
  
  if (!isBusinessUser) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Truy cập bị từ chối</h1>
          <p className="text-gray-600">Bạn cần có quyền company để truy cập trang này.</p>
        </div>
      </div>
    );
  }

  // Mock data - in real app, this would come from API
  const stats = {
    totalRevenue: 12500000,
    totalBookings: 156,
    totalTours: 12,
    averageRating: 4.8,
    monthlyRevenue: [
      { month: 'Tháng 1', revenue: 2000000 },
      { month: 'Tháng 2', revenue: 2500000 },
      { month: 'Tháng 3', revenue: 3000000 },
      { month: 'Tháng 4', revenue: 5000000 }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Thống kê & Báo cáo</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">Theo dõi hiệu suất kinh doanh và doanh thu</p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium ${
              timeRange === '7days' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 ngày qua
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium ${
              timeRange === '30days' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 ngày qua
          </button>
          <button
            onClick={() => setTimeRange('90days')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium ${
              timeRange === '90days' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            90 ngày qua
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <div className="flex items-center">
            <div className="p-1 sm:p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Tổng doanh thu</p>
              <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900">
                {stats.totalRevenue.toLocaleString('vi-VN')} VND
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <div className="flex items-center">
            <div className="p-1 sm:p-2 bg-secondary rounded-lg">
              <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Tổng đơn hàng</p>
              <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <div className="flex items-center">
            <div className="p-1 sm:p-2 bg-secondary rounded-lg">
              <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Tổng tours</p>
              <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900">{stats.totalTours}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <div className="flex items-center">
            <div className="p-1 sm:p-2 bg-secondary rounded-lg">
              <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Đánh giá trung bình</p>
              <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900">{stats.averageRating}/5.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Doanh thu theo tháng</h3>
          <div className="space-y-3 sm:space-y-4">
            {stats.monthlyRevenue.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">{item.month}</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-20 sm:w-28 lg:w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(item.revenue / Math.max(...stats.monthlyRevenue.map(r => r.revenue))) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 w-16 sm:w-20 text-right">
                    {item.revenue.toLocaleString('vi-VN')} VND
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Đơn hàng gần đây</h3>
          <div className="space-y-2 sm:space-y-3">
            {[
              { tour: 'Tour Đà Lạt 3N2Đ', customer: 'Nguyễn Văn A', amount: 2500000, status: 'confirmed' },
              { tour: 'Tour Sapa 2N1Đ', customer: 'Trần Thị B', amount: 1800000, status: 'pending' },
              { tour: 'Tour Hạ Long 2N1Đ', customer: 'Lê Văn C', amount: 3200000, status: 'confirmed' },
            ].map((booking, index) => (
              <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-900">{booking.tour}</p>
                  <p className="text-xs sm:text-sm text-gray-600">{booking.customer}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-medium text-gray-900">{booking.amount.toLocaleString('vi-VN')} VND</p>
                  <span className={`text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                    booking.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-secondary text-primary'
                  }`}>
                    {booking.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xử lý'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Tours */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Tours phổ biến nhất</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[
            { name: 'Tour Đà Lạt 3N2Đ', bookings: 45, revenue: 112500000 },
            { name: 'Tour Sapa 2N1Đ', bookings: 38, revenue: 68400000 },
            { name: 'Tour Hạ Long 2N1Đ', bookings: 32, revenue: 102400000 },
          ].map((tour, index) => (
            <div key={index} className="p-3 sm:p-4 border border-gray-200 rounded-lg">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-1 sm:mb-2">{tour.name}</h4>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">{tour.bookings} đơn hàng</p>
              <p className="text-xs sm:text-sm font-medium text-green-600">
                {tour.revenue.toLocaleString('vi-VN')} VND
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompanyAnalytics;
