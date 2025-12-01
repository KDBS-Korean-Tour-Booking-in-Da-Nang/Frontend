import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, createAuthHeaders } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import ReportDetailModal from './ReportDetailModal';
import {
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const ForumReportManagement = () => {
  const { getToken, user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, dismissed: 0, investigating: 0, closed: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch reports from API
  const fetchReports = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      const token = getToken();
      const url = `${API_ENDPOINTS.REPORTS_ADMIN_ALL}?page=${page}&size=${pageSize}`;
      
      const response = await fetch(url, {
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        // Map ReportSummaryResponse to component format
        const mappedReports = (data.content || []).map(report => ({
          reportId: report.reportId,
          targetType: report.targetType,
          targetId: report.targetId,
          reporterName: report.reporterUsername || 'N/A',
          reporterEmail: '', // Not in summary response
          reason: report.reasons || 'Không có lý do',
          status: report.status,
          createdAt: report.reportedAt,
          reportCount: report.reportCount || 0
        }));
        
        setReports(mappedReports);
        setTotalPages(data.totalPages || 0);
      } else {
        console.error('Failed to fetch reports:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, getToken]);

  useEffect(() => {
    fetchReports(currentPage);
  }, [currentPage, fetchReports, refreshTrigger]);

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getToken();
        const response = await fetch(API_ENDPOINTS.REPORTS_ADMIN_STATS, {
          headers: createAuthHeaders(token)
        });

        if (!response.ok && response.status === 401) {
          await checkAndHandle401(response);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setStats({
            total: data.total || 0,
            pending: data.pending || 0,
            resolved: data.resolved || 0,
            dismissed: data.dismissed || 0,
            investigating: data.investigating || 0,
            closed: data.closed || 0
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [getToken, reports]); // Re-fetch stats when reports change

  // Filter reports based on search and filters
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        report.reportId?.toString().includes(searchLower) ||
        report.reporterName?.toLowerCase().includes(searchLower) ||
        report.postTitle?.toLowerCase().includes(searchLower) ||
        report.reason?.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
      // Filter by reason type (first reason in the string)
      const matchesType = typeFilter === 'ALL' || 
        (report.reason && report.reason.toUpperCase().includes(typeFilter));
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, search, statusFilter, typeFilter]);

  const handleApprove = async (reportId) => {
    if (!user?.email) {
      alert('Vui lòng đăng nhập để thực hiện thao tác này');
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn duyệt báo cáo này?')) {
      return;
    }

    try {
      const token = getToken();
      const email = user.email;
      
      const response = await fetch(`${API_ENDPOINTS.REPORTS_UPDATE_STATUS(reportId)}?adminEmail=${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: createAuthHeaders(token),
        body: JSON.stringify({
          status: 'RESOLVED',
          adminNote: 'Báo cáo đã được duyệt và xử lý'
        })
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Refresh reports and stats
        setRefreshTrigger(prev => prev + 1);
        alert('Duyệt báo cáo thành công!');
      } else {
        const errorText = await response.text();
        alert(`Lỗi khi duyệt báo cáo: ${errorText}`);
      }
    } catch (error) {
      console.error('Error approving report:', error);
      alert('Đã xảy ra lỗi khi duyệt báo cáo');
    }
  };

  const handleReject = async (reportId) => {
    if (!user?.email) {
      alert('Vui lòng đăng nhập để thực hiện thao tác này');
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn từ chối báo cáo này?')) {
      return;
    }

    try {
      const token = getToken();
      const email = user.email;
      
      const response = await fetch(`${API_ENDPOINTS.REPORTS_UPDATE_STATUS(reportId)}?adminEmail=${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: createAuthHeaders(token),
        body: JSON.stringify({
          status: 'DISMISSED',
          adminNote: 'Báo cáo đã bị từ chối'
        })
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Refresh reports and stats
        setRefreshTrigger(prev => prev + 1);
        alert('Từ chối báo cáo thành công!');
      } else {
        const errorText = await response.text();
        alert(`Lỗi khi từ chối báo cáo: ${errorText}`);
      }
    } catch (error) {
      console.error('Error rejecting report:', error);
      alert('Đã xảy ra lỗi khi từ chối báo cáo');
    }
  };

  const handleViewDetails = async (reportId) => {
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.REPORTS_GET_BY_ID(reportId), {
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const fullReport = await response.json();
        // Map ReportResponse to component format
        const mappedReport = {
          reportId: fullReport.reportId,
          targetType: fullReport.targetType,
          targetId: fullReport.targetId,
          reporterName: fullReport.reporterUsername || 'N/A',
          reporterEmail: fullReport.reporterEmail || '',
          reason: Array.isArray(fullReport.reasons) 
            ? fullReport.reasons.join(', ') 
            : (fullReport.reasons || 'Không có lý do'),
          status: fullReport.status,
          createdAt: fullReport.reportedAt,
          resolvedAt: fullReport.resolvedAt,
          adminNote: fullReport.adminNote,
          resolvedByUsername: fullReport.resolvedByUsername,
          description: fullReport.description,
          targetTitle: fullReport.targetTitle,
          targetAuthor: fullReport.targetAuthor
        };
        setSelectedReport(mappedReport);
        setIsDetailModalOpen(true);
      } else {
        const errorText = await response.text();
        alert(`Lỗi khi tải chi tiết báo cáo: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
      alert('Đã xảy ra lỗi khi tải chi tiết báo cáo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">Forum Report Management</p>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý báo cáo từ forum</h1>
          <p className="text-sm text-gray-500 mt-1">
            Xem xét và duyệt các báo cáo từ người dùng về nội dung vi phạm trên forum.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-300">
            <FunnelIcon className="h-5 w-5" />
            Bộ lọc nâng cao
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200">
            <ArrowDownTrayIcon className="h-5 w-5" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={ExclamationTriangleIcon} label="Tổng báo cáo" value={stats.total} trend="" />
        <StatCard icon={ClockIcon} label="Chờ duyệt" value={stats.pending} trend="Cần xử lý" color="text-amber-500" />
        <StatCard icon={CheckCircleIcon} label="Đã xử lý" value={stats.resolved} trend="" color="text-green-600" />
        <StatCard icon={XCircleIcon} label="Đã từ chối" value={stats.dismissed} trend="" color="text-red-600" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã báo cáo, người báo cáo, tiêu đề bài viết..."
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
              <option value="PENDING">Chờ duyệt</option>
              <option value="INVESTIGATING">Đang điều tra</option>
              <option value="RESOLVED">Đã xử lý</option>
              <option value="DISMISSED">Bỏ qua</option>
              <option value="CLOSED">Đóng</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="SPAM">Spam</option>
              <option value="INAPPROPRIATE">Nội dung không phù hợp</option>
              <option value="HARASSMENT">Quấy rối</option>
              <option value="COPYRIGHT">Vi phạm bản quyền</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {['STT', 'Báo cáo', 'Người báo cáo', 'Loại vi phạm', 'Trạng thái', 'Ngày báo cáo', 'Thao tác'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Đang tải...' : 'Không tìm thấy báo cáo phù hợp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, index) => (
                  <tr key={report.reportId} className="hover:bg-[#e9f2ff]/40 transition">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {currentPage * pageSize + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center text-sm px-3 py-1.5 rounded font-semibold ${
                        report.targetType === 'POST' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {report.targetType === 'POST' ? 'Bài viết' : 'Bình luận'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{report.reporterName || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <TypeBadge reasons={report.reason} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {report.createdAt ? new Date(report.createdAt).toLocaleString('vi-VN') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewDetails(report.reportId)}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition" 
                          title="Xem chi tiết"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {(report.status === 'PENDING' || report.status === 'INVESTIGATING') && (
                          <>
                            <button 
                              onClick={() => handleApprove(report.reportId)}
                              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 transition" 
                              title="Duyệt báo cáo"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleReject(report.reportId)}
                              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition" 
                              title="Từ chối báo cáo"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Trang {currentPage + 1} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Trước
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sau
              </button>
      </div>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <ReportDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        onApprove={handleApprove}
        onReject={handleReject}
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

const StatusBadge = ({ status }) => {
  const statusMap = {
    'PENDING': { color: 'bg-amber-100 text-amber-700', label: 'Chờ duyệt' },
    'INVESTIGATING': { color: 'bg-blue-100 text-blue-700', label: 'Đang điều tra' },
    'RESOLVED': { color: 'bg-green-100 text-green-700', label: 'Đã xử lý' },
    'DISMISSED': { color: 'bg-red-100 text-red-700', label: 'Bỏ qua' },
    'CLOSED': { color: 'bg-gray-100 text-gray-700', label: 'Đóng' }
  };
  
  const map = statusMap[status] || { color: 'bg-gray-100 text-gray-500', label: status || 'N/A' };
  
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      {map.label}
    </span>
  );
};

const TypeBadge = ({ reasons }) => {
  if (!reasons) {
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
        N/A
      </span>
    );
  }

  // Reasons is a string (joined from Set), try to find the first matching type
  const reasonsUpper = reasons.toUpperCase();
  const typeMap = {
    'SPAM': { color: 'bg-purple-100 text-purple-700', label: 'Spam' },
    'INAPPROPRIATE': { color: 'bg-orange-100 text-orange-700', label: 'Không phù hợp' },
    'HARASSMENT': { color: 'bg-red-100 text-red-700', label: 'Quấy rối' },
    'COPYRIGHT': { color: 'bg-blue-100 text-blue-700', label: 'Bản quyền' },
    'VIOLENCE': { color: 'bg-red-100 text-red-700', label: 'Bạo lực' },
    'HATE_SPEECH': { color: 'bg-red-100 text-red-700', label: 'Ngôn từ thù địch' },
    'FALSE_INFO': { color: 'bg-yellow-100 text-yellow-700', label: 'Thông tin sai' },
    'OTHER': { color: 'bg-gray-100 text-gray-700', label: 'Khác' }
  };
  
  // Find first matching type
  let matchedType = 'OTHER';
  for (const [type] of Object.entries(typeMap)) {
    if (reasonsUpper.includes(type)) {
      matchedType = type;
      break;
    }
  }
  
  const map = typeMap[matchedType] || { color: 'bg-gray-100 text-gray-500', label: 'Khác' };
  
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      {map.label}
    </span>
  );
};

export default ForumReportManagement;
