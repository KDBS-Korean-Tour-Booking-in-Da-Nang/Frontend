import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders, getAvatarUrl, getImageUrl } from '../../../../../config/api';
import { checkAndHandle401 } from '../../../../../utils/apiErrorHandler';
import Pagination from '../../../../admin/Pagination';
import DeleteConfirmModal from '../../../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import { 
  CheckCircle, 
  XCircle, 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle as XCircleIcon, 
  ExternalLink, 
  Download, 
  Search, 
  Phone, 
  MapPin, 
  Eye, 
  Check, 
  X, 
  FileText, 
  AlertTriangle 
} from 'lucide-react';

const CompanyManagement = () => {
  const { t, i18n } = useTranslation();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [errorMessage, setErrorMessage] = useState('');

  // Kiểm tra user có permission để manage companies không: check staffTask === 'COMPANY_REQUEST_AND_RESOLVE_TICKET' hoặc role === 'ADMIN'
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
  const isInitialMountRef = useRef(true);

  // Fetch companies (users với role COMPANY/BUSINESS) từ API: gọi USERS endpoint, filter users với role COMPANY hoặc BUSINESS, map backend data sang frontend format (approvalStatus: pending, not_updated, approved, rejected), không gọi checkAndHandle401 trong initial background loading (skip401Check = true) để tránh premature logout, set companies state
  const fetchCompanies = async (skip401Check = false) => {
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
          // Don't call checkAndHandle401 in initial background loading to avoid premature logout
          // Only check 401 in user-initiated actions (like refresh, approve, reject)
          if (!skip401Check) {
            await checkAndHandle401(response);
            setError(t('staff.companyManagement.error.sessionExpired'));
          }
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const users = data.result || data || [];
      
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
      setError(t('staff.companyManagement.error.loadCompanies'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch companies khi component mount: skip 401 check chỉ trên initial mount để tránh premature logout, sau initial mount luôn check 401 (bao gồm khi gọi từ user actions)
  useEffect(() => {
    if (canManageCompanies) {
      const skip401Check = isInitialMountRef.current;
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
      }
      fetchCompanies(skip401Check);
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

  // Pagination: slice filteredCompanies theo currentPage và itemsPerPage, return paginated companies array
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

  // Tính stats: filter out not_updated companies, tính total, pending, approved, rejected, return stats object
  const stats = useMemo(() => {
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

  // Confirm approve: gọi staff/update-role endpoint với PUT và role=COMPANY (backend sẽ tự cập nhật Status từ WAITING_FOR_APPROVAL -> UNBANNED), refresh companies list sau khi thành công, handle 401, show success toast
  const confirmApprove = async () => {
    if (!companyToApprove) return;

    setProcessing(true);
    try {
      const token = getToken();
      if (!token) {
        setErrorMessage('Vui lòng đăng nhập lại');
        return;
      }

      const headers = createAuthHeaders(token);

      const roleResponse = await fetch(`${BaseURL}/api/staff/update-role/${companyToApprove.userId}?role=COMPANY`, {
        method: 'PUT',
        headers
      });

      if (!roleResponse.ok) {
        if (roleResponse.status === 401) {
          await checkAndHandle401(roleResponse);
          setErrorMessage(t('staff.companyManagement.error.sessionExpired'));
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
      setErrorMessage(err.message || t('staff.companyManagement.error.approve'));
    } finally {
      setProcessing(false);
    }
  };

  // Xử lý reject: set companyToReject và mở reject modal
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
      setErrorMessage(err.message || t('staff.companyManagement.error.reject'));
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
        setErrorMessage(t('staff.companyManagement.error.loginRequired'));
        return;
      }

      const headers = createAuthHeaders(token);
      
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

      // Construct file URLs từ file names sử dụng getImageUrl helper: backend có thể return relative path (local) hoặc full Azure Blob Storage URL, getImageUrl sẽ extract full Azure URL nếu embedded trong path hoặc convert relative paths sang absolute URLs (BaseURL + path) cho local files
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
            return trimmed.substring(urlStartIndex);
          }
        }
        
        if (trimmed.startsWith('/')) {
          return getImageUrl(trimmed);
        }
        
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
      setErrorMessage(t('staff.companyManagement.error.loadFiles'));
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
      setErrorMessage(t('staff.companyManagement.modal.openPdfError') || 'Không thể mở PDF. Vui lòng thử lại.');
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
          setErrorMessage(t('common.errors.loginRequired') || 'Vui lòng đăng nhập lại');
          return;
        }

        const headers = createAuthHeaders(token);
        const response = await fetch(absoluteUrl, { 
          headers,
          method: 'GET'
        });

        if (!response.ok && response.status === 401) {
          await checkAndHandle401(response);
          return;
        }
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
      setErrorMessage(t('staff.companyManagement.modal.downloadError') || 'Không thể tải file. Vui lòng thử lại.');
    }
  };

  // Check if user has permission
  if (user && !canManageCompanies) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="max-w-md w-full rounded-[32px] bg-white border p-10 text-center shadow-sm" style={{ borderColor: '#F0F0F0' }}>
          <div className="w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#FFF4E6' }}>
            <AlertTriangle className="h-7 w-7" style={{ color: '#FFB84D' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">{t('staff.companyManagement.permissionDenied.title')}</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            {t('staff.companyManagement.permissionDenied.message')}
          </p>
          <button
            onClick={() => navigate('/staff/tasks')}
            className="w-full px-6 py-3 rounded-[24px] text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: '#66B3FF' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4DA3FF'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#66B3FF'}
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#66B3FF' }}></div>
          <p className="mt-4 text-gray-600">{t('staff.companyManagement.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-[20px] flex items-center justify-between text-sm" style={{ backgroundColor: '#FFE6F0', borderColor: '#FFB3B3', color: '#FF80B3', borderWidth: '1px', borderStyle: 'solid' }}>
          <span>{error}</span>
          <button
            onClick={fetchCompanies}
            className="ml-4 px-3 py-1 text-xs font-semibold rounded-[16px] transition"
            style={{ backgroundColor: '#FFB3B3', color: '#FFFFFF' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#FF80B3'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#FFB3B3'}
          >
            {t('staff.companyManagement.retry')}
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="px-4 py-3 rounded-[20px] flex items-center justify-between text-sm" style={{ backgroundColor: '#FFE6F0', borderColor: '#FFB3B3', color: '#FF80B3', borderWidth: '1px', borderStyle: 'solid' }}>
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage('')}
            className="ml-4 px-3 py-1 text-xs font-semibold rounded-[16px] transition"
            style={{ backgroundColor: '#FFB3B3', color: '#FFFFFF' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#FF80B3'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#FFB3B3'}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>{t('staff.companyManagement.title')}</p>
          <h1 className="text-3xl font-semibold text-gray-800">{t('staff.companyManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('staff.companyManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Building2} label={t('staff.companyManagement.stats.totalCompanies')} value={stats.total} trend={t('staff.companyManagement.stats.totalCompaniesDesc')} color="blue" />
        <StatCard icon={Clock} label={t('staff.companyManagement.stats.pending')} value={stats.pending} trend={t('staff.companyManagement.stats.pendingDesc')} color="amber" />
        <StatCard icon={CheckCircle2} label={t('staff.companyManagement.stats.approved')} value={stats.approved} trend={t('staff.companyManagement.stats.approvedDesc')} color="green" />
        <StatCard icon={XCircleIcon} label={t('staff.companyManagement.stats.rejected')} value={stats.rejected} trend={t('staff.companyManagement.stats.rejectedDesc')} color="red" />
      </div>

      <div className="bg-white rounded-[28px] shadow-sm border" style={{ borderColor: '#F0F0F0' }}>
        <div className="flex flex-col gap-3 p-5 border-b lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: '#F0F0F0' }}>
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('staff.companyManagement.filters.searchPlaceholder')}
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
              <option value="ALL">{t('staff.companyManagement.filters.statusFilter.all')}</option>
              <option value="pending">{t('staff.companyManagement.filters.statusFilter.pending')}</option>
              <option value="approved">{t('staff.companyManagement.filters.statusFilter.approved')}</option>
              <option value="rejected">{t('staff.companyManagement.filters.statusFilter.rejected')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: '#F0F0F0' }}>
            <thead style={{ backgroundColor: '#FAFAFA' }}>
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
            <tbody className="bg-white divide-y" style={{ borderColor: '#F0F0F0' }}>
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    {loading ? t('staff.companyManagement.table.loading') : t('staff.companyManagement.table.noResults')}
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map((company) => (
                <tr key={company.id} className="transition" style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6F3FF'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <img 
                        src={company.avatar || '/default-avatar.png'} 
                        alt={company.name} 
                        className="h-12 w-12 rounded-[20px] object-cover border mt-1.5"
                        style={{ borderColor: '#E0E0E0' }}
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                      <div className="mt-1.5">
                        <p className="font-semibold text-gray-800 mb-0">{company.name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                          {company.email && <span>{company.email}</span>}
                          {company.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                              {company.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                          {company.address && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
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
                          title={t('staff.companyManagement.actions.viewDetails')}
                        >
                          <Eye className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      )}
                      {company.approvalStatus === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(company)}
                            disabled={processing}
                            className="p-2 rounded-[20px] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                            style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
                            onMouseEnter={(e) => {
                              if (!e.target.disabled) {
                                e.target.style.backgroundColor = '#BBF7D0';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!e.target.disabled) {
                                e.target.style.backgroundColor = '#DCFCE7';
                              }
                            }}
                            title={t('staff.companyManagement.actions.approve')}
                          >
                            <Check className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                          <button 
                            onClick={() => handleReject(company)}
                            disabled={processing}
                            className="p-2 rounded-[20px] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                            style={{ backgroundColor: '#FFE6F0', color: '#FF80B3' }}
                            onMouseEnter={(e) => {
                              if (!e.target.disabled) {
                                e.target.style.backgroundColor = '#FFB3B3';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!e.target.disabled) {
                                e.target.style.backgroundColor = '#FFE6F0';
                              }
                            }}
                            title={t('staff.companyManagement.actions.reject')}
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div className="bg-white rounded-[32px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border" style={{ borderColor: '#F0F0F0' }}>
            {/* Header */}
            <div className="sticky top-0 px-8 py-3 flex items-center justify-between z-10 border-b" style={{ backgroundColor: '#E6F3FF', borderColor: '#CCE6FF' }}>
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">{t('staff.companyManagement.modal.title')}</h2>
                <p className="text-sm mt-1 font-medium" style={{ color: '#66B3FF' }}>{selectedCompany?.name}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-[20px] transition-all duration-200"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#F5F5F5';
                  e.target.style.color = '#6B7280';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#9CA3AF';
                }}
                aria-label={t('staff.companyManagement.modal.close')}
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8" style={{ backgroundColor: '#FAFAFA' }}>
              {fileData.loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#66B3FF' }}></div>
                  <p className="ml-4 text-gray-600 font-medium">{t('staff.companyManagement.modal.loadingFiles')}</p>
                </div>
              ) : (
                <>
                  {!fileData.businessLicenseUrl && !fileData.idCardFrontUrl && !fileData.idCardBackUrl ? (
                    <div className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-20 h-20 mb-5 rounded-[24px]" style={{ backgroundColor: '#F5F5F5' }}>
                        <FileText className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
                      </div>
                      <p className="text-gray-700 text-lg font-semibold mb-2">{t('staff.companyManagement.modal.noFiles.title')}</p>
                      <p className="text-gray-500 text-sm">
                        {t('staff.companyManagement.modal.noFiles.description')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Business License PDF */}
                      <div className="bg-white rounded-[28px] border shadow-sm p-6" style={{ borderColor: '#F0F0F0' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-[20px]" style={{ backgroundColor: '#E6F3FF' }}>
                              <FileText className="h-6 w-6" style={{ color: '#66B3FF' }} strokeWidth={1.5} />
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
                                      className="px-5 py-2.5 text-white rounded-[20px] transition-all duration-200 text-sm font-semibold flex items-center gap-2 cursor-pointer"
                                      style={{ backgroundColor: '#66B3FF' }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = '#4DA3FF'}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = '#66B3FF'}
                                    >
                                      <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                                      {t('staff.companyManagement.modal.businessLicense.openInNewTab')}
                                    </a>
                                  );
                                })()
                              ) : (
                                // Local URLs: Dùng button với onClick (có thể cần authentication)
                                <button
                                  onClick={() => handleOpenPdf(fileData.businessLicenseUrl)}
                                  className="px-5 py-2.5 text-white rounded-[20px] transition-all duration-200 text-sm font-semibold flex items-center gap-2"
                                  style={{ backgroundColor: '#66B3FF' }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#4DA3FF'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#66B3FF'}
                                >
                                  <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                                  {t('staff.companyManagement.modal.businessLicense.openInNewTab')}
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadPdf(fileData.businessLicenseUrl)}
                                className="px-5 py-2.5 rounded-[20px] transition-all duration-200 text-sm font-semibold flex items-center gap-2"
                                style={{ backgroundColor: '#F5F5F5', color: '#4B5563', border: '1px solid #E0E0E0' }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#E5E5E5';
                                  e.target.style.borderColor = '#D0D0D0';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#F5F5F5';
                                  e.target.style.borderColor = '#E0E0E0';
                                }}
                                title={t('staff.companyManagement.modal.businessLicense.download') || 'Tải xuống'}
                              >
                                <Download className="h-4 w-4" strokeWidth={1.5} />
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
                        <div className="bg-white rounded-[28px] border shadow-sm p-5" style={{ borderColor: '#F0E6FF' }}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-[20px]" style={{ backgroundColor: '#F0E6FF' }}>
                              <Eye className="h-5 w-5" style={{ color: '#B380FF' }} strokeWidth={1.5} />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-800">{t('staff.companyManagement.modal.idCard.front.title')}</h3>
                              <p className="text-xs text-gray-600 mt-0.5">{t('staff.companyManagement.modal.idCard.front.desc')}</p>
                            </div>
                          </div>
                          {fileData.idCardFrontUrl ? (
                            <div className="relative rounded-[24px] p-4 border-2 border-dashed w-full" style={{ backgroundColor: '#FAF5FF', borderColor: '#E9D5FF', aspectRatio: '15/10', height: '280px' }}>
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
                            <div className="flex justify-center items-center rounded-[24px] border-2 border-dashed w-full" style={{ backgroundColor: '#FAF5FF', borderColor: '#E9D5FF', aspectRatio: '15/10', height: '280px' }}>
                              <p className="text-gray-500 text-sm">{t('staff.companyManagement.modal.idCard.noImage')}</p>
                            </div>
                          )}
                        </div>

                        {/* ID Card Back */}
                        <div className="bg-white rounded-[28px] border shadow-sm p-5" style={{ borderColor: '#FFE5CC' }}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-[20px]" style={{ backgroundColor: '#FFF4E6' }}>
                              <Eye className="h-5 w-5" style={{ color: '#FFB84D' }} strokeWidth={1.5} />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-800">{t('staff.companyManagement.modal.idCard.back.title')}</h3>
                              <p className="text-xs text-gray-600 mt-0.5">{t('staff.companyManagement.modal.idCard.back.desc')}</p>
                            </div>
                          </div>
                          {fileData.idCardBackUrl ? (
                            <div className="relative rounded-[24px] p-4 border-2 border-dashed w-full" style={{ backgroundColor: '#FFF4E6', borderColor: '#FFE5CC', aspectRatio: '15/10', height: '280px' }}>
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
                            <div className="flex justify-center items-center rounded-[24px] border-2 border-dashed w-full" style={{ backgroundColor: '#FFF4E6', borderColor: '#FFE5CC', aspectRatio: '15/10', height: '280px' }}>
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
            <div className="sticky bottom-0 px-8 py-4 flex justify-end gap-3 border-t" style={{ backgroundColor: '#FAFAFA', borderColor: '#F0F0F0' }}>
              {selectedCompany?.approvalStatus === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedCompany)}
                    disabled={processing}
                    className="px-5 py-2.5 rounded-[20px] transition-all duration-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#FFE6F0', color: '#FF80B3', border: '1px solid #FFB3B3' }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = '#FFB3B3';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = '#FFE6F0';
                      }
                    }}
                  >
                    {t('staff.companyManagement.actions.reject')}
                  </button>
                  <button
                    onClick={() => handleApprove(selectedCompany)}
                    disabled={processing}
                    className="px-5 py-2.5 rounded-[20px] transition-all duration-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = '#BBF7D0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = '#DCFCE7';
                      }
                    }}
                  >
                    {t('staff.companyManagement.actions.approve')}
                  </button>
                </>
              )}
              <button
                onClick={handleCloseModal}
                className="px-6 py-2.5 border rounded-[20px] text-gray-700 transition-all duration-200 font-semibold"
                style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#F5F5F5';
                  e.target.style.borderColor = '#D0D0D0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.borderColor = '#E0E0E0';
                }}
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

const StatCard = ({ icon: IconComponent, label, value, trend, color = 'blue' }) => {
  const colorMap = {
    blue: { bg: '#E6F3FF', iconColor: '#66B3FF', border: '#CCE6FF', textColor: '#66B3FF' },
    amber: { bg: '#FFF4E6', iconColor: '#FFB84D', border: '#FFE5CC', textColor: '#FFB84D' },
    green: { bg: '#DCFCE7', iconColor: '#15803D', border: '#BBF7D0', textColor: '#15803D' },
    red: { bg: '#FFE6F0', iconColor: '#FF80B3', border: '#FFB3B3', textColor: '#FF80B3' }
  };
  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-[28px] border p-6 shadow-sm" style={{ borderColor: '#F0F0F0', backgroundColor: colors.bg }}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-14 w-14 rounded-[20px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
            <IconComponent className="h-7 w-7" style={{ color: colors.iconColor }} strokeWidth={1.5} />
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-800">{value}</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{label}</p>
          <p className="text-sm" style={{ color: colors.textColor }}>{trend}</p>
        </div>
      </div>
    </div>
  );
};

const ApprovalStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const statusMap = {
    pending: { bgColor: '#FFF4E6', textColor: '#FFB84D', label: t('staff.companyManagement.status.pending'), icon: Clock },
    not_updated: { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: t('staff.companyManagement.status.notUpdated'), icon: Clock },
    approved: { bgColor: '#DCFCE7', textColor: '#15803D', label: t('staff.companyManagement.status.approved'), icon: CheckCircle2 },
    rejected: { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('staff.companyManagement.status.rejected'), icon: XCircleIcon }
  };

  const statusInfo = statusMap[status] || statusMap.pending;
  const Icon = statusInfo.icon;

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.textColor }}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      {statusInfo.label}
    </span>
  );
};

export default CompanyManagement;
