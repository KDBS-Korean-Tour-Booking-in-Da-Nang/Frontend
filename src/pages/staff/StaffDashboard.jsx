import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StaffLayout from './StaffLayout';
import NewsManagement from '../staff/news-management/NewsManagement';

const StaffDashboard = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Avoid flicker on refresh: wait for auth to finish
  if (loading) {
    return null;
  }

  // Only allow STAFF role
  if (!user || user.role !== 'STAFF') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Only staff members can access this dashboard.</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go to Homepage
            </button>
            <button
              onClick={() => window.location.href = '/staff-login'}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Staff Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StaffLayout>
      <Routes>
        <Route path="/news-management" element={<NewsManagement />} />
        <Route path="*" element={<Navigate to="/staff/news-management" replace />} />
      </Routes>
    </StaffLayout>
  );
};

export default StaffDashboard;


