import { useState } from 'react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    role: 'staff',
    status: 'active'
  });

  const [staffList, setStaffList] = useState([
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@company.com',
      role: 'admin',
      status: 'active',
      createdAt: '2024-01-15',
      lastLogin: '2024-01-20',
      assignedTasks: ['forum_report', 'approve_tour']
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      role: 'staff',
      status: 'active',
      createdAt: '2024-01-10',
      lastLogin: '2024-01-19',
      assignedTasks: ['company_request', 'approve_article']
    },
    {
      id: 3,
      name: 'Mike Johnson',
      email: 'mike.johnson@company.com',
      role: 'staff',
      status: 'inactive',
      createdAt: '2024-01-05',
      lastLogin: '2024-01-15',
      assignedTasks: ['forum_report']
    }
  ]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedStaffForTask, setSelectedStaffForTask] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState([]);

  const handleAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({ name: '', email: '', role: 'staff', status: 'active' });
    setIsModalOpen(true);
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setStaffForm({
      name: staff.name,
      email: staff.email,
      role: staff.role,
      status: staff.status
    });
    setIsModalOpen(true);
  };

  const handleDeleteStaff = (staffId) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      setStaffList(staffList.filter(staff => staff.id !== staffId));
    }
  };

  const handleStatusToggle = (staffId) => {
    setStaffList(staffList.map(staff => 
      staff.id === staffId 
        ? { ...staff, status: staff.status === 'active' ? 'inactive' : 'active' }
        : staff
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingStaff) {
      setStaffList(staffList.map(staff => 
        staff.id === editingStaff.id 
          ? { ...staff, ...staffForm, assignedTasks: staff.assignedTasks || [] }
          : staff
      ));
    } else {
      const newStaff = {
        id: Date.now(),
        ...staffForm,
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString().split('T')[0],
        assignedTasks: []
      };
      setStaffList([...staffList, newStaff]);
    }
    setIsModalOpen(false);
  };

  const handleAssignTask = (staff) => {
    setSelectedStaffForTask(staff);
    setSelectedTasks(staff.assignedTasks || []);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    setStaffList(staffList.map(staff => 
      staff.id === selectedStaffForTask.id 
        ? { ...staff, assignedTasks: selectedTasks }
        : staff
    ));
    setIsTaskModalOpen(false);
    setSelectedStaffForTask(null);
    setSelectedTasks([]);
  };

  const taskOptions = [
    { id: 'forum_report', label: 'Forum Report', icon: FlagIcon },
    { id: 'company_request', label: 'Company Request + Approve Article', icon: BuildingOfficeIcon },
    { id: 'approve_tour', label: 'Approve Tour', icon: MapPinIcon }
  ];

  const stats = {
    total: staffList.length,
    active: staffList.filter((s) => s.status === 'active').length,
    inactive: staffList.filter((s) => s.status === 'inactive').length,
    admin: staffList.filter((s) => s.role === 'admin').length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-500 font-semibold mb-2">Staff Management</p>
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
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow hover:bg-blue-700">
            <ArrowDownTrayIcon className="h-5 w-5" />
            Xuất báo cáo
          </button>
          <button
            onClick={handleAddStaff}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow hover:bg-blue-700"
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
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="ALL">Tất cả vai trò</option>
              <option value="admin">Quản trị viên</option>
              <option value="staff">Nhân viên</option>
            </select>
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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
                {['Nhân viên', 'Vai trò', 'Trạng thái', 'Nhiệm vụ được giao', 'Lần đăng nhập gần nhất', 'Thao tác'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-blue-50/40 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium border border-gray-100">
                        {staff.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{staff.name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                            {staff.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                          <span>ID: {staff.id}</span>
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
                          <span key={taskId} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
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
                    {new Date(staff.lastLogin).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleAssignTask(staff)}
                        className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-200 transition" 
                        title="Giao nhiệm vụ"
                      >
                        <ClipboardDocumentListIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditStaff(staff)}
                        className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 transition" 
                        title="Chỉnh sửa"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusToggle(staff.id)}
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
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition" 
                        title="Xóa"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {staffList.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">Không tìm thấy nhân viên phù hợp với bộ lọc hiện tại.</p>
          </div>
        )}
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
                        {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name</label>
                          <input
                            type="text"
                            value={staffForm.name}
                            onChange={(e) => setStaffForm({...staffForm, name: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={staffForm.email}
                            onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Role</label>
                          <select
                            value={staffForm.role}
                            onChange={(e) => setStaffForm({...staffForm, role: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <select
                            value={staffForm.status}
                            onChange={(e) => setStaffForm({...staffForm, status: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingStaff ? 'Update' : 'Add'} Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
                                  ? 'border-blue-500 bg-blue-50'
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
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                              <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
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
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
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
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
          <IconComponent className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <span className={`text-xs font-semibold ${color}`}>{trend}</span>
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
    : { color: 'bg-blue-100 text-blue-700', label: 'Nhân viên' };
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      {map.label}
    </span>
  );
};

export default StaffManagement;
