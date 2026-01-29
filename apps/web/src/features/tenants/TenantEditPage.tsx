import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

// ============================================
// TYPES
// ============================================

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
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="flex gap-3">
          <div className="h-11 w-24 bg-slate-200 rounded-xl" />
          <div className="h-11 w-24 bg-slate-200 rounded-xl" />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
        <div className="h-4 bg-slate-200 rounded w-32" />
        <div className="space-y-4">
          <div className="h-12 bg-slate-200 rounded-xl w-full" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-12 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TenantEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    timezone: 'Europe/Madrid',
    locale: 'es',
    convenioCode: '',
    maxWeeklyHours: 40,
    maxAnnualHours: 1822,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch current tenant data
  const { data: tenant, isLoading, error } = useQuery<TenantDetail>({
    queryKey: ['tenant', id],
    queryFn: () => api.get(`/tenants/${id}`),
    enabled: !!id,
  });

  // Pre-populate form when tenant data loads
  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        timezone: tenant.timezone,
        locale: tenant.locale,
        convenioCode: tenant.convenioCode || '',
        maxWeeklyHours: tenant.maxWeeklyHours,
        maxAnnualHours: tenant.maxAnnualHours,
      });
    }
  }, [tenant]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateTenantRequest) => api.patch(`/tenants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      showToast(t('tenants.updateSuccess'), 'success');
      setTimeout(() => navigate(`/app/tenants/${id}`), 500);
    },
    onError: (err: Error) => {
      showToast(err.message || t('tenants.updateError'), 'error');
    },
  });

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('tenants.validation.nameRequired');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = t('tenants.validation.nameMinLength');
    }

    if (formData.maxWeeklyHours < 1 || formData.maxWeeklyHours > 168) {
      newErrors.maxWeeklyHours = t('tenants.validation.maxWeeklyHoursRange');
    }

    if (formData.maxAnnualHours < 1 || formData.maxAnnualHours > 8760) {
      newErrors.maxAnnualHours = t('tenants.validation.maxAnnualHoursRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

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

  const handleCancel = () => {
    navigate(`/app/tenants/${id}`);
  };

  const timezones = [
    'Europe/Madrid',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Amsterdam',
    'Europe/Brussels',
    'Europe/Warsaw',
    'Atlantic/Canary',
  ];

  const locales = [
    { value: 'es', label: 'Spanish' },
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'pl', label: 'Polish' },
    { value: 'nl-BE', label: 'Dutch (Belgian)' },
  ];

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
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
            onClick={() => navigate('/app/tenants')}
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
      {/* Toast notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('tenants.editTenant')}</h1>
          <p className="text-sm text-slate-500 mt-1">{tenant.name}</p>
        </div>
        
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">{t('common.cancel')}</span>
          </button>
          
          <button
            type="submit"
            form="edit-form"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl font-medium shadow-md shadow-blue-200 transition-all disabled:opacity-50 disabled:from-blue-400 disabled:to-blue-500 min-h-[44px]"
          >
            {updateMutation.isPending && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">{t('common.save')}</span>
          </button>
        </div>
      </div>

      {/* Edit Form */}
      <form id="edit-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {t('tenants.companyInfo')}
          </h2>

          {/* Company Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('tenants.companyName')} <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
              placeholder={t('tenants.companyNamePlaceholder')}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="mt-1.5 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Timezone and Locale in grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('tenants.timezone')}
              </label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 h-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            {/* Locale */}
            <div>
              <label htmlFor="locale" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('tenants.locale')}
              </label>
              <select
                id="locale"
                value={formData.locale}
                onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                className="w-full px-4 h-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                {locales.map((loc) => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Identifier (read-only) */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('tenants.identifier')}
            </label>
            <input
              id="slug"
              type="text"
              value={tenant.slug}
              disabled
              className="w-full px-4 h-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs text-slate-500">{t('tenants.identifierHint')}</p>
          </div>
        </div>

        {/* Labor Law Settings Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('tenants.laborLawSettings')}
          </h2>

          {/* Convenio Code */}
          <div>
            <label htmlFor="convenioCode" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('tenants.convenioCode')}
            </label>
            <input
              id="convenioCode"
              type="text"
              value={formData.convenioCode}
              onChange={(e) => setFormData({ ...formData, convenioCode: e.target.value })}
              className="w-full px-4 h-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder={t('tenants.convenioCodePlaceholder')}
            />
            <p className="mt-1.5 text-xs text-slate-500">{t('tenants.convenioCodeHint')}</p>
          </div>

          {/* Max Weekly/Annual Hours in grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Max Weekly Hours */}
            <div>
              <label htmlFor="maxWeeklyHours" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('tenants.maxWeeklyHours')}
              </label>
              <input
                id="maxWeeklyHours"
                type="number"
                inputMode="numeric"
                min={1}
                max={168}
                value={formData.maxWeeklyHours}
                onChange={(e) => setFormData({ ...formData, maxWeeklyHours: parseInt(e.target.value) || 40 })}
                className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.maxWeeklyHours ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
                placeholder={t('tenants.maxWeeklyHoursPlaceholder')}
                aria-invalid={!!errors.maxWeeklyHours}
                aria-describedby={errors.maxWeeklyHours ? 'maxWeeklyHours-error' : undefined}
              />
              {errors.maxWeeklyHours && (
                <p id="maxWeeklyHours-error" className="mt-1.5 text-sm text-red-600">{errors.maxWeeklyHours}</p>
              )}
            </div>

            {/* Max Annual Hours */}
            <div>
              <label htmlFor="maxAnnualHours" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('tenants.maxAnnualHours')}
              </label>
              <input
                id="maxAnnualHours"
                type="number"
                inputMode="numeric"
                min={1}
                max={8760}
                value={formData.maxAnnualHours}
                onChange={(e) => setFormData({ ...formData, maxAnnualHours: parseInt(e.target.value) || 1822 })}
                className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.maxAnnualHours ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
                placeholder={t('tenants.maxAnnualHoursPlaceholder')}
                aria-invalid={!!errors.maxAnnualHours}
                aria-describedby={errors.maxAnnualHours ? 'maxAnnualHours-error' : undefined}
              />
              {errors.maxAnnualHours && (
                <p id="maxAnnualHours-error" className="mt-1.5 text-sm text-red-600">{errors.maxAnnualHours}</p>
              )}
            </div>
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
