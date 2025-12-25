import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import Pagination from '../Pagination';
import TransactionDetailModal from './TransactionDetailModal';
import { Tooltip } from '../../../components';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Search,
  Eye,
  Calendar
} from 'lucide-react';

const TransactionManagement = () => {
  const { t, i18n } = useTranslation();
  const { getToken } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch transactions from API
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();

      if (!token) {
        setError(t('common.errors.loginRequired'));
        setLoading(false);
        return;
      }

      const headers = createAuthHeaders(token);
      const response = await fetch(API_ENDPOINTS.TRANSACTIONS, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          await checkAndHandle401(response);
          setError(t('common.errors.sessionExpired'));
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const transactionsList = Array.isArray(data) ? data : [];

      // Map TransactionResponse to frontend format
      const mappedTransactions = transactionsList.map((txn) => {
        // Map backend status to frontend status:
        // Backend: SUCCESS -> Frontend: completed
        // Backend: PENDING -> Frontend: pending
        // Backend: FAILED -> Frontend: failed
        // Normalize status to uppercase for comparison
        const backendStatus = (txn.status || '').toUpperCase().trim();
        let status = 'pending';
        if (backendStatus === 'SUCCESS') {
          status = 'completed';
        } else if (backendStatus === 'FAILED') {
          status = 'failed';
        } else if (backendStatus === 'PENDING') {
          status = 'pending';
        }

        return {
          id: txn.transactionId || txn.orderId,
          transactionId: txn.transactionId,
          orderId: txn.orderId,
          orderInfo: txn.orderInfo || null, // Keep null instead of 'N/A' to check in modal
          customerName: txn.username || 'N/A',
          customerEmail: txn.email || 'N/A',
          amount: txn.amount ? Number(txn.amount) : 0,
          status: status,
          paymentMethod: txn.paymentMethod === 'TOSS' ? 'Toss Payment' : (txn.paymentMethod || 'N/A'),
          transactionDate: txn.createdTime || txn.created_time,
          bookingId: txn.orderId, // orderId is typically the booking ID
          avatar: txn.avatar
        };
      });

      setTransactions(mappedTransactions);
    } catch (err) {
      // Silently handle error fetching transactions
      setError(t('admin.transactionManagement.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        (transaction.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (transaction.customerEmail || '').toLowerCase().includes(search.toLowerCase()) ||
        (transaction.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (transaction.transactionId || '').toLowerCase().includes(search.toLowerCase()) ||
        (transaction.orderId || '').toLowerCase().includes(search.toLowerCase()) ||
        (transaction.orderInfo || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || transaction.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [transactions, search, statusFilter]);

  // Pagination
  const paginatedTransactions = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const total = transactions.length;
    // Only count completed transactions (status === 'completed', which maps from backend SUCCESS)
    // for completed count and total revenue calculation
    const completedTransactions = transactions.filter((t) => t.status === 'completed');
    const completed = completedTransactions.length;
    // Total revenue: only sum amounts from completed transactions (backend status: SUCCESS)
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const pending = transactions.filter((t) => t.status === 'pending').length;
    return { total, completed, totalRevenue, pending };
  }, [transactions]);

  // Format as VND (keep original value, no conversion)
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(Number(value || 0));
  };

  // Chỉ hiển thị màn hình loading toàn trang khi lần load đầu tiên chưa có dữ liệu
  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#66B3FF' }}></div>
          <p className="mt-4 text-gray-600">{t('admin.transactionManagement.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="border px-4 py-3 rounded-[20px] flex items-center justify-between" style={{ backgroundColor: '#FFE6F0', borderColor: '#FFB3B3', color: '#FF80B3' }}>
          <span>{error}</span>
          <button
            onClick={fetchTransactions}
            className="ml-4 px-3 py-1 text-xs font-semibold rounded-[16px] transition"
            style={{ backgroundColor: '#FFCCE0', color: '#FF80B3' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#FFB3CC'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#FFCCE0'}
          >
            {t('admin.transactionManagement.retry')}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>{t('admin.transactionManagement.title')}</p>
          <h1 className="text-3xl font-semibold text-gray-800">{t('admin.transactionManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.transactionManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label={t('admin.transactionManagement.stats.total')} value={stats.total} trend={t('admin.transactionManagement.stats.totalTrend')} />
        <StatCard icon={TrendingUp} label={t('admin.transactionManagement.stats.completed')} value={stats.completed} trend={t('admin.transactionManagement.stats.completedTrend')} color="text-green-600" />
        <StatCard icon={CurrencyFormatter} label={t('admin.transactionManagement.stats.totalRevenue')} value={formatCurrency(stats.totalRevenue)} trend={t('admin.transactionManagement.stats.totalRevenueTrend')} color="text-[#4c9dff]" />
        <StatCard icon={TrendingDown} label={t('admin.transactionManagement.stats.pending')} value={stats.pending} trend={t('admin.transactionManagement.stats.pendingTrend')} color="text-amber-500" />
      </div>

      <div className="bg-white rounded-[28px] shadow-sm border" style={{ borderColor: '#F0F0F0' }}>
        <div className="flex flex-col gap-3 p-5 border-b lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: '#F0F0F0' }}>
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.transactionManagement.searchPlaceholder')}
              className="w-full border rounded-[20px] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
              style={{ borderColor: '#E0E0E0' }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-[20px] px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
              style={{ borderColor: '#E0E0E0' }}
            >
              <option value="ALL">{t('admin.transactionManagement.statusFilter.all')}</option>
              <option value="completed">{t('admin.transactionManagement.statusFilter.completed')}</option>
              <option value="pending">{t('admin.transactionManagement.statusFilter.pending')}</option>
              <option value="failed">{t('admin.transactionManagement.statusFilter.failed')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: '#F0F0F0' }}>
            <thead style={{ backgroundColor: '#FAFAFA' }}>
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                  STT
                </th>
                {[t('admin.transactionManagement.tableHeaders.customer'), t('admin.transactionManagement.tableHeaders.status'), t('admin.transactionManagement.tableHeaders.amount'), t('admin.transactionManagement.tableHeaders.paymentMethod'), t('admin.transactionManagement.tableHeaders.transactionDate'), t('admin.transactionManagement.tableHeaders.actions')].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y" style={{ borderColor: '#F0F0F0' }}>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {t('admin.transactionManagement.noResults')}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((transaction, index) => (
                  <tr key={transaction.id} className="transition" style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6F3FF'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-[20px] text-sm font-semibold" style={{ backgroundColor: '#F5F5F5', color: '#6B7280' }}>
                        {currentPage * itemsPerPage + index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">{transaction.customerName}</p>
                        <p className="text-sm text-gray-500">{transaction.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-800">{formatCurrency(transaction.amount)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {transaction.paymentMethod}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                        {transaction.transactionDate
                          ? new Date(transaction.transactionDate).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN')
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Tooltip text={t('admin.transactionManagement.actions.viewDetails')} position="top">
                        <button
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 rounded-[20px] border transition"
                          style={{ borderColor: '#E0E0E0', color: '#9CA3AF' }}
                          onMouseEnter={(e) => {
                            e.target.style.color = '#66B3FF';
                            e.target.style.borderColor = '#CCE6FF';
                            e.target.style.backgroundColor = '#E6F3FF';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.color = '#9CA3AF';
                            e.target.style.borderColor = '#E0E0E0';
                            e.target.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Eye className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                )))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTransactions.length >= 10 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTransactions.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />
    </div>
  );
};

const StatCard = ({ icon: IconComponent, label, value, trend, color = 'text-blue-600' }) => {
  const colorMap = {
    'text-blue-600': { bg: '#E6F3FF', iconColor: '#66B3FF', textColor: '#66B3FF' },
    'text-[#4c9dff]': { bg: '#E6F3FF', iconColor: '#66B3FF', textColor: '#66B3FF' },
    'text-green-600': { bg: '#DCFCE7', iconColor: '#15803D', textColor: '#15803D' },
    'text-amber-500': { bg: '#FFF4E6', iconColor: '#FFB84D', textColor: '#FFB84D' }
  };
  const colors = colorMap[color] || colorMap['text-blue-600'];
  
  return (
    <div className="bg-white rounded-[28px] border p-6 shadow-sm" style={{ borderColor: '#F0F0F0', backgroundColor: colors.bg }}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-14 w-14 rounded-[20px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
            {IconComponent === CurrencyFormatter ? (
              <DollarSign className="h-7 w-7" style={{ color: colors.iconColor }} strokeWidth={1.5} />
            ) : (
              <IconComponent className="h-7 w-7" style={{ color: colors.iconColor }} strokeWidth={1.5} />
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-800">{value}</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{label}</p>
          {trend && <p className="text-xs font-medium" style={{ color: colors.textColor }}>{trend}</p>}
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const map = {
    completed: { bgColor: '#DCFCE7', textColor: '#15803D', label: t('admin.transactionManagement.status.completed') },
    pending: { bgColor: '#FFF4E6', textColor: '#FFB84D', label: t('admin.transactionManagement.status.pending') },
    failed: { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('admin.transactionManagement.status.failed') }
  };
  const statusMap = map[status] || { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: status };
  return (
    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px] mt-1" style={{ backgroundColor: statusMap.bgColor, color: statusMap.textColor }}>
      {statusMap.label}
    </span>
  );
};

const CurrencyFormatter = () => null;

export default TransactionManagement;

