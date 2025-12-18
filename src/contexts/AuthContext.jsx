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

  // Cấu hình timeout: giới hạn không hoạt động 60 phút cho session không nhớ, thời hạn remember me 14 ngày
  const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;
  const REMEMBER_ME_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

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

  // Xử lý hoạt động của user: chỉ áp dụng logic inactivity cho session không nhớ (non-remembered), reset timer khi có hoạt động
  const handleActivity = () => {
    if (!rememberRef.current && user) {
      startInactivityTimer();
    }
  };

  useEffect(() => {
    let mounted = true;
    let cleanupFn = null;

    // Sử dụng requestAnimationFrame để trì hoãn khởi tạo, cho phép UI render trước khi chạy auth checks, so sánh build session id để force re-auth khi frontend rebuild/restart
    const rafId = requestAnimationFrame(() => {
      if (!mounted) return;

      try {
        const currentBuildId = (typeof __BUILD_SESSION_ID__ !== 'undefined') ? __BUILD_SESSION_ID__ : null;
        const lastBuildId = localStorage.getItem('last_build_session_id');
        if (currentBuildId && lastBuildId && currentBuildId !== lastBuildId) {
          try {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('accessToken');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
          } catch {
            // Silently handle error
          }
        }
        if (currentBuildId && currentBuildId !== lastBuildId) {
          localStorage.setItem('last_build_session_id', currentBuildId);
        }
      } catch {
        // Silently handle error
      }

      const remembered = localStorage.getItem('rememberMe') === 'true';
      rememberRef.current = remembered;

      // Đọc từ cả sessionStorage và localStorage để cho phép chia sẻ cross-tab, ưu tiên role-specific storage (ADMIN, STAFF) trước rồi mới fallback về legacy keys
      const sessionUser = sessionStorage.getItem('user_ADMIN') || sessionStorage.getItem('user_STAFF') || sessionStorage.getItem('user');
      const sessionToken = sessionStorage.getItem('token_ADMIN') || sessionStorage.getItem('token_STAFF') || sessionStorage.getItem('token');
      const localUser = localStorage.getItem('user_ADMIN') || localStorage.getItem('user_STAFF') || localStorage.getItem('user');
      const localToken = localStorage.getItem('token_ADMIN') || localStorage.getItem('token_STAFF') || localStorage.getItem('token');
      const savedUser = sessionUser || localUser;
      const token = sessionToken || localToken;

      // Với remember me, kiểm tra thời hạn expiry
      if (remembered) {
        const expiry = localStorage.getItem('tokenExpiry');
        if (expiry && Date.now() > Number(expiry)) {
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
            // Silently handle error
          }
        }
      } else {
        if (savedUser && token) {
          try {
            const parsed = JSON.parse(savedUser);
            if (mounted) {
              setUser(parsed);
            }
            // Nếu load từ localStorage (chưa có session values), mirror sang sessionStorage để đảm bảo session semantics cho tab hiện tại
            if (!sessionUser || !sessionToken) {
              try {
                const role = parsed.role;
                const isAdminOrStaff = role === 'ADMIN' || role === 'STAFF';
                const userKey = isAdminOrStaff ? `user_${role}` : 'user';
                const tokenKey = isAdminOrStaff ? `token_${role}` : 'token';
                sessionStorage.setItem(userKey, JSON.stringify(parsed));
                sessionStorage.setItem(tokenKey, token);
              } catch {
                // Silently handle error
              }
            }
          } catch (e) {
            // Silently handle error
          }
        }
      }
      
      if (mounted) {
        setLoading(false);
      }

      // Thiết lập activity listeners cho inactivity logout (chỉ cho non-remembered sessions), lắng nghe mousemove, keydown, click, touchstart để reset timer
      const events = ['mousemove', 'keydown', 'click', 'touchstart'];
      events.forEach((evt) => window.addEventListener(evt, handleActivity));
      if (!remembered && savedUser && token) {
        startInactivityTimer();
      }

      // Lắng nghe auth changes across tabs để đồng bộ logout/login giữa các tab
      const onStorage = (e) => {
        // Xử lý role-specific logout (ADMIN hoặc STAFF) với key forceLogout_ADMIN hoặc forceLogout_STAFF
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
              sessionStorage.removeItem('chat_history');
            } catch {
              // Silently handle error
            }
          }
        }
        // Xử lý general logout (backward compatibility cho USER/COMPANY) với key forceLogout
        if (e.key === 'forceLogout' && e.newValue && mounted) {
          setUser(null);
          clearInactivityTimer();
          try {
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('chat_history');
          } catch {
            // Silently handle error
          }
        }
        // Xử lý authLogin event khi tab khác hoàn thành login hoặc cập nhật credentials
        if (e.key === 'authLogin' && e.newValue && mounted) {
          const nowRemembered = localStorage.getItem('rememberMe') === 'true';
          rememberRef.current = nowRemembered;
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
              // Đảm bảo tab hiện tại mirror state cho non-remember sessions
              if (!nowRemembered) {
                try {
                  const role = parsed.role;
                  const isAdminOrStaff = role === 'ADMIN' || role === 'STAFF';
                  const userKey = isAdminOrStaff ? `user_${role}` : 'user';
                  const tokenKey = isAdminOrStaff ? `token_${role}` : 'token';
                  sessionStorage.setItem(userKey, JSON.stringify(parsed));
                  sessionStorage.setItem(tokenKey, nextToken);
                } catch {
                  // Silently handle error
                }
                startInactivityTimer();
              }
            } catch {
              // Silently handle error
            }
          }
        }
      };
      window.addEventListener('storage', onStorage);

      // Lưu cleanup function để remove event listeners khi component unmount
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

  // Đăng nhập: lưu userData và token vào storage, với ADMIN/STAFF dùng role prefix để tránh conflict, remember me lưu vào localStorage với expiry 14 ngày, non-remember lưu vào sessionStorage và localStorage (để cross-tab), broadcast login event cho các tab khác, giữ legacy keys cho backward compatibility
  const login = (userData, token, remember = false) => {
    rememberRef.current = remember;
    const storage = getStorageByRemember(remember);
    setUser(userData);

    const role = userData?.role;
    const isAdminOrStaff = role === 'ADMIN' || role === 'STAFF';
    const userKey = isAdminOrStaff ? `user_${role}` : 'user';
    const tokenKey = isAdminOrStaff ? `token_${role}` : 'token';

    localStorage.setItem('rememberMe', remember ? 'true' : 'false');
    
    if (remember) {
      localStorage.setItem(userKey, JSON.stringify(userData));
    if (token) {
        localStorage.setItem(tokenKey, token);
        localStorage.setItem('accessToken', token);
    }
      const expiryAt = Date.now() + REMEMBER_ME_EXPIRY_MS;
      localStorage.setItem('tokenExpiry', String(expiryAt));
    } else {
      sessionStorage.setItem(userKey, JSON.stringify(userData));
      if (token) {
        sessionStorage.setItem(tokenKey, token);
        localStorage.setItem('accessToken', token);
      }
      localStorage.removeItem('tokenExpiry');
      localStorage.setItem(userKey, JSON.stringify(userData));
      if (token) localStorage.setItem(tokenKey, token);
      startInactivityTimer();
    }

    try {
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
      localStorage.setItem('authLogin', String(Date.now()));
      setTimeout(() => localStorage.removeItem('authLogin'), 0);
    } catch {
      // Silently handle error
    }
  };

  // Đăng xuất: xóa user state và storage, với ADMIN/STAFF chỉ xóa role-specific storage, với USER/COMPANY xóa legacy storage, xóa chat history và dispatch aiChatClear event, notify các tab khác qua localStorage event, clear inactivity timer
  const logout = (roleToLogout = null) => {
    const clearAiChat = () => {
      try {
        sessionStorage.removeItem('chat_history');
      } catch {
        // Silently handle error
      }
      try {
        window.dispatchEvent(new Event('aiChatClear'));
      } catch {
        // Silently handle error
      }
    };

    const currentRole = user?.role;
    const role = roleToLogout || currentRole;
    
    setUser(null);
    
    if (role === 'ADMIN' || role === 'STAFF') {
      const userKey = `user_${role}`;
      const tokenKey = `token_${role}`;
      
      try {
        localStorage.removeItem(userKey);
        localStorage.removeItem(tokenKey);
        sessionStorage.removeItem(userKey);
        sessionStorage.removeItem(tokenKey);
        localStorage.removeItem('tokenExpiry');
        localStorage.removeItem('rememberMe');
        clearAiChat();
        clearInactivityTimer();
        try {
          localStorage.setItem(`forceLogout_${role}`, String(Date.now()));
          setTimeout(() => localStorage.removeItem(`forceLogout_${role}`), 0);
        } catch {
          // Silently handle error
        }
      } catch {
        // Silently handle error
      }
    } else {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('rememberMe');
    } catch {
      // Silently handle error
    }
    try {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
    } catch {
      // Silently handle error
    }
    clearAiChat();
    clearInactivityTimer();
    try {
      localStorage.setItem('forceLogout', String(Date.now()));
      setTimeout(() => localStorage.removeItem('forceLogout'), 0);
    } catch {
      // Silently handle error
    }
    }
  };

  // Cập nhật thông tin user: lưu vào storage tương ứng (remembered => localStorage, non-remembered => sessionStorage), mirror sang cả hai storage để updates survive app restarts/new tabs, giữ legacy keys cho backward compatibility, notify các tab khác về profile update
  const updateUser = (userData) => {
    setUser(userData);
    const remembered = rememberRef.current;
    const storage = getStorageByRemember(remembered);
    
    const role = userData?.role;
    const isAdminOrStaff = role === 'ADMIN' || role === 'STAFF';
    const userKey = isAdminOrStaff ? `user_${role}` : 'user';
    
    storage.setItem(userKey, JSON.stringify(userData));
    try {
      sessionStorage.setItem(userKey, JSON.stringify(userData));
      localStorage.setItem(userKey, JSON.stringify(userData));
      if (!isAdminOrStaff) {
      sessionStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      }
      localStorage.setItem('authLogin', String(Date.now()));
      setTimeout(() => localStorage.removeItem('authLogin'), 0);
    } catch {
      // Silently handle error
    }
  };

  // Lấy token: ưu tiên sessionStorage (non-remembered session) rồi mới fallback localStorage, kiểm tra role-specific storage (ADMIN, STAFF) trước rồi mới legacy keys, kiểm tra role của user hiện tại để lấy đúng token
  const getToken = () => {
    if (user?.role === 'ADMIN') {
      const sessionToken = sessionStorage.getItem('token_ADMIN');
      if (sessionToken) return sessionToken;
      return localStorage.getItem('token_ADMIN');
    } else if (user?.role === 'STAFF') {
      const sessionToken = sessionStorage.getItem('token_STAFF');
      if (sessionToken) return sessionToken;
      return localStorage.getItem('token_STAFF');
    } else {
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
        // QUAN TRỌNG: cho phép backend trả về null/"" để xóa dữ liệu (phone, dob, gender, address, avatar), KHÔNG dùng toán tử `||` vì sẽ fallback về giá trị cũ khi field = '' hoặc null, chỉ fallback khi field === undefined (không có trong response)
        const updatedUser = {
          ...user,
          username:
            userData.username !== undefined
              ? (userData.username ?? userData.name ?? '')
              : user.username,
          name:
            userData.username !== undefined || userData.name !== undefined
              ? (userData.username ?? userData.name ?? '')
              : user.name,
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
      // Silently handle error, nếu 401 logout sẽ được xử lý bởi apiErrorHandler
      return null;
    }
  };

  // Đăng ký logout callback cho API error handler để tự động logout khi có 401 error
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