import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders, getAvatarUrl } from '../../../config/api';
import {
  BuildingOfficeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  MapPinIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const CompanyManagement = () => {
  const { getToken } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch companies (users with role COMPANY/BUSINESS) from API
  const fetchCompanies = async () => {
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
      
      // Filter users with role COMPANY or BUSINESS
      const companyUsers = users.filter(user => {
        const role = (user.role || '').toUpperCase();
        return role === 'COMPANY' || role === 'BUSINESS';
      });

      // Map backend data to frontend format
      const mappedCompanies = companyUsers.map(user => {
        const status = (user.status || '').toUpperCase();
        let approvalStatus = 'pending';
        if (status === 'COMPANY_PENDING') {
          approvalStatus = 'pending';
        } else if (status === 'UNBANNED' || status === 'ACTIVE') {
          approvalStatus = 'approved';
        } else if (status === 'BANNED') {
          approvalStatus = 'rejected';
        }

        return {
          id: `COMP-${user.userId}`,
          userId: user.userId,
          name: user.username || 'N/A',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || '',
          avatar: getAvatarUrl(user.avatar),
          status: status,
          approvalStatus: approvalStatus,
          createdAt: user.createdAt,
          role: user.role
        };
      });

      setCompanies(mappedCompanies);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Không thể tải danh sách công ty. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch =
        company.name.toLowerCase().includes(search.toLowerCase()) ||
        company.email.toLowerCase().includes(search.toLowerCase()) ||
        company.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || company.approvalStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [companies, search, statusFilter]);

  const stats = useMemo(() => {
    const total = companies.length;
    const pending = companies.filter((c) => c.approvalStatus === 'pending').length;
    const approved = companies.filter((c) => c.approvalStatus === 'approved').length;
    const rejected = companies.filter((c) => c.approvalStatus === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [companies]);

  const handleApprove = async (company) => {
    try {
      const token = getToken();
      if (!token) {
        alert('Vui lòng đăng nhập lại');
        return;
      }

      if (!confirm(`Bạn có chắc chắn muốn phê duyệt công ty "${company.name}"?`)) {
        return;
      }

      const headers = createAuthHeaders(token);

      // Update role to COMPANY (if not already)
      const roleResponse = await fetch(`${BaseURL}/api/staff/update-role/${company.userId}?role=COMPANY`, {
        method: 'PUT',
        headers
      });

      if (!roleResponse.ok) {
        if (roleResponse.status === 401) {
          alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return;
        }
        const errorData = await roleResponse.json();
        throw new Error(errorData.message || 'Không thể cập nhật role');
      }

      // Unban user (set status to UNBANNED)
      const statusResponse = await fetch(`${BaseURL}/api/staff/ban-user/${company.userId}?ban=false`, {
        method: 'PUT',
        headers
      });

      if (!statusResponse.ok) {
        if (statusResponse.status === 401) {
          alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return;
        }
        const errorData = await statusResponse.json();
        throw new Error(errorData.message || 'Không thể cập nhật trạng thái');
      }

      alert('Phê duyệt công ty thành công!');
      await fetchCompanies();
    } catch (err) {
      console.error('Error approving company:', err);
      alert(err.message || 'Không thể phê duyệt công ty. Vui lòng thử lại.');
    }
  };

  const handleReject = async (company) => {
    try {
      const token = getToken();
      if (!token) {
        alert('Vui lòng đăng nhập lại');
        return;
      }

      if (!confirm(`Bạn có chắc chắn muốn từ chối công ty "${company.name}"?`)) {
        return;
      }

      const headers = createAuthHeaders(token);

      // Ban user (reject)
      const response = await fetch(`${BaseURL}/api/staff/ban-user/${company.userId}?ban=true`, {
        method: 'PUT',
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể từ chối công ty');
      }

      alert('Từ chối công ty thành công!');
      await fetchCompanies();
    } catch (err) {
      console.error('Error rejecting company:', err);
      alert(err.message || 'Không thể từ chối công ty. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách công ty...</p>
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
            onClick={fetchCompanies}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
          <p className="text-xs uppercase tracking-[0.3em] text-blue-500 font-semibold mb-2">Company Management</p>
          <h1 className="text-3xl font-bold text-gray-900">Xét duyệt đăng ký công ty</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý và xét duyệt các yêu cầu đăng ký tài khoản công ty du lịch.
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
        <StatCard icon={BuildingOfficeIcon} label="Tổng công ty" value={stats.total} trend="Đã đăng ký" />
        <StatCard icon={ClockIcon} label="Chờ duyệt" value={stats.pending} trend="Cần xử lý" color="text-amber-500" />
        <StatCard icon={CheckCircleIcon} label="Đã duyệt" value={stats.approved} trend="Hoạt động" color="text-green-600" />
        <StatCard icon={XCircleIcon} label="Đã từ chối" value={stats.rejected} trend="Không hoạt động" color="text-red-600" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email hoặc mã công ty..."
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
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Đã từ chối</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {['Công ty', 'Trạng thái', 'Ngày đăng ký', 'Thao tác'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Đang tải...' : 'Không tìm thấy công ty phù hợp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-blue-50/40 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <img 
                        src={company.avatar || '/default-avatar.png'} 
                        alt={company.name} 
                        className="h-12 w-12 rounded-full object-cover border border-gray-100 mt-1.5"
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                      <div className="mt-1.5">
                        <p className="font-semibold text-gray-900 mb-0">{company.name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                          {company.email && <span>{company.email}</span>}
                          {company.phone && (
                            <span className="inline-flex items-center gap-1">
                              <PhoneIcon className="h-4 w-4 text-gray-400" />
                              {company.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                          {company.address && (
                            <span className="inline-flex items-center gap-1">
                              <MapPinIcon className="h-3.5 w-3.5" />
                              {company.address}
                            </span>
                          )}
                          <span>{company.id}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ApprovalStatusBadge status={company.approvalStatus} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {company.createdAt ? new Date(company.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 transition" 
                        title="Xem chi tiết"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {company.approvalStatus === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(company)}
                            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 transition" 
                            title="Phê duyệt"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(company)}
                            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition" 
                            title="Từ chối"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
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
          <IconComponent className="h-6 w-6 text-blue-600" />
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

const ApprovalStatusBadge = ({ status }) => {
  const statusMap = {
    pending: { color: 'bg-amber-100 text-amber-700', label: 'Chờ duyệt', icon: ClockIcon },
    approved: { color: 'bg-green-100 text-green-700', label: 'Đã duyệt', icon: CheckCircleIcon },
    rejected: { color: 'bg-red-100 text-red-700', label: 'Đã từ chối', icon: XCircleIcon }
  };

  const statusInfo = statusMap[status] || statusMap.pending;
  const Icon = statusInfo.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {statusInfo.label}
    </span>
  );
};

export default CompanyManagement;
