import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { getAllComplaints, getComplaintById, resolveBookingComplaint } from '../../../services/bookingAPI';
import Pagination from '../Pagination';
import { Tooltip } from '../../../components';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  X,
} from 'lucide-react';

const ComplaintManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [searchType, setSearchType] = useState('all'); // 'all' or 'complaintId'
  const [allComplaints, setAllComplaints] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [resolutionType, setResolutionType] = useState('NO_FAULT');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'resolved'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [complaintToResolve, setComplaintToResolve] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

  const isAdminOrStaff = user && (user.role === 'ADMIN' || user.role === 'STAFF');

  // Load all complaints khi mount: gọi getAllComplaints với auto redirect 401 cho user-initiated actions
  useEffect(() => {
    loadAllComplaints();
  }, []);

  const loadAllComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllComplaints(true);
      setAllComplaints(Array.isArray(data) ? data : []);
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  // Filter complaints dựa trên search và status: filter theo status (pending=không có resolutionType, resolved=có resolutionType), search trong complaintId (number) hoặc message (case-insensitive)
  const filteredComplaints = useMemo(() => {
    let filtered = [...allComplaints];

    if (filterStatus === 'pending') {
      filtered = filtered.filter((c) => !c.resolutionType);
    } else if (filterStatus === 'resolved') {
      filtered = filtered.filter((c) => c.resolutionType);
    }

    if (searchInput.trim()) {
      if (searchType === 'complaintId') {
        const id = Number(searchInput.trim());
        if (Number.isFinite(id) && id > 0) {
          filtered = filtered.filter((c) => c.complaintId === id);
        } else {
          filtered = [];
        }
      } else {
        const searchLower = searchInput.toLowerCase();
        filtered = filtered.filter((c) =>
          c.message?.toLowerCase().includes(searchLower)
        );
      }
    }

    return filtered;
  }, [allComplaints, searchInput, searchType, filterStatus]);

  // Pagination
  const paginatedComplaints = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredComplaints.slice(startIndex, endIndex);
  }, [filteredComplaints, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);

  // Reset về page đầu tiên khi filters thay đổi (searchInput, searchType, filterStatus)
  useEffect(() => {
    setCurrentPage(0);
  }, [searchInput, searchType, filterStatus]);


  const stats = useMemo(() => {
    const total = allComplaints.length;
    const resolved = allComplaints.filter((c) => c.resolutionType !== null && c.resolutionType !== undefined).length;
    const pending = total - resolved;
    return { total, resolved, pending };
  }, [allComplaints]);

  const handleSearchById = async (e) => {
    e?.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setError(t('admin.complaintManagement.errors.enterComplaintId'));
      return;
    }
    const id = Number(trimmed);
    if (!Number.isFinite(id) || id <= 0) {
      setError(t('admin.complaintManagement.errors.invalidId'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const complaint = await getComplaintById(id);
      if (complaint) {
        const exists = allComplaints.some((c) => c.complaintId === complaint.complaintId);
        if (!exists) {
          setAllComplaints([...allComplaints, complaint]);
        }
        setComplaints([complaint]);
      } else {
        setComplaints([]);
        setError(t('admin.complaintManagement.errors.notFound'));
      }
    } catch (err) {
      // Silently handle error fetching complaint
      setError(err?.message || t('admin.complaintManagement.errors.loadError'));
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResolveModal = (complaint) => {
    if (!isAdminOrStaff) {
      setError(t('admin.complaintManagement.resolveModal.noPermission'));
      return;
    }
    setComplaintToResolve(complaint);
    setIsResolveModalOpen(true);
    setResolutionType('NO_FAULT');
    setNote('');
  };

  const handleCloseResolveModal = () => {
    setIsResolveModalOpen(false);
    setComplaintToResolve(null);
    setResolutionType('NO_FAULT');
    setNote('');
  };

  const handleResolve = async () => {
    if (!complaintToResolve || !resolutionType) {
      setError(t('admin.complaintManagement.resolveModal.error'));
      return;
    }
    try {
      setResolvingId(complaintToResolve.complaintId);
      await resolveBookingComplaint(complaintToResolve.complaintId, resolutionType, note);
      // Refresh all complaints
      await loadAllComplaints();
      handleCloseResolveModal();
    } catch (err) {
      // Silently handle error resolving complaint
      setError(err?.message || t('admin.complaintManagement.errors.resolveError'));
    } finally {
      setResolvingId(null);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const handleViewDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedComplaint(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>
            {t('admin.complaintManagement.title')}
          </p>
          <h1 className="text-3xl font-semibold text-gray-800">{t('admin.complaintManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.complaintManagement.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={AlertTriangle}
          label={t('admin.complaintManagement.stats.total')}
          value={stats.total}
          color="text-amber-500"
        />
        <StatCard
          icon={CheckCircle2}
          label={t('admin.complaintManagement.stats.resolved')}
          value={stats.resolved}
          color="text-green-600"
        />
        <StatCard
          icon={Clock}
          label={t('admin.complaintManagement.stats.pending')}
          value={stats.pending}
          color="text-blue-600"
        />
      </div>

      {/* Search and Filter box */}
      <div className="bg-white rounded-[28px] shadow-sm border p-5" style={{ borderColor: '#F0F0F0' }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={searchType === 'complaintId' ? t('admin.complaintManagement.search.placeholderId') : t('admin.complaintManagement.search.placeholderAll')}
                className="w-full border rounded-[20px] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
                style={{ borderColor: '#E0E0E0' }}
              />
            </div>
            <select
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value);
                setSearchInput('');
              }}
              className="border rounded-[20px] px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
              style={{ borderColor: '#E0E0E0' }}
            >
              <option value="all">{t('admin.complaintManagement.search.all')}</option>
              <option value="complaintId">{t('admin.complaintManagement.search.byComplaintId')}</option>
            </select>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">{t('admin.complaintManagement.search.filterByStatus')}</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded-[20px] px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
                style={{ borderColor: '#E0E0E0' }}
              >
                <option value="all">{t('admin.complaintManagement.search.all')}</option>
                <option value="pending">{t('admin.complaintManagement.search.pending')}</option>
                <option value="resolved">{t('admin.complaintManagement.search.resolved')}</option>
              </select>
            </div>
          </div>
        </div>
        {searchType === 'complaintId' && searchInput.trim() && (
          <div className="mt-4">
            <button
              onClick={handleSearchById}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[20px] text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#66B3FF', color: '#FFFFFF' }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = '#4DA3FF';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = '#66B3FF';
                }
              }}
            >
              {loading ? t('admin.complaintManagement.loading') : t('admin.complaintManagement.searchById')}
            </button>
          </div>
        )}
        {error && (
          <p className="mt-3 text-sm px-4 py-2 rounded-[20px]" style={{ backgroundColor: '#FFE6F0', color: '#FF80B3' }}>
            {error}
          </p>
        )}
      </div>

      {/* Complaints table */}
      <div className="bg-white rounded-[28px] shadow-sm border" style={{ borderColor: '#F0F0F0' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#F0F0F0' }}>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Complaints {filteredComplaints.length > 0 && `(${filteredComplaints.length})`}
            </h2>
            <p className="text-sm text-gray-500">
              {allComplaints.length > 0
                ? t('admin.complaintManagement.showing', { count: paginatedComplaints.length, filtered: filteredComplaints.length, total: allComplaints.length })
                : t('admin.complaintManagement.noComplaints')}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: '#F0F0F0' }}>
            <thead style={{ backgroundColor: '#FAFAFA' }}>
              <tr>
                {[t('admin.complaintManagement.tableHeaders.id'), t('admin.complaintManagement.tableHeaders.message'), t('admin.complaintManagement.tableHeaders.createdAt'), t('admin.complaintManagement.tableHeaders.resolution'), t('admin.complaintManagement.tableHeaders.resolvedAt'), t('admin.complaintManagement.tableHeaders.action')].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y" style={{ borderColor: '#F0F0F0' }}>
              {paginatedComplaints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                    {loading
                      ? t('admin.complaintManagement.loadingComplaints')
                      : allComplaints.length === 0
                      ? t('admin.complaintManagement.noComplaints')
                      : t('admin.complaintManagement.noMatch')}
                  </td>
                </tr>
              ) : (
                paginatedComplaints.map((complaint, index) => (
                  <tr key={complaint.complaintId} className="transition" style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6F3FF'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
                      #{complaint.complaintId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 max-w-md">
                      <p className="line-clamp-3 whitespace-pre-wrap">{complaint.message || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateTime(complaint.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <ResolutionBadge resolutionType={complaint.resolutionType} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateTime(complaint.resolvedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tooltip text={t('admin.complaintManagement.actions.viewDetails')} position="top">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(complaint)}
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
                            <Eye className="h-5 w-5" strokeWidth={1.5} />
                          </button>
                        </Tooltip>
                        {complaint.resolutionType ? (
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
                            {t('admin.complaintManagement.status.resolved')}
                          </span>
                        ) : (
                          <Tooltip text={t('admin.complaintManagement.actions.resolve')} position="top">
                            <button
                              type="button"
                              onClick={() => handleOpenResolveModal(complaint)}
                              disabled={resolvingId === complaint.complaintId || !isAdminOrStaff}
                              className="p-2 rounded-[20px] transition disabled:opacity-60 disabled:cursor-not-allowed"
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
                            >
                              {resolvingId === complaint.complaintId ? (
                                <Clock className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                              ) : (
                                <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
                              )}
                            </button>
                          </Tooltip>
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
        {filteredComplaints.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredComplaints.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          onClose={handleCloseModal}
        />
      )}

      {/* Resolve Modal */}
      {isResolveModalOpen && complaintToResolve && (
        <ResolveComplaintModal
          complaint={complaintToResolve}
          resolutionType={resolutionType}
          setResolutionType={setResolutionType}
          note={note}
          setNote={setNote}
          onResolve={handleResolve}
          onClose={handleCloseResolveModal}
          isResolving={resolvingId === complaintToResolve.complaintId}
        />
      )}
    </div>
  );
};

const StatCard = ({ icon: IconComponent, label, value, color = 'text-blue-600' }) => {
  const colorMap = {
    'text-blue-600': { bg: '#E6F3FF', iconColor: '#66B3FF', textColor: '#66B3FF' },
    'text-amber-500': { bg: '#FFF4E6', iconColor: '#FFB84D', textColor: '#FFB84D' },
    'text-green-600': { bg: '#DCFCE7', iconColor: '#15803D', textColor: '#15803D' }
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
        </div>
      </div>
    </div>
  );
};

const ResolutionBadge = ({ resolutionType }) => {
  const { t } = useTranslation();
  if (!resolutionType) {
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: '#FFF4E6', color: '#FFB84D' }}>
        {t('admin.complaintManagement.status.pending')}
      </span>
    );
  }

  const map = {
    COMPANY_FAULT: { bgColor: '#FFE6F0', textColor: '#FF80B3', label: t('admin.complaintManagement.status.companyFault') },
    USER_FAULT: { bgColor: '#E6F3FF', textColor: '#66B3FF', label: t('admin.complaintManagement.status.userFault') },
    NO_FAULT: { bgColor: '#DCFCE7', textColor: '#15803D', label: t('admin.complaintManagement.status.noFault') },
  };

  const cfg = map[resolutionType] || { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: resolutionType };

  return (
    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: cfg.bgColor, color: cfg.textColor }}>
      {cfg.label}
    </span>
  );
};

const ComplaintDetailModal = ({ complaint, onClose }) => {
  const { t, i18n } = useTranslation();
  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    try {
      const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
      return new Date(value).toLocaleString(locale);
    } catch {
      return value;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border"
        style={{ borderColor: '#F0F0F0' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b bg-white" style={{ borderColor: '#F0F0F0', backgroundColor: '#E6F3FF' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">{t('admin.complaintManagement.modal.title')}</h2>
              <p className="text-sm text-gray-500 mt-1">{t('admin.complaintManagement.modal.complaintId', { id: complaint.complaintId })}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-[20px] hover:bg-white/80 text-gray-500 hover:text-gray-700 transition-all duration-200"
              title={t('admin.complaintManagement.modal.close')}
            >
              <X className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="space-y-6">
            {/* Message Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t('admin.complaintManagement.modal.message')}
              </label>
              <div className="p-4 rounded-[24px] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' }}>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {complaint.message || 'N/A'}
                </p>
              </div>
            </div>

            {/* Status Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t('admin.complaintManagement.modal.status')}
                </label>
                <div className="p-3 rounded-[20px] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' }}>
                  <ResolutionBadge resolutionType={complaint.resolutionType} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t('admin.complaintManagement.modal.createdAt')}
                </label>
                <div className="p-3 rounded-[20px] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' }}>
                  <p className="text-sm text-gray-700">{formatDateTime(complaint.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Resolved Information */}
            {complaint.resolutionType && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t('admin.complaintManagement.modal.resolvedAt')}
                </label>
                <div className="p-3 rounded-[20px] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' }}>
                  <p className="text-sm text-gray-700">{formatDateTime(complaint.resolvedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white" style={{ borderColor: '#F0F0F0' }}>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-[20px] text-sm font-medium transition-all duration-200"
              style={{ backgroundColor: '#F5F5F5', color: '#6B7280', borderColor: '#E0E0E0' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E5E5'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F5F5F5'}
            >
              {t('admin.complaintManagement.modal.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResolveComplaintModal = ({ 
  complaint, 
  resolutionType, 
  setResolutionType, 
  note, 
  setNote, 
  onResolve, 
  onClose, 
  isResolving 
}) => {
  const { t } = useTranslation();
  const resolutionOptions = [
    {
      value: 'NO_FAULT',
      label: t('admin.complaintManagement.resolveModal.resolutionOptions.noFault.label'),
      description: t('admin.complaintManagement.resolveModal.resolutionOptions.noFault.description'),
      color: 'bg-green-50 text-green-700 border-green-200'
    },
    {
      value: 'USER_FAULT',
      label: t('admin.complaintManagement.resolveModal.resolutionOptions.userFault.label'),
      description: t('admin.complaintManagement.resolveModal.resolutionOptions.userFault.description'),
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      value: 'COMPANY_FAULT',
      label: t('admin.complaintManagement.resolveModal.resolutionOptions.companyFault.label'),
      description: t('admin.complaintManagement.resolveModal.resolutionOptions.companyFault.description'),
      color: 'bg-red-50 text-red-700 border-red-200'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border"
        style={{ borderColor: '#F0F0F0' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b bg-white" style={{ borderColor: '#F0F0F0', backgroundColor: '#DCFCE7' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">{t('admin.complaintManagement.resolveModal.title')}</h2>
              <p className="text-sm text-gray-500 mt-1">{t('admin.complaintManagement.resolveModal.complaintId', { id: complaint.complaintId })}</p>
            </div>
            <button
              onClick={onClose}
              disabled={isResolving}
              className="p-2 rounded-[20px] hover:bg-white/80 text-gray-500 hover:text-gray-700 transition-all duration-200 disabled:opacity-50"
              title={t('admin.complaintManagement.resolveModal.close')}
            >
              <X className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="space-y-6">
            {/* Complaint Message Preview */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t('admin.complaintManagement.resolveModal.complaintMessage')}
              </label>
              <div className="p-4 rounded-[24px] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' }}>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {complaint.message || 'N/A'}
                </p>
              </div>
            </div>

            {/* Resolution Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {t('admin.complaintManagement.resolveModal.resolutionType')} <span className="text-red-500">{t('admin.complaintManagement.resolveModal.required')}</span>
              </label>
              <div className="space-y-2">
                {resolutionOptions.map((option) => {
                  const isSelected = resolutionType === option.value;
                  const optionColors = {
                    'NO_FAULT': { bg: '#DCFCE7', border: '#BBF7D0', text: '#15803D' },
                    'USER_FAULT': { bg: '#E6F3FF', border: '#CCE6FF', text: '#66B3FF' },
                    'COMPANY_FAULT': { bg: '#FFE6F0', border: '#FFCCE0', text: '#FF80B3' }
                  };
                  const colors = optionColors[option.value] || { bg: '#F5F5F5', border: '#E0E0E0', text: '#6B7280' };
                  
                  return (
                    <label
                      key={option.value}
                      className="flex items-start p-4 rounded-[24px] border-2 cursor-pointer transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? colors.bg : '#FFFFFF',
                        borderColor: isSelected ? colors.border : '#E0E0E0'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#CCCCCC';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#E0E0E0';
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name="resolutionType"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => setResolutionType(e.target.value)}
                        className="mt-0.5 mr-3 h-4 w-4"
                        style={{ accentColor: colors.text }}
                        disabled={isResolving}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-sm" style={{ color: isSelected ? colors.text : '#374151' }}>{option.label}</div>
                        <div className="text-xs mt-1 opacity-80" style={{ color: isSelected ? colors.text : '#6B7280' }}>{option.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Note Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t('admin.complaintManagement.resolveModal.note')}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder={t('admin.complaintManagement.resolveModal.notePlaceholder')}
                disabled={isResolving}
                className="w-full border rounded-[20px] px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white" style={{ borderColor: '#F0F0F0' }}>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isResolving}
              className="px-6 py-2.5 rounded-[20px] text-sm font-medium transition-all duration-200 disabled:opacity-50"
              style={{ backgroundColor: '#F5F5F5', color: '#6B7280', borderColor: '#E0E0E0' }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = '#E5E5E5';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = '#F5F5F5';
                }
              }}
            >
              {t('admin.complaintManagement.resolveModal.cancel')}
            </button>
            <button
              onClick={onResolve}
              disabled={isResolving || !resolutionType}
              className="px-6 py-2.5 rounded-[20px] text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            >
              {isResolving ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  {t('admin.complaintManagement.resolveModal.resolving')}
                </>
              ) : (
                t('admin.complaintManagement.resolveModal.confirm')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintManagement;

