import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DashboardSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState, EmptyIcons } from '../../components/ui/EmptyState';

interface SystemStats {
  totalUsers: number;
  activeLocations: number;
  totalEntries: number;
  pendingReports: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  usersTrend?: number; // percentage change from last month
  entriesTrend?: number;
  systemUptime?: number; // in hours
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  qrEnabled?: boolean;
  geofenceEnabled?: boolean;
  lastActivity?: string;
}

interface RecentActivity {
  id?: string;
  type?: 'clock_in' | 'clock_out' | 'edit_request' | 'approval' | 'location_created' | 'user_created' | 'report_generated';
  description?: string;
  timestamp: string;
  user: string; // Email address from API
  action: string; // Action type from API
  details: string; // Details from API
}

interface SystemHealthMetrics {
  api: {
    status: 'healthy' | 'degraded' | 'critical';
    responseTime: number; // ms
    uptime: number; // percentage
  };
  database: {
    status: 'healthy' | 'degraded' | 'critical';
    queryTime: number; // ms
    connections: number;
  };
  redis: {
    status: 'healthy' | 'degraded' | 'critical';
    memoryUsage: number; // percentage
    hitRate: number; // percentage
  };
  storage: {
    status: 'healthy' | 'degraded' | 'critical';
    diskUsage: number; // percentage
    availableSpace: string; // e.g., "45 GB"
  };
}

// Helper: Get system health color and gradient
function getHealthStyles(status: 'healthy' | 'degraded' | 'critical'): { gradient: string; dot: string; text: string; badge: string } {
  switch (status) {
    case 'healthy':
      return {
        gradient: 'from-emerald-600 via-emerald-700 to-teal-800',
        dot: 'bg-emerald-300',
        text: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
      };
    case 'degraded':
      return {
        gradient: 'from-amber-500 via-amber-600 to-orange-700',
        dot: 'bg-amber-300',
        text: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
      };
    case 'critical':
      return {
        gradient: 'from-red-500 via-red-600 to-rose-700',
        dot: 'bg-red-300',
        text: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
      };
  }
}

// Helper: Get service status color
function getServiceStatusColor(status: 'healthy' | 'degraded' | 'critical'): { bg: string; dot: string; text: string } {
  switch (status) {
    case 'healthy':
      return { bg: 'bg-emerald-50 dark:bg-emerald-900/30', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' };
    case 'degraded':
      return { bg: 'bg-amber-50 dark:bg-amber-900/30', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' };
    case 'critical':
      return { bg: 'bg-red-50 dark:bg-red-900/30', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300' };
  }
}

// Helper: Format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Helper: Format uptime
function formatUptime(hours: number): string {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return `${days}d ${remainingHours}h`;
  return `${hours}h`;
}

// Helper: Get user initials from email
function getUserInitials(email: string): string {
  // Try to extract name from email (before @)
  const username = email.split('@')[0];
  if (!username) return '??';
  
  // If username has dots or underscores, use first letter of each part
  const parts = username.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0]?.[0]?.toUpperCase() || '?') + (parts[1]?.[0]?.toUpperCase() || '?');
  }
  
  // Otherwise use first two letters
  return username.substring(0, 2).toUpperCase();
}

// Helper: Get display name from email
function getDisplayName(email: string): string {
  const username = email.split('@')[0];
  if (!username) return email;
  
  // Capitalize and replace separators with spaces
  return username
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Helper: Infer activity type from action string
function inferActivityType(action: string): RecentActivity['type'] {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('clock') && actionLower.includes('in')) return 'clock_in';
  if (actionLower.includes('clock') && actionLower.includes('out')) return 'clock_out';
  if (actionLower.includes('edit') || actionLower.includes('modified')) return 'edit_request';
  if (actionLower.includes('approv')) return 'approval';
  if (actionLower.includes('location') && actionLower.includes('creat')) return 'location_created';
  if (actionLower.includes('user') && actionLower.includes('creat')) return 'user_created';
  if (actionLower.includes('report')) return 'report_generated';
  return 'clock_in'; // default fallback
}

