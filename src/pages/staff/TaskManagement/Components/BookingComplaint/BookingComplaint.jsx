import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { getAllComplaints, getComplaintById, resolveBookingComplaint } from '../../../../../services/bookingAPI';
import { useNavigate } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  XMarkIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const BookingComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const canManageBookingComplaints = user?.staffTask === 'FORUM_REPORT_AND_BOOKING_COMPLAINT' || user?.role === 'ADMIN';
  const isAdminOrStaff = user && (user.role === 'ADMIN' || user.role === 'STAFF');

  // Load all complaints on mount
  useEffect(() => {
    loadAllComplaints();
  }, []);

  const loadAllComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      // Auto redirect on 401 for user-initiated actions
      const data = await getAllComplaints(true);
      setAllComplaints(Array.isArray(data) ? data : []);
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading complaints:', err);
      setError(err?.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  // Filter complaints based on search and status
  const filteredComplaints = useMemo(() => {
    let filtered = [...allComplaints];

    // Filter by status
    if (filterStatus === 'pending') {
      filtered = filtered.filter((c) => !c.resolutionType);
    } else if (filterStatus === 'resolved') {
      filtered = filtered.filter((c) => c.resolutionType);
    }

    // Filter by search
    if (searchInput.trim()) {
      if (searchType === 'complaintId') {
        const id = Number(searchInput.trim());
        if (Number.isFinite(id) && id > 0) {
          filtered = filtered.filter((c) => c.complaintId === id);
        } else {
          filtered = [];
        }
      } else {
        // Search in message
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

  // Reset to first page when filters change
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
      setError('Please enter a complaint ID.');
      return;
    }
    const id = Number(trimmed);
    if (!Number.isFinite(id) || id <= 0) {
      setError('Complaint ID must be a positive number.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const complaint = await getComplaintById(id);
      if (complaint) {
        // Check if complaint already exists in list, otherwise add it
        const exists = allComplaints.some((c) => c.complaintId === complaint.complaintId);
        if (!exists) {
          setAllComplaints([...allComplaints, complaint]);
        }
        setComplaints([complaint]);
      } else {
        setComplaints([]);
        setError('Complaint not found.');
      }
    } catch (err) {
      console.error('Error fetching complaint:', err);
      setError(err?.message || 'Failed to load complaint.');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResolveModal = (complaint) => {
    if (!isAdminOrStaff) {
      setError('You do not have permission to resolve complaints.');
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
      setError('Please select a resolution type.');
      return;
    }
    try {
      setResolvingId(complaintToResolve.complaintId);
      await resolveBookingComplaint(complaintToResolve.complaintId, resolutionType, note);
      // Refresh all complaints
      await loadAllComplaints();
      handleCloseResolveModal();
    } catch (err) {
      console.error('Error resolving complaint:', err);
      setError(err?.message || 'Failed to resolve complaint.');
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

  // Check if user has permission
  if (user && !canManageBookingComplaints) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#f6f7fb] to-[#fdfdfc]">
        <div className="max-w-md w-full rounded-[32px] bg-white/90 border border-gray-200 shadow-lg p-10 text-center">
          <div className="w-16 h-16 rounded-[20px] bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-6">
            <ExclamationTriangleIcon className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Không có quyền truy cập</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Bạn không có quyền quản lý khiếu nại đặt tour. Vui lòng liên hệ admin để được phân quyền.
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
              Booking Complaint Management
            </p>
            <h1 className="text-3xl font-bold text-gray-900">Manage booking complaints</h1>
            <p className="text-sm text-gray-500 mt-1">
              View all complaints and manage resolution status for staff processing.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Total complaints"
          value={stats.total}
          color="text-amber-500"
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
          color="text-blue-600"
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
                placeholder={searchType === 'complaintId' ? 'Enter complaint ID...' : 'Search in messages...'}
                className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value);
                setSearchInput('');
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Search all</option>
              <option value="complaintId">Search by Complaint ID</option>
            </select>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">Filter by status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
          <button
            onClick={loadAllComplaints}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {searchType === 'complaintId' && searchInput.trim() && (
          <div className="mt-4">
            <button
              onClick={handleSearchById}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Search by ID'}
            </button>
          </div>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      {/* Complaints table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Complaints {filteredComplaints.length > 0 && `(${filteredComplaints.length})`}
            </h2>
            <p className="text-sm text-gray-500">
              {allComplaints.length > 0
                ? `Showing ${paginatedComplaints.length} of ${filteredComplaints.length} filtered complaints (${allComplaints.length} total)`
                : 'No complaints found'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {['ID', 'Message', 'Created at', 'Resolution', 'Resolved at', 'Action'].map((header) => (
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
              {paginatedComplaints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                    {loading
                      ? 'Loading complaints...'
                      : allComplaints.length === 0
                      ? 'No complaints found.'
                      : 'No complaints match your search criteria.'}
                  </td>
                </tr>
              ) : (
                paginatedComplaints.map((complaint, index) => (
                  <tr key={complaint.complaintId} className="hover:bg-[#e9f2ff]/40 transition">
                    <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
                      #{complaint.complaintId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
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
                        <button
                          type="button"
                          onClick={() => handleViewDetail(complaint)}
                          className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-all duration-200"
                          title="View details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {complaint.resolutionType ? (
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700">
                            Resolved
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenResolveModal(complaint)}
                            disabled={resolvingId === complaint.complaintId || !isAdminOrStaff}
                            className="p-2 rounded-lg bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                            title="Resolve complaint"
                          >
                            {resolvingId === complaint.complaintId ? (
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
        {filteredComplaints.length > itemsPerPage && (
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

const ResolutionBadge = ({ resolutionType }) => {
  if (!resolutionType) {
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700">
        Pending
      </span>
    );
  }

  const map = {
    COMPANY_FAULT: { color: 'bg-red-100 text-red-700', label: 'Company fault' },
    USER_FAULT: { color: 'bg-blue-100 text-blue-700', label: 'User fault' },
    NO_FAULT: { color: 'bg-green-100 text-green-700', label: 'No fault' },
  };

  const cfg = map[resolutionType] || { color: 'bg-gray-100 text-gray-700', label: resolutionType };

  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

const ComplaintDetailModal = ({ complaint, onClose }) => {
  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    try {
      return new Date(value).toLocaleString();
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
              <h2 className="text-2xl font-bold text-gray-900">Complaint Details</h2>
              <p className="text-sm text-gray-500 mt-1">Complaint ID: #{complaint.complaintId}</p>
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
            {/* Message Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Message
              </label>
              <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {complaint.message || 'N/A'}
                </p>
              </div>
            </div>

            {/* Status Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Status
                </label>
                <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                  <ResolutionBadge resolutionType={complaint.resolutionType} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Created At
                </label>
                <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                  <p className="text-sm text-gray-700">{formatDateTime(complaint.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Resolved Information */}
            {complaint.resolutionType && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Resolved At
                </label>
                <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                  <p className="text-sm text-gray-700">{formatDateTime(complaint.resolvedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all duration-200"
            >
              Close
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
  const resolutionOptions = [
    {
      value: 'NO_FAULT',
      label: 'No Fault',
      description: 'Neither party is at fault. Booking status will change to SUCCESS.',
      color: 'bg-green-50 text-green-700 border-green-200'
    },
    {
      value: 'USER_FAULT',
      label: 'User Fault',
      description: 'User is at fault. Booking status will change to SUCCESS.',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      value: 'COMPANY_FAULT',
      label: 'Company Fault',
      description: 'Company is at fault. Booking status remains UNDER_COMPLAINT.',
      color: 'bg-red-50 text-red-700 border-red-200'
    }
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
              <h2 className="text-2xl font-bold text-gray-900">Resolve Complaint</h2>
              <p className="text-sm text-gray-500 mt-1">Complaint ID: #{complaint.complaintId}</p>
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
            {/* Complaint Message Preview */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Complaint Message
              </label>
              <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {complaint.message || 'N/A'}
                </p>
              </div>
            </div>

            {/* Resolution Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Resolution Type <span className="text-red-500">*</span>
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
                Resolution Note (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Add any additional notes or comments about this resolution..."
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
              Cancel
            </button>
            <button
              onClick={onResolve}
              disabled={isResolving || !resolutionType}
              className="px-6 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isResolving ? (
                <>
                  <ClockIcon className="h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                'Confirm Resolution'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingComplaint;
