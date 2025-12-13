import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import AssignTaskModal from './AssignTaskModal';
import AddStaffModal from './AddStaffModal';
import DeleteConfirmModal from '../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import Pagination from '../Pagination';
import { Tooltip } from '../../../components';
import { 
  UserGroupIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClipboardDocumentListIcon,
  FlagIcon,
  BuildingOfficeIcon,
  DocumentCheckIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const StaffManagement = () => {
  const { t, i18n } = useTranslation();
  const { getToken } = useAuth();
  const { showSuccess } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [staffForm, setStaffForm] = useState({
    username: '',
    password: '',
    staffTask: ''
  });
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedStaffForTask, setSelectedStaffForTask] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

  // Fetch staff list from API
  const fetchStaffList = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      
      if (!token) {
        setError(t('common.errors.loginRequired'));
        setLoading(false);
        return;
      }

      const headers = createAuthHeaders(token);

      const response = await fetch(API_ENDPOINTS.USERS, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          await checkAndHandle401(response);
          setError(t('common.errors.sessionExpired'));
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const users = data.result || data || [];
      
      // Filter users with role STAFF
      const staffUsers = users.filter(user => {
        const role = (user.role || '').toUpperCase();
        return role === 'STAFF';
      });

      // Map backend data to frontend format
      const mappedStaff = staffUsers.map(user => {
        // Format createdAt properly to avoid timezone issues
        // Backend returns LocalDateTime which is serialized as string
        let formattedDate = '';
        let rawDate = null;
        
        // Try different possible field names and formats
        const dateValue = user.createdAt || user.created_at || user.createAt;
        
        if (dateValue) {
          try {
            // Parse the date - handle both ISO string and other formats
            const date = new Date(dateValue);
            
            // Check if date is valid
            if (!isNaN(date.getTime())) {
              rawDate = dateValue;
              // Get local date components to avoid timezone shift
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              formattedDate = `${year}-${month}-${day}`;
            }
          } catch (e) {
            // Date parsing failed, continue without date
          }
        }
        
        return {
          id: user.userId,
          userId: user.userId,
          username: user.username,
          email: user.email || '',
          name: user.username, // Use username as name for display
          role: (user.role || '').toLowerCase(),
          status: (user.status || '').toUpperCase() === 'BANNED' ? 'inactive' : 'active',
          createdAt: formattedDate,
          createdAtRaw: rawDate, // Keep raw date for proper formatting
          staffTask: user.staffTask || null,
          assignedTasks: user.staffTask ? [mapStaffTaskToTaskId(user.staffTask)] : []
        };
      });

      setStaffList(mappedStaff);
    } catch (err) {
      // Silently handle error fetching staff list
      setError(t('admin.staffManagement.error'));
    } finally {
      setLoading(false);
    }
  };

  // Map StaffTask enum to task ID
  const mapStaffTaskToTaskId = (staffTask) => {
    const taskMap = {
      'FORUM_REPORT_AND_BOOKING_COMPLAINT': 'forum_report',
      'COMPANY_REQUEST_AND_RESOLVE_TICKET': 'company_request',
      'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE': 'approve_tour'
    };
    return taskMap[staffTask] || null;
  };

  // Map task ID to StaffTask enum
  const mapTaskIdToStaffTask = (taskId) => {
    const taskMap = {
      'forum_report': 'FORUM_REPORT_AND_BOOKING_COMPLAINT',
      'company_request': 'COMPANY_REQUEST_AND_RESOLVE_TICKET',
      'approve_tour': 'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE'
    };
    return taskMap[taskId] || null;
  };

  useEffect(() => {
    fetchStaffList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({ username: '', password: '', staffTask: '' });
    setIsModalOpen(true);
  };

  const handleEditStaff = (staff) => {
    // Note: Backend doesn't have update endpoint, so we'll disable edit for now
    // or show a message that edit is not available
    setError(t('admin.staffManagement.editNotSupported'));
  };

  const handleDeleteStaff = (staff) => {
    setStaffToDelete(staff);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;

    try {
      const token = getToken();
      if (!token) {
        setError(t('common.errors.loginRequired'));
        setIsDeleteModalOpen(false);
        return;
      }

      const headers = createAuthHeaders(token);

      const response = await fetch(`${BaseURL}/api/staff/${staffToDelete.userId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          await checkAndHandle401(response);
          setError(t('common.errors.sessionExpired'));
          setIsDeleteModalOpen(false);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể xóa nhân viên');
      }

      // Refresh staff list
      await fetchStaffList();
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
      setError(''); // Clear error on success
      showSuccess(t('admin.staffManagement.deleteSuccess'));
    } catch (err) {
      // Silently handle error deleting staff
      setError(err.message || t('admin.staffManagement.deleteError'));
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
    }
  };

  const handleStatusToggle = async (staffId) => {
    try {
      const token = getToken();
      if (!token) {
        setError(t('common.errors.loginRequired'));
        return;
      }

      const staff = staffList.find(s => s.userId === staffId);
      if (!staff) return;

      const isCurrentlyBanned = staff.status === 'inactive';
      const newBanStatus = !isCurrentlyBanned;

      const headers = createAuthHeaders(token);

      const response = await fetch(`${BaseURL}/api/staff/ban-user/${staffId}?ban=${newBanStatus}`, {
        method: 'PUT',
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          await checkAndHandle401(response);
          setError(t('common.errors.sessionExpired'));
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể cập nhật trạng thái');
      }

      // Refresh staff list
      await fetchStaffList();
      setError(''); // Clear error on success
      showSuccess(newBanStatus ? t('admin.staffManagement.banSuccess') : t('admin.staffManagement.unbanSuccess'));
    } catch (err) {
      setError(err.message || t('admin.staffManagement.statusError'));
    }
  };

  const handleSubmitStaff = async (formData) => {
    setModalError('');
    setFormErrors({});

    try {
      setSubmitting(true);
      const token = getToken();
      
      if (!token) {
        setModalError(t('common.errors.loginRequired'));
        return;
      }

      // Prepare request body according to StaffCreateRequest
      const requestBody = {
        username: formData.username.trim(),
        password: formData.password.trim(),
        ...(formData.staffTask && { staffTask: formData.staffTask })
      };

      const headers = createAuthHeaders(token);

      const response = await fetch(`${BaseURL}/api/staff`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          await checkAndHandle401(response);
          setModalError(t('common.errors.sessionExpired'));
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tạo tài khoản nhân viên');
      }

      const data = await response.json();
      
      // Refresh staff list
      await fetchStaffList();
      setIsModalOpen(false);
      setStaffForm({ username: '', password: '', staffTask: '' });
      setModalError(''); // Clear modal error on success
      showSuccess(t('admin.addStaffModal.createSuccess'));
    } catch (err) {
      setModalError(err.message || t('admin.addStaffModal.createError'));
      throw err; // Re-throw to let modal handle it
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTask = (staff) => {
    setSelectedStaffForTask(staff);
    setIsTaskModalOpen(true);
  };

  const handleTaskConfirm = async (selectedTask) => {
    if (!selectedStaffForTask) return;

    try {
      const token = getToken();
      if (!token) {
        setError(t('common.errors.loginRequired'));
        return;
      }

      const headers = createAuthHeaders(token);

      // Prepare request body according to StaffTaskUpdateRequest
      // Backend expects: { username: string, staffTask: StaffTask | null }
      const requestBody = {
        username: selectedStaffForTask.username,
        staffTask: selectedTask || null // null means no task assigned
      };

      const response = await fetch(`${BaseURL}/api/staff/staffTask`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          await checkAndHandle401(response);
          setError(t('common.errors.sessionExpired'));
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể cập nhật nhiệm vụ');
      }

      // Refresh staff list
      await fetchStaffList();
      setError(''); // Clear error on success
      showSuccess(t('admin.assignTaskModal.updateSuccess'));
    } catch (err) {
      // Silently handle error updating staff task
      setError(err.message || t('admin.assignTaskModal.updateError'));
      throw err; // Re-throw to let modal handle it
    }
  };

  const taskOptions = [
    { id: 'forum_report', label: t('admin.staffManagement.tasks.forumReport'), icon: FlagIcon, value: 'FORUM_REPORT_AND_BOOKING_COMPLAINT' },
    { id: 'company_request', label: t('admin.staffManagement.tasks.companyRequest'), icon: BuildingOfficeIcon, value: 'COMPANY_REQUEST_AND_RESOLVE_TICKET' },
    { id: 'approve_tour', label: t('admin.staffManagement.tasks.approveTour'), icon: MapPinIcon, value: 'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE' }
  ];

  // Filter staff list based on search and filters
  const filteredStaffList = useMemo(() => {
    return staffList.filter(staff => {
    // Search filter
    const matchesSearch = !searchTerm || 
      staff.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.userId?.toString().includes(searchTerm);
    
    // Role filter
    const matchesRole = roleFilter === 'ALL' || staff.role === roleFilter.toLowerCase();
    
    // Status filter
    const matchesStatus = statusFilter === 'ALL' || staff.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });
  }, [staffList, searchTerm, roleFilter, statusFilter]);

  // Pagination
  const paginatedStaffList = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredStaffList.slice(startIndex, endIndex);
  }, [filteredStaffList, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredStaffList.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, roleFilter, statusFilter]);

  const stats = {
    total: staffList.length,
    active: staffList.filter((s) => s.status === 'active').length,
    inactive: staffList.filter((s) => s.status === 'inactive').length,
    admin: 0 // Only showing STAFF role users, so admin count is 0
  };

  // Chỉ hiển thị màn hình loading toàn trang khi lần load đầu tiên chưa có dữ liệu
  if (loading && staffList.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c9dff] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('admin.staffManagement.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && typeof error === 'string' && error !== null && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">{t('admin.staffManagement.title')}</p>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.staffManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.staffManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchStaffList}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </button>
          <button
            onClick={handleAddStaff}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5" />
            {t('admin.staffManagement.addStaff')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={UserGroupIcon} label={t('admin.staffManagement.stats.total')} value={stats.total} trend={t('admin.staffManagement.stats.totalTrend')} />
        <StatCard icon={UserCircleIcon} label={t('admin.staffManagement.stats.active')} value={stats.active} trend={t('admin.staffManagement.stats.activeTrend')} color="text-green-600" />
        <StatCard icon={ShieldCheckIcon} label={t('admin.staffManagement.stats.admin')} value={stats.admin} trend={t('admin.staffManagement.stats.adminTrend')} color="text-purple-600" />
        <StatCard icon={XMarkIcon} label={t('admin.staffManagement.stats.inactive')} value={stats.inactive} trend={t('admin.staffManagement.stats.inactiveTrend')} color="text-gray-600" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin.staffManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">{t('admin.staffManagement.roleFilter.all')}</option>
              <option value="staff">{t('admin.staffManagement.roleFilter.staff')}</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">{t('admin.staffManagement.statusFilter.all')}</option>
              <option value="active">{t('admin.staffManagement.statusFilter.active')}</option>
              <option value="inactive">{t('admin.staffManagement.statusFilter.inactive')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {[t('admin.staffManagement.tableHeaders.staff'), t('admin.staffManagement.tableHeaders.role'), t('admin.staffManagement.tableHeaders.status'), t('admin.staffManagement.tableHeaders.assignedTasks'), t('admin.staffManagement.tableHeaders.createdAt'), t('admin.staffManagement.tableHeaders.actions')].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredStaffList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    {loading ? t('admin.staffManagement.loading') : t('admin.staffManagement.noResults')}
                  </td>
                </tr>
              ) : (
                paginatedStaffList.map((staff) => (
                  <tr key={staff.userId} className="hover:bg-[#e9f2ff]/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-[#4c9dff] flex items-center justify-center text-white text-sm font-medium border border-gray-100">
                          {staff.username ? staff.username.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 mb-0">{staff.username || 'N/A'}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                            {staff.email && (
                              <span className="inline-flex items-center gap-1">
                                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                                {staff.email}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                            <span>ID: {staff.userId}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={staff.role} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={staff.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(staff.assignedTasks || []).map((taskId) => {
                          const task = taskOptions.find(t => t.id === taskId);
                          if (!task) return null;
                          const Icon = task.icon;
                          return (
                            <span key={taskId} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#e9f2ff] text-[#2563eb] rounded-full">
                              <Icon className="h-3 w-3" />
                              {task.label}
                            </span>
                          );
                        })}
                        {(!staff.assignedTasks || staff.assignedTasks.length === 0) && (
                          <span className="text-xs text-gray-400">{t('admin.staffManagement.tasks.none')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {staff.createdAtRaw ? (() => {
                        try {
                          const date = new Date(staff.createdAtRaw);
                          // Check if date is valid
                          if (isNaN(date.getTime())) {
                            // If invalid, try to parse from createdAt string format
                            if (staff.createdAt) {
                              const parts = staff.createdAt.split('-');
                              if (parts.length === 3) {
                                return `${parts[2]}/${parts[1]}/${parts[0]}`;
                              }
                            }
                            return 'N/A';
                          }
                          // Format date in local timezone to avoid timezone shift
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        } catch (e) {
                          // Fallback to formatted createdAt if available
                          if (staff.createdAt) {
                            const parts = staff.createdAt.split('-');
                            if (parts.length === 3) {
                              return `${parts[2]}/${parts[1]}/${parts[0]}`;
                            }
                          }
                          return 'N/A';
                        }
                      })() : (staff.createdAt ? (() => {
                        // Fallback: use createdAt if createdAtRaw is not available
                        const parts = staff.createdAt.split('-');
                        if (parts.length === 3) {
                          return `${parts[2]}/${parts[1]}/${parts[0]}`;
                        }
                        return 'N/A';
                      })() : 'N/A')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tooltip text={t('admin.staffManagement.actions.assignTask')} position="top">
                          <button 
                            onClick={() => handleAssignTask(staff)}
                            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-200 transition"
                          >
                            <ClipboardDocumentListIcon className="h-4 w-4" />
                          </button>
                        </Tooltip>
                        <Tooltip text={t('admin.staffManagement.actions.delete')} position="top">
                          <button 
                            onClick={() => handleDeleteStaff(staff)}
                            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredStaffList.length >= 10 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredStaffList.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Staff Modal */}
      <AddStaffModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setStaffForm({ username: '', password: '', staffTask: '' });
          setModalError('');
          setFormErrors({});
        }}
        onSubmit={handleSubmitStaff}
        submitting={submitting}
        error={modalError}
        formErrors={formErrors}
      />

      {/* Task Assignment Modal */}
      <AssignTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
                      setIsTaskModalOpen(false);
                      setSelectedStaffForTask(null);
        }}
        staff={selectedStaffForTask}
        onConfirm={handleTaskConfirm}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setStaffToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete staff"
        message={t('admin.staffManagement.deleteConfirm.message', { name: staffToDelete?.username })}
        itemName={staffToDelete?.username}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
      />
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
  const { t } = useTranslation();
  const map = status === 'active'
    ? { color: 'bg-green-100 text-green-700', label: t('admin.staffManagement.status.active') }
    : { color: 'bg-gray-100 text-gray-500', label: t('admin.staffManagement.status.inactive') };
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      {map.label}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  const { t } = useTranslation();
  const map = role === 'admin'
    ? { color: 'bg-purple-100 text-purple-700', label: t('admin.staffManagement.roles.admin') }
    : { color: 'bg-[#bfd7ff] text-[#2563eb]', label: t('admin.staffManagement.roles.staff') };
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      {map.label}
    </span>
  );
};

export default StaffManagement;
