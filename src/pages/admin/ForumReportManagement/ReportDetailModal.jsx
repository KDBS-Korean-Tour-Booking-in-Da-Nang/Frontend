import { useTranslation } from 'react-i18next';
import { 
  XMarkIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon as CheckCircleOutlineIcon,
  XCircleIcon as XCircleOutlineIcon,
  TagIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const ReportDetailModal = ({ isOpen, onClose, report, onApprove, onReject }) => {
  const { t, i18n } = useTranslation();
  if (!isOpen || !report) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
    return new Date(dateString).toLocaleString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'PENDING': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: t('admin.forumReportManagement.status.pending') },
      'INVESTIGATING': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: t('admin.forumReportManagement.status.investigating') },
      'RESOLVED': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: t('admin.forumReportManagement.status.resolved') },
      'DISMISSED': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: t('admin.forumReportManagement.status.dismissed') },
      'CLOSED': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: t('admin.forumReportManagement.status.closed') }
    };
    
    const map = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: status };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${map.bg} ${map.text} ${map.border}`}>
        {map.label}
      </span>
    );
  };

  const getTypeBadge = (reasons) => {
    if (!reasons) return null;
    
    const reasonsUpper = reasons.toUpperCase();
    const typeMap = {
      'SPAM': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', label: t('admin.forumReportManagement.violationTypes.spam') },
      'INAPPROPRIATE': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', label: t('admin.forumReportManagement.violationTypes.inappropriate') },
      'HARASSMENT': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: t('admin.forumReportManagement.violationTypes.harassment') },
      'COPYRIGHT': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: t('admin.forumReportManagement.violationTypes.copyright') },
      'VIOLENCE': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: t('admin.forumReportManagement.violationTypes.violence') },
      'HATE_SPEECH': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: t('admin.forumReportManagement.violationTypes.hateSpeech') },
      'FALSE_INFO': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', label: t('admin.forumReportManagement.violationTypes.falseInfo') },
      'OTHER': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: t('admin.forumReportManagement.violationTypes.other') }
    };
    
    let matchedType = 'OTHER';
    for (const [type] of Object.entries(typeMap)) {
      if (reasonsUpper.includes(type)) {
        matchedType = type;
        break;
      }
    }
    
    const map = typeMap[matchedType] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: t('admin.forumReportManagement.violationTypes.other') };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${map.bg} ${map.text} ${map.border}`}>
        {map.label}
      </span>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-red-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('admin.reportDetailModal.title')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t('admin.reportDetailModal.id', { id: report.reportId })}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[20px] hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
          {/* Status & Target Type Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
              <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                <TagIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">{t('admin.reportDetailModal.fields.status')}</p>
                {getStatusBadge(report.status)}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
              <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                {report.targetType === 'POST' ? (
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-purple-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">{t('admin.reportDetailModal.fields.contentType')}</p>
                <p className="text-sm font-medium text-gray-900">
                  {report.targetType === 'POST' ? t('admin.forumReportManagement.reportTypes.post') : t('admin.forumReportManagement.reportTypes.comment')}
                </p>
                {report.targetId && (
                  <p className="text-xs text-gray-400 mt-0.5">{t('admin.reportDetailModal.fields.contentId', { id: report.targetId })}</p>
                )}
              </div>
            </div>
          </div>

          {/* Reporter & Violation Type Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
              <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">{t('admin.reportDetailModal.fields.reporter')}</p>
                <p className="text-sm font-medium text-gray-900 mb-1">{report.reporterName || 'N/A'}</p>
                {report.reporterEmail && (
                  <p className="text-xs text-gray-500">{report.reporterEmail}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
              <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                <InformationCircleIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">{t('admin.reportDetailModal.fields.violationType')}</p>
                {getTypeBadge(report.reason)}
              </div>
            </div>
          </div>

          {/* Dates Row */}
          <div className={`grid gap-4 ${report.resolvedAt ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="flex items-center gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
              <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">{t('admin.reportDetailModal.fields.reportDate')}</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(report.createdAt)}</p>
              </div>
            </div>
            {report.resolvedAt && (
              <div className="flex items-center gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
                <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                  <CheckCircleOutlineIcon className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">{t('admin.reportDetailModal.fields.resolvedDate')}</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(report.resolvedAt)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Target Content Info */}
          {(report.targetTitle || report.targetAuthor) && (report.targetTitle !== 'N/A' || report.targetAuthor !== 'N/A') && (
            <div className="p-4 rounded-[20px] bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t('admin.reportDetailModal.fields.contentInfo')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.targetTitle && report.targetTitle !== 'N/A' && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('admin.reportDetailModal.fields.title')}</p>
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{report.targetTitle}</p>
                  </div>
                )}
                {report.targetAuthor && report.targetAuthor !== 'N/A' && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('admin.reportDetailModal.fields.author')}</p>
                    <p className="text-sm font-medium text-gray-900">{report.targetAuthor}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reason Description */}
          {report.reason && report.reason !== 'N/A' && (
            <div className="p-4 rounded-[20px] bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-2">{t('admin.reportDetailModal.fields.reason')}</p>
              <p className="text-sm text-gray-900">{report.reason}</p>
            </div>
          )}

          {/* Description */}
          {report.description && report.description !== 'N/A' && (
            <div className="p-4 rounded-[20px] bg-purple-50 border border-purple-200">
              <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-2">{t('admin.reportDetailModal.fields.description')}</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{report.description}</p>
            </div>
          )}

          {/* Resolution Info */}
          {(report.adminNote || report.resolvedByUsername) && (report.adminNote !== 'N/A' || report.resolvedByUsername !== 'N/A') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.adminNote && report.adminNote !== 'N/A' && (
                <div className="p-4 rounded-[20px] bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-2">{t('admin.reportDetailModal.fields.adminNote')}</p>
                  <p className="text-sm text-gray-900">{report.adminNote}</p>
                </div>
              )}
              {report.resolvedByUsername && report.resolvedByUsername !== 'N/A' && (
                <div className="p-4 rounded-[20px] bg-green-50 border border-green-200">
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-2">{t('admin.reportDetailModal.fields.resolvedBy')}</p>
                  <p className="text-sm font-medium text-gray-900">{report.resolvedByUsername}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {(report.status === 'PENDING' || report.status === 'INVESTIGATING') && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-[20px] border border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 transition-all"
            >
              {t('admin.reportDetailModal.actions.close')}
            </button>
            <button
              onClick={() => {
                onReject(report.reportId);
                onClose();
              }}
              className="px-6 py-2.5 rounded-[20px] bg-red-500 text-white font-semibold hover:bg-red-600 transition-all shadow-[0_8px_20px_rgba(239,68,68,0.3)] flex items-center gap-2"
            >
              <XCircleIcon className="w-4 h-4" />
              {t('admin.reportDetailModal.actions.reject')}
            </button>
            <button
              onClick={() => {
                onApprove(report.reportId);
                onClose();
              }}
              className="px-6 py-2.5 rounded-[20px] bg-green-500 text-white font-semibold hover:bg-green-600 transition-all shadow-[0_8px_20px_rgba(34,197,94,0.3)] flex items-center gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              {t('admin.reportDetailModal.actions.approve')}
            </button>
          </div>
        )}

        {!(report.status === 'PENDING' || report.status === 'INVESTIGATING') && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-[20px] bg-[#4c9dff] text-white font-semibold hover:bg-[#3f85d6] transition-all shadow-[0_8px_20px_rgba(76,157,255,0.3)]"
            >
              {t('admin.reportDetailModal.actions.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetailModal;
