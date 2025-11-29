import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders } from '../../../config/api';
import { 
  UserGroupIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
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
  const { getToken } = useAuth();
  const { showSuccess } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [error, setError] = useState('');
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
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch staff list from API
  const fetchStaffList = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      
      if (!token) {
        setError('Vui lòng đăng nhập lại');
        setLoading(false);
        return;
      }

      const headers = createAuthHeaders(token);

      const response = await fetch(API_ENDPOINTS.USERS, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
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
      console.error('Error fetching staff list:', err);
      setError('Không thể tải danh sách nhân viên. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Map StaffTask enum to task ID
  const mapStaffTaskToTaskId = (staffTask) => {
    const taskMap = {
      'FORUM_REPORT': 'forum_report',
      'COMPANY_REQUEST_AND_APPROVE_ARTICLE': 'company_request',
      'APPROVE_TOUR_BOOKING': 'approve_tour'
    };
    return taskMap[staffTask] || null;
  };

  // Map task ID to StaffTask enum
  const mapTaskIdToStaffTask = (taskId) => {
    const taskMap = {
      'forum_report': 'FORUM_REPORT',
      'company_request': 'COMPANY_REQUEST_AND_APPROVE_ARTICLE',
      'approve_tour': 'APPROVE_TOUR_BOOKING'
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
    setError('Chức năng chỉnh sửa nhân viên chưa được hỗ trợ. Backend chưa có endpoint cập nhật thông tin nhân viên.');
  };

  const handleDeleteStaff = (staffId) => {
    // Note: Backend doesn't have delete endpoint
    setError('Chức năng xóa nhân viên chưa được hỗ trợ. Backend chưa có endpoint xóa nhân viên.');
  };

  const handleStatusToggle = async (staffId) => {
    try {
      const token = getToken();
      if (!token) {
        setError('Vui lòng đăng nhập lại');
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
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể cập nhật trạng thái');
      }

      // Refresh staff list
      await fetchStaffList();
      setError(''); // Clear error on success
      showSuccess(newBanStatus ? 'Đã tạm dừng nhân viên thành công' : 'Đã kích hoạt nhân viên thành công');
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái nhân viên. Vui lòng thử lại.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFormErrors({});
    
    if (!staffForm.username.trim()) {
      setFormErrors(prev => ({ ...prev, username: 'Vui lòng nhập username' }));
      return;
    }

    if (!editingStaff && !staffForm.password.trim()) {
      setFormErrors(prev => ({ ...prev, password: 'Vui lòng nhập password' }));
      return;
    }

    try {
      setSubmitting(true);
      const token = getToken();
      
      if (!token) {
        setError('Vui lòng đăng nhập lại');
        return;
      }

      // Prepare request body according to StaffCreateRequest
      const requestBody = {
        username: staffForm.username.trim(),
        password: staffForm.password.trim(),
        ...(staffForm.staffTask && { staffTask: staffForm.staffTask })
      };

      const headers = createAuthHeaders(token);

      const response = await fetch(`${BaseURL}/api/staff`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
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
      setError(''); // Clear error on success
      showSuccess('Tạo tài khoản nhân viên thành công!');
    } catch (err) {
      setError(err.message || 'Không thể tạo tài khoản nhân viên. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTask = (staff) => {
    // Note: Backend doesn't have endpoint to update staffTask after creation
    // StaffTask can only be set during staff creation
    setError('Nhiệm vụ chỉ có thể được gán khi tạo tài khoản nhân viên. Backend chưa có endpoint cập nhật nhiệm vụ sau khi tạo.');
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    // This functionality is not available as backend doesn't support updating staffTask
    setError('Chức năng này chưa được hỗ trợ. Backend chưa có endpoint cập nhật nhiệm vụ nhân viên.');
    setIsTaskModalOpen(false);
    setSelectedStaffForTask(null);
    setSelectedTasks([]);
  };

  const taskOptions = [
    { id: 'forum_report', label: 'Forum Report', icon: FlagIcon, value: 'FORUM_REPORT' },
    { id: 'company_request', label: 'Company Request + Approve Article', icon: BuildingOfficeIcon, value: 'COMPANY_REQUEST_AND_APPROVE_ARTICLE' },
    { id: 'approve_tour', label: 'Approve Tour', icon: MapPinIcon, value: 'APPROVE_TOUR_BOOKING' }
  ];

  // Filter staff list based on search and filters
  const filteredStaffList = staffList.filter(staff => {
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

  const stats = {
    total: staffList.length,
    active: staffList.filter((s) => s.status === 'active').length,
    inactive: staffList.filter((s) => s.status === 'inactive').length,
    admin: 0 // Only showing STAFF role users, so admin count is 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c9dff] mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách nhân viên...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchStaffList}
            className="px-4 py-2 bg-[#4c9dff] text-white rounded-lg hover:bg-[#3f85d6] transition-all duration-200 shadow-[0_12px_30px_rgba(76,157,255,0.35)]"
          >
            Thử lại
          </button>
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
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">Staff Management</p>
          <h1 className="text-3xl font-bold text-gray-900">View & manage your team</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý nhân viên và phân quyền truy cập hệ thống.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-300">
            <FunnelIcon className="h-5 w-5" />
            Bộ lọc nâng cao
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200">
            <ArrowDownTrayIcon className="h-5 w-5" />
            Xuất báo cáo
          </button>
          <button
            onClick={handleAddStaff}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5" />
            Thêm nhân viên
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={UserGroupIcon} label="Tổng nhân viên" value={stats.total} trend="+2 tuần này" />
        <StatCard icon={UserCircleIcon} label="Đang hoạt động" value={stats.active} trend="+1 tuần này" color="text-green-600" />
        <StatCard icon={ShieldCheckIcon} label="Quản trị viên" value={stats.admin} trend="Không đổi" color="text-purple-600" />
        <StatCard icon={XMarkIcon} label="Tạm dừng" value={stats.inactive} trend="0 thay đổi" color="text-gray-600" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, email hoặc mã nhân viên..."
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
              <option value="ALL">Tất cả vai trò</option>
              <option value="staff">Nhân viên</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm dừng</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {['Nhân viên', 'Vai trò', 'Trạng thái', 'Nhiệm vụ được giao', 'Ngày tạo', 'Thao tác'].map((header) => (
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
                    {loading ? 'Đang tải...' : 'Không tìm thấy nhân viên phù hợp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              ) : (
                filteredStaffList.map((staff) => (
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
                          <span className="text-xs text-gray-400">Chưa có</span>
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
                        <button 
                          onClick={() => handleAssignTask(staff)}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-200 transition" 
                          title="Giao nhiệm vụ (chỉ có thể gán khi tạo)"
                        >
                          <ClipboardDocumentListIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditStaff(staff)}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition" 
                          title="Chỉnh sửa (chưa hỗ trợ)"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleStatusToggle(staff.userId)}
                          className={`p-2 rounded-full border border-gray-200 transition ${
                            staff.status === 'active' 
                              ? 'text-gray-500 hover:text-red-600 hover:border-red-200' 
                              : 'text-gray-500 hover:text-green-600 hover:border-green-200'
                          }`}
                          title={staff.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
                        >
                          {staff.status === 'active' ? (
                            <XMarkIcon className="h-4 w-4" />
                          ) : (
                            <CheckIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(staff.userId)}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition" 
                          title="Xóa (chưa hỗ trợ)"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Thêm nhân viên mới
                      </h3>
                      
                      {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                          {error}
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Username <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={staffForm.username}
                            onChange={(e) => {
                              setStaffForm({...staffForm, username: e.target.value});
                              setFormErrors(prev => ({ ...prev, username: '' }));
                            }}
                            className={`mt-1 block w-full border ${formErrors.username ? 'border-red-300' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-[#4c9dff] focus:border-[#4c9dff]`}
                            placeholder="Nhập username"
                            required
                          />
                          {formErrors.username && (
                            <p className="mt-1 text-xs text-red-600">{formErrors.username}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">Username phải là duy nhất</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={staffForm.password}
                            onChange={(e) => {
                              setStaffForm({...staffForm, password: e.target.value});
                              setFormErrors(prev => ({ ...prev, password: '' }));
                            }}
                            className={`mt-1 block w-full border ${formErrors.password ? 'border-red-300' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-[#4c9dff] focus:border-[#4c9dff]`}
                            placeholder="Nhập password"
                            required
                          />
                          {formErrors.password && (
                            <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Nhiệm vụ (tùy chọn)
                          </label>
                          <select
                            value={staffForm.staffTask}
                            onChange={(e) => setStaffForm({...staffForm, staffTask: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#4c9dff] focus:border-[#4c9dff]"
                          >
                            <option value="">Không gán nhiệm vụ</option>
                            <option value="FORUM_REPORT">Forum Report</option>
                            <option value="COMPANY_REQUEST_AND_APPROVE_ARTICLE">Company Request + Approve Article</option>
                            <option value="APPROVE_TOUR_BOOKING">Approve Tour Booking</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500">Nhiệm vụ có thể được gán sau khi tạo tài khoản</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-[0_12px_30px_rgba(76,157,255,0.35)] px-4 py-2 bg-[#4c9dff] text-base font-medium text-white hover:bg-[#3f85d6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4c9dff] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {submitting ? 'Đang tạo...' : 'Tạo nhân viên'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4c9dff] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Assignment Modal */}
      {isTaskModalOpen && selectedStaffForTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsTaskModalOpen(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleTaskSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Giao nhiệm vụ cho {selectedStaffForTask.name}
                      </h3>
                      
                      <div className="space-y-3">
                        {taskOptions.map((task) => {
                          const Icon = task.icon;
                          const isSelected = selectedTasks.includes(task.id);
                          return (
                            <label
                              key={task.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                                isSelected
                                  ? 'border-[#4c9dff] bg-[#e9f2ff]'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTasks([...selectedTasks, task.id]);
                                  } else {
                                    setSelectedTasks(selectedTasks.filter(t => t !== task.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-[#4c9dff] focus:ring-[#4c9dff]"
                              />
                              <Icon className={`h-5 w-5 ${isSelected ? 'text-[#4c9dff]' : 'text-gray-400'}`} />
                              <span className={`text-sm font-medium ${isSelected ? 'text-[#2563eb]' : 'text-gray-700'}`}>
                                {task.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-[0_12px_30px_rgba(76,157,255,0.35)] px-4 py-2 bg-[#4c9dff] text-base font-medium text-white hover:bg-[#3f85d6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4c9dff] transition-all duration-200 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTaskModalOpen(false);
                      setSelectedStaffForTask(null);
                      setSelectedTasks([]);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4c9dff] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
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
  const map = status === 'active'
    ? { color: 'bg-green-100 text-green-700', label: 'Đang hoạt động' }
    : { color: 'bg-gray-100 text-gray-500', label: 'Tạm dừng' };
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      {map.label}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  const map = role === 'admin'
    ? { color: 'bg-purple-100 text-purple-700', label: 'Quản trị viên' }
    : { color: 'bg-[#bfd7ff] text-[#2563eb]', label: 'Nhân viên' };
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      {map.label}
    </span>
  );
};

export default StaffManagement;
