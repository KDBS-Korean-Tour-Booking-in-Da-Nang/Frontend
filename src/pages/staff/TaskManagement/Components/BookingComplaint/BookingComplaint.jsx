import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { getAllComplaints, getComplaintById, resolveBookingComplaint } from '../../../../../services/bookingAPI';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  X,
  ArrowLeft,
} from 'lucide-react';

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

  // Load tất cả complaints khi mount: gọi loadAllComplaints
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
      setError(err?.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  // Filter complaints dựa trên search và status: filter theo status (all, pending, resolved), filter theo search (complaintId hoặc message), return filtered complaints array
  const filteredComplaints = useMemo(() => {
    let filtered = [...allComplaints];

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

  // Pagination: slice filteredComplaints theo currentPage và itemsPerPage, return paginated complaints array
  const paginatedComplaints = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredComplaints.slice(startIndex, endIndex);
  }, [filteredComplaints, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);

  // Reset về page đầu tiên khi filters thay đổi: set currentPage = 0 khi searchInput, searchType, hoặc filterStatus thay đổi
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
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="max-w-md w-full rounded-[32px] bg-white border p-10 text-center shadow-sm" style={{ borderColor: '#F0F0F0' }}>
          <div className="w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#FFE6F0' }}>
            <AlertTriangle className="h-7 w-7" style={{ color: '#FF80B3' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">Không có quyền truy cập</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Bạn không có quyền quản lý khiếu nại đặt tour. Vui lòng liên hệ admin để được phân quyền.
          </p>
          <button
            onClick={() => navigate('/staff/tasks')}
            className="w-full px-6 py-3 rounded-[24px] text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: '#66B3FF' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4DA3FF'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#66B3FF'}
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
            className="p-2 rounded-[20px] transition-all duration-200"
            style={{ backgroundColor: '#F5F5F5', color: '#9CA3AF' }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#E5E5E5';
              e.target.style.color = '#6B7280';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#F5F5F5';
              e.target.style.color = '#9CA3AF';
            }}
            title="Back to tasks"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>
              Booking Complaint Management
            </p>
            <h1 className="text-3xl font-semibold text-gray-800">Manage booking complaints</h1>
            <p className="text-sm text-gray-500 mt-1">
              View all complaints and manage resolution status for staff processing.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={AlertTriangle}
          label="Total complaints"
          value={stats.total}
          color="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={stats.resolved}
          color="green"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          color="blue"
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
                placeholder={searchType === 'complaintId' ? 'Enter complaint ID...' : 'Search in messages...'}
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
              <option value="all">Search all</option>
              <option value="complaintId">Search by Complaint ID</option>
            </select>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">Filter by status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded-[20px] px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
                style={{ borderColor: '#E0E0E0' }}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>
        {searchType === 'complaintId' && searchInput.trim() && (
          <div className="mt-4">
            <button
              onClick={handleSearchById}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-[20px] text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#66B3FF' }}
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
              {loading ? 'Loading...' : 'Search by ID'}
            </button>
          </div>
        )}
        {error && (
          <p className="mt-3 px-4 py-2 rounded-[20px] text-sm" style={{ backgroundColor: '#FFE6F0', borderColor: '#FFB3B3', color: '#FF80B3', borderWidth: '1px', borderStyle: 'solid' }}>
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
                ? `Showing ${paginatedComplaints.length} of ${filteredComplaints.length} filtered complaints (${allComplaints.length} total)`
                : 'No complaints found'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: '#F0F0F0' }}>
            <thead style={{ backgroundColor: '#FAFAFA' }}>
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
            <tbody className="bg-white divide-y" style={{ borderColor: '#F0F0F0' }}>
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
                        <button
                          type="button"
                          onClick={() => handleViewDetail(complaint)}
                          className="p-2 rounded-[20px] transition-all duration-200"
                          style={{ backgroundColor: '#F5F5F5', color: '#9CA3AF' }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#E6F3FF';
                            e.target.style.color = '#66B3FF';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#F5F5F5';
                            e.target.style.color = '#9CA3AF';
                          }}
                          title="View details"
                        >
                          <Eye className="h-5 w-5" strokeWidth={1.5} />
                        </button>
                        {complaint.resolutionType ? (
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
                            Resolved
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenResolveModal(complaint)}
                            disabled={resolvingId === complaint.complaintId || !isAdminOrStaff}
                            className="p-2 rounded-[20px] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ backgroundColor: '#F5F5F5', color: '#9CA3AF' }}
                            onMouseEnter={(e) => {
                              if (!e.target.disabled) {
                                e.target.style.backgroundColor = '#DCFCE7';
                                e.target.style.color = '#15803D';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!e.target.disabled) {
                                e.target.style.backgroundColor = '#F5F5F5';
                                e.target.style.color = '#9CA3AF';
                              }
                            }}
                            title="Resolve complaint"
                          >
                            {resolvingId === complaint.complaintId ? (
                              <Clock className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                            ) : (
                              <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
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
          <div className="px-6 py-4 border-t" style={{ borderColor: '#F0F0F0' }}>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage + 1} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-[20px] disabled:opacity-50 disabled:cursor-not-allowed transition"
                  style={{ borderColor: '#E0E0E0' }}
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
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-[20px] disabled:opacity-50 disabled:cursor-not-allowed transition"
                  style={{ borderColor: '#E0E0E0' }}
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

const StatCard = ({ icon: IconComponent, label, value, color = 'blue' }) => {
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
        </div>
      </div>
    </div>
  );
};

const ResolutionBadge = ({ resolutionType }) => {
  if (!resolutionType) {
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: '#FFF4E6', color: '#FFB84D' }}>
        Pending
      </span>
    );
  }

  const map = {
    COMPANY_FAULT: { bgColor: '#FFE6F0', textColor: '#FF80B3', label: 'Company fault' },
    USER_FAULT: { bgColor: '#E6F3FF', textColor: '#66B3FF', label: 'User fault' },
    NO_FAULT: { bgColor: '#DCFCE7', textColor: '#15803D', label: 'No fault' },
  };

  const cfg = map[resolutionType] || { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: resolutionType };

  return (
    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: cfg.bgColor, color: cfg.textColor }}>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border"
        style={{ borderColor: '#F0F0F0' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between" style={{ backgroundColor: '#E6F3FF', borderColor: '#CCE6FF' }}>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Complaint Details</h2>
            <p className="text-sm mt-1" style={{ color: '#66B3FF' }}>Complaint ID: #{complaint.complaintId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[20px] transition-all duration-200"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#F5F5F5';
              e.target.style.color = '#6B7280';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#9CA3AF';
            }}
            title="Close"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="space-y-6">
            {/* Message Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Message
              </label>
              <div className="p-4 rounded-[20px] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' }}>
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
                <div className="p-3 rounded-[20px] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' }}>
                  <ResolutionBadge resolutionType={complaint.resolutionType} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Created At
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
                  Resolved At
                </label>
                <div className="p-3 rounded-[20px] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' }}>
                  <p className="text-sm text-gray-700">{formatDateTime(complaint.resolvedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ backgroundColor: '#FAFAFA', borderColor: '#F0F0F0' }}>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-[20px] text-white text-sm font-semibold transition-all duration-200"
              style={{ backgroundColor: '#66B3FF' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#4DA3FF'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#66B3FF'}
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border"
        style={{ borderColor: '#F0F0F0' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between" style={{ backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }}>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Resolve Complaint</h2>
            <p className="text-sm mt-1" style={{ color: '#15803D' }}>Complaint ID: #{complaint.complaintId}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isResolving}
            className="p-2 rounded-[20px] transition-all duration-200 disabled:opacity-50"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.backgroundColor = '#F5F5F5';
                e.target.style.color = '#6B7280';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.target.disabled) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#9CA3AF';
              }
            }}
            title="Close"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1" style={{ backgroundColor: '#FAFAFA' }}>
          <div className="space-y-6">
            {/* Complaint Message Preview */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Complaint Message
              </label>
              <div className="p-4 rounded-[20px] border" style={{ backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' }}>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {complaint.message || 'N/A'}
                </p>
              </div>
            </div>

            {/* Resolution Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Resolution Type <span style={{ color: '#FF80B3' }}>*</span>
              </label>
              <div className="space-y-2">
                {resolutionOptions.map((option) => {
                  const isSelected = resolutionType === option.value;
                  const colorMap = {
                    'NO_FAULT': { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' },
                    'USER_FAULT': { bg: '#E6F3FF', text: '#66B3FF', border: '#CCE6FF' },
                    'COMPANY_FAULT': { bg: '#FFE6F0', text: '#FF80B3', border: '#FFB3B3' }
                  };
                  const colors = colorMap[option.value] || { bg: '#F5F5F5', text: '#9CA3AF', border: '#E0E0E0' };
                  
                  return (
                    <label
                      key={option.value}
                      className="flex items-start p-4 rounded-[20px] border-2 cursor-pointer transition-all duration-200"
                      style={isSelected
                        ? { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }
                        : { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0' }
                      }
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.target.style.borderColor = '#D0D0D0';
                          e.target.style.backgroundColor = '#F5F5F5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.target.style.borderColor = '#E0E0E0';
                          e.target.style.backgroundColor = '#FFFFFF';
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name="resolutionType"
                        value={option.value}
                        checked={resolutionType === option.value}
                        onChange={(e) => setResolutionType(e.target.value)}
                        className="mt-0.5 mr-3 h-4 w-4"
                        style={{ accentColor: '#66B3FF' }}
                        disabled={isResolving}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-sm" style={{ color: isSelected ? colors.text : '#4B5563' }}>{option.label}</div>
                        <div className="text-xs mt-1" style={{ color: isSelected ? colors.text : '#6B7280', opacity: 0.8 }}>{option.description}</div>
                      </div>
                    </label>
                  );
                })}
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
                className="w-full border rounded-[20px] px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ backgroundColor: '#FAFAFA', borderColor: '#F0F0F0' }}>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isResolving}
              className="px-6 py-2.5 rounded-[20px] text-gray-700 text-sm font-semibold transition-all duration-200 disabled:opacity-50"
              style={{ backgroundColor: '#F5F5F5', border: '1px solid #E0E0E0' }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = '#E5E5E5';
                  e.target.style.borderColor = '#D0D0D0';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = '#F5F5F5';
                  e.target.style.borderColor = '#E0E0E0';
                }
              }}
            >
              Cancel
            </button>
            <button
              onClick={onResolve}
              disabled={isResolving || !resolutionType}
              className="px-6 py-2.5 rounded-[20px] text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: '#15803D' }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = '#16A34A';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = '#15803D';
                }
              }}
            >
              {isResolving ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" strokeWidth={1.5} />
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
