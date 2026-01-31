import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { Role, SUPPORTED_LOCALES, type Tenant, type SupportedLocale } from '@torre-tempo/shared';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';

// ============================================
// TYPES
// ============================================

interface TenantStats {
  totalUsers: number;
  activeLocations: number;
  totalEntries: number;
}

interface UpdateTenantRequest {
  name?: string;
  timezone?: string;
  locale?: string;
  convenioCode?: string | null;
  maxWeeklyHours?: number;
  maxAnnualHours?: number;
}

// ============================================
// CONSTANTS
// ============================================

const TIMEZONES = [
  'Europe/Madrid',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
] as const;

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  es: 'Espanol',
  en: 'English',
  fr: 'Francais',
  de: 'Deutsch',
  pl: 'Polski',
  'nl-BE': 'Nederlands (Belgie)',
};

// ============================================
// TOAST NOTIFICATION
// ============================================

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-slide-in ${
      type === 'success' 
        ? 'bg-green-50 border-green-200 text-green-800' 
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      <span className="flex-shrink-0">
        {type === 'success' ? (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </span>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-1 hover:bg-white/50 rounded-lg transition-colors"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ============================================
// STAT CARD
// ============================================

function StatCard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TenantSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const setAuth = useAuthStore((state) => state.setAuth);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    timezone: '',
    locale: '',
    convenioCode: '',
    maxWeeklyHours: 40,
    maxAnnualHours: 1822,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Fetch current tenant
  const { data: tenantData, isLoading: tenantLoading } = useQuery<Tenant>({
    queryKey: ['tenant', 'current'],
    queryFn: () => api.get('/tenants/current'),
    enabled: user?.role === Role.ADMIN || user?.role === Role.GLOBAL_ADMIN, // Only fetch if user is admin
  });

  // Fetch tenant stats
  const { data: statsData, isLoading: statsLoading } = useQuery<TenantStats>({
    queryKey: ['tenant', 'stats'],
    queryFn: () => api.get('/tenants/stats'),
    enabled: user?.role === Role.ADMIN || user?.role === Role.GLOBAL_ADMIN, // Only fetch if user is admin
  });

  // Initialize form with tenant data
  useEffect(() => {
    if (tenantData) {
      setFormData({
        name: tenantData.name,
        timezone: tenantData.timezone,
        locale: tenantData.locale,
        convenioCode: tenantData.convenioCode || '',
        maxWeeklyHours: tenantData.maxWeeklyHours,
        maxAnnualHours: tenantData.maxAnnualHours,
      });
    }
  }, [tenantData]);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Validate form
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('settings.validation.nameRequired');
    }

    if (!formData.timezone) {
      newErrors.timezone = t('settings.validation.timezoneRequired');
    } else if (!TIMEZONES.includes(formData.timezone as typeof TIMEZONES[number])) {
      newErrors.timezone = t('settings.validation.timezoneInvalid');
    }

    if (!formData.locale) {
      newErrors.locale = t('settings.validation.localeRequired');
    } else if (!SUPPORTED_LOCALES.includes(formData.locale as SupportedLocale)) {
      newErrors.locale = t('settings.validation.localeInvalid');
    }

    if (formData.maxWeeklyHours < 1 || formData.maxWeeklyHours > 168) {
      newErrors.maxWeeklyHours = t('settings.validation.maxWeeklyHoursRange');
    }

    if (formData.maxAnnualHours < 1 || formData.maxAnnualHours > 8760) {
      newErrors.maxAnnualHours = t('settings.validation.maxAnnualHoursRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  // Update tenant mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateTenantRequest) => api.patch<Tenant>('/tenants/current', data),
    onSuccess: (updatedTenant) => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      // Update auth store with new tenant data
      if (user && tenant) {
        setAuth(user, updatedTenant, useAuthStore.getState().accessToken || '');
      }
      setIsDirty(false);
      showToast(t('settings.saveSuccess'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || t('settings.saveError'), 'error');
    },
  });

  // Handle form change
  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const updateData: UpdateTenantRequest = {
      name: formData.name,
      timezone: formData.timezone,
      locale: formData.locale,
      convenioCode: formData.convenioCode || null,
      maxWeeklyHours: formData.maxWeeklyHours,
      maxAnnualHours: formData.maxAnnualHours,
    };

    updateMutation.mutate(updateData);
  };

  // Redirect non-admin users
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.GLOBAL_ADMIN)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  // Loading state
  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-6">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('settings.tenantTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('settings.tenantSubtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Company Information Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {t('settings.companyInfo')}
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Company Name */}
              <div className="sm:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('settings.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="mt-1.5 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Slug (read-only) */}
              <div className="sm:col-span-2">
                <label htmlFor="slug" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('settings.slug')}
                </label>
                <input
                  id="slug"
                  type="text"
                  value={tenantData?.slug || ''}
                  disabled
                  className="w-full px-4 h-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                  aria-describedby="slug-hint"
                />
                <p id="slug-hint" className="mt-1.5 text-xs text-slate-500">{t('settings.slugHint')}</p>
              </div>

              {/* Timezone */}
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('settings.timezone')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white ${
                    errors.timezone ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  aria-invalid={!!errors.timezone}
                  aria-describedby={errors.timezone ? 'timezone-error' : undefined}
                >
                  <option value="">{t('settings.selectTimezone')}</option>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                {errors.timezone && (
                  <p id="timezone-error" className="mt-1.5 text-sm text-red-600">{errors.timezone}</p>
                )}
              </div>

              {/* Locale */}
              <div>
                <label htmlFor="locale" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('settings.locale')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="locale"
                  value={formData.locale}
                  onChange={(e) => handleChange('locale', e.target.value)}
                  className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white ${
                    errors.locale ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  aria-invalid={!!errors.locale}
                  aria-describedby={errors.locale ? 'locale-error' : undefined}
                >
                  <option value="">{t('settings.selectLocale')}</option>
                  {SUPPORTED_LOCALES.map((loc) => (
                    <option key={loc} value={loc}>{LOCALE_LABELS[loc]}</option>
                  ))}
                </select>
                {errors.locale && (
                  <p id="locale-error" className="mt-1.5 text-sm text-red-600">{errors.locale}</p>
                )}
              </div>
            </div>
          </div>

          {/* Labor Law Settings Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {t('settings.laborLaw')}
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Convenio Code */}
              <div className="sm:col-span-2">
                <label htmlFor="convenioCode" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('settings.convenioCode')}
                </label>
                <input
                  id="convenioCode"
                  type="text"
                  value={formData.convenioCode}
                  onChange={(e) => handleChange('convenioCode', e.target.value)}
                  placeholder={t('settings.convenioCodePlaceholder')}
                  className="w-full px-4 h-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="mt-1.5 text-xs text-slate-500">{t('settings.convenioCodeHint')}</p>
              </div>

              {/* Max Weekly Hours */}
              <div>
                <label htmlFor="maxWeeklyHours" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('settings.maxWeeklyHours')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="maxWeeklyHours"
                  type="number"
                  min={1}
                  max={168}
                  value={formData.maxWeeklyHours}
                  onChange={(e) => handleChange('maxWeeklyHours', parseInt(e.target.value) || 0)}
                  className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.maxWeeklyHours ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  aria-invalid={!!errors.maxWeeklyHours}
                  aria-describedby={errors.maxWeeklyHours ? 'maxWeeklyHours-error' : 'maxWeeklyHours-hint'}
                />
                {errors.maxWeeklyHours ? (
                  <p id="maxWeeklyHours-error" className="mt-1.5 text-sm text-red-600">{errors.maxWeeklyHours}</p>
                ) : (
                  <p id="maxWeeklyHours-hint" className="mt-1.5 text-xs text-slate-500">{t('settings.maxWeeklyHoursHint')}</p>
                )}
              </div>

              {/* Max Annual Hours */}
              <div>
                <label htmlFor="maxAnnualHours" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('settings.maxAnnualHours')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="maxAnnualHours"
                  type="number"
                  min={1}
                  max={8760}
                  value={formData.maxAnnualHours}
                  onChange={(e) => handleChange('maxAnnualHours', parseInt(e.target.value) || 0)}
                  className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.maxAnnualHours ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  aria-invalid={!!errors.maxAnnualHours}
                  aria-describedby={errors.maxAnnualHours ? 'maxAnnualHours-error' : 'maxAnnualHours-hint'}
                />
                {errors.maxAnnualHours ? (
                  <p id="maxAnnualHours-error" className="mt-1.5 text-sm text-red-600">{errors.maxAnnualHours}</p>
                ) : (
                  <p id="maxAnnualHours-hint" className="mt-1.5 text-xs text-slate-500">{t('settings.maxAnnualHoursHint')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {t('settings.statistics')}
            </h2>

            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  title={t('settings.totalUsers')}
                  value={statsData?.totalUsers ?? 0}
                  icon={
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                />
                <StatCard
                  title={t('settings.activeLocations')}
                  value={statsData?.activeLocations ?? 0}
                  icon={
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
                <StatCard
                  title={t('settings.totalEntries')}
                  value={statsData?.totalEntries ?? 0}
                  icon={
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </div>
            )}
          </div>

          {/* Save Button - Sticky on mobile */}
          <div className="sticky bottom-20 md:bottom-0 bg-slate-50 -mx-4 px-4 py-4 md:mx-0 md:px-0 md:py-0 md:bg-transparent md:static">
            <button
              type="submit"
              disabled={updateMutation.isPending || !isDirty}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed disabled:shadow-none min-h-[48px]"
            >
              {updateMutation.isPending ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('settings.save')}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* CSS for animations */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
