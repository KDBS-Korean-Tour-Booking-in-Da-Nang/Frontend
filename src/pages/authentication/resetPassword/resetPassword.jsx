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
        <div className={styles['reset-grid']}>
          {/* Illustration Section */}
          <div className={styles['illustration-section']}>
            <h1 className={styles['illustration-title']}>
              {t('auth.reset.illustrationTitle')}
            </h1>
            <p className={styles['illustration-subtitle']}>
              {t('auth.reset.illustrationSubtitle')}
            </p>
            
            <div className={styles['security-items']}>
              <div className={styles['security-item']}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <div className={styles['security-item']}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className={styles['security-item']}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </div>
              <div className={styles['security-item']}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>

            <div className={styles['character']}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>

          {/* Reset Password Form Section */}
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
    </div>
  );
};

export default ResetPassword; 