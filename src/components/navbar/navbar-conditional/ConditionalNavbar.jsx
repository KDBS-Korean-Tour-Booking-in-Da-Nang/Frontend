import { useLocation } from 'react-router-dom';
import Navbar from '../navbar-user/Navbar';
import NavbarCompany from '../navbar-company/NavbarCompany';
import { useAuth } from '../../../contexts/AuthContext';

const ConditionalNavbar = () => {
  const location = useLocation();
  const { loading, user } = useAuth();

  // Kiểm tra xem path hiện tại có phải là trang staff/admin không
  const isStaffAdminPage = location.pathname.startsWith('/staff/') || 
                          location.pathname.startsWith('/admin/');

  if (isStaffAdminPage) {
    return null;
  }

  // Chờ auth state resolve, giữ không gian để tránh layout shift
  if (loading) {
    return <div style={{ height: '64px' }} />;
  }

  // Chọn navbar dựa trên role: COMPANY dùng NavbarCompany, các role khác dùng Navbar
  if (user && user.role === 'COMPANY') {
    return <NavbarCompany />;
  }

  return <Navbar />;
};

export default ConditionalNavbar;
