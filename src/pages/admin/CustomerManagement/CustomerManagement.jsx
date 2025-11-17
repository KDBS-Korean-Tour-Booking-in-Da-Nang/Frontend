import { useMemo, useState } from 'react';
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
  XMarkIcon
} from '@heroicons/react/24/outline';

const avatarBasePath = '/assets/images/user-list';

const baseCustomers = [
  {
    id: 'CUS-2301',
    name: 'Nguyễn Minh Anh',
    email: 'minhanh@example.com',
    phone: '+84 912 345 678',
    country: 'Việt Nam',
    city: 'Đà Nẵng',
    tier: 'VIP',
    status: 'active',
    totalBookings: 18,
    lifetimeValue: 52_000_000,
    lastBooking: '2025-02-12',
    avatar: `${avatarBasePath}/user-list1.png`
  },
  {
    id: 'CUS-2302',
    name: 'Trần Hải Đăng',
    email: 'haidang@example.com',
    phone: '+82 10-2345-6789',
    country: 'Hàn Quốc',
    city: 'Seoul',
    tier: 'Gold',
    status: 'active',
    totalBookings: 11,
    lifetimeValue: 34_500_000,
    lastBooking: '2025-01-28',
    avatar: `${avatarBasePath}/user-list2.png`
  },
  {
    id: 'CUS-2303',
    name: 'Phạm Thảo Nhi',
    email: 'thaonhi@example.com',
    phone: '+84 973 222 111',
    country: 'Việt Nam',
    city: 'Hà Nội',
    tier: 'Silver',
    status: 'inactive',
    totalBookings: 6,
    lifetimeValue: 15_200_000,
    lastBooking: '2024-11-05',
    avatar: `${avatarBasePath}/user-list3.png`
  },
  {
    id: 'CUS-2304',
    name: 'Lee Ji Eun',
    email: 'jieun@example.kr',
    phone: '+82 10-8888-2323',
    country: 'Hàn Quốc',
    city: 'Busan',
    tier: 'VIP',
    status: 'active',
    totalBookings: 21,
    lifetimeValue: 61_800_000,
    lastBooking: '2025-02-02',
    avatar: `${avatarBasePath}/user-list4.png`
  },
  {
    id: 'CUS-2305',
    name: 'Ngô Hữu Phước',
    email: 'huuphuoc@example.com',
    phone: '+84 939 777 123',
    country: 'Việt Nam',
    city: 'Hồ Chí Minh',
    tier: 'Bronze',
    status: 'active',
    totalBookings: 3,
    lifetimeValue: 7_900_000,
    lastBooking: '2024-12-18',
    avatar: `${avatarBasePath}/user-list5.png`
  }
];

const CustomerManagement = () => {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredCustomers = useMemo(() => {
    return baseCustomers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.email.toLowerCase().includes(search.toLowerCase()) ||
        customer.id.toLowerCase().includes(search.toLowerCase());
      const matchesTier = tierFilter === 'ALL' || customer.tier === tierFilter;
      const matchesStatus = statusFilter === 'ALL' || customer.status === statusFilter;
      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [search, tierFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = baseCustomers.length;
    const active = baseCustomers.filter((c) => c.status === 'active').length;
    const vip = baseCustomers.filter((c) => c.tier === 'VIP').length;
    const value = baseCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0);
    return { total, active, vip, value };
  }, []);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-500 font-semibold mb-2">Customer Management</p>
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
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow hover:bg-blue-700">
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
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-blue-50/40 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={customer.avatar} alt={customer.name} className="h-12 w-12 rounded-full object-cover border border-gray-100" />
                      <div>
                        <p className="font-semibold text-gray-900">{customer.name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                          <span>{customer.email}</span>
                          <span className="inline-flex items-center gap-1">
                            <PhoneIcon className="h-4 w-4 text-gray-400" />
                            {customer.phone}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <MapPinIcon className="h-3.5 w-3.5" />
                            {customer.city}, {customer.country}
                          </span>
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
                    {new Date(customer.lastBooking).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 transition" title="Xem chi tiết">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-amber-600 hover:border-amber-200 transition" title="Chỉnh sửa">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition" title="Ban user">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">Không tìm thấy khách hàng phù hợp với bộ lọc hiện tại.</p>
          </div>
        )}
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
      <span className={`text-xs font-semibold ${color}`}>{trend}</span>
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

