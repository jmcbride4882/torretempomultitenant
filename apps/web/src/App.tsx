import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@torre-tempo/shared';
import { useAuthStore } from './lib/store';
import { authApi } from './lib/api';
import LandingPage from './features/landing/LandingPage';
import { ClockingPage } from './features/clocking/ClockingPage';
import { ApprovalsPage } from './features/approvals/ApprovalsPage';
import { OvertimePage } from './features/overtime/OvertimePage';
import { ReportsPage } from './features/reports/ReportsPage';
import { MyReportsPage } from './features/reports/MyReportsPage';
import { LocationsPage } from './features/locations/LocationsPage';
import { UsersPage } from './features/users/UsersPage';
import { EmployeeDashboard, ManagerDashboard, AdminDashboard, GlobalAdminDashboard } from './features/dashboard';
import { TenantSettingsPage } from './features/settings/TenantSettingsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { TenantManagementPage } from './features/tenants/TenantManagementPage';
import { TenantDetailPage } from './features/tenants/TenantDetailPage';
import { TenantEditPage } from './features/tenants/TenantEditPage';
import { SchedulingPage } from './features/scheduling/SchedulingPage';
import { MySchedulePage } from './features/scheduling/MySchedulePage';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { InstallPrompt, OfflineIndicator } from './components/pwa';
import { AppLayout } from './components/layout';

// ============================================
// LOGIN PAGE
// ============================================
function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login({ email, password });
      setAuth(response.user, response.tenant, response.accessToken);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <span className="text-white font-bold text-2xl">TT</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Torre Tempo</h1>
          <p className="text-slate-500 text-sm mt-1">Staff Clocking System</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            {t('login.title')}
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('login.email')}
              </label>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 h-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                placeholder="tu@email.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 h-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                placeholder="********"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-not-allowed shadow-md shadow-blue-200 active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('common.loading')}
                </span>
              ) : (
                t('login.submit')
              )}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              {t('login.forgotPassword')}
            </a>
          </div>
        </div>
        
        <p className="mt-6 text-center text-sm text-slate-600">
          {t('login.noAccount')}{' '}
          <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
            {t('login.signUp')}
          </a>
        </p>
      </div>
    </div>
  );
}



// ============================================
// DASHBOARD PAGE (Role-Based)
// ============================================
function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  switch (user.role) {
    case Role.GLOBAL_ADMIN:
      // If GLOBAL_ADMIN has a tenant, show AdminDashboard
      // They can access GlobalAdminDashboard via /app/system route
      return user.tenantId ? <AdminDashboard /> : <GlobalAdminDashboard />;
    case Role.ADMIN:
      return <AdminDashboard />;
    case Role.MANAGER:
      return <ManagerDashboard />;
    default:
      return <EmployeeDashboard />;
  }
}

// ============================================
// COMPLIANCE PAGE (Placeholder)
// ============================================
function CompliancePage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t('compliance.notChecked')}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t('compliance.checking')}
        </p>
      </div>
    </div>
  );
}

// ============================================
// PROTECTED ROUTE
// ============================================
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}

// ============================================
// APP ROOT
// ============================================
export default function App() {
  return (
    <>
      {/* PWA Components */}
      <OfflineIndicator />
      <InstallPrompt />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected app routes */}
        <Route
          path="/app/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/clock"
          element={
            <ProtectedRoute>
              <ClockingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/approvals"
          element={
            <ProtectedRoute>
              <ApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/overtime"
          element={
            <ProtectedRoute>
              <OvertimePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/my-reports"
          element={
            <ProtectedRoute>
              <MyReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/locations"
          element={
            <ProtectedRoute>
              <LocationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/settings"
          element={
            <ProtectedRoute>
              <TenantSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/compliance"
          element={
            <ProtectedRoute>
              <CompliancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/tenants"
          element={
            <ProtectedRoute>
              <TenantManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/tenants/:id"
          element={
            <ProtectedRoute>
              <TenantDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/tenants/:id/edit"
          element={
            <ProtectedRoute>
              <TenantEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/system"
          element={
            <ProtectedRoute>
              <GlobalAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/schedule"
          element={
            <ProtectedRoute>
              <SchedulingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/my-schedule"
          element={
            <ProtectedRoute>
              <MySchedulePage />
            </ProtectedRoute>
          }
        />
        
        {/* Redirects */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/clock" element={<Navigate to="/app/clock" replace />} />
        <Route path="/approvals" element={<Navigate to="/app/approvals" replace />} />
        <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
        <Route path="/my-reports" element={<Navigate to="/app/my-reports" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
