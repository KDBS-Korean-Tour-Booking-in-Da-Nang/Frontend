import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
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
<<<<<<< HEAD
=======
import Forum from './pages/home/forum/forum';
>>>>>>> 16b403a115eb4988b627b539db4391a7ad4e6ea7

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
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
            </Routes>
          </main>
      </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
