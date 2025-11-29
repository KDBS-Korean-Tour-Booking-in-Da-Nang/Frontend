import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_ENDPOINTS, createAuthHeaders } from '../../../config/api';
import {
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import articleService from '../../../services/articleService';
import ForumReportManagement from './Components/ForumReportManagement';
import CompanyManagement from './Components/CompanyManagement';
import TourApproval from './Components/TourApproval';
import ArticleManagement from './Components/ArticleManagement';

const pastelCardClasses = 'rounded-[28px] bg-white/95 border border-[#eceff7] shadow-[0_15px_45px_rgba(15,23,42,0.08)]';

const TaskManagement = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  // Data for summary cards only
  const [forumReportsCount, setForumReportsCount] = useState(0);
  const [companyRequestsCount, setCompanyRequestsCount] = useState(0);
  const [pendingToursCount, setPendingToursCount] = useState(0);
  const [pendingArticlesCount, setPendingArticlesCount] = useState(0);

  const canHandleForumReports = user?.staffTask === 'FORUM_REPORT' || user?.role === 'ADMIN';
  const canHandleCompanyRequests = user?.staffTask === 'COMPANY_REQUEST_AND_APPROVE_ARTICLE' || user?.role === 'ADMIN';
  const canHandleTours = user?.staffTask === 'APPROVE_TOUR_BOOKING' || user?.role === 'ADMIN';
  const canHandleArticles = user?.staffTask === 'COMPANY_REQUEST_AND_APPROVE_ARTICLE' || user?.role === 'ADMIN';

  // Load summary data for dashboard
  const loadSummaryData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = createAuthHeaders(token);

      // Load forum reports count
      if (canHandleForumReports) {
        try {
          const response = await fetch(`${API_ENDPOINTS.REPORTS_ADMIN_ALL}?page=0&size=1`, { headers });
          if (response.ok) {
            const data = await response.json();
            setForumReportsCount(data.totalElements || 0);
          }
        } catch (error) {
          console.error('Error loading forum reports count:', error);
        }
      }

      // Load company requests count
      if (canHandleCompanyRequests) {
        try {
          const response = await fetch(API_ENDPOINTS.USERS, { headers });
          if (response.ok) {
            const data = await response.json();
            const users = Array.isArray(data) ? data : (data.result || []);
            const pending = users.filter(u =>
              u.status === 'COMPANY_PENDING' &&
              (u.role === 'COMPANY' || u.role === 'BUSINESS')
            );
            setCompanyRequestsCount(pending.length);
          }
        } catch (error) {
          console.error('Error loading company requests count:', error);
        }
      }

      // Load pending tours count
      if (canHandleTours) {
        try {
          const response = await fetch(API_ENDPOINTS.TOURS, { headers });
          if (response.ok) {
            const tours = await response.json();
            const pending = tours.filter(t => t.tourStatus === 'NOT_APPROVED');
            setPendingToursCount(pending.length);
          }
        } catch (error) {
          console.error('Error loading pending tours count:', error);
        }
      }

      // Load pending articles count
      if (canHandleArticles) {
        try {
          const articles = await articleService.getAllArticles();
          const pending = articles.filter(a =>
            a.articleStatus && a.articleStatus !== 'APPROVED'
          );
          setPendingArticlesCount(pending.length);
        } catch (error) {
          console.error('Error loading pending articles count:', error);
        }
      }
    } catch (error) {
      console.error('Error loading summary data:', error);
    }
  }, [canHandleForumReports, canHandleCompanyRequests, canHandleTours, canHandleArticles]);

  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  const sidebarSections = useMemo(() => {
    const sections = [];
    if (canHandleForumReports) {
      sections.push({
        id: 'forum-section',
        title: 'Forum Task',
        description: 'Xử lý báo cáo từ diễn đàn',
        icon: ExclamationTriangleIcon,
        items: [
          {
            id: 'forum-reports',
            label: 'Forum Report Management',
            helper: 'Theo dõi và cập nhật báo cáo mới'
          }
        ]
      });
    }

    if (canHandleCompanyRequests || canHandleArticles) {
      const items = [];
      if (canHandleCompanyRequests) {
        items.push({
          id: 'company-management',
          label: 'Company Management',
          helper: 'Phê duyệt doanh nghiệp đăng ký'
        });
      }
      if (canHandleArticles) {
        items.push({
          id: 'article-management',
          label: 'Article Management',
          helper: 'Duyệt bài viết và tin tức'
        });
      }
      sections.push({
        id: 'company-article-section',
        title: 'Company & Article',
        description: 'Quản lý doanh nghiệp và bài viết',
        icon: BuildingOfficeIcon,
        items
      });
    }

    if (canHandleTours) {
      sections.push({
        id: 'tour-section',
        title: 'Tour Task',
        description: 'Kiểm duyệt tour mới',
        icon: MapPinIcon,
        items: [
          {
            id: 'tour-approval',
            label: 'Tour Approval',
            helper: 'Xem và phê duyệt tour chờ duyệt'
          }
        ]
      });
    }

    return sections;
  }, [canHandleForumReports, canHandleCompanyRequests, canHandleArticles, canHandleTours]);

  const sidebarItemsFlat = useMemo(() => sidebarSections.flatMap(section => section.items), [sidebarSections]);

  const sectionFromQuery = searchParams.get('section');

  useEffect(() => {
    if (sectionFromQuery && sidebarItemsFlat.find(item => item.id === sectionFromQuery)) {
      setActiveSection(sectionFromQuery);
    } else if (!sectionFromQuery) {
      setActiveSection(null);
    } else if (!sidebarItemsFlat.find(item => item.id === sectionFromQuery)) {
      setActiveSection(null);
    }
  }, [sectionFromQuery, sidebarItemsFlat]);

  const summaryCards = useMemo(() => {
    const cards = [];
    if (canHandleForumReports) {
      cards.push({
        id: 'forum-card',
        label: 'Forum Reports',
        value: forumReportsCount,
        sublabel: 'Báo cáo cần xử lý',
        icon: ExclamationTriangleIcon,
        accent: 'bg-[#fff8ee]',
      });
    }
    if (canHandleCompanyRequests) {
      cards.push({
        id: 'company-card',
        label: 'Company Requests',
        value: companyRequestsCount,
        sublabel: 'Đang chờ duyệt',
        icon: BuildingOfficeIcon,
        accent: 'bg-[#f3f7ff]',
      });
    }
    if (canHandleTours) {
      cards.push({
        id: 'tour-card',
        label: 'Pending Tours',
        value: pendingToursCount,
        sublabel: 'Tour chờ phê duyệt',
        icon: MapPinIcon,
        accent: 'bg-[#f0fcff]',
      });
    }
    if (canHandleArticles) {
      cards.push({
        id: 'article-card',
        label: 'Pending Articles',
        value: pendingArticlesCount,
        sublabel: 'Bài viết chưa duyệt',
        icon: DocumentTextIcon,
        accent: 'bg-[#f5f0ff]',
      });
    }
    return cards;
  }, [canHandleForumReports, canHandleCompanyRequests, canHandleTours, canHandleArticles, forumReportsCount, companyRequestsCount, pendingToursCount, pendingArticlesCount]);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'forum-reports':
        return <ForumReportManagement />;
      case 'company-management':
        return <CompanyManagement />;
      case 'tour-approval':
        return <TourApproval />;
      case 'article-management':
        return <ArticleManagement />;
      default:
        return null;
    }
  };

  const hasAnyTaskPermission = sidebarItemsFlat.length > 0;

  // For Article Management, dùng thẳng layout của NewsManagement (bg-gradient riêng)
  if (activeSection === 'article-management') {
    return <ArticleManagement />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#f6f7fb] to-[#fdfdfc] px-4 py-10 sm:px-6 lg:px-10">
      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#e11d48', borderRadius: '0.5rem', fontSize: '0.875rem', maxWidth: '1200px', margin: '0 auto 1rem' }}>
          {error}
        </div>
      )}
      <div className="mx-auto max-w-7xl space-y-8">
        {!activeSection && (
          <div className={`${pastelCardClasses} p-8`}>
            <p className="text-xs uppercase tracking-[0.5em] text-[#b1b5c9]">Staff Dashboard</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[#111827]">Task Management</h1>
                <p className="mt-2 text-sm text-[#6b7280]">Theo dõi và xử lý nhiệm vụ được phân công từ admin.</p>
              </div>
              <div className="rounded-[24px] border border-[#eef2ff] bg-[#f9faff] px-5 py-3 text-sm text-[#4c4f69]">
                <span className="font-medium text-[#1f2937]">Vai trò:</span> {user?.staffTask || user?.role}
              </div>
            </div>
          </div>
        )}

        {!hasAnyTaskPermission && (
          <div className={`${pastelCardClasses} flex flex-col items-center justify-center space-y-4 py-24 text-center`}>
            <ClipboardDocumentListIcon className="h-16 w-16 text-[#dbe1f5]" />
            <h2 className="text-xl font-semibold text-[#111827]">Hiện tại bạn chưa có nhiệm vụ</h2>
            <p className="max-w-md text-sm text-[#6b7280]">
              Khi admin phân công nhiệm vụ, các mục quản lý sẽ xuất hiện trong menu Task Management để bạn xử lý.
            </p>
          </div>
        )}

        {hasAnyTaskPermission && (
          <div className="space-y-6">
            {!activeSection && summaryCards.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {summaryCards.map(card => (
                  <div key={card.id} className={`${pastelCardClasses} flex items-center gap-4 px-6 py-5`}>
                    <div className={`rounded-3xl ${card.accent} p-3`}>
                      <card.icon className="h-6 w-6 text-[#475569]" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">{card.label}</p>
                      <p className="text-3xl font-semibold text-[#111827]">{card.value}</p>
                      <p className="text-sm text-[#6b7280]">{card.sublabel}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection ? (
              renderActiveSection()
            ) : (
              <div className={`${pastelCardClasses} p-10 text-center`}>
                <h3 className="text-xl font-semibold text-[#111827] mb-2">Chọn nhiệm vụ cần xử lý</h3>
                <p className="text-sm text-[#6b7280] max-w-2xl mx-auto">
                  Bảng thống kê cho bạn cái nhìn tổng quan. Để bắt đầu xử lý nhiệm vụ cụ thể, hãy mở menu
                  <span className="font-semibold text-[#1d4ed8]"> Task Management </span>
                  ở sidebar và chọn đúng mục nhiệm vụ được phân công.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskManagement;
