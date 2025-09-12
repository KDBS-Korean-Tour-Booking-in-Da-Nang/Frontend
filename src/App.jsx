import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
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
import UserProfile from './pages/user/userProfile/userProfile';
import Payment from './pages/user/payment/payment';
import AdminDashboard from './pages/dashboard/adminDashboard/adminDashboard';
import Forum from './pages/home/forum/forum';
import Tour from './pages/tour/Tour';
import TourDetailPage from './pages/tour/TourDetailPage';
import BusinessTourList from './pages/business/tours/BusinessTourList';
import BusinessTourForm from './pages/business/tours/BusinessTourForm';
import BusinessTourDetail from './pages/business/tours/BusinessTourDetail';
import BusinessAnalytics from './pages/business/analytics/BusinessAnalytics';
import BusinessOrders from './pages/business/orders/BusinessOrders';

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <ConditionalNavbar />
            <main className="pt-16">
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
                <Route path="/payment" element={<Payment />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/tour" element={<Tour />} />
                <Route path="/tour/:id" element={<TourDetailPage />} />
                {/* Business-only routes */}
                <Route path="/business/tours" element={<BusinessTourList />} />
                <Route path="/business/tours/new" element={<BusinessTourForm />} />
                <Route path="/business/tours/:id/edit" element={<BusinessTourForm />} />
                <Route path="/business/tours/:id" element={<BusinessTourDetail />} />
                <Route path="/business/analytics" element={<BusinessAnalytics />} />
                <Route path="/business/orders" element={<BusinessOrders />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </Provider>
  );
}

export default App;
