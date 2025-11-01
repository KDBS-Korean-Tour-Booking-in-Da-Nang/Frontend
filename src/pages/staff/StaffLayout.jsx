import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  NewspaperIcon,
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
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const StaffLayout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
      title: 'MENU',
      items: [
        { name: 'News Management', to: '/staff/news-management', icon: NewspaperIcon },
      ],
    },
    {
      title: 'LIÊN HỆ',
      items: [
        { name: 'Liên hệ khách hàng', to: '/staff/contact', icon: ChatBubbleLeftRightIcon },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/staff/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 h-screen bg-slate-900 text-slate-200 shadow-lg overflow-y-auto transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0`}>
        <div className="flex items-center justify-between h-16 px-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center font-bold">KS</div>
            <span className="text-sm font-semibold tracking-wide">KDBS Staff</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-300 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="py-4">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-4">
              <div className="px-4 pb-2 text-[11px] uppercase tracking-wider text-slate-400/90 font-semibold">{section.title}</div>
              <ul className="px-3 space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/staff/news-management'}
                        className={({ isActive }) => [
                          'flex items-center gap-3 rounded-lg transition-colors duration-150',
                          'text-[15px] leading-6 px-3 py-3',
                          isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                        ].join(' ')}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="font-medium">{item.name}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-64 z-50 h-16 bg-white shadow">
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
                    placeholder="Search for..."
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
                  <span className="text-sm font-medium text-gray-700">{user?.name || 'Staff'}</span>
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
                          <div className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Staff User'}</div>
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
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => { setShowUserDropdown(false); navigate('/settings'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
                        <span>Account settings</span>
                      </button>
                      <button
                        onClick={() => { setShowUserDropdown(false); navigate('/support'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LifebuoyIcon className="h-5 w-5 text-gray-500" />
                        <span>Support</span>
                      </button>
                      <div className="my-2 border-t border-gray-100" />
                      <button
                        onClick={() => { setShowUserDropdown(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-500" />
                        <span>Sign out</span>
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
      <main className="pt-24 lg:ml-64 min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="w-full max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
};

export default StaffLayout;


