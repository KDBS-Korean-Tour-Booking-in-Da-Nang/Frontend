import { useState } from 'react';
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
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
      // Use the verified OTP from the previous step
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otpCode: otpCode, // Use the verified OTP
          newPassword: formData.newPassword,
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
      <div className={styles['precondition-container']}>
        <div className={styles['precondition-content']}>
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
    );
  }

  if (success) {
    return (
      <div className={styles['success-container']}>
        <div className={styles['success-content']}>
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
          <div className="mt-6">
            <Link
              to="/login"
              className={styles['reset-button']}
            >
              {t('auth.reset.login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['reset-container']}>
      <div className={styles['reset-content']}>
        <div className={styles['reset-form-section']}>
          <div className={styles['reset-header']}>
            <div className={styles['reset-logo']}>
              <LockClosedIcon className="h-8 w-8 text-white" />
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
                className={styles['form-input']}
                placeholder="••••••••"
              />
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
                className={styles['form-input']}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className={styles['error-message']}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
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
  );
};

export default ResetPassword; 