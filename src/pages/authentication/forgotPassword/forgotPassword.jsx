import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import { KeyIcon } from '@heroicons/react/24/outline';
import { Icon } from '@iconify/react';
import { getApiPath } from '../../../config/api';
import styles from './forgotPassword.module.css';

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
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEmailError('');
    setGeneralError('');

    if (!email.trim()) {
      setEmailError(t('toast.required', { field: t('auth.common.email') }) || 'Email là bắt buộc');
      setLoading(false);
      return;
    }
    if (!email.includes('@')) {
      setEmailError(t('auth.common.form.email.invalid') || 'Email không đúng định dạng');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiPath('/api/auth/forgot-password/request'), {
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
        // Mark user as having password if forgot password succeeds (user has real password)
        if (email) {
          try {
            localStorage.setItem(`hasPassword_${email}`, 'true');
            localStorage.removeItem(`isOAuthOnly_${email}`);
          } catch (err) {
            // Silently handle localStorage errors
          }
        }
      } else {
        // Check if it's an OAuth-only user error
        const errorMessage = data.message || '';
        // If backend returns error for OAuth-only users, show specific message and don't proceed
        if (errorMessage.toLowerCase().includes('oauth') || 
            errorMessage.toLowerCase().includes('social') ||
            errorMessage.toLowerCase().includes('google') ||
            errorMessage.toLowerCase().includes('naver') ||
            errorMessage.toLowerCase().includes('không có mật khẩu') ||
            errorMessage.toLowerCase().includes('does not have a password') ||
            errorMessage.toLowerCase().includes('비밀번호가 없습니다') ||
            errorMessage.toLowerCase().includes('cannot reset password') ||
            errorMessage.toLowerCase().includes('không thể đặt lại mật khẩu') ||
            data.code === 1001 || // Assuming backend uses specific error code
            response.status === 400) {
          
          // Save OAuth-only status to localStorage
          if (email) {
            try {
              localStorage.setItem(`isOAuthOnly_${email}`, 'true');
            } catch (err) {
              // Silently handle localStorage errors
            }
          }
          
          setGeneralError(data.message || t('auth.forgot.errors.oauthOnly') || 'Tài khoản này đăng nhập qua Google/Naver và không có mật khẩu. Vui lòng đăng nhập bằng Google/Naver.');
        } else {
          setGeneralError(data.message || t('toast.auth.general_error') || 'Có lỗi xảy ra');
        }
      }
    } catch (err) {
      setGeneralError(t('toast.auth.general_error') || 'Có lỗi xảy ra');
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
    setOtpError('');
    setGeneralError('');

    if (!otp.trim()) {
      setOtpError(t('toast.required', { field: t('auth.common.otp') }) || 'OTP là bắt buộc');
      setOtpLoading(false);
      return;
    }
    if (otp.length !== 6) {
      setOtpError(t('auth.verify.error') || 'OTP phải có 6 chữ số');
      setOtpLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiPath(`/api/auth/forgot-password/verify-otp?email=${encodeURIComponent(email)}&otpCode=${encodeURIComponent(otp)}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();

      if ((data.code === 1000 || data.code === 0) && data.result === true) {
        // OTP verified successfully, navigate to reset password immediately
        showSuccess('toast.auth.otp_verify_success');
        navigate('/reset-password', {
          replace: true,
          state: {
            email: email,
            verified: true,
            otpCode: otp
          }
        });
      } else {
        setOtpError(data.message || t('toast.auth.general_error') || 'Xác thực OTP thất bại');
      }
    } catch (err) {
      setOtpError(t('toast.auth.general_error') || 'Xác thực OTP thất bại');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);

    try {
      const response = await fetch(getApiPath('/api/auth/forgot-password/request'), {
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
        // Mark user as having password if resend succeeds (user has real password)
        if (email) {
          try {
            localStorage.setItem(`hasPassword_${email}`, 'true');
            localStorage.removeItem(`isOAuthOnly_${email}`);
          } catch (err) {
            // Silently handle localStorage errors
          }
        }
      } else {
        // Check if it's an OAuth-only user error
        const errorMessage = data.message || '';
        if (errorMessage.toLowerCase().includes('oauth') || 
            errorMessage.toLowerCase().includes('social') ||
            errorMessage.toLowerCase().includes('google') ||
            errorMessage.toLowerCase().includes('naver') ||
            errorMessage.toLowerCase().includes('không có mật khẩu') ||
            errorMessage.toLowerCase().includes('does not have a password')) {
          
          // Save OAuth-only status to localStorage
          if (email) {
            try {
              localStorage.setItem(`isOAuthOnly_${email}`, 'true');
            } catch (err) {
              // Silently handle localStorage errors
            }
          }
        }
        setGeneralError(data.message || t('toast.auth.general_error') || 'Gửi lại OTP thất bại');
      }
    } catch (err) {
      setGeneralError(t('toast.auth.general_error') || 'Gửi lại OTP thất bại');
    } finally {
      setResendLoading(false);
    }
  };

  // Show OTP form after email is sent
  if (sent && !verified) {
    return (
      <div className="page-gradient">
        <div className={`${styles['forgot-container']} min-h-screen flex items-center justify-center py-8`}>
          <div className={`${styles['forgot-content']} w-full max-w-[450px] px-4`}>
            <div className={styles['forgot-form-section']}>
              <div className={styles['forgot-header']}>
              <div className={styles['forgot-logo']}>
                <KeyIcon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h2 className={styles['forgot-title']}>
                {t('auth.verify.title')}
              </h2>
              <p className={styles['forgot-subtitle']}>
                {t('auth.verify.subtitle', { email })}
              </p>
              </div>
            <form className={styles['forgot-form']} onSubmit={handleVerifyOTP}>
            <div className={styles['form-group']}>
              <label htmlFor="otp" className={styles['form-label']}>
                <Icon icon="lucide:key" className={styles['form-label-icon']} />
                {t('auth.common.otp')}
              </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    setOtpError('');
                  }}
                  className={`${styles['form-input']} ${styles['otp-input']} ${otpError ? styles['input-error'] : ''}`}
                  placeholder={t('auth.common.otpPlaceholder')}
                  maxLength="6"
                />
                {otpError && (
                  <div className={styles['field-error']}>
                    {otpError}
                  </div>
                )}
                <p className={styles['forgot-subtitle']}>{t('auth.verify.helper')}</p>
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className={styles['forgot-button']}
              >
                {otpLoading ? t('auth.verify.submitting') : t('auth.verify.submit')}
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

            <div className={styles['login-link']}>
              <button
                onClick={() => {
                  setSent(false);
                  setOtp('');
                  setCountdown(0);
                }}
                className={styles['back-button']}
              >
                {t('auth.common.backToForgot')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="page-gradient">
      <div className={`${styles['forgot-container']} min-h-screen flex items-center justify-center py-8`}>
        <div className={`${styles['forgot-content']} w-full max-w-[450px] px-4`}>
          <div className={styles['forgot-form-section']}>
            <div className={styles['forgot-header']}>
              <div className={styles['forgot-logo']}>
              <KeyIcon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h2 className={styles['forgot-title']}>
              {t('auth.forgot.title')}
            </h2>
            <p className={styles['forgot-subtitle']}>
              {t('auth.forgot.subtitle')}
            </p>
          </div>
          <form className={styles['forgot-form']} onSubmit={handleSubmit}>
            <div className={styles['form-group']}>
              <label htmlFor="email" className={styles['form-label']}>
                <Icon icon="lucide:mail" className={styles['form-label-icon']} />
                {t('auth.common.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                className={`${styles['form-input']} ${emailError ? styles['input-error'] : ''}`}
                placeholder="user@example.com"
              />
              {emailError && (
                <div className={styles['field-error']}>
                  {emailError}
                </div>
              )}
            </div>

            {generalError && (
              <div className={styles['field-error']} style={{ marginBottom: '1rem' }}>
                {generalError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={styles['forgot-button']}
            >
              {loading ? t('auth.forgot.sending') : t('auth.forgot.submit')}
            </button>
          </form>

          <div className={styles['login-link']}>
            <Link
              to="/login"
              className={styles['login-link-text']}
            >
              {t('auth.common.backToLogin')}
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 