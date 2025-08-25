import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import Modal from '../../../components/Modal';
import { PencilIcon, EyeIcon } from '@heroicons/react/24/outline';
import './userProfile.css';

const UserProfile = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.username || user?.name || '',
    phone: user?.phone || '',
    dob: user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : '',
    gender: user?.gender || '',
    cccd: user?.cccd || ''
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updatedUser = {
      ...user,
      ...editForm,
      avatar: avatarPreview
    };
    updateUser(updatedUser);
    setIsEditModalOpen(false);
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('profile.loginRequired')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Hồ sơ cá nhân
              </h2>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </button>
            </div>

            <div className="flex items-center space-x-6 mb-8">
              <div className="flex-shrink-0">
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {getInitials(user.username || user.name)}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{user.username || user.name}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
                <p className="text-sm text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Thông tin cơ bản
                </h4>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Họ tên</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.username || user.name || 'Chưa cập nhật'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Số điện thoại</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.phone || 'Chưa cập nhật'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ngày sinh</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Giới tính</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.gender || 'Chưa cập nhật'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">CCCD</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.cccd || 'Chưa cập nhật'}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Thông tin tài khoản
                </h4>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Vai trò</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{user.role}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Premium</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.isPremium ? 'Đã nâng cấp' : 'Chưa nâng cấp'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ngày tham gia</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa thông tin"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ảnh đại diện</label>
            <div className="mt-1 flex items-center space-x-4">
              {avatarPreview ? (
                <img src={avatarPreview} alt="preview" className="h-16 w-16 rounded-full object-cover border" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {getInitials(editForm.name)}
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="text-sm text-gray-700" />
            </div>
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Họ tên
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={editForm.name}
              onChange={handleEditChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Số điện thoại
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={editForm.phone}
              onChange={handleEditChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                Ngày sinh
              </label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={editForm.dob}
                onChange={handleEditChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                Giới tính
              </label>
              <select
                id="gender"
                name="gender"
                value={editForm.gender}
                onChange={handleEditChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Chưa cập nhật</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label htmlFor="cccd" className="block text-sm font-medium text-gray-700">
                CCCD
              </label>
              <input
                type="text"
                id="cccd"
                name="cccd"
                maxLength={12}
                value={editForm.cccd}
                onChange={handleEditChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserProfile; 