import { useState } from 'react';
import { 
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const UserManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'user',
    status: 'active'
  });

  const [userList, setUserList] = useState([
    {
      id: 1,
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@email.com',
      role: 'user',
      status: 'active',
      createdAt: '2024-01-15',
      lastLogin: '2024-01-20',
      totalBookings: 5
    },
    {
      id: 2,
      name: 'Trần Thị B',
      email: 'tranthib@email.com',
      role: 'user',
      status: 'inactive',
      createdAt: '2024-01-10',
      lastLogin: '2024-01-18',
      totalBookings: 2
    },
    {
      id: 3,
      name: 'Lê Văn C',
      email: 'levanc@email.com',
      role: 'business',
      status: 'active',
      createdAt: '2024-01-05',
      lastLogin: '2024-01-19',
      totalBookings: 0
    },
    {
      id: 4,
      name: 'Phạm Thị D',
      email: 'phamthid@email.com',
      role: 'user',
      status: 'active',
      createdAt: '2024-01-12',
      lastLogin: '2024-01-21',
      totalBookings: 8
    }
  ]);

  const handleAddUser = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', role: 'user', status: 'active' });
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setIsModalOpen(true);
  };

  const handleDeleteUser = (userId) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUserList(userList.filter(user => user.id !== userId));
    }
  };

  const handleStatusToggle = (userId) => {
    setUserList(userList.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingUser) {
      setUserList(userList.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...userForm }
          : user
      ));
    } else {
      const newUser = {
        id: Date.now(),
        ...userForm,
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString().split('T')[0],
        totalBookings: 0
      };
      setUserList([...userList, newUser]);
    }
    setIsModalOpen(false);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'staff':
        return 'bg-[#bfd7ff] text-[#2563eb]';
      case 'business':
        return 'bg-green-100 text-green-800';
      case 'user':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage user accounts and their permissions</p>
        </div>
        <button
          onClick={handleAddUser}
          className="bg-[#4c9dff] hover:bg-[#3f85d6] text-white px-4 py-2 rounded-md text-sm font-medium flex items-center shadow-[0_12px_30px_rgba(76,157,255,0.35)] transition-all duration-200"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-[#4c9dff]" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{userList.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {userList.filter(user => user.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserCircleIcon className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Business Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {userList.filter(user => user.role === 'business').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Inactive Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {userList.filter(user => user.status === 'inactive').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userList.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-[#4c9dff] flex items-center justify-center text-white text-sm font-medium">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.totalBookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(user.lastLogin).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleStatusToggle(user.id)}
                        className={`${
                          user.status === 'active' 
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {user.status === 'active' ? (
                          <XMarkIcon className="h-4 w-4" />
                        ) : (
                          <CheckIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Modal */}
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
                        {editingUser ? 'Edit User' : 'Add New User'}
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Full Name</label>
                          <input
                            type="text"
                            value={userForm.name}
                            onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#4c9dff] focus:border-[#4c9dff]"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#4c9dff] focus:border-[#4c9dff]"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Role</label>
                          <select
                            value={userForm.role}
                            onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#4c9dff] focus:border-[#4c9dff]"
                          >
                            <option value="user">User</option>
                            <option value="business">Business</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <select
                            value={userForm.status}
                            onChange={(e) => setUserForm({...userForm, status: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#4c9dff] focus:border-[#4c9dff]"
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
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-[0_12px_30px_rgba(76,157,255,0.35)] px-4 py-2 bg-[#4c9dff] text-base font-medium text-white hover:bg-[#3f85d6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4c9dff] transition-all duration-200 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingUser ? 'Update' : 'Add'} User
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
    </div>
  );
};

export default UserManagement;
