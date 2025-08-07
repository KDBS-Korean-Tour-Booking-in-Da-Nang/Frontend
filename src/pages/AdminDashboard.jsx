import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { 
  ChartBarIcon, 
  UsersIcon, 
  BuildingOfficeIcon, 
  UserGroupIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
    { id: 'users', name: 'All Users', icon: UsersIcon },
    { id: 'companies', name: 'Approve Company', icon: BuildingOfficeIcon },
    { id: 'staff', name: 'Staff Management', icon: UserGroupIcon }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'users':
        return <UsersTab />;
      case 'companies':
        return <CompaniesTab />;
      case 'staff':
        return <StaffTab />;
      default:
        return <DashboardTab />;
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bạn không có quyền truy cập trang này
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Quản lý hệ thống Tour du lịch Đà Nẵng - Korea
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

// Dashboard Tab Component
const DashboardTab = () => {
  const mockStats = {
    totalUsers: 1250,
    totalRevenue: 150000000,
    pendingCompanies: 8,
    totalStaff: 15
  };

  const mockRevenueData = [
    { month: 'T1', revenue: 12000000 },
    { month: 'T2', revenue: 15000000 },
    { month: 'T3', revenue: 18000000 },
    { month: 'T4', revenue: 22000000 },
    { month: 'T5', revenue: 25000000 },
    { month: 'T6', revenue: 28000000 }
  ];

  // Chart data for revenue
  const revenueData = {
    labels: mockRevenueData.map(item => item.month),
    datasets: [{
      label: 'Doanh thu (VNĐ)',
      data: mockRevenueData.map(item => item.revenue),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      tension: 0.1
    }]
  };

  // Chart data for traffic (like your example)
  const trafficData = {
    labels: ['06.08.2020', '07.08.2020', '08.08.2020', '09.08.2020', '10.08.2020', '11.08.2020', '12.08.2020'],
    datasets: [
      {
        label: 'Unique pages',
        data: [60, 30, 50, 40, 55, 80, 30],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Unique queries',
        data: [40, 55, 35, 65, 60, 70, 90],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: { 
          boxWidth: 20,
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { 
          stepSize: 10,
          callback: function(value) {
            return value + '';
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Tổng số User
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mockStats.totalUsers.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Doanh thu
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mockStats.totalRevenue.toLocaleString('vi-VN')} VNĐ
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Chờ duyệt
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mockStats.pendingCompanies}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Staff
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mockStats.totalStaff}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Chart - Like your example */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Biểu đồ truy cập</h3>
        <Line data={trafficData} options={chartOptions} height={80} />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Biểu đồ doanh thu</h3>
        <Line data={revenueData} options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Biểu đồ doanh thu theo tháng',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    label += context.parsed.y.toLocaleString('vi-VN');
                  }
                  return label;
                }
              }
            }
          }
        }} />
      </div>
    </div>
  );
};

