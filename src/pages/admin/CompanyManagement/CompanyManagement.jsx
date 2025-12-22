import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders, getAvatarUrl, getImageUrl } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import Pagination from '../Pagination';
import DeleteConfirmModal from '../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import { Tooltip } from '../../../components';
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
  FileText 
} from 'lucide-react';

const CompanyManagement = () => {
  const { t, i18n } = useTranslation();
  const { getToken } = useAuth();
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
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [companyToApprove, setCompanyToApprove] = useState(null);
  const [companyToReject, setCompanyToReject] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

  // Fetch companies từ API: lấy users có role COMPANY hoặc BUSINESS, map backend data sang frontend format (map status sang approvalStatus: WAITING_FOR_APPROVAL=pending, COMPANY_PENDING=not_updated, UNBANNED/ACTIVE=approved, BANNED=rejected), handle 401
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      
      if (!token) {
        setError(t('common.errors.loginRequired') || 'Vui lòng đăng nhập lại');
        setLoading(false);
        return;
      }

      const headers = createAuthHeaders(token);

      const response = await fetch(API_ENDPOINTS.USERS, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          await checkAndHandle401(response);
          setError(t('common.errors.sessionExpired') || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
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
    } catch {
      setError(t('admin.companyManagement.error') || 'Không thể tải danh sách công ty. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset body margin và ngăn scroll khi modal mở
  useEffect(() => {
    if (modalOpen) {
      const originalMargin = document.body.style.margin;
      const originalPadding = document.body.style.padding;
      const originalOverflow = document.body.style.overflow;
      
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.margin = originalMargin;
        document.body.style.padding = originalPadding;
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [modalOpen]);

  // Filter companies: loại bỏ companies có approvalStatus = 'not_updated', search trong name, email, id (case-insensitive), filter theo status nếu statusFilter !== 'ALL'
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
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

  // Paginate companies: slice filteredCompanies theo currentPage và itemsPerPage
  const paginatedCompanies = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCompanies.slice(startIndex, endIndex);
  }, [filteredCompanies, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  // Reset về page đầu tiên khi filters thay đổi (search, statusFilter)
  useEffect(() => {
    setCurrentPage(0);
  }, [search, statusFilter]);

  // Tính stats: loại bỏ not_updated companies, đếm total, pending, approved, rejected
  const stats = useMemo(() => {
    const filteredCompanies = companies.filter((c) => c.approvalStatus !== 'not_updated');
    const total = filteredCompanies.length;
    const pending = filteredCompanies.filter((c) => c.approvalStatus === 'pending').length;
    const approved = filteredCompanies.filter((c) => c.approvalStatus === 'approved').length;
    const rejected = filteredCompanies.filter((c) => c.approvalStatus === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [companies]);

  // Xử lý approve company: gọi API update-role để nâng role lên COMPANY (backend tự cập nhật status từ WAITING_FOR_APPROVAL sang UNBANNED), update state trên FE ngay để thấy kết quả, refresh lại API để đồng bộ
  const handleApprove = async (company) => {
    try {
      const token = getToken();
      if (!token) {
      setError(t('common.errors.loginRequired') || 'Vui lòng đăng nhập lại');
        return;
      }

      const headers = createAuthHeaders(token);

      const roleResponse = await fetch(
        `${BaseURL}/api/staff/update-role/${company.userId}?role=COMPANY`,
        {
          method: 'PUT',
          headers
        }
      );

      if (!roleResponse.ok) {
        if (roleResponse.status === 401) {
          await checkAndHandle401(roleResponse);
          return;
        }
        const errorData = await roleResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể cập nhật role');
      }

      setCompanies(prev =>
        prev.map(c =>
          c.userId === company.userId
            ? {
                ...c,
                status: 'UNBANNED',
                approvalStatus: 'approved'
              }
            : c
        )
      );

      setModalOpen(false);
      setApproveModalOpen(false);
      setCompanyToApprove(null);
      await fetchCompanies();
    } catch (err) {
      setError(err.message || t('admin.companyManagement.approveError'));
    }
  };

  // Xử lý reject company: set companyToReject và mở reject modal
  const handleReject = (company) => {
    setCompanyToReject(company);
    setRejectModalOpen(true);
  };

  // Confirm reject company: chỉ thông báo, không đổi status/ban user (backend không có endpoint reject)
  const confirmReject = async () => {
    if (!companyToReject) return;
    
    try {
      const token = getToken();
      if (!token) {
        alert(t('common.errors.loginRequired') || 'Vui lòng đăng nhập lại');
        setRejectModalOpen(false);
        setCompanyToReject(null);
        return;
      }

      alert(t('admin.companyManagement.rejectSuccess'));
      setModalOpen(false);
      setRejectModalOpen(false);
      setCompanyToReject(null);
    } catch (err) {
      alert(err.message || t('admin.companyManagement.rejectError'));
      setRejectModalOpen(false);
      setCompanyToReject(null);
    }
  };

  // Fetch file paths cho company: lấy business upload status để get file names, kiểm tra nếu không có files, construct file URLs từ file names (backend trả về relative path, local: /uploads/business/..., production: full Azure URL), sử dụng getImageUrl để normalize URLs
  const fetchCompanyFiles = async (company) => {
    try {
      setFileData({ businessLicenseUrl: null, idCardFrontUrl: null, idCardBackUrl: null, loading: true });
      const token = getToken();
      if (!token) {
        alert(t('common.errors.loginRequired') || 'Vui lòng đăng nhập lại');
        return;
      }

      const headers = createAuthHeaders(token);
      
      const apiUrl = `${BaseURL}/api/users/business-upload-status?email=${encodeURIComponent(company.email)}`;
      const statusResponse = await fetch(apiUrl, {
        headers
      });

      if (!statusResponse.ok) {
        throw new Error('Không thể tải thông tin file');
      }

      const statusData = await statusResponse.json();
      const uploadStatus = statusData.result || statusData;

      if (!uploadStatus.uploaded || (!uploadStatus.businessLicenseFileName && !uploadStatus.idCardFrontFileName && !uploadStatus.idCardBackFileName)) {
        setFileData({ businessLicenseUrl: null, idCardFrontUrl: null, idCardBackUrl: null, loading: false });
        return;
      }

      // Construct file URLs từ file names: xử lý các trường hợp full URL (http:///https://), URL embedded trong path, relative path, sử dụng getImageUrl để normalize
      const getFileUrl = (fileName, basePath) => {
        if (!fileName) return null;
        
        const trimmed = fileName.trim();
        if (!trimmed) return null;
        
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          return trimmed;
        }
        
        if (trimmed.includes('https://') || trimmed.includes('http://')) {
          const httpsIndex = trimmed.indexOf('https://');
          const httpIndex = trimmed.indexOf('http://');
          const urlStartIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;
          if (urlStartIndex >= 0) {
            const extractedUrl = trimmed.substring(urlStartIndex);
            return extractedUrl; // Extract full URL
          }
        }
        
        // Case 3: Starts with / (relative path from backend)
        // This happens in local development - convert to localhost:8080 URL
        if (trimmed.startsWith('/')) {
          const localUrl = getImageUrl(trimmed);
          return localUrl;
        }
        
        // Case 4: Just a filename (no path prefix)
        // Prepend the appropriate base path and convert to absolute URL
        const fullPath = `${basePath}/${trimmed}`;
        const localUrl = getImageUrl(fullPath);
        return localUrl;
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
    } catch {
      // Silently handle error fetching company files
      alert('Không thể tải thông tin file. Vui lòng thử lại.');
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
    } catch {
      alert(t('admin.companyManagement.modal.openPdfError') || 'Không thể mở PDF. Vui lòng thử lại.');
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
      // Với Azure URLs, path có thể được encode, cần decode và lấy tên file cuối cùng
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
        } catch {
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
          window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        }, 3000);
      } else {
        // Đối với local URLs, cần authentication headers
        const token = getToken();
        if (!token) {
          alert(t('common.errors.loginRequired') || 'Vui lòng đăng nhập lại');
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
    } catch {
      alert(t('admin.companyManagement.modal.downloadError') || 'Không thể tải file. Vui lòng thử lại.');
    }
  };

  // Chỉ hiển thị màn hình loading toàn trang khi lần load đầu tiên chưa có dữ liệu
  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#66B3FF' }}></div>
          <p className="mt-4 text-gray-600">{t('admin.companyManagement.loading')}</p>
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
            onClick={fetchCompanies}
            className="ml-4 px-3 py-1 text-xs font-semibold rounded-[20px] transition"
            style={{ backgroundColor: '#FFCCE0', color: '#FF80B3' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#FFB3CC'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#FFCCE0'}
          >
            {t('admin.companyManagement.retry')}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>{t('admin.companyManagement.title')}</p>
          <h1 className="text-3xl font-semibold text-gray-800">{t('admin.companyManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.companyManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Building2} label={t('admin.companyManagement.stats.totalCompanies')} value={stats.total} trend={t('admin.companyManagement.stats.totalCompaniesDesc')} />
        <StatCard icon={Clock} label={t('admin.companyManagement.stats.pending')} value={stats.pending} trend={t('admin.companyManagement.stats.pendingDesc')} color="text-amber-500" />
        <StatCard icon={CheckCircle2} label={t('admin.companyManagement.stats.approved')} value={stats.approved} trend={t('admin.companyManagement.stats.approvedDesc')} color="text-green-600" />
        <StatCard icon={XCircleIcon} label={t('admin.companyManagement.stats.rejected')} value={stats.rejected} trend={t('admin.companyManagement.stats.rejectedDesc')} color="text-red-600" />
      </div>

      <div className="bg-white rounded-[28px] shadow-sm border" style={{ borderColor: '#F0F0F0' }}>
        <div className="flex flex-col gap-3 p-5 border-b lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: '#F0F0F0' }}>
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.companyManagement.searchPlaceholder')}
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
              <option value="ALL">{t('admin.companyManagement.statusFilter.all')}</option>
              <option value="pending">{t('admin.companyManagement.statusFilter.pending')}</option>
              <option value="approved">{t('admin.companyManagement.statusFilter.approved')}</option>
              <option value="rejected">{t('admin.companyManagement.statusFilter.rejected')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: '#F0F0F0' }}>
            <thead style={{ backgroundColor: '#FAFAFA' }}>
              <tr>
                {[t('admin.companyManagement.tableHeaders.company'), t('admin.companyManagement.tableHeaders.status'), t('admin.companyManagement.tableHeaders.registrationDate'), t('admin.companyManagement.tableHeaders.actions')].map((header) => (
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
                    {loading ? t('admin.companyManagement.loading') : t('admin.companyManagement.noResults')}
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
                    {company.createdAt ? new Date(company.createdAt).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN') : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {(company.approvalStatus === 'pending' || company.approvalStatus === 'approved') && (
                        <Tooltip text={t('admin.companyManagement.actions.viewDetails')} position="top">
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
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </Tooltip>
                      )}
                      {company.approvalStatus === 'pending' && (
                        <>
                          <Tooltip text={t('admin.companyManagement.actions.approve')} position="top">
                            <button 
                              onClick={() => {
                                setCompanyToApprove(company);
                                setApproveModalOpen(true);
                              }}
                              className="p-2 rounded-[20px] transition"
                              style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#BBF7D0';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#DCFCE7';
                              }}
                            >
                              <Check className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </Tooltip>
                          <Tooltip text={t('admin.companyManagement.actions.reject')} position="top">
                            <button 
                              onClick={() => handleReject(company)}
                              className="p-2 rounded-[20px] transition"
                              style={{ backgroundColor: '#FFE6F0', color: '#FF80B3' }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#FFCCE0';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#FFE6F0';
                              }}
                            >
                              <X className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </Tooltip>
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
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm" style={{ margin: 0 }}>
          <div className="bg-white rounded-[32px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border" style={{ borderColor: '#F0F0F0', marginTop: 0 }}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-8 py-3 flex items-center justify-between z-10" style={{ borderColor: '#F0F0F0', marginTop: 0 }}>
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">{t('admin.companyManagement.modal.title')}</h2>
                <p className="text-gray-600 text-sm mt-1 font-medium">{selectedCompany?.name}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-[20px] hover:bg-[#FAFAFA] transition-all duration-200 text-gray-600 hover:text-gray-800"
                aria-label={t('admin.companyManagement.modal.close')}
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8" style={{ backgroundColor: '#FAFAFA' }}>
              {fileData.loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300"></div>
                  <p className="ml-4 text-gray-600 font-medium">{t('admin.companyManagement.modal.loadingFiles')}</p>
                </div>
              ) : (
                <>
                  {!fileData.businessLicenseUrl && !fileData.idCardFrontUrl && !fileData.idCardBackUrl ? (
                    <div className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-20 h-20 mb-5">
                        <FileText className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
                      </div>
                      <p className="text-gray-700 text-lg font-semibold mb-2">{t('admin.companyManagement.modal.noFiles')}</p>
                      <p className="text-gray-500 text-sm">
                        {t('admin.companyManagement.modal.noFilesDesc')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Business License PDF */}
                      <div className="bg-white rounded-[28px] border shadow-sm p-6" style={{ borderColor: '#F0F0F0' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3">
                              <FileText className="h-6 w-6 text-gray-500" strokeWidth={1.5} />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800">{t('admin.companyManagement.modal.businessLicense')}</h3>
                              <p className="text-sm text-gray-600 mt-0.5">{t('admin.companyManagement.modal.businessLicenseDesc')}</p>
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
                                      className="px-5 py-2.5 rounded-[20px] transition-all duration-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
                                      style={{ backgroundColor: '#66B3FF', color: '#FFFFFF' }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = '#4DA3FF'}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = '#66B3FF'}
                                    >
                                      <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                                      {t('admin.companyManagement.modal.openInNewTab')}
                                    </a>
                                  );
                                })()
                              ) : (
                                // Local URLs: Dùng button với onClick (có thể cần authentication)
                                <button
                                  onClick={() => handleOpenPdf(fileData.businessLicenseUrl)}
                                  className="px-5 py-2.5 rounded-[20px] transition-all duration-200 text-sm font-medium flex items-center gap-2"
                                  style={{ backgroundColor: '#66B3FF', color: '#FFFFFF' }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#4DA3FF'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#66B3FF'}
                                >
                                  <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                                  {t('admin.companyManagement.modal.openInNewTab')}
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadPdf(fileData.businessLicenseUrl)}
                                className="px-5 py-2.5 rounded-[20px] transition-all duration-200 text-sm font-medium flex items-center gap-2"
                                style={{ backgroundColor: '#F5F5F5', color: '#6B7280' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E5E5'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#F5F5F5'}
                                title={t('admin.companyManagement.modal.download') || 'Tải xuống'}
                              >
                                <Download className="h-4 w-4" strokeWidth={1.5} />
                                {t('admin.companyManagement.modal.download') || 'Tải xuống'}
                              </button>
                            </div>
                          )}
                        </div>
                        {!fileData.businessLicenseUrl && (
                          <p className="text-gray-500 text-sm italic pl-16">{t('admin.companyManagement.modal.noFile')}</p>
                        )}
                      </div>

                      {/* ID Cards - Grid layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-fit mx-auto">
                        {/* ID Card Front */}
                        <div className="bg-white rounded-[28px] border shadow-sm p-5" style={{ borderColor: '#E0CCFF' }}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3">
                              <Eye className="h-5 w-5 text-purple-500" strokeWidth={1.5} />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-800">{t('admin.companyManagement.modal.idCardFront')}</h3>
                              <p className="text-xs text-gray-600 mt-0.5">{t('admin.companyManagement.modal.idCardFrontDesc')}</p>
                            </div>
                          </div>
                          {fileData.idCardFrontUrl ? (
                            <div className="relative rounded-[24px] p-4 border-2 border-dashed w-full" style={{ aspectRatio: '15/10', height: '280px', backgroundColor: '#F0E6FF', borderColor: '#E0CCFF' }}>
                              <div className="absolute inset-4 flex items-center justify-center overflow-hidden rounded-[20px]">
                                <img
                                  src={fileData.idCardFrontUrl}
                                  alt={t('admin.companyManagement.modal.idCardFront')}
                                  className="w-full h-full rounded-[20px] shadow-lg object-contain"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const errorMsg = e.target.nextElementSibling;
                                    if (errorMsg) errorMsg.style.display = 'block';
                                  }}
                                />
                                <p className="text-red-400 text-sm hidden text-center absolute">{t('admin.companyManagement.modal.imageLoadError')}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center rounded-[24px] border-2 border-dashed w-full" style={{ aspectRatio: '15/10', height: '280px', backgroundColor: '#F0E6FF', borderColor: '#E0CCFF' }}>
                              <p className="text-gray-500 text-sm">{t('admin.companyManagement.modal.noImage')}</p>
                            </div>
                          )}
                        </div>

                        {/* ID Card Back */}
                        <div className="bg-white rounded-[28px] border shadow-sm p-5" style={{ borderColor: '#FFE5CC' }}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-3">
                              <Eye className="h-5 w-5 text-orange-500" strokeWidth={1.5} />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-800">{t('admin.companyManagement.modal.idCardBack')}</h3>
                              <p className="text-xs text-gray-600 mt-0.5">{t('admin.companyManagement.modal.idCardBackDesc')}</p>
                            </div>
                          </div>
                          {fileData.idCardBackUrl ? (
                            <div className="relative rounded-[24px] p-4 border-2 border-dashed w-full" style={{ aspectRatio: '15/10', height: '280px', backgroundColor: '#FFF4E6', borderColor: '#FFE5CC' }}>
                              <div className="absolute inset-4 flex items-center justify-center overflow-hidden rounded-[20px]">
                                <img
                                  src={fileData.idCardBackUrl}
                                  alt={t('admin.companyManagement.modal.idCardBack')}
                                  className="w-full h-full rounded-[20px] shadow-lg object-contain"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const errorMsg = e.target.nextElementSibling;
                                    if (errorMsg) errorMsg.style.display = 'block';
                                  }}
                                />
                                <p className="text-red-400 text-sm hidden text-center absolute">{t('admin.companyManagement.modal.imageLoadError')}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center rounded-[24px] border-2 border-dashed w-full" style={{ aspectRatio: '15/10', height: '280px', backgroundColor: '#FFF4E6', borderColor: '#FFE5CC' }}>
                              <p className="text-gray-500 text-sm">{t('admin.companyManagement.modal.noImage')}</p>
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
            <div className="sticky bottom-0 bg-white border-t px-8 py-4 flex justify-end gap-3" style={{ borderColor: '#F0F0F0' }}>
              {selectedCompany?.approvalStatus === 'pending' && (
                <>
                  <button
                    onClick={() => handleReject(selectedCompany)}
                    className="px-5 py-2.5 rounded-[20px] transition-all duration-200 text-sm font-medium"
                    style={{ backgroundColor: '#FFE6F0', color: '#FF80B3', borderColor: '#FFCCE0' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#FFCCE0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#FFE6F0'}
                  >
                    {t('admin.companyManagement.actions.reject')}
                  </button>
                  <button
                    onClick={() => {
                      setCompanyToApprove(selectedCompany);
                      setApproveModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-[20px] transition-all duration-200 text-sm font-medium"
                    style={{ backgroundColor: '#DCFCE7', color: '#15803D', borderColor: '#BBF7D0' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#BBF7D0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#DCFCE7'}
                  >
                    {t('admin.companyManagement.actions.approve')}
                  </button>
                </>
              )}
              <button
                onClick={handleCloseModal}
                className="px-6 py-2.5 border rounded-[20px] text-gray-700 transition-all duration-200 font-medium"
                style={{ backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E5E5'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#F5F5F5'}
              >
                {t('admin.companyManagement.modal.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận duyệt công ty */}
      <DeleteConfirmModal
        isOpen={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false);
          setCompanyToApprove(null);
        }}
        onConfirm={() => {
          if (companyToApprove) {
            return handleApprove(companyToApprove);
          }
        }}
        title={t('admin.companyManagement.title')}
        message={t('admin.companyManagement.confirmApprove', { name: companyToApprove?.name || '' })}
        confirmText={t('admin.companyManagement.actions.approve')}
        cancelText={t('common.cancel')}
        danger={false}
        icon={<CheckCircle size={36} strokeWidth={1.5} />}
      />

      {/* Modal xác nhận từ chối công ty */}
      <DeleteConfirmModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setCompanyToReject(null);
        }}
        onConfirm={confirmReject}
        title={t('admin.companyManagement.title')}
        message={t('admin.companyManagement.confirmReject', { name: companyToReject?.name || '' })}
        confirmText={t('admin.companyManagement.actions.reject')}
        cancelText={t('common.cancel')}
        danger={true}
        icon={<XCircle size={36} strokeWidth={1.5} />}
      />
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, trend, color = 'text-blue-600' }) => {
  const colorMap = {
    'text-blue-600': { bg: '#E6F3FF', iconColor: '#66B3FF', textColor: '#66B3FF' },
    'text-amber-500': { bg: '#FFF4E6', iconColor: '#FFB84D', textColor: '#FFB84D' },
    'text-green-600': { bg: '#DCFCE7', iconColor: '#15803D', textColor: '#15803D' },
    'text-red-600': { bg: '#FFE6F0', iconColor: '#FF80B3', textColor: '#FF80B3' }
  };
  const colors = colorMap[color] || colorMap['text-blue-600'];
  
  return (
    <div className="bg-white rounded-[28px] border p-6 shadow-sm" style={{ borderColor: '#F0F0F0', backgroundColor: colors.bg }}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-14 w-14 rounded-[20px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
            {Icon && <Icon className="h-7 w-7" style={{ color: colors.iconColor }} strokeWidth={1.5} />}
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-800">{value}</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{label}</p>
          <p className="text-xs font-medium" style={{ color: colors.textColor }}>{trend}</p>
        </div>
      </div>
    </div>
  );
};

const ApprovalStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const statusMap = {
    pending: { color: 'bg-amber-100 text-amber-700', label: t('admin.companyManagement.status.pending'), icon: Clock },
    not_updated: { color: 'bg-gray-100 text-gray-700', label: t('admin.companyManagement.status.notUpdated'), icon: Clock },
    approved: { color: 'bg-green-100 text-green-700', label: t('admin.companyManagement.status.approved'), icon: CheckCircle2 },
    rejected: { color: 'bg-red-100 text-red-700', label: t('admin.companyManagement.status.rejected'), icon: XCircleIcon }
  };

  const statusInfo = statusMap[status] || statusMap.pending;
  const Icon = statusInfo.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-[20px] ${statusInfo.color}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      {statusInfo.label}
    </span>
  );
};

export default CompanyManagement;

