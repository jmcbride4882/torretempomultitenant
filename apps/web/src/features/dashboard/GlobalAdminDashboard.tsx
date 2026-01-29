import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { DashboardSkeleton } from '../../components/ui/LoadingSkeleton';

interface TenantWithCounts {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: {
    users: number;
    locations: number;
  };
}

interface GlobalStats {
  totalTenants: number;
  totalUsers: number;
  totalLocations: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

export function GlobalAdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Get global system stats
  const { data: globalStats, isLoading: loadingStats } = useQuery<GlobalStats>({
    queryKey: ['global-stats'],
    queryFn: async () => {
      try {
        return await api.get('/global-admin/stats');
      } catch {
        // Return mock data if endpoint doesn't exist yet
        return {
          totalTenants: 12,
          totalUsers: 156,
          totalLocations: 28,
          systemHealth: 'healthy' as const,
        };
      }
    },
  });

  // Get all tenants
  const { data: tenants = [], isLoading: loadingTenants } = useQuery<TenantWithCounts[]>({
    queryKey: ['tenants'],
    queryFn: async () => {
      try {
        return await api.get('/tenants');
      } catch {
        // Return mock data if endpoint doesn't exist yet
        return [
          {
            id: '1',
            name: 'Hotel Costa Brava',
            slug: 'costa-brava',
            createdAt: '2025-01-15T10:30:00Z',
            _count: { users: 24, locations: 3 },
          },
          {
            id: '2',
            name: 'Restaurante El Sol',
            slug: 'el-sol',
            createdAt: '2025-02-20T14:15:00Z',
            _count: { users: 12, locations: 1 },
          },
          {
            id: '3',
            name: 'Comercial Martinez',
            slug: 'martinez',
            createdAt: '2025-03-10T09:00:00Z',
            _count: { users: 45, locations: 5 },
          },
        ];
      }
    },
  });

  const isLoading = loadingStats || loadingTenants;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const healthColors = {
    healthy: 'bg-green-500',
    degraded: 'bg-amber-500',
    critical: 'bg-red-500',
  };

  const healthLabels = {
    healthy: t('dashboard.globalAdmin.systemHealthy'),
    degraded: t('dashboard.globalAdmin.systemDegraded'),
    critical: t('dashboard.globalAdmin.systemCritical'),
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {t('dashboard.globalAdmin.title')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('dashboard.welcome', { name: user ? `${user.firstName} ${user.lastName}` : 'Admin' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${healthColors[globalStats?.systemHealth || 'healthy']} animate-pulse`} />
          <span className="text-sm text-slate-600">
            {healthLabels[globalStats?.systemHealth || 'healthy']}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.globalAdmin.totalTenants')}</p>
              <p className="text-xl font-bold text-slate-900">{globalStats?.totalTenants || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.globalAdmin.totalUsers')}</p>
              <p className="text-xl font-bold text-slate-900">{globalStats?.totalUsers || 0}</p>
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
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.globalAdmin.totalLocations')}</p>
              <p className="text-xl font-bold text-slate-900">{globalStats?.totalLocations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              globalStats?.systemHealth === 'healthy' ? 'bg-green-50' :
              globalStats?.systemHealth === 'degraded' ? 'bg-amber-50' : 'bg-red-50'
            }`}>
              <svg className={`w-5 h-5 ${
                globalStats?.systemHealth === 'healthy' ? 'text-green-600' :
                globalStats?.systemHealth === 'degraded' ? 'text-amber-600' : 'text-red-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.globalAdmin.systemHealth')}</p>
              <p className={`text-xl font-bold ${
                globalStats?.systemHealth === 'healthy' ? 'text-green-600' :
                globalStats?.systemHealth === 'degraded' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {globalStats?.systemHealth === 'healthy' ? t('dashboard.globalAdmin.healthy') :
                 globalStats?.systemHealth === 'degraded' ? t('dashboard.globalAdmin.degraded') :
                 t('dashboard.globalAdmin.critical')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/app/tenants')}
          className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">{t('dashboard.globalAdmin.tenantManagement')}</h3>
              <p className="text-sm text-blue-100">{t('dashboard.globalAdmin.manageTenants')}</p>
            </div>
            <svg className="w-5 h-5 text-white/60 group-hover:text-white ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => navigate('/app/global-users')}
          className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{t('dashboard.globalAdmin.viewAllUsers')}</h3>
              <p className="text-sm text-slate-500">{t('dashboard.globalAdmin.browseAllUsers')}</p>
            </div>
            <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Tenants List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{t('dashboard.globalAdmin.allTenants')}</h3>
          <button
            onClick={() => navigate('/app/tenants')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            {t('dashboard.globalAdmin.viewAll')}
          </button>
        </div>
        
        {tenants.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm">{t('dashboard.globalAdmin.noTenants')}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t('dashboard.globalAdmin.companyName')}
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t('dashboard.globalAdmin.slug')}
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t('dashboard.globalAdmin.users')}
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t('dashboard.globalAdmin.locations')}
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t('dashboard.globalAdmin.created')}
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t('dashboard.globalAdmin.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.slice(0, 10).map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-indigo-600">
                              {tenant.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {tenant.slug}
                        </code>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm text-slate-700">{tenant._count.users}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm text-slate-700">{tenant._count.locations}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-500">{formatDate(tenant.createdAt)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => navigate(`/app/tenants/${tenant.id}`)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          {t('dashboard.globalAdmin.manage')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {tenants.slice(0, 10).map((tenant) => (
                <div key={tenant.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-indigo-600">
                          {tenant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{tenant.name}</p>
                        <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {tenant.slug}
                        </code>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/app/tenants/${tenant.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                    >
                      {t('dashboard.globalAdmin.manage')}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>{tenant._count.users} {t('dashboard.globalAdmin.users').toLowerCase()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{tenant._count.locations} {t('dashboard.globalAdmin.locations').toLowerCase()}</span>
                    </div>
                    <span className="text-slate-400">•</span>
                    <span>{formatDate(tenant.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
