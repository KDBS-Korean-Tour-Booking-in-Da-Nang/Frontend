import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  AdminLayout,
  Dashboard,
  StaffManagement,
  CompanyManagement,
  UserManagement,
  CustomerManagement,
  ReportManagement,
  ForumManagement,
  ComplaintManagement,
  ResolveTicketManagement,
  CustomerContact,
  ArticleManagement,
  TransactionManagement
} from './';

// Lazy load components to avoid top-level import issues with useAuth
const ForumReportManagement = lazy(() => import('./ForumReportManagement/ForumReportManagement'));
const TourManagement = lazy(() => import('./TourManagement/TourManagement'));

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  // Avoid flicker: wait for auth to resolve before role-checking
  if (loading) {
    return null;
  }

  // Check if user has admin role
  if (!user || user.role !== 'ADMIN') {
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
          {/* Pastel Red Icon */}
          <div style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, #fce4e4 0%, #f8d4d4 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 4px 12px rgba(220, 120, 120, 0.15)'
          }}>
            <svg style={{ width: '32px', height: '32px', color: '#d88888' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <h2 style={{
            fontSize: '22px',
            fontWeight: '600',
            color: '#3d4852',
            marginBottom: '12px',
            letterSpacing: '-0.3px'
          }}>
            {t('admin.adminDashboard.accessDenied')}
          </h2>

          <p style={{
            fontSize: '15px',
            color: '#718096',
            marginBottom: '32px',
            lineHeight: '1.6'
          }}>
            {t('admin.adminDashboard.accessDeniedMessage')}
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
              {t('admin.adminDashboard.goToHomepage')}
            </button>
            <button
              onClick={() => window.location.href = '/admin/login'}
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
              {t('admin.adminDashboard.adminLogin')}
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
        <Route path="/tour" element={
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-gray-600">{t('admin.adminDashboard.loading')}</p></div></div>}>
            <TourManagement />
          </Suspense>
        } />
        <Route path="/forum" element={<ForumManagement />} />
        <Route path="/customers" element={<CustomerManagement />} />
        <Route path="/contact" element={<CustomerContact />} />
        <Route path="/article" element={<ArticleManagement />} />
        <Route path="/transactions" element={<TransactionManagement />} />
        <Route path="/complaints" element={<ComplaintManagement />} />
        <Route path="/resolve-tickets" element={<ResolveTicketManagement />} />
        <Route path="/forum-reports" element={
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-gray-600">{t('admin.adminDashboard.loading')}</p></div></div>}>
            <ForumReportManagement />
          </Suspense>
        } />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminDashboard;
