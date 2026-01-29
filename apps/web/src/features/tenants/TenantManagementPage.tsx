import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

// ============================================
// TYPES
// ============================================

interface Tenant {
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
  _count?: {
    users: number;
    locations: number;
  };
}

interface TenantsResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  pageSize: number;
}

interface CreateTenantRequest {
  name: string;
  timezone?: string;
  locale?: string;
  convenioCode?: string;
  maxWeeklyHours?: number;
  maxAnnualHours?: number;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
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
// TENANT FORM MODAL
// ============================================

interface TenantFormProps {
  onSubmit: (data: CreateTenantRequest) => void;
  onClose: () => void;
  isLoading: boolean;
}

function TenantFormModal({ onSubmit, onClose, isLoading }: TenantFormProps) {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    name: '',
    timezone: 'Europe/Madrid',
    locale: 'es',
    convenioCode: '',
    maxWeeklyHours: 40,
    maxAnnualHours: 1822,
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    adminFirstName: '',
    adminLastName: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = t('tenants.validation.nameRequired');
    }
    
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = t('tenants.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = t('tenants.validation.emailInvalid');
    }
    
    if (!formData.adminPassword) {
      newErrors.adminPassword = t('tenants.validation.passwordRequired');
    } else if (formData.adminPassword.length < 8) {
      newErrors.adminPassword = t('tenants.validation.passwordMinLength');
    }
    
    if (formData.adminPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('tenants.validation.passwordMismatch');
    }
    
    if (!formData.adminFirstName.trim()) {
      newErrors.adminFirstName = t('tenants.validation.firstNameRequired');
    }
    
