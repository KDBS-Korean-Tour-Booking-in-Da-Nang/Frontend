import { useAuth } from '../../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import Navbar from '../navbar-user/Navbar';
import BusinessNavbar from '../navbar-business/BusinessNavbar';

const ConditionalNavbar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Check if current path is staff/admin pages
  const isStaffAdminPage = location.pathname.startsWith('/staff/') || 
                          location.pathname.startsWith('/admin/');

  // Don't show navbar for staff/admin pages
  if (isStaffAdminPage) {
    return null;
  }

  // Check if user has business role (COMPANY in backend)
  const isBusinessUser = user && user.role === 'COMPANY';

  // Return appropriate navbar based on user role
  if (isBusinessUser) {
    return <BusinessNavbar />;
  }

  // Default navbar for regular users, admins, staff
  return <Navbar />;
};

export default ConditionalNavbar;
