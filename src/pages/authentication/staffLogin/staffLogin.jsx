import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { Lock, UserRound } from 'lucide-react';

const StaffLogin = () => {
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

        // Check if user has staff role only
        if (userData.role === 'STAFF') {
          const user = {
            id: userData.userId,
            role: userData.role,
            name: userData.username,
            email: userData.email,
            avatar: userData.avatar,
            balance: userData.balance,
            // Map backend staffTask enum to frontend field used in TaskManagement
            staffTask: userData.staffTask
          };

          login(user, token, false);
          showSuccess('Đăng nhập thành công!');
          
          // Redirect to staff dashboard
          navigate('/staff/news-management');
        } else {
          showError(`Tài khoản này không có quyền truy cập. Role hiện tại: ${userData.role}. Chỉ STAFF mới được phép đăng nhập vào trang quản lý.`);
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f3f9ff] via-[#edf5ff] to-[#e5f2ff] flex items-center justify-center px-4 py-10 sm:px-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-12 w-28 h-28 rounded-[32px] bg-white/50 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-[32px] bg-[#d2e7ff]/70 blur-2xl animate-pulse delay-200" />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-[0px_20px_45px_rgba(103,140,255,0.16)] p-6 sm:p-10">
          <div className="flex flex-col items-center text-center text-[#2563eb] gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[#e3efff] flex items-center justify-center">
              <Lock className="w-6 h-6" strokeWidth={1.4} />
            </div>
            <div className="leading-snug">
              <p className="text-sm font-semibold tracking-[0.2em] uppercase">Sign in</p>
              <p className="text-xs text-[#5f80c5]">Xin chào đội ngũ Staff</p>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="text-xs uppercase tracking-[0.3em] text-[#5f80c5]">
                Username
              </label>
              <div className="mt-2 rounded-3xl bg-[#f2f7ff] border border-[#d7e6ff] px-4 py-3 focus-within:border-[#7ba8ff] focus-within:shadow-[0_0_0_2px_rgba(123,168,255,0.18)] transition-all">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#0f1a2b] placeholder:text-[#7f97c8] focus:outline-none"
                  placeholder="Tên đăng nhập staff"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-xs uppercase tracking-[0.3em] text-[#5f80c5]">
                Mật khẩu
              </label>
              <div className="mt-2 rounded-3xl bg-[#f2f7ff] border border-[#d7e6ff] px-4 py-3 focus-within:border-[#7ba8ff] focus-within:shadow-[0_0_0_2px_rgba(123,168,255,0.18)] transition-all flex items-center gap-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-[#0f1a2b] placeholder:text-[#7f97c8] focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-[#d3e5ff] bg-[#eef5ff] px-4 py-3 text-xs text-[#0b5ed7]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-3xl bg-gradient-to-r from-[#4f9bff] via-[#3c84ff] to-[#5daeff] py-3 text-sm font-semibold text-white shadow-[0px_12px_30px_rgba(66,119,255,0.35)] transition-all hover:shadow-[0px_16px_36px_rgba(66,119,255,0.45)] disabled:opacity-60"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                  <span>Đang đăng nhập...</span>
                </div>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-[#dfe9ff]" />

          <Link
            to="/login"
            className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-[#4d7ae6] hover:text-[#355dcc] transition-colors"
          >
            <UserRound className="w-4 h-4" strokeWidth={1.5} />
            Đăng nhập người dùng / doanh nghiệp
          </Link>

          <div className="mt-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default StaffLogin; 