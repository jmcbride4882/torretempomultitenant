import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

// Route to label mapping
const routeLabels: Record<string, string> = {
  '/app': 'Home',
  '/app/dashboard': 'dashboard.title',
  '/app/clock': 'clocking.title',
  '/app/approvals': 'approvals.title',
  '/app/overtime': 'overtime.title',
  '/app/reports': 'reports.title',
  '/app/my-reports': 'reports.myReports',
  '/app/locations': 'locations.title',
  '/app/users': 'users.title',
  '/app/settings': 'settings.title',
  '/app/tenants': 'tenants.title',
  '/app/system': 'navigation.systemAdmin',
  '/app/schedule': 'scheduling.title',
  '/app/team': 'Team',
  '/app/admin': 'Admin',
  '/app/compliance': 'Compliance',
};

/**
 * Auto-generating breadcrumbs from the current route.
 * Shows navigation path: Home > Section > Page
 */
export function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();

  // Generate breadcrumb items from path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Home/Dashboard
    if (pathSegments[0] === 'app') {
      breadcrumbs.push({
        label: t('dashboard.title'),
        path: '/app/dashboard',
      });
    }

    // Build path progressively
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip 'app' since we already added Home
      if (segment === 'app') return;

      // Skip dashboard since it's the home
      if (segment === 'dashboard' && breadcrumbs.length === 1) return;

      // Check if this is a known route
      const labelKey = routeLabels[currentPath];
      
      if (labelKey) {
        // It's a translatable key
        const label = labelKey.includes('.') ? t(labelKey) : labelKey;
        breadcrumbs.push({
          label: label as string,
          path: index < pathSegments.length - 1 ? currentPath : undefined,
        });
      } else {
        // It's likely an ID or dynamic segment
        // Try to make it human-readable
        const readableSegment = segment
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

        // Only add if it's not a UUID-like string
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
          breadcrumbs.push({
            label: readableSegment,
            path: index < pathSegments.length - 1 ? currentPath : undefined,
          });
        } else {
          // For UUIDs, show "Details" or similar
          breadcrumbs.push({
            label: t('common.details') || 'Details',
            path: undefined,
          });
        }
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs if we're just at dashboard
  if (breadcrumbs.length <= 1 && location.pathname === '/app/dashboard') {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && (
              <svg
                className="w-4 h-4 text-slate-400 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900 dark:text-white font-medium">
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
