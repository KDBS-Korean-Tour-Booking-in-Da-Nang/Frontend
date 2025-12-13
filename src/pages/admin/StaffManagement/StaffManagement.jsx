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
  Users,
  Plus,
  Trash2,
  Eye,
  Search,
  Phone,
  Mail,
  ClipboardList,
  Flag,
  Building2,
  FileCheck,
  MapPin
} from 'lucide-react';

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
    { id: 'forum_report', label: t('admin.staffManagement.tasks.forumReport'), icon: Flag, value: 'FORUM_REPORT_AND_BOOKING_COMPLAINT' },
    { id: 'company_request', label: t('admin.staffManagement.tasks.companyRequest'), icon: Building2, value: 'COMPANY_REQUEST_AND_RESOLVE_TICKET' },
    { id: 'approve_tour', label: t('admin.staffManagement.tasks.approveTour'), icon: MapPin, value: 'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE' }
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

  const stats = useMemo(() => {
    const total = staffList.length;
    const forumReport = staffList.filter((s) => 
      s.staffTask === 'FORUM_REPORT_AND_BOOKING_COMPLAINT' && s.status === 'active'
    ).length;
    const companyRequest = staffList.filter((s) => 
      s.staffTask === 'COMPANY_REQUEST_AND_RESOLVE_TICKET' && s.status === 'active'
    ).length;
    const approveTour = staffList.filter((s) => 
      s.staffTask === 'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE' && s.status === 'active'
    ).length;
    return { total, forumReport, companyRequest, approveTour };
  }, [staffList]);

  // Chỉ hiển thị màn hình loading toàn trang khi lần load đầu tiên chưa có dữ liệu
  if (loading && staffList.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#66B3FF' }}></div>
          <p className="mt-4 text-gray-600">{t('admin.staffManagement.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && typeof error === 'string' && error !== null && (
        <div className="px-4 py-3 rounded-[24px] flex items-center justify-between border" style={{ backgroundColor: '#FFE6F0', borderColor: '#FFCCE0' }}>
          <span style={{ color: '#FF80B3' }}>{error}</span>
        </div>
      )}
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>{t('admin.staffManagement.title')}</p>
          <h1 className="text-3xl font-semibold text-gray-800">{t('admin.staffManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.staffManagement.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAddStaff}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[20px] text-sm font-semibold transition-all duration-200"
            style={{ backgroundColor: '#66B3FF', color: '#FFFFFF' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4DA3FF'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#66B3FF'}
          >
            <Plus className="h-5 w-5" strokeWidth={1.5} />
            {t('admin.staffManagement.addStaff')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t('admin.staffManagement.stats.total')} value={stats.total} trend={t('admin.staffManagement.stats.totalTrend')} />
        <StatCard icon={Flag} label={t('admin.staffManagement.stats.forumReport')} value={stats.forumReport} trend={t('admin.staffManagement.stats.forumReportTrend')} color="text-blue-600" />
        <StatCard icon={Building2} label={t('admin.staffManagement.stats.companyRequest')} value={stats.companyRequest} trend={t('admin.staffManagement.stats.companyRequestTrend')} color="text-purple-600" />
        <StatCard icon={MapPin} label={t('admin.staffManagement.stats.approveTour')} value={stats.approveTour} trend={t('admin.staffManagement.stats.approveTourTrend')} color="text-green-600" />
      </div>

      <div className="bg-white rounded-[28px] shadow-sm border" style={{ borderColor: '#F0F0F0' }}>
        <div className="flex flex-col gap-3 p-5 border-b lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: '#F0F0F0' }}>
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              placeholder={t('admin.staffManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded-[20px] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
              style={{ borderColor: '#E0E0E0' }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border rounded-[20px] px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
              style={{ borderColor: '#E0E0E0' }}
            >
              <option value="ALL">{t('admin.staffManagement.roleFilter.all')}</option>
              <option value="staff">{t('admin.staffManagement.roleFilter.staff')}</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-[20px] px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 bg-white"
              style={{ borderColor: '#E0E0E0' }}
            >
              <option value="ALL">{t('admin.staffManagement.statusFilter.all')}</option>
              <option value="active">{t('admin.staffManagement.statusFilter.active')}</option>
              <option value="inactive">{t('admin.staffManagement.statusFilter.inactive')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: '#F0F0F0' }}>
            <thead style={{ backgroundColor: '#FAFAFA' }}>
              <tr>
                {[t('admin.staffManagement.tableHeaders.staff'), t('admin.staffManagement.tableHeaders.role'), t('admin.staffManagement.tableHeaders.status'), t('admin.staffManagement.tableHeaders.assignedTasks'), t('admin.staffManagement.tableHeaders.createdAt'), t('admin.staffManagement.tableHeaders.actions')].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y" style={{ borderColor: '#F0F0F0' }}>
              {filteredStaffList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    {loading ? t('admin.staffManagement.loading') : t('admin.staffManagement.noResults')}
                  </td>
                </tr>
              ) : (
                paginatedStaffList.map((staff) => (
                  <tr key={staff.userId} className="transition" style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6F3FF'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-[20px] flex items-center justify-center text-white text-sm font-semibold border" style={{ backgroundColor: '#66B3FF', borderColor: '#4DA3FF' }}>
                          {staff.username ? staff.username.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 mb-0">{staff.username || 'N/A'}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                            {staff.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
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
                            <span key={taskId} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-[16px]" style={{ backgroundColor: '#E6F3FF', color: '#66B3FF' }}>
                              <Icon className="h-3 w-3" strokeWidth={1.5} />
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
                            className="p-2 rounded-[20px] border transition"
                            style={{ borderColor: '#E0E0E0', color: '#9CA3AF' }}
                            onMouseEnter={(e) => {
                              e.target.style.color = '#B380FF';
                              e.target.style.borderColor = '#E0CCFF';
                              e.target.style.backgroundColor = '#F0E6FF';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = '#9CA3AF';
                              e.target.style.borderColor = '#E0E0E0';
                              e.target.style.backgroundColor = 'transparent';
                            }}
                          >
                            <ClipboardList className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </Tooltip>
                        <Tooltip text={t('admin.staffManagement.actions.delete')} position="top">
                          <button 
                            onClick={() => handleDeleteStaff(staff)}
                            className="p-2 rounded-[20px] border transition"
                            style={{ borderColor: '#E0E0E0', color: '#9CA3AF' }}
                            onMouseEnter={(e) => {
                              e.target.style.color = '#FF80B3';
                              e.target.style.borderColor = '#FFCCE0';
                              e.target.style.backgroundColor = '#FFE6F0';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = '#9CA3AF';
                              e.target.style.borderColor = '#E0E0E0';
                              e.target.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
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

const StatCard = ({ icon: IconComponent, label, value, trend, color = 'text-blue-600' }) => {
  const colorMap = {
    'text-blue-600': { bg: '#E6F3FF', iconColor: '#66B3FF', textColor: '#66B3FF' },
    'text-purple-600': { bg: '#F0E6FF', iconColor: '#B380FF', textColor: '#B380FF' },
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
          <p className="text-xs font-medium" style={{ color: colors.textColor }}>{trend}</p>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const map = status === 'active'
    ? { bgColor: '#DCFCE7', textColor: '#15803D', label: t('admin.staffManagement.status.active') }
    : { bgColor: '#F5F5F5', textColor: '#9CA3AF', label: t('admin.staffManagement.status.inactive') };
  return (
    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: map.bgColor, color: map.textColor }}>
      {map.label}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  const { t } = useTranslation();
  const map = role === 'admin'
    ? { bgColor: '#F0E6FF', textColor: '#B380FF', label: t('admin.staffManagement.roles.admin') }
    : { bgColor: '#E6F3FF', textColor: '#66B3FF', label: t('admin.staffManagement.roles.staff') };
  return (
    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[20px]" style={{ backgroundColor: map.bgColor, color: map.textColor }}>
      {map.label}
    </span>
  );
};

export default StaffManagement;
