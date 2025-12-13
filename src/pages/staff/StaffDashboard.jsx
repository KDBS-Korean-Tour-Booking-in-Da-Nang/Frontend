import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StaffLayout from './StaffLayout';
import CustomerContact from './CustomerContact/CustomerContact';
import TaskManagement from './TaskManagement/TaskManagement';
import ResolveTicketManagement from '../admin/ResolveTicketManagement/ResolveTicketManagement';

const StaffDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Avoid flicker on refresh: wait for auth to finish
  if (loading) {
    return null;
  }

  // Only allow STAFF role
  if (!user || user.role !== 'STAFF') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#FAFAFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '32px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
          padding: '48px 40px',
          textAlign: 'center',
          border: '1px solid #F0F0F0'
        }}>
          {/* Pastel Orange Icon */}
          <div style={{
            width: '72px',
            height: '72px',
            backgroundColor: '#FFF4E6',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            border: '1px solid #FFE5CC'
          }}>
            <svg style={{ width: '32px', height: '32px', color: '#FFB84D' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 style={{
            fontSize: '22px',
            fontWeight: '600',
            color: '#1a1a2e',
            marginBottom: '12px',
            letterSpacing: '-0.3px'
          }}>
            Access Denied
          </h2>

          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            marginBottom: '32px',
            lineHeight: '1.6'
          }}>
            Only staff members can access this dashboard.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                backgroundColor: '#66B3FF',
                color: '#ffffff',
                padding: '14px 24px',
                borderRadius: '24px',
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#4DA3FF';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#66B3FF';
              }}
            >
              Go to Homepage
            </button>
            <button
              onClick={() => navigate('/staff/login')}
              style={{
                width: '100%',
                backgroundColor: '#F5F5F5',
                color: '#4a5568',
                padding: '14px 24px',
                borderRadius: '24px',
                border: '1px solid #E0E0E0',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#E5E5E5';
                e.target.style.borderColor = '#D0D0D0';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#F5F5F5';
                e.target.style.borderColor = '#E0E0E0';
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


