import { useMemo, useState } from 'react';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  // Mock data - sẽ được thay thế bằng API call sau
  const [reports] = useState([]);
  const [loading] = useState(false);

  // Mock data structure - sẽ được thay thế bằng API call
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        report.reportId?.toLowerCase().includes(search.toLowerCase()) ||
        report.reporterName?.toLowerCase().includes(search.toLowerCase()) ||
        report.postTitle?.toLowerCase().includes(search.toLowerCase()) ||
        report.reason?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || report.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === 'PENDING').length;
    const approved = reports.filter((r) => r.status === 'APPROVED').length;
    const rejected = reports.filter((r) => r.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [reports]);

  const handleApprove = async (reportId) => {
    // TODO: Implement API call to approve report
    console.log('Approve report:', reportId);
  };

  const handleReject = async (reportId) => {
    // TODO: Implement API call to reject report
    console.log('Reject report:', reportId);
  };

  const handleViewDetails = (reportId) => {
    // TODO: Implement view details modal/page
    console.log('View details:', reportId);
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
        <StatCard icon={ExclamationTriangleIcon} label="Tổng báo cáo" value={stats.total} trend="+5 tuần này" />
        <StatCard icon={ClockIcon} label="Chờ duyệt" value={stats.pending} trend="Cần xử lý" color="text-amber-500" />
        <StatCard icon={CheckCircleIcon} label="Đã duyệt" value={stats.approved} trend="+2 hôm nay" color="text-green-600" />
        <StatCard icon={XCircleIcon} label="Đã từ chối" value={stats.rejected} trend="+1 hôm nay" color="text-red-600" />
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
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
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
                {['Báo cáo', 'Người báo cáo', 'Loại vi phạm', 'Trạng thái', 'Ngày báo cáo', 'Thao tác'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Đang tải...' : 'Không tìm thấy báo cáo phù hợp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.reportId} className="hover:bg-[#e9f2ff]/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-gray-900">{report.postTitle || 'N/A'}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{report.reason || 'Không có lý do'}</p>
                        <span className="text-xs text-gray-400 mt-1">ID: {report.reportId || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-gray-900">{report.reporterName || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{report.reporterEmail || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <TypeBadge type={report.type} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {report.createdAt ? new Date(report.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
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
                        {report.status === 'PENDING' && (
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
      </div>
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
    'APPROVED': { color: 'bg-green-100 text-green-700', label: 'Đã duyệt' },
    'REJECTED': { color: 'bg-red-100 text-red-700', label: 'Đã từ chối' }
  };
  
  const map = statusMap[status] || { color: 'bg-gray-100 text-gray-500', label: status || 'N/A' };
  
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      {map.label}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const typeMap = {
    'SPAM': { color: 'bg-purple-100 text-purple-700', label: 'Spam' },
    'INAPPROPRIATE': { color: 'bg-orange-100 text-orange-700', label: 'Không phù hợp' },
    'HARASSMENT': { color: 'bg-red-100 text-red-700', label: 'Quấy rối' },
    'COPYRIGHT': { color: 'bg-blue-100 text-blue-700', label: 'Bản quyền' },
    'OTHER': { color: 'bg-gray-100 text-gray-700', label: 'Khác' }
  };
  
  const map = typeMap[type] || { color: 'bg-gray-100 text-gray-500', label: type || 'N/A' };
  
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      {map.label}
    </span>
  );
};

export default ForumReportManagement;
