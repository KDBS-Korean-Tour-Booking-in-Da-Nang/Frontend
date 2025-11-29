import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders } from '../../../../config/api';
import { XMarkIcon } from '@heroicons/react/24/outline';

const pastelCardClasses = 'rounded-[28px] bg-white/95 border border-[#eceff7] shadow-[0_15px_45px_rgba(15,23,42,0.08)]';
const primaryButtonClasses = 'inline-flex items-center justify-center gap-2 rounded-[999px] px-5 py-2 text-sm font-semibold text-white bg-[#4c9dff] hover:bg-[#3f87e0] transition-all duration-200 shadow-[0_10px_25px_rgba(76,157,255,0.35)]';
const neutralButtonClasses = 'inline-flex items-center justify-center gap-2 rounded-[999px] px-5 py-2 text-sm font-semibold text-[#4c4f69] bg-white border border-[#e2e6f3] hover:border-[#c7d2ef] transition-all duration-200';

const ForumReportManagement = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [forumReports, setForumReports] = useState([]);
  const [reportPage, setReportPage] = useState(0);
  const [reportTotalPages, setReportTotalPages] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportNote, setReportNote] = useState('');

  const loadForumReports = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.REPORTS_ADMIN_ALL}?page=${page}&size=10`, {
        headers: createAuthHeaders(token)
      });

      if (!response.ok) throw new Error('Failed to load reports');
      const data = await response.json();
      setForumReports(data.content || []);
      setReportTotalPages(data.totalPages || 0);
      setReportPage(page);
    } catch (error) {
      console.error('Error loading forum reports:', error);
      showError('Không thể tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadForumReports();
  }, [loadForumReports]);

  const getReportStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-[#fff4d8] text-[#b7791f]';
      case 'INVESTIGATING': return 'bg-[#e3f2ff] text-[#2563eb]';
      case 'RESOLVED': return 'bg-[#e5f8f1] text-[#15803d]';
      case 'DISMISSED': return 'bg-[#f3f4f6] text-[#4b5563]';
      case 'CLOSED': return 'bg-[#f3f4f6] text-[#4b5563]';
      default: return 'bg-[#f3f4f6] text-[#4b5563]';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const handleReportStatusUpdate = async (reportId, status) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const email = user?.email || '';

      const response = await fetch(`${BaseURL}/api/reports/${reportId}/status?adminEmail=${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: createAuthHeaders(token),
        body: JSON.stringify({
          status,
          adminNote: reportNote || null
        })
      });

      if (!response.ok) throw new Error('Failed to update report status');
      showSuccess('Cập nhật trạng thái báo cáo thành công');
      setShowReportModal(false);
      setReportNote('');
      loadForumReports(reportPage);
    } catch (error) {
      console.error('Error updating report status:', error);
      showError('Không thể cập nhật trạng thái báo cáo');
    }
  };

  const renderLoadingState = (message) => (
    <div className="py-16 text-center text-sm text-[#8d94a8]">{message}</div>
  );

  const renderEmptyState = (message) => (
    <div className="py-16 text-center">
      <p className="text-sm text-[#a0a7bb]">{message}</p>
    </div>
  );

  return (
    <>
      <div className={`${pastelCardClasses}`}>
        <div className="flex flex-col gap-2 border-b border-[#eef2ff] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Forum Report</p>
            <h3 className="text-xl font-semibold text-[#111827]">Forum Report Management</h3>
          </div>
          <button onClick={() => loadForumReports(reportPage)} className={neutralButtonClasses}>Refresh</button>
        </div>

        {loading ? renderLoadingState('Đang tải báo cáo...') : forumReports.length === 0 ? renderEmptyState('Chưa có báo cáo nào cần xử lý') : (
          <div className="overflow-x-auto p-6">
            <table className="min-w-full divide-y divide-[#eef2ff] text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.3em] text-[#a0a7bb]">
                <tr>
                  <th className="py-3 pr-6">ID</th>
                  <th className="py-3 pr-6">Target</th>
                  <th className="py-3 pr-6">Reasons</th>
                  <th className="py-3 pr-6">Status</th>
                  <th className="py-3 pr-6">Reported</th>
                  <th className="py-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {forumReports.map((report) => (
                  <tr key={report.reportId} className="hover:bg-[#f8faff]">
                    <td className="py-4 pr-6 font-medium text-[#1f2937]">#{report.reportId}</td>
                    <td className="py-4 pr-6">
                      <p className="text-[#111827]">{report.targetTitle || 'N/A'}</p>
                      <p className="text-xs text-[#9ca3af]">{report.targetType}</p>
                    </td>
                    <td className="py-4 pr-6">
                      <div className="flex flex-wrap gap-1">
                        {report.reasons ? (
                          typeof report.reasons === 'string' ? (
                            <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#4b5563]">{report.reasons}</span>
                          ) : (
                            <>
                              {report.reasons.slice(0, 2).map((reason, idx) => (
                                <span key={idx} className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs text-[#4b5563]">{reason}</span>
                              ))}
                              {report.reasons.length > 2 && <span className="text-xs text-[#9ca3af]">+{report.reasons.length - 2}</span>}
                            </>
                          )
                        ) : (
                          <span className="text-xs text-[#cbd5f5]">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-6">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getReportStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-[#6b7280]">{formatDate(report.reportedAt)}</td>
                    <td className="py-4 pr-0 text-right">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowReportModal(true);
                        }}
                        className="text-sm font-semibold text-[#4c9dff] hover:text-[#1d7ae2]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportTotalPages > 1 && (
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#eef2ff] bg-[#f9faff] px-4 py-3 text-sm">
                <button
                  onClick={() => loadForumReports(reportPage - 1)}
                  disabled={reportPage === 0}
                  className={`${neutralButtonClasses} disabled:opacity-40`}
                >
                  Previous
                </button>
                <span className="text-[#6b7280]">Page {reportPage + 1} of {reportTotalPages}</span>
                <button
                  onClick={() => loadForumReports(reportPage + 1)}
                  disabled={reportPage >= reportTotalPages - 1}
                  className={`${primaryButtonClasses} disabled:opacity-40`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white">
            <div className="flex items-center justify-between border-b border-[#f0f2f8] px-6 py-4">
              <h2 className="text-xl font-semibold text-[#111827]">Report Details</h2>
              <button onClick={() => setShowReportModal(false)} className="text-[#9ca3af] hover:text-[#4b5563]">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Target</p>
                <p className="text-sm text-[#111827]">{selectedReport.targetTitle || 'N/A'}</p>
                <p className="text-xs text-[#9ca3af]">{selectedReport.targetType}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Reasons</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedReport.reasons ? (
                    typeof selectedReport.reasons === 'string' ? (
                      <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs text-[#4b5563]">{selectedReport.reasons}</span>
                    ) : (
                      selectedReport.reasons.map((reason, idx) => (
                        <span key={idx} className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs text-[#4b5563]">{reason}</span>
                      ))
                    )
                  ) : (
                    <span className="text-xs text-[#cbd5f5]">N/A</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Description</p>
                <p className="text-sm text-[#111827]">{selectedReport.description || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Status</p>
                <span className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getReportStatusColor(selectedReport.status)}`}>
                  {selectedReport.status}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Admin Note</p>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-sm text-[#111827] focus:border-[#4c9dff] focus:outline-none"
                  rows="3"
                  placeholder="Nhập ghi chú..."
                />
              </div>
              <div className="grid gap-3 pt-4 md:grid-cols-3">
                <button onClick={() => handleReportStatusUpdate(selectedReport.reportId, 'RESOLVED')} className={`${primaryButtonClasses} justify-center bg-[#34d399] hover:bg-[#10b981]`}>
                  Resolve
                </button>
                <button onClick={() => handleReportStatusUpdate(selectedReport.reportId, 'DISMISSED')} className={`${primaryButtonClasses} justify-center bg-[#94a3b8] hover:bg-[#64748b]`}>
                  Dismiss
                </button>
                <button onClick={() => handleReportStatusUpdate(selectedReport.reportId, 'INVESTIGATING')} className={`${primaryButtonClasses} justify-center`}>
                  Investigating
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ForumReportManagement;
