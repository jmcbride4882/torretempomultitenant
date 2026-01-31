import { Role } from '@torre-tempo/shared';

export interface NavItem {
  path: string;
  labelKey: string;
  iconName: string;
}

export interface NavGroup {
  nameKey: string;
  items: NavItem[];
}

export const ROLE_NAVIGATION: Record<Role, NavGroup[]> = {
  [Role.EMPLOYEE]: [
    {
      nameKey: 'navigation.personal',
      items: [
        { path: '/app/dashboard', labelKey: 'dashboard.title', iconName: 'home' },
        { path: '/app/clock', labelKey: 'clocking.title', iconName: 'clock' },
        { path: '/app/my-schedule', labelKey: 'scheduling.mySchedule', iconName: 'calendar' },
        { path: '/app/overtime', labelKey: 'overtime.title', iconName: 'chart' },
        { path: '/app/my-reports', labelKey: 'reports.myReports', iconName: 'document' },
        { path: '/app/profile', labelKey: 'profile.title', iconName: 'user' },
      ],
    },
  ],
  [Role.MANAGER]: [
    {
      nameKey: 'navigation.personal',
      items: [
        { path: '/app/dashboard', labelKey: 'dashboard.title', iconName: 'home' },
        { path: '/app/clock', labelKey: 'clocking.title', iconName: 'clock' },
        { path: '/app/my-schedule', labelKey: 'scheduling.mySchedule', iconName: 'calendar' },
        { path: '/app/overtime', labelKey: 'overtime.title', iconName: 'chart' },
      ],
    },
    {
      nameKey: 'navigation.teamManagement',
      items: [
        { path: '/app/schedule', labelKey: 'scheduling.title', iconName: 'calendar' },
        { path: '/app/reports', labelKey: 'reports.title', iconName: 'document' },
        { path: '/app/approvals', labelKey: 'approvals.title', iconName: 'check' },
      ],
    },
    {
      nameKey: 'navigation.account',
      items: [
        { path: '/app/profile', labelKey: 'profile.title', iconName: 'user' },
      ],
    },
  ],
  [Role.ADMIN]: [
    {
      nameKey: 'navigation.overview',
      items: [
        { path: '/app/dashboard', labelKey: 'dashboard.title', iconName: 'home' },
        { path: '/app/clock', labelKey: 'clocking.title', iconName: 'clock' },
      ],
    },
    {
      nameKey: 'navigation.teamManagement',
      items: [
        { path: '/app/schedule', labelKey: 'scheduling.title', iconName: 'calendar' },
        { path: '/app/reports', labelKey: 'reports.title', iconName: 'document' },
        { path: '/app/approvals', labelKey: 'approvals.title', iconName: 'check' },
        { path: '/app/overtime', labelKey: 'overtime.title', iconName: 'chart' },
      ],
    },
    {
      nameKey: 'navigation.administration',
      items: [
        { path: '/app/users', labelKey: 'users.title', iconName: 'users' },
        { path: '/app/locations', labelKey: 'locations.title', iconName: 'location' },
        { path: '/app/settings', labelKey: 'settings.title', iconName: 'settings' },
        { path: '/app/compliance', labelKey: 'compliance.title', iconName: 'shield' },
      ],
    },
    {
      nameKey: 'navigation.account',
      items: [
        { path: '/app/profile', labelKey: 'profile.title', iconName: 'user' },
      ],
    },
  ],
  [Role.GLOBAL_ADMIN]: [
    {
      nameKey: 'navigation.systemOverview',
      items: [
        { path: '/app/system', labelKey: 'system.title', iconName: 'shield' },
        { path: '/app/clock', labelKey: 'clocking.title', iconName: 'clock' },
      ],
    },
    {
      nameKey: 'navigation.multiTenant',
      items: [
        { path: '/app/tenants', labelKey: 'tenants.title', iconName: 'building' },
      ],
    },
    {
      nameKey: 'navigation.tenantManagement',
      items: [
        { path: '/app/dashboard', labelKey: 'dashboard.title', iconName: 'home' },
        { path: '/app/users', labelKey: 'users.title', iconName: 'users' },
        { path: '/app/locations', labelKey: 'locations.title', iconName: 'location' },
        { path: '/app/settings', labelKey: 'settings.title', iconName: 'settings' },
      ],
    },
    {
      nameKey: 'navigation.operations',
      items: [
        { path: '/app/schedule', labelKey: 'scheduling.title', iconName: 'calendar' },
        { path: '/app/reports', labelKey: 'reports.title', iconName: 'document' },
        { path: '/app/approvals', labelKey: 'approvals.title', iconName: 'check' },
        { path: '/app/overtime', labelKey: 'overtime.title', iconName: 'chart' },
        { path: '/app/compliance', labelKey: 'compliance.title', iconName: 'shield' },
      ],
    },
    {
      nameKey: 'navigation.account',
      items: [
        { path: '/app/profile', labelKey: 'profile.title', iconName: 'user' },
      ],
    },
  ],
};

export function getAllowedRoutesForRole(role: Role): string[] {
  const navGroups = ROLE_NAVIGATION[role];
  const basePaths = navGroups.flatMap(group => group.items.map(item => item.path));
  
  // Add dynamic route patterns for each base path
  const dynamicPatterns: string[] = [];
  basePaths.forEach(path => {
    // Allow subroutes for certain paths
    if (path === '/app/tenants') {
      dynamicPatterns.push('/app/tenants/:id', '/app/tenants/:id/edit');
    }
  });
  
  return [...basePaths, ...dynamicPatterns];
}

export function canAccessRoute(userRole: Role, path: string): boolean {
  const allowedRoutes = getAllowedRoutesForRole(userRole);
  
  // Exact match first
  if (allowedRoutes.includes(path)) {
    return true;
  }
  
  // Check if path matches any pattern with dynamic segments
  return allowedRoutes.some(allowedPath => {
    // Convert route pattern to regex (e.g., "/app/tenants/:id" -> /^\/app\/tenants\/[^\/]+$/)
    if (allowedPath.includes(':')) {
      const pattern = allowedPath.replace(/:[^\/]+/g, '[^\/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(path);
    }
    return false;
  });
}
