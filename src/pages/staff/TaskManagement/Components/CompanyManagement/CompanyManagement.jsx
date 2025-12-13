import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders, getAvatarUrl, getImageUrl } from '../../../../../config/api';
import { checkAndHandle401 } from '../../../../../utils/apiErrorHandler';
import Pagination from '../../../../admin/Pagination';
import DeleteConfirmModal from '../../../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import { CheckCircle, XCircle } from 'lucide-react';
import {
  BuildingOfficeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
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
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [companyToApprove, setCompanyToApprove] = useState(null);
  const [companyToReject, setCompanyToReject] = useState(null);

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
      // Silently handle error fetching companies
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

  // Handle approve - opens modal
  const handleApprove = (company) => {
    setCompanyToApprove(company);
    setIsApproveModalOpen(true);
  };

  // Confirm approve - calls API
  const confirmApprove = async () => {
    if (!companyToApprove) return;

    setProcessing(true);
    try {
      const token = getToken();
      if (!token) {
        showError('Vui lòng đăng nhập lại');
        return;
      }

      const headers = createAuthHeaders(token);

      // Chỉ update role lên COMPANY. Backend sẽ tự cập nhật Status (ví dụ: từ WAITING_FOR_APPROVAL -> UNBANNED).
      const roleResponse = await fetch(`${BaseURL}/api/staff/update-role/${companyToApprove.userId}?role=COMPANY`, {
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

      setIsApproveModalOpen(false);
      setCompanyToApprove(null);
      showSuccess(t('staff.companyManagement.success.approve'));
      setModalOpen(false);
      await fetchCompanies();
    } catch (err) {
      // Silently handle error approving company
      showError(err.message || t('staff.companyManagement.error.approve'));
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject - opens modal
  const handleReject = (company) => {
    setCompanyToReject(company);
    setIsRejectModalOpen(true);
  };

  // Confirm reject - calls API
  const confirmReject = async () => {
    if (!companyToReject) return;

    // Theo yêu cầu: từ chối không gọi API ban/unban ở đây, chỉ hiển thị thông báo.
    try {
      setIsRejectModalOpen(false);
      setCompanyToReject(null);
      showSuccess(t('staff.companyManagement.success.reject'));
      setModalOpen(false);
    } catch (err) {
      // Silently handle error rejecting company
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

      // Construct file URLs from file names using getImageUrl helper
      // Backend behavior:
      // - Local: Returns relative path like "/uploads/business/registrationFile/filename.pdf"
      // - Azure: Returns full Azure Blob Storage URL like "https://kdbsstorage.blob.core.windows.net/..."
      // getImageUrl will:
      // - Extract full Azure URL if it's embedded in the path
      // - Convert relative paths to absolute URLs (BaseURL + path) for local files
      const getFileUrl = (fileName, basePath) => {
        if (!fileName) return null;
        
        // Trim whitespace
        const trimmed = fileName.trim();
        if (!trimmed) return null;
        
        // Case 1: Already a full URL (starts with http:// or https://)
        // This happens when backend returns Azure Blob Storage URL directly
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          return trimmed; // Return as-is, it's already a full URL
        }
        
        // Case 2: Contains full URL embedded in path (e.g., "/uploads/path/https://...")
        // This can happen if backend incorrectly prefixes Azure URL with a path
        if (trimmed.includes('https://') || trimmed.includes('http://')) {
          const httpsIndex = trimmed.indexOf('https://');
          const httpIndex = trimmed.indexOf('http://');
          const urlStartIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;
          if (urlStartIndex >= 0) {
            return trimmed.substring(urlStartIndex); // Extract full URL
          }
        }
        
        // Case 3: Starts with / (relative path from backend)
        // This happens in local development
        if (trimmed.startsWith('/')) {
          // Use getImageUrl to convert to absolute URL (BaseURL + path)
          return getImageUrl(trimmed);
        }
        
        // Case 4: Just a filename (no path prefix)
        // Prepend the appropriate base path and convert to absolute URL
        const fullPath = `${basePath}/${trimmed}`;
        return getImageUrl(fullPath);
      };

      const businessLicenseUrl = getFileUrl(uploadStatus.businessLicenseFileName, '/uploads/business/registrationFile');
      const idCardFrontUrl = getFileUrl(uploadStatus.idCardFrontFileName, '/uploads/idcard/front');
      const idCardBackUrl = getFileUrl(uploadStatus.idCardBackFileName, '/uploads/idcard/back');

      setFileData({
        businessLicenseUrl,
        idCardFrontUrl,
        idCardBackUrl,
        loading: false
      });
    } catch (err) {
      // Silently handle error fetching company files
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
    if (!url) return;
    
    try {
      // Đảm bảo URL là absolute URL (không phải relative)
      // Azure URLs đã là absolute, nhưng local URLs có thể cần kiểm tra
      let absoluteUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Nếu là relative URL, convert thành absolute
        absoluteUrl = url.startsWith('/') ? `${BaseURL}${url}` : `${BaseURL}/${url}`;
      }
      
      // Kiểm tra nếu là Azure Blob Storage URL
      const isAzureUrl = absoluteUrl.includes('blob.core.windows.net');
      
      // Đối với Azure URLs: Mở trực tiếp trong tab mới
      // Vì URL gốc đã hiển thị đúng khi mở trực tiếp, không cần thêm query parameter
      if (isAzureUrl) {
        // Vấn đề: Khi mở từ JavaScript event, browser có thể treat như download
        // Giải pháp: Tạo một link thật sự và trigger click event với user gesture
        const link = document.createElement('a');
        link.href = absoluteUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        // Quan trọng: KHÔNG thêm download attribute
        // Thêm vào DOM trước khi click để browser nhận diện đúng
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Sử dụng requestAnimationFrame để đảm bảo link đã được thêm vào DOM
        requestAnimationFrame(() => {
          // Trigger click event
          link.click();
          
          // Clean up sau một chút
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
          }, 100);
        });
      } else {
        // Đối với local URLs, mở trong tab mới
        const newWindow = window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          const link = document.createElement('a');
          link.href = absoluteUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
          }, 100);
        } else {
          newWindow.focus();
        }
      }
    } catch (error) {
      showError(t('staff.companyManagement.modal.openPdfError') || 'Không thể mở PDF. Vui lòng thử lại.');
    }
  };

  const handleDownloadPdf = async (url) => {
    if (!url) return;
    
    try {
      // Đảm bảo URL là absolute URL
      let absoluteUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        absoluteUrl = url.startsWith('/') ? `${BaseURL}${url}` : `${BaseURL}/${url}`;
      }
      
      // Kiểm tra nếu là Azure Blob Storage URL
      const isAzureUrl = absoluteUrl.includes('blob.core.windows.net');
      
      // Get filename from URL or use default
      let filename = 'business-license.pdf';
      if (isAzureUrl) {
        try {
          // Lấy phần path từ URL (trước dấu ?)
          const pathPart = absoluteUrl.split('?')[0];
          // Decode URL để lấy path thật
          const decodedPath = decodeURIComponent(pathPart);
          // Lấy tên file cuối cùng từ path
          const pathParts = decodedPath.split('/');
          const lastPart = pathParts[pathParts.length - 1];
          // Lấy tên file (loại bỏ timestamp prefix nếu có, format: timestamp_filename)
          if (lastPart && lastPart.includes('_')) {
            const parts = lastPart.split('_');
            // Bỏ phần đầu (timestamp), lấy phần còn lại
            filename = parts.slice(1).join('_');
          } else if (lastPart) {
            filename = lastPart;
          }
        } catch (e) {
          // Error extracting filename, using default
        }
      } else {
        const urlParts = absoluteUrl.split('/');
        filename = urlParts[urlParts.length - 1].split('?')[0] || 'business-license.pdf';
      }
      
      if (isAzureUrl) {
        // Đối với Azure URLs: Không thể fetch do CORS, dùng response-content-disposition=attachment
        let downloadUrl = absoluteUrl;
        
        // Loại bỏ response-content-disposition cũ nếu có (có thể là inline từ button Open)
        const urlParts = downloadUrl.split('?');
        const baseUrl = urlParts[0];
        let queryString = urlParts[1] || '';
        
        if (queryString) {
          const params = new URLSearchParams(queryString);
          params.delete('response-content-disposition');
          queryString = params.toString();
        }
        
        // Thêm response-content-disposition=attachment để force download
        // Chỉ encode filename, không encode cả path
        const encodedFilename = encodeURIComponent(filename);
        const newParam = `response-content-disposition=attachment%3Bfilename%3D${encodedFilename}`;
        
        if (queryString) {
          downloadUrl = `${baseUrl}?${queryString}&${newParam}`;
        } else {
          downloadUrl = `${baseUrl}?${newParam}`;
        }
        
        // Vì Azure Blob Storage có thể chặn embedding và CORS,
        // cách tốt nhất là mở trong tab mới với response-content-disposition=attachment
        // Browser sẽ tự động download nếu header được set đúng
        // Nếu không, user có thể right-click > Save As
        
        // Thử dùng iframe ẩn trước (có thể không hoạt động nếu Azure chặn)
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.src = downloadUrl;
        document.body.appendChild(iframe);
        
        // Listen for iframe load/error
        iframe.onerror = () => {
          // Fallback: mở trong tab mới
          window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        };
        
        // Clean up iframe sau 3 giây
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          
          // Nếu iframe không trigger download, thử mở trong tab mới
          // User có thể right-click > Save As nếu cần
          const newWindow = window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        }, 3000);
      } else {
        // Đối với local URLs, cần authentication headers
        const token = getToken();
        if (!token) {
          showError(t('common.errors.loginRequired') || 'Vui lòng đăng nhập lại');
          return;
        }

        const headers = createAuthHeaders(token);
        const response = await fetch(absoluteUrl, { 
          headers,
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error('Failed to download file');
        }

        // Convert response to blob
        const blob = await response.blob();
        
        // Create blob URL and download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
      }
    } catch (error) {
      showError(t('staff.companyManagement.modal.downloadError') || 'Không thể tải file. Vui lòng thử lại.');
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
          <button 
            onClick={fetchCompanies}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
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
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-white via-gray-50/40 to-slate-50/50 rounded-[32px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100/50">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-white/90 via-gray-50/70 to-slate-50/80 backdrop-blur-md border-b border-gray-200/30 px-8 py-3 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">{t('staff.companyManagement.modal.title')}</h2>
                <p className="text-gray-600 text-sm mt-1 font-medium">{selectedCompany?.name}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-[16px] hover:bg-white/60 transition-all duration-200 text-gray-600 hover:text-gray-800"
                aria-label={t('staff.companyManagement.modal.close')}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              {fileData.loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300"></div>
                  <p className="ml-4 text-gray-600 font-medium">{t('staff.companyManagement.modal.loadingFiles')}</p>
                </div>
              ) : (
                <>
                  {!fileData.businessLicenseUrl && !fileData.idCardFrontUrl && !fileData.idCardBackUrl ? (
                    <div className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-20 h-20 mb-5">
                        <DocumentTextIcon className="h-10 w-10 text-gray-400" />
                      </div>
                      <p className="text-gray-700 text-lg font-semibold mb-2">{t('staff.companyManagement.modal.noFiles.title')}</p>
                      <p className="text-gray-500 text-sm">
                        {t('staff.companyManagement.modal.noFiles.description')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Business License PDF */}
                      <div className="bg-white/70 backdrop-blur-sm rounded-[28px] border border-gray-200/50 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3">
                              <DocumentTextIcon className="h-6 w-6 text-gray-500" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800">{t('staff.companyManagement.modal.businessLicense.title')}</h3>
                              <p className="text-sm text-gray-600 mt-0.5">{t('staff.companyManagement.modal.businessLicense.desc')}</p>
                            </div>
                          </div>
                          {fileData.businessLicenseUrl && (
                            <div className="flex items-center gap-2">
                              {fileData.businessLicenseUrl.includes('blob.core.windows.net') ? (
                                // Azure URLs: Dùng link thật với response-content-disposition=inline để force hiển thị
                                (() => {
                                  // Thêm query parameter để force inline display (hiển thị thay vì download)
                                  let openUrl = fileData.businessLicenseUrl;
                                  if (!openUrl.includes('response-content-disposition')) {
                                    const separator = openUrl.includes('?') ? '&' : '?';
                                    openUrl = `${openUrl}${separator}response-content-disposition=inline`;
                                  }
                                  return (
                                    <a
                                      href={openUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-5 py-2.5 bg-[#4c9dff] text-white rounded-[20px] hover:bg-[#3f85d6] transition-all duration-200 text-sm font-medium shadow-[0_12px_30px_rgba(76,157,255,0.35)] flex items-center gap-2 cursor-pointer"
                                    >
                                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                      {t('staff.companyManagement.modal.businessLicense.openInNewTab')}
                                    </a>
                                  );
                                })()
                              ) : (
                                // Local URLs: Dùng button với onClick (có thể cần authentication)
                                <button
                                  onClick={() => handleOpenPdf(fileData.businessLicenseUrl)}
                                  className="px-5 py-2.5 bg-[#4c9dff] text-white rounded-[20px] hover:bg-[#3f85d6] transition-all duration-200 text-sm font-medium shadow-[0_12px_30px_rgba(76,157,255,0.35)] flex items-center gap-2"
                                >
                                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                  {t('staff.companyManagement.modal.businessLicense.openInNewTab')}
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadPdf(fileData.businessLicenseUrl)}
                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-[20px] hover:bg-gray-200 transition-all duration-200 text-sm font-medium flex items-center gap-2"
                                title={t('staff.companyManagement.modal.businessLicense.download') || 'Tải xuống'}
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                {t('staff.companyManagement.modal.businessLicense.download') || 'Tải xuống'}
                              </button>
                            </div>
                          )}
                        </div>
                        {!fileData.businessLicenseUrl && (
                          <p className="text-gray-500 text-sm italic pl-16">{t('staff.companyManagement.modal.businessLicense.noFile')}</p>
                        )}
                      </div>

                      {/* ID Cards - Grid layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-fit mx-auto">
                        {/* ID Card Front */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-[28px] border border-purple-200/50 shadow-sm p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3">
                              <EyeIcon className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-800">{t('staff.companyManagement.modal.idCard.front.title')}</h3>
                              <p className="text-xs text-gray-600 mt-0.5">{t('staff.companyManagement.modal.idCard.front.desc')}</p>
                            </div>
                          </div>
                          {fileData.idCardFrontUrl ? (
                            <div className="relative bg-gradient-to-br from-purple-50/50 to-gray-50/50 rounded-[24px] p-4 border-2 border-dashed border-purple-200/60 w-full" style={{ aspectRatio: '15/10', height: '280px' }}>
                              <div className="absolute inset-4 flex items-center justify-center overflow-hidden rounded-[20px]">
                                <img
                                  src={fileData.idCardFrontUrl}
                                  alt={t('staff.companyManagement.modal.idCard.front.alt')}
                                  className="w-full h-full rounded-[20px] shadow-lg object-contain"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const errorMsg = e.target.nextElementSibling;
                                    if (errorMsg) errorMsg.style.display = 'block';
                                  }}
                                />
                                <p className="text-red-400 text-sm hidden text-center absolute">{t('staff.companyManagement.modal.idCard.imageLoadError')}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center bg-gradient-to-br from-purple-50/50 to-gray-50/50 rounded-[24px] border-2 border-dashed border-purple-200/60 w-full" style={{ aspectRatio: '15/10', height: '280px' }}>
                              <p className="text-gray-500 text-sm">{t('staff.companyManagement.modal.idCard.noImage')}</p>
                            </div>
                          )}
                        </div>

                        {/* ID Card Back */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-[28px] border border-orange-200/50 shadow-sm p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3">
                              <EyeIcon className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-800">{t('staff.companyManagement.modal.idCard.back.title')}</h3>
                              <p className="text-xs text-gray-600 mt-0.5">{t('staff.companyManagement.modal.idCard.back.desc')}</p>
                            </div>
                          </div>
                          {fileData.idCardBackUrl ? (
                            <div className="relative bg-gradient-to-br from-orange-50/50 to-gray-50/50 rounded-[24px] p-4 border-2 border-dashed border-orange-200/60 w-full" style={{ aspectRatio: '15/10', height: '280px' }}>
                              <div className="absolute inset-4 flex items-center justify-center overflow-hidden rounded-[20px]">
                                <img
                                  src={fileData.idCardBackUrl}
                                  alt={t('staff.companyManagement.modal.idCard.back.alt')}
                                  className="w-full h-full rounded-[20px] shadow-lg object-contain"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const errorMsg = e.target.nextElementSibling;
                                    if (errorMsg) errorMsg.style.display = 'block';
                                  }}
                                />
                                <p className="text-red-400 text-sm hidden text-center absolute">{t('staff.companyManagement.modal.idCard.imageLoadError')}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center bg-gradient-to-br from-orange-50/50 to-gray-50/50 rounded-[24px] border-2 border-dashed border-orange-200/60 w-full" style={{ aspectRatio: '15/10', height: '280px' }}>
                              <p className="text-gray-500 text-sm">{t('staff.companyManagement.modal.idCard.noImage')}</p>
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
            <div className="sticky bottom-0 bg-gradient-to-r from-white/90 via-gray-50/70 to-slate-50/80 backdrop-blur-md border-t border-gray-200/30 px-8 py-4 flex justify-end gap-3">
              {selectedCompany?.approvalStatus === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedCompany)}
                    disabled={processing}
                    className="px-5 py-2.5 bg-red-200/80 hover:bg-red-300/80 text-red-700 rounded-[20px] transition-all duration-200 text-sm font-medium shadow-sm border border-red-300/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('staff.companyManagement.actions.reject')}
                  </button>
                  <button
                    onClick={() => handleApprove(selectedCompany)}
                    disabled={processing}
                    className="px-5 py-2.5 bg-green-200/80 hover:bg-green-300/80 text-green-700 rounded-[20px] transition-all duration-200 text-sm font-medium shadow-sm border border-green-300/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('staff.companyManagement.actions.approve')}
                  </button>
                </>
              )}
              <button
                onClick={handleCloseModal}
                className="px-6 py-2.5 border border-gray-300/50 rounded-[20px] text-gray-700 hover:bg-white/60 transition-all duration-200 font-medium bg-white/40 backdrop-blur-sm"
              >
                {t('staff.companyManagement.modal.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setCompanyToApprove(null);
        }}
        onConfirm={confirmApprove}
        title={t('staff.companyManagement.approveConfirm.title')}
        message={t('staff.companyManagement.approveConfirm.message', { name: companyToApprove?.name })}
        itemName={companyToApprove?.name}
        confirmText={t('staff.companyManagement.approveConfirm.confirm')}
        cancelText={t('staff.companyManagement.approveConfirm.cancel')}
        danger={false}
        icon={<CheckCircle size={36} strokeWidth={1.5} />}
      />

      {/* Reject Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setCompanyToReject(null);
        }}
        onConfirm={confirmReject}
        title={t('staff.companyManagement.rejectConfirm.title')}
        message={t('staff.companyManagement.rejectConfirm.message', { name: companyToReject?.name })}
        itemName={companyToReject?.name}
        confirmText={t('staff.companyManagement.rejectConfirm.confirm')}
        cancelText={t('staff.companyManagement.rejectConfirm.cancel')}
        danger={true}
        icon={<XCircle size={36} strokeWidth={1.5} />}
      />
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
