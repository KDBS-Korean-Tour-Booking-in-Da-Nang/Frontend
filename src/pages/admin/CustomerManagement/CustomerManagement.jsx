import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders, getAvatarUrl } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import BanReasonModal from '../../../components/modals/BanReasonModal/BanReasonModal';
import CustomerDetailModal from './CustomerDetailModal';
import Pagination from '../Pagination';
import { Tooltip } from '../../../components';
import {
  Users,
  UserCircle,
  Search,
  Phone,
  Mail,
  MapPin,
  Eye,
  Ban,
  ShieldCheck
} from 'lucide-react';

const CustomerManagement = () => {
  const { t, i18n } = useTranslation();
  const { getToken } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBookings, setUserBookings] = useState({}); // Map email -> booking data
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedCustomerForBan, setSelectedCustomerForBan] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

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
          await checkAndHandle401(response);
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
          createdAt: user.createdAt,
          // Additional fields for detail modal
          dob: user.dob,
          cccd: user.cccd,
          gender: user.gender,
          balance: user.balance,
          banReason: user.banReason,
          role: user.role
        };
      });

      setCustomers(mappedCustomers);

      // Fetch booking data for each customer (optional, can be done in background)
      fetchBookingDataForUsers(customerUsers.map(u => u.email));
    } catch (err) {
      // Silently handle error fetching customers
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
            if (response.status === 401) {
              await checkAndHandle401(response);
              return;
            }
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
            // Silently handle error fetching bookings
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
          // Keep existing additional fields (dob, cccd, gender, balance, banReason, role)
        };
      }));
    } catch (err) {
      // Silently handle error fetching booking data
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
      const matchesStatus = statusFilter === 'ALL' || customer.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  // Pagination
  const paginatedCustomers = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === 'active').length;
    return { total, active };
  }, [customers]);

  const handleBanClick = (customer) => {
    // If unbanning, do it directly without modal
    if (customer.status === 'inactive') {
      handleBanToggle(customer, false, null);
      return;
    }
    
    // If banning, open modal to select reason
    setSelectedCustomerForBan(customer);
    setBanModalOpen(true);
  };

  const handleBanConfirm = async (banReason) => {
    if (!selectedCustomerForBan) return;
    await handleBanToggle(selectedCustomerForBan, true, banReason);
  };

  const handleViewDetail = (customer) => {
    setSelectedCustomerForDetail(customer);
    setDetailModalOpen(true);
  };

  const handleBanToggle = async (customer, ban, banReason = null) => {
    try {
      const token = getToken();
      if (!token) {
        alert('Vui lòng đăng nhập lại');
        return;
      }

      const headers = createAuthHeaders(token);

      // Prepare request body according to backend logic:
      // - If ban = true: send banReason (backend will use "No reason provided" if null)
      // - If ban = false: send banReason = null (backend will clear it)
      const requestBody = {
        ban: ban,
        banReason: ban ? (banReason || null) : null // When unban, always send null
      };

      const response = await fetch(`${BaseURL}/api/staff/ban-user/${customer.userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          await checkAndHandle401(response);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể cập nhật trạng thái');
      }

      // Refresh customer list
      await fetchCustomers();
      
      // Close modal if open
      if (banModalOpen) {
        setBanModalOpen(false);
        setSelectedCustomerForBan(null);
      }
    } catch (err) {
      // Silently handle error toggling customer status
      alert(err.message || 'Không thể cập nhật trạng thái khách hàng. Vui lòng thử lại.');
    }
  };

  // Chỉ hiển thị màn hình loading toàn trang khi lần load đầu tiên chưa có dữ liệu
  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#66B3FF' }}></div>
          <p className="mt-4 text-gray-600">{t('admin.customerManagement.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-[24px] flex items-center justify-between border" style={{ backgroundColor: '#FFE6F0', borderColor: '#FFCCE0' }}>
          <span style={{ color: '#FF80B3' }}>{error}</span>
          <button
            onClick={fetchCustomers}
            className="ml-4 px-3 py-1 text-xs font-semibold rounded-[20px] transition"
            style={{ backgroundColor: '#FFCCE0', color: '#FF80B3' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#FFB3CC'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#FFCCE0'}
          >
            {t('admin.customerManagement.retry')}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>{t('admin.customerManagement.title')}</p>
          <h1 className="text-3xl font-semibold text-gray-800">{t('admin.customerManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.customerManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard icon={Users} label={t('admin.customerManagement.stats.totalCustomers')} value={stats.total} trend={t('admin.customerManagement.stats.totalCustomersTrend')} />
        <StatCard icon={UserCircle} label={t('admin.customerManagement.stats.active')} value={stats.active} trend={t('admin.customerManagement.stats.activeTrend')} color="#15803D" />
      </div>

      <div className="bg-white rounded-[28px] shadow-sm border" style={{ borderColor: '#F0F0F0' }}>
        <div className="flex flex-col gap-3 p-5 border-b lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: '#F0F0F0' }}>
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.customerManagement.searchPlaceholder')}
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
              <option value="ALL">{t('admin.customerManagement.statusFilter.all')}</option>
              <option value="active">{t('admin.customerManagement.statusFilter.active')}</option>
              <option value="inactive">{t('admin.customerManagement.statusFilter.inactive')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: '#F0F0F0' }}>
            <thead style={{ backgroundColor: '#FAFAFA' }}>
              <tr>
                {[t('admin.customerManagement.tableHeaders.customer'), t('admin.customerManagement.tableHeaders.status'), t('admin.customerManagement.tableHeaders.bookings'), t('admin.customerManagement.tableHeaders.lastBooking'), t('admin.customerManagement.tableHeaders.actions')].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y" style={{ borderColor: '#F0F0F0' }}>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    {loading ? t('admin.customerManagement.loading') : t('admin.customerManagement.noResults')}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="transition" style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6F3FF'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <img 
                        src={customer.avatar || '/default-avatar.png'} 
                        alt={customer.name} 
                        className="h-12 w-12 rounded-[20px] object-cover border mt-3.5"
                        style={{ borderColor: '#E0E0E0' }}
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                      <div className="mt-1.5">
                        <p className="font-semibold text-gray-800 mb-0">{customer.name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                          {customer.email && <span>{customer.email}</span>}
                          {customer.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                              {customer.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                          {customer.address && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
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
                    <div className="text-sm font-semibold text-gray-800">{customer.totalBookings}</div>
                    <div className="text-xs text-gray-500">{t('admin.customerManagement.bookings')}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.lastBooking ? new Date(customer.lastBooking).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN') : t('admin.customerManagement.noBooking')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tooltip text={t('admin.customerManagement.actions.viewDetails')} position="top">
                        <button 
                          onClick={() => handleViewDetail(customer)}
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
                      <Tooltip text={customer.status === 'active' ? t('admin.customerManagement.actions.banUser') : t('admin.customerManagement.actions.unbanUser')} position="top">
                        <button 
                          onClick={() => handleBanClick(customer)}
                          className="p-2 rounded-[20px] border transition"
                          style={{ borderColor: '#E0E0E0', color: '#9CA3AF' }}
                          onMouseEnter={(e) => {
                            e.target.style.color = '#FF80B3';
                            e.target.style.borderColor = '#FFCCE0';
                            e.target.style.backgroundColor = '#FFE6F0';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.color = '#9CA3AF';
                            e.target.style.borderColor = '#E0E0E0';
                            e.target.style.backgroundColor = 'transparent';
                          }}
                        >
                          {customer.status === 'active' ? (
                            <Ban className="h-4 w-4" strokeWidth={1.5} />
                          ) : (
                            <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredCustomers.length >= 10 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCustomers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Ban Reason Modal */}
      <BanReasonModal
        isOpen={banModalOpen}
        onClose={() => {
          setBanModalOpen(false);
          setSelectedCustomerForBan(null);
        }}
        customer={selectedCustomerForBan}
        onConfirm={handleBanConfirm}
      />

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCustomerForDetail(null);
        }}
        customer={selectedCustomerForDetail}
      />
    </div>
  );
};

const StatCard = ({ icon: IconComponent, label, value, trend, color = '#66B3FF' }) => (
  <div className="bg-white rounded-[28px] border p-5 shadow-sm" style={{ borderColor: '#F0F0F0', backgroundColor: color === '#66B3FF' ? '#E6F3FF' : '#DCFCE7' }}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-[20px] flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
          <IconComponent className="h-6 w-6" style={{ color: color }} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-semibold text-gray-800">{value}</p>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color: color }}>{trend}</span>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const map = status === 'active'
    ? { bgColor: '#DCFCE7', textColor: '#15803D', label: t('admin.customerManagement.status.active') }
    : { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: t('admin.customerManagement.status.inactive') };
  return (
    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: map.bgColor, color: map.textColor }}>
      {map.label}
    </span>
  );
};

export default CustomerManagement;

