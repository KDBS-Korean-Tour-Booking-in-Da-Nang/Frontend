import { useState } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  TicketIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

const ResolveTicket = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const canManageResolveTicket = user?.staffTask === 'COMPANY_REQUEST_AND_RESOLVE_TICKET' || user?.role === 'ADMIN';
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'resolved'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Placeholder data - will be replaced with actual API calls
  const [tickets] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

  const stats = {
    total: 0,
    resolved: 0,
    pending: 0,
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus === 'pending') {
      return !ticket.resolved;
    } else if (filterStatus === 'resolved') {
      return ticket.resolved;
    }
    return true;
  });

  const paginatedTickets = filteredTickets.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    try {
      // Handle different field names (createdAt, created_at, createAt)
      const dateValue = value.createdAt || value.created_at || value.createAt || value;
      if (!dateValue) return 'N/A';
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  // Check if user has permission
  if (user && !canManageResolveTicket) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#f6f7fb] to-[#fdfdfc]">
        <div className="max-w-md w-full rounded-[32px] bg-white/90 border border-gray-200 shadow-lg p-10 text-center">
          <div className="w-16 h-16 rounded-[20px] bg-purple-100 flex items-center justify-center text-purple-600 mx-auto mb-6">
            <ExclamationTriangleIcon className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Không có quyền truy cập</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Bạn không có quyền quản lý resolve ticket. Vui lòng liên hệ admin để được phân quyền.
          </p>
          <button
            onClick={() => navigate('/staff/tasks')}
            className="w-full px-6 py-3 rounded-[24px] text-sm font-semibold text-white bg-[#4c9dff] hover:bg-[#3f85d6] transition-all shadow-[0_12px_30px_rgba(76,157,255,0.35)]"
          >
            Quay lại Task Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/staff/tasks')}
            className="p-2 rounded-xl bg-white/80 hover:bg-gray-100 text-gray-600 hover:text-gray-700 transition-all duration-200"
            title="Back to tasks"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">
              Resolve Ticket Management
            </p>
            <h1 className="text-3xl font-bold text-gray-900">Manage Support Tickets</h1>
            <p className="text-sm text-gray-500 mt-1">
              View and resolve support tickets. This feature is coming soon.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={TicketIcon}
          label="Total tickets"
          value={stats.total}
          color="text-blue-500"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Resolved"
          value={stats.resolved}
          color="text-green-600"
        />
        <StatCard
          icon={ClockIcon}
          label="Pending"
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
                placeholder="Search tickets..."
                className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">Filter by status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>
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
              {tickets.length > 0
                ? `Showing ${paginatedTickets.length} of ${filteredTickets.length} filtered tickets (${tickets.length} total)`
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
                        <p className="text-lg font-semibold text-gray-700">No tickets available</p>
                        <p className="text-sm text-gray-500 mt-1">
                          This feature is under development. Support ticket management will be available soon.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-[#e9f2ff]/40 transition">
                    <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
                      #{ticket.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ticket.subject || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateTime(ticket.createdAt || ticket.created_at || ticket.createAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700">
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {ticket.priority || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled
                          className="p-2 rounded-full border border-gray-200 text-gray-400 cursor-not-allowed transition-all duration-200"
                          title="Resolve ticket (Coming soon)"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Navigate to Customer Contact and open chat with user
                            if (ticket.userId) {
                              navigate(`/staff/contact?userId=${ticket.userId}`);
                            }
                          }}
                          disabled={!ticket.userId}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                          title={ticket.userId ? "Message user" : "User ID not available"}
                        >
                          <ChatBubbleLeftRightIcon className="h-4 w-4" />
                        </button>
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
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage + 1} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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

export default ResolveTicket;
