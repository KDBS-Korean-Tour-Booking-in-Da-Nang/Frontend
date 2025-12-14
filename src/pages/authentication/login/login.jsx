import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { Icon } from '@iconify/react';
import { validateEmail } from '../../../utils/emailValidator';
import { getApiPath } from '../../../config/api';
import gsap from 'gsap';
import styles from './login.module.css';

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Redirect if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      const returnAfterLogin = localStorage.getItem('returnAfterLogin');
      if (returnAfterLogin) {
        localStorage.removeItem('returnAfterLogin');
        navigate(returnAfterLogin, { replace: true });
        return;
      }

      let targetPath = '/';
      if (user.role === 'COMPANY' || user.role === 'BUSINESS') {
        targetPath = '/company/dashboard';
      } else if (user.role === 'ADMIN' || user.role === 'STAFF') {
        targetPath = '/admin';
      }
      navigate(targetPath, { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Check for error from URL parameters (OAuth callback errors)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setGeneralError(decodeURIComponent(errorParam));
      navigate(location.pathname, { replace: true });
    }
  }, [searchParams, navigate, location.pathname]);

  // GSAP animations: slide in from right
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    
    const loginForm = document.querySelector(`.${styles['login-form-section']}`);
    const illustrationSection = document.querySelector(`.${styles['illustration-section']}`);
    
    if (loginForm) {
      gsap.set(loginForm, { x: '100%', opacity: 0 });
      tl.to(loginForm, { x: 0, opacity: 1, duration: 0.8 });
    }
    
    if (illustrationSection) {
      gsap.set(illustrationSection, { x: '100%', opacity: 0 });
      tl.to(illustrationSection, { x: 0, opacity: 1, duration: 0.8 }, '-=0.4');
    }
  }, []);

  // Handle email change and clear error
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError('');
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  // Block space character input in password
  const handlePasswordBeforeInput = (e) => {
    const { data } = e;
    if (data == null) return;
    if (data === ' ' || data === '\u00A0') {
      e.preventDefault();
    }
  };

  // Handle paste in password: remove spaces
  const handlePasswordPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const cleaned = pasted.replace(/\s/g, '');
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const current = target.value;
    const newValue = current.slice(0, start) + cleaned + current.slice(end);
    
    setPassword(newValue);
    
    if (passwordError) {
      setPasswordError('');
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  // Handle password change: remove spaces
  const handlePasswordChange = (e) => {
    const cleaned = e.target.value.replace(/\s/g, '');
    setPassword(cleaned);
    if (passwordError) {
      setPasswordError('');
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  // Validate email on blur
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

  // Map error message from backend to i18n key for multi-language support
  const mapLoginErrorToI18nKey = (message) => {
    const msg = String(message || '').toLowerCase();

    const emailKeywords = [
      'email', 'user', 'mail',
      'sai email', 'email không', 'không tồn tại', 'tài khoản', 'người dùng',
      '이메일', '사용자', '유저'
    ];
    const passwordKeywords = [
      'password', 'credentials',
      'mật khẩu', 'mat khau', 'sai mật khẩu', 'sai mat khau', 'không đúng',
      '비밀번호', '패스워드'
    ];

    const hasEmailKeyword = emailKeywords.some(k => msg.includes(k));
    const hasPasswordKeyword = passwordKeywords.some(k => msg.includes(k));

    if (hasEmailKeyword && hasPasswordKeyword) {
      return { i18nKey: 'toast.auth.both_invalid', defaultMessage: 'Đăng nhập thất bại. vui lòng kiểm tra email hoặc mật khẩu.' };
    }

    if (
      msg.includes('email has not existed') ||
      msg.includes('email not exist') ||
      msg.includes('email does not exist') ||
      msg.includes('user not found') ||
      msg.includes('no such user') ||
      msg.includes('wrong email') ||
      msg.includes('email không tồn tại') ||
      msg.includes('không tìm thấy email') ||
      msg.includes('tài khoản không tồn tại') ||
      msg.includes('người dùng không tồn tại') ||
      msg.includes('이메일을 찾을 수') ||
      msg.includes('사용자를 찾을 수') ||
      hasEmailKeyword
    ) {
      return { i18nKey: 'toast.auth.email_not_found', defaultMessage: 'Đăng nhập thất bại. vui lòng kiểm tra email.' };
    }

    if (
      msg.includes('password not match') ||
      msg.includes('wrong password') ||
      msg.includes('invalid password') ||
      msg.includes('bad credentials') ||
      msg.includes('incorrect password') ||
      msg.includes('sai mật khẩu') ||
      msg.includes('mật khẩu không đúng') ||
      msg.includes('비밀번호가 올바르지') ||
      msg.includes('비밀번호가 틀렸') ||
      hasPasswordKeyword
    ) {
      return { i18nKey: 'toast.auth.wrong_password', defaultMessage: 'Đăng nhập thất bại. Vui lòng kiểm tra mật khẩu.' };
    }

    if (
      msg.includes('login failed. please check your email or password') ||
      msg.includes('both invalid') ||
      msg.includes('invalid_credentials') ||
      msg.includes('invalid credentials') ||
      msg.includes('check your email or password') ||
      msg.includes('email hoặc mật khẩu') ||
      msg.includes('이메일 또는 비밀번호')
    ) {
      return { i18nKey: 'toast.auth.both_invalid', defaultMessage: 'Đăng nhập thất bại. vui lòng kiểm tra email hoặc mật khẩu.' };
    }

    return null;
  };

  // Handle login form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    let firstMissingField = null;
    let hasUnfilledFields = false;
    let hasValidationErrors = false;

    if (!email.trim()) {
      if (!firstMissingField) {
        firstMissingField = 'email';
      }
      setEmailError('required');
      hasUnfilledFields = true;
      hasValidationErrors = true;
    } else {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        hasValidationErrors = true;
        if (!firstMissingField) {
          firstMissingField = 'email';
        }
        setEmailError('invalid');
      }
    }

    if (!password) {
      if (!firstMissingField) {
        firstMissingField = 'password';
      }
      setPasswordError(t('toast.required', { field: t('auth.common.password') }) || 'Mật khẩu là bắt buộc');
      hasUnfilledFields = true;
      hasValidationErrors = true;
    }

    if (hasValidationErrors) {
      setLoading(false);
      return;
    }

    try {
      const trimmedPassword = password.trim();
      const response = await fetch(getApiPath('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: trimmedPassword,
        }),
      });

      const data = await response.json();

      if (response.status === 403 && data?.code === 1012) {
        setGeneralError(t('auth.login.banned') || 'Tài khoản của bạn đã bị khóa bởi quản trị viên.');
        navigate('/banned', { replace: true });
        return;
      }

      if ((data.code === 1000 || data.code === 0) && data.result) {
        const token = data.result.token;
        
        if (data.result.user) {
          const user = {
            id: data.result.user.userId,
            email: data.result.user.email,
            role: data.result.user.role,
            status: data.result.user.status,
            name: data.result.user.username,
            avatar: data.result.user.avatar,
            balance: data.result.user.balance,
            authProvider: 'LOCAL'
          };

          login(user, token, rememberMe);
          
          if (!(user.role === 'COMPANY' || user.role === 'BUSINESS') || 
              (user.status !== 'COMPANY_PENDING' && user.status !== 'WAITING_FOR_APPROVAL')) {
            localStorage.removeItem('registration_intent');
            localStorage.removeItem('company_onboarding_pending');
          }
          
          // Handle COMPANY/BUSINESS role routing based on status
          if (user.role === 'COMPANY' || user.role === 'BUSINESS') {
            if (user.status === 'COMPANY_PENDING') {
              // Status COMPANY_PENDING: user needs to upload documents, go to company-info
              navigate('/company-info', { replace: true });
              return;
            } else if (user.status === 'WAITING_FOR_APPROVAL') {
              // Status WAITING_FOR_APPROVAL: documents uploaded, waiting for admin approval, go to pending-page
              navigate('/pending-page', { replace: true });
              return;
            }
          }

          const returnAfterLogin = localStorage.getItem('returnAfterLogin');
          if (returnAfterLogin) {
            localStorage.removeItem('returnAfterLogin');
            if (user.role === 'COMPANY') {
              navigate(returnAfterLogin, { 
                replace: true,
                state: { message: 'toast.auth.login_success', type: 'success' }
              });
              return;
            }
            navigate('/', { 
              replace: true,
              state: { message: 'toast.auth.login_success', type: 'success' }
            });
            return;
          }

          let targetPath = '/';
          if (user.role === 'COMPANY' || user.role === 'BUSINESS') {
            targetPath = '/company/dashboard';
          } else if (user.role === 'ADMIN' || user.role === 'STAFF') {
            targetPath = '/admin';
          }
          
          navigate(targetPath, { 
            replace: true,
            state: { message: 'toast.auth.login_success', type: 'success' }
          });
        } else {
          const user = {
            id: Date.now(),
            email,
            role: 'user',
            name: email.split('@')[0],
            authProvider: 'LOCAL'
          };
          login(user, token, rememberMe);
          navigate('/', { 
            replace: true,
            state: { message: 'toast.auth.login_success', type: 'success' }
          });
        }
      } else {
        const mapped = mapLoginErrorToI18nKey(data.message);
        if (mapped) {
          if (mapped.i18nKey === 'toast.auth.email_not_found') {
            setEmailError('not_found');
          } else if (mapped.i18nKey === 'toast.auth.wrong_password') {
            setPasswordError(t('toast.auth.wrong_password') || 'Mật khẩu không đúng');
          } else if (mapped.i18nKey === 'toast.auth.both_invalid') {
            setGeneralError(mapped.defaultMessage || t('toast.auth.both_invalid') || 'Đăng nhập thất bại. Vui lòng kiểm tra email hoặc mật khẩu.');
          } else {
            setGeneralError(mapped.defaultMessage || data.message || t('toast.auth.login_failed') || 'Đăng nhập thất bại');
          }
        } else {
          setGeneralError(data.message || t('toast.auth.login_failed') || 'Đăng nhập thất bại');
        }
      }
    } catch (err) {
      setGeneralError(t('auth.login.error') || t('toast.auth.general_error') || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth login
  const handleGoogleLogin = async () => {
    try {
      const response = await fetch(getApiPath('/api/auth/google/login'));
      const data = await response.json();
      
      if ((data.code === 1000 || data.code === 0) && data.result) {
        localStorage.setItem('oauth_remember_me', rememberMe ? 'true' : 'false');
        localStorage.setItem('oauth_provider', 'GOOGLE');
        window.location.href = data.result;
      } else {
        setGeneralError(t('toast.auth.google_connection_failed') || 'Không thể kết nối với Google. Vui lòng thử lại.');
      }
    } catch (err) {
      setGeneralError(t('toast.auth.google_connection_failed') || 'Không thể kết nối với Google. Vui lòng thử lại.');
    }
  };

  // Handle Naver OAuth login
  const handleNaverLogin = async () => {
    try {
      const response = await fetch(getApiPath('/api/auth/naver/login'));
      const data = await response.json();
      
      if ((data.code === 1000 || data.code === 0) && data.result) {
        localStorage.setItem('oauth_remember_me', rememberMe ? 'true' : 'false');
        localStorage.setItem('oauth_provider', 'NAVER');
        window.location.href = data.result;
      } else {
        setGeneralError(t('toast.auth.naver_connection_failed') || 'Không thể kết nối với Naver. Vui lòng thử lại.');
      }
    } catch (err) {
      setGeneralError(t('toast.auth.naver_connection_failed') || 'Không thể kết nối với Naver. Vui lòng thử lại.');
    }
  };

  return (
    <div className="page-gradient">
      <div className={`${styles['login-container']} min-h-screen flex items-start justify-center py-8`}>
      <div className={`${styles['login-content']} w-full max-w-[1000px] px-4`}>
        <div className={`${styles['login-grid']} grid grid-cols-1 lg:grid-cols-2 gap-6`}>
          {/* Login Form Section */}
          <div className={styles['login-form-section']}>
            <div className={styles['login-header']}>
              <div className={styles['login-logo']}>
                <UserCircleIcon className="h-6 w-6" strokeWidth={1.5} />
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
                  <Icon icon="lucide:mail" className={styles['form-label-icon']} />
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
                    {(() => {
                      if (emailError === 'required') {
                        return t('toast.required', { field: t('auth.common.email') }) || 'Email là bắt buộc';
                      }
                      if (emailError === 'invalid') {
                        return t('auth.common.form.email.invalid') || 'Email không đúng định dạng';
                      }
                      if (emailError === 'not_found') {
                        return t('toast.auth.email_not_found') || 'Email không tồn tại';
                      }
                      return '';
                    })()}
                  </div>
                )}
              </div>

              <div className={styles['form-group']}>
                <label htmlFor="password" className={styles['form-label']}>
                  <Icon icon="lucide:lock" className={styles['form-label-icon']} />
                  {t('auth.common.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={handlePasswordChange}
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

              {generalError && (
                <div className={styles['field-error']} style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  {generalError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || emailError || passwordError}
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
                state={{ fromLogin: true }}
                className={styles['register-link-text']}
              >
                {t('auth.login.registerNow')}
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
            
            <div className={styles['logo-wrapper']}>
              <img
                src="/logoKDBS.png"
                alt="KDBS Logo"
                className={styles['logo-image']}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Login; 
