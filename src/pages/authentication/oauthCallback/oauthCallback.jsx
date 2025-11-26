import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';

const OAuthCallback = () => {
  const { t } = useTranslation();
  const { login, updateUser } = useAuth();
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

      // Resolve provider set prior to redirect
      const provider = localStorage.getItem('oauth_provider');
      // Clean temp provider flag
      localStorage.removeItem('oauth_provider');

      // Base user object from URL parameters (status may be missing here)
      const baseUser = {
        id: parseInt(userId),
        email: decodeURIComponent(email),
        role: role ? decodeURIComponent(role) : 'USER',
        name: username ? decodeURIComponent(username) : decodeURIComponent(email).split('@')[0],
        avatar: avatar ? decodeURIComponent(avatar) : null,
        balance: balance ? parseFloat(balance) : 0,
        authProvider: provider === 'GOOGLE' || provider === 'NAVER' ? provider : 'OAUTH'
      };

      // Login user with token first (to allow authenticated fetch)
      login(baseUser, decodedToken, rememberMe);

      // Try to enrich with latest role/status from backend
      (async () => {
        try {
          const meRes = await fetch('/api/users/me', {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${decodedToken}`
            }
          });
          
          // Handle 401 if token expired (unlikely in OAuth callback, but handle for safety)
          if (!meRes.ok && meRes.status === 401) {
            await checkAndHandle401(meRes);
            return; // Exit early if 401
          }
          
          if (meRes.ok) {
            const meData = await meRes.json();
            if ((meData.code === 1000 || meData.code === 0) && meData.result) {
              const enrichedUser = {
                id: meData.result.userId || baseUser.id,
                email: meData.result.email || baseUser.email,
                role: meData.result.role || baseUser.role,
                status: meData.result.status,
                name: meData.result.username || baseUser.name,
                avatar: meData.result.avatar || baseUser.avatar,
                balance: typeof meData.result.balance === 'number' ? meData.result.balance : baseUser.balance,
                authProvider: baseUser.authProvider
              };
              updateUser(enrichedUser);
            }
          }
        } catch {}
      })();
      
      // Show success toast
      showSuccess('toast.auth.login_success');
      
      // Navigate based on saved return path and role/status
      const returnAfterLogin = localStorage.getItem('returnAfterLogin');
      const currentUserRole = localStorage.getItem('user') ? (JSON.parse(localStorage.getItem('user')).role) : baseUser.role;
      const currentUserStatus = localStorage.getItem('user') ? (JSON.parse(localStorage.getItem('user')).status) : undefined;

      if ((currentUserRole === 'COMPANY' || currentUserRole === 'BUSINESS') && currentUserStatus === 'COMPANY_PENDING') {
        window.location.href = '/pending-page';
        return;
      }
      // Clear stale onboarding flags for non-pending users
      if (!((currentUserRole === 'COMPANY' || currentUserRole === 'BUSINESS') && currentUserStatus === 'COMPANY_PENDING')) {
        localStorage.removeItem('registration_intent');
        localStorage.removeItem('company_onboarding_pending');
      }
      if (returnAfterLogin) {
        localStorage.removeItem('returnAfterLogin');
        if (currentUserRole === 'COMPANY') {
          window.location.href = returnAfterLogin;
          return;
        }
        window.location.href = '/';
        return;
      }

      // Default navigation by role
      if (currentUserRole === 'COMPANY' || currentUserRole === 'BUSINESS') {
        window.location.href = '/company/dashboard';
      } else if (currentUserRole === 'ADMIN' || currentUserRole === 'STAFF') {
        window.location.href = '/admin';
      } else {
        // Regular user goes to homepage
        window.location.href = '/';
      }
      
    } catch (err) {
      // If there's an error, redirect to login with error
      navigate('/login?error=' + encodeURIComponent(t('oauth.failed', { message: err.message })), { replace: true });
    }
  }, [searchParams, login, navigate]);

  // Return null to prevent any rendering
  return null;
};

export default OAuthCallback;
