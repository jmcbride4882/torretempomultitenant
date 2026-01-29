import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Role } from '@torre-tempo/shared';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';

// ============================================
// TYPES
// ============================================

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeCode: string | null;
  role: Role;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
  role?: Role;
  isActive?: boolean;
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
// ROLE BADGE
// ============================================

function RoleBadge({ role }: { role: Role }) {
  const { t } = useTranslation();
  
  const styles = {
    [Role.GLOBAL_ADMIN]: 'bg-red-100 text-red-700',
    [Role.ADMIN]: 'bg-purple-100 text-purple-700',
    [Role.MANAGER]: 'bg-blue-100 text-blue-700',
    [Role.EMPLOYEE]: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[role]}`}>
      {t(`users.roles.${role.toLowerCase()}`)}
    </span>
  );
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isActive ? t('users.active') : t('users.inactive')}
    </span>
  );
}

// ============================================
// CONFIRMATION DIALOG
// ============================================

function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  confirmLabel, 
  onConfirm, 
  onCancel,
  isDestructive = false,
  isLoading = false
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  confirmLabel: string;
  onConfirm: () => void; 
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h3 id="confirm-title" className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p id="confirm-message" className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// USER FORM MODAL
// ============================================

interface UserFormProps {
  user?: User | null;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => void;
  onClose: () => void;
  isLoading: boolean;
}

function UserFormModal({ user, onSubmit, onClose, isLoading }: UserFormProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const isEditing = Boolean(user);
  const canEditRole = currentUser?.role === Role.ADMIN || currentUser?.role === Role.MANAGER;
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    employeeCode: user?.employeeCode || '',
    role: user?.role || Role.EMPLOYEE,
    isActive: user?.isActive ?? true,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = t('users.validation.firstNameRequired');
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('users.validation.lastNameRequired');
    }
    
    if (!isEditing) {
      if (!formData.email.trim()) {
        newErrors.email = t('users.validation.emailRequired');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = t('users.validation.emailInvalid');
      }
      
      if (!formData.password) {
        newErrors.password = t('users.validation.passwordRequired');
      } else if (formData.password.length < 8) {
        newErrors.password = t('users.validation.passwordMinLength');
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('users.validation.passwordMismatch');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEditing, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    if (isEditing) {
      const updateData: UpdateUserRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        employeeCode: formData.employeeCode || undefined,
        role: formData.role,
        isActive: formData.isActive,
      };
      onSubmit(updateData);
    } else {
      const createData: CreateUserRequest = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        employeeCode: formData.employeeCode || undefined,
      };
      onSubmit(createData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 id="form-title" className="text-xl font-bold text-slate-900">
              {isEditing ? t('users.edit') : t('users.create')}
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
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('users.firstName')} <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
              {t('users.lastName')} <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
          
          {/* Email (only for create) */}
          {!isEditing && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('users.email')} <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          )}
          
          {/* Password fields (only for create) */}
          {!isEditing && (
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('users.password')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                {errors.password && (
                  <p id="password-error" className="mt-1.5 text-sm text-red-600">{errors.password}</p>
                )}
                <p className="mt-1.5 text-xs text-slate-500">{t('users.passwordHint')}</p>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('users.confirmPassword')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full px-4 h-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                />
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="mt-1.5 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}
          
          {/* Employee Code */}
          <div>
            <label htmlFor="employeeCode" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('users.employeeCode')}
            </label>
            <input
              id="employeeCode"
              type="text"
              value={formData.employeeCode}
              onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
              className="w-full px-4 h-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder={t('users.employeeCodePlaceholder')}
            />
          </div>
          
          {/* Role selector (only for edit and if user has permission) */}
          {isEditing && canEditRole && (
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('users.role')}
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full px-4 h-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
                disabled={user?.id === currentUser?.id}
              >
                <option value={Role.EMPLOYEE}>{t('users.roles.employee')}</option>
                <option value={Role.MANAGER}>{t('users.roles.manager')}</option>
                <option value={Role.ADMIN}>{t('users.roles.admin')}</option>
              </select>
              {user?.id === currentUser?.id && (
                <p className="mt-1.5 text-xs text-slate-500">{t('users.cannotChangeOwnRole')}</p>
              )}
            </div>
          )}
          
          {/* Status toggle (only for edit) */}
          {isEditing && (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-900">{t('users.status')}</p>
                <p className="text-sm text-slate-500">{t('users.statusHint')}</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  formData.isActive ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                role="switch"
                aria-checked={formData.isActive}
                aria-label={t('users.status')}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
          
          {/* Role info (display only) */}
          {!isEditing && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>{t('users.roleNote')}:</strong> {t('users.roleNoteDescription')}
              </p>
            </div>
          )}
          
          {/* Form actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-md shadow-blue-200 transition-all disabled:opacity-50 disabled:from-blue-400 disabled:to-blue-500 flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// USER CARD (Mobile)
// ============================================

interface UserCardProps {
  user: User;
  currentUserId: string | undefined;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
}

function UserCard({ user, currentUserId, onEdit, onDeactivate }: UserCardProps) {
  const { t } = useTranslation();
  const isCurrentUser = user.id === currentUserId;
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
            <span className="text-lg font-semibold text-slate-600">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        <StatusBadge isActive={user.isActive} />
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500">{t('users.role')}</p>
          <RoleBadge role={user.role} />
        </div>
        <div>
          <p className="text-slate-500">{t('users.employeeCode')}</p>
          <p className="font-medium text-slate-900">{user.employeeCode || '-'}</p>
        </div>
      </div>
      
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => onEdit(user)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors min-h-[44px]"
          aria-label={`${t('common.edit')} ${user.firstName} ${user.lastName}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {t('common.edit')}
        </button>
        {user.isActive && !isCurrentUser && (
          <button
            onClick={() => onDeactivate(user)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors min-h-[44px]"
            aria-label={`${t('users.deactivate')} ${user.firstName} ${user.lastName}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            {t('users.deactivate')}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  
  // State
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const pageSize = 20;

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch users
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ['users', page, pageSize, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      return api.get(`/users?${params.toString()}`);
    },
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => api.post<User>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      showToast(t('users.createSuccess'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || t('users.createError'), 'error');
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => 
      api.patch<User>(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setEditingUser(null);
      showToast(t('users.updateSuccess'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || t('users.updateError'), 'error');
    },
  });

  // Deactivate user mutation
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete<User>(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setUserToDeactivate(null);
      showToast(t('users.deactivateSuccess'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || t('users.deactivateError'), 'error');
    },
  });

  // Handlers
  const handleCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleFormSubmit = (formData: CreateUserRequest | UpdateUserRequest) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: formData as UpdateUserRequest });
    } else {
      createMutation.mutate(formData as CreateUserRequest);
    }
  };

  const handleDeactivateConfirm = () => {
    if (userToDeactivate) {
      deactivateMutation.mutate(userToDeactivate.id);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  // Calculate pagination
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const users = data?.users || [];

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
          <h1 className="text-2xl font-bold text-slate-900">{t('users.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data?.total ? t('users.totalCount', { count: data.total }) : t('users.noUsers')}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] min-h-[44px]"
          aria-label={t('users.addEmployee')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">{t('users.addEmployee')}</span>
          <span className="sm:hidden">{t('users.add')}</span>
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
            placeholder={t('users.searchPlaceholder')}
            className="w-full pl-12 pr-4 h-12 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            aria-label={t('users.searchPlaceholder')}
          />
        </div>
      </div>

      {/* Empty state */}
      {users.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('users.noUsersFound')}</h3>
          <p className="text-slate-500 mb-6">{t('users.noUsersDescription')}</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('users.addEmployee')}
          </button>
        </div>
      )}

      {/* Users list - Desktop Table */}
      {users.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('users.name')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('users.email')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('users.employeeCode')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('users.role')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('users.status')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('users.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-slate-600">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {user.firstName} {user.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.employeeCode || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge isActive={user.isActive} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label={`${t('common.edit')} ${user.firstName} ${user.lastName}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {user.isActive && !isCurrentUser && (
                            <button
                              onClick={() => setUserToDeactivate(user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label={`${t('users.deactivate')} ${user.firstName} ${user.lastName}`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Users list - Mobile Cards */}
          <div className="md:hidden space-y-4">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                currentUserId={currentUser?.id}
                onEdit={handleEdit}
                onDeactivate={setUserToDeactivate}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                {t('users.pagination', { 
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

      {/* User Form Modal */}
      {showForm && (
        <UserFormModal
          user={editingUser}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!userToDeactivate}
        title={t('users.deactivateTitle')}
        message={t('users.deactivateMessage', { 
          name: userToDeactivate ? `${userToDeactivate.firstName} ${userToDeactivate.lastName}` : '' 
        })}
        confirmLabel={t('users.deactivate')}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setUserToDeactivate(null)}
        isDestructive
        isLoading={deactivateMutation.isPending}
      />

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