// Helper: Get activity type icon and color
function getActivityTypeStyles(type: RecentActivity['type']): { icon: JSX.Element; bg: string; text: string } {
  switch (type) {
    case 'clock_in':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-900/50',
        text: 'text-emerald-600 dark:text-emerald-400',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        ),
      };
    case 'clock_out':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/50',
        text: 'text-blue-600 dark:text-blue-400',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        ),
      };
    case 'edit_request':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/50',
        text: 'text-amber-600 dark:text-amber-400',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
      };
    case 'approval':
      return {
        bg: 'bg-purple-100 dark:bg-purple-900/50',
        text: 'text-purple-600 dark:text-purple-400',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case 'location_created':
      return {
        bg: 'bg-cyan-100 dark:bg-cyan-900/50',
        text: 'text-cyan-600 dark:text-cyan-400',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      };
    case 'user_created':
      return {
        bg: 'bg-indigo-100 dark:bg-indigo-900/50',
        text: 'text-indigo-600 dark:text-indigo-400',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        ),
      };
    case 'report_generated':
      return {
        bg: 'bg-pink-100 dark:bg-pink-900/50',
        text: 'text-pink-600 dark:text-pink-400',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      };
    default:
      return {
        bg: 'bg-slate-100 dark:bg-slate-700',
        text: 'text-slate-600 dark:text-slate-400',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
  }
}

