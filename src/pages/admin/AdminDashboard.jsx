import { useState, useEffect } from 'react';
import { useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import Dashboard from './Dashboard/Dashboard';
import StaffManagement from './StaffManagement/StaffManagement';
import CompanyManagement from './CompanyManagement/CompanyManagement';
import UserManagement from './UserManagement/UserManagement';
import ReportManagement from './ReportManagement/ReportManagement';
import TourManagement from './TourManagement/TourManagement';
import ForumManagement from './ForumManagement/ForumManagement';
import CustomerContact from './CustomerContact/CustomerContact';

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Avoid flicker: wait for auth to resolve before role-checking
  if (loading) {
    return null;
  }

  // Check if user has admin role
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the admin dashboard. Only administrators can view this page.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go to Homepage
            </button>
            <button
              onClick={() => window.location.href = '/admin/login'}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Admin Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/company" element={<CompanyManagement />} />
        <Route path="/user" element={<UserManagement />} />
        <Route path="/report" element={<ReportManagement />} />
        <Route path="/tour" element={<TourManagement />} />
        <Route path="/forum" element={<ForumManagement />} />
        <Route path="/contact" element={<CustomerContact />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminDashboard;
