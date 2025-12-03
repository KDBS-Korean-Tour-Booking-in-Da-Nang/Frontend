import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders, getAvatarUrl } from '../../../../../config/api';
import { checkAndHandle401 } from '../../../../../utils/apiErrorHandler';
import Pagination from '../../../../admin/Pagination';
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
  XMarkIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const CompanyManagement = () => {
  const { t, i18n } = useTranslation();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Check if user has permission to manage companies
  const canManageCompanies = user?.staffTask === 'COMPANY_REQUEST_AND_RESOLVE_TICKET' || user?.role === 'ADMIN';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fileData, setFileData] = useState({
    businessLicenseUrl: null,
    idCardFrontUrl: null,
    idCardBackUrl: null,
    loading: false
  });
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

  // Fetch companies (users with role COMPANY/BUSINESS) from API
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      
      if (!token) {
        setError(t('staff.companyManagement.error.loginRequired'));
        setLoading(false);
        return;
      }

      const headers = createAuthHeaders(token);

      const response = await fetch(API_ENDPOINTS.USERS, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          await checkAndHandle401(response);
          setError(t('staff.companyManagement.error.sessionExpired'));
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const users = data.result || data || [];
      
      // Filter users with role COMPANY or BUSINESS (hiển thị full status)
      const companyUsers = users.filter(user => {
        const role = (user.role || '').toUpperCase();
        return role === 'COMPANY' || role === 'BUSINESS';
      });

      // Map backend data to frontend format
      const mappedCompanies = companyUsers.map(user => {
        const status = (user.status || '').toUpperCase();
        let approvalStatus = 'pending';
        if (status === 'WAITING_FOR_APPROVAL') {
          approvalStatus = 'pending'; // Chờ duyệt
        } else if (status === 'COMPANY_PENDING') {
          approvalStatus = 'not_updated'; // Chưa cập nhật
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
      setError(t('staff.companyManagement.error.loadCompanies'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageCompanies) {
      fetchCompanies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageCompanies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      // Filter out companies with not_updated status
      if (company.approvalStatus === 'not_updated') {
        return false;
      }
      const matchesSearch =
        company.name.toLowerCase().includes(search.toLowerCase()) ||
        company.email.toLowerCase().includes(search.toLowerCase()) ||
        company.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || company.approvalStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [companies, search, statusFilter]);

  // Pagination
  const paginatedCompanies = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCompanies.slice(startIndex, endIndex);
  }, [filteredCompanies, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    // Filter out not_updated companies for stats
    const filteredCompanies = companies.filter((c) => c.approvalStatus !== 'not_updated');
    const total = filteredCompanies.length;
    const pending = filteredCompanies.filter((c) => c.approvalStatus === 'pending').length;
    const approved = filteredCompanies.filter((c) => c.approvalStatus === 'approved').length;
    const rejected = filteredCompanies.filter((c) => c.approvalStatus === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [companies]);

  const handleApprove = async (company) => {
    if (!confirm(t('staff.companyManagement.confirm.approve', { name: company.name }))) {
      return;
    }

    setProcessing(true);
    try {
      const token = getToken();
      if (!token) {
        showError('Vui lòng đăng nhập lại');
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
          await checkAndHandle401(roleResponse);
          showError(t('staff.companyManagement.error.sessionExpired'));
          return;
        }
        const errorData = await roleResponse.json().catch(() => ({}));
        throw new Error(errorData.message || t('staff.companyManagement.error.updateRole'));
      }

      // Unban user (set status to UNBANNED)
      const statusResponse = await fetch(`${BaseURL}/api/staff/ban-user/${company.userId}?ban=false`, {
        method: 'PUT',
        headers
      });

      if (!statusResponse.ok) {
        if (statusResponse.status === 401) {
          await checkAndHandle401(statusResponse);
          showError(t('staff.companyManagement.error.sessionExpired'));
          return;
        }
        const errorData = await statusResponse.json().catch(() => ({}));
        throw new Error(errorData.message || t('staff.companyManagement.error.updateStatus'));
      }

      showSuccess(t('staff.companyManagement.success.approve'));
      setModalOpen(false);
      await fetchCompanies();
    } catch (err) {
      console.error('Error approving company:', err);
      showError(err.message || t('staff.companyManagement.error.approve'));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (company) => {
    if (!confirm(t('staff.companyManagement.confirm.reject', { name: company.name }))) {
      return;
    }

    setProcessing(true);
    try {
      const token = getToken();
      if (!token) {
        showError(t('staff.companyManagement.error.loginRequired'));
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
          await checkAndHandle401(response);
          showError(t('staff.companyManagement.error.sessionExpired'));
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t('staff.companyManagement.error.reject'));
      }

      showSuccess(t('staff.companyManagement.success.reject'));
      setModalOpen(false);
      await fetchCompanies();
    } catch (err) {
      console.error('Error rejecting company:', err);
      showError(err.message || t('staff.companyManagement.error.reject'));
    } finally {
      setProcessing(false);
    }
  };

  // Fetch file paths for a company
  const fetchCompanyFiles = async (company) => {
    try {
      setFileData({ businessLicenseUrl: null, idCardFrontUrl: null, idCardBackUrl: null, loading: true });
      const token = getToken();
      if (!token) {
        showError(t('staff.companyManagement.error.loginRequired'));
        return;
      }

      const headers = createAuthHeaders(token);
      
      // Get business upload status to get file names
      const apiUrl = `${BaseURL}/api/users/business-upload-status?email=${encodeURIComponent(company.email)}`;
      const statusResponse = await fetch(apiUrl, {
        headers
      });

      if (statusResponse.status === 401) {
        await checkAndHandle401(statusResponse);
        return;
      }
      if (!statusResponse.ok) {
        throw new Error(t('staff.companyManagement.error.loadFiles'));
      }

      const statusData = await statusResponse.json();
      const uploadStatus = statusData.result || statusData;

      // Kiểm tra nếu không có files
      if (!uploadStatus.uploaded || (!uploadStatus.businessLicenseFileName && !uploadStatus.idCardFrontFileName && !uploadStatus.idCardBackFileName)) {
        setFileData({ businessLicenseUrl: null, idCardFrontUrl: null, idCardBackUrl: null, loading: false });
        return;
      }

      // Construct file URLs from file names
      // Backend stores files in /uploads/business/registrationFile and /uploads/idcard/front, /uploads/idcard/back
      const businessLicenseUrl = uploadStatus.businessLicenseFileName 
        ? `${BaseURL}/uploads/business/registrationFile/${uploadStatus.businessLicenseFileName}`
        : null;
      const idCardFrontUrl = uploadStatus.idCardFrontFileName
        ? `${BaseURL}/uploads/idcard/front/${uploadStatus.idCardFrontFileName}`
        : null;
      const idCardBackUrl = uploadStatus.idCardBackFileName
        ? `${BaseURL}/uploads/idcard/back/${uploadStatus.idCardBackFileName}`
        : null;

      setFileData({
        businessLicenseUrl,
        idCardFrontUrl,
        idCardBackUrl,
        loading: false
      });
    } catch (err) {
      console.error('Error fetching company files:', err);
      showError(t('staff.companyManagement.error.loadFiles'));
      setFileData({ businessLicenseUrl: null, idCardFrontUrl: null, idCardBackUrl: null, loading: false });
    }
  };

  const handleViewDetails = async (company) => {
    setSelectedCompany(company);
    setModalOpen(true);
    await fetchCompanyFiles(company);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCompany(null);
    setFileData({ businessLicenseUrl: null, idCardFrontUrl: null, idCardBackUrl: null, loading: false });
  };

  const handleOpenPdf = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Check if user has permission
  if (user && !canManageCompanies) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#f6f7fb] to-[#fdfdfc]">
        <div className="max-w-md w-full rounded-[32px] bg-white/90 border border-gray-200 shadow-lg p-10 text-center">
          <div className="w-16 h-16 rounded-[20px] bg-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-6">
            <ExclamationTriangleIcon className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t('staff.companyManagement.permissionDenied.title')}</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {t('staff.companyManagement.permissionDenied.message')}
          </p>
          <button
            onClick={() => navigate('/staff/tasks')}
            className="w-full px-6 py-3 rounded-[24px] text-sm font-semibold text-white bg-[#4c9dff] hover:bg-[#3f85d6] transition-all shadow-[0_12px_30px_rgba(76,157,255,0.35)]"
          >
            {t('staff.companyManagement.permissionDenied.backButton')}
          </button>
        </div>
      </div>
    );
  }

  // Chỉ hiển thị loading full-screen khi lần load đầu tiên chưa có dữ liệu
  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c9dff] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('staff.companyManagement.loading')}</p>
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
            onClick={fetchCompanies}
            className="ml-4 px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
          >
            {t('staff.companyManagement.retry')}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-500 font-semibold mb-2">{t('staff.companyManagement.title')}</p>
          <h1 className="text-3xl font-bold text-gray-900">{t('staff.companyManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('staff.companyManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-300">
            <FunnelIcon className="h-5 w-5" />
            {t('staff.companyManagement.filters.advancedFilter')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200">
            <ArrowDownTrayIcon className="h-5 w-5" />
            {t('staff.companyManagement.filters.exportReport')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={BuildingOfficeIcon} label={t('staff.companyManagement.stats.totalCompanies')} value={stats.total} trend={t('staff.companyManagement.stats.totalCompaniesDesc')} />
        <StatCard icon={ClockIcon} label={t('staff.companyManagement.stats.pending')} value={stats.pending} trend={t('staff.companyManagement.stats.pendingDesc')} color="text-amber-500" />
        <StatCard icon={CheckCircleIcon} label={t('staff.companyManagement.stats.approved')} value={stats.approved} trend={t('staff.companyManagement.stats.approvedDesc')} color="text-green-600" />
        <StatCard icon={XCircleIcon} label={t('staff.companyManagement.stats.rejected')} value={stats.rejected} trend={t('staff.companyManagement.stats.rejectedDesc')} color="text-red-600" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('staff.companyManagement.filters.searchPlaceholder')}
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">{t('staff.companyManagement.filters.statusFilter.all')}</option>
              <option value="pending">{t('staff.companyManagement.filters.statusFilter.pending')}</option>
              <option value="approved">{t('staff.companyManagement.filters.statusFilter.approved')}</option>
              <option value="rejected">{t('staff.companyManagement.filters.statusFilter.rejected')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {[
                  t('staff.companyManagement.table.headers.company'),
                  t('staff.companyManagement.table.headers.status'),
                  t('staff.companyManagement.table.headers.registrationDate'),
                  t('staff.companyManagement.table.headers.actions')
                ].map((header) => (
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
                    {loading ? t('staff.companyManagement.table.loading') : t('staff.companyManagement.table.noResults')}
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-[#e9f2ff]/40 transition">
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
                    {company.createdAt ? new Date(company.createdAt).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN') : t('staff.companyManagement.status.na')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {(company.approvalStatus === 'pending' || company.approvalStatus === 'approved') && (
                        <button 
                          onClick={() => handleViewDetails(company)}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#4c9dff] transition" 
                          title={t('staff.companyManagement.actions.viewDetails')}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                      {company.approvalStatus === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(company)}
                            disabled={processing}
                            className="p-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                            title={t('staff.companyManagement.actions.approve')}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(company)}
                            disabled={processing}
                            className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                            title={t('staff.companyManagement.actions.reject')}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {/* Không hiển thị action cho not_updated vì chưa upload file */}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredCompanies.length >= 10 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCompanies.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Modal for viewing company files */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[#4c9dff] to-[#3f85d6] text-white px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold">{t('staff.companyManagement.modal.title')}</h2>
                <p className="text-white/80 text-sm mt-1">{selectedCompany?.name}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-full hover:bg-white/20 transition"
                aria-label={t('staff.companyManagement.modal.close')}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {fileData.loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c9dff]"></div>
                  <p className="ml-4 text-gray-600">{t('staff.companyManagement.modal.loadingFiles')}</p>
                </div>
              ) : (
                <>
                  {!fileData.businessLicenseUrl && !fileData.idCardFrontUrl && !fileData.idCardBackUrl ? (
                    <div className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 text-lg font-semibold mb-2">{t('staff.companyManagement.modal.noFiles.title')}</p>
                      <p className="text-gray-400 text-sm">
                        {t('staff.companyManagement.modal.noFiles.description')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Business License PDF */}
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#bfd7ff] rounded-lg">
                              <DocumentTextIcon className="h-6 w-6 text-[#4c9dff]" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{t('staff.companyManagement.modal.businessLicense.title')}</h3>
                              <p className="text-sm text-gray-500">{t('staff.companyManagement.modal.businessLicense.desc')}</p>
                            </div>
                          </div>
                          {fileData.businessLicenseUrl && (
                            <button
                              onClick={() => handleOpenPdf(fileData.businessLicenseUrl)}
                              className="px-4 py-2 bg-[#4c9dff] text-white rounded-lg hover:bg-[#3f85d6] transition-all duration-200 text-sm font-medium shadow-[0_12px_30px_rgba(76,157,255,0.35)] flex items-center gap-2"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                              {t('staff.companyManagement.modal.businessLicense.openInNewTab')}
                            </button>
                          )}
                        </div>
                        {!fileData.businessLicenseUrl && (
                          <p className="text-gray-400 text-sm italic">{t('staff.companyManagement.modal.businessLicense.noFile')}</p>
                        )}
                      </div>

                      {/* ID Cards - Grid layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ID Card Front */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <EyeIcon className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-900">{t('staff.companyManagement.modal.idCard.front.title')}</h3>
                              <p className="text-xs text-gray-500">{t('staff.companyManagement.modal.idCard.front.desc')}</p>
                            </div>
                          </div>
                          {fileData.idCardFrontUrl ? (
                            <div className="relative bg-gray-50 rounded-lg p-3 border-2 border-dashed border-gray-200" style={{ aspectRatio: '15/10', height: '280px' }}>
                              <div className="absolute inset-3 flex items-center justify-center overflow-hidden">
                                <img
                                  src={fileData.idCardFrontUrl}
                                  alt={t('staff.companyManagement.modal.idCard.front.alt')}
                                  className="w-full h-full rounded-lg shadow-md object-contain"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const errorMsg = e.target.nextElementSibling;
                                    if (errorMsg) errorMsg.style.display = 'block';
                                  }}
                                />
                                <p className="text-red-500 text-sm hidden text-center absolute">{t('staff.companyManagement.modal.idCard.imageLoadError')}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200" style={{ aspectRatio: '15/10', height: '280px' }}>
                              <p className="text-gray-400 text-sm">{t('staff.companyManagement.modal.idCard.noImage')}</p>
                            </div>
                          )}
                        </div>

                        {/* ID Card Back */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <EyeIcon className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-900">{t('staff.companyManagement.modal.idCard.back.title')}</h3>
                              <p className="text-xs text-gray-500">{t('staff.companyManagement.modal.idCard.back.desc')}</p>
                            </div>
                          </div>
                          {fileData.idCardBackUrl ? (
                            <div className="relative bg-gray-50 rounded-lg p-3 border-2 border-dashed border-gray-200" style={{ aspectRatio: '15/10', height: '280px' }}>
                              <div className="absolute inset-3 flex items-center justify-center overflow-hidden">
                                <img
                                  src={fileData.idCardBackUrl}
                                  alt={t('staff.companyManagement.modal.idCard.back.alt')}
                                  className="w-full h-full rounded-lg shadow-md object-contain"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const errorMsg = e.target.nextElementSibling;
                                    if (errorMsg) errorMsg.style.display = 'block';
                                  }}
                                />
                                <p className="text-red-500 text-sm hidden text-center absolute">{t('staff.companyManagement.modal.idCard.imageLoadError')}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200" style={{ aspectRatio: '15/10', height: '280px' }}>
                              <p className="text-gray-400 text-sm">{t('staff.companyManagement.modal.idCard.noImage')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              {selectedCompany?.approvalStatus === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedCompany)}
                    disabled={processing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {t('staff.companyManagement.actions.reject')}
                  </button>
                  <button
                    onClick={() => handleApprove(selectedCompany)}
                    disabled={processing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {t('staff.companyManagement.actions.approve')}
                  </button>
                </>
              )}
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                {t('staff.companyManagement.modal.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: IconComponent, label, value, trend, color = 'text-blue-600' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-[#e9f2ff] flex items-center justify-center">
          <IconComponent className="h-6 w-6 text-[#4c9dff]" />
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

const ApprovalStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const statusMap = {
    pending: { color: 'bg-amber-100 text-amber-700', label: t('staff.companyManagement.status.pending'), icon: ClockIcon },
    not_updated: { color: 'bg-gray-100 text-gray-700', label: t('staff.companyManagement.status.notUpdated'), icon: ClockIcon },
    approved: { color: 'bg-green-100 text-green-700', label: t('staff.companyManagement.status.approved'), icon: CheckCircleIcon },
    rejected: { color: 'bg-red-100 text-red-700', label: t('staff.companyManagement.status.rejected'), icon: XCircleIcon }
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
