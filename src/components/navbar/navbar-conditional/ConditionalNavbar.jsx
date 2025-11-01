import { useLocation } from 'react-router-dom';
import Navbar from '../navbar-user/Navbar';
import { useAuth } from '../../../contexts/AuthContext';

const ConditionalNavbar = () => {
  const location = useLocation();
  const { loading } = useAuth();

  // Check if current path is staff/admin pages
  const isStaffAdminPage = location.pathname.startsWith('/staff/') || 
                          location.pathname.startsWith('/admin/');

  // Don't show navbar for staff/admin pages
  if (isStaffAdminPage) {
    return null;
  }

  // Wait until auth state resolves; keep space to avoid layout shift
  if (loading) {
    return <div style={{ height: '64px' }} />; // match pt-16 (4rem)
  }

  // Use unified navbar for all user types (USER, COMPANY, ADMIN, STAFF)
  // The navbar will handle role-specific features internally
  return <Navbar />;
};

export default ConditionalNavbar;
