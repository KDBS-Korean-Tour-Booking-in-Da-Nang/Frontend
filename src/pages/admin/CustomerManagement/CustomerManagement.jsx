import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders, getAvatarUrl } from '../../../config/api';
import {
  UsersIcon,
  UserCircleIcon,
  StarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  EyeIcon,
  PencilIcon,
  NoSymbolIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

const CustomerManagement = () => {
  const { getToken } = useAuth();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBookings, setUserBookings] = useState({}); // Map email -> booking data

  // Fetch customers (users with role USER) from API
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      
      if (!token) {
        setError('Vui lòng đăng nhập lại');
        setLoading(false);
        return;
      }

      const headers = createAuthHeaders(token);

      const response = await fetch(API_ENDPOINTS.USERS, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const users = data.result || data || [];
      
      // Filter users with role USER (exclude ADMIN, STAFF, COMPANY)
      const customerUsers = users.filter(user => {
        const role = (user.role || '').toUpperCase();
        return role === 'USER';
      });

      // Map backend data to frontend format
      const mappedCustomers = customerUsers.map(user => {
        const bookingData = userBookings[user.email] || { totalBookings: 0, lifetimeValue: 0, lastBooking: null };
        
        // Calculate tier based on lifetime value (if available)
        let tier = 'Bronze';
        if (bookingData.lifetimeValue >= 50_000_000) tier = 'VIP';
        else if (bookingData.lifetimeValue >= 30_000_000) tier = 'Gold';
        else if (bookingData.lifetimeValue >= 15_000_000) tier = 'Silver';

        return {
          id: `CUS-${user.userId}`,
          userId: user.userId,
          name: user.username || 'N/A',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || '',
          country: user.address ? (user.address.includes('Việt Nam') || user.address.includes('Vietnam') ? 'Việt Nam' : 'Nước ngoài') : 'N/A',
          city: user.address ? user.address.split(',')[0] : 'N/A',
          tier: tier,
          status: (user.status || '').toUpperCase() === 'BANNED' ? 'inactive' : 'active',
          totalBookings: bookingData.totalBookings,
          lifetimeValue: bookingData.lifetimeValue,
          lastBooking: bookingData.lastBooking,
          avatar: getAvatarUrl(user.avatar),
          createdAt: user.createdAt
        };
      });

      setCustomers(mappedCustomers);

      // Fetch booking data for each customer (optional, can be done in background)
      fetchBookingDataForUsers(customerUsers.map(u => u.email));
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Không thể tải danh sách khách hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch booking summary for users to calculate lifetime value and total bookings
  const fetchBookingDataForUsers = async (emails) => {
    try {
      const token = getToken();
      if (!token) return;

      const headers = createAuthHeaders(token);
      const bookingsMap = {};

      // Fetch booking summary for each user (limit to avoid too many requests)
      const emailBatch = emails.slice(0, 50); // Limit to first 50 users
      
      await Promise.all(
        emailBatch.map(async (email) => {
          try {
            const response = await fetch(`${BaseURL}/api/booking/summary/email/${encodeURIComponent(email)}`, { headers });
            if (response.ok) {
              const data = await response.json();
              const summaries = data.result || data || [];
              
              const totalBookings = summaries.length;
              const lifetimeValue = summaries.reduce((sum, booking) => {
                return sum + (parseFloat(booking.totalAmount) || 0);
              }, 0);
              
              const lastBooking = summaries.length > 0 
                ? summaries[0].createdAt || summaries[0].departureDate 
                : null;

              bookingsMap[email] = {
                totalBookings,
                lifetimeValue: Math.round(lifetimeValue),
                lastBooking
              };
            }
          } catch (err) {
            console.error(`Error fetching bookings for ${email}:`, err);
          }
        })
      );

      setUserBookings(bookingsMap);
      
      // Update customers with booking data
      setCustomers(prev => prev.map(customer => {
        const bookingData = bookingsMap[customer.email] || { totalBookings: 0, lifetimeValue: 0, lastBooking: null };
        
        let tier = 'Bronze';
        if (bookingData.lifetimeValue >= 50_000_000) tier = 'VIP';
        else if (bookingData.lifetimeValue >= 30_000_000) tier = 'Gold';
        else if (bookingData.lifetimeValue >= 15_000_000) tier = 'Silver';

        return {
          ...customer,
          tier,
          totalBookings: bookingData.totalBookings,
          lifetimeValue: bookingData.lifetimeValue,
          lastBooking: bookingData.lastBooking
        };
      }));
    } catch (err) {
      console.error('Error fetching booking data:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.email.toLowerCase().includes(search.toLowerCase()) ||
        customer.id.toLowerCase().includes(search.toLowerCase());
      const matchesTier = tierFilter === 'ALL' || customer.tier === tierFilter;
      const matchesStatus = statusFilter === 'ALL' || customer.status === statusFilter;
      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [customers, search, tierFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === 'active').length;
    const vip = customers.filter((c) => c.tier === 'VIP').length;
    const value = customers.reduce((sum, c) => sum + c.lifetimeValue, 0);
    return { total, active, vip, value };
  }, [customers]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

  const handleBanToggle = async (customer) => {
    try {
      const token = getToken();
      if (!token) {
        alert('Vui lòng đăng nhập lại');
        return;
      }

      const isCurrentlyBanned = customer.status === 'inactive';
      const newBanStatus = !isCurrentlyBanned;

      const headers = createAuthHeaders(token);

      const response = await fetch(`${BaseURL}/api/staff/ban-user/${customer.userId}?ban=${newBanStatus}`, {
        method: 'PUT',
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể cập nhật trạng thái');
      }

      // Refresh customer list
      await fetchCustomers();
    } catch (err) {
      console.error('Error toggling customer status:', err);
      alert(err.message || 'Không thể cập nhật trạng thái khách hàng. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c9dff] mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách khách hàng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchCustomers}
            className="px-4 py-2 bg-[#4c9dff] text-white rounded-lg hover:bg-[#3f85d6] transition-all duration-200 shadow-[0_12px_30px_rgba(76,157,255,0.35)]"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">Customer Management</p>
          <h1 className="text-3xl font-bold text-gray-900">View & nurture your travelers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi khách hàng thân thiết và lịch sử đặt tour để cá nhân hóa ưu đãi.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-300">
            <FunnelIcon className="h-5 w-5" />
            Bộ lọc nâng cao
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200">
            <ArrowDownTrayIcon className="h-5 w-5" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={UsersIcon} label="Tổng khách hàng" value={stats.total} trend="+12% MoM" />
        <StatCard icon={UserCircleIcon} label="Đang hoạt động" value={stats.active} trend="+3% MoM" color="text-green-600" />
        <StatCard icon={StarIcon} label="Khách VIP" value={stats.vip} trend="+1 VIP tuần này" color="text-amber-500" />
        <StatCard icon={CurrencyFormatter} label="Lifetime value" value={formatCurrency(stats.value)} trend="5.4% YoY" color="text-blue-600" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email hoặc mã khách..."
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả tier</option>
              <option value="VIP">VIP</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Bronze">Bronze</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm dừng</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {['Khách hàng', 'Trạng thái', 'Tích lũy', 'Lần đặt gần nhất', 'Thao tác'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Đang tải...' : 'Không tìm thấy khách hàng phù hợp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-[#e9f2ff]/40 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <img 
                        src={customer.avatar || '/default-avatar.png'} 
                        alt={customer.name} 
                        className="h-12 w-12 rounded-full object-cover border border-gray-100 mt-3.5"
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                      <div className="mt-1.5">
                        <p className="font-semibold text-gray-900 mb-0">{customer.name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                          {customer.email && <span>{customer.email}</span>}
                          {customer.phone && (
                            <span className="inline-flex items-center gap-1">
                              <PhoneIcon className="h-4 w-4 text-gray-400" />
                              {customer.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                          {customer.address && (
                            <span className="inline-flex items-center gap-1">
                              <MapPinIcon className="h-3.5 w-3.5" />
                              {customer.address}
                            </span>
                          )}
                          <span>{customer.id}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={customer.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(customer.lifetimeValue)}</div>
                    <div className="text-xs text-gray-500">{customer.totalBookings} bookings</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.lastBooking ? new Date(customer.lastBooking).toLocaleDateString('vi-VN') : 'Chưa có'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 transition" title="Xem chi tiết">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-amber-600 hover:border-amber-200 transition" title="Chỉnh sửa (chưa hỗ trợ)">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleBanToggle(customer)}
                        className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition" 
                        title={customer.status === 'active' ? 'Ban user' : 'Unban user'}
                      >
                        {customer.status === 'active' ? (
                          <NoSymbolIcon className="h-4 w-4" />
                        ) : (
                          <ShieldExclamationIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

const StatCard = ({ icon: IconComponent, label, value, trend, color = 'text-blue-600' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
          {IconComponent === CurrencyFormatter ? (
            <span className="text-xl font-semibold text-blue-500">₫</span>
          ) : (
            <IconComponent className="h-6 w-6 text-blue-600" />
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <span className={`text-xs font-semibold ${color === 'text-blue-600' ? 'text-[#4c9dff]' : color}`}>{trend}</span>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = status === 'active'
    ? { color: 'bg-green-100 text-green-700', label: 'Đang hoạt động' }
    : { color: 'bg-gray-100 text-gray-500', label: 'Tạm dừng' };
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      {map.label}
    </span>
  );
};

const CurrencyFormatter = () => null;

export default CustomerManagement;

