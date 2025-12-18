import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import EditProfileModal from '../../components/modals/EditProfileModal/EditProfileModal';
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const languageRef = useRef(null);
  const userRef = useRef(null);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLanguageDropdown(false);
  };

  // Set default language là English cho ADMIN role: chỉ auto-set nếu không có language được set hoặc language là Vietnamese, chỉ set khi user chưa explicitly chọn non-Vietnamese language
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      const currentLang = i18n.language;
      const savedLang = localStorage.getItem('i18nextLng');
      if ((!savedLang || savedLang === 'vi' || savedLang.startsWith('vi')) && 
          (!currentLang || currentLang === 'vi' || currentLang.startsWith('vi'))) {
        i18n.changeLanguage('en');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user]);

  // Đóng dropdowns khi click bên ngoài: lắng nghe mousedown event trên document, check nếu click không phải trong languageRef hoặc userRef thì đóng dropdown tương ứng
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
        { name: t('admin.adminLayout.menuItems.articleManagement'), to: '/admin/article', icon: DocumentTextIcon },
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

  // Đăng xuất: chỉ logout admin role, navigate về /admin/login
  const handleLogout = () => {
    logout('ADMIN');
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

  // Format balance với decimal places đúng (precision 15, scale 2): sử dụng Intl.NumberFormat với minimumFractionDigits và maximumFractionDigits = 2
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
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 h-screen bg-white border-r overflow-y-auto transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0`}
        style={{ borderColor: '#F0F0F0' }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b" style={{ borderColor: '#F0F0F0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] flex items-center justify-center" style={{ backgroundColor: '#E6F3FF' }}>
              <span className="font-semibold" style={{ color: '#66B3FF' }}>KA</span>
            </div>
            <span className="text-sm font-semibold text-gray-800">KDBS Admin</span>
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
                            'flex items-center rounded-[24px] px-3.5 py-2.5 transition-all duration-200 no-underline',
                            navActive || isActive ? 'font-semibold' : 'text-gray-700 hover:bg-[#FAFAFA]'
                          ].join(' ')
                        }
                        style={(props) => ({
                          backgroundColor: (props.isActive || isActive) ? '#E6F3FF' : 'transparent',
                          color: (props.isActive || isActive) ? '#66B3FF' : undefined
                        })}
                      >
                        <Icon className="h-5 w-5 mr-3 transition-colors" style={{ 
                          color: isActive ? '#66B3FF' : '#9CA3AF',
                          strokeWidth: 1.5
                        }} />
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
      <header className="fixed top-0 right-0 left-0 lg:left-72 z-50 h-16 bg-white border-b" style={{ borderColor: '#F0F0F0' }}>
        <div className="flex h-16">
          <button
            type="button"
            className="px-4 border-r text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset lg:hidden"
            style={{ borderColor: '#F0F0F0' }}
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
                <div className="flex items-center gap-2 rounded-[20px] border px-3 py-1" style={{ backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }}>
                  <CurrencyDollarIcon className="w-4 h-4" style={{ color: '#8BC34A' }} />
                  <span className="text-sm font-semibold text-gray-800">
                    {formatBalance(user.balance ?? 0)}
                  </span>
                </div>
              )}

              {/* Language Dropdown */}
              <div className="relative" ref={languageRef}>
                <button
                  onClick={() => setShowLanguageDropdown((s) => !s)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border rounded-[20px] hover:bg-[#FAFAFA] transition-colors"
                  style={{ borderColor: '#E0E0E0' }}
                >
                  <span>{i18n.language?.toUpperCase() || 'VI'}</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                {showLanguageDropdown && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-[20px] shadow-lg border z-50" style={{ borderColor: '#E0E0E0' }}>
                    <button onClick={() => changeLanguage('vi')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#FAFAFA] rounded-t-[20px]">VI</button>
                    <button onClick={() => changeLanguage('en')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#FAFAFA]">EN</button>
                    <button onClick={() => changeLanguage('ko')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#FAFAFA] rounded-b-[20px]">KO</button>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="ml-3 relative" ref={userRef}>
                <button
                  onClick={() => setShowUserDropdown((s) => !s)}
                  className="flex items-center space-x-3 hover:bg-[#FAFAFA] px-3 py-2 rounded-[20px] transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">{user?.name || t('admin.adminLayout.adminUser')}</span>
                  <div className="h-8 w-8 rounded-[16px] flex items-center justify-center" style={{ backgroundColor: '#E6F3FF' }}>
                    <UserCircleIcon className="h-5 w-5" style={{ color: '#66B3FF' }} />
                  </div>
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                </button>
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-[24px] shadow-xl border z-50 overflow-hidden" style={{ borderColor: '#E0E0E0' }}>
                    {/* Header */}
                    <div className="px-4 py-3" style={{ backgroundColor: '#FAFAFA' }}>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-[16px] flex items-center justify-center" style={{ backgroundColor: '#E6F3FF' }}>
                          <UserCircleIcon className="h-6 w-6" style={{ color: '#66B3FF' }} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">{user?.name || t('admin.adminLayout.adminUser')}</div>
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
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#FAFAFA] transition-colors"
                      >
                        <UserCircleIcon className="h-5 w-5 text-gray-500" />
                        <span>{t('admin.adminLayout.profile')}</span>
                      </button>
                      <div className="my-2" style={{ borderTop: '1px solid #F0F0F0' }} />
                      <button
                        onClick={() => { setShowUserDropdown(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-b-[24px] transition-colors"
                        style={{ color: '#FF80B3' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#FFE6F0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" style={{ color: '#FF80B3' }} />
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
      <main className="pt-24 lg:ml-72 min-h-screen px-4 sm:px-6 lg:px-8 pb-8" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="w-full max-w-none">
          {children}
        </div>
      </main>

      {/* Mobile sidebar overlay removed temporarily for lint debug */}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default AdminLayout;
