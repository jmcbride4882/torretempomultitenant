import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Role, SUPPORTED_LOCALES, type SupportedLocale } from '@torre-tempo/shared';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';

// ============================================
// TYPES
// ============================================

interface UserProfile {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  employeeCode: string | null;
  role: Role;
  isActive: boolean;
  locale: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  locale?: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================
// CONSTANTS
// ============================================

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  pl: 'Polski',
  'nl-BE': 'Nederlands (België)',
};

const ROLE_COLORS: Record<Role, { bg: string; text: string }> = {
  [Role.GLOBAL_ADMIN]: { bg: 'bg-red-100', text: 'text-red-800' },
  [Role.ADMIN]: { bg: 'bg-blue-100', text: 'text-blue-800' },
  [Role.MANAGER]: { bg: 'bg-purple-100', text: 'text-purple-800' },
  [Role.EMPLOYEE]: { bg: 'bg-green-100', text: 'text-green-800' },
};

const ROLE_LABELS: Record<Role, string> = {
  [Role.GLOBAL_ADMIN]: 'Global Admin',
  [Role.ADMIN]: 'Admin',
  [Role.MANAGER]: 'Manager',
  [Role.EMPLOYEE]: 'Employee',
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
// USER AVATAR
// ============================================

function UserAvatar({ firstName, lastName, size = 'lg' }: { firstName: string; lastName: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl',
  };
  
  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
      {initials}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const tenant = useAuthStore((state) => state.tenant);
  const setAuth = useAuthStore((state) => state.setAuth);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    locale: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);

  // Fetch current user profile
  const { data: userData, isLoading } = useQuery<UserProfile>({
    queryKey: ['users', 'me'],
    queryFn: () => api.get('/users/me'),
  });

  // Initialize form with user data
  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        locale: userData.locale || '',
      });
    }
  }, [userData]);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Validate profile form
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('profile.validation.firstNameRequired');
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('profile.validation.lastNameRequired');
    }

    if (formData.locale && !SUPPORTED_LOCALES.includes(formData.locale as SupportedLocale)) {
      newErrors.locale = t('profile.validation.localeInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  // Validate password form
  const validatePassword = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = t('profile.validation.currentPasswordRequired');
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = t('profile.validation.newPasswordRequired');
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = t('profile.validation.passwordMinLength');
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = t('profile.validation.passwordMismatch');
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [passwordData, t]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => api.patch<UserProfile>('/users/me', data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      // Update auth store with new user data
      const currentUser = useAuthStore.getState().user;
      const accessToken = useAuthStore.getState().accessToken;
      if (currentUser && tenant && accessToken) {
        setAuth({ ...currentUser, ...updatedUser }, tenant, accessToken);
      }
      setIsDirty(false);
      showToast(t('profile.saveSuccess'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || t('profile.saveError'), 'error');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => api.patch('/users/me/password', data),
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsPasswordSectionOpen(false);
      showToast(t('profile.passwordChangeSuccess'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || t('profile.passwordChangeError'), 'error');
    },
  });

  // Handle form change
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Handle password form change
  const handlePasswordChange = (field: keyof typeof passwordData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Handle profile submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const updateData: UpdateProfileRequest = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      ...(formData.locale && { locale: formData.locale }),
    };

    updateProfileMutation.mutate(updateData);
  };

  // Handle password submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) return;

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
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

  if (!userData) {
    return null;
  }

  const roleColors = ROLE_COLORS[userData.role];

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
          <h1 className="text-2xl font-bold text-slate-900">{t('profile.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('profile.subtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Personal Information Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('profile.personalInfo')}
            </h2>

            {/* User Avatar and Name */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <UserAvatar firstName={userData.firstName} lastName={userData.lastName} />
              <div>
                <p className="text-xl font-semibold text-slate-900">
                  {userData.firstName} {userData.lastName}
                </p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors.bg} ${roleColors.text}`}>
                  {ROLE_LABELS[userData.role]}
                </span>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('profile.firstName')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.firstName ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                />
                {errors.firstName && (
                  <p id="firstName-error" className="mt-1.5 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('profile.lastName')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.lastName ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                />
                {errors.lastName && (
                  <p id="lastName-error" className="mt-1.5 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>

              {/* Email (read-only) */}
              <div className="sm:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('profile.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={userData.email}
                  disabled
                  className="w-full px-4 h-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                  aria-describedby="email-hint"
                />
                <p id="email-hint" className="mt-1.5 text-xs text-slate-500">{t('profile.emailHint')}</p>
              </div>

              {/* Employee Code (read-only if set) */}
              {userData.employeeCode && (
                <div>
                  <label htmlFor="employeeCode" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t('profile.employeeCode')}
                  </label>
                  <input
                    id="employeeCode"
                    type="text"
                    value={userData.employeeCode}
                    disabled
                    className="w-full px-4 h-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              )}

              {/* Language Preference */}
              <div>
                <label htmlFor="locale" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('profile.language')}
                </label>
                <select
                  id="locale"
                  value={formData.locale}
                  onChange={(e) => handleChange('locale', e.target.value)}
                  className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white ${
                    errors.locale ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  aria-invalid={!!errors.locale}
                  aria-describedby={errors.locale ? 'locale-error' : 'locale-hint'}
                >
                  <option value="">{t('profile.useCompanyDefault')}</option>
                  {SUPPORTED_LOCALES.map((loc) => (
                    <option key={loc} value={loc}>{LOCALE_LABELS[loc]}</option>
                  ))}
                </select>
                {errors.locale ? (
                  <p id="locale-error" className="mt-1.5 text-sm text-red-600">{errors.locale}</p>
                ) : (
                  <p id="locale-hint" className="mt-1.5 text-xs text-slate-500">{t('profile.languageHint')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t('profile.security')}
            </h2>

            {/* Change Password Collapsible */}
            <button
              type="button"
              onClick={() => setIsPasswordSectionOpen(!isPasswordSectionOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-700">{t('profile.changePassword')}</span>
              <svg
                className={`w-5 h-5 text-slate-400 transition-transform ${isPasswordSectionOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isPasswordSectionOpen && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('profile.currentPassword')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        passwordErrors.currentPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'
                      }`}
                      aria-invalid={!!passwordErrors.currentPassword}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="mt-1.5 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('profile.newPassword')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        passwordErrors.newPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'
                      }`}
                      aria-invalid={!!passwordErrors.newPassword}
                    />
                    {passwordErrors.newPassword ? (
                      <p className="mt-1.5 text-sm text-red-600">{passwordErrors.newPassword}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-slate-500">{t('profile.passwordHint')}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('profile.confirmPassword')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        passwordErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'
                      }`}
                      aria-invalid={!!passwordErrors.confirmPassword}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1.5 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Change Password Button */}
                  <button
                    type="button"
                    onClick={handlePasswordSubmit}
                    disabled={changePasswordMutation.isPending}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl shadow-md transition-all active:scale-[0.98] disabled:bg-slate-400 disabled:cursor-not-allowed min-h-[48px]"
                  >
                    {changePasswordMutation.isPending ? (
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        {t('profile.updatePassword')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Account Information Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('profile.accountInfo')}
            </h2>

            <dl className="space-y-4">
              {/* Company */}
              {tenant && (
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <dt className="text-sm font-medium text-slate-500">{t('profile.company')}</dt>
                  <dd className="text-sm text-slate-900 mt-1 sm:mt-0">{tenant.name}</dd>
                </div>
              )}

              {/* Role */}
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="text-sm font-medium text-slate-500">{t('profile.role')}</dt>
                <dd className="text-sm mt-1 sm:mt-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors.bg} ${roleColors.text}`}>
                    {ROLE_LABELS[userData.role]}
                  </span>
                </dd>
              </div>

              {/* Member Since */}
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="text-sm font-medium text-slate-500">{t('profile.memberSince')}</dt>
                <dd className="text-sm text-slate-900 mt-1 sm:mt-0">{formatDate(userData.createdAt)}</dd>
              </div>

              {/* Last Updated */}
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="text-sm font-medium text-slate-500">{t('profile.lastUpdated')}</dt>
                <dd className="text-sm text-slate-900 mt-1 sm:mt-0">{formatDate(userData.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Save Button - Sticky on mobile */}
          <div className="sticky bottom-20 md:bottom-0 bg-slate-50 -mx-4 px-4 py-4 md:mx-0 md:px-0 md:py-0 md:bg-transparent md:static">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending || !isDirty}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed disabled:shadow-none min-h-[48px]"
            >
              {updateProfileMutation.isPending ? (
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
                  {t('profile.save')}
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
