import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

/**
 * Error401 Component
 * Xử lý lỗi 401 Unauthorized bằng cách redirect về trang login
 * Không hiển thị trang riêng, chỉ redirect
 */
const Error401 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  useEffect(() => {
    // Clear any existing auth state
    logout();
    
    // Redirect to login with return path
    // Don't redirect if already on login page or error/401 page
    const currentPath = location.pathname;
    if (currentPath !== '/login' && currentPath !== '/error/401') {
      const returnPath = currentPath;
      navigate(`/login?returnAfterLogin=${encodeURIComponent(returnPath)}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate, location.pathname, logout]);

  // Return null while redirecting
  return null;
};

export default Error401;

