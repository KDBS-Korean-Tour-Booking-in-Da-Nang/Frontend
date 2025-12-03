import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import Pagination from '../Pagination';
import {
  TicketIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ResolveTicketManagement = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [searchType, setSearchType] = useState('all'); // 'all' or 'ticketId'
  const [allTickets, setAllTickets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [resolutionType, setResolutionType] = useState('RESOLVED');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'resolved'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [ticketToResolve, setTicketToResolve] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

  const isAdmin = user && user.role === 'ADMIN';

  // Load all tickets on mount
  useEffect(() => {
    loadAllTickets();
  }, []);

  const loadAllTickets = async () => {
    setLoading(true);
    setError('');
    try {
      // TODO: Replace with actual API endpoint when available
      // const data = await getAllTickets();
      // For now, use placeholder empty array
      const data = [];
      setAllTickets(Array.isArray(data) ? data : []);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      // Silently handle error loading tickets
      setError(err?.message || t('admin.resolveTicketManagement.errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Filter tickets based on search and status
  const filteredTickets = useMemo(() => {
    let filtered = [...allTickets];

    // Filter by status
    if (filterStatus === 'pending') {
      filtered = filtered.filter((t) => !t.resolutionType || t.status === 'PENDING');
    } else if (filterStatus === 'resolved') {
      filtered = filtered.filter((t) => t.resolutionType || t.status === 'RESOLVED');
    }

    // Filter by search
    if (searchInput.trim()) {
      if (searchType === 'ticketId') {
        const id = Number(searchInput.trim());
        if (Number.isFinite(id) && id > 0) {
          filtered = filtered.filter((t) => t.ticketId === id);
        } else {
          filtered = [];
        }
      } else {
        // Search in subject or message
        const searchLower = searchInput.toLowerCase();
        filtered = filtered.filter((t) =>
          t.subject?.toLowerCase().includes(searchLower) ||
          t.message?.toLowerCase().includes(searchLower)
        );
      }
    }

    return filtered;
  }, [allTickets, searchInput, searchType, filterStatus]);

  // Pagination
  const paginatedTickets = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchInput, searchType, filterStatus]);

  const stats = useMemo(() => {
    const total = allTickets.length;
    const resolved = allTickets.filter((t) => t.resolutionType || t.status === 'RESOLVED').length;
    const pending = total - resolved;
    return { total, resolved, pending };
  }, [allTickets]);

  const handleSearchById = async (e) => {
    e?.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setError(t('admin.resolveTicketManagement.errors.enterTicketId'));
      return;
    }
    const id = Number(trimmed);
    if (!Number.isFinite(id) || id <= 0) {
      setError(t('admin.resolveTicketManagement.errors.invalidId'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      // TODO: Replace with actual API endpoint when available
      // const ticket = await getTicketById(id);
      // if (ticket) {
      //   const exists = allTickets.some((t) => t.ticketId === ticket.ticketId);
      //   if (!exists) {
      //     setAllTickets([...allTickets, ticket]);
      //   }
      //   setTickets([ticket]);
      // } else {
      //   setTickets([]);
      //   setError('Ticket not found.');
      // }
      setTickets([]);
      setError(t('admin.resolveTicketManagement.errors.notFound'));
    } catch (err) {
      // Silently handle error fetching ticket
      setError(err?.message || t('admin.resolveTicketManagement.errors.loadError'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResolveModal = (ticket) => {
    if (!isAdmin) {
      setError(t('admin.resolveTicketManagement.errors.noPermission'));
      return;
    }
    setTicketToResolve(ticket);
    setIsResolveModalOpen(true);
    setResolutionType('RESOLVED');
    setNote('');
  };

  const handleCloseResolveModal = () => {
    setIsResolveModalOpen(false);
    setTicketToResolve(null);
    setResolutionType('RESOLVED');
    setNote('');
  };

  const handleResolve = async () => {
    if (!ticketToResolve || !resolutionType) {
      setError(t('admin.resolveTicketManagement.errors.selectResolution'));
      return;
    }
    try {
      setResolvingId(ticketToResolve.ticketId);
      // TODO: Replace with actual API endpoint when available
      // await resolveTicket(ticketToResolve.ticketId, resolutionType, note);
      // Refresh all tickets
      await loadAllTickets();
      handleCloseResolveModal();
    } catch (err) {
      // Silently handle error resolving ticket
      setError(err?.message || t('admin.resolveTicketManagement.errors.resolveError'));
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

  const handleViewDetail = (ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">
            {t('admin.resolveTicketManagement.title')}
          </p>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.resolveTicketManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.resolveTicketManagement.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={TicketIcon}
          label={t('admin.resolveTicketManagement.stats.total')}
          value={stats.total}
          color="text-blue-500"
        />
        <StatCard
          icon={CheckCircleIcon}
          label={t('admin.resolveTicketManagement.stats.resolved')}
          value={stats.resolved}
          color="text-green-600"
        />
        <StatCard
          icon={ClockIcon}
          label={t('admin.resolveTicketManagement.stats.pending')}
          value={stats.pending}
          color="text-amber-500"
        />
      </div>

      {/* Search and Filter box */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={searchType === 'ticketId' ? t('admin.resolveTicketManagement.search.placeholderId') : t('admin.resolveTicketManagement.search.placeholderAll')}
                className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              />
            </div>
            <select
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value);
                setSearchInput('');
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled
            >
              <option value="all">{t('admin.resolveTicketManagement.search.all')}</option>
              <option value="ticketId">{t('admin.resolveTicketManagement.search.byTicketId')}</option>
            </select>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">{t('admin.resolveTicketManagement.search.filterByStatus')}</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              >
                <option value="all">{t('admin.resolveTicketManagement.search.all')}</option>
                <option value="pending">{t('admin.resolveTicketManagement.search.pending')}</option>
                <option value="resolved">{t('admin.resolveTicketManagement.search.resolved')}</option>
              </select>
            </div>
          </div>
          <button
            onClick={loadAllTickets}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? t('admin.resolveTicketManagement.loading') : t('admin.resolveTicketManagement.refresh')}
          </button>
        </div>
        {searchType === 'ticketId' && searchInput.trim() && (
          <div className="mt-4">
            <button
              onClick={handleSearchById}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? t('admin.resolveTicketManagement.loading') : t('admin.resolveTicketManagement.searchById')}
            </button>
          </div>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {/* Tickets table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Support Tickets {filteredTickets.length > 0 && `(${filteredTickets.length})`}
            </h2>
            <p className="text-sm text-gray-500">
              {allTickets.length > 0
                ? `Showing ${paginatedTickets.length} of ${filteredTickets.length} filtered tickets (${allTickets.length} total)`
                : 'No tickets found'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {['ID', 'Subject', 'Created at', 'Status', 'Priority', 'Action'].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <TicketIcon className="h-16 w-16 text-gray-300" />
                      <div>
                        <p className="text-lg font-semibold text-gray-700">{t('admin.resolveTicketManagement.noTickets')}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {t('admin.resolveTicketManagement.noTicketsDesc')}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket) => (
                  <tr key={ticket.ticketId} className="hover:bg-[#e9f2ff]/40 transition">
                    <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
                      #{ticket.ticketId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ticket.subject || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateTime(ticket.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge status={ticket.status || ticket.resolutionType} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {ticket.priority || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(ticket)}
                          className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-all duration-200"
                          title={t('admin.resolveTicketManagement.actions.viewDetails')}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {ticket.resolutionType || ticket.status === 'RESOLVED' ? (
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700">
                            {t('admin.resolveTicketManagement.status.resolved')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenResolveModal(ticket)}
                            disabled={resolvingId === ticket.ticketId || !isAdmin}
                            className="p-2 rounded-lg bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                            title={t('admin.resolveTicketManagement.actions.resolve')}
                          >
                            {resolvingId === ticket.ticketId ? (
                              <ClockIcon className="h-5 w-5 animate-spin" />
                            ) : (
                              <CheckCircleIcon className="h-5 w-5" />
                            )}
                          </button>
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
        {filteredTickets.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTickets.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={handleCloseModal}
        />
      )}

      {/* Resolve Modal */}
      {isResolveModalOpen && ticketToResolve && (
        <ResolveTicketModal
          ticket={ticketToResolve}
          resolutionType={resolutionType}
          setResolutionType={setResolutionType}
          note={note}
          setNote={setNote}
          onResolve={handleResolve}
          onClose={handleCloseResolveModal}
          isResolving={resolvingId === ticketToResolve.ticketId}
        />
      )}
    </div>
  );
};

const StatCard = ({ icon: IconComponent, label, value, color = 'text-blue-600' }) => (
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
      <span className={`text-xs font-semibold ${color === 'text-blue-600' ? 'text-[#4c9dff]' : color}`}></span>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  if (!status || status === 'PENDING') {
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700">
        {t('admin.resolveTicketManagement.status.pending')}
      </span>
    );
  }

  if (status === 'RESOLVED') {
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700">
        {t('admin.resolveTicketManagement.status.resolved')}
      </span>
    );
  }

  return (
    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
      {status}
    </span>
  );
};

const TicketDetailModal = ({ ticket, onClose }) => {
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('admin.resolveTicketManagement.modal.title')}</h2>
              <p className="text-sm text-gray-500 mt-1">{t('admin.resolveTicketManagement.modal.ticketId', { id: ticket.ticketId })}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/80 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-200"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Subject Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t('admin.resolveTicketManagement.modal.subject')}
              </label>
              <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {ticket.subject || 'N/A'}
                </p>
              </div>
            </div>

            {/* Message Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t('admin.resolveTicketManagement.modal.message')}
              </label>
              <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {ticket.message || 'N/A'}
                </p>
              </div>
            </div>

            {/* Status Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t('admin.resolveTicketManagement.modal.status')}
                </label>
                <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                  <StatusBadge status={ticket.status || ticket.resolutionType} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t('admin.resolveTicketManagement.modal.priority')}
                </label>
                <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                  <p className="text-sm text-gray-700">{ticket.priority || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t('admin.resolveTicketManagement.modal.createdAt')}
                </label>
                <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                  <p className="text-sm text-gray-700">{formatDateTime(ticket.createdAt)}</p>
                </div>
              </div>
              {ticket.resolvedAt && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {t('admin.resolveTicketManagement.modal.resolvedAt')}
                  </label>
                  <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                    <p className="text-sm text-gray-700">{formatDateTime(ticket.resolvedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all duration-200"
            >
              {t('admin.resolveTicketManagement.modal.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResolveTicketModal = ({ 
  ticket, 
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
      value: 'RESOLVED',
      label: t('admin.resolveTicketManagement.resolveModal.resolutionOptions.resolved.label'),
      description: t('admin.resolveTicketManagement.resolveModal.resolutionOptions.resolved.description'),
      color: 'bg-green-50 text-green-700 border-green-200'
    },
    {
      value: 'CLOSED',
      label: t('admin.resolveTicketManagement.resolveModal.resolutionOptions.closed.label'),
      description: t('admin.resolveTicketManagement.resolveModal.resolutionOptions.closed.description'),
      color: 'bg-gray-50 text-gray-700 border-gray-200'
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-green-50/50 to-blue-50/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('admin.resolveTicketManagement.resolveModal.title')}</h2>
              <p className="text-sm text-gray-500 mt-1">{t('admin.resolveTicketManagement.resolveModal.ticketId', { id: ticket.ticketId })}</p>
            </div>
            <button
              onClick={onClose}
              disabled={isResolving}
              className="p-2 rounded-xl bg-white/80 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-200 disabled:opacity-50"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Ticket Preview */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t('admin.resolveTicketManagement.resolveModal.ticketSubject')}
              </label>
              <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                <p className="text-sm text-gray-800 leading-relaxed line-clamp-4">
                  {ticket.subject || 'N/A'}
                </p>
              </div>
            </div>

            {/* Resolution Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {t('admin.resolveTicketManagement.resolveModal.resolutionType')} <span className="text-red-500">{t('admin.resolveTicketManagement.resolveModal.required')}</span>
              </label>
              <div className="space-y-2">
                {resolutionOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                      resolutionType === option.value
                        ? `${option.color} border-current`
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolutionType"
                      value={option.value}
                      checked={resolutionType === option.value}
                      onChange={(e) => setResolutionType(e.target.value)}
                      className="mt-0.5 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      disabled={isResolving}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className="text-xs mt-1 opacity-80">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Note Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t('admin.resolveTicketManagement.resolveModal.note')}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder={t('admin.resolveTicketManagement.resolveModal.notePlaceholder')}
                disabled={isResolving}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isResolving}
              className="px-6 py-2.5 rounded-xl bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-all duration-200 disabled:opacity-50"
            >
              {t('admin.resolveTicketManagement.resolveModal.cancel')}
            </button>
            <button
              onClick={onResolve}
              disabled={isResolving || !resolutionType}
              className="px-6 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isResolving ? (
                <>
                  <ClockIcon className="h-4 w-4 animate-spin" />
                  {t('admin.resolveTicketManagement.resolveModal.resolving')}
                </>
              ) : (
                t('admin.resolveTicketManagement.resolveModal.confirm')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResolveTicketManagement;
