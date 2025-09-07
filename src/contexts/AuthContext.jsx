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
    const remembered = localStorage.getItem('rememberMe') === 'true';
    rememberRef.current = remembered;

    const storage = getStorageByRemember(remembered);
    const savedUser = storage.getItem('user');
    const token = storage.getItem('token');

    // For remember me, also verify expiry
    if (remembered) {
      const expiry = localStorage.getItem('tokenExpiry');
      if (expiry && Date.now() > Number(expiry)) {
        // Expired
        logout();
      } else if (savedUser && token) {
        setUser(JSON.parse(savedUser));
      }
    } else {
      if (savedUser && token) {
        setUser(JSON.parse(savedUser));
      }
    }
    setLoading(false);

    // Setup activity listeners for inactivity logout (non-remembered only)
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, handleActivity));
    // Start timer if applicable
    if (!remembered && savedUser && token) {
      startInactivityTimer();
    }

    // Listen for logout across tabs
    const onStorage = (e) => {
      if (e.key === 'forceLogout' && e.newValue) {
        // Another tab triggered logout
        setUser(null);
        clearInactivityTimer();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      window.removeEventListener('storage', onStorage);
      clearInactivityTimer();
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

    // Handle return after login
    const returnAfterLogin = localStorage.getItem('returnAfterLogin');
    if (returnAfterLogin) {
      localStorage.removeItem('returnAfterLogin');
      // Use setTimeout to ensure the login state is updated before navigation
      setTimeout(() => {
        window.location.href = returnAfterLogin;
      }, 100);
    }
  };

  const logout = () => {
    setUser(null);
    // Clear from both storages to ensure full logout
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
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