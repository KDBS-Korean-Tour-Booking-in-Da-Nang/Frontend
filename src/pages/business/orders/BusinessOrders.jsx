import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const BusinessOrders = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState([]);

  // Check if user has business role
  const isBusinessUser = user && (user.role === 'COMPANY' || user.role === 'company');
  
  if (!isBusinessUser) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Truy cập bị từ chối</h1>
          <p className="text-gray-600">Bạn cần có quyền business để truy cập trang này.</p>
        </div>
      </div>
    );
  }

  // Mock data - in real app, this would come from API
  const orders = [
    {
      id: 'ORD-001',
      tourName: 'Tour Đà Lạt 3N2Đ',
      customerName: 'Nguyễn Văn A',
      customerEmail: 'nguyenvana@email.com',
      customerPhone: '0123456789',
      bookingDate: '2024-01-15',
      tourDate: '2024-02-01',
      participants: 2,
      totalAmount: 5000000,
      status: 'confirmed',
      paymentStatus: 'paid'
    },
    {
      id: 'ORD-002',
      tourName: 'Tour Sapa 2N1Đ',
      customerName: 'Trần Thị B',
      customerEmail: 'tranthib@email.com',
      customerPhone: '0987654321',
      bookingDate: '2024-01-14',
      tourDate: '2024-01-25',
      participants: 4,
      totalAmount: 7200000,
      status: 'pending',
      paymentStatus: 'pending'
    },
    {
      id: 'ORD-003',
      tourName: 'Tour Hạ Long 2N1Đ',
      customerName: 'Lê Văn C',
      customerEmail: 'levanc@email.com',
      customerPhone: '0369852147',
      bookingDate: '2024-01-13',
      tourDate: '2024-01-30',
      participants: 1,
      totalAmount: 3200000,
      status: 'cancelled',
      paymentStatus: 'refunded'
    },
    {
      id: 'ORD-004',
      tourName: 'Tour Nha Trang 3N2Đ',
      customerName: 'Phạm Thị D',
      customerEmail: 'phamthid@email.com',
      customerPhone: '0741852963',
      bookingDate: '2024-01-12',
      tourDate: '2024-02-10',
      participants: 3,
      totalAmount: 5400000,
      status: 'confirmed',
      paymentStatus: 'paid'
    }
  ];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.tourName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (orderId, newStatus) => {
    // In real app, this would make an API call
    console.log(`Changing order ${orderId} status to ${newStatus}`);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã xác nhận' },
      pending: { bg: 'bg-secondary', text: 'text-primary', label: 'Chờ xử lý' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Đã hủy' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã thanh toán' },
      pending: { bg: 'bg-secondary', text: 'text-primary', label: 'Chờ thanh toán' },
      refunded: { bg: 'bg-secondary', text: 'text-primary', label: 'Đã hoàn tiền' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
        <p className="text-gray-600 mt-2">Xem và xử lý các đơn đặt tour</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên tour, khách hàng hoặc mã đơn hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã đơn hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tour
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tour
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số người
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thanh toán
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.id}</div>
                    <div className="text-sm text-gray-500">{order.bookingDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.tourName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerEmail}</div>
                    <div className="text-sm text-gray-500">{order.customerPhone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.tourDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.participants} người</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.totalAmount.toLocaleString('vi-VN')} VND
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPaymentStatusBadge(order.paymentStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="text-primary hover:text-primary-hover">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {order.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusChange(order.id, 'confirmed')}
                            className="text-green-600 hover:text-green-900"
                            title="Xác nhận"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleStatusChange(order.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900"
                            title="Hủy"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <ClockIcon className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không có đơn hàng nào</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Không tìm thấy đơn hàng phù hợp với bộ lọc' 
                : 'Chưa có đơn đặt tour nào'
              }
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">
            {filteredOrders.filter(o => o.status === 'confirmed').length}
          </div>
          <div className="text-sm text-gray-600">Đã xác nhận</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-primary">
            {filteredOrders.filter(o => o.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Chờ xử lý</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">
            {filteredOrders.reduce((sum, o) => sum + o.participants, 0)}
          </div>
          <div className="text-sm text-gray-600">Tổng khách</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {filteredOrders
              .filter(o => o.status === 'confirmed')
              .reduce((sum, o) => sum + o.totalAmount, 0)
              .toLocaleString('vi-VN')} VND
          </div>
          <div className="text-sm text-gray-600">Doanh thu</div>
        </div>
      </div>
    </div>
  );
};

export default BusinessOrders;
