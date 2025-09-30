import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import styles from './verifyEmail.module.css';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { login } = useAuth();
  const { showError, showSuccess } = useToast();
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
      showError({ i18nKey: 'toast.required', values: { field: t('auth.common.otp') } });
      setLoading(false);
      return;
    }
    if (otp.length !== 6) {
      showError(t('auth.verify.error'));
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
        showSuccess('toast.auth.email_verify_success');
        
        // Keep loading spinner visible until redirect occurs
        // Auto navigate based on role after 2 seconds
        setTimeout(() => {
          if (role === 'business') {
            navigate('/business-info', { state: { type: 'success' } });
          } else {
            navigate('/login', { state: { type: 'success' } });
          }
        }, 2000);
      } else {
        showError(data.message || 'toast.auth.email_verify_failed');
        setLoading(false);
      }
    } catch (err) {
      showError('toast.auth.email_verify_failed');
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
        showSuccess('toast.auth.otp_sent_success');
      } else {
        showError(data.message || 'toast.auth.otp_resend_failed');
      }
    } catch (err) {
      showError('toast.auth.otp_resend_failed');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className={styles['verify-container']}>
      <div className={styles['verify-content']}>
        <div className={styles['verify-form-section']}>
          <div className={styles['verify-header']}>
            <div className={styles['verify-logo']}>
              <EnvelopeIcon className="h-8 w-8 text-white" />
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
  );
};

export default VerifyEmail;
