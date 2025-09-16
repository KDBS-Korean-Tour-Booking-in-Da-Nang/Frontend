import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';

const OAuthCallback = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { showSuccess } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    // Get URL parameters
    const error = searchParams.get('error');
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const username = searchParams.get('username');
    const role = searchParams.get('role');
    const avatar = searchParams.get('avatar');
    const isPremium = searchParams.get('isPremium');
    const balance = searchParams.get('balance');

    // If there's an error, redirect to login with error
    if (error) {
      navigate('/login?error=' + encodeURIComponent(error), { replace: true });
      return;
    }

    // If missing required parameters, redirect to login with error
    if (!token || !userId || !email) {
      navigate('/login?error=' + encodeURIComponent(t('oauth.missingInfo')), { replace: true });
      return;
    }

    try {
      const decodedToken = decodeURIComponent(token);
      const rememberMe = localStorage.getItem('oauth_remember_me') === 'true';
      // Clean temp flag
      localStorage.removeItem('oauth_remember_me');

      // Persist remember choice globally for future loads
      localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');

      // Store token in appropriate storage
      if (rememberMe) {
        localStorage.setItem('token', decodedToken);
        const expiryAt = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days
        localStorage.setItem('tokenExpiry', String(expiryAt));
      } else {
        sessionStorage.setItem('token', decodedToken);
        localStorage.removeItem('tokenExpiry');
      }

      // Create user object from URL parameters
      const user = {
        id: parseInt(userId),
        email: decodeURIComponent(email),
        role: role ? decodeURIComponent(role) : 'USER',
        name: username ? decodeURIComponent(username) : decodeURIComponent(email).split('@')[0],
        avatar: avatar ? decodeURIComponent(avatar) : null,
        isPremium: isPremium === 'true',
        balance: balance ? parseFloat(balance) : 0
      };

      // Login user
      login(user, decodedToken, rememberMe);
      
      // Show success toast
      showSuccess('Đăng nhập thành công!');
      
      // Redirect nội bộ để tránh reload toàn bộ app
      navigate('/', { replace: true });
      
    } catch (err) {
      // If there's an error, redirect to login with error
      navigate('/login?error=' + encodeURIComponent(t('oauth.failed', { message: err.message })), { replace: true });
    }
  }, [searchParams, login, navigate]);

  // Return null to prevent any rendering
  return null;
};

export default OAuthCallback;
