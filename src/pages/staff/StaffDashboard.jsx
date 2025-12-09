import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StaffLayout from './StaffLayout';
import CustomerContact from './CustomerContact/CustomerContact';
import TaskManagement from './TaskManagement/TaskManagement';
import ResolveTicketManagement from '../admin/ResolveTicketManagement/ResolveTicketManagement';

const StaffDashboard = () => {
  const { user, loading } = useAuth();

  // Avoid flicker on refresh: wait for auth to finish
  if (loading) {
    return null;
  }

  // Only allow STAFF role
  if (!user || user.role !== 'STAFF') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #fafbfc 0%, #f5f7fa 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
          padding: '48px 40px',
          textAlign: 'center',
          border: '1px solid rgba(0, 0, 0, 0.04)'
        }}>
          {/* Pastel Orange Icon */}
          <div style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, #fef3e2 0%, #fde8cc 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 4px 12px rgba(220, 160, 100, 0.15)'
          }}>
            <svg style={{ width: '32px', height: '32px', color: '#d4a574' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 style={{
            fontSize: '22px',
            fontWeight: '600',
            color: '#3d4852',
            marginBottom: '12px',
            letterSpacing: '-0.3px'
          }}>
            Access Denied
          </h2>

          <p style={{
            fontSize: '15px',
            color: '#718096',
            marginBottom: '32px',
            lineHeight: '1.6'
          }}>
            Only staff members can access this dashboard.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #7eb8e0 0%, #5ba3d4 100%)',
                color: '#ffffff',
                padding: '14px 24px',
                borderRadius: '14px',
                border: 'none',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(91, 163, 212, 0.25)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(91, 163, 212, 0.35)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(91, 163, 212, 0.25)';
              }}
            >
              Go to Homepage
            </button>
            <button
              onClick={() => window.location.href = '/staff/login'}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #e8eaed 0%, #dce0e5 100%)',
                color: '#4a5568',
                padding: '14px 24px',
                borderRadius: '14px',
                border: 'none',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
              }}
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
        <Route path="/tasks" element={<TaskManagement />} />
        <Route path="/contact" element={<CustomerContact />} />
        <Route path="/resolve-tickets" element={<ResolveTicketManagement />} />
        <Route path="*" element={<Navigate to="/staff/tasks" replace />} />
      </Routes>
    </StaffLayout>
  );
};

export default StaffDashboard;


