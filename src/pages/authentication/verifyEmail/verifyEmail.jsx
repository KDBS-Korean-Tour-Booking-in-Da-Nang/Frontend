import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import './verifyEmail.css';

const VerifyEmail = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const email = location.state?.email;
  const role = location.state?.role;

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }
    
    // Backend already sends OTP during registration, so we don't send again
    // Just start countdown for resend functionality
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!otp.trim()) {
      setError('Vui lòng nhập mã OTP');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otpCode: otp,
        }),
      });

      const data = await response.json();

      if ((data.code === 1000 || data.code === 0) && data.result === true) {
        // Verification successful - show success message and redirect based on role
        setError(''); // Clear any previous errors
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm mb-4';
        successMessage.innerHTML = '✅ Xác thực email thành công! Đang chuyển hướng...';
        
        // Insert success message before the form
        const form = document.querySelector('form');
        form.parentNode.insertBefore(successMessage, form);
        
        // Auto navigate based on role after 2 seconds
        setTimeout(() => {
          if (role === 'business') {
            // Nếu là doanh nghiệp, chuyển đến trang businessInfo
            navigate('/business-info', { 
              state: { 
                message: 'Xác thực email thành công! Vui lòng cung cấp thông tin doanh nghiệp.',
                type: 'success'
              } 
            });
          } else {
            // Nếu là user thường, chuyển đến trang login
            navigate('/login', { 
              state: { 
                message: 'Xác thực email thành công! Vui lòng đăng nhập.',
                type: 'success'
              } 
            });
          }
        }, 2000);
      } else {
        setError(data.message || 'Mã OTP không đúng. Vui lòng thử lại.');
      }
    } catch (err) {
      setError('Xác thực thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users/regenerate-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const data = await response.json();

      if ((data.code === 1000 || data.code === 0)) {
        // Reset countdown
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.');
      }
    } catch (err) {
      setError('Không thể gửi lại mã OTP. Vui lòng thử lại.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Xác thực Email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Chúng tôi đã gửi mã xác thực đến {email}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Mã xác thực (OTP)
              </label>
              <div className="mt-1">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest"
                  placeholder="000000"
                  maxLength="6"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Nhập mã 6 chữ số được gửi đến email của bạn
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Đang xác thực...' : 'Xác thực'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Không nhận được mã?{' '}
              {countdown > 0 ? (
                <span className="text-gray-400">
                  Gửi lại sau {countdown}s
                </span>
              ) : (
                <button
                  onClick={handleResendOTP}
                  disabled={resendLoading}
                  className="text-blue-600 hover:text-blue-500 disabled:opacity-50"
                >
                  {resendLoading ? 'Đang gửi...' : 'Gửi lại'}
                </button>
              )}
            </p>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/register')}
              className="text-sm text-gray-600 hover:text-gray-500"
            >
              Quay lại đăng ký
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
