import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import styles from './resetPassword.module.css';

const ResetPassword = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const verified = location.state?.verified;
  const otpCode = location.state?.otpCode; // Lấy OTP đã verify

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // When success becomes true, redirect to login after a short delay
  useEffect(() => {
    if (!success) return;
    setRedirectCountdown(5);
    const interval = setInterval(() => {
      setRedirectCountdown(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    const timer = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [success, navigate]);

  const handlePasswordBeforeInput = (e) => {
    const { data } = e;
    if (data == null) return;
    // Block space character
    if (data === ' ' || data === '\u00A0') {
      e.preventDefault();
    }
  };

  const handlePasswordPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    // Remove all spaces from pasted text
    const cleaned = pasted.replace(/\s/g, '');
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const current = target.value;
    const newValue = current.slice(0, start) + cleaned + current.slice(end);
    
    // Update form data
    setFormData(prev => ({ ...prev, [target.name]: newValue }));
    
    // Manually trigger validation by creating a synthetic event
    const syntheticEvent = {
      target: { ...target, value: newValue, name: target.name },
      currentTarget: target
    };
    handleChange(syntheticEvent);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Remove all spaces from password fields
    let cleanedValue = value;
    if (name === 'newPassword' || name === 'confirmPassword') {
      cleanedValue = value.replace(/\s/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: cleanedValue
    }));

    // Real-time password validation
    if (name === 'newPassword') {
      // Value is already cleaned (no spaces) from handleChange
      if (cleanedValue.length > 0 && cleanedValue.length < 8) {
        setPasswordError(t('auth.reset.errors.passwordMinLength'));
      } else {
        setPasswordError('');
      }
      // Also check confirm password if it has value
      if (formData.confirmPassword && formData.confirmPassword !== cleanedValue) {
        setConfirmPasswordError(t('auth.reset.errors.passwordMismatch'));
      } else if (formData.confirmPassword && formData.confirmPassword === cleanedValue) {
        setConfirmPasswordError('');
      }
    }

    // Real-time confirm password validation
    if (name === 'confirmPassword') {
      // Value is already cleaned (no spaces) from handleChange
      if (cleanedValue && formData.newPassword && cleanedValue !== formData.newPassword) {
        setConfirmPasswordError(t('auth.reset.errors.passwordMismatch'));
      } else {
        setConfirmPasswordError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    // Passwords are already cleaned (no spaces) from handleChange
    if (formData.newPassword !== formData.confirmPassword) {
      setError(t('auth.reset.errors.passwordMismatch'));
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError(t('auth.reset.errors.passwordMinLength'));
      setLoading(false);
      return;
    }

    try {
      // Password is already cleaned (no spaces) from handleChange, but trim for safety
      const trimmedPassword = formData.newPassword.trim();
      // Use the verified OTP from the previous step
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otpCode: otpCode, // Use the verified OTP
          newPassword: trimmedPassword,
        }),
      });

      const data = await response.json();

      if ((data.code === 1000 || data.code === 0)) {
        setSuccess(true);
      } else {
        setError(data.message || t('auth.reset.errors.resetFailed'));
      }
    } catch (err) {
      setError(t('auth.reset.errors.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!email || !verified || !otpCode) {
    return (
      <div className="page-gradient">
        <div className={`${styles['precondition-container']} min-h-screen flex items-center justify-center py-8`}>
          <div className={`${styles['precondition-content']} w-full max-w-[500px] px-4`}>
          <h2 className={styles['precondition-title']}>
            {t('auth.reset.preconditionTitle')}
          </h2>
          <Link
            to="/forgot-password"
            className={styles['precondition-button']}
          >
            {t('auth.reset.backToForgot')}
          </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-gradient">
        <div className={`${styles['success-container']} min-h-screen flex items-center justify-center py-8`}>
          <div className={`${styles['success-content']} w-full max-w-[500px] px-4`}>
          <div className={styles['success-icon']}>
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className={styles['success-title']}>
            {t('auth.reset.successTitle')}
          </h3>
          <p className={styles['success-subtitle']}>
            {t('auth.reset.successSubtitle')}
          </p>
          <p className={styles['success-subtitle']}>
            {`Redirecting to login in ${redirectCountdown}s...`}
          </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-gradient">
      <div className={`${styles['reset-container']} min-h-screen flex items-center justify-center py-8`}>
        <div className={`${styles['reset-content']} w-full max-w-[450px] px-4`}>
          <div className={styles['reset-form-section']}>
            <div className={styles['reset-header']}>
              <div className={styles['reset-logo']}>
                <LockClosedIcon className={styles['reset-icon']} strokeWidth={1.5} />
              </div>
            <h2 className={styles['reset-title']}>
              {t('auth.reset.title')}
            </h2>
            <p className={styles['reset-subtitle']}>
              {t('auth.reset.subtitle', { email })}
            </p>
          </div>
          <form className={styles['reset-form']} onSubmit={handleSubmit}>
            <div className={styles['form-group']}>
              <label htmlFor="newPassword" className={styles['form-label']}>
                {t('auth.reset.newPassword')}
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.newPassword}
                onChange={handleChange}
                onBeforeInput={handlePasswordBeforeInput}
                onPaste={handlePasswordPaste}
                className={`${styles['form-input']} ${passwordError ? styles['input-error'] : ''}`}
                placeholder="••••••••"
              />
              {passwordError && (
                <div className={styles['field-error']}>
                  {passwordError}
                </div>
              )}
            </div>

            <div className={styles['form-group']}>
              <label htmlFor="confirmPassword" className={styles['form-label']}>
                {t('auth.reset.confirmNewPassword')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                onBeforeInput={handlePasswordBeforeInput}
                onPaste={handlePasswordPaste}
                className={`${styles['form-input']} ${confirmPasswordError ? styles['input-error'] : ''}`}
                placeholder="••••••••"
              />
              {confirmPasswordError && (
                <div className={styles['field-error']}>
                  {confirmPasswordError}
                </div>
              )}
            </div>

            {error && (
              <div className={styles['error-message']}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || passwordError || confirmPasswordError}
              className={styles['reset-button']}
            >
              {loading ? t('auth.reset.submitting') : t('auth.reset.submit')}
            </button>
          </form>

          <div className={styles['login-link']}>
            <span className={styles['login-text']}>
              {t('auth.common.rememberPassword')}{' '}
            </span>
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

export default ResetPassword; 