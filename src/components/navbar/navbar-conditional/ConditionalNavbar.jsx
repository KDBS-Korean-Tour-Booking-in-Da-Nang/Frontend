import { useAuth } from '../../../contexts/AuthContext';
import Navbar from '../navbar-user/Navbar';
import BusinessNavbar from '../navbar-business/BusinessNavbar';

const ConditionalNavbar = () => {
  const { user } = useAuth();

  // Check if user has business role (COMPANY in backend)
  const isBusinessUser = user && (user.role === 'COMPANY' || user.role === 'company');

  // Return appropriate navbar based on user role
  if (isBusinessUser) {
    return <BusinessNavbar />;
  }

  // Default navbar for regular users, admins, staff
  return <Navbar />;
};

export default ConditionalNavbar;
