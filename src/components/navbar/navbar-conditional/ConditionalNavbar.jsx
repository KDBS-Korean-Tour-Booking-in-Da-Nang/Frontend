import { useLocation } from 'react-router-dom';
import Navbar from '../navbar-user/Navbar';

const ConditionalNavbar = () => {
  const location = useLocation();

  // Check if current path is staff/admin pages
  const isStaffAdminPage = location.pathname.startsWith('/staff/') || 
                          location.pathname.startsWith('/admin/');

  // Don't show navbar for staff/admin pages
  if (isStaffAdminPage) {
    return null;
  }

  // Use unified navbar for all user types (USER, COMPANY, ADMIN, STAFF)
  // The navbar will handle role-specific features internally
  return <Navbar />;
};

export default ConditionalNavbar;
