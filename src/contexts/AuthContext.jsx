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
      // Check for role-specific storage first (ADMIN, STAFF), then fallback to legacy keys
      const sessionUser = sessionStorage.getItem('user_ADMIN') || sessionStorage.getItem('user_STAFF') || sessionStorage.getItem('user');
      const sessionToken = sessionStorage.getItem('token_ADMIN') || sessionStorage.getItem('token_STAFF') || sessionStorage.getItem('token');
      const localUser = localStorage.getItem('user_ADMIN') || localStorage.getItem('user_STAFF') || localStorage.getItem('user');
      const localToken = localStorage.getItem('token_ADMIN') || localStorage.getItem('token_STAFF') || localStorage.getItem('token');
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
                const role = parsed.role;
                const isAdminOrStaff = role === 'ADMIN' || role === 'STAFF';
                const userKey = isAdminOrStaff ? `user_${role}` : 'user';
                const tokenKey = isAdminOrStaff ? `token_${role}` : 'token';
                sessionStorage.setItem(userKey, JSON.stringify(parsed));
                sessionStorage.setItem(tokenKey, token);
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
        // Handle role-specific logout (ADMIN or STAFF)
        if (e.key && (e.key === 'forceLogout_ADMIN' || e.key === 'forceLogout_STAFF') && e.newValue && mounted) {
          const logoutRole = e.key.replace('forceLogout_', '');
          const currentUserRole = savedUser ? (() => {
            try {
              const parsed = JSON.parse(savedUser);
              return parsed.role;
            } catch {
              return null;
            }
          })() : null;
          
          // Only clear if the logout is for the current user's role
          if (currentUserRole === logoutRole) {
            setUser(null);
            clearInactivityTimer();
            try {
              const userKey = `user_${logoutRole}`;
              const tokenKey = `token_${logoutRole}`;
              sessionStorage.removeItem(userKey);
              sessionStorage.removeItem(tokenKey);
              localStorage.removeItem(userKey);
              localStorage.removeItem(tokenKey);
            } catch {}
          }
          // If different role, do nothing - let that role continue
        }
        // Handle general logout (backward compatibility for USER/COMPANY)
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
          // Check for role-specific storage first, then legacy
          const sUser = sessionStorage.getItem('user_ADMIN') || sessionStorage.getItem('user_STAFF') || sessionStorage.getItem('user');
          const sToken = sessionStorage.getItem('token_ADMIN') || sessionStorage.getItem('token_STAFF') || sessionStorage.getItem('token');
          const lUser = localStorage.getItem('user_ADMIN') || localStorage.getItem('user_STAFF') || localStorage.getItem('user');
          const lToken = localStorage.getItem('token_ADMIN') || localStorage.getItem('token_STAFF') || localStorage.getItem('token');
          const nextUserStr = sUser || lUser;
          const nextToken = sToken || lToken;
          if (nextUserStr && nextToken) {
            try {
              const parsed = JSON.parse(nextUserStr);
              setUser(parsed);
              // Ensure current tab session mirrors state for non-remember sessions
              if (!nowRemembered) {
                try {
                  const role = parsed.role;
                  const isAdminOrStaff = role === 'ADMIN' || role === 'STAFF';
                  const userKey = isAdminOrStaff ? `user_${role}` : 'user';
                  const tokenKey = isAdminOrStaff ? `token_${role}` : 'token';
                  sessionStorage.setItem(userKey, JSON.stringify(parsed));
                  sessionStorage.setItem(tokenKey, nextToken);
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

    // For ADMIN and STAFF, store data with role prefix to avoid conflicts
    const role = userData?.role;
    const isAdminOrStaff = role === 'ADMIN' || role === 'STAFF';
    const userKey = isAdminOrStaff ? `user_${role}` : 'user';
    const tokenKey = isAdminOrStaff ? `token_${role}` : 'token';

    // Persist selections and data
    localStorage.setItem('rememberMe', remember ? 'true' : 'false');
    
    if (remember) {
      // Remember me: store in localStorage
      localStorage.setItem(userKey, JSON.stringify(userData));
    if (token) {
        localStorage.setItem(tokenKey, token);
        localStorage.setItem('accessToken', token); // For chat API (shared)
    }
      const expiryAt = Date.now() + REMEMBER_ME_EXPIRY_MS;
      localStorage.setItem('tokenExpiry', String(expiryAt));
    } else {
      // Non-remember: store in sessionStorage, but also keep a copy in localStorage for cross-tab
      sessionStorage.setItem(userKey, JSON.stringify(userData));
      if (token) {
        sessionStorage.setItem(tokenKey, token);
        localStorage.setItem('accessToken', token); // For chat API (shared)
      }
      localStorage.removeItem('tokenExpiry');
      // Also keep a copy in localStorage so new tabs can hydrate immediately
      localStorage.setItem(userKey, JSON.stringify(userData));
      if (token) localStorage.setItem(tokenKey, token);
      startInactivityTimer();
    }

    // Mirror state for cross-tab sharing and backward compatibility
    try {
      // Also keep legacy keys for backward compatibility (USER, COMPANY)
      if (!isAdminOrStaff) {
        if (remember) {
          localStorage.setItem('user', JSON.stringify(userData));
          if (token) localStorage.setItem('token', token);
        } else {
      sessionStorage.setItem('user', JSON.stringify(userData));
      if (token) sessionStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      if (token) localStorage.setItem('token', token);
        }
      }
      // Broadcast login to other tabs
      localStorage.setItem('authLogin', String(Date.now()));
      setTimeout(() => localStorage.removeItem('authLogin'), 0);
    } catch {}

    // Note: Navigation is handled by the component that calls login
    // No automatic redirects here to avoid page reloads
  };

  const logout = (roleToLogout = null) => {
    // Get current role before clearing user state
    const currentRole = user?.role;
    const role = roleToLogout || currentRole;
    
    // Clear user state
    setUser(null);
    
    if (role === 'ADMIN' || role === 'STAFF') {
      // For ADMIN and STAFF, clear only role-specific storage
      const userKey = `user_${role}`;
      const tokenKey = `token_${role}`;
      
      try {
        // Clear role-specific storage
        localStorage.removeItem(userKey);
        localStorage.removeItem(tokenKey);
        sessionStorage.removeItem(userKey);
        sessionStorage.removeItem(tokenKey);
        
        // Clear shared settings (these are role-agnostic, but safe to clear)
        localStorage.removeItem('tokenExpiry');
        localStorage.removeItem('rememberMe');
        // Note: We don't clear 'accessToken' as it might be used by other roles
        
        clearInactivityTimer();
        // Notify other tabs of this role's logout
        try {
          localStorage.setItem(`forceLogout_${role}`, String(Date.now()));
          setTimeout(() => localStorage.removeItem(`forceLogout_${role}`), 0);
        } catch {}
      } catch {}
    } else {
      // For USER and COMPANY, or no role specified, clear legacy storage (backward compatibility)
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
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
      setTimeout(() => localStorage.removeItem('forceLogout'), 0);
    } catch {}
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    const remembered = rememberRef.current;
    const storage = getStorageByRemember(remembered);
    
    // For ADMIN and STAFF, store data with role prefix
    const role = userData?.role;
    const isAdminOrStaff = role === 'ADMIN' || role === 'STAFF';
    const userKey = isAdminOrStaff ? `user_${role}` : 'user';
    
    storage.setItem(userKey, JSON.stringify(userData));
    // Mirror to both session and local storage so updates survive app restarts/new tabs
    try {
      sessionStorage.setItem(userKey, JSON.stringify(userData));
      localStorage.setItem(userKey, JSON.stringify(userData));
      // Also keep legacy keys for backward compatibility (USER, COMPANY)
      if (!isAdminOrStaff) {
      sessionStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      }
      // Notify other tabs about profile update
      localStorage.setItem('authLogin', String(Date.now()));
      setTimeout(() => localStorage.removeItem('authLogin'), 0);
    } catch {}
  };

  const getToken = () => {
    // Prefer sessionStorage if exists (non-remembered session), else fallback to localStorage
    // Check for role-specific storage first (ADMIN, STAFF), then legacy keys
    // Also check current user role to get the right token
    if (user?.role === 'ADMIN') {
      const sessionToken = sessionStorage.getItem('token_ADMIN');
      if (sessionToken) return sessionToken;
      return localStorage.getItem('token_ADMIN');
    } else if (user?.role === 'STAFF') {
      const sessionToken = sessionStorage.getItem('token_STAFF');
      if (sessionToken) return sessionToken;
      return localStorage.getItem('token_STAFF');
    } else {
      // For USER/COMPANY or when user is null, check all possible keys
      const sessionToken = sessionStorage.getItem('token_ADMIN') || sessionStorage.getItem('token_STAFF') || sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;
      return localStorage.getItem('token_ADMIN') || localStorage.getItem('token_STAFF') || localStorage.getItem('token');
    }
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
        // IMPORTANT:
        //  - Cho phép backend trả về null/"" để xóa dữ liệu (phone, dob, gender, address, avatar, ...)
        //  - Vì vậy KHÔNG được dùng toán tử `||` vì nó sẽ fallback về giá trị cũ khi field = '' hoặc null
        //  - Thay vào đó, chỉ fallback khi field === undefined (không có trong response)
        const updatedUser = {
          ...user,
          // username / name: nếu backend không gửi thì giữ nguyên, còn nếu gửi (kể cả rỗng/null) thì dùng giá trị đó
          username:
            userData.username !== undefined
              ? (userData.username ?? userData.name ?? '')
              : user.username,
          name:
            userData.username !== undefined || userData.name !== undefined
              ? (userData.username ?? userData.name ?? '')
              : user.name,
          // Các field có thể bị xóa hoàn toàn
          phone: userData.phone !== undefined ? userData.phone : user.phone,
          dob: userData.dob !== undefined ? userData.dob : user.dob,
          gender: userData.gender !== undefined ? userData.gender : user.gender,
          address: userData.address !== undefined ? userData.address : user.address,
          avatar: userData.avatar !== undefined ? userData.avatar : user.avatar,
          status: userData.status !== undefined ? userData.status : user.status,
          role: userData.role !== undefined ? userData.role : user.role
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