import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './lib/store';

// Placeholder components - will be implemented in Wave 2
function LoginPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Torre Tempo
        </h1>
        <p className="text-center text-gray-600">
          {t('login.placeholder', 'Login functionality coming in Wave 2')}
        </p>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-gray-900">
        {t('dashboard.title', 'Dashboard')}
      </h1>
      <p className="text-gray-600 mt-2">
        {t('dashboard.placeholder', 'Dashboard functionality coming in Wave 2')}
      </p>
    </div>
  );
}

function ClockPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-gray-900">
        {t('clock.title', 'Clock In/Out')}
      </h1>
      <p className="text-gray-600 mt-2">
        {t('clock.placeholder', 'Clocking functionality coming in Wave 2')}
      </p>
    </div>
  );
}

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
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clock"
        element={
          <ProtectedRoute>
            <ClockPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
