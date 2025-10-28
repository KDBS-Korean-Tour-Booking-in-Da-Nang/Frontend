import { createContext, useContext, useState, useEffect, useRef } from 'react';

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

      const remembered = localStorage.getItem('rememberMe') === 'true';
      rememberRef.current = remembered;

      const storage = getStorageByRemember(remembered);
      const savedUser = storage.getItem('user');
      const token = storage.getItem('token');

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
            if (mounted) {
              setUser(JSON.parse(savedUser));
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

      // Listen for logout across tabs
      const onStorage = (e) => {
        if (e.key === 'forceLogout' && e.newValue && mounted) {
          // Another tab triggered logout
          setUser(null);
          clearInactivityTimer();
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
  };

  const getToken = () => {
    // Prefer sessionStorage if exists (non-remembered session), else fallback to localStorage
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;
    return localStorage.getItem('token');
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading,
    getToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 