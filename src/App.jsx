import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ChatProvider } from './contexts/ChatContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConditionalNavbar } from './components';
import Footer from './components/Footer/Footer';
import { useAuth } from './contexts/AuthContext';
import Homepage from './pages/home/homepage/homepage';
import Login from './pages/authentication/login/login';
import StaffLogin from './pages/authentication/staffLogin/staffLogin';
import AdminLogin from './pages/authentication/adminLogin/adminLogin';
import Register from './pages/authentication/register/register';
import VerifyEmail from './pages/authentication/verifyEmail/verifyEmail';
import OAuthCallback from './pages/authentication/oauthCallback/oauthCallback';
// Removed direct access route for Company Info
import PendingPage from './pages/home/pendingPage/pendingPage';
import ForgotPassword from './pages/authentication/forgotPassword/forgotPassword';
import ResetPassword from './pages/authentication/resetPassword/resetPassword';
import UserProfile from './pages/user/userProfile/UserProfile';
import BookingHistory from './pages/user/bookingHistory/BookingHistory';
import BookingDetail from './pages/user/bookingDetail/BookingDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import Forum from './pages/forum/forum';
import Tour from './pages/tour/Tour';
import TourDetailPage from './pages/tour/TourDetailPage/TourDetailPage';
import TourBookingWizard from './pages/tour/TourBookingWizard/TourBookingWizard';
import VoucherList from './pages/tour/VoucherList/VoucherList';
import VoucherDetailPage from './pages/tour/VoucherDetailPage/VoucherDetailPage';
import TourManagement from './pages/company/tours/tour-management/TourManagement';
import TourWizard from './pages/company/tours/wizard/TourWizard';
import BusinessTourDetail from './pages/company/tours/shared/CompanyTourDetail';
import BookingManagement from './pages/company/bookings/BookingManagement';
import CompanyBookingDetailWizard from './pages/company/bookings/CompanyBookingDetailWizard';
import BusinessDashboard from './pages/company/CompanyDashboard';
import Dashboard from './pages/company/dashboard/Dashboard';
import VoucherManagement from './pages/company/vouchers/VoucherManagement';
import News from './pages/news/News';
import NewsManagement from './pages/staff/news-management/NewsManagement';
import StaffDashboard from './pages/staff/StaffDashboard';
import NewsDetail from './pages/news/NewsDetail';
import AboutUs from './pages/about/AboutUs';
import BookingCheckPaymentPage from './pages/payment/BookingCheckPaymentPage';
import PaymentResultPage from './pages/payment/PaymentResultPage';
import TossPaymentPage from './pages/payment/TossPaymentPage';


function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isPageReady, setIsPageReady] = useState(false);
  
  // Check if current path is staff/admin pages (include root paths)
  const isStaffAdminPage = location.pathname.startsWith('/staff') || 
                          location.pathname.startsWith('/admin');
  
  // Check if current path is company dashboard pages
  const isBusinessDashboardPage = location.pathname.startsWith('/company/');
  
  // Check if current path is forum or tour wizard pages
  const isForumPage = location.pathname === '/forum';
  const isTourWizardPage = location.pathname.startsWith('/company/tours/wizard');
  const isTourBookingWizardPage = location.pathname.includes('/booking');
  // Hide footer on company info pages as well
  const isCompanyInfoPage = location.pathname === '/company-info' ||
                            location.pathname.endsWith('/company/company-info');
  // Hide footer on voucher detail page
  const isVoucherDetailPage = location.pathname.startsWith('/tour/voucher/');
  
  // Footer should not show on staff/admin pages, company dashboard, forum, tour wizard, tour booking wizard, company info, or voucher detail page
  const shouldShowFooter = !isStaffAdminPage && !isBusinessDashboardPage && !isForumPage && !isTourWizardPage && !isTourBookingWizardPage && !isCompanyInfoPage && !isVoucherDetailPage;

  // Use useEffect to ensure page is ready before showing footer
  useEffect(() => {
    // Reset ready state when route changes
    setIsPageReady(false);
    
    // Use requestAnimationFrame with a small delay to wait for content to render
    const rafId = requestAnimationFrame(() => {
      // Add a small delay to ensure content is rendered
      setTimeout(() => {
        setIsPageReady(true);
      }, 100);
    });
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [location.pathname]);

  // Scroll to top on route change to avoid landing mid-page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname]);

  // Global guard: lock COMPANY/BUSINESS with COMPANY_PENDING to Pending Page
  useEffect(() => {
    if (loading) return;
    const role = user?.role;
    const status = user?.status;
    const isCompanyRole = role === 'COMPANY' || role === 'BUSINESS';
    const isPending = status === 'COMPANY_PENDING';
    const onPendingPage = location.pathname === '/pending-page';

    if (isCompanyRole && isPending && !onPendingPage) {
      navigate('/pending-page', { replace: true });
      return;
    }
  }, [user, loading, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      {!isStaffAdminPage && <ConditionalNavbar />}
      <main className={isStaffAdminPage ? "" : "pt-16"}>
        <Routes>
                  <Route path="/" element={<Homepage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/staff/login" element={<StaffLogin />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/google/callback" element={<OAuthCallback />} />
                  <Route path="/naver/callback" element={<OAuthCallback />} />
                  {/** Removed /company-info route to disable direct access */}
                  <Route path="/pending-page" element={<PendingPage />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/user/booking-history" element={<BookingHistory />} />
                  <Route path="/user/booking/:id" element={<BookingDetail />} />
                  <Route path="/booking/:bookingId/payment" element={<BookingCheckPaymentPage />} />
                  <Route path="/booking/:bookingId/payment/checkout" element={<TossPaymentPage />} />
                  <Route path="/transaction-result" element={<PaymentResultPage />} />
                  <Route path="/admin/*" element={<AdminDashboard />} />
                  <Route path="/forum" element={<Forum />} />
                  <Route path="/tour/voucher-list" element={<VoucherList />} />
                  <Route path="/tour/voucher/:id" element={<VoucherDetailPage />} />
                  <Route path="/tour/:id" element={<TourDetailPage />} />
                  <Route path="/tour/:id/booking" element={<TourBookingWizard />} />
                  <Route path="/tour" element={<Tour />} />
                  {/* Company Dashboard Routes */}
                  <Route path="/company" element={<BusinessDashboard />}> 
                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="tours" element={<TourManagement />} />
                    <Route path="tours/wizard" element={<TourWizard />} />
                    <Route path="tours/:id" element={<BusinessTourDetail />} />
                    <Route path="bookings" element={<BookingManagement />} />
                    <Route path="bookings/:id" element={<CompanyBookingDetailWizard />} />
                    <Route path="vouchers" element={<VoucherManagement />} />
                    {/** company-info route intentionally removed */}
                  </Route>
                  {/* News routes */}
                  <Route path="/news" element={<News />} />
                  <Route path="/news/:id" element={<NewsDetail />} />
                  {/* About Us route */}
                  <Route path="/about" element={<AboutUs />} />
                  {/* Staff routes */}
                  <Route path="/staff/*" element={<StaffDashboard />} />
        </Routes>
      </main>
      {shouldShowFooter && isPageReady && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ChatProvider>
              <NotificationProvider>
                <Router>
                  <AppContent />
                </Router>
              </NotificationProvider>
            </ChatProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
