import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { ShieldCheckIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const StaffLogin = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Collect all validation errors
    const errors = [];

    if (!username.trim()) {
      errors.push('Username là bắt buộc');
    }

    if (!password.trim()) {
      errors.push('Mật khẩu là bắt buộc');
    }

    // Show all errors if any
    if (errors.length > 0) {
      // Show all errors at the same time
      errors.forEach((error) => {
        showError(error);
      });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle HTTP error status with detailed error info
        let errorMessage = data.message || `HTTP Error: ${response.status}`;
        
        // Add more specific error messages based on response
        if (response.status === 401) {
          if (data.code === 1008) {
            errorMessage = `Xác thực thất bại. Vui lòng kiểm tra lại username và password.`;
          } else {
            errorMessage = `Username hoặc password không đúng. Vui lòng thử lại.`;
          }
        } else if (response.status === 400) {
          errorMessage = `Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.`;
        }
        
        showError(errorMessage);
        return;
      }

      if ((data.code === 1000 || data.code === 0) && data.result) {
        const token = data.result.token;
        const userData = data.result.user;

        // Check if user has admin or staff role (backend uses uppercase)
        if (userData.role === 'ADMIN' || userData.role === 'STAFF') {
          const user = {
            id: userData.userId,
            role: userData.role,
            name: userData.username,
            avatar: userData.avatar,
            isPremium: userData.isPremium,
            balance: userData.balance
          };

              login(user, token, false);
              showSuccess('Đăng nhập thành công!');
              navigate('/staff/news-management');
        } else {
          showError(`Tài khoản này không có quyền truy cập. Role hiện tại: ${userData.role}. Chỉ ADMIN và STAFF mới được phép đăng nhập vào trang quản lý.`);
        }
      } else {
        // Handle API error response
        const errorMessage = data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
        showError(errorMessage);
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // More specific error handling
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        showError('Không thể kết nối đến server. Vui lòng kiểm tra backend có chạy không.');
      } else {
        showError('Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
            <ShieldCheckIcon className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{t('staffLogin.title')}</h2>
        <p className="mt-2 text-center text-sm text-gray-600">{t('staffLogin.subtitle')}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">{t('staffLogin.username')}</label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">{t('staffLogin.password')}</label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('staffLogin.submitting')}
                  </div>
                ) : (
                  t('staffLogin.submit')
                )}
              </button>
              
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('staffLogin.or')}</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center"
              >
                <UserCircleIcon className="h-4 w-4 mr-1" />
                {t('staffLogin.loginUserBusiness')}
              </Link>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Thông tin đăng nhập</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Lưu ý:</strong> Chỉ tài khoản có role "ADMIN" hoặc "STAFF" mới được phép đăng nhập</p>
              <p><strong>Username:</strong> Nhập username của tài khoản có quyền admin/staff</p>
              <p><strong>Mật khẩu:</strong> Mật khẩu của tài khoản đó</p>
              <p className="text-blue-600 mt-2">
                <strong>Tip:</strong> Đảm bảo tài khoản trong database có role = 'ADMIN' hoặc 'STAFF' (uppercase)
              </p>
              <p className="text-red-600 mt-2">
                <strong>Quan trọng:</strong> Tài khoản USER hoặc BUSINESS sẽ bị từ chối truy cập
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin; 