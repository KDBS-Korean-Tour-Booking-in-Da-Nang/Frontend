import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConditionalNavbar } from './components';
import Homepage from './pages/home/homepage/homepage';
import Login from './pages/authentication/login/login';
import StaffLogin from './pages/authentication/staffLogin/staffLogin';
import Register from './pages/authentication/register/register';
import VerifyEmail from './pages/authentication/verifyEmail/verifyEmail';
import OAuthCallback from './pages/authentication/oauthCallback/oauthCallback';
import BusinessInfo from './pages/business/businessInfo/businessInfo';
import PendingPage from './pages/home/pendingPage/pendingPage';
import ForgotPassword from './pages/authentication/forgotPassword/forgotPassword';
import ResetPassword from './pages/authentication/resetPassword/resetPassword';
import UserProfile from './pages/user/userProfile/UserProfile';
import BookingHistory from './pages/user/bookingHistory/BookingHistory';
import AdminDashboard from './pages/dashboard/adminDashboard/adminDashboard';
import Forum from './pages/forum/forum';
import Tour from './pages/tour/Tour';
import TourDetailPage from './pages/tour/TourDetailPage/TourDetailPage';
import TourBookingWizard from './pages/tour/TourBookingWizard/TourBookingWizard';
import VNPayPaymentPage from './pages/payment/VNPayPaymentPage/VNPayPaymentPage';
import VNPayReturnPage from './pages/payment/VNPayReturnPage/VNPayReturnPage';
import TransactionResultPage from './pages/payment/TransactionResultPage/TransactionResultPage';
import TourManagement from './pages/business/tours/tour-management/TourManagement';
import TourWizard from './pages/business/tours/wizard/TourWizard';
import BusinessTourDetail from './pages/business/tours/shared/BusinessTourDetail';
import BusinessAnalytics from './pages/business/analytics/BusinessAnalytics';
import BusinessOrders from './pages/business/orders/BusinessOrders';
import BusinessDashboard from './pages/business/BusinessDashboard';
import DashboardHome from './pages/business/DashboardHome';
import News from './pages/news/News';
import NewsManagement from './pages/staff/news-management/NewsManagement';
import NewsDetail from './pages/news/NewsDetail';

function AppContent() {
  const location = useLocation();
  
  // Check if current path is staff/admin pages
  const isStaffAdminPage = location.pathname.startsWith('/staff/') || 
                          location.pathname.startsWith('/admin/');

  return (
    <div className="min-h-screen bg-gray-50">
      <ConditionalNavbar />
      <main className={isStaffAdminPage ? "" : "pt-16"}>
        <Routes>
                  <Route path="/" element={<Homepage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/staff-login" element={<StaffLogin />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/google/callback" element={<OAuthCallback />} />
                  <Route path="/naver/callback" element={<OAuthCallback />} />
                  <Route path="/business-info" element={<BusinessInfo />} />
                  <Route path="/pending-page" element={<PendingPage />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/user/booking-history" element={<BookingHistory />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/forum" element={<Forum />} />
                  <Route path="/tour/:id" element={<TourDetailPage />} />
                  <Route path="/tour/:id/booking" element={<TourBookingWizard />} />
                  <Route path="/payment/vnpay" element={<VNPayPaymentPage />} />
                  <Route path="/api/vnpay/return" element={<VNPayReturnPage />} />
                  <Route path="/transaction-result" element={<TransactionResultPage />} />
                  <Route path="/tour" element={<Tour />} />
                  {/* Business Dashboard Routes */}
                  <Route path="/business" element={<BusinessDashboard />}>
                    <Route index element={<DashboardHome />} />
                    <Route path="dashboard" element={<DashboardHome />} />
                    <Route path="tours" element={<TourManagement />} />
                    <Route path="tours/wizard" element={<TourWizard />} />
                    <Route path="tours/:id" element={<BusinessTourDetail />} />
                    <Route path="analytics" element={<BusinessAnalytics />} />
                    <Route path="orders" element={<BusinessOrders />} />
                    <Route path="business-info" element={<BusinessInfo />} />
                  </Route>
                  {/* News routes */}
                  <Route path="/news" element={<News />} />
                  <Route path="/news/:id" element={<NewsDetail />} />
                  {/* Staff/Admin routes */}
                  <Route path="/staff/news-management" element={<NewsManagement />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </Provider>
  );
}

export default App;