    if (!formData.adminLastName.trim()) {
      newErrors.adminLastName = t('tenants.validation.lastNameRequired');
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
    
    const createData: CreateTenantRequest = {
      name: formData.name,
      timezone: formData.timezone || undefined,
      locale: formData.locale || undefined,
      convenioCode: formData.convenioCode || undefined,
      maxWeeklyHours: formData.maxWeeklyHours,
      maxAnnualHours: formData.maxAnnualHours,
      adminEmail: formData.adminEmail,
      adminPassword: formData.adminPassword,
      adminFirstName: formData.adminFirstName,
      adminLastName: formData.adminLastName,
    };
    onSubmit(createData);
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 id="form-title" className="text-xl font-bold text-slate-900">
              {t('tenants.create')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label={t('common.close')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Company Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              {t('tenants.companyInfo')}
            </h3>
            
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
          </div>

          {/* Labor Law Section */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              {t('tenants.laborLawSettings')}
            </h3>

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

          {/* Admin Account Section */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              {t('tenants.adminAccount')}
            </h3>
            <p className="text-sm text-slate-500">{t('tenants.adminAccountHint')}</p>

            {/* Admin Name in grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Admin First Name */}
              <div>
                <label htmlFor="adminFirstName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('tenants.adminFirstName')} <span className="text-red-500">*</span>
                </label>
                 <input
                   id="adminFirstName"
                   type="text"
                   value={formData.adminFirstName}
                   onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                   className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                     errors.adminFirstName ? 'border-red-300 bg-red-50' : 'border-slate-200'
                   }`}
                   placeholder={t('tenants.adminFirstNamePlaceholder')}
                   aria-invalid={!!errors.adminFirstName}
                   aria-describedby={errors.adminFirstName ? 'adminFirstName-error' : undefined}
                 />
                {errors.adminFirstName && (
                  <p id="adminFirstName-error" className="mt-1.5 text-sm text-red-600">{errors.adminFirstName}</p>
                )}
              </div>

              {/* Admin Last Name */}
              <div>
                <label htmlFor="adminLastName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('tenants.adminLastName')} <span className="text-red-500">*</span>
                </label>
                 <input
                   id="adminLastName"
                   type="text"
                   value={formData.adminLastName}
                   onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                   className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                     errors.adminLastName ? 'border-red-300 bg-red-50' : 'border-slate-200'
                   }`}
                   placeholder={t('tenants.adminLastNamePlaceholder')}
                   aria-invalid={!!errors.adminLastName}
                   aria-describedby={errors.adminLastName ? 'adminLastName-error' : undefined}
                 />
                {errors.adminLastName && (
                  <p id="adminLastName-error" className="mt-1.5 text-sm text-red-600">{errors.adminLastName}</p>
                )}
              </div>
            </div>

            {/* Admin Email */}
            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('tenants.adminEmail')} <span className="text-red-500">*</span>
              </label>
              <input
                id="adminEmail"
                type="email"
                inputMode="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.adminEmail ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
                placeholder={t('tenants.adminEmailPlaceholder')}
                aria-invalid={!!errors.adminEmail}
                aria-describedby={errors.adminEmail ? 'adminEmail-error' : undefined}
              />
              {errors.adminEmail && (
                <p id="adminEmail-error" className="mt-1.5 text-sm text-red-600">{errors.adminEmail}</p>
              )}
            </div>

            {/* Password fields in grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Admin Password */}
              <div>
                <label htmlFor="adminPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('tenants.adminPassword')} <span className="text-red-500">*</span>
                </label>
                 <input
                   id="adminPassword"
                   type="password"
                   value={formData.adminPassword}
                   onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                   className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                     errors.adminPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'
                   }`}
                   placeholder={t('tenants.adminPasswordPlaceholder')}
                   aria-invalid={!!errors.adminPassword}
                   aria-describedby={errors.adminPassword ? 'adminPassword-error' : undefined}
                 />
                {errors.adminPassword && (
                  <p id="adminPassword-error" className="mt-1.5 text-sm text-red-600">{errors.adminPassword}</p>
                )}
                <p className="mt-1.5 text-xs text-slate-500">{t('tenants.passwordHint')}</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('tenants.confirmPassword')} <span className="text-red-500">*</span>
                </label>
                 <input
                   id="confirmPassword"
                   type="password"
                   value={formData.confirmPassword}
                   onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                   className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                     errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'
                   }`}
                   placeholder={t('tenants.confirmPasswordPlaceholder')}
                   aria-invalid={!!errors.confirmPassword}
                   aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                 />
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="mt-1.5 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Form actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-md shadow-blue-200 transition-all disabled:opacity-50 disabled:from-blue-400 disabled:to-blue-500 flex items-center gap-2 min-h-[44px]"
            >
              {isLoading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {t('tenants.createTenant')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// TENANT CARD (Mobile)
// ============================================

interface TenantCardProps {
  tenant: Tenant;
  onView: (tenant: Tenant) => void;
}

function TenantCard({ tenant, onView }: TenantCardProps) {
  const { t } = useTranslation();
  const userCount = tenant._count?.users ?? 0;
  const locationCount = tenant._count?.locations ?? 0;
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{tenant.name}</h3>
            <p className="text-sm text-slate-500">{tenant.slug}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-slate-600">{userCount} {t('tenants.users')}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-slate-600">{locationCount} {t('tenants.locations')}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-slate-100">
        <div>
          <p className="text-slate-500">{t('tenants.timezone')}</p>
          <p className="font-medium text-slate-700">{tenant.timezone}</p>
        </div>
        <div>
          <p className="text-slate-500">{t('tenants.locale')}</p>
          <p className="font-medium text-slate-700">{tenant.locale.toUpperCase()}</p>
        </div>
      </div>
      
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => onView(tenant)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors min-h-[44px]"
          aria-label={`${t('tenants.viewDetails')} ${tenant.name}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {t('tenants.viewDetails')}
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TenantManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const pageSize = 20;

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch tenants
  const { data, isLoading, error } = useQuery<TenantsResponse>({
    queryKey: ['tenants', page, pageSize, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      return api.get(`/tenants?${params.toString()}`);
    },
  });

  // Create tenant mutation
  const createMutation = useMutation({
    mutationFn: (createData: CreateTenantRequest) => api.post<Tenant>('/tenants', createData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowForm(false);
      showToast(t('tenants.createSuccess'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || t('tenants.createError'), 'error');
    },
  });

  // Handlers
  const handleCreate = () => {
    setShowForm(true);
  };

  const handleFormSubmit = (formData: CreateTenantRequest) => {
    createMutation.mutate(formData);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleViewTenant = (tenant: Tenant) => {
    navigate(`/app/tenants/${tenant.id}`);
  };

  // Calculate pagination
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const tenants = data?.tenants || [];

  // Loading state
  if (isLoading && !data) {
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

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-900 font-medium">{t('common.error')}</p>
          <p className="text-sm text-slate-500 mt-1">{(error as Error).message}</p>
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
          <h1 className="text-2xl font-bold text-slate-900">{t('tenants.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data?.total ? t('tenants.totalCount', { count: data.total }) : t('tenants.noTenants')}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] min-h-[44px]"
          aria-label={t('tenants.addTenant')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">{t('tenants.addTenant')}</span>
          <span className="sm:hidden">{t('tenants.add')}</span>
        </button>
      </div>

      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-slate-50 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearch}
            placeholder={t('tenants.searchPlaceholder')}
            className="w-full pl-12 pr-4 h-12 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            aria-label={t('tenants.searchPlaceholder')}
          />
        </div>
      </div>

      {/* Empty state */}
      {tenants.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('tenants.noTenantsFound')}</h3>
          <p className="text-slate-500 mb-6">{t('tenants.noTenantsDescription')}</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('tenants.addTenant')}
          </button>
        </div>
      )}

      {/* Tenants list - Desktop Table */}
      {tenants.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('tenants.company')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('tenants.slug')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('tenants.users')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('tenants.locations')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('tenants.timezone')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('tenants.createdAt')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('tenants.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((tenant) => {
                  const userCount = tenant._count?.users ?? 0;
                  const locationCount = tenant._count?.locations ?? 0;
                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{tenant.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                        {tenant.slug}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          {userCount}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {locationCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {tenant.timezone}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewTenant(tenant)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label={`${t('tenants.viewDetails')} ${tenant.name}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tenants list - Mobile Cards */}
          <div className="md:hidden space-y-4">
            {tenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onView={handleViewTenant}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                {t('tenants.pagination', { 
                  start: (page - 1) * pageSize + 1, 
                  end: Math.min(page * pageSize, data?.total || 0), 
                  total: data?.total || 0 
                })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={t('common.back')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                        aria-label={`Page ${pageNum}`}
                        aria-current={page === pageNum ? 'page' : undefined}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={t('common.next')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tenant Form Modal */}
      {showForm && (
        <TenantFormModal
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
