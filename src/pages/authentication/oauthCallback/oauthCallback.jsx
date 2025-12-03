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

      // Login user with token - user info from URL parameters is sufficient
      // No need to call additional API endpoints during login flow
      login(baseUser, decodedToken, rememberMe);
      
      // Clear stale onboarding flags for non-pending users
      const currentUserRole = baseUser.role;
      const currentUserStatus = undefined; // Status not available from URL params
      
      if (!((currentUserRole === 'COMPANY' || currentUserRole === 'BUSINESS') && currentUserStatus === 'COMPANY_PENDING')) {
        localStorage.removeItem('registration_intent');
        localStorage.removeItem('company_onboarding_pending');
      }
      
      // Navigate immediately and show toast on the new page
      // Check for pending status from localStorage if available
      const savedUser = localStorage.getItem('user');
      let finalStatus = currentUserStatus;
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          finalStatus = parsed.status;
        } catch {}
      }
      
      if ((currentUserRole === 'COMPANY' || currentUserRole === 'BUSINESS') && finalStatus === 'COMPANY_PENDING') {
        // Use window.location.href for pending-page to ensure full page reload
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

      // Default navigation by role - use navigate to avoid page reload
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
      // If there's an error, redirect to login with error
      navigate('/login?error=' + encodeURIComponent(t('oauth.failed', { message: err.message })), { replace: true });
    }
  }, [searchParams, login, navigate]);

  // Return null to prevent any rendering
  return null;
};

export default OAuthCallback;
