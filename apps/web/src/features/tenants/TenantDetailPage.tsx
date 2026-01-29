import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

// ============================================
// TYPES
// ============================================

interface TenantStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalLocations: number;
  activeLocations: number;
  inactiveLocations: number;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  locale: string;
  convenioCode: string | null;
  maxWeeklyHours: number;
  maxAnnualHours: number;
  createdAt: string;
  updatedAt: string;
  stats: TenantStats;
}

// ============================================
// LOADING SKELETON
// ============================================

function TenantDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <div className="h-8 bg-slate-200 rounded-lg w-64 mb-2" />
          <div className="h-4 bg-slate-200 rounded-lg w-48" />
        </div>
        <div className="flex gap-3">
          <div className="h-11 w-24 bg-slate-200 rounded-xl" />
          <div className="h-11 w-24 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="h-5 bg-slate-200 rounded w-32 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="h-5 bg-slate-200 rounded w-32 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fetch tenant details
  const { data: tenant, isLoading, error } = useQuery<TenantDetail>({
    queryKey: ['tenant', id],
    queryFn: () => api.get(`/tenants/${id}`),
    enabled: !!id,
  });

  const handleBack = () => {
    navigate('/app/tenants');
  };

  const handleEdit = () => {
    navigate(`/app/tenants/${id}/edit`);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format locale helper
  const formatLocale = (locale: string) => {
    const localeNames: Record<string, string> = {
      es: t('tenants.locales.es'),
      en: t('tenants.locales.en'),
      fr: t('tenants.locales.fr'),
      de: t('tenants.locales.de'),
      pl: t('tenants.locales.pl'),
      'nl-BE': t('tenants.locales.nlBE'),
    };
    return localeNames[locale] || locale.toUpperCase();
  };

  // Loading state
  if (isLoading) {
    return <TenantDetailSkeleton />;
  }

  // Error state
  if (error || !tenant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {t('tenants.notFound')}
          </h3>
          <p className="text-slate-500 mb-6">
            {error ? (error as Error).message : t('tenants.notFoundDescription')}
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
              <p className="text-sm text-slate-500 font-mono">{tenant.slug}</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium transition-colors min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">{t('common.back')}</span>
          </button>
          
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2.5 text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl font-medium shadow-md shadow-blue-200 transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden sm:inline">{t('common.edit')}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('tenants.totalUsers')}</p>
              <p className="text-xl font-bold text-slate-900">{tenant.stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-xl">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('tenants.activeUsers')}</p>
              <p className="text-xl font-bold text-slate-900">{tenant.stats.activeUsers}</p>
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
              <p className="text-xs text-slate-500 font-medium">{t('tenants.totalLocations')}</p>
              <p className="text-xl font-bold text-slate-900">{tenant.stats.totalLocations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {t('tenants.companyInfo')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.companyName')}</p>
              <p className="text-sm text-slate-900 font-medium">{tenant.name}</p>
            </div>
            
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.identifier')}</p>
              <p className="text-sm text-slate-900 font-mono bg-slate-50 px-2 py-1 rounded inline-block">{tenant.slug}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.timezone')}</p>
                <p className="text-sm text-slate-900">{tenant.timezone}</p>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.locale')}</p>
                <p className="text-sm text-slate-900">{formatLocale(tenant.locale)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('tenants.statistics')}
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.totalUsers')}</p>
                <p className="text-2xl font-bold text-slate-900">{tenant.stats.totalUsers}</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {tenant.stats.activeUsers} {t('tenants.active').toLowerCase()}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.totalLocations')}</p>
                <p className="text-2xl font-bold text-slate-900">{tenant.stats.totalLocations}</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {tenant.stats.activeLocations} {t('tenants.active').toLowerCase()}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.createdAt')}</p>
              <p className="text-sm text-slate-900">{formatDate(tenant.createdAt)}</p>
            </div>
            
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.lastUpdated')}</p>
              <p className="text-sm text-slate-900">{formatDate(tenant.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Labor Law Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('tenants.laborLawSettings')}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.convenioCode')}</p>
              {tenant.convenioCode ? (
                <p className="text-sm text-slate-900 font-mono bg-slate-50 px-2 py-1 rounded inline-block">{tenant.convenioCode}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">{t('tenants.none')}</p>
              )}
            </div>
            
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.maxWeeklyHours')}</p>
              <p className="text-sm text-slate-900 font-semibold">{tenant.maxWeeklyHours} {t('tenants.hours')}</p>
            </div>
            
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">{t('tenants.maxAnnualHours')}</p>
              <p className="text-sm text-slate-900 font-semibold">{tenant.maxAnnualHours} {t('tenants.hours')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