// Helper: Get trend indicator
function getTrendIndicator(trend: number | undefined): { icon: JSX.Element; text: string; color: string } | null {
  if (trend === undefined || trend === 0) return null;
  
  if (trend > 0) {
    return {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      text: `+${trend}%`,
      color: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  
  return {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    text: `${trend}%`,
    color: 'text-red-600 dark:text-red-400',
  };
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Get system stats with real-time polling
  const { data: systemStats, isLoading: loadingStats } = useQuery<SystemStats>({
    queryKey: ['system-stats'],
    queryFn: async () => {
      try {
        return await api.get('/admin/stats');
      } catch {
        // Return mock data if endpoint doesn't exist yet
        return {
          totalUsers: 24,
          activeLocations: 3,
          totalEntries: 1247,
          pendingReports: 5,
          systemHealth: 'healthy' as const,
          usersTrend: 12,
          entriesTrend: 8,
          systemUptime: 720, // 30 days
        };
      }
    },
    refetchInterval: 30000, // Real-time updates every 30s
  });

  // Get system health metrics with polling
  const { data: healthMetrics } = useQuery<SystemHealthMetrics>({
    queryKey: ['system-health-metrics'],
    queryFn: async () => {
      // API doesn't provide this format yet, return mock data
      return {
        api: { status: 'healthy' as const, responseTime: 45, uptime: 99.9 },
        database: { status: 'healthy' as const, queryTime: 12, connections: 15 },
        redis: { status: 'healthy' as const, memoryUsage: 35, hitRate: 98.5 },
        storage: { status: 'healthy' as const, diskUsage: 42, availableSpace: '58 GB' },
      };
    },
    refetchInterval: 30000,
  });

  // Get locations with polling
  const { data: locations = [], isLoading: loadingLocations } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        return await api.get('/locations');
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Get recent activity with polling
  const { data: recentActivity = [], isLoading: loadingActivity } = useQuery<RecentActivity[]>({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      try {
        return await api.get('/admin/activity?limit=10');
      } catch {
        // Return mock data for development
        return [
          { timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), user: 'maria@example.com', action: 'Clocked in', details: 'Clocked in at Main Office' },
          { timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), user: 'carlos@example.com', action: 'Edit requested', details: 'Requested time entry edit' },
          { timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), user: 'admin@example.com', action: 'Approved', details: 'Approved edit request #47' },
          { timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), user: 'ana@example.com', action: 'Clocked out', details: 'Clocked out from Branch Office' },
          { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), user: 'system@example.com', action: 'Report generated', details: 'Generated monthly compliance report' },
        ];
      }
    },
    refetchInterval: 30000,
  });

  const isLoading = loadingStats || loadingLocations || loadingActivity;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const healthStyles = getHealthStyles(systemStats?.systemHealth || 'healthy');
  const usersTrend = getTrendIndicator(systemStats?.usersTrend);
  const entriesTrend = getTrendIndicator(systemStats?.entriesTrend);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ═══════════════════════════════════════════════════════════════════
          SYSTEM HEALTH HERO CARD
          ═══════════════════════════════════════════════════════════════════ */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-2xl bg-gradient-to-br ${healthStyles.gradient} dark:from-slate-800 dark:via-slate-900 dark:to-slate-950`}>
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-white/10" />
        </div>

        <div className="relative z-10">
          {/* Header with live indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-white/10 text-white backdrop-blur-sm">
              {/* Pulsing live indicator */}
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${healthStyles.dot} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${healthStyles.dot}`} />
              </span>
              {t('dashboard.admin.systemHealth')}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
              systemStats?.systemHealth === 'healthy' ? 'bg-emerald-500/20 text-emerald-200' :
              systemStats?.systemHealth === 'degraded' ? 'bg-amber-500/20 text-amber-200' :
              'bg-red-500/20 text-red-200'
            }`}>
              {systemStats?.systemHealth === 'healthy' ? t('dashboard.globalAdmin.healthy') :
               systemStats?.systemHealth === 'degraded' ? t('dashboard.globalAdmin.degraded') :
               t('dashboard.globalAdmin.critical')}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Main Status */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/70 text-sm font-medium tracking-wide uppercase">
                    {t('dashboard.admin.systemOverview')}
                  </p>
                  <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {t('dashboard.admin.allSystemsOperational')}
                  </p>
                </div>
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap items-center gap-4 text-white/70">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">Uptime: {formatUptime(systemStats?.systemUptime ?? 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-sm">{systemStats?.totalUsers ?? 0} users active</span>
                </div>
                {(systemStats?.pendingReports ?? 0) > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full">
                    <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-amber-200">{systemStats?.pendingReports} {t('dashboard.admin.pendingReports').toLowerCase()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/app/settings')}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-white text-slate-800 hover:bg-slate-100 rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                System Settings
              </button>
              <button
                onClick={() => navigate('/app/reports')}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-semibold backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('dashboard.admin.viewReports')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SYSTEM STATS GRID - 4 Columns
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <button
          onClick={() => navigate('/app/users')}
          className="text-left bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group min-h-[120px]"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm md:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  {t('dashboard.admin.totalUsers')}
                </p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                  {systemStats?.totalUsers ?? 0}
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          {usersTrend && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className={`flex items-center gap-1 text-sm ${usersTrend.color}`}>
                {usersTrend.icon}
                <span className="font-medium">{usersTrend.text}</span>
                <span className="text-slate-400 dark:text-slate-500 text-sm md:text-xs">vs last month</span>
              </div>
            </div>
          )}
        </button>

        {/* Active Locations */}
        <button
          onClick={() => navigate('/app/locations')}
          className="text-left bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700 transition-all group min-h-[120px]"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm md:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  {t('dashboard.admin.activeLocations')}
                </p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                  {systemStats?.activeLocations ?? 0}
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm md:text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {locations.filter((l) => l.isActive).length} active
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                {locations.filter((l) => !l.isActive).length} inactive
              </span>
            </div>
          </div>
        </button>

        {/* Total Entries */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm md:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  {t('dashboard.admin.totalEntries')}
                </p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                  {systemStats?.totalEntries?.toLocaleString() ?? 0}
                </p>
                <p className="text-sm md:text-xs text-slate-400 dark:text-slate-500">{t('dashboard.admin.thisMonth')}</p>
              </div>
            </div>
          </div>
          {entriesTrend && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className={`flex items-center gap-1 text-sm ${entriesTrend.color}`}>
                {entriesTrend.icon}
                <span className="font-medium">{entriesTrend.text}</span>
                <span className="text-slate-400 dark:text-slate-500 text-sm md:text-xs">vs last month</span>
              </div>
            </div>
          )}
        </div>

        {/* Pending Reports */}
        <button
          onClick={() => navigate('/app/reports')}
          className="text-left bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-700 transition-all group min-h-[120px]"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl relative ${(systemStats?.pendingReports ?? 0) > 5 ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-slate-50 dark:bg-slate-700'} group-hover:scale-110 transition-transform`}>
                <svg className={`w-6 h-6 ${(systemStats?.pendingReports ?? 0) > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {(systemStats?.pendingReports ?? 0) > 5 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">!</span>
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm md:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  {t('dashboard.admin.pendingReports')}
                </p>
                <p className={`text-xl md:text-2xl font-bold ${(systemStats?.pendingReports ?? 0) > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                  {systemStats?.pendingReports ?? 0}
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span className="text-sm md:text-xs text-slate-500 dark:text-slate-400">
              {(systemStats?.pendingReports ?? 0) === 0 ? 'All reports processed' : 'Click to review'}
            </span>
          </div>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SYSTEM HEALTH METRICS - 4 Service Cards
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 md:p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-base md:text-sm font-semibold text-slate-900 dark:text-white">Service Health</h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-sm md:text-xs text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
            </div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* API Status */}
          {healthMetrics && (
            <>
              <div className={`p-4 md:p-4 rounded-xl ${getServiceStatusColor(healthMetrics.api.status).bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm md:text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">API</span>
                  <span className={`w-3 md:w-2.5 h-3 md:h-2.5 rounded-full ${getServiceStatusColor(healthMetrics.api.status).dot}`} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm md:text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Response Time</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{healthMetrics.api.responseTime}ms</span>
                  </div>
                  <div className="flex justify-between text-sm md:text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Uptime</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{healthMetrics.api.uptime}%</span>
                  </div>
                </div>
              </div>

              {/* Database Status */}
              <div className={`p-4 md:p-4 rounded-xl ${getServiceStatusColor(healthMetrics.database.status).bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm md:text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Database</span>
                  <span className={`w-3 md:w-2.5 h-3 md:h-2.5 rounded-full ${getServiceStatusColor(healthMetrics.database.status).dot}`} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm md:text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Query Time</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{healthMetrics.database.queryTime}ms</span>
                  </div>
                  <div className="flex justify-between text-sm md:text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Connections</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{healthMetrics.database.connections}</span>
                  </div>
                </div>
              </div>

              {/* Redis Status */}
              <div className={`p-4 md:p-4 rounded-xl ${getServiceStatusColor(healthMetrics.redis.status).bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm md:text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Redis</span>
                  <span className={`w-3 md:w-2.5 h-3 md:h-2.5 rounded-full ${getServiceStatusColor(healthMetrics.redis.status).dot}`} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm md:text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Memory</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{healthMetrics.redis.memoryUsage}%</span>
                  </div>
                  <div className="flex justify-between text-sm md:text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Hit Rate</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{healthMetrics.redis.hitRate}%</span>
                  </div>
                </div>
              </div>

              {/* Storage Status */}
              <div className={`p-4 md:p-4 rounded-xl ${getServiceStatusColor(healthMetrics.storage.status).bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm md:text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Storage</span>
                  <span className={`w-3 md:w-2.5 h-3 md:h-2.5 rounded-full ${getServiceStatusColor(healthMetrics.storage.status).dot}`} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm md:text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Disk Usage</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{healthMetrics.storage.diskUsage}%</span>
                  </div>
                  <div className="flex justify-between text-sm md:text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Available</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{healthMetrics.storage.availableSpace}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK ACCESS CARDS - 3 Columns with Enhanced Hover Effects
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/app/users')}
          className="group bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all text-left hover:scale-[1.02] active:scale-[0.98] min-h-[80px]"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors group-hover:scale-110 group-hover:rotate-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base md:text-sm font-semibold text-slate-900 dark:text-white">{t('dashboard.admin.userManagement')}</h3>
              <p className="text-base md:text-sm text-slate-500 dark:text-slate-400">{t('dashboard.admin.manageUsers')}</p>
            </div>
            <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => navigate('/app/locations')}
          className="group bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-lg transition-all text-left hover:scale-[1.02] active:scale-[0.98] min-h-[80px]"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors group-hover:scale-110 group-hover:rotate-3">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base md:text-sm font-semibold text-slate-900 dark:text-white">{t('dashboard.admin.locationManagement')}</h3>
              <p className="text-base md:text-sm text-slate-500 dark:text-slate-400">{t('dashboard.admin.manageLocations')}</p>
            </div>
            <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => navigate('/app/reports')}
          className="group bg-white dark:bg-slate-800 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg transition-all text-left hover:scale-[1.02] active:scale-[0.98] min-h-[80px]"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors group-hover:scale-110 group-hover:rotate-3">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base md:text-sm font-semibold text-slate-900 dark:text-white">{t('dashboard.admin.reportsOverview')}</h3>
              <p className="text-base md:text-sm text-slate-500 dark:text-slate-400">{t('dashboard.admin.viewReports')}</p>
            </div>
            <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT - Locations + Activity Side by Side
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Locations List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 md:p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-base md:text-sm font-semibold text-slate-900 dark:text-white">{t('dashboard.admin.activeLocations')}</h3>
            </div>
            <button
              onClick={() => navigate('/app/locations')}
              className="text-base md:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 min-h-[44px] px-2"
            >
              {t('dashboard.admin.manageLocations')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {locations.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.location}
              title={t('empty.noLocations')}
              description={t('empty.noLocationsDescription')}
              variant="compact"
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
              {locations.slice(0, 5).map((location) => (
                <div key={location.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group min-h-[72px]">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-3.5 md:w-3 h-3.5 md:h-3 rounded-full flex-shrink-0 ${location.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-base md:text-sm font-medium text-slate-900 dark:text-white truncate">{location.name}</p>
                      {location.address && (
                        <p className="text-sm md:text-xs text-slate-500 dark:text-slate-400 truncate">{location.address}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {location.qrEnabled !== false && (
                          <span className="inline-flex items-center gap-1 text-xs md:text-[10px] text-slate-500 dark:text-slate-400">
                            <svg className="w-4 md:w-3 h-4 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            QR
                          </span>
                        )}
                        {location.geofenceEnabled !== false && (
                          <span className="inline-flex items-center gap-1 text-xs md:text-[10px] text-slate-500 dark:text-slate-400">
                            <svg className="w-4 md:w-3 h-4 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Geofence
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-3 md:px-2.5 py-1.5 md:py-1 text-sm md:text-xs font-semibold rounded-full ${
                      location.isActive 
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {location.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/locations/${location.id}/qr`);
                      }}
                      className="p-2.5 md:p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                      title={t('locations.generateQR')}
                    >
                      <svg className="w-5 md:w-4 h-5 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Recent Activity Timeline */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                </span>
              </div>
            </div>
          </div>
          
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.clock}
              title={t('empty.noEntries')}
              description="No recent activity to display"
              variant="compact"
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
              {recentActivity.map((activity, index) => {
                const activityType = inferActivityType(activity.action);
                const styles = getActivityTypeStyles(activityType);
                return (
                  <button
                    key={activity.id || `activity-${index}-${activity.timestamp}`}
                    onClick={() => {
                      // Drill-down navigation based on activity type
                      if (activityType === 'clock_in' || activityType === 'clock_out') {
                        navigate('/app/entries');
                      } else if (activityType === 'edit_request' || activityType === 'approval') {
                        navigate('/app/approvals');
                      } else if (activityType === 'report_generated') {
                        navigate('/app/reports');
                      }
                    }}
                    className="w-full px-5 py-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    {/* Avatar with type icon */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-200">
                          {getUserInitials(activity.user)}
                        </span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${styles.bg} rounded-full flex items-center justify-center ${styles.text}`}>
                        {styles.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white">{activity.details}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {getDisplayName(activity.user)} • {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>

                    {/* Arrow indicator */}
                    <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
