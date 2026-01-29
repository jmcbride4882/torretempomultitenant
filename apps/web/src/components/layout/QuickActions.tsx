import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@torre-tempo/shared';
import { useAuthStore, useClockStore } from '../../lib/store';

interface QuickActionsProps {
  pendingApprovals?: number;
  notificationCount?: number;
}

/**
 * Context-aware quick action buttons for the top navigation.
 * Shows different actions based on user role.
 */
export function QuickActions({ pendingApprovals = 0, notificationCount = 0 }: QuickActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isClockedIn = useClockStore((state) => state.isClockedIn);

  const isEmployee = user?.role === Role.EMPLOYEE;
  const isManager = user?.role === Role.MANAGER || user?.role === Role.ADMIN || user?.role === Role.GLOBAL_ADMIN;

  return (
    <div className="flex items-center gap-2">
      {/* Clock In/Out button for employees */}
      {isEmployee && (
        <button
          onClick={() => navigate('/app/clock')}
          className={`flex items-center gap-2 px-4 h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] ${
            isClockedIn
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 dark:shadow-blue-900/30'
          }`}
          aria-label={isClockedIn ? t('clocking.clockOut') : t('clocking.clockIn')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="hidden sm:inline">
            {isClockedIn ? t('clocking.clockOut') : t('clocking.clockIn')}
          </span>
        </button>
      )}

      {/* Approvals badge for managers */}
      {isManager && pendingApprovals > 0 && (
        <button
          onClick={() => navigate('/app/approvals')}
          className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          aria-label={`${pendingApprovals} ${t('approvals.pending')}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-amber-500 text-white text-xs font-bold rounded-full">
            {pendingApprovals > 99 ? '99+' : pendingApprovals}
          </span>
        </button>
      )}

      {/* Notifications bell */}
      <button
        onClick={() => {
          // TODO: Implement notifications panel
        }}
        className="relative flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label={t('settings.notifications') || 'Notifications'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>
    </div>
  );
}
