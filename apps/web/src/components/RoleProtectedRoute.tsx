import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { AppLayout } from './layout';
import { canAccessRoute } from '../config/navigation';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  path: string;
}

export function RoleProtectedRoute({ children, path }: RoleProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (!user || !canAccessRoute(user.role, path)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-slate-900">403</h1>
            <h2 className="text-2xl font-semibold text-slate-900 mt-4">Access Denied</h2>
            <p className="text-slate-600 mt-2">You don't have permission to access this page.</p>
            <button
              onClick={() => window.history.back()}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Allow access
  return <AppLayout>{children}</AppLayout>;
}
