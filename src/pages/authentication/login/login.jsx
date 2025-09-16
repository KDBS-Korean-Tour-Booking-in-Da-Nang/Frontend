import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { UserCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { validateEmail } from '../../../utils/emailValidator';
import styles from './login.module.css';

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // emailError stores an error code, not translated text, so it reacts to language changes
  const [emailError, setEmailError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.message && location.state?.type === 'success') {
      showSuccess(location.state.message);
      // Clear the state to prevent showing message again on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname, showSuccess]);

  // Check for error from URL parameters (OAuth callback errors)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      showError(decodeURIComponent(errorParam));
      // Clear the error parameter from URL
      navigate(location.pathname, { replace: true });
    }
  }, [searchParams, navigate, location.pathname, showError]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    // Clear email error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  const handleEmailBlur = () => {
    if (email.trim()) {
      const emailValidation = validateEmail(email);
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

    // Collect all validation errors
    const errors = [];

    // Email validation
    if (!email.trim()) {
      errors.push('Email là bắt buộc');
    } else {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        errors.push('Email không đúng định dạng');
      }
    }

    // Password validation
    if (!password.trim()) {
      errors.push('Mật khẩu là bắt buộc');
    }

    // Show all errors if any
    if (errors.length > 0) {
      // Show all errors at the same time
      errors.forEach((error) => {
        showError(error);
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if ((data.code === 1000 || data.code === 0) && data.result) {
        const token = data.result.token;
        
        // Use user data from backend response
        if (data.result.user) {
          const user = {
            id: data.result.user.userId,
            email: data.result.user.email,
            role: data.result.user.role,
            name: data.result.user.username,
            avatar: data.result.user.avatar,
            isPremium: data.result.user.isPremium,
            balance: data.result.user.balance
          };

          login(user, token, rememberMe);
          showSuccess('Đăng nhập thành công!');
          navigate('/');
        } else {
          // Fallback to mock data if user info not available
          const user = {
            id: Date.now(),
            email,
            role: 'user',
            name: email.split('@')[0]
          };
          login(user, token, rememberMe);
          showSuccess('Đăng nhập thành công!');
          navigate('/');
        }
      } else {
        showError(data.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      showError(t('auth.login.error') || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch('/api/auth/google/login');
      const data = await response.json();
      
      if ((data.code === 1000 || data.code === 0) && data.result) {
        // Redirect to Google OAuth URL
        // Persist remember-me preference for the callback handler
        localStorage.setItem('oauth_remember_me', rememberMe ? 'true' : 'false');
        window.location.href = data.result;
      } else {
        showError('Không thể kết nối với Google. Vui lòng thử lại.');
      }
    } catch (err) {
      showError('Không thể kết nối với Google. Vui lòng thử lại.');
    }
  };

  const handleNaverLogin = async () => {
    try {
      const response = await fetch('/api/auth/naver/login');
      const data = await response.json();
      
      if ((data.code === 1000 || data.code === 0) && data.result) {
        // Redirect to Naver OAuth URL
        // Persist remember-me preference for the callback handler
        localStorage.setItem('oauth_remember_me', rememberMe ? 'true' : 'false');
        window.location.href = data.result;
      } else {
        showError('Không thể kết nối với Naver. Vui lòng thử lại.');
      }
    } catch (err) {
      showError('Không thể kết nối với Naver. Vui lòng thử lại.');
    }
  };

  return (
    <div className={styles['login-container']}>
      <div className={styles['login-content']}>
        <div className={styles['login-grid']}>
          {/* Login Form Section */}
          <div className={styles['login-form-section']}>
            <div className={styles['login-header']}>
              <div className={styles['login-logo']}>
                <UserCircleIcon className="h-8 w-8 text-white" />
              </div>
              <h2 className={styles['login-title']}>
                {t('auth.login.title')}
              </h2>
              <p className={styles['login-subtitle']}>
                {t('auth.login.subtitle')}
              </p>
            </div>
            <form className={styles['login-form']} onSubmit={handleSubmit}>
              <div className={styles['form-group']}>
                <label htmlFor="email" className={styles['form-label']}>
                  {t('auth.common.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  className={`${styles['form-input']} ${emailError ? styles['input-error'] : ''}`}
                  placeholder="user@example.com"
                />
                {emailError && (
                  <div className={styles['field-error']}>
                    {emailError === 'invalid' ? (t('auth.common.form.email.invalid') || 'lỗi sai email không đúng định dạng') : ''}
                  </div>
                )}
              </div>

              <div className={styles['form-group']}>
                <label htmlFor="password" className={styles['form-label']}>
                  {t('auth.common.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles['form-input']}
                  placeholder="••••••••"
                />
              </div>

              <div className={styles['remember-me']}>
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={styles['remember-checkbox']}
                />
                <label htmlFor="rememberMe" className={styles['remember-label']}>
                  {t('auth.common.rememberMe')}
                </label>
              </div>


              <button
                type="submit"
                disabled={loading || emailError}
                className={styles['login-button']}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('auth.login.submitting')}
                  </div>
                ) : (
                  t('auth.login.submit')
                )}
              </button>
            </form>

            <div className={styles['divider']}>
              <div className={styles['divider-line']}></div>
              <span className={styles['divider-text']}>{t('auth.common.or')}</span>
              <div className={styles['divider-line']}></div>
            </div>

            <div className={styles['oauth-buttons']}>
              <button
                onClick={handleGoogleLogin}
                className={`${styles['oauth-button']} ${styles['google']}`}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('auth.login.loginWithGoogle')}
              </button>

              <button
                onClick={handleNaverLogin}
                className={styles['oauth-button']}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#03C75A" d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
                </svg>
                {t('auth.login.loginWithNaver')}
              </button>
            </div>

            <div className={styles['forgot-password']}>
              <Link
                to="/forgot-password"
                className={styles['forgot-link']}
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            <div className={styles['register-link']}>
              <span className={styles['register-text']}>
                {t('auth.login.noAccount')}{' '}
              </span>
              <Link
                to="/register"
                className={styles['register-link-text']}
              >
                {t('auth.login.registerNow')}
              </Link>
            </div>

            <div className={styles['staff-login']}>
              <Link
                to="/staff-login"
                className={styles['staff-button']}
              >
                <ShieldCheckIcon className="h-4 w-4" />
                {t('auth.login.staffAdminLogin')}
              </Link>
            </div>
          </div>

          {/* Illustration Section */}
          <div className={styles['illustration-section']}>
            <h1 className={styles['illustration-title']}>
              {t('auth.login.illustrationTitle')}
            </h1>
            <p className={styles['illustration-subtitle']}>
              {t('auth.login.illustrationSubtitle')}
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
        </div>
      </div>
    </div>
  );
};

export default Login; 