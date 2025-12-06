import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  UserCircleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  LifebuoyIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const StaffLayout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [taskMenuOpen, setTaskMenuOpen] = useState(true);
  const languageRef = useRef(null);
  const userRef = useRef(null);

  const isAdmin = user?.role === 'ADMIN';
  const taskMenuItems = useMemo(() => {
    const items = [];
    if (user?.staffTask === 'FORUM_REPORT_AND_BOOKING_COMPLAINT' || isAdmin) {
      items.push(
        {
          id: 'forum-reports',
          label: t('staff.layout.sidebar.menuItems.forumReportManagement'),
          color: 'bg-blue-500'
        },
        {
          id: 'booking-complaint',
          label: t('staff.layout.sidebar.menuItems.bookingComplaint'),
          color: 'bg-red-500'
        }
      );
    }
    if (user?.staffTask === 'COMPANY_REQUEST_AND_RESOLVE_TICKET' || isAdmin) {
      items.push(
        {
          id: 'company-management',
          label: t('staff.layout.sidebar.menuItems.companyManagement'),
          color: 'bg-amber-500'
        },
        {
          id: 'resolve-ticket',
          label: t('staff.layout.sidebar.menuItems.resolveTicket'),
          color: 'bg-purple-500'
        }
      );
    }
    if (user?.staffTask === 'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE' || isAdmin) {
      items.push(
        {
          id: 'tour-approval',
          label: t('staff.layout.sidebar.menuItems.tourApproval'),
          color: 'bg-emerald-500'
        },
        {
          id: 'article-management',
          label: t('staff.layout.sidebar.menuItems.articleManagement'),
          color: 'bg-indigo-500'
        }
      );
    }
    return items;
  }, [user?.staffTask, isAdmin, t]);

  // Luôn hiển thị Task Management trong sidebar, kể cả khi chưa được gán nhiệm vụ
  const hasTaskMenu = true;

  const currentTaskSection = location.pathname.startsWith('/staff/tasks')
    ? new URLSearchParams(location.search).get('section')
    : null;

  const taskLinkClasses = (sectionId) => {
    const isActive =
      location.pathname.startsWith('/staff/tasks') &&
      (sectionId ? currentTaskSection === sectionId : !currentTaskSection);
    return [
      'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all no-underline',
      isActive
        ? 'bg-blue-100 text-blue-600'
        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-500'
    ].join(' ');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLanguageDropdown(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (languageRef.current && !languageRef.current.contains(e.target)) {
        setShowLanguageDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const menuSections = [
    {
      title: t('staff.layout.sidebar.sections.menu'),
      items: [
        { type: 'tasks', name: t('staff.layout.sidebar.taskManagement') },
      ],
    },
    {
      title: t('staff.layout.sidebar.sections.contact'),
      items: [
        { type: 'link', name: t('staff.layout.sidebar.contactCustomer'), to: '/staff/contact', icon: ChatBubbleLeftRightIcon },
      ],
    },
  ];

  const handleLogout = () => {
    logout('STAFF'); // Only logout staff role
    navigate('/staff/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 h-screen bg-white border-r border-gray-100 shadow-lg overflow-y-auto transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600 font-semibold">KS</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{t('staff.layout.sidebar.brand')}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-6">
          {menuSections.map((section) => (
            <div key={section.title} className="px-4 mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  if (item.type === 'tasks' && hasTaskMenu) {
                    return (
                      <div key="task-menu">
                        <button
                          onClick={() => setTaskMenuOpen((prev) => !prev)}
                          className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all no-underline ${
                            taskMenuOpen
                              ? 'bg-blue-200 text-blue-700 font-semibold shadow-inner'
                              : 'text-gray-700 hover:bg-blue-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <ClipboardDocumentListIcon className={`h-5 w-5 ${taskMenuOpen ? 'text-blue-700' : 'text-gray-400'} transition-colors`} />
                            <span>{item.name}</span>
                          </div>
                          <ChevronDownIcon className={`h-4 w-4 ${taskMenuOpen ? 'text-blue-700' : 'text-gray-400'} transition-transform ${taskMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {taskMenuOpen && (
                          <div className="mt-1 space-y-1 border-l border-gray-100 pl-4">
                            <NavLink
                              to="/staff/tasks"
                              className={taskLinkClasses(null)}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <span className="h-2 w-2 rounded-full bg-blue-400" />
                              <span>{t('staff.taskManagement.sidebar.dashboardOverview')}</span>
                            </NavLink>
                            {taskMenuItems.map((task) => {
                              // Special handling for resolve-ticket: navigate to dedicated route
                              if (task.id === 'resolve-ticket') {
                                return (
                                  <NavLink
                                    key={task.id}
                                    to="/staff/resolve-tickets"
                                    className={({ isActive }) =>
                                      [
                                        'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all no-underline',
                                        isActive || location.pathname === '/staff/resolve-tickets'
                                          ? 'bg-blue-100 text-blue-600'
                                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-500'
                                      ].join(' ')
                                    }
                                    onClick={() => setSidebarOpen(false)}
                                  >
                                    <span className={`h-2 w-2 rounded-full ${task.color}`} />
                                    <span>{task.label}</span>
                                  </NavLink>
                                );
                              }
                              return (
                                <NavLink
                                  key={task.id}
                                  to={`/staff/tasks?section=${task.id}`}
                                  className={taskLinkClasses(task.id)}
                                  onClick={() => setSidebarOpen(false)}
                                >
                                  <span className={`h-2 w-2 rounded-full ${task.color}`} />
                                  <span>{task.label}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (item.type === 'link') {
                    const Icon = item.icon;
                    const isActive =
                      item.to === '/staff'
                        ? location.pathname === '/staff'
                        : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                    return (
                      <div key={item.name}>
                        <NavLink
                          to={item.to}
                          className={({ isActive: navActive }) =>
                            [
                              'flex items-center rounded-xl px-3.5 py-2.5 transition-all duration-200 no-underline',
                              navActive || isActive
                                ? 'bg-blue-200 text-blue-700 font-semibold shadow-inner'
                                : 'text-gray-700 hover:bg-blue-100'
                            ].join(' ')
                          }
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'} transition-colors`} />
                          <span>{item.name}</span>
                        </NavLink>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-72 z-50 h-16 bg-white shadow">
        <div className="flex h-16">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <form className="w-full flex md:ml-0" action="#" method="GET">
                <label htmlFor="search-field" className="sr-only">
                  Search
                </label>
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  </div>
                  <input
                    id="search-field"
                    className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent"
                    placeholder={t('staff.layout.header.searchPlaceholder')}
                    type="search"
                    name="search"
                  />
                </div>
              </form>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              {/* Language Dropdown */}
              <div className="relative" ref={languageRef}>
                <button
                  onClick={() => setShowLanguageDropdown((s) => !s)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <span>{i18n.language?.toUpperCase() || 'VI'}</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                {showLanguageDropdown && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <button onClick={() => changeLanguage('vi')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">VI</button>
                    <button onClick={() => changeLanguage('en')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">EN</button>
                    <button onClick={() => changeLanguage('ko')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">KO</button>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="ml-3 relative" ref={userRef}>
                <button
                  onClick={() => setShowUserDropdown((s) => !s)}
                  className="flex items-center space-x-3 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">{user?.name || t('staff.layout.header.userDropdown.staffUser')}</span>
                  <div className="h-8 w-8 rounded-full bg-gray-200 ring-1 ring-gray-300 flex items-center justify-center">
                    <UserCircleIcon className="h-5 w-5 text-gray-600" />
                  </div>
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                </button>
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 ring-1 ring-gray-300 flex items-center justify-center">
                          <UserCircleIcon className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{user?.name || t('staff.layout.header.userDropdown.staffUserFallback')}</div>
                          <div className="text-xs text-gray-500 truncate">{user?.email || 'staff@example.com'}</div>
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="py-2">
                      <button
                        onClick={() => { setShowUserDropdown(false); navigate('/profile'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <UserCircleIcon className="h-5 w-5 text-gray-500" />
                        <span>{t('staff.layout.header.userDropdown.profile')}</span>
                      </button>
                      <button
                        onClick={() => { setShowUserDropdown(false); navigate('/settings'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
                        <span>{t('staff.layout.header.userDropdown.accountSettings')}</span>
                      </button>
                      <button
                        onClick={() => { setShowUserDropdown(false); navigate('/support'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LifebuoyIcon className="h-5 w-5 text-gray-500" />
                        <span>{t('staff.layout.header.userDropdown.support')}</span>
                      </button>
                      <div className="my-2 border-t border-gray-100" />
                      <button
                        onClick={() => { setShowUserDropdown(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-500" />
                        <span>{t('staff.layout.header.userDropdown.signOut')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="pt-24 lg:ml-72 min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="w-full max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
};

export default StaffLayout;


