import { useMemo, useState } from 'react';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ReceiptRefundIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const baseTransactions = [
  {
    id: 'TXN-2025-001',
    customerName: 'Nguyễn Minh Anh',
    customerEmail: 'minhanh@example.com',
    tourName: 'Tour Đà Nẵng 3N2Đ',
    amount: 5_200_000,
    status: 'completed',
    paymentMethod: 'Credit Card',
    transactionDate: '2025-02-15',
    bookingId: 'BK-2025-001'
  },
  {
    id: 'TXN-2025-002',
    customerName: 'Trần Hải Đăng',
    customerEmail: 'haidang@example.com',
    tourName: 'Tour Hà Nội 2N1Đ',
    amount: 3_500_000,
    status: 'completed',
    paymentMethod: 'Bank Transfer',
    transactionDate: '2025-02-14',
    bookingId: 'BK-2025-002'
  },
  {
    id: 'TXN-2025-003',
    customerName: 'Phạm Thảo Nhi',
    customerEmail: 'thaonhi@example.com',
    tourName: 'Tour Hồ Chí Minh 4N3Đ',
    amount: 7_800_000,
    status: 'pending',
    paymentMethod: 'Credit Card',
    transactionDate: '2025-02-13',
    bookingId: 'BK-2025-003'
  },
  {
    id: 'TXN-2025-004',
    customerName: 'Lee Ji Eun',
    customerEmail: 'jieun@example.kr',
    tourName: 'Tour Phú Quốc 5N4Đ',
    amount: 12_500_000,
    status: 'completed',
    paymentMethod: 'Credit Card',
    transactionDate: '2025-02-12',
    bookingId: 'BK-2025-004'
  },
  {
    id: 'TXN-2025-005',
    customerName: 'Ngô Hữu Phước',
    customerEmail: 'huuphuoc@example.com',
    tourName: 'Tour Nha Trang 3N2Đ',
    amount: 4_200_000,
    status: 'refunded',
    paymentMethod: 'Bank Transfer',
    transactionDate: '2025-02-11',
    bookingId: 'BK-2025-005'
  }
];

const TransactionManagement = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  const filteredTransactions = useMemo(() => {
    return baseTransactions.filter((transaction) => {
      const matchesSearch =
        transaction.customerName.toLowerCase().includes(search.toLowerCase()) ||
        transaction.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
        transaction.id.toLowerCase().includes(search.toLowerCase()) ||
        transaction.tourName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || transaction.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const total = baseTransactions.length;
    const completed = baseTransactions.filter((t) => t.status === 'completed').length;
    const totalRevenue = baseTransactions
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const pending = baseTransactions.filter((t) => t.status === 'pending').length;
    return { total, completed, totalRevenue, pending };
  }, []);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">Transaction Management</p>
          <h1 className="text-3xl font-bold text-gray-900">View & track all transactions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi và quản lý tất cả các giao dịch thanh toán trong hệ thống.
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
        <StatCard icon={CurrencyDollarIcon} label="Tổng giao dịch" value={stats.total} trend="+8% MoM" />
        <StatCard icon={ArrowTrendingUpIcon} label="Đã hoàn thành" value={stats.completed} trend="+5% MoM" color="text-green-600" />
        <StatCard icon={CurrencyFormatter} label="Tổng doanh thu" value={formatCurrency(stats.totalRevenue)} trend="+12% MoM" color="text-[#4c9dff]" />
        <StatCard icon={ArrowTrendingDownIcon} label="Đang chờ" value={stats.pending} trend="Cần xử lý" color="text-amber-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, mã giao dịch hoặc tour..."
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="pending">Đang chờ</option>
              <option value="refunded">Đã hoàn tiền</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {['Giao dịch', 'Khách hàng', 'Tour', 'Số tiền', 'Phương thức', 'Ngày giao dịch', 'Thao tác'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-[#e9f2ff]/40 transition">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{transaction.id}</p>
                      <p className="text-xs text-gray-400 mt-1">Booking: {transaction.bookingId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{transaction.customerName}</p>
                      <p className="text-sm text-gray-500">{transaction.customerEmail}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{transaction.tourName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(transaction.amount)}</div>
                    <StatusBadge status={transaction.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {transaction.paymentMethod}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      {new Date(transaction.transactionDate).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition" title="Xem chi tiết">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">Không tìm thấy giao dịch phù hợp với bộ lọc hiện tại.</p>
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
        <div className="h-12 w-12 rounded-2xl bg-[#e9f2ff] flex items-center justify-center">
          {IconComponent === CurrencyFormatter ? (
            <span className="text-xl font-semibold text-[#4c9dff]">₫</span>
          ) : (
            <IconComponent className="h-6 w-6 text-[#4c9dff]" />
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
  const map = {
    completed: { color: 'bg-green-100 text-green-700', label: 'Đã hoàn thành' },
    pending: { color: 'bg-amber-100 text-amber-700', label: 'Đang chờ' },
    refunded: { color: 'bg-gray-100 text-gray-700', label: 'Đã hoàn tiền' }
  };
  const statusMap = map[status] || { color: 'bg-gray-100 text-gray-500', label: status };
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${statusMap.color} mt-1`}>
      {statusMap.label}
    </span>
  );
};

const CurrencyFormatter = () => null;

export default TransactionManagement;

