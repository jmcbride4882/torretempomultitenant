import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
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

interface OvertimeBalance {
  totalHours: number;
  remainingHours: number;
  annualLimit: number;
}

// Helper: Format elapsed time as HH:MM:SS
function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper: Get progress bar color based on percentage
function getOvertimeColor(percentage: number): { bg: string; text: string; label: string } {
  if (percentage < 60) return { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'On Track' };
  if (percentage < 75) return { bg: 'bg-amber-500', text: 'text-amber-600', label: 'Caution' };
  return { bg: 'bg-red-500', text: 'text-red-600', label: 'Critical' };
}

// Helper: Get relative day label
function getDayLabel(date: Date, t: (key: string) => string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return t('scheduling.today');
  if (diffDays === 1) return 'Tomorrow';
  return targetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function EmployeeDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  
  // Live timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Get current time entry with real-time polling
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
    refetchInterval: 30000, // Real-time updates every 30s
  });

  // Get recent time entries with polling
  const { data: recentEntries = [], isLoading: loadingEntries } = useQuery<TimeEntry[]>({
    queryKey: ['recent-time-entries'],
    queryFn: () => api.get('/time-tracking/entries?limit=5'),
    refetchInterval: 30000,
  });

  // Get upcoming schedules with polling
  const { data: upcomingShifts = [], isLoading: loadingShifts } = useQuery<Schedule[]>({
    queryKey: ['my-schedule'],
    queryFn: () => api.get('/scheduling/my-schedule'),
    refetchInterval: 30000,
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
    refetchInterval: 30000,
  });

  // Get overtime balance
  const { data: overtimeBalance } = useQuery<OvertimeBalance>({
    queryKey: ['overtime-balance'],
    queryFn: () => api.get('/overtime/balance'),
    refetchInterval: 30000,
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

  // Calculate elapsed time
  const calculateElapsed = useCallback(() => {
    if (!currentEntry?.clockIn || currentEntry.clockOut) return 0;
    const clockInTime = new Date(currentEntry.clockIn).getTime();
    const now = Date.now();
    return Math.floor((now - clockInTime) / 1000);
  }, [currentEntry]);

  // Live timer effect
  useEffect(() => {
    if (!isClockedIn) {
      setElapsedSeconds(0);
      return;
    }
    
    setElapsedSeconds(calculateElapsed());
    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isClockedIn, calculateElapsed]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

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

  // Get next shift
  const nextShift = upcomingShifts.length > 0 ? upcomingShifts[0] : null;
  
  // Get next 7 days of shifts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  
  const next7DaysShifts = upcomingShifts.filter((schedule) => {
    const scheduleDate = new Date(schedule.date);
    return scheduleDate >= today && scheduleDate < sevenDaysLater;
  });

  // Overtime calculations
  const overtimePercentage = overtimeBalance 
    ? (overtimeBalance.totalHours / overtimeBalance.annualLimit) * 100 
    : 0;
  const overtimeColors = getOvertimeColor(overtimePercentage);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ═══════════════════════════════════════════════════════════════════
          HERO STATUS CARD - The focal point of the dashboard
          ═══════════════════════════════════════════════════════════════════ */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-500 ${
        isClockedIn 
          ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 shadow-emerald-200 dark:shadow-emerald-900/50' 
          : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-slate-300 dark:shadow-slate-900/50'
      }`}>
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10 ${
            isClockedIn ? 'bg-white' : 'bg-white'
          }`} />
          <div className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10 ${
            isClockedIn ? 'bg-white' : 'bg-white'
          }`} />
        </div>
        
        <div className="relative z-10">
          {/* Status Badge with Live Indicator */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
              isClockedIn 
                ? 'bg-white/20 text-white backdrop-blur-sm' 
                : 'bg-white/10 text-white/90 backdrop-blur-sm'
            }`}>
              {/* Pulsing live indicator */}
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isClockedIn ? 'bg-emerald-300' : 'bg-slate-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  isClockedIn ? 'bg-emerald-200' : 'bg-slate-300'
                }`} />
              </span>
              {isClockedIn ? t('clocking.clockedIn') : t('dashboard.employee.notClockedIn')}
            </div>
          </div>
          
          {/* Main content area */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4">
              {/* Live Timer or Status Message */}
              {isClockedIn && currentEntry ? (
                <>
                  <div className="space-y-1">
                    <p className="text-white/70 text-sm font-medium tracking-wide uppercase">
                      {t('clocking.timeElapsed')}
                    </p>
                    <p className="text-5xl sm:text-6xl font-black text-white tracking-tight font-mono tabular-nums">
                      {formatElapsedTime(elapsedSeconds)}
                    </p>
                  </div>
                  
                  {/* Clock-in time and break info */}
                  <div className="flex flex-wrap items-center gap-4 text-white/80">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">
                        {t('dashboard.employee.clockedInSince', {
                          time: new Date(currentEntry.clockIn).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                        })}
                      </span>
                    </div>
                    {currentEntry.location && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm">{currentEntry.location.name}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-3xl sm:text-4xl font-bold text-white">
                      {t('dashboard.welcome', { name: user ? user.firstName : 'User' })}
                    </p>
                    <p className="text-white/70 text-lg">
                      {t('dashboard.employee.startYourDay')}
                    </p>
                  </div>
                  
                  {/* Next shift preview when not clocked in */}
                  {nextShift && (
                    <div className="inline-flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl backdrop-blur-sm">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs font-medium uppercase tracking-wide">
                          {t('dashboard.employee.upcomingShifts')}
                        </p>
                        <p className="text-white font-semibold">
                          {getDayLabel(new Date(nextShift.date), t)} • {nextShift.shift.startTime} - {nextShift.shift.endTime}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Primary Action Button */}
            <button
              onClick={() => isClockedIn ? clockOutMutation.mutate() : clockInMutation.mutate()}
              disabled={clockInMutation.isPending || clockOutMutation.isPending}
              className={`h-24 w-full lg:w-auto lg:min-w-[200px] px-10 rounded-2xl font-bold text-2xl transition-all duration-300 active:scale-95 disabled:opacity-70 shadow-xl flex items-center justify-center gap-4 ${
                isClockedIn
                  ? 'bg-white text-red-600 hover:bg-red-50 hover:shadow-2xl'
                  : 'bg-white text-emerald-600 hover:bg-emerald-50 hover:shadow-2xl'
              }`}
            >
              {clockInMutation.isPending || clockOutMutation.isPending ? (
                <>
                  <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{t('common.loading')}</span>
                </>
              ) : isClockedIn ? (
                <>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  <span>{t('clocking.clockOut')}</span>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('clocking.clockIn')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK STATS ROW - 3 Cards
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* This Week Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  {t('scheduling.thisWeek')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {weekHours.toFixed(1)}h
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1 text-sm">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {(40 - weekHours).toFixed(1)}h
              </span>
              <span className="text-slate-500 dark:text-slate-400">{t('common.remaining')}</span>
            </div>
          </div>
        </div>

        {/* Overtime Balance Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${
                overtimePercentage < 60 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30' 
                  : overtimePercentage < 75 
                    ? 'bg-amber-50 dark:bg-amber-900/30' 
                    : 'bg-red-50 dark:bg-red-900/30'
              }`}>
                <svg className={`w-6 h-6 ${overtimeColors.text} dark:opacity-90`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  {t('overtime.balance')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {overtimeBalance ? `${overtimeBalance.totalHours.toFixed(0)}/${overtimeBalance.annualLimit}h` : '0/80h'}
                </p>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className={`font-medium ${overtimeColors.text}`}>{overtimeColors.label}</span>
              <span>{overtimePercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${overtimeColors.bg}`}
                style={{ width: `${Math.min(overtimePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Next Shift Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  {t('scheduling.nextWeek').replace('Week', 'Shift')}
                </p>
                {nextShift ? (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {getDayLabel(new Date(nextShift.date), t)}
                  </p>
                ) : (
                  <p className="text-xl font-bold text-slate-400 dark:text-slate-500">—</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            {nextShift ? (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{nextShift.shift.startTime} - {nextShift.shift.endTime}</span>
                <span className="text-slate-400">•</span>
                <span>{nextShift.shift.name}</span>
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t('empty.noShifts')}</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          UPCOMING SCHEDULE - Next 7 Days Timeline
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('scheduling.mySchedule')} (7 Days)</h3>
          </div>
          <button
            onClick={() => navigate('/app/schedule')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
          >
            {t('dashboard.employee.viewAll')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {next7DaysShifts.length === 0 ? (
          <EmptyState
            icon={EmptyIcons.calendar}
            title={t('empty.noShifts')}
            description={t('empty.noShiftsDescription')}
            variant="compact"
          />
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {next7DaysShifts.slice(0, 7).map((schedule) => {
                const scheduleDate = new Date(schedule.date);
                const isToday = scheduleDate.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={schedule.id}
                    className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      isToday 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
                        : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50'
                    }`}
                  >
                    {isToday && (
                      <div className="absolute -top-2 left-3 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">
                        {t('scheduling.today')}
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className={`text-sm font-bold ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {scheduleDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <div className={`text-xs ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                        <p className="font-semibold">{schedule.shift.name}</p>
                        <p className="flex items-center gap-1 mt-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {schedule.shift.startTime} - {schedule.shift.endTime}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PENDING REQUESTS ALERT
          ═══════════════════════════════════════════════════════════════════ */}
      {pendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-800/50 rounded-xl">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                {t('dashboard.employee.pendingRequests')}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {pendingRequests.length} {pendingRequests.length === 1 ? 'request' : 'requests'} awaiting approval
              </p>
            </div>
            <button
              onClick={() => navigate('/app/approvals')}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {t('dashboard.employee.viewAll')}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT GRID - Recent Entries
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('dashboard.employee.recentEntries')}</h3>
          </div>
          <button
            onClick={() => navigate('/app/clock')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
          >
            {t('dashboard.employee.viewAll')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentEntries.slice(0, 5).map((entry) => {
              const entryDate = new Date(entry.clockIn);
              const isToday = entryDate.toDateString() === new Date().toDateString();
              const duration = entry.clockOut
                ? ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60) - (entry.breakMinutes || 0) / 60).toFixed(1)
                : null;
              
              return (
                <div key={entry.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-12 rounded-full ${
                      entry.clockOut ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {isToday ? t('scheduling.today') : entryDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        {isToday && (
                          <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded">
                            {t('scheduling.today')}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>
                          {new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {entry.clockOut && (
                            <> → {new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                          )}
                        </span>
                        {entry.location && (
                          <>
                            <span>•</span>
                            <span>{entry.location.name}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {duration && (
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {duration}h
                      </span>
                    )}
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      entry.clockOut 
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                    }`}>
                      {entry.clockOut ? 'Complete' : 'In Progress'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
