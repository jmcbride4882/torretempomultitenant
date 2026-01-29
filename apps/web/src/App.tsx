import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './lib/store';
import { authApi } from './lib/api';
import LandingPage from './features/landing/LandingPage';
import { ClockingPage } from './features/clocking/ClockingPage';
import { ApprovalsPage } from './features/approvals/ApprovalsPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { MyReportsPage } from './features/reports/MyReportsPage';

// Login Page
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">TT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Torre Tempo</h1>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {t('login.title')}
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('login.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="tu@email.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? t('common.loading') : t('login.submit')}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
              {t('login.forgotPassword')}
            </a>
          </div>
        </div>
        
        <p className="mt-6 text-center text-sm text-gray-600">
          {t('login.noAccount')}{' '}
          <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
            {t('login.signUp')}
          </a>
        </p>
      </div>
    </div>
  );
}

// Dashboard Page
function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TT</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Torre Tempo</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="/app/dashboard" className="text-sm font-medium text-blue-600">Dashboard</a>
            <a href="/app/clock" className="text-sm font-medium text-gray-600 hover:text-gray-900">Fichar</a>
            <a href="/app/entries" className="text-sm font-medium text-gray-600 hover:text-gray-900">Registros</a>
            <a href="/app/approvals" className="text-sm font-medium text-gray-600 hover:text-gray-900">Approvals</a>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t('dashboard.title')}
        </h1>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">{t('dashboard.todayHours')}</p>
            <p className="text-3xl font-bold text-gray-900">0:00</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">{t('dashboard.weekHours')}</p>
            <p className="text-3xl font-bold text-gray-900">0:00</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">{t('dashboard.monthHours')}</p>
            <p className="text-3xl font-bold text-gray-900">0:00</p>
          </div>
        </div>
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-center py-8">
            App functionality coming soon...
          </p>
        </div>
      </main>
    </div>
  );
}

// Protected Route
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
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
      
      {/* Redirects */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/clock" element={<Navigate to="/app/clock" replace />} />
      <Route path="/approvals" element={<Navigate to="/app/approvals" replace />} />
      <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
      <Route path="/my-reports" element={<Navigate to="/app/my-reports" replace />} />
    </Routes>
  );
}
