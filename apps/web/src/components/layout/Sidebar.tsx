import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@torre-tempo/shared';
import { useAuthStore, useUIStore } from '../../lib/store';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  badge?: number;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

interface SidebarProps {
  pendingApprovals?: number;
}

/**
 * Collapsible sidebar navigation for desktop.
 * Shows nav groups with role-based filtering.
 * Width: 256px (expanded), 64px (collapsed).
 */
export function Sidebar({ pendingApprovals = 0 }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

  const isActive = (path: string) => location.pathname === path;

  // Role checks
  const isEmployee = user?.role === Role.EMPLOYEE;
  const isManager = user?.role === Role.MANAGER || user?.role === Role.ADMIN || user?.role === Role.GLOBAL_ADMIN;
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.GLOBAL_ADMIN;

  // Navigation structure
  const navGroups: NavGroup[] = [
    {
      name: 'Main',
      items: [
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
          label: t('dashboard.title'),
          to: '/app/dashboard',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: t('clocking.title'),
          to: '/app/clock',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          label: t('scheduling.mySchedule'),
          to: '/app/my-schedule',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          label: t('scheduling.title'),
          to: '/app/schedule',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          label: t('overtime.title'),
          to: '/app/overtime',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          label: isEmployee ? t('reports.myReports') : t('reports.title'),
          to: isEmployee ? '/app/my-reports' : '/app/reports',
        },
      ],
    },
    // Management group - visible to managers and above
    ...(isManager
      ? [
          {
            name: 'Management',
            items: [
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
                label: t('approvals.title'),
                to: '/app/approvals',
                badge: pendingApprovals > 0 ? pendingApprovals : undefined,
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ),
                label: t('users.title'),
                to: '/app/users',
              },
            ],
          },
        ]
      : []),
    // Administration group - visible to admins only
    ...(isAdmin
      ? [
          {
            name: 'Administration',
            items: [
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                label: t('settings.title'),
                to: '/app/settings',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                label: t('locations.title'),
                to: '/app/locations',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                label: 'Compliance',
                to: '/app/compliance',
              },
            ],
          },
        ]
      : []),
    // Global Admin - Tenant management
    ...(user?.role === Role.GLOBAL_ADMIN
      ? [
          {
            name: 'System',
            items: [
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
                label: t('tenants.title'),
                to: '/app/tenants',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                label: t('navigation.systemAdmin'),
                to: '/app/system',
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside
      className={`hidden md:flex flex-col fixed top-16 left-0 bottom-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
        isSidebarOpen ? 'w-64' : 'w-16'
      }`}
    >
      <nav className="flex-1 overflow-y-auto py-4">
        {navGroups.map((group, groupIndex) => (
          <div key={group.name} className={groupIndex > 0 ? 'mt-6' : ''}>
            {/* Group label - only show when expanded */}
            {isSidebarOpen && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {group.name}
              </h3>
            )}
            
            <ul className="space-y-1 px-2">
              {group.items.map((item) => {
                const active = isActive(item.to);
                
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`relative flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={!isSidebarOpen ? (item.label as string) : undefined}
                    >
                      <span className={`flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                        {item.icon}
                      </span>
                      
                      {isSidebarOpen && (
                        <>
                          <span className="truncate">{item.label}</span>
                          
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </>
                      )}
                      
                      {/* Badge for collapsed sidebar */}
                      {!isSidebarOpen && item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer with app version or credits */}
      {isSidebarOpen && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            Torre Tempo v1.0
          </p>
        </div>
      )}
    </aside>
  );
}
