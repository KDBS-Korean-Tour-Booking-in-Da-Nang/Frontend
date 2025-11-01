import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import { KeyIcon } from '@heroicons/react/24/outline';
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
      <div className="page-gradient">
        <div className={`${styles['forgot-container']} min-h-screen flex items-center justify-center py-8`}>
          <div className={`${styles['forgot-content']} w-full max-w-[450px] px-4`}>
            <div className={styles['forgot-form-section']}>
              <div className={styles['forgot-header']}>
              <div className={styles['forgot-logo']}>
                <KeyIcon className="h-8 w-8 text-white" />
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
                  {t('auth.common.otp')}
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
              <KeyIcon className="h-8 w-8 text-white" />
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
                {t('auth.common.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles['form-input']}
                placeholder="user@example.com"
              />
            </div>

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