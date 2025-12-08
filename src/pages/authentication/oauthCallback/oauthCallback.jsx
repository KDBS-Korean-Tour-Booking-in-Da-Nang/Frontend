import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const OAuthCallback = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  // Handle OAuth callback: get info from URL and login user
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    const error = searchParams.get('error');
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const username = searchParams.get('username');
    const role = searchParams.get('role');
    const avatar = searchParams.get('avatar');
    const balance = searchParams.get('balance');

    if (error) {
      navigate('/login?error=' + encodeURIComponent(error), { replace: true });
      return;
    }

    if (!token || !userId || !email) {
      navigate('/login?error=' + encodeURIComponent(t('oauth.missingInfo')), { replace: true });
      return;
    }

    try {
      const decodedToken = decodeURIComponent(token);
      const rememberMe = localStorage.getItem('oauth_remember_me') === 'true';
      localStorage.removeItem('oauth_remember_me');

      localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');

      if (rememberMe) {
        localStorage.setItem('token', decodedToken);
        const expiryAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
        localStorage.setItem('tokenExpiry', String(expiryAt));
      } else {
        sessionStorage.setItem('token', decodedToken);
        localStorage.removeItem('tokenExpiry');
      }

      const provider = localStorage.getItem('oauth_provider');
      localStorage.removeItem('oauth_provider');

      const baseUser = {
        id: parseInt(userId),
        email: decodeURIComponent(email),
        role: role ? decodeURIComponent(role) : 'USER',
        name: username ? decodeURIComponent(username) : decodeURIComponent(email).split('@')[0],
        avatar: avatar ? decodeURIComponent(avatar) : null,
        balance: balance ? parseFloat(balance) : 0,
        authProvider: provider === 'GOOGLE' || provider === 'NAVER' ? provider : 'OAUTH'
      };

      login(baseUser, decodedToken, rememberMe);
      
      const currentUserRole = baseUser.role;
      const currentUserStatus = undefined;
      
      if (!((currentUserRole === 'COMPANY' || currentUserRole === 'BUSINESS') && currentUserStatus === 'COMPANY_PENDING')) {
        localStorage.removeItem('registration_intent');
        localStorage.removeItem('company_onboarding_pending');
      }
      
      const savedUser = localStorage.getItem('user');
      let finalStatus = currentUserStatus;
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          finalStatus = parsed.status;
        } catch (err) {
        }
      }
      
      if ((currentUserRole === 'COMPANY' || currentUserRole === 'BUSINESS') && finalStatus === 'COMPANY_PENDING') {
        window.location.href = '/pending-page';
        return;
      }
      
      const returnAfterLogin = localStorage.getItem('returnAfterLogin');
      if (returnAfterLogin) {
        localStorage.removeItem('returnAfterLogin');
        if (currentUserRole === 'COMPANY') {
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
      if (currentUserRole === 'COMPANY' || currentUserRole === 'BUSINESS') {
        targetPath = '/company/dashboard';
      } else if (currentUserRole === 'ADMIN' || currentUserRole === 'STAFF') {
        targetPath = '/admin';
      }
      
      navigate(targetPath, { 
        replace: true,
        state: { message: 'toast.auth.login_success', type: 'success' }
      });
      
    } catch (err) {
      navigate('/login?error=' + encodeURIComponent(t('oauth.failed', { message: err.message })), { replace: true });
    }
  }, [searchParams, login, navigate]);

  return null;
};

export default OAuthCallback;
