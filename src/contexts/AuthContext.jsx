import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getUserByEmail } from '../services/userService';
import { setLogoutCallback } from '../utils/apiErrorHandler';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef(null);
  const rememberRef = useRef(false);

  // Configurable timeouts
  const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 60 minutes
  const REMEMBER_ME_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

  const getStorageByRemember = (remember) => (remember ? localStorage : sessionStorage);

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const startInactivityTimer = () => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_LIMIT_MS);
  };

  const handleActivity = () => {
    // Only apply inactivity logic for non-remembered sessions
    if (!rememberRef.current && user) {
      startInactivityTimer();
    }
  };

  useEffect(() => {
    let mounted = true;
    let cleanupFn = null;

    // Use requestAnimationFrame to defer the initialization
    // This allows the UI to render first before running auth checks
    const rafId = requestAnimationFrame(() => {
      if (!mounted) return;

      // Force re-auth on frontend rebuild/restart: compare build session id
      try {
        const currentBuildId = (typeof __BUILD_SESSION_ID__ !== 'undefined') ? __BUILD_SESSION_ID__ : null;
        const lastBuildId = localStorage.getItem('last_build_session_id');
        if (currentBuildId && lastBuildId && currentBuildId !== lastBuildId) {
          // Different FE runtime detected → clear persisted auth to require login again
          try {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('accessToken');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
          } catch {}
        }
        if (currentBuildId && currentBuildId !== lastBuildId) {
          localStorage.setItem('last_build_session_id', currentBuildId);
        }
      } catch {}

      const remembered = localStorage.getItem('rememberMe') === 'true';
      rememberRef.current = remembered;

      // Read from both storages to allow cross-tab sharing
      const sessionUser = sessionStorage.getItem('user');
      const sessionToken = sessionStorage.getItem('token');
      const localUser = localStorage.getItem('user');
      const localToken = localStorage.getItem('token');
      // Prefer session-based values if present, else fall back to localStorage
      const savedUser = sessionUser || localUser;
      const token = sessionToken || localToken;

      // For remember me, also verify expiry
      if (remembered) {
        const expiry = localStorage.getItem('tokenExpiry');
        if (expiry && Date.now() > Number(expiry)) {
          // Expired - clear it
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        } else if (savedUser && token) {
          try {
            if (mounted) {
              setUser(JSON.parse(savedUser));
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      } else {
        if (savedUser && token) {
          try {
            const parsed = JSON.parse(savedUser);
            if (mounted) {
              setUser(parsed);
            }
            // If we loaded from localStorage (no session values yet), mirror to session for current tab session semantics
            if (!sessionUser || !sessionToken) {
              try {
                sessionStorage.setItem('user', JSON.stringify(parsed));
                sessionStorage.setItem('token', token);
              } catch {}
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      if (mounted) {
        setLoading(false);
      }

      // Setup activity listeners for inactivity logout (non-remembered only)
      const events = ['mousemove', 'keydown', 'click', 'touchstart'];
      events.forEach((evt) => window.addEventListener(evt, handleActivity));
      // Start timer if applicable
      if (!remembered && savedUser && token) {
        startInactivityTimer();
      }

      // Listen for auth changes across tabs
      const onStorage = (e) => {
        if (e.key === 'forceLogout' && e.newValue && mounted) {
          // Another tab triggered logout
          setUser(null);
          clearInactivityTimer();
          try {
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
          } catch {}
        }
        if (e.key === 'authLogin' && e.newValue && mounted) {
          // Another tab completed login or updated credentials
          const nowRemembered = localStorage.getItem('rememberMe') === 'true';
          rememberRef.current = nowRemembered;
          const sUser = sessionStorage.getItem('user');
          const sToken = sessionStorage.getItem('token');
          const lUser = localStorage.getItem('user');
          const lToken = localStorage.getItem('token');
          const nextUserStr = sUser || lUser;
          const nextToken = sToken || lToken;
          if (nextUserStr && nextToken) {
            try {
              const parsed = JSON.parse(nextUserStr);
              setUser(parsed);
              // Ensure current tab session mirrors state for non-remember sessions
              if (!nowRemembered) {
                try {
                  sessionStorage.setItem('user', JSON.stringify(parsed));
                  sessionStorage.setItem('token', nextToken);
                } catch {}
                startInactivityTimer();
              }
            } catch {}
          }
        }
      };
      window.addEventListener('storage', onStorage);

      // Store cleanup function
      cleanupFn = () => {
        events.forEach((evt) => window.removeEventListener(evt, handleActivity));
        window.removeEventListener('storage', onStorage);
        clearInactivityTimer();
      };
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, []);

  const login = (userData, token, remember = false) => {
    rememberRef.current = remember;
    const storage = getStorageByRemember(remember);
    setUser(userData);

    // Persist selections and data
    localStorage.setItem('rememberMe', remember ? 'true' : 'false');
    storage.setItem('user', JSON.stringify(userData));
    if (token) {
      storage.setItem('token', token);
      localStorage.setItem('accessToken', token); // For chat API
    }
    if (remember) {
      const expiryAt = Date.now() + REMEMBER_ME_EXPIRY_MS;
      localStorage.setItem('tokenExpiry', String(expiryAt));
    } else {
      localStorage.removeItem('tokenExpiry');
      // Ensure no stale persistent credentials remain
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch {}
      startInactivityTimer();
    }

    // Mirror state to sessionStorage for current tab; also persist to localStorage to allow other tabs to load
    try {
      sessionStorage.setItem('user', JSON.stringify(userData));
      if (token) sessionStorage.setItem('token', token);
      // Also always keep a copy in localStorage so new tabs can hydrate immediately
      localStorage.setItem('user', JSON.stringify(userData));
      if (token) localStorage.setItem('token', token);
      // Broadcast login to other tabs
      localStorage.setItem('authLogin', String(Date.now()));
      setTimeout(() => localStorage.removeItem('authLogin'), 0);
    } catch {}

    // Note: Navigation is handled by the component that calls login
    // No automatic redirects here to avoid page reloads
  };

  const logout = () => {
    setUser(null);
    // Clear from both storages to ensure full logout
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken'); // Clear chat token
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('rememberMe');
    } catch {}
    try {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
    } catch {}
    clearInactivityTimer();
    // Notify other tabs
    try {
      localStorage.setItem('forceLogout', String(Date.now()));
      // Cleanup the flag shortly after
      setTimeout(() => localStorage.removeItem('forceLogout'), 0);
    } catch {}
  };

  const updateUser = (userData) => {
    setUser(userData);
    const remembered = rememberRef.current;
    const storage = getStorageByRemember(remembered);
    storage.setItem('user', JSON.stringify(userData));
    // Mirror to both session and local storage so updates survive app restarts/new tabs
    try {
      sessionStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      // Notify other tabs about profile update
      localStorage.setItem('authLogin', String(Date.now()));
      setTimeout(() => localStorage.removeItem('authLogin'), 0);
    } catch {}
  };

  const getToken = () => {
    // Prefer sessionStorage if exists (non-remembered session), else fallback to localStorage
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;
    return localStorage.getItem('token');
  };

  const refreshUser = async () => {
    if (!user?.email) {
      return null;
    }

    try {
      const token = getToken();
      if (!token) {
        return null;
      }

      const userData = await getUserByEmail(user.email, token);
      if (userData) {
        const updatedUser = {
          ...user,
          username: userData.username || userData.name || user.username,
          name: userData.username || userData.name || user.name,
          phone: userData.phone || user.phone,
          dob: userData.dob || user.dob,
          gender: userData.gender || user.gender,
          address: userData.address || user.address,
          avatar: userData.avatar || user.avatar,
          status: userData.status || user.status,
          role: userData.role || user.role
        };
        updateUser(updatedUser);
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // If 401, logout will be handled by apiErrorHandler
      return null;
    }
  };

  // Register logout callback for API error handler
  useEffect(() => {
    setLogoutCallback(logout);
    return () => {
      setLogoutCallback(null);
    };
  }, [logout]);

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading,
    getToken,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 