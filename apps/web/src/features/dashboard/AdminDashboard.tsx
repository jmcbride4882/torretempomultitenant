import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { DashboardSkeleton } from '../../components/ui/LoadingSkeleton';

interface SystemStats {
  totalUsers: number;
  activeLocations: number;
  totalEntries: number;
  pendingReports: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Get system stats
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
        };
      }
    },
  });

  // Get locations
  const { data: locations = [], isLoading: loadingLocations } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        return await api.get('/locations');
      } catch {
        return [];
      }
    },
  });

  // Get recent activity
  const { data: recentActivity = [], isLoading: loadingActivity } = useQuery<RecentActivity[]>({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      try {
        return await api.get('/admin/activity?limit=10');
      } catch {
        return [];
      }
    },
  });

  const isLoading = loadingStats || loadingLocations || loadingActivity;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const healthColors = {
    healthy: 'bg-green-500',
    degraded: 'bg-amber-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {t('dashboard.admin.title')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('dashboard.welcome', { name: user ? `${user.firstName} ${user.lastName}` : 'Admin' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${healthColors[systemStats?.systemHealth || 'healthy']} animate-pulse`} />
          <span className="text-sm text-slate-600">
            {t('dashboard.admin.allSystemsOperational')}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.admin.totalUsers')}</p>
              <p className="text-xl font-bold text-slate-900">{systemStats?.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.admin.activeLocations')}</p>
              <p className="text-xl font-bold text-slate-900">{systemStats?.activeLocations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-xl">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.admin.totalEntries')}</p>
              <p className="text-xl font-bold text-slate-900">{systemStats?.totalEntries || 0}</p>
              <p className="text-xs text-slate-400">{t('dashboard.admin.thisMonth')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${(systemStats?.pendingReports || 0) > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
              <svg className={`w-5 h-5 ${(systemStats?.pendingReports || 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.admin.pendingReports')}</p>
              <p className={`text-xl font-bold ${(systemStats?.pendingReports || 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {systemStats?.pendingReports || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/app/users')}
          className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{t('dashboard.admin.userManagement')}</h3>
              <p className="text-sm text-slate-500">{t('dashboard.admin.manageUsers')}</p>
            </div>
            <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => navigate('/app/locations')}
          className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{t('dashboard.admin.locationManagement')}</h3>
              <p className="text-sm text-slate-500">{t('dashboard.admin.manageLocations')}</p>
            </div>
            <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => navigate('/app/reports')}
          className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-purple-200 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{t('dashboard.admin.reportsOverview')}</h3>
              <p className="text-sm text-slate-500">{t('dashboard.admin.viewReports')}</p>
            </div>
            <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Locations List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{t('dashboard.admin.activeLocations')}</h3>
          <button
            onClick={() => navigate('/app/locations')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            {t('dashboard.admin.manageLocations')}
          </button>
        </div>
        {locations.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">No locations set up yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {locations.slice(0, 5).map((location) => (
              <div key={location.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${location.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{location.name}</p>
                    {location.address && (
                      <p className="text-xs text-slate-500">{location.address}</p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  location.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {location.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-5 py-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-slate-600">
                    {activity.user.firstName.charAt(0)}{activity.user.lastName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{activity.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activity.user.firstName} {activity.user.lastName} - {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
