import { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, createAuthHeaders } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import ReportDetailModal from './ReportDetailModal';
import DeleteConfirmModal from '../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import { Tooltip } from '../../../components';
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [reportToApprove, setReportToApprove] = useState(null);

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
          reason: report.reasons || t('admin.forumReportManagement.noReason') || 'Không có lý do',
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
        // Silently handle error fetching stats
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

  const approveReport = async (reportId) => {
    if (!user?.email) {
      alert(t('common.errors.loginRequired'));
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
          adminNote: t('admin.forumReportManagement.approveNote') || 'Báo cáo đã được duyệt và xử lý'
        })
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Refresh reports and stats
        setRefreshTrigger(prev => prev + 1);
        alert(t('admin.forumReportManagement.approveSuccess'));
      } else {
        const errorText = await response.text();
        alert(t('admin.forumReportManagement.approveError', { error: errorText }));
      }
    } catch (error) {
      // Silently handle error approving report
      alert(t('admin.forumReportManagement.loadError'));
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
      alert(t('common.errors.loginRequired'));
      return;
    }

    if (!window.confirm(t('admin.forumReportManagement.confirmReject'))) {
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
          adminNote: t('admin.forumReportManagement.rejectNote') || 'Báo cáo đã bị từ chối'
        })
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Refresh reports and stats
        setRefreshTrigger(prev => prev + 1);
        alert(t('admin.forumReportManagement.rejectSuccess'));
      } else {
        const errorText = await response.text();
        alert(t('admin.forumReportManagement.rejectError', { error: errorText }));
      }
    } catch (error) {
      // Silently handle error rejecting report
      alert(t('admin.forumReportManagement.loadError'));
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
            : (fullReport.reasons || t('admin.forumReportManagement.noReason') || 'Không có lý do'),
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
        alert(t('admin.forumReportManagement.detailError', { error: errorText }));
      }
    } catch (error) {
      // Silently handle error fetching report details
      alert(t('admin.forumReportManagement.detailLoadError'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#66B3FF' }}></div>
          <p className="mt-4 text-gray-600">{t('admin.forumReportManagement.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>{t('admin.forumReportManagement.title')}</p>
          <h1 className="text-3xl font-semibold text-gray-800">{t('admin.forumReportManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.forumReportManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label={t('admin.forumReportManagement.stats.total')} value={stats.total} trend="" />
        <StatCard icon={Clock} label={t('admin.forumReportManagement.stats.pending')} value={stats.pending} trend={t('admin.forumReportManagement.stats.pendingDesc')} color="text-amber-500" />
        <StatCard icon={CheckCircle2} label={t('admin.forumReportManagement.stats.resolved')} value={stats.resolved} trend="" color="text-green-600" />
        <StatCard icon={XCircle} label={t('admin.forumReportManagement.stats.dismissed')} value={stats.dismissed} trend="" color="text-red-600" />
      </div>

      <div className="bg-white rounded-[28px] shadow-sm border" style={{ borderColor: '#F0F0F0' }}>
        <div className="flex flex-col gap-3 p-5 border-b lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: '#F0F0F0' }}>
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.forumReportManagement.searchPlaceholder')}
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
              <option value="ALL">{t('admin.forumReportManagement.statusFilter.all')}</option>
              <option value="PENDING">{t('admin.forumReportManagement.statusFilter.pending')}</option>
              <option value="INVESTIGATING">{t('admin.forumReportManagement.statusFilter.investigating')}</option>
              <option value="RESOLVED">{t('admin.forumReportManagement.statusFilter.resolved')}</option>
              <option value="DISMISSED">{t('admin.forumReportManagement.statusFilter.dismissed')}</option>
              <option value="CLOSED">{t('admin.forumReportManagement.statusFilter.closed')}</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-[20px] px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
              style={{ borderColor: '#E0E0E0' }}
            >
              <option value="ALL">{t('admin.forumReportManagement.typeFilter.all')}</option>
              <option value="SPAM">{t('admin.forumReportManagement.typeFilter.spam')}</option>
              <option value="INAPPROPRIATE">{t('admin.forumReportManagement.typeFilter.inappropriate')}</option>
              <option value="HARASSMENT">{t('admin.forumReportManagement.typeFilter.harassment')}</option>
              <option value="COPYRIGHT">{t('admin.forumReportManagement.typeFilter.copyright')}</option>
              <option value="OTHER">{t('admin.forumReportManagement.typeFilter.other')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: '#F0F0F0' }}>
            <thead style={{ backgroundColor: '#FAFAFA' }}>
              <tr>
                {[t('admin.forumReportManagement.tableHeaders.stt'), t('admin.forumReportManagement.tableHeaders.report'), t('admin.forumReportManagement.tableHeaders.reporter'), t('admin.forumReportManagement.tableHeaders.violationType'), t('admin.forumReportManagement.tableHeaders.status'), t('admin.forumReportManagement.tableHeaders.reportDate'), t('admin.forumReportManagement.tableHeaders.actions')].map((header) => (
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
                    {loading ? t('admin.forumReportManagement.loading') : t('admin.forumReportManagement.noResults')}
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
                        href={`/forum?${report.targetType === 'POST' ? 'postId' : 'commentId'}=${report.targetId}&fromAdmin=true`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/forum?${report.targetType === 'POST' ? 'postId' : 'commentId'}=${report.targetId}&fromAdmin=true`);
                        }}
                        className="inline-flex items-center text-sm px-3 py-1.5 rounded-[16px] font-semibold cursor-pointer transition-all no-underline"
                        style={report.targetType === 'POST' 
                          ? { backgroundColor: '#E6F3FF', color: '#66B3FF' }
                          : { backgroundColor: '#F0E6FF', color: '#B380FF' }
                        }
                        onMouseEnter={(e) => {
                          if (report.targetType === 'POST') {
                            e.target.style.backgroundColor = '#CCE6FF';
                          } else {
                            e.target.style.backgroundColor = '#E0CCFF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (report.targetType === 'POST') {
                            e.target.style.backgroundColor = '#E6F3FF';
                          } else {
                            e.target.style.backgroundColor = '#F0E6FF';
                          }
                        }}
                        title={report.targetType === 'POST' ? t('admin.forumReportManagement.viewPost') : t('admin.forumReportManagement.viewComment')}
                      >
                        {report.targetType === 'POST' ? t('admin.forumReportManagement.reportTypes.post') : t('admin.forumReportManagement.reportTypes.comment')}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800">{report.reporterName || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <TypeBadge reasons={report.reason} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {report.createdAt ? new Date(report.createdAt).toLocaleString(i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tooltip text={t('admin.forumReportManagement.actions.viewDetails')} position="top">
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
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </Tooltip>
                        {(report.status === 'PENDING' || report.status === 'INVESTIGATING') && (
                          <>
                            <Tooltip text={t('admin.forumReportManagement.actions.approve')} position="top">
                              <button 
                                onClick={() => handleApprove(report.reportId)}
                                className="p-2 rounded-[20px] transition"
                                style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#BBF7D0';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#DCFCE7';
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </Tooltip>
                            <Tooltip text={t('admin.forumReportManagement.actions.reject')} position="top">
                              <button 
                                onClick={() => handleReject(report.reportId)}
                                className="p-2 rounded-[20px] transition"
                                style={{ backgroundColor: '#FFE6F0', color: '#FF80B3' }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#FFCCE0';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#FFE6F0';
                                }}
                              >
                                <XCircle className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </Tooltip>
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
              {t('admin.forumReportManagement.pagination.page', { current: currentPage + 1, total: totalPages })}
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
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                {t('admin.forumReportManagement.pagination.previous')}
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 text-sm border rounded-[20px] disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#F5F5F5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                {t('admin.forumReportManagement.pagination.next')}
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
        title={t('admin.forumReportManagement.approveConfirm.title')}
        message={t('admin.forumReportManagement.approveConfirm.message', { id: reportToApprove?.reportId })}
        itemName={reportToApprove?.reportId?.toString()}
        confirmText={t('admin.forumReportManagement.approveConfirm.confirm')}
        cancelText={t('admin.forumReportManagement.approveConfirm.cancel')}
        danger={false}
        icon={<CheckCircle size={36} strokeWidth={1.5} />}
      />
    </div>
  );
};

const StatCard = ({ icon: IconComponent, label, value, trend, color = 'text-blue-600' }) => {
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
            <IconComponent className="h-7 w-7" style={{ color: colors.iconColor }} strokeWidth={1.5} />
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-800">{value}</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{label}</p>
          {trend && <p className="text-xs font-medium" style={{ color: colors.textColor }}>{trend}</p>}
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const statusMap = {
    'PENDING': { bgColor: '#FFF4E6', textColor: '#FFB84D', label: t('admin.forumReportManagement.status.pending') },
    'INVESTIGATING': { bgColor: '#E6F3FF', textColor: '#66B3FF', label: t('admin.forumReportManagement.status.investigating') },
    'RESOLVED': { bgColor: '#DCFCE7', textColor: '#15803D', label: t('admin.forumReportManagement.status.resolved') },
    'DISMISSED': { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('admin.forumReportManagement.status.dismissed') },
    'CLOSED': { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: t('admin.forumReportManagement.status.closed') }
  };
  
  const map = statusMap[status] || { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: status || 'N/A' };
  
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
        N/A
      </span>
    );
  }

  // Reasons is a string (joined from Set), try to find the first matching type
  const reasonsUpper = reasons.toUpperCase();
  const typeMap = {
    'SPAM': { bgColor: '#F0E6FF', textColor: '#B380FF', label: t('admin.forumReportManagement.violationTypes.spam') },
    'INAPPROPRIATE': { bgColor: '#FFE5CC', textColor: '#FF8C42', label: t('admin.forumReportManagement.violationTypes.inappropriate') },
    'HARASSMENT': { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('admin.forumReportManagement.violationTypes.harassment') },
    'COPYRIGHT': { bgColor: '#E6F3FF', textColor: '#66B3FF', label: t('admin.forumReportManagement.violationTypes.copyright') },
    'VIOLENCE': { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('admin.forumReportManagement.violationTypes.violence') },
    'HATE_SPEECH': { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('admin.forumReportManagement.violationTypes.hateSpeech') },
    'FALSE_INFO': { bgColor: '#FFF4E6', textColor: '#FFB84D', label: t('admin.forumReportManagement.violationTypes.falseInfo') },
    'OTHER': { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: t('admin.forumReportManagement.violationTypes.other') }
  };
  
  // Find first matching type
  let matchedType = 'OTHER';
  for (const [type] of Object.entries(typeMap)) {
    if (reasonsUpper.includes(type)) {
      matchedType = type;
      break;
    }
  }
  
  const map = typeMap[matchedType] || { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: 'Khác' };
  
  return (
    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: map.bgColor, color: map.textColor }}>
      {map.label}
    </span>
  );
};

export default ForumReportManagement;
