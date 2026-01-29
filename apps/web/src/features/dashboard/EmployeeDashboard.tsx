import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { DashboardSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState, EmptyIcons } from '../../components/ui/EmptyState';

interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes?: number;
  location?: { name: string };
}

interface EditRequest {
  id: string;
  status: string;
  createdAt: string;
  fieldName: string;
}

interface Schedule {
  id: string;
  date: string;
  shift: {
    name: string;
    startTime: string;
    endTime: string;
  };
}

export function EmployeeDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // Get current time entry
  const { data: currentEntry, isLoading: loadingCurrent } = useQuery<TimeEntry | null>({
    queryKey: ['current-time-entry'],
    queryFn: async () => {
      try {
        return await api.get<TimeEntry>('/time-tracking/current');
      } catch (e) {
        const error = e as Error;
        if (error.message.includes('HTTP 404')) return null;
        throw e;
      }
    },
  });

  // Get recent time entries
  const { data: recentEntries = [], isLoading: loadingEntries } = useQuery<TimeEntry[]>({
    queryKey: ['recent-time-entries'],
    queryFn: () => api.get('/time-tracking/entries?limit=5'),
  });

  // Get upcoming schedules
  const { data: upcomingShifts = [], isLoading: loadingShifts } = useQuery<Schedule[]>({
    queryKey: ['my-schedule'],
    queryFn: () => api.get('/scheduling/my-schedule'),
  });

  // Get pending edit requests
  const { data: pendingRequests = [], isLoading: loadingRequests } = useQuery<EditRequest[]>({
    queryKey: ['my-edit-requests'],
    queryFn: async () => {
      try {
        return await api.get('/approvals/edit-requests?status=PENDING');
      } catch {
        return [];
      }
    },
  });

  // Clock in/out mutations
  const clockInMutation = useMutation({
    mutationFn: () => api.post('/time-tracking/clock-in', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['recent-time-entries'] });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: () => api.post('/time-tracking/clock-out', { breakMinutes: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['recent-time-entries'] });
    },
  });

  const isClockedIn = !!currentEntry && !currentEntry.clockOut;
  const isLoading = loadingCurrent || loadingEntries || loadingShifts || loadingRequests;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Calculate today's hours
  const todayHours = recentEntries
    .filter((entry) => {
      const entryDate = new Date(entry.clockIn).toDateString();
      const today = new Date().toDateString();
      return entryDate === today;
    })
    .reduce((total, entry) => {
      if (!entry.clockOut) return total;
      const clockIn = new Date(entry.clockIn).getTime();
      const clockOut = new Date(entry.clockOut).getTime();
      const hours = (clockOut - clockIn) / (1000 * 60 * 60);
      return total + hours - (entry.breakMinutes || 0) / 60;
    }, 0);

  // Calculate week hours
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekHours = recentEntries
    .filter((entry) => new Date(entry.clockIn) >= weekStart)
    .reduce((total, entry) => {
      if (!entry.clockOut) return total;
      const clockIn = new Date(entry.clockIn).getTime();
      const clockOut = new Date(entry.clockOut).getTime();
      const hours = (clockOut - clockIn) / (1000 * 60 * 60);
      return total + hours - (entry.breakMinutes || 0) / 60;
    }, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {t('dashboard.employee.title')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('dashboard.welcome', { name: user ? `${user.firstName} ${user.lastName}` : 'User' })}
          </p>
        </div>
      </div>

      {/* Quick Clock Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">
              {t('dashboard.employee.quickClock')}
            </p>
            {isClockedIn && currentEntry ? (
              <p className="text-xl sm:text-2xl font-bold mt-1">
                {t('dashboard.employee.clockedInSince', {
                  time: new Date(currentEntry.clockIn).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </p>
            ) : (
              <p className="text-xl sm:text-2xl font-bold mt-1">
                {t('dashboard.employee.notClockedIn')}
              </p>
            )}
            {!isClockedIn && (
              <p className="text-blue-200 text-sm mt-1">
                {t('dashboard.employee.startYourDay')}
              </p>
            )}
          </div>
          <button
            onClick={() => isClockedIn ? clockOutMutation.mutate() : clockInMutation.mutate()}
            disabled={clockInMutation.isPending || clockOutMutation.isPending}
            className={`px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 active:scale-95 disabled:opacity-70 shadow-md ${
              isClockedIn
                ? 'bg-white text-red-600 hover:bg-red-50'
                : 'bg-white text-green-600 hover:bg-green-50'
            }`}
          >
            {clockInMutation.isPending || clockOutMutation.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('common.loading')}
              </span>
            ) : isClockedIn ? (
              t('clocking.clockOut')
            ) : (
              t('clocking.clockIn')
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.todayHours')}</p>
              <p className="text-xl font-bold text-slate-900">{todayHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.weekHours')}</p>
              <p className="text-xl font-bold text-slate-900">{weekHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Entries */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{t('dashboard.employee.recentEntries')}</h3>
            <button
              onClick={() => navigate('/app/clock')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('dashboard.employee.viewAll')}
            </button>
          </div>
          {recentEntries.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.clock}
              title={t('empty.noEntries')}
              description={t('empty.noEntriesDescription')}
              variant="compact"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentEntries.slice(0, 4).map((entry) => (
                <div key={entry.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(entry.clockIn).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {entry.clockOut && (
                        <> - {new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    entry.clockOut ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {entry.clockOut ? 'Complete' : 'In Progress'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Shifts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{t('dashboard.employee.upcomingShifts')}</h3>
          </div>
          {upcomingShifts.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.calendar}
              title={t('empty.noShifts')}
              description={t('empty.noShiftsDescription')}
              variant="compact"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingShifts.slice(0, 4).map((schedule) => (
                <div key={schedule.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {schedule.shift.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(schedule.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm text-slate-600">
                    {schedule.shift.startTime} - {schedule.shift.endTime}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {t('dashboard.employee.pendingRequests')}
              </p>
              <p className="text-xs text-amber-700">
                {pendingRequests.length} {pendingRequests.length === 1 ? 'request' : 'requests'} awaiting approval
              </p>
            </div>
            <button
              onClick={() => navigate('/app/approvals')}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              {t('dashboard.employee.viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
