import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import EditProfileModal from '../../components/modals/EditProfileModal/EditProfileModal';
import {
  Menu,
  X,
  Bell,
  Mail,
  Search,
  Download,
  UserCircle,
  ChevronDown,
  Settings,
  LifeBuoy,
  LogOut,
  MessageSquare,
  ClipboardList
} from 'lucide-react';

const StaffLayout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [taskMenuOpen, setTaskMenuOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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

  // Luôn hiển thị Task Management trong sidebar, kể cả khi chưa được gán nhiệm vụ: set hasTaskMenu = true
  const hasTaskMenu = true;

  const currentTaskSection = location.pathname.startsWith('/staff/tasks')
    ? new URLSearchParams(location.search).get('section')
    : null;

  const taskLinkClasses = (sectionId) => {
    const isActive =
      location.pathname.startsWith('/staff/tasks') &&
      (sectionId ? currentTaskSection === sectionId : !currentTaskSection);
    return [
      'flex items-center gap-2 rounded-[20px] px-3 py-2 text-sm transition-all no-underline',
      isActive
        ? 'bg-[#E6F3FF] text-[#66B3FF]'
        : 'text-gray-700 hover:bg-[#F0F9FF] hover:text-[#66B3FF]'
    ].join(' ');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLanguageDropdown(false);
  };

  // Set default language to English cho STAFF role: nếu user role là STAFF hoặc ADMIN và language hiện tại là Vietnamese hoặc chưa set thì auto-set về English
  useEffect(() => {
    if (user?.role === 'STAFF' || user?.role === 'ADMIN') {
      const currentLang = i18n.language;
      const savedLang = localStorage.getItem('i18nextLng');
      if ((!savedLang || savedLang === 'vi' || savedLang.startsWith('vi')) && 
          (!currentLang || currentLang === 'vi' || currentLang.startsWith('vi'))) {
        i18n.changeLanguage('en');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user]);

  // Đóng dropdowns khi click outside: lắng nghe mousedown event trên document, check nếu click không phải trong languageRef hoặc userRef thì đóng dropdown tương ứng
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

  // Định nghĩa menu sections: menu (Task Management), contact (Contact Customer)
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
        { type: 'link', name: t('staff.layout.sidebar.contactCustomer'), to: '/staff/contact', icon: MessageSquare },
      ],
    },
  ];

  // Xử lý logout: gọi logout với role 'STAFF', navigate đến /staff/login
  const handleLogout = () => {
    logout('STAFF'); // Only logout staff role
    navigate('/staff/login');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 h-screen bg-white border-r overflow-y-auto transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0`}
        style={{ borderColor: '#F0F0F0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b" style={{ borderColor: '#F0F0F0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] flex items-center justify-center" style={{ backgroundColor: '#E6F3FF' }}>
              <span className="font-semibold" style={{ color: '#66B3FF' }}>KS</span>
            </div>
            <span className="text-sm font-semibold text-gray-800">{t('staff.layout.sidebar.brand')}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden transition-colors"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={(e) => e.target.style.color = '#6B7280'}
            onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-6">
          {menuSections.map((section) => (
            <div key={section.title} className="px-4 mb-6">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: '#66B3FF' }}>{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  if (item.type === 'tasks' && hasTaskMenu) {
                    return (
                      <div key="task-menu">
                        <button
                          onClick={() => setTaskMenuOpen((prev) => !prev)}
                          className="w-full flex items-center justify-between rounded-[20px] px-3.5 py-2.5 text-left transition-all no-underline"
                          style={taskMenuOpen
                            ? { backgroundColor: '#E6F3FF', color: '#66B3FF', fontWeight: '600' }
                            : { color: '#4B5563' }
                          }
                          onMouseEnter={(e) => {
                            if (!taskMenuOpen) {
                              e.target.style.backgroundColor = '#F0F9FF';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!taskMenuOpen) {
                              e.target.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <ClipboardList className={`h-5 w-5 transition-colors`} style={{ color: taskMenuOpen ? '#66B3FF' : '#9CA3AF' }} strokeWidth={1.5} />
                            <span>{item.name}</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${taskMenuOpen ? 'rotate-180' : ''}`} style={{ color: taskMenuOpen ? '#66B3FF' : '#9CA3AF' }} strokeWidth={1.5} />
                        </button>
                        {taskMenuOpen && (
                          <div className="mt-1 space-y-1 pl-4" style={{ borderLeft: '2px solid #E6F3FF' }}>
                            <NavLink
                              to="/staff/tasks"
                              className={taskLinkClasses(null)}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#66B3FF' }} />
                              <span>{t('staff.taskManagement.sidebar.dashboardOverview')}</span>
                            </NavLink>
                            {taskMenuItems.map((task) => {
                              if (task.id === 'resolve-ticket') {
                                return (
                                  <NavLink
                                    key={task.id}
                                    to="/staff/resolve-tickets"
                                    className={({ isActive }) =>
                                      [
                                        'flex items-center gap-2 rounded-[20px] px-3 py-2 text-sm transition-all no-underline',
                                        isActive || location.pathname === '/staff/resolve-tickets'
                                          ? 'bg-[#E6F3FF] text-[#66B3FF]'
                                          : 'text-gray-700 hover:bg-[#F0F9FF] hover:text-[#66B3FF]'
                                      ].join(' ')
                                    }
                                    onClick={() => setSidebarOpen(false)}
                                  >
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.color === 'bg-blue-500' ? '#66B3FF' : task.color === 'bg-red-500' ? '#FF80B3' : task.color === 'bg-amber-500' ? '#FFB84D' : task.color === 'bg-purple-500' ? '#B380FF' : task.color === 'bg-emerald-500' ? '#15803D' : task.color === 'bg-indigo-500' ? '#6366F1' : '#9CA3AF' }} />
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
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.color === 'bg-blue-500' ? '#66B3FF' : task.color === 'bg-red-500' ? '#FF80B3' : task.color === 'bg-amber-500' ? '#FFB84D' : task.color === 'bg-purple-500' ? '#B380FF' : task.color === 'bg-emerald-500' ? '#15803D' : task.color === 'bg-indigo-500' ? '#6366F1' : '#9CA3AF' }} />
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
                              'flex items-center rounded-[20px] px-3.5 py-2.5 transition-all duration-200 no-underline',
                              navActive || isActive
                                ? 'bg-[#E6F3FF] text-[#66B3FF] font-semibold'
                                : 'text-gray-700 hover:bg-[#F0F9FF] hover:text-[#66B3FF]'
                            ].join(' ')
                          }
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Icon className="h-5 w-5 mr-3 transition-colors" style={{ color: isActive ? '#66B3FF' : '#9CA3AF' }} strokeWidth={1.5} />
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
      <header className="fixed top-0 right-0 left-0 lg:left-72 z-50 h-16 bg-white" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
        <div className="flex h-16">
          <button
            type="button"
            className="px-4 border-r lg:hidden focus:outline-none focus:ring-2 focus:ring-inset"
            style={{ borderColor: '#F0F0F0', color: '#9CA3AF' }}
            onClick={() => setSidebarOpen(true)}
            onMouseEnter={(e) => e.target.style.color = '#66B3FF'}
            onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
          >
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <form className="w-full flex md:ml-0" action="#" method="GET">
                <label htmlFor="search-field" className="sr-only">
                  Search
                </label>
                <div className="relative w-full" style={{ color: '#9CA3AF' }}>
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-3">
                    <Search className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <input
                    id="search-field"
                    className="block w-full h-full pl-10 pr-3 py-2 rounded-[20px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#66B3FF]/30 border"
                    style={{ borderColor: '#E0E0E0', backgroundColor: '#FAFAFA' }}
                    placeholder={t('staff.layout.header.searchPlaceholder')}
                    type="search"
                    name="search"
                    onFocus={(e) => {
                      e.target.style.borderColor = '#66B3FF';
                      e.target.style.backgroundColor = '#FFFFFF';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E0E0E0';
                      e.target.style.backgroundColor = '#FAFAFA';
                    }}
                  />
                </div>
              </form>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              {/* Language Dropdown */}
              <div className="relative" ref={languageRef}>
                <button
                  onClick={() => setShowLanguageDropdown((s) => !s)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-semibold bg-white border rounded-[20px] transition-colors"
                  style={{ borderColor: '#E0E0E0', color: '#4B5563' }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#F5F5F5';
                    e.target.style.borderColor = '#D0D0D0';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#FFFFFF';
                    e.target.style.borderColor = '#E0E0E0';
                  }}
                >
                  <span>{i18n.language?.toUpperCase() || 'VI'}</span>
                  <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                </button>
                {showLanguageDropdown && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-[20px] shadow-lg border z-50 overflow-hidden" style={{ borderColor: '#F0F0F0' }}>
                    <button onClick={() => changeLanguage('vi')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F5F5] transition-colors">VI</button>
                    <button onClick={() => changeLanguage('en')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F5F5] transition-colors">EN</button>
                    <button onClick={() => changeLanguage('ko')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F5F5] transition-colors">KO</button>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="ml-3 relative" ref={userRef}>
                <button
                  onClick={() => setShowUserDropdown((s) => !s)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-[20px] transition-colors"
                  style={{ color: '#4B5563' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F5F5'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <span className="text-sm font-semibold text-gray-700">{user?.name || t('staff.layout.header.userDropdown.staffUser')}</span>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E6F3FF', border: '1px solid #CCE6FF' }}>
                    <UserCircle className="h-5 w-5" style={{ color: '#66B3FF' }} strokeWidth={1.5} />
                  </div>
                  <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF' }} strokeWidth={1.5} />
                </button>
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-[28px] shadow-xl border z-50 overflow-hidden" style={{ borderColor: '#F0F0F0' }}>
                    {/* Header */}
                    <div className="px-4 py-3" style={{ backgroundColor: '#E6F3FF' }}>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #CCE6FF' }}>
                          <UserCircle className="h-6 w-6" style={{ color: '#66B3FF' }} strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">{user?.name || t('staff.layout.header.userDropdown.staffUserFallback')}</div>
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="py-2">
                      <button
                        onClick={() => { 
                          setShowUserDropdown(false); 
                          setIsProfileModalOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 rounded-[16px] mx-2 transition-colors"
                        style={{ color: '#4B5563' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F5F5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <UserCircle className="h-5 w-5" style={{ color: '#9CA3AF' }} strokeWidth={1.5} />
                        <span>{t('staff.layout.header.userDropdown.profile')}</span>
                      </button>
                      <div className="my-2" style={{ borderTop: '1px solid #F0F0F0' }} />
                      <button
                        onClick={() => { setShowUserDropdown(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-[16px] mx-2 transition-colors"
                        style={{ color: '#FF80B3' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#FFE6F0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <LogOut className="h-5 w-5" style={{ color: '#FF80B3' }} strokeWidth={1.5} />
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
      <main className="pt-24 lg:ml-72 min-h-screen px-4 sm:px-6 lg:px-8 pb-8" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="w-full max-w-none">
          {children}
        </div>
      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default StaffLayout;


