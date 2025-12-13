import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_ENDPOINTS, createAuthHeaders } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import {
  ClipboardList,
  AlertTriangle,
  Building2,
  MapPin,
  FileText,
  Ticket
} from 'lucide-react';
import articleService from '../../../services/articleService';
import { getAllComplaints } from '../../../services/bookingAPI';
import ForumReportManagement from './Components/ForumReportManagement/ForumReportManagement';
import CompanyManagement from './Components/CompanyManagement/CompanyManagement';
import TourApproval from './Components/TourApproval/TourApproval';
import ArticleManagement from './Components/ArticleManagement/ArticleManagement';
import BookingComplaint from './Components/BookingComplaint/BookingComplaint';
import ResolveTicket from './Components/ResolveTicket/ResolveTicket';

const pastelCardClasses = 'rounded-[28px] bg-white border shadow-sm';

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
            // Don't call checkAndHandle401 here to avoid premature logout in background loading
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
            // Don't call checkAndHandle401 here to avoid premature logout in background loading
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
        icon: AlertTriangle,
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
        icon: Building2,
        items
      });
    }

    if (canHandleTours) {
      sections.push({
        id: 'tour-section',
        title: t('staff.taskManagement.sidebar.sections.tour.title'),
        description: t('staff.taskManagement.sidebar.sections.tour.description'),
        icon: MapPin,
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
        icon: AlertTriangle,
        accent: 'bg-[#fff8ee]',
      });
      cards.push({
        id: 'complaint-card',
        label: t('staff.taskManagement.summaryCards.bookingComplaints.label'),
        value: bookingComplaintsCount,
        sublabel: t('staff.taskManagement.summaryCards.bookingComplaints.sublabel'),
        icon: AlertTriangle,
        accent: 'bg-[#fff0f0]',
      });
    }
    if (canHandleCompanyRequests) {
      cards.push({
        id: 'company-card',
        label: t('staff.taskManagement.summaryCards.companyRequests.label'),
        value: companyRequestsCount,
        sublabel: t('staff.taskManagement.summaryCards.companyRequests.sublabel'),
        icon: Building2,
        accent: 'bg-[#f3f7ff]',
      });
    }
    if (canHandleTours) {
      cards.push({
        id: 'tour-card',
        label: t('staff.taskManagement.summaryCards.pendingTours.label'),
        value: pendingToursCount,
        sublabel: t('staff.taskManagement.summaryCards.pendingTours.sublabel'),
        icon: MapPin,
        accent: 'bg-[#f0fcff]',
      });
    }
    if (canHandleArticles) {
      cards.push({
        id: 'article-card',
        label: t('staff.taskManagement.summaryCards.pendingArticles.label'),
        value: pendingArticlesCount,
        sublabel: t('staff.taskManagement.summaryCards.pendingArticles.sublabel'),
        icon: FileText,
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
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-10" style={{ backgroundColor: '#FAFAFA' }}>
      {error && (
        <div className="mb-4 px-4 py-3 rounded-[20px] text-sm max-w-7xl mx-auto" style={{ backgroundColor: '#FFE6F0', borderColor: '#FFB3B3', color: '#FF80B3', borderWidth: '1px', borderStyle: 'solid' }}>
          {error}
        </div>
      )}
      <div className="mx-auto max-w-7xl space-y-8">
        {!activeSection && (
          <div className={`${pastelCardClasses} p-8`} style={{ borderColor: '#F0F0F0' }}>
            <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: '#66B3FF' }}>{t('staff.taskManagement.dashboard.title')}</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-gray-800">{t('staff.taskManagement.dashboard.taskManagement')}</h1>
                <p className="mt-2 text-sm text-gray-500">{t('staff.taskManagement.dashboard.subtitle')}</p>
              </div>
              <div className="rounded-[24px] border px-5 py-3 text-sm" style={{ borderColor: '#E6F3FF', backgroundColor: '#E6F3FF', color: '#66B3FF' }}>
                <span className="font-semibold text-gray-800">{t('staff.taskManagement.dashboard.role')}</span> {user?.staffTask || user?.role}
              </div>
            </div>
          </div>
        )}

        {!hasAnyTaskPermission && (
          <div className={`${pastelCardClasses} flex flex-col items-center justify-center space-y-4 py-24 text-center`} style={{ borderColor: '#F0F0F0' }}>
            <ClipboardList className="h-16 w-16 text-gray-300" strokeWidth={1.5} />
            <h2 className="text-xl font-semibold text-gray-800">{t('staff.taskManagement.dashboard.noTasks.title')}</h2>
            <p className="max-w-md text-sm text-gray-500">
              {t('staff.taskManagement.dashboard.noTasks.description')}
            </p>
          </div>
        )}

        {hasAnyTaskPermission && (
          <div className="space-y-6">
            {!activeSection && summaryCards.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {summaryCards.map(card => {
                  const colorMap = {
                    'bg-[#fff8ee]': { bg: '#FFF4E6', iconColor: '#FFB84D', border: '#FFE5CC' },
                    'bg-[#fff0f0]': { bg: '#FFE6F0', iconColor: '#FF80B3', border: '#FFB3B3' },
                    'bg-[#f3f7ff]': { bg: '#E6F3FF', iconColor: '#66B3FF', border: '#CCE6FF' },
                    'bg-[#f0fcff]': { bg: '#E0F7FA', iconColor: '#4DD0E1', border: '#B2EBF2' },
                    'bg-[#f5f0ff]': { bg: '#F0E6FF', iconColor: '#B380FF', border: '#D9B3FF' }
                  };
                  const colors = colorMap[card.accent] || { bg: '#F5F5F5', iconColor: '#9CA3AF', border: '#E0E0E0' };
                  
                  return (
                    <div key={card.id} className={`${pastelCardClasses} flex items-center gap-4 px-6 py-5`} style={{ borderColor: colors.border, backgroundColor: colors.bg }}>
                      <div className="rounded-[24px] p-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                        <card.icon className="h-7 w-7" style={{ color: colors.iconColor }} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.35em] font-medium text-gray-600">{card.label}</p>
                        <p className="text-3xl font-semibold text-gray-800 mt-1">{card.value}</p>
                        <p className="text-sm text-gray-500 mt-1">{card.sublabel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeSection ? (
              renderActiveSection()
            ) : (
              <div className={`${pastelCardClasses} p-10 text-center`} style={{ borderColor: '#F0F0F0' }}>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('staff.taskManagement.dashboard.selectTask.title')}</h3>
                <p className="text-sm text-gray-500 max-w-2xl mx-auto">
                  {t('staff.taskManagement.dashboard.selectTask.description')}{' '}
                  <span className="font-semibold" style={{ color: '#66B3FF' }}> {t('staff.taskManagement.dashboard.selectTask.taskManagement')} </span>
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
