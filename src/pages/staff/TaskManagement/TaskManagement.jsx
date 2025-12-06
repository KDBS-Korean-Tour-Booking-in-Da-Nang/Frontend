import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_ENDPOINTS, createAuthHeaders } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import {
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  DocumentTextIcon,
  TicketIcon
} from '@heroicons/react/24/outline';
import articleService from '../../../services/articleService';
import { getAllComplaints } from '../../../services/bookingAPI';
import ForumReportManagement from './Components/ForumReportManagement/ForumReportManagement';
import CompanyManagement from './Components/CompanyManagement/CompanyManagement';
import TourApproval from './Components/TourApproval/TourApproval';
import ArticleManagement from './Components/ArticleManagement/ArticleManagement';
import BookingComplaint from './Components/BookingComplaint/BookingComplaint';
import ResolveTicket from './Components/ResolveTicket/ResolveTicket';

const pastelCardClasses = 'rounded-[28px] bg-white/95 border border-[#eceff7] shadow-[0_15px_45px_rgba(15,23,42,0.08)]';

const TaskManagement = () => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const [activeSection, setActiveSection] = useState(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  // Data for summary cards only
  const [forumReportsCount, setForumReportsCount] = useState(0);
  const [bookingComplaintsCount, setBookingComplaintsCount] = useState(0);
  const [companyRequestsCount, setCompanyRequestsCount] = useState(0);
  const [pendingToursCount, setPendingToursCount] = useState(0);
  const [pendingArticlesCount, setPendingArticlesCount] = useState(0);

  const canHandleForumReports = user?.staffTask === 'FORUM_REPORT_AND_BOOKING_COMPLAINT' || user?.role === 'ADMIN';
  const canHandleCompanyRequests = user?.staffTask === 'COMPANY_REQUEST_AND_RESOLVE_TICKET' || user?.role === 'ADMIN';
  const canHandleTours = user?.staffTask === 'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE' || user?.role === 'ADMIN';
  const canHandleArticles = user?.staffTask === 'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE' || user?.role === 'ADMIN';

  // Load summary data for dashboard
  const loadSummaryData = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        // No token available, skip loading
        return;
      }
      const headers = createAuthHeaders(token);

      // Load forum reports count
      if (canHandleForumReports) {
        try {
          const response = await fetch(`${API_ENDPOINTS.REPORTS_ADMIN_ALL}?page=0&size=1`, { headers });
          if (response.status === 401) {
            // Don't call checkAndHandle401 here to avoid logout loop
            // Just skip this data load
            return;
          }
          if (response.ok) {
            const data = await response.json();
            setForumReportsCount(data.totalElements || 0);
          }
        } catch (error) {
          // Silently handle error loading forum reports count
        }

        // Load booking complaints count
        try {
          // Don't auto redirect on 401 when called from background summary load
          const complaints = await getAllComplaints(false);
          const pending = Array.isArray(complaints) ? complaints.filter(c => !c.resolutionType) : [];
          setBookingComplaintsCount(pending.length);
        } catch (error) {
          // Don't log error if it's a 401 - it will be handled by the service
          // Silently handle error loading booking complaints count
        }
      }

      // Load company requests count
      if (canHandleCompanyRequests) {
        try {
          const response = await fetch(API_ENDPOINTS.USERS, { headers });
          if (response.status === 401) {
            // Don't call checkAndHandle401 here to avoid logout loop
            // Just skip this data load
            return;
          }
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
          // Silently handle error loading company requests count
        }
      }

      // Load pending tours count
      if (canHandleTours) {
        try {
          const response = await fetch(API_ENDPOINTS.TOURS, { headers });
          if (response.status === 401) {
            // Don't call checkAndHandle401 here to avoid logout loop
            // Just skip this data load
            return;
          }
          if (response.ok) {
            const tours = await response.json();
            const pending = tours.filter(t => t.tourStatus === 'NOT_APPROVED');
            setPendingToursCount(pending.length);
          }
        } catch (error) {
          // Silently handle error loading pending tours count
        }
      }

      // Load pending articles count
      if (canHandleArticles) {
        try {
          // Don't auto redirect on 401 when called from background summary load
          const articles = await articleService.getAllArticles(false);
          const pending = articles.filter(a =>
            a.articleStatus && a.articleStatus !== 'APPROVED'
          );
          setPendingArticlesCount(pending.length);
        } catch (error) {
          // Don't log error if it's a 401 - it will be handled by the service
          // Silently handle error loading pending articles count
        }
      }
    } catch (error) {
      // Don't log error if it's a 401 - it will be handled by the service
      // Silently handle error loading summary data
    }
  }, [canHandleForumReports, canHandleCompanyRequests, canHandleTours, canHandleArticles, getToken]);

  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  const sidebarSections = useMemo(() => {
    const sections = [];
    if (canHandleForumReports) {
      sections.push({
        id: 'forum-section',
        title: t('staff.taskManagement.sidebar.sections.forumComplaint.title'),
        description: t('staff.taskManagement.sidebar.sections.forumComplaint.description'),
        icon: ExclamationTriangleIcon,
        items: [
          {
            id: 'forum-reports',
            label: t('staff.taskManagement.sidebar.sections.forumComplaint.items.forumReports.label'),
            helper: t('staff.taskManagement.sidebar.sections.forumComplaint.items.forumReports.helper')
          },
          {
            id: 'booking-complaint',
            label: t('staff.taskManagement.sidebar.sections.forumComplaint.items.bookingComplaint.label'),
            helper: t('staff.taskManagement.sidebar.sections.forumComplaint.items.bookingComplaint.helper')
          }
        ]
      });
    }

    if (canHandleCompanyRequests || canHandleArticles) {
      const items = [];
      if (canHandleCompanyRequests) {
        items.push({
          id: 'company-management',
          label: t('staff.taskManagement.sidebar.sections.companyArticle.items.companyManagement.label'),
          helper: t('staff.taskManagement.sidebar.sections.companyArticle.items.companyManagement.helper')
        });
        items.push({
          id: 'resolve-ticket',
          label: t('staff.taskManagement.sidebar.sections.companyArticle.items.resolveTicket.label'),
          helper: t('staff.taskManagement.sidebar.sections.companyArticle.items.resolveTicket.helper')
        });
      }
      if (canHandleArticles) {
        items.push({
          id: 'article-management',
          label: t('staff.taskManagement.sidebar.sections.companyArticle.items.articleManagement.label'),
          helper: t('staff.taskManagement.sidebar.sections.companyArticle.items.articleManagement.helper')
        });
      }
      sections.push({
        id: 'company-article-section',
        title: t('staff.taskManagement.sidebar.sections.companyArticle.title'),
        description: t('staff.taskManagement.sidebar.sections.companyArticle.description'),
        icon: BuildingOfficeIcon,
        items
      });
    }

    if (canHandleTours) {
      sections.push({
        id: 'tour-section',
        title: t('staff.taskManagement.sidebar.sections.tour.title'),
        description: t('staff.taskManagement.sidebar.sections.tour.description'),
        icon: MapPinIcon,
        items: [
          {
            id: 'tour-approval',
            label: t('staff.taskManagement.sidebar.sections.tour.items.tourApproval.label'),
            helper: t('staff.taskManagement.sidebar.sections.tour.items.tourApproval.helper')
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
        label: t('staff.taskManagement.summaryCards.forumReports.label'),
        value: forumReportsCount,
        sublabel: t('staff.taskManagement.summaryCards.forumReports.sublabel'),
        icon: ExclamationTriangleIcon,
        accent: 'bg-[#fff8ee]',
      });
      cards.push({
        id: 'complaint-card',
        label: t('staff.taskManagement.summaryCards.bookingComplaints.label'),
        value: bookingComplaintsCount,
        sublabel: t('staff.taskManagement.summaryCards.bookingComplaints.sublabel'),
        icon: ExclamationTriangleIcon,
        accent: 'bg-[#fff0f0]',
      });
    }
    if (canHandleCompanyRequests) {
      cards.push({
        id: 'company-card',
        label: t('staff.taskManagement.summaryCards.companyRequests.label'),
        value: companyRequestsCount,
        sublabel: t('staff.taskManagement.summaryCards.companyRequests.sublabel'),
        icon: BuildingOfficeIcon,
        accent: 'bg-[#f3f7ff]',
      });
    }
    if (canHandleTours) {
      cards.push({
        id: 'tour-card',
        label: t('staff.taskManagement.summaryCards.pendingTours.label'),
        value: pendingToursCount,
        sublabel: t('staff.taskManagement.summaryCards.pendingTours.sublabel'),
        icon: MapPinIcon,
        accent: 'bg-[#f0fcff]',
      });
    }
    if (canHandleArticles) {
      cards.push({
        id: 'article-card',
        label: t('staff.taskManagement.summaryCards.pendingArticles.label'),
        value: pendingArticlesCount,
        sublabel: t('staff.taskManagement.summaryCards.pendingArticles.sublabel'),
        icon: DocumentTextIcon,
        accent: 'bg-[#f5f0ff]',
      });
    }
    return cards;
  }, [canHandleForumReports, canHandleCompanyRequests, canHandleTours, canHandleArticles, forumReportsCount, bookingComplaintsCount, companyRequestsCount, pendingToursCount, pendingArticlesCount]);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'forum-reports':
        return <ForumReportManagement />;
      case 'booking-complaint':
        return <BookingComplaint />;
      case 'company-management':
        return <CompanyManagement />;
      case 'resolve-ticket':
        return <ResolveTicket />;
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
            <p className="text-xs uppercase tracking-[0.5em] text-[#b1b5c9]">{t('staff.taskManagement.dashboard.title')}</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[#111827]">{t('staff.taskManagement.dashboard.taskManagement')}</h1>
                <p className="mt-2 text-sm text-[#6b7280]">{t('staff.taskManagement.dashboard.subtitle')}</p>
              </div>
              <div className="rounded-[24px] border border-[#eef2ff] bg-[#f9faff] px-5 py-3 text-sm text-[#4c4f69]">
                <span className="font-medium text-[#1f2937]">{t('staff.taskManagement.dashboard.role')}</span> {user?.staffTask || user?.role}
              </div>
            </div>
          </div>
        )}

        {!hasAnyTaskPermission && (
          <div className={`${pastelCardClasses} flex flex-col items-center justify-center space-y-4 py-24 text-center`}>
            <ClipboardDocumentListIcon className="h-16 w-16 text-[#dbe1f5]" />
            <h2 className="text-xl font-semibold text-[#111827]">{t('staff.taskManagement.dashboard.noTasks.title')}</h2>
            <p className="max-w-md text-sm text-[#6b7280]">
              {t('staff.taskManagement.dashboard.noTasks.description')}
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
                <h3 className="text-xl font-semibold text-[#111827] mb-2">{t('staff.taskManagement.dashboard.selectTask.title')}</h3>
                <p className="text-sm text-[#6b7280] max-w-2xl mx-auto">
                  {t('staff.taskManagement.dashboard.selectTask.description')}{' '}
                  <span className="font-semibold text-[#1d4ed8]"> {t('staff.taskManagement.dashboard.selectTask.taskManagement')} </span>
                  {t('staff.taskManagement.dashboard.selectTask.instruction')}
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
