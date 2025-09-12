import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import './verifyEmail.css';
import { useTranslation } from 'react-i18next';

const VerifyEmail = () => {
  const { t } = useTranslation();
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
      setError(t('auth.common.otp'));
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
        successMessage.innerHTML = t('auth.verify.successBanner');
        
        // Insert success message before the form
        const form = document.querySelector('form');
        form.parentNode.insertBefore(successMessage, form);
        
        // Auto navigate based on role after 2 seconds
        setTimeout(() => {
          if (role === 'business') {
            navigate('/business-info', { state: { type: 'success' } });
          } else {
            navigate('/login', { state: { type: 'success' } });
          }
        }, 2000);
      } else {
        setError(data.message || t('auth.verify.error'));
      }
    } catch (err) {
      setError(t('auth.verify.failed'));
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
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{t('auth.verify.title')}</h2>
        <p className="mt-2 text-center text-sm text-gray-600">{t('auth.verify.subtitle', { email })}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">{t('auth.verify.label')}</label>
              <div className="mt-1">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary text-center text-lg tracking-widest"
                  placeholder={t('auth.common.otpPlaceholder')}
                  maxLength="6"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">{t('auth.verify.helper')}</p>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? t('auth.verify.submitting') : t('auth.verify.submit')}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('auth.common.notReceivedCode')}{' '}
              {countdown > 0 ? (
                <span className="text-gray-400">{t('auth.common.resendIn', { seconds: countdown })}</span>
              ) : (
                <button onClick={handleResendOTP} disabled={resendLoading} className="text-primary hover:text-primary-hover disabled:opacity-50">
                  {resendLoading ? t('auth.verify.resending') : t('auth.verify.resend')}
                </button>
              )}
            </p>
          </div>

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/register')} className="text-sm text-gray-600 hover:text-gray-500">
              {t('auth.common.backToRegister')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
