import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { getApiPath } from '../../../config/api';
import styles from './verifyEmail.module.css';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { login } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const email = location.state?.email;
  const role = location.state?.role;

  // Map error message from backend to i18n key for multi-language support
  const mapOTPErrorToI18nKey = (message) => {
    if (!message || message === 'null' || message === null || message === undefined || String(message).trim() === '') {
      return { i18nKey: 'toast.auth.wrong_otp', defaultMessage: 'Mã OTP không đúng. Vui lòng thử lại.' };
    }

    const originalMessage = String(message);
    const originalMsgLower = originalMessage.toLowerCase();

    if (originalMsgLower.includes('null')) {
      return { i18nKey: 'toast.auth.wrong_otp', defaultMessage: 'Mã OTP không đúng. Vui lòng thử lại.' };
    }

    let cleanMessage = originalMessage.trim();
    cleanMessage = cleanMessage.replace(/:\s*null\s*$/i, '').replace(/\s+null\s*$/i, '').trim();
    
    if (!cleanMessage || cleanMessage === 'null' || cleanMessage.toLowerCase() === 'null') {
      return { i18nKey: 'toast.auth.wrong_otp', defaultMessage: 'Mã OTP không đúng. Vui lòng thử lại.' };
    }

    const msg = cleanMessage.toLowerCase();

    if (
      msg.includes('failed to verify') ||
      msg.includes('verify email') ||
      msg.includes('verification failed') ||
      msg.includes('email verification failed')
    ) {
      if (originalMsgLower.includes('null')) {
        return { i18nKey: 'toast.auth.wrong_otp', defaultMessage: 'Mã OTP không đúng. Vui lòng thử lại.' };
      }
    }

    const otpKeywords = [
      'otp', 'code', 'verification code', 'invalid code',
      'mã otp', 'mã xác thực', 'otp không đúng', 'otp sai', 'mã không đúng', 'mã sai',
      'không đúng', 'sai mã', 'mã xác thực không đúng',
      'otp', '코드', '인증 코드', 'otp가 올바르지', 'otp가 틀렸', '코드가 올바르지'
    ];

    const hasOTPKeyword = otpKeywords.some(k => msg.includes(k));

    if (
      msg.includes('invalid otp') ||
      msg.includes('wrong otp') ||
      msg.includes('otp not match') ||
      msg.includes('otp incorrect') ||
      msg.includes('otp is incorrect') ||
      msg.includes('otp does not match') ||
      msg.includes('verification code is incorrect') ||
      msg.includes('verification code does not match') ||
      msg.includes('otp không đúng') ||
      msg.includes('otp sai') ||
      msg.includes('mã otp không đúng') ||
      msg.includes('mã xác thực không đúng') ||
      msg.includes('mã không đúng') ||
      msg.includes('sai mã') ||
      msg.includes('otp가 올바르지') ||
      msg.includes('otp가 틀렸') ||
      msg.includes('코드가 올바르지') ||
      msg.includes('인증 코드가 올바르지') ||
      hasOTPKeyword
    ) {
      return { i18nKey: 'toast.auth.wrong_otp', defaultMessage: 'Mã OTP không đúng. Vui lòng thử lại.' };
    }

    if (
      msg.includes('otp expired') ||
      msg.includes('otp has expired') ||
      msg.includes('verification code expired') ||
      msg.includes('otp đã hết hạn') ||
      msg.includes('mã đã hết hạn') ||
      msg.includes('otp가 만료') ||
      msg.includes('코드가 만료')
    ) {
      return { i18nKey: 'auth.verify.error', defaultMessage: 'Mã OTP đã hết hạn. Vui lòng thử lại.' };
    }

    return null;
  };

  // Initialize countdown timer for resend OTP
  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }
    
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


  // Handle verify email OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!otp.trim()) {
      setError(t('toast.required', { field: t('auth.common.otp') }) || 'OTP là bắt buộc');
      setLoading(false);
      return;
    }
    if (otp.length !== 6) {
      setError(t('auth.verify.error') || 'OTP phải có 6 chữ số');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiPath('/api/users/verify-email'), {
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
        setError('');
        showSuccess('toast.auth.email_verify_success');
        
        setTimeout(async () => {
          try {
            const email = sessionStorage.getItem('post_reg_email');
            const password = sessionStorage.getItem('post_reg_password');
            if (email && password) {
              const resp = await fetch(getApiPath('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              const data = await resp.json();
              if ((data.code === 1000 || data.code === 0) && data.result) {
                const token = data.result.token;
                const userObj = data.result.user ? {
                  id: data.result.user.userId,
                  email: data.result.user.email,
                  role: data.result.user.role,
                  status: data.result.user.status,
                  name: data.result.user.username,
                  avatar: data.result.user.avatar,
                  balance: data.result.user.balance
                } : null;
                if (userObj) {
                  login(userObj, token, false);
                  
                  if (role === 'business') {
                    navigate('/company-info', { replace: true, state: { type: 'success' } });
                  } else {
                    window.location.href = '/';
                  }
                  return;
                }
              }
            }
          } catch (err) {
          }
          
          if (role === 'business') {
            navigate('/company-info', { replace: true, state: { type: 'success' } });
          } else {
            window.location.href = '/';
          }
        }, 2000);
      } else {
        const mapped = mapOTPErrorToI18nKey(data.message);
        if (mapped) {
          setError(t(mapped.i18nKey) || mapped.defaultMessage);
        } else {
          const messageStr = String(data.message || '').trim();
          if (!messageStr || 
              messageStr === 'null' || 
              messageStr.toLowerCase() === 'null' ||
              messageStr.toLowerCase().endsWith(': null') ||
              messageStr.toLowerCase().endsWith(' null') ||
              messageStr.toLowerCase().includes(': null')) {
            setError(t('toast.auth.wrong_otp') || 'Mã OTP không đúng. Vui lòng thử lại.');
          } else {
            setError(messageStr);
          }
        }
        setLoading(false);
      }
    } catch (err) {
      setError(t('toast.auth.email_verify_failed') || 'Xác thực email thất bại');
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');

    if (!email || !email.trim()) {
      setError('Email là bắt buộc');
      setResendLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiPath('/api/users/regenerate-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          otpCode: '000000',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        setError(errorMessage);
        setResendLoading(false);
        return;
      }

      const data = await response.json();

      if ((data.code === 1000 || data.code === 0)) {
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
        setError('');
        showSuccess('toast.auth.otp_sent_success');
      } else {
        const errorMessage = (data.message && data.message !== 'null' && data.message !== null)
          ? data.message
          : ((data.error && data.error !== 'null' && data.error !== null)
            ? data.error
            : (t('toast.auth.otp_resend_failed') || 'Gửi lại OTP thất bại'));
        setError(errorMessage);
      }
    } catch (err) {
      setError(t('toast.auth.otp_resend_failed') || 'Gửi lại OTP thất bại');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="page-gradient">
      <div className={`${styles['verify-container']} min-h-screen flex items-center justify-center py-8`}>
        <div className={`${styles['verify-content']} w-full max-w-[450px] px-4`}>
          <div className={styles['verify-form-section']}>
            <div className={styles['verify-header']}>
            <div className={styles['verify-logo']}>
              <EnvelopeIcon className={styles['verify-icon']} strokeWidth={1.25} />
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
                <Icon icon="lucide:key" className={styles['form-label-icon']} />
                {t('auth.verify.label')}
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    if (error) {
                      setError('');
                    }
                  }}
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
    </div>
  );
};

export default VerifyEmail;
