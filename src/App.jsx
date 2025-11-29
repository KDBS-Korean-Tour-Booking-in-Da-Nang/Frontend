import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ChatProvider } from './contexts/ChatContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConditionalNavbar } from './components';
import Footer from './components/Footer/Footer';
import { useAuth } from './contexts/AuthContext';
import { setNavigateCallback } from './utils/apiErrorHandler';
import Homepage from './pages/home/homepage/homepage';
import Login from './pages/authentication/login/login';
import StaffLogin from './pages/authentication/staffLogin/staffLogin';
import AdminLogin from './pages/authentication/adminLogin/adminLogin';
import Register from './pages/authentication/register/register';
import VerifyEmail from './pages/authentication/verifyEmail/verifyEmail';
import OAuthCallback from './pages/authentication/oauthCallback/oauthCallback';
import CompanyInfo from './pages/company/companyInfo/companyInfo';
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
import BusinessDashboard from './pages/company/CompanyLayout';
import Dashboard from './pages/company/dashboard/Dashboard';
import VoucherManagement from './pages/company/vouchers/VoucherManagement';
import News from './pages/news/News';
import StaffDashboard from './pages/staff/StaffDashboard';
import NewsDetail from './pages/news/NewsDetail/NewsDetail';
import AboutUs from './pages/about/AboutUs';
import Contact from './pages/contact/Contact';
import BookingCheckPaymentPage from './pages/payment/BookingCheckPaymentPage/BookingCheckPaymentPage';
import PaymentResultPage from './pages/payment/PaymentResultPage/PaymentResultPage';
import TossPaymentPage from './pages/payment/TossPaymentPage/TossPaymentPage';
import { Error404, Error403, Error500, Error401 } from './pages/home/errorPages';


function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { showSuccess } = useToast();
  const [isPageReady, setIsPageReady] = useState(false);
  const processedToastRef = useRef(new Set());
  
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
  const isVoucherDetailPage = location.pathname === '/tour/voucher';
  const isVoucherListPage = location.pathname === '/tour/voucher-list';
  const isBookingHistoryPage = location.pathname === '/user/booking-history';
  // Error pages should not show footer
  const isErrorPage = location.pathname === '/error/404' || 
                      location.pathname === '/error/403' || 
                      location.pathname === '/error/500' ||
                      location.pathname === '/error/401';
  const authenticationPaths = [
    '/login',
    '/staff/login',
    '/admin/login',
    '/register',
    '/verify-email',
    '/google/callback',
    '/naver/callback',
    '/forgot-password',
    '/reset-password'
  ];
  const isAuthenticationPage = authenticationPaths.includes(location.pathname);
  
  // Footer should not show on staff/admin pages, company dashboard, forum, tour wizard, tour booking wizard, company info, voucher detail page, booking history, voucher list, authentication pages, or error pages
  const shouldShowFooter = !isStaffAdminPage 
    && !isBusinessDashboardPage 
    && !isForumPage 
    && !isTourWizardPage 
    && !isTourBookingWizardPage 
    && !isCompanyInfoPage 
    && !isVoucherDetailPage
    && !isVoucherListPage
    && !isBookingHistoryPage
    && !isAuthenticationPage
    && !isErrorPage;

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

  // Set navigate callback for apiErrorHandler
  useEffect(() => {
    setNavigateCallback(navigate);
    return () => {
      setNavigateCallback(null);
    };
  }, [navigate]);

  // Handle toast messages from navigation state
  useEffect(() => {
    const state = location.state;
    if (state?.message && state?.type === 'success') {
      // Create a unique key for this toast to prevent duplicates
      const toastKey = `${location.pathname}:${state.message}`;
      
      // Only show toast if we haven't processed this exact message for this path
      if (!processedToastRef.current.has(toastKey)) {
        processedToastRef.current.add(toastKey);
        showSuccess(state.message);
        
        // Clear the state immediately to prevent showing message again
        try {
          window.history.replaceState({}, document.title, location.pathname + location.search);
        } catch (error) {
          // Fallback: navigate without state if replaceState fails
          navigate(location.pathname, { replace: true, state: {} });
        }
        
        // Clean up the key after a delay to allow same message on different paths
        setTimeout(() => {
          processedToastRef.current.delete(toastKey);
        }, 1000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.state]); // Check both pathname and state

  // Global guard: lock COMPANY/BUSINESS with COMPANY_PENDING or WAITING_FOR_APPROVAL
  // If user has submitted documents (WAITING_FOR_APPROVAL), redirect to pending-page
  // If user hasn't submitted (COMPANY_PENDING), allow access to company-info to upload
  useEffect(() => {
    if (loading) return;
    const role = user?.role;
    const status = user?.status;
    const isCompanyRole = role === 'COMPANY' || role === 'BUSINESS';
    const isPending = status === 'COMPANY_PENDING';
    const isWaitingForApproval = status === 'WAITING_FOR_APPROVAL';
    const onCompanyInfoPage = location.pathname === '/company-info';
    const onPendingPage = location.pathname === '/pending-page';
    
    // If status is WAITING_FOR_APPROVAL, always redirect to pending-page
    if (isCompanyRole && isWaitingForApproval && !onPendingPage) {
      navigate('/pending-page', { replace: true });
      return;
    }
    
    // If status is COMPANY_PENDING, check if user has submitted documents
    if (isCompanyRole && isPending && !onCompanyInfoPage && !onPendingPage) {
      // Check if user has submitted documents (from localStorage as quick check)
      const email = user?.email || localStorage.getItem('userEmail');
      const hasSubmitted = email && localStorage.getItem(`businessUploadStatus:${email}`) === 'submitted';
      
      // If submitted, go to pending-page; otherwise allow company-info access
      // When user logs in again with COMPANY_PENDING, if they've submitted before, go to pending-page
      if (hasSubmitted) {
        navigate('/pending-page', { replace: true });
      } else {
        // Allow access to company-info to upload documents
        navigate('/company-info', { replace: true });
      }
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
                  <Route path="/company-info" element={<CompanyInfo />} />
                  <Route path="/pending-page" element={<PendingPage />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/user/booking-history" element={<BookingHistory />} />
                  <Route path="/user/booking" element={<BookingDetail />} />
                  <Route path="/booking/payment" element={<BookingCheckPaymentPage />} />
                  <Route path="/booking/payment/checkout" element={<TossPaymentPage />} />
                  <Route path="/transaction-result" element={<PaymentResultPage />} />
                  <Route path="/admin/*" element={<AdminDashboard />} />
                  <Route path="/forum" element={<Forum />} />
                  <Route path="/tour/voucher-list" element={<VoucherList />} />
                  <Route path="/tour/voucher" element={<VoucherDetailPage />} />
                  <Route path="/tour/booking" element={<TourBookingWizard />} />
                  <Route path="/tour/detail" element={<TourDetailPage />} />
                  <Route path="/tour" element={<Tour />} />
                  {/* Company Dashboard Routes */}
                  <Route path="/company" element={<BusinessDashboard />}> 
                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="tours" element={<TourManagement />} />
                    <Route path="tours/wizard" element={<TourWizard />} />
                    <Route path="tours/detail" element={<BusinessTourDetail />} />
                    <Route path="bookings" element={<BookingManagement />} />
                    <Route path="bookings/detail" element={<CompanyBookingDetailWizard />} />
                    <Route path="vouchers" element={<VoucherManagement />} />
                    {/** company-info route intentionally removed */}
                  </Route>
                  {/* News routes */}
                  <Route path="/news/detail" element={<NewsDetail />} />
                  <Route path="/news" element={<News />} />
                  {/* About & Contact routes */}
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/contact" element={<Contact />} />
                  {/* Staff routes */}
                  <Route path="/staff/*" element={<StaffDashboard />} />
                  {/* Error pages */}
                  <Route path="/error/404" element={<Error404 />} />
                  <Route path="/error/403" element={<Error403 />} />
                  <Route path="/error/500" element={<Error500 />} />
                  <Route path="/error/401" element={<Error401 />} />
                  {/* Catch-all route for 404 - must be last */}
                  <Route path="*" element={<Error404 />} />
        </Routes>
      </main>
      {shouldShowFooter && isPageReady && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
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
    </Provider>
  );
}

export default App;
