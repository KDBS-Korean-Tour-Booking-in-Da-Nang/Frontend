import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { 
  ChartBarIcon, 
  UsersIcon, 
  BuildingOfficeIcon, 
  UserGroupIcon,
  DocumentTextIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
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
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  TicketIcon
} from '@heroicons/react/24/outline';
import { ShieldAlert } from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const languageRef = useRef(null);
  const userRef = useRef(null);

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
      title: t('admin.adminLayout.menu'),
      items: [
        { name: t('admin.adminLayout.menuItems.dashboard'), to: '/admin', icon: ChartBarIcon },
        { name: t('admin.adminLayout.menuItems.customerManagement'), to: '/admin/customers', icon: UsersIcon },
        { name: t('admin.adminLayout.menuItems.companyManagement'), to: '/admin/company', icon: BuildingOfficeIcon },
        { name: t('admin.adminLayout.menuItems.staffManagement'), to: '/admin/staff', icon: UserGroupIcon },
        { name: t('admin.adminLayout.menuItems.forumReportManagement'), to: '/admin/forum-reports', icon: ExclamationTriangleIcon },
        { name: t('admin.adminLayout.menuItems.complaintManagement'), to: '/admin/complaints', icon: ShieldAlert },
        { name: t('admin.adminLayout.menuItems.resolveTicketManagement'), to: '/admin/resolve-tickets', icon: TicketIcon },
        { name: t('admin.adminLayout.menuItems.newsManagement'), to: '/admin/news', icon: DocumentTextIcon },
        { name: t('admin.adminLayout.menuItems.tourManagement'), to: '/admin/tour', icon: MapPinIcon },
        { name: t('admin.adminLayout.menuItems.transactionManagement'), to: '/admin/transactions', icon: CurrencyDollarIcon },
      ],
    },
    {
      title: t('admin.adminLayout.contact'),
      items: [
        { name: t('admin.adminLayout.customerContact'), to: '/admin/contact', icon: ChatBubbleLeftRightIcon },
      ],
    },
  ];

  const handleLogout = () => {
    logout('ADMIN'); // Only logout admin role
    navigate('/admin/login');
  };

  const groupedMenu = menuSections.map((section) => {
    return {
      title: section.title,
      items: section.items.map((item) => ({
        ...item,
        children: item.children || []
      }))
    };
  });

  // Format balance with proper decimal places (precision 15, scale 2)
  const formatBalance = (bal) => {
    if (bal === null || bal === undefined) return '0.00';
    const num = typeof bal === 'string' ? parseFloat(bal) : bal;
    if (Number.isNaN(num)) return '0.00';
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 h-screen bg-white border-r border-gray-100 overflow-y-auto transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600 font-semibold">KA</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">KDBS Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="py-6">
          {groupedMenu.map((section) => (
            <div key={section.title} className="px-4 mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.to === '/admin'
                      ? location.pathname === '/admin'
                      : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                  return (
                    <div key={item.name}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/admin'}
                        className={({ isActive: navActive }) =>
                          [
                            'flex items-center rounded-xl px-3.5 py-2.5 transition-all duration-200 no-underline',
                            navActive || isActive ? 'bg-blue-50 text-blue-600 font-semibold shadow-inner' : 'text-gray-700 hover:bg-gray-50'
                          ].join(' ')
                        }
                      >
                        <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'} transition-colors`} />
                        <span className="truncate">{item.name}</span>
                      </NavLink>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-72 z-50 h-16 bg-white border-b border-gray-200">
        <div className="flex h-16">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex items-center">
              <form className="w-full flex md:ml-0" action="#" method="GET">
                <label htmlFor="search-field" className="sr-only">
                  {t('admin.adminLayout.search')}
                </label>
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  </div>
                  <input
                    id="search-field"
                    className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent"
                    placeholder={t('admin.adminLayout.searchPlaceholder')}
                    type="search"
                    name="search"
                  />
                </div>
              </form>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6 gap-4">
              {/* Admin Balance (left of language selector) */}
              {user && (
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                  <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    {formatBalance(user.balance ?? 0)}
                  </span>
                </div>
              )}

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
                  <span className="text-sm font-medium text-gray-700">{user?.name || t('admin.adminLayout.adminUser')}</span>
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
                          <div className="text-sm font-semibold text-gray-900 truncate">{user?.name || t('admin.adminLayout.adminUser')}</div>
                          <div className="text-xs text-gray-500 truncate">{user?.email || 'admin@example.com'}</div>
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
                        <span>{t('admin.adminLayout.profile')}</span>
                      </button>
                      <button
                        onClick={() => { setShowUserDropdown(false); navigate('/settings'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
                        <span>{t('admin.adminLayout.accountSettings')}</span>
                      </button>
                      <button
                        onClick={() => { setShowUserDropdown(false); navigate('/support'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LifebuoyIcon className="h-5 w-5 text-gray-500" />
                        <span>{t('admin.adminLayout.support')}</span>
                      </button>
                      <div className="my-2 border-t border-gray-100" />
                      <button
                        onClick={() => { setShowUserDropdown(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-500" />
                        <span>{t('admin.adminLayout.signOut')}</span>
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

      {/* Mobile sidebar overlay removed temporarily for lint debug */}
    </div>
  );
};

export default AdminLayout;
