import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { validateEmail } from '../../../utils/emailValidator';
import gsap from 'gsap';
import styles from './register.module.css';

const Register = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  // emailError stores an error code, not translated text, so it reacts to language changes
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const { showError, showSuccess, showBatch } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // GSAP animations
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    
    // Register page always slides in from left
    const registerForm = document.querySelector(`.${styles['register-form-section']}`);
    const illustrationSection = document.querySelector(`.${styles['illustration-section']}`);
    
    if (registerForm) {
      gsap.set(registerForm, { x: '-100%', opacity: 0 });
      tl.to(registerForm, { x: 0, opacity: 1, duration: 0.8 });
    }
    
    if (illustrationSection) {
      gsap.set(illustrationSection, { x: '-100%', opacity: 0 });
      tl.to(illustrationSection, { x: 0, opacity: 1, duration: 0.8 }, '-=0.4');
    }
  }, []);

  const isValidUsername = (val) => {
    if (val === undefined || val === null) return false;
    const trimmed = String(val).trim();
    if (trimmed.length === 0) return true; // allow empty while editing
    const usernameRegex = /^[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ\s\d]*$/;
    return usernameRegex.test(trimmed);
  };

  const sanitizeUsername = (val) => {
    const str = String(val || '');
    // Keep letters (incl. accents), digits, and spaces only
    let cleaned = str.replace(/[^A-Za-zÀ-ỹ\d\s]/g, '');
    // Ensure first non-space char is a letter; drop leading digits
    cleaned = cleaned.replace(/^\s*\d+/, '');
    return cleaned;
  };

  const handleChange = (e) => {
const { name, value } = e.target;
    if (name === 'username') {
      const sanitized = sanitizeUsername(value);
      setFormData(prev => ({ ...prev, username: sanitized }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear email error when user starts typing
    if (name === 'email' && emailError) {
      setEmailError('');
    }

    // Real-time username validation
    if (name === 'username') {
      const trimmed = (sanitizeUsername(value) || '').trim();
      if (!trimmed) {
        setUsernameError(t('toast.name_required') || 'Không để trống tên');
      } else {
        if (!isValidUsername(trimmed)) {
          setUsernameError('Tên không hợp lệ: không bắt đầu bằng số, không chứa ký tự đặc biệt.');
        } else {
          setUsernameError('');
        }
      }
    }

    // Real-time password validation
    if (name === 'password') {
      if (value.length > 0 && value.length < 8) {
        setPasswordError(t('auth.register.errors.passwordMinLength'));
      } else {
        setPasswordError('');
      }
      // Also check confirm password if it has value
      if (formData.confirmPassword && formData.confirmPassword !== value) {
        setConfirmPasswordError(t('auth.register.errors.passwordMismatch'));
      } else if (formData.confirmPassword && formData.confirmPassword === value) {
        setConfirmPasswordError('');
      }
    }

    // Real-time confirm password validation
    if (name === 'confirmPassword') {
      if (value && formData.password && value !== formData.password) {
        setConfirmPasswordError(t('auth.register.errors.passwordMismatch'));
      } else {
        setConfirmPasswordError('');
      }
    }
  };

  const handleUsernameBeforeInput = (e) => {
    const { data } = e;
    if (data == null) return;
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const current = target.value;
    const next = current.slice(0, start) + data + current.slice(end);
    const nextSanitized = sanitizeUsername(next);
    if (next !== nextSanitized || !isValidUsername(nextSanitized)) {
      e.preventDefault();
    }
  };

  const handleUsernamePaste = (e) => {
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const current = target.value;
    const next = current.slice(0, start) + pasted + current.slice(end);
    const nextSanitized = sanitizeUsername(next);
    if (!isValidUsername(nextSanitized)) {
      e.preventDefault();
      const inserted = sanitizeUsername(pasted);
      const fixed = current.slice(0, start) + inserted + current.slice(end);
      setFormData(prev => ({ ...prev, username: fixed }));
      setUsernameError(inserted ? '' : 'Tên không hợp lệ: không bắt đầu bằng số, không chứa ký tự đặc biệt.');
    }
  };

  const handleEmailBlur = () => {
    if (formData.email.trim()) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        setEmailError('invalid');
      } else {
        setEmailError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEmailError('');

    // Collect all validation errors to show multiple toasts at once
    const validationErrors = [];

    // Email validation
    if (!formData.email.trim()) {
      validationErrors.push({ i18nKey: 'toast.required', values: { field: t('auth.common.email') } });
    } else {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        validationErrors.push(t('auth.common.form.email.invalid'));
      }
    }

    // Username validation
    if (!formData.username.trim()) {
      validationErrors.push({ i18nKey: 'toast.required', values: { field: t('auth.register.username') } });
    } else {
      const trimmed = formData.username.trim();
      const usernameRegex = /^[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ\s\d]*$/;
      if (!usernameRegex.test(trimmed)) {
        validationErrors.push('Tên không hợp lệ: không bắt đầu bằng số, không chứa ký tự đặc biệt.');
      }
    }

    // Password validation
    if (!formData.password.trim()) {
      validationErrors.push({ i18nKey: 'toast.required', values: { field: t('auth.register.password') } });
    } else if (formData.password.length < 8) {
      validationErrors.push(t('auth.register.errors.passwordMinLength'));
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      validationErrors.push(t('auth.register.errors.passwordMismatch'));
    }

    if (validationErrors.length > 0) {
      showBatch(validationErrors, 'error', 5000);
      setLoading(false);
      return;
    }

    try {
      // Map frontend role to backend enum
      const backendRole = (formData.role === 'business') ? 'COMPANY' : 'USER';
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: backendRole,
        }),
      });

      const data = await response.json();

      if ((data.code === 1000 || data.code === 0)) {
        // Lưu email vào localStorage
        localStorage.setItem('userEmail', formData.email);
        // Lưu ý định vai trò đã chọn để điều hướng sau xác thực
        localStorage.setItem('registration_intent', formData.role);
        // Lưu tạm email/password để auto-login sau khi verify (session only)
        try {
          sessionStorage.setItem('post_reg_email', formData.email);
          sessionStorage.setItem('post_reg_password', formData.password);
        } catch {}
        
        // Show success message
        showSuccess('toast.auth.register_success');
        
        // Registration successful, redirect to verification page immediately
        // Backend already sends OTP automatically during registration
        navigate('/verify-email', { 
          state: { 
            email: formData.email,
            role: formData.role 
          } 
        });
      } else {
        // Check if it's an email already exists error
        if (data.code === 1001 || data.message?.includes('Email has existed')) {
          setEmailError('exists');
          showError('toast.auth.email_already_exists');
        } else {
          showError(data.message || t('auth.register.errors.registerFailed') || 'toast.auth.general_error');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      showError(t('auth.register.errors.registerFailed') || 'toast.auth.general_error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-gradient">
      <div className={`${styles['register-container']} min-h-screen flex items-start justify-center py-8`}>
        <div className={`${styles['register-content']} w-full max-w-[1000px] px-4`}>
          <div className={`${styles['register-grid']} grid grid-cols-1 lg:grid-cols-2 gap-6`}>
          {/* Illustration Section */}
          <div className={styles['illustration-section']}>
            <h1 className={styles['illustration-title']}>
              {t('auth.register.illustrationTitle')}
            </h1>
            <p className={styles['illustration-subtitle']}>
              {t('auth.register.illustrationSubtitle')}
            </p>
            
            <div className={styles['travel-items']}>
              <div className={styles['travel-item']}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
              </div>
              <div className={styles['travel-item']}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 4h3c.55 0 1 .45 1 1s-.45 1-1 1h-3v2h3c.55 0 1 .45 1 1s-.45 1-1 1h-3v2h3c.55 0 1 .45 1 1s-.45 1-1 1h-3v2c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2v-2H4c-.55 0-1-.45-1-1s.45-1 1-1h3v-2H4c-.55 0-1-.45-1-1s.45-1 1-1h3V8H4c-.55 0-1-.45-1-1s.45-1 1-1h3V4c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2z"/>
                </svg>
              </div>
              <div className={styles['travel-item']}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className={styles['travel-item']}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>

            <div className={styles['character']}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          </div>

          {/* Register Form Section */}
          <div className={styles['register-form-section']}>
            <div className={styles['register-header']}>
              <div className={styles['register-logo']}>
                <UserPlusIcon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h2 className={styles['register-title']}>
                {t('auth.register.title')}
              </h2>
              <p className={styles['register-subtitle']}>
                {t('auth.register.headerSubtitle')}
              </p>
            </div>
            <form className={styles['register-form']} onSubmit={handleSubmit}>
              <div className={styles['form-group']}>
                <label htmlFor="username" className={styles['form-label']}>
                  {t('auth.register.username')}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  onBeforeInput={handleUsernameBeforeInput}
                  onPaste={handleUsernamePaste}
                  className={`${styles['form-input']} ${usernameError ? styles['input-error'] : ''}`}
                  placeholder={t('auth.register.usernamePlaceholder')}
                />
                {usernameError && (
                  <div className={styles['field-error']}>
                    {usernameError}
                  </div>
                )}
              </div>

              <div className={styles['form-group']}>
                <label htmlFor="email" className={styles['form-label']}>
                  {t('auth.common.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  className={`${styles['form-input']} ${emailError ? styles['input-error'] : ''}`}
                  placeholder="user@example.com"
                />
                {emailError && (
                  <div className={styles['field-error']}>
                    {(() => {
                      if (emailError === 'invalid') {
                        return t('auth.common.form.email.invalid') || 'Email không đúng định dạng';
                      }
                      if (emailError === 'exists') {
                        return 'Email này đã được đăng ký';
                      }
                      return '';
                    })()}
                  </div>
                )}
              </div>

              <div className={styles['form-group']}>
                <label htmlFor="password" className={styles['form-label']}>
                  {t('auth.register.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
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
                  {t('auth.register.confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`${styles['form-input']} ${confirmPasswordError ? styles['input-error'] : ''}`}
                  placeholder="••••••••"
                />
                {confirmPasswordError && (
                  <div className={styles['field-error']}>
                    {confirmPasswordError}
                  </div>
                )}
              </div>

              <div className={styles['role-selection']}>
                <label className={styles['role-label']}>
                  {t('auth.register.roleSelect')}
                </label>
                <div className={styles['role-buttons']}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                    className={`${styles['role-button']} ${formData.role === 'user' ? styles['selected'] : ''}`}
                  >
                    <div className={styles['role-button-title']}>{t('auth.register.roleUserTitle')}</div>
                    <div className={styles['role-button-desc']}>{t('auth.register.roleUserDesc')}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'business' }))}
                    className={`${styles['role-button']} ${formData.role === 'business' ? styles['selected'] : ''}`}
                  >
                    <div className={styles['role-button-title']}>{t('auth.register.roleBusinessTitle')}</div>
                    <div className={styles['role-button-desc']}>{t('auth.register.roleBusinessDesc')}</div>
                  </button>
                </div>
              </div>


              <button
                type="submit"
                disabled={loading || emailError || passwordError || confirmPasswordError || !!usernameError}
                className={styles['register-button']}
              >
                {loading ? t('auth.register.submitting') : t('auth.register.submit')}
              </button>


          </form>

            <div className={styles['login-link']}>
              <span className={styles['login-text']}>
                {t('auth.register.haveAccount')}{' '}
              </span>
              <Link
                to="/login"
                className={styles['login-link-text']}
              >
                {t('auth.register.login')}
              </Link>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 