import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import Pagination from '../Pagination';
import TransactionDetailModal from './TransactionDetailModal';
import Tooltip from '../../../components/tooltip';
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
        // Map status: SUCCESS -> completed, PENDING -> pending, FAILED -> failed
        let status = 'pending';
        if (txn.status === 'SUCCESS') {
          status = 'completed';
        } else if (txn.status === 'FAILED') {
          status = 'failed';
        } else if (txn.status === 'PENDING') {
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
    const completed = transactions.filter((t) => t.status === 'completed').length;
    const totalRevenue = transactions
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const pending = transactions.filter((t) => t.status === 'pending').length;
    return { total, completed, totalRevenue, pending };
  }, [transactions]);

  const formatCurrency = (value) => {
    const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
  };

  // Chỉ hiển thị màn hình loading toàn trang khi lần load đầu tiên chưa có dữ liệu
  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c9dff] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('admin.transactionManagement.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchTransactions}
            className="ml-4 px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
          >
            {t('admin.transactionManagement.retry')}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">{t('admin.transactionManagement.title')}</p>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.transactionManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.transactionManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-300">
            <FunnelIcon className="h-5 w-5" />
            {t('admin.transactionManagement.advancedFilter')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow hover:bg-blue-700">
            <ArrowDownTrayIcon className="h-5 w-5" />
            {t('admin.transactionManagement.exportReport')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={CurrencyDollarIcon} label={t('admin.transactionManagement.stats.total')} value={stats.total} trend={t('admin.transactionManagement.stats.totalTrend')} />
        <StatCard icon={ArrowTrendingUpIcon} label={t('admin.transactionManagement.stats.completed')} value={stats.completed} trend={t('admin.transactionManagement.stats.completedTrend')} color="text-green-600" />
        <StatCard icon={CurrencyFormatter} label={t('admin.transactionManagement.stats.totalRevenue')} value={formatCurrency(stats.totalRevenue)} trend={t('admin.transactionManagement.stats.totalRevenueTrend')} color="text-[#4c9dff]" />
        <StatCard icon={ArrowTrendingDownIcon} label={t('admin.transactionManagement.stats.pending')} value={stats.pending} trend={t('admin.transactionManagement.stats.pendingTrend')} color="text-amber-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.transactionManagement.searchPlaceholder')}
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">{t('admin.transactionManagement.statusFilter.all')}</option>
              <option value="completed">{t('admin.transactionManagement.statusFilter.completed')}</option>
              <option value="pending">{t('admin.transactionManagement.statusFilter.pending')}</option>
              <option value="failed">{t('admin.transactionManagement.statusFilter.failed')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider bg-blue-50/50 w-16">
                  STT
                </th>
                {[t('admin.transactionManagement.tableHeaders.customer'), t('admin.transactionManagement.tableHeaders.status'), t('admin.transactionManagement.tableHeaders.amount'), t('admin.transactionManagement.tableHeaders.paymentMethod'), t('admin.transactionManagement.tableHeaders.transactionDate'), t('admin.transactionManagement.tableHeaders.actions')].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {t('admin.transactionManagement.noResults')}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((transaction, index) => (
                <tr key={transaction.id} className="hover:bg-[#e9f2ff]/40 transition">
                  <td className="px-4 py-4 text-center bg-blue-50/30">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                      {currentPage * itemsPerPage + index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{transaction.customerName}</p>
                      <p className="text-sm text-gray-500">{transaction.customerEmail}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={transaction.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(transaction.amount)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {transaction.paymentMethod}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
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
                        className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition"
                      >
                        <EyeIcon className="h-4 w-4" />
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
  const { t } = useTranslation();
  const map = {
    completed: { color: 'bg-green-100 text-green-700', label: t('admin.transactionManagement.status.completed') },
    pending: { color: 'bg-amber-100 text-amber-700', label: t('admin.transactionManagement.status.pending') },
    failed: { color: 'bg-red-100 text-red-700', label: t('admin.transactionManagement.status.failed') }
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

