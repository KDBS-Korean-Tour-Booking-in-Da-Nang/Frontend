import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, createAuthHeaders } from '../../../../../config/api';
import { checkAndHandle401 } from '../../../../../utils/apiErrorHandler';
import ReportDetailModal from './ReportDetailModal';
import DeleteConfirmModal from '../../../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import { 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock 
} from 'lucide-react';

const ForumReportManagement = () => {
  const { t, i18n } = useTranslation();
  const { getToken, user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, dismissed: 0, investigating: 0, closed: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(10);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [reportToApprove, setReportToApprove] = useState(null);
  const isInitialMountRef = useRef(true);

  // Kiểm tra user có permission để manage forum reports không: check staffTask === 'FORUM_REPORT_AND_BOOKING_COMPLAINT' hoặc role === 'ADMIN'
  const canManageForumReports = user?.staffTask === 'FORUM_REPORT_AND_BOOKING_COMPLAINT' || user?.role === 'ADMIN';

  // Fetch reports từ API: gọi REPORTS_ADMIN_ALL endpoint với pagination, map ReportSummaryResponse sang component format, không gọi checkAndHandle401 trong initial background loading (skip401Check = true) để tránh premature logout, set reports và totalPages state
  const fetchReports = useCallback(async (page = currentPage, skip401Check = false) => {
    if (!canManageForumReports) return;
    
    try {
      setLoading(true);
      const token = getToken();
      const url = `${API_ENDPOINTS.REPORTS_ADMIN_ALL}?page=${page}&size=${pageSize}`;
      
      const response = await fetch(url, {
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        if (!skip401Check) {
          await checkAndHandle401(response);
        }
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const mappedReports = (data.content || []).map(report => ({
          reportId: report.reportId,
          targetType: report.targetType,
          targetId: report.targetId,
          reporterName: report.reporterUsername || t('staff.forumReportManagement.status.na'),
          reporterEmail: '', // Not in summary response
          reason: report.reasons || t('staff.forumReportManagement.noReason'),
          status: report.status,
          createdAt: report.reportedAt,
          reportCount: report.reportCount || 0
        }));
        
        setReports(mappedReports);
        setTotalPages(data.totalPages || 0);
      } else {
        // Silently handle failed to fetch reports
      }
    } catch (error) {
      // Silently handle error fetching reports
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, getToken, canManageForumReports]);

  // Fetch reports khi currentPage thay đổi: skip 401 check chỉ trên initial mount để tránh premature logout, sau initial mount luôn check 401 (bao gồm pagination)
  useEffect(() => {
    const skip401Check = isInitialMountRef.current;
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
    }
    fetchReports(currentPage, skip401Check);
  }, [currentPage, fetchReports]);

  // Fetch stats from API
  useEffect(() => {
    if (!canManageForumReports) return;
    
    const fetchStats = async () => {
      try {
        const token = getToken();
        const response = await fetch(API_ENDPOINTS.REPORTS_ADMIN_STATS, {
          headers: createAuthHeaders(token)
        });

        if (!response.ok && response.status === 401) {
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
        // Silently handle error fetching stats
      }
    };

    fetchStats();
  }, [getToken, reports, canManageForumReports]);

  // Filter reports dựa trên search và filters: filter theo search (reportId, reporterName, postTitle, reason), filter theo status (ALL hoặc status cụ thể), filter theo reason type (first reason trong string), return filtered reports array
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        report.reportId?.toString().includes(searchLower) ||
        report.reporterName?.toLowerCase().includes(searchLower) ||
        report.postTitle?.toLowerCase().includes(searchLower) ||
        report.reason?.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || 
        (report.reason && report.reason.toUpperCase().includes(typeFilter));
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, search, statusFilter, typeFilter]);

  const approveReport = async (reportId) => {
    if (!user?.email) {
      alert(t('staff.forumReportManagement.error.loginRequired'));
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
          adminNote: t('staff.forumReportManagement.adminNote.approve')
        })
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        fetchReports(currentPage);
        alert(t('staff.forumReportManagement.success.approve'));
      } else {
        const errorText = await response.text();
        alert(t('staff.forumReportManagement.error.approve', { error: errorText }));
      }
    } catch (error) {
      alert(t('staff.forumReportManagement.error.approveGeneric'));
    }
  };

  const handleApprove = (reportId) => {
    const report = reports.find(r => r.reportId === reportId) || { reportId };
    setReportToApprove(report);
    setIsApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!reportToApprove) return;
    await approveReport(reportToApprove.reportId);
    setIsApproveModalOpen(false);
    setReportToApprove(null);
  };

  const handleReject = async (reportId) => {
    if (!user?.email) {
      alert(t('staff.forumReportManagement.error.loginRequired'));
      return;
    }

    if (!window.confirm(t('staff.forumReportManagement.confirm.reject'))) {
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
          adminNote: t('staff.forumReportManagement.adminNote.reject')
        })
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        fetchReports(currentPage);
        alert(t('staff.forumReportManagement.success.reject'));
      } else {
        const errorText = await response.text();
        alert(t('staff.forumReportManagement.error.reject', { error: errorText }));
      }
    } catch (error) {
      // Silently handle error rejecting report
      alert(t('staff.forumReportManagement.error.rejectGeneric'));
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
        const mappedReport = {
          reportId: fullReport.reportId,
          targetType: fullReport.targetType,
          targetId: fullReport.targetId,
          reporterName: fullReport.reporterUsername || 'N/A',
          reporterEmail: fullReport.reporterEmail || '',
          reason: Array.isArray(fullReport.reasons) 
            ? fullReport.reasons.join(', ') 
            : (fullReport.reasons || t('staff.forumReportManagement.noReason')),
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
        alert(t('staff.forumReportManagement.error.loadDetail', { error: errorText }));
      }
    } catch (error) {
      alert(t('staff.forumReportManagement.error.loadDetailGeneric'));
    }
  };

  // Check if user has permission
  if (user && !canManageForumReports) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="max-w-md w-full rounded-[32px] bg-white border p-10 text-center shadow-sm" style={{ borderColor: '#F0F0F0' }}>
          <div className="w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#FFE6F0' }}>
            <AlertTriangle className="h-7 w-7" style={{ color: '#FF80B3' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">{t('staff.forumReportManagement.permissionDenied.title')}</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            {t('staff.forumReportManagement.permissionDenied.message')}
          </p>
          <button
            onClick={() => navigate('/staff/tasks')}
            className="w-full px-6 py-3 rounded-[24px] text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: '#66B3FF' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4DA3FF'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#66B3FF'}
          >
            {t('staff.forumReportManagement.permissionDenied.backButton')}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#66B3FF' }}></div>
          <p className="mt-4 text-gray-600">{t('staff.forumReportManagement.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>{t('staff.forumReportManagement.title')}</p>
          <h1 className="text-3xl font-semibold text-gray-800">{t('staff.forumReportManagement.subtitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('staff.forumReportManagement.description')}
          </p>
        </div>
        <div className="flex gap-3">
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label={t('staff.forumReportManagement.stats.total')} value={stats.total} trend="" color="blue" />
        <StatCard icon={Clock} label={t('staff.forumReportManagement.stats.pending')} value={stats.pending} trend={t('staff.forumReportManagement.stats.pendingDesc')} color="amber" />
        <StatCard icon={CheckCircle2} label={t('staff.forumReportManagement.stats.resolved')} value={stats.resolved} trend="" color="green" />
        <StatCard icon={XCircle} label={t('staff.forumReportManagement.stats.dismissed')} value={stats.dismissed} trend="" color="red" />
      </div>

      <div className="bg-white rounded-[28px] shadow-sm border" style={{ borderColor: '#F0F0F0' }}>
        <div className="flex flex-col gap-3 p-5 border-b lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: '#F0F0F0' }}>
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('staff.forumReportManagement.filters.searchPlaceholder')}
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
              <option value="ALL">{t('staff.forumReportManagement.filters.statusFilter.all')}</option>
              <option value="PENDING">{t('staff.forumReportManagement.filters.statusFilter.pending')}</option>
              <option value="INVESTIGATING">{t('staff.forumReportManagement.filters.statusFilter.investigating')}</option>
              <option value="RESOLVED">{t('staff.forumReportManagement.filters.statusFilter.resolved')}</option>
              <option value="DISMISSED">{t('staff.forumReportManagement.filters.statusFilter.dismissed')}</option>
              <option value="CLOSED">{t('staff.forumReportManagement.filters.statusFilter.closed')}</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-[20px] px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
              style={{ borderColor: '#E0E0E0' }}
            >
              <option value="ALL">{t('staff.forumReportManagement.filters.typeFilter.all')}</option>
              <option value="SPAM">{t('staff.forumReportManagement.filters.typeFilter.spam')}</option>
              <option value="INAPPROPRIATE">{t('staff.forumReportManagement.filters.typeFilter.inappropriate')}</option>
              <option value="HARASSMENT">{t('staff.forumReportManagement.filters.typeFilter.harassment')}</option>
              <option value="COPYRIGHT">{t('staff.forumReportManagement.filters.typeFilter.copyright')}</option>
              <option value="OTHER">{t('staff.forumReportManagement.filters.typeFilter.other')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: '#F0F0F0' }}>
            <thead style={{ backgroundColor: '#FAFAFA' }}>
              <tr>
                {[
                  t('staff.forumReportManagement.table.headers.stt'),
                  t('staff.forumReportManagement.table.headers.report'),
                  t('staff.forumReportManagement.table.headers.reporter'),
                  t('staff.forumReportManagement.table.headers.violationType'),
                  t('staff.forumReportManagement.table.headers.status'),
                  t('staff.forumReportManagement.table.headers.reportDate'),
                  t('staff.forumReportManagement.table.headers.actions')
                ].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y" style={{ borderColor: '#F0F0F0' }}>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {loading ? t('staff.forumReportManagement.table.loading') : t('staff.forumReportManagement.table.noResults')}
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, index) => (
                  <tr key={report.reportId} className="transition" style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6F3FF'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {currentPage * pageSize + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`/forum?${report.targetType === 'POST' ? 'postId' : 'commentId'}=${report.targetId}&fromStaff=true`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/forum?${report.targetType === 'POST' ? 'postId' : 'commentId'}=${report.targetId}&fromStaff=true`);
                        }}
                        className="inline-flex items-center text-sm px-3 py-1.5 rounded-[20px] font-semibold cursor-pointer transition-all no-underline"
                        style={report.targetType === 'POST' 
                          ? { backgroundColor: '#E6F3FF', color: '#66B3FF' }
                          : { backgroundColor: '#F0E6FF', color: '#B380FF' }
                        }
                        onMouseEnter={(e) => {
                          if (report.targetType === 'POST') {
                            e.target.style.backgroundColor = '#CCE6FF';
                          } else {
                            e.target.style.backgroundColor = '#E9D5FF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (report.targetType === 'POST') {
                            e.target.style.backgroundColor = '#E6F3FF';
                          } else {
                            e.target.style.backgroundColor = '#F0E6FF';
                          }
                        }}
                        title={report.targetType === 'POST' ? t('staff.forumReportManagement.viewPost') : t('staff.forumReportManagement.viewComment')}
                      >
                        {report.targetType === 'POST' ? t('staff.forumReportManagement.reportTypes.post') : t('staff.forumReportManagement.reportTypes.comment')}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800">{report.reporterName || t('staff.forumReportManagement.status.na')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <TypeBadge reasons={report.reason} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {report.createdAt ? new Date(report.createdAt).toLocaleString(i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN') : t('staff.forumReportManagement.status.na')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewDetails(report.reportId)}
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
                          title={t('staff.forumReportManagement.actions.viewDetails')}
                        >
                          <Eye className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                        {(report.status === 'PENDING' || report.status === 'INVESTIGATING') && (
                          <>
                            <button 
                              onClick={() => handleApprove(report.reportId)}
                              className="p-2 rounded-[20px] border transition" 
                              style={{ borderColor: '#E0E0E0', color: '#9CA3AF', backgroundColor: 'transparent' }}
                              onMouseEnter={(e) => {
                                e.target.style.color = '#15803D';
                                e.target.style.borderColor = '#BBF7D0';
                                e.target.style.backgroundColor = '#DCFCE7';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.color = '#9CA3AF';
                                e.target.style.borderColor = '#E0E0E0';
                                e.target.style.backgroundColor = 'transparent';
                              }}
                              title={t('staff.forumReportManagement.actions.approve')}
                            >
                              <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            <button 
                              onClick={() => handleReject(report.reportId)}
                              className="p-2 rounded-[20px] border transition" 
                              style={{ borderColor: '#E0E0E0', color: '#9CA3AF', backgroundColor: 'transparent' }}
                              onMouseEnter={(e) => {
                                e.target.style.color = '#FF80B3';
                                e.target.style.borderColor = '#FFB3B3';
                                e.target.style.backgroundColor = '#FFE6F0';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.color = '#9CA3AF';
                                e.target.style.borderColor = '#E0E0E0';
                                e.target.style.backgroundColor = 'transparent';
                              }}
                              title={t('staff.forumReportManagement.actions.reject')}
                            >
                              <XCircle className="h-4 w-4" strokeWidth={1.5} />
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
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#F0F0F0' }}>
            <div className="text-sm text-gray-600">
              {t('staff.forumReportManagement.pagination.page', { current: currentPage + 1, total: totalPages })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 text-sm border rounded-[20px] disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#F5F5F5';
                    e.target.style.borderColor = '#D0D0D0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#FFFFFF';
                    e.target.style.borderColor = '#E0E0E0';
                  }
                }}
              >
                {t('staff.forumReportManagement.pagination.previous')}
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 text-sm border rounded-[20px] disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#F5F5F5';
                    e.target.style.borderColor = '#D0D0D0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#FFFFFF';
                    e.target.style.borderColor = '#E0E0E0';
                  }
                }}
              >
                {t('staff.forumReportManagement.pagination.next')}
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
      
      {/* Approve Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setReportToApprove(null);
        }}
        onConfirm={handleConfirmApprove}
        title={t('staff.forumReportManagement.confirmModal.approve.title')}
        message={t('staff.forumReportManagement.confirmModal.approve.message', { id: reportToApprove?.reportId })}
        itemName={reportToApprove?.reportId?.toString()}
        confirmText={t('staff.forumReportManagement.confirmModal.approve.confirm')}
        cancelText={t('staff.forumReportManagement.confirmModal.approve.cancel')}
        danger={false}
        icon={<CheckCircle size={36} strokeWidth={1.5} />}
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
          {trend && <p className="text-sm" style={{ color: colors.textColor }}>{trend}</p>}
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const statusMap = {
    'PENDING': { bgColor: '#FFF4E6', textColor: '#FFB84D', label: t('staff.forumReportManagement.status.pending') },
    'INVESTIGATING': { bgColor: '#E6F3FF', textColor: '#66B3FF', label: t('staff.forumReportManagement.status.investigating') },
    'RESOLVED': { bgColor: '#DCFCE7', textColor: '#15803D', label: t('staff.forumReportManagement.status.resolved') },
    'DISMISSED': { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('staff.forumReportManagement.status.dismissed') },
    'CLOSED': { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: t('staff.forumReportManagement.status.closed') }
  };
  
  const map = statusMap[status] || { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: status || t('staff.forumReportManagement.status.na') };
  
  return (
    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: map.bgColor, color: map.textColor }}>
      {map.label}
    </span>
  );
};

const TypeBadge = ({ reasons }) => {
  const { t } = useTranslation();
  if (!reasons) {
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: '#F5F5F5', color: '#9CA3AF' }}>
        {t('staff.forumReportManagement.violationTypes.na')}
      </span>
    );
  }

  // Reasons is a string (joined from Set), try to find the first matching type
  const reasonsUpper = typeof reasons === 'string' ? reasons.toUpperCase() : '';
  const typeMap = {
    'SPAM': { bgColor: '#F0E6FF', textColor: '#B380FF', label: t('staff.forumReportManagement.violationTypes.spam') },
    'INAPPROPRIATE': { bgColor: '#FFF4E6', textColor: '#FFB84D', label: t('staff.forumReportManagement.violationTypes.inappropriate') },
    'HARASSMENT': { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('staff.forumReportManagement.violationTypes.harassment') },
    'COPYRIGHT': { bgColor: '#E6F3FF', textColor: '#66B3FF', label: t('staff.forumReportManagement.violationTypes.copyright') },
    'VIOLENCE': { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('staff.forumReportManagement.violationTypes.violence') },
    'HATE_SPEECH': { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('staff.forumReportManagement.violationTypes.hateSpeech') },
    'FALSE_INFO': { bgColor: '#FFF4E6', textColor: '#FFB84D', label: t('staff.forumReportManagement.violationTypes.falseInfo') },
    'OTHER': { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: t('staff.forumReportManagement.violationTypes.other') }
  };
  
  // Find first matching type
  let matchedType = 'OTHER';
  for (const [type] of Object.entries(typeMap)) {
    if (reasonsUpper.includes(type)) {
      matchedType = type;
      break;
    }
  }
  
  const map = typeMap[matchedType] || { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: t('staff.forumReportManagement.violationTypes.other') };
  
  return (
    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: map.bgColor, color: map.textColor }}>
      {map.label}
    </span>
  );
};

export default ForumReportManagement;
