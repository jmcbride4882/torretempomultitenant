import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@torre-tempo/shared';
import { useAuthStore, useUIStore } from '../../lib/store';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { BottomNav } from '../BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main layout wrapper for all authenticated pages.
 * Shows TopNav + Sidebar (desktop) OR TopNav + BottomNav (mobile).
 * Responsive breakpoint at 768px.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Mock fetch pending approvals - replace with actual API call
  useEffect(() => {
    // TODO: Fetch actual pending approvals count
    // GET /api/approvals/edit-requests?status=PENDING
    const isManagerOrAbove = 
      user?.role === Role.MANAGER || 
      user?.role === Role.ADMIN || 
      user?.role === Role.GLOBAL_ADMIN;
    
    if (isManagerOrAbove) {
      // Simulated count - replace with API call
      setPendingApprovals(3);
    }
  }, [user]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle logout
  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Navigation items for mobile bottom nav
  const mobileNavItems = [
    { path: '/app/dashboard', label: t('dashboard.title'), icon: 'home', roles: [Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN] },
    { path: '/app/clock', label: t('clocking.title'), icon: 'clock', roles: [Role.EMPLOYEE, Role.MANAGER, Role.ADMIN] },
    { path: '/app/schedule', label: t('scheduling.title'), icon: 'calendar', roles: [Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN] },
    // "More" item will trigger the mobile drawer
    { path: '#more', label: 'More', icon: 'menu', roles: [Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN] },
    { path: '/app/settings', label: 'Profile', icon: 'user', roles: [Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN] },
  ];

  const filteredMobileNavItems = mobileNavItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  // Handle mobile nav click
  const handleMobileNavClick = (path: string) => {
    if (path === '#more') {
      setMobileMenuOpen(true);
    } else {
      navigate(path);
    }
  };

  // Mobile drawer items (the "More" menu)
  const mobileDrawerItems = [
    { path: '/app/overtime', label: t('overtime.title'), icon: 'chart', roles: [Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN] },
    { path: user?.role === Role.EMPLOYEE ? '/app/my-reports' : '/app/reports', label: t('reports.title'), icon: 'document', roles: [Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN] },
    { path: '/app/approvals', label: t('approvals.title'), icon: 'check', roles: [Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN], badge: pendingApprovals },
    { path: '/app/users', label: t('users.title'), icon: 'users', roles: [Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN] },
    { path: '/app/locations', label: t('locations.title'), icon: 'location', roles: [Role.ADMIN, Role.GLOBAL_ADMIN] },
    { path: '/app/tenants', label: t('tenants.title'), icon: 'building', roles: [Role.GLOBAL_ADMIN] },
    { path: '/app/system', label: t('navigation.systemAdmin'), icon: 'globe', roles: [Role.GLOBAL_ADMIN] },
  ];

  const filteredDrawerItems = mobileDrawerItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  // Icon renderer for mobile drawer
  const renderDrawerIcon = (icon: string) => {
    const className = 'w-5 h-5';
    switch (icon) {
      case 'chart':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'document':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'check':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'users':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'location':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'building':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'globe':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Navigation */}
      <TopNav 
        pendingApprovals={pendingApprovals}
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Desktop Sidebar */}
      <Sidebar pendingApprovals={pendingApprovals} />

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <Link to="/app/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">TT</span>
                </div>
                <span className="font-bold text-lg text-slate-900 dark:text-white">Torre Tempo</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                More Options
              </h3>
              <ul className="space-y-1">
                {filteredDrawerItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>
                          {renderDrawerIcon(item.icon)}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('settings.logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={`pt-16 pb-20 md:pb-8 transition-all duration-300 ${
          isSidebarOpen ? 'md:ml-64' : 'md:ml-16'
        }`}
      >
        {/* Breadcrumbs */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Breadcrumbs />
        </div>

        {/* Page Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>

        {/* Footer */}
        <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            © 2026 LSLT Group | Developed by John McBride
          </p>
        </footer>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        navItems={filteredMobileNavItems}
        currentPath={location.pathname}
        onNavigate={handleMobileNavClick}
      />
    </div>
  );
}
