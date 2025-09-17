import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import './forgotPassword.css';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email.trim()) {
      showError({ i18nKey: 'toast.required', values: { field: t('auth.common.email') } });
      setLoading(false);
      return;
    }
    if (!email.includes('@')) {
      showError(t('auth.common.form.email.invalid'));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password/request', {
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
        showSuccess('toast.auth.password_reset_email_sent');
        setSent(true);
        setCountdown(60);
      } else {
        showError(data.message || 'toast.auth.general_error');
      }
    } catch (err) {
      showError('toast.auth.general_error');
    } finally {
      setLoading(false);
    }
  };

  // Start countdown when OTP is sent
  useEffect(() => {
    if (sent && countdown > 0) {
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
    }
  }, [sent, countdown]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setOtpLoading(true);

    if (!otp.trim()) {
      showError({ i18nKey: 'toast.required', values: { field: t('auth.common.otp') } });
      setOtpLoading(false);
      return;
    }
    if (otp.length !== 6) {
      showError(t('auth.verify.error'));
      setOtpLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/forgot-password/verify-otp?email=${encodeURIComponent(email)}&otpCode=${encodeURIComponent(otp)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();

      if ((data.code === 1000 || data.code === 0) && data.result === true) {
        // OTP verified successfully, navigate to reset password
        setVerified(true);
        showSuccess('toast.auth.otp_verify_success');
        
        // Navigate to reset password after 2 seconds
        setTimeout(() => {
          navigate('/reset-password', { 
            state: { 
              email: email,
              verified: true,
              otpCode: otp // Pass the verified OTP
            } 
          });
        }, 2000);
      } else {
        showError(data.message || 'toast.auth.general_error');
      }
    } catch (err) {
      showError('toast.auth.general_error');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password/request', {
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
        showSuccess('toast.auth.otp_sent_success');
        
        // Reset countdown
        setCountdown(60);
      } else {
        showError(data.message || 'toast.auth.general_error');
      }
    } catch (err) {
      showError('toast.auth.general_error');
    } finally {
      setResendLoading(false);
    }
  };

  // Show OTP form after email is sent
  if (sent && !verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('auth.verify.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.verify.subtitle', { email })}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleVerifyOTP}>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  {t('auth.common.otp')}
                </label>
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

              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
                  {successMessage}
                </div>
              )}


              <div>
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {otpLoading ? t('auth.verify.submitting') : t('auth.verify.submit')}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t('auth.common.notReceivedCode')}{' '}
                {countdown > 0 ? (
                  <span className="text-gray-400">
                    {t('auth.common.resendIn', { seconds: countdown })}
                  </span>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    disabled={resendLoading}
                    className="text-primary hover:text-primary-hover disabled:opacity-50"
                  >
                    {resendLoading ? t('auth.verify.resending') : t('auth.verify.resend')}
                  </button>
                )}
              </p>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setSent(false);
                  setOtp('');
                  setCountdown(0);
                }}
                className="text-sm text-gray-600 hover:text-gray-500"
              >
                {t('auth.common.backToForgot')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t('auth.forgot.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('auth.forgot.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.common.email')}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
                {successMessage}
              </div>
            )}
            

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? t('auth.forgot.sending') : t('auth.forgot.submit')}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-primary hover:text-primary-hover"
            >
              {t('auth.common.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 