import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ChatProvider } from './contexts/ChatContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConditionalNavbar, Footer, SupportTicketBubble, BubbleChatAI } from './components';
import { useAuth } from './contexts/AuthContext';
import { setNavigateCallback } from './utils/apiErrorHandler';
import { Homepage, BannedPage, PendingPage, Error404, Error403, Error500, Error401 } from './pages/home';
import { Login, StaffLogin, AdminLogin, Register, VerifyEmail, OAuthCallback, ForgotPassword, ResetPassword } from './pages/authentication';
import { CompanyInfo, BusinessDashboard, Dashboard, TourManagement, TourWizard, BusinessTourDetail, BookingManagement, CompanyBookingDetailWizard, VoucherManagement } from './pages/company';
import { UserProfile, BookingHistory, BookingDetail } from './pages/user';
import { AdminDashboard } from './pages/admin';
import { Forum } from './pages/forum';
import { Tour, TourDetailPage, TourBookingWizard, VoucherList, VoucherDetailPage } from './pages/tour';
import { Article, ArticleDetail } from './pages/article';
import { StaffDashboard } from './pages/staff';
import AboutUs from './pages/about/AboutUs';
import Contact from './pages/contact/Contact';
import { BookingCheckPaymentPage, PaymentResultPage, TossPaymentPage } from './pages/payment';


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

  // Check if forum page is accessed from admin/staff (via query params)
  const searchParams = new URLSearchParams(location.search);
  const fromAdmin = searchParams.get('fromAdmin') === 'true';
  const fromStaff = searchParams.get('fromStaff') === 'true';
  const isForumFromAdminStaff = location.pathname === '/forum' && (fromAdmin || fromStaff);

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
    location.pathname === '/error/401' ||
    location.pathname === '/banned';
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



  // Kiểm tra xem có nên hiển thị SupportTicketBubble hay không
  // Chỉ hiển thị ở trang home (/) và chỉ cho USER hoặc GUEST
  const shouldShowSupportTicketBubble = () => {
    if (loading) return false; // Đang load thì chưa hiển thị

    // Chỉ hiển thị ở trang home
    if (location.pathname !== '/') return false;

    // Nếu không có user (GUEST - không đăng nhập) thì hiển thị
    if (!user) return true;

    const role = user?.role;
    // Chỉ hiển thị cho USER
    return role === 'USER';
  };

  // Kiểm tra xem có nên hiển thị BubbleChatAI hay không
  // Chỉ hiển thị cho USER, COMPANY và GUEST (không đăng nhập)
  // Không hiển thị cho ADMIN và STAFF
  const shouldShowBubbleChatAI = () => {
    if (loading) return false;

    // Nếu không có user (GUEST - không đăng nhập) thì hiển thị
    if (!user) return true;

    const role = user?.role;
    // Chỉ hiển thị cho USER và COMPANY
    return role === 'USER' || role === 'COMPANY';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isStaffAdminPage && !isForumFromAdminStaff && <ConditionalNavbar />}
      <main className={isStaffAdminPage || isForumFromAdminStaff ? "" : "pt-16"}>
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
          {/* Article routes */}
          <Route path="/article/detail" element={<ArticleDetail />} />
          <Route path="/article" element={<Article />} />
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
          <Route path="/banned" element={<BannedPage />} />
          {/* Catch-all route for 404 - must be last */}
          <Route path="*" element={<Error404 />} />
        </Routes>
      </main>
      {shouldShowFooter && isPageReady && <Footer />}
      {!isStaffAdminPage && !isForumFromAdminStaff && shouldShowSupportTicketBubble() && <SupportTicketBubble />}
      {!isStaffAdminPage && !isForumFromAdminStaff && shouldShowBubbleChatAI() && <BubbleChatAI />}
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
