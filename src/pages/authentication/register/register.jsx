import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { Icon } from '@iconify/react';
import { validateEmail } from '../../../utils/emailValidator';
import { getApiPath } from '../../../config/api';
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
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  // GSAP animations: slide in from left
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    
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

  // Validate username: must start with letter, no special characters
  const isValidUsername = (val) => {
    if (val === undefined || val === null) return false;
    const trimmed = String(val).trim();
    if (trimmed.length === 0) return true;
    const usernameRegex = /^[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ\s\d]*$/;
    return usernameRegex.test(trimmed);
  };

  // Sanitize username: keep letters (with accents), digits and spaces, ensure doesn't start with digit
  const sanitizeUsername = (val) => {
    const str = String(val || '');
    let cleaned = str.replace(/[^A-Za-zÀ-ỹ\d\s]/g, '');
    cleaned = cleaned.replace(/^\s*\d+/, '');
    return cleaned;
  };

  // Block space character input in password
  const handlePasswordBeforeInput = (e) => {
    const { data } = e;
    if (data == null) return;
    if (data === ' ' || data === '\u00A0') {
      e.preventDefault();
    }
  };

  // Handle paste in password: remove spaces and trigger validation
  const handlePasswordPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const cleaned = pasted.replace(/\s/g, '');
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const current = target.value;
    const newValue = current.slice(0, start) + cleaned + current.slice(end);
    
    setFormData(prev => ({ ...prev, [target.name]: newValue }));
    
    const syntheticEvent = {
      target: { ...target, value: newValue, name: target.name },
      currentTarget: target
    };
    handleChange(syntheticEvent);
  };

  // Handle input change: real-time validation and data sanitization
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'username') {
      const sanitized = sanitizeUsername(value);
      setFormData(prev => ({ ...prev, username: sanitized }));
    } else if (name === 'password' || name === 'confirmPassword') {
      // Remove all spaces from password fields
      const cleaned = value.replace(/\s/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: cleaned
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (name === 'email' && emailError) {
      setEmailError('');
    }

    if (generalError) {
      setGeneralError('');
    }

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

    if (name === 'password') {
      if (value.length > 0 && value.length < 8) {
        setPasswordError(t('auth.register.errors.passwordMinLength'));
      } else {
        setPasswordError('');
      }
      if (formData.confirmPassword && formData.confirmPassword !== value) {
        setConfirmPasswordError(t('auth.register.errors.passwordMismatch'));
      } else if (formData.confirmPassword && formData.confirmPassword === value) {
        setConfirmPasswordError('');
      }
    }

    if (name === 'confirmPassword') {
      if (value && formData.password && value !== formData.password) {
        setConfirmPasswordError(t('auth.register.errors.passwordMismatch'));
      } else {
        setConfirmPasswordError('');
      }
    }
  };

  // Block invalid character input in username
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

  // Handle paste in username: sanitize and validate
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

  // Validate email on blur
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

  // Handle register form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEmailError('');
    setUsernameError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');

    let firstMissingField = null;
    let firstMissingFieldName = '';
    let hasUnfilledFields = false;
    let hasValidationErrors = false;

    if (!formData.username.trim()) {
      if (!firstMissingField) {
        firstMissingField = 'username';
        firstMissingFieldName = t('auth.register.username');
      }
      setUsernameError(t('toast.name_required') || 'Không để trống tên');
      hasUnfilledFields = true;
      hasValidationErrors = true;
    } else {
      const trimmed = formData.username.trim();
      const usernameRegex = /^[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ\s\d]*$/;
      if (!usernameRegex.test(trimmed)) {
        hasValidationErrors = true;
        if (!firstMissingField) {
          firstMissingField = 'username';
          firstMissingFieldName = t('auth.register.username');
        }
      }
    }

    if (!formData.email.trim()) {
      if (!firstMissingField) {
        firstMissingField = 'email';
        firstMissingFieldName = t('auth.common.email');
      }
      setEmailError('required');
      hasUnfilledFields = true;
      hasValidationErrors = true;
    } else {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        hasValidationErrors = true;
        if (!firstMissingField) {
          firstMissingField = 'email';
          firstMissingFieldName = t('auth.common.email');
        }
      }
    }

    if (!formData.password) {
      if (!firstMissingField) {
        firstMissingField = 'password';
        firstMissingFieldName = t('auth.register.password');
      }
      setPasswordError(t('auth.register.errors.passwordMinLength'));
      hasUnfilledFields = true;
      hasValidationErrors = true;
    } else if (formData.password.length < 8) {
      hasValidationErrors = true;
      if (!firstMissingField) {
        firstMissingField = 'password';
        firstMissingFieldName = t('auth.register.password');
      }
      setPasswordError(t('auth.register.errors.passwordMinLength'));
    }

    if (formData.password !== formData.confirmPassword) {
      hasValidationErrors = true;
      if (!firstMissingField) {
        firstMissingField = 'confirmPassword';
        firstMissingFieldName = t('auth.register.confirmPassword');
      }
      setConfirmPasswordError(t('auth.register.errors.passwordMismatch'));
    }

    if (hasValidationErrors) {
      setLoading(false);
      return;
    }

    try {
      const backendRole = (formData.role === 'business') ? 'COMPANY' : 'USER';
      const trimmedPassword = formData.password.trim();
      const response = await fetch(getApiPath('/api/users/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: trimmedPassword,
          role: backendRole,
        }),
      });

      const data = await response.json();

      if ((data.code === 1000 || data.code === 0)) {
        localStorage.setItem('userEmail', formData.email);
        localStorage.setItem('registration_intent', formData.role);
        try {
          sessionStorage.setItem('post_reg_email', formData.email);
          sessionStorage.setItem('post_reg_password', trimmedPassword);
        } catch (err) {
        }
        
        showSuccess('toast.auth.register_success');
        
        navigate('/verify-email', { 
          state: { 
            email: formData.email,
            role: formData.role 
          } 
        });
      } else {
        if (data.code === 1001 || data.message?.includes('Email has existed')) {
          setEmailError('exists');
        } else {
          setGeneralError(data.message || t('auth.register.errors.registerFailed') || 'Đăng ký thất bại. Vui lòng thử lại.');
        }
      }
    } catch (error) {
      setGeneralError(t('auth.register.errors.registerFailed') || 'Đăng ký thất bại. Vui lòng thử lại.');
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
            
            <div className={styles['logo-wrapper']}>
              <img
                src="/logoKDBS.png"
                alt="KDBS Logo"
                className={styles['logo-image']}
              />
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
                  <Icon icon="lucide:user" className={styles['form-label-icon']} />
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
                  <Icon icon="lucide:mail" className={styles['form-label-icon']} />
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
                      if (emailError === 'required') {
                        return t('toast.required', { field: t('auth.common.email') }) || 'Email là bắt buộc';
                      }
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
                  <Icon icon="lucide:lock" className={styles['form-label-icon']} />
                  {t('auth.register.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
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
                  <Icon icon="lucide:shield-check" className={styles['form-label-icon']} />
                  {t('auth.register.confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
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

              {generalError && (
                <div className={styles['field-error']} style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  {generalError}
                </div>
              )}

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