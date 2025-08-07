import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Homepage from './pages/Homepage';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import Register from './pages/Register';
import BusinessInfo from './pages/BusinessInfo';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserProfile from './pages/UserProfile';
import Payment from './pages/Payment';
import AdminDashboard from './pages/AdminDashboard';

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
              <Route path="/business-info" element={<BusinessInfo />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </main>
      </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