// Users Tab Component
const UsersTab = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const mockUsers = [
    { id: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', role: 'user', status: 'active', createdAt: '2024-01-01' },
    { id: 2, name: 'Trần Thị B', email: 'tranthib@email.com', role: 'user', status: 'inactive', createdAt: '2024-01-02' },
    { id: 3, name: 'Lê Văn C', email: 'levanc@email.com', role: 'business', status: 'active', createdAt: '2024-01-03' }
  ];

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleStatusChange = (userId, newStatus) => {
    // Mock API call to update user status
    console.log(`Updating user ${userId} status to ${newStatus}`);
    setIsUserModalOpen(false);
  };

  return (
    <div>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Danh sách tất cả User</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Chi tiết User"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Họ tên</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{selectedUser.role}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedUser.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thay đổi trạng thái
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleStatusChange(selectedUser.id, 'active')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Kích hoạt
                </button>
                <button
                  onClick={() => handleStatusChange(selectedUser.id, 'inactive')}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Vô hiệu hóa
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Companies Tab Component
const CompaniesTab = () => {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const mockCompanies = [
    {
      id: 1,
      name: 'Công ty Du lịch ABC',
      email: 'info@abc.com',
      phone: '0123456789',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      taxCode: '123456789',
      status: 'pending'
    },
    {
      id: 2,
      name: 'Công ty Lữ hành XYZ',
      email: 'contact@xyz.com',
      phone: '0987654321',
      address: '456 Đường XYZ, Quận 2, TP.HCM',
      taxCode: '987654321',
      status: 'pending'
    }
  ];

  const handleViewCompany = (company) => {
    setSelectedCompany(company);
    setIsCompanyModalOpen(true);
  };

  const handleApprove = (companyId, approved) => {
    if (approved) {
      if (confirm('Bạn có chắc chắn muốn duyệt doanh nghiệp này?')) {
        console.log(`Approving company ${companyId}`);
        setIsCompanyModalOpen(false);
      }
    } else {
      if (confirm('Bạn có chắc chắn muốn từ chối doanh nghiệp này?')) {
        console.log(`Rejecting company ${companyId}`);
        setIsCompanyModalOpen(false);
      }
    }
  };

  return (
    <div>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Danh sách doanh nghiệp chờ duyệt</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên công ty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số điện thoại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã số thuế
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockCompanies.map((company) => (
                  <tr key={company.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {company.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {company.taxCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewCompany(company)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Company Detail Modal */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title="Chi tiết doanh nghiệp"
        size="lg"
      >
        {selectedCompany && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tên công ty</label>
                <p className="mt-1 text-sm text-gray-900">{selectedCompany.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{selectedCompany.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                <p className="mt-1 text-sm text-gray-900">{selectedCompany.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mã số thuế</label>
                <p className="mt-1 text-sm text-gray-900">{selectedCompany.taxCode}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
              <p className="mt-1 text-sm text-gray-900">{selectedCompany.address}</p>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phê duyệt
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleApprove(selectedCompany.id, true)}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center"
                >
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Duyệt
                </button>
                <button
                  onClick={() => handleApprove(selectedCompany.id, false)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Staff Tab Component
const StaffTab = () => {
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    role: 'staff'
  });

  const mockStaff = [
    { id: 1, name: 'Admin User', email: 'admin@company.com', role: 'admin' },
    { id: 2, name: 'Staff User', email: 'staff@company.com', role: 'staff' }
  ];

  const handleAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({ name: '', email: '', role: 'staff' });
    setIsStaffModalOpen(true);
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setStaffForm({ name: staff.name, email: staff.email, role: staff.role });
    setIsStaffModalOpen(true);
  };

  const handleDeleteStaff = (staffId) => {
    if (confirm('Bạn có chắc chắn muốn xóa staff này?')) {
      console.log(`Deleting staff ${staffId}`);
    }
  };

  const handleStaffSubmit = (e) => {
    e.preventDefault();
    if (editingStaff) {
      console.log('Updating staff:', { ...editingStaff, ...staffForm });
    } else {
      console.log('Adding staff:', staffForm);
    }
    setIsStaffModalOpen(false);
  };

  return (
    <div>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Quản lý Staff</h3>
            <button
              onClick={handleAddStaff}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Thêm Staff
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockStaff.map((staff) => (
                  <tr key={staff.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {staff.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {staff.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {staff.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditStaff(staff)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff Modal */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title={editingStaff ? 'Chỉnh sửa Staff' : 'Thêm Staff'}
      >
        <form onSubmit={handleStaffSubmit} className="space-y-4">
          <div>
            <label htmlFor="staffName" className="block text-sm font-medium text-gray-700">
              Tên
            </label>
            <input
              type="text"
              id="staffName"
              value={staffForm.name}
              onChange={(e) => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="staffEmail" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="staffEmail"
              value={staffForm.email}
              onChange={(e) => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="staffRole" className="block text-sm font-medium text-gray-700">
              Vai trò
            </label>
            <select
              id="staffRole"
              value={staffForm.role}
              onChange={(e) => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              {editingStaff ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard; 