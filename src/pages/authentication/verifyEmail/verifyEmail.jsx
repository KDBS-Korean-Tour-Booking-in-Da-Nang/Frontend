import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { getApiPath } from '../../../config/api';
import styles from './verifyEmail.module.css';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { login } = useAuth();
  const { showSuccess } = useToast();
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

    // Validation
    if (!otp.trim()) {
      setError(t('toast.required', { field: t('auth.common.otp') }) || 'OTP là bắt buộc');
      setLoading(false);
      return;
    }
    if (otp.length !== 6) {
      setError(t('auth.verify.error') || 'OTP phải có 6 chữ số');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiPath('/api/users/verify-email'), {
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
        showSuccess('toast.auth.email_verify_success');
        
        // Keep loading spinner visible until redirect occurs
        // Auto navigate based on role after 2 seconds
        setTimeout(async () => {
          // Auto-login after verify for all users
          try {
            const email = sessionStorage.getItem('post_reg_email');
            const password = sessionStorage.getItem('post_reg_password');
            if (email && password) {
              const resp = await fetch(getApiPath('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              const data = await resp.json();
              if ((data.code === 1000 || data.code === 0) && data.result) {
                const token = data.result.token;
                const userObj = data.result.user ? {
                  id: data.result.user.userId,
                  email: data.result.user.email,
                  role: data.result.user.role,
                  status: data.result.user.status,
                  name: data.result.user.username,
                  avatar: data.result.user.avatar,
                  balance: data.result.user.balance
                } : null;
                if (userObj) {
                  // Ghi nhớ theo lựa chọn mặc định (không remember)
                  login(userObj, token, false);
                  
                  // Navigate based on role
                  if (role === 'business') {
                    // Điều hướng tới trang upload company info
                    navigate('/company-info', { replace: true, state: { type: 'success' } });
                  } else {
                    // Điều hướng tới Homepage
                    window.location.href = '/';
                  }
                  return;
                }
              }
            }
          } catch {}
          
          // Fallback navigation if auto-login fails
          if (role === 'business') {
            navigate('/company-info', { replace: true, state: { type: 'success' } });
          } else {
            // Fallback to homepage even if login fails
            window.location.href = '/';
          }
        }, 2000);
      } else {
        setError(data.message || t('toast.auth.email_verify_failed') || 'Xác thực email thất bại');
        setLoading(false);
      }
    } catch (err) {
      setError(t('toast.auth.email_verify_failed') || 'Xác thực email thất bại');
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');

    // Validate email exists before sending request
    if (!email || !email.trim()) {
      setError('Email là bắt buộc');
      setResendLoading(false);
      return;
    }

    try {
      // Backend requires otpCode field with @NotBlank validation, but we don't have one for resend
      // Send a dummy 6-character code that meets validation - backend will ignore it for regenerate
      const response = await fetch(getApiPath('/api/users/regenerate-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          otpCode: '000000', // Dummy code to pass backend validation - backend ignores this for regenerate
        }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        setError(errorMessage);
        setResendLoading(false);
        return;
      }

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
        setError(''); // Clear any previous errors
        showSuccess('toast.auth.otp_sent_success');
      } else {
        // Show detailed error message from backend
        const errorMessage = data.message || data.error || t('toast.auth.otp_resend_failed') || 'Gửi lại OTP thất bại';
        setError(errorMessage);
      }
    } catch (err) {
      setError(t('toast.auth.otp_resend_failed') || 'Gửi lại OTP thất bại');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="page-gradient">
      <div className={`${styles['verify-container']} min-h-screen flex items-center justify-center py-8`}>
        <div className={`${styles['verify-content']} w-full max-w-[450px] px-4`}>
          <div className={styles['verify-form-section']}>
            <div className={styles['verify-header']}>
            <div className={styles['verify-logo']}>
              <EnvelopeIcon className={styles['verify-icon']} strokeWidth={1.25} />
            </div>
            <h2 className={styles['verify-title']}>
              {t('auth.verify.title')}
            </h2>
            <p className={styles['verify-subtitle']}>
              {t('auth.verify.subtitle', { email })}
            </p>
            </div>
          <form className={styles['verify-form']} onSubmit={handleSubmit}>
            <div className={styles['form-group']}>
              <label htmlFor="otp" className={styles['form-label']}>
                <Icon icon="lucide:key" className={styles['form-label-icon']} />
                {t('auth.verify.label')}
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={`${styles['form-input']} ${styles['otp-input']}`}
                placeholder={t('auth.common.otpPlaceholder')}
                maxLength="6"
              />
              <p className={styles['verify-subtitle']}>{t('auth.verify.helper')}</p>
            </div>

            {error && (
              <div className={styles['error-message']}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`${styles['verify-button']} ${loading ? styles['loading'] : ''}`}
              aria-busy={loading}
              aria-live="polite"
            >
              {loading ? (
                <span className={styles['spinner']} aria-hidden="true"></span>
              ) : (
                t('auth.verify.submit')
              )}
            </button>
          </form>

          <div className={styles['resend-section']}>
            <p className={styles['resend-text']}>
              {t('auth.common.notReceivedCode')}{' '}
              {countdown > 0 ? (
                <span className={styles['resend-text']}>
                  {t('auth.common.resendIn', { seconds: countdown })}
                </span>
              ) : (
                <button
                  onClick={handleResendOTP}
                  disabled={resendLoading}
                  className={styles['resend-button']}
                >
                  {resendLoading ? t('auth.verify.resending') : t('auth.verify.resend')}
                </button>
              )}
            </p>
          </div>

          <div className={styles['register-link']}>
            <button
              onClick={() => navigate('/register')}
              className={styles['back-button']}
            >
              {t('auth.common.backToRegister')}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
