import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DashboardSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState, EmptyIcons } from '../../components/ui/EmptyState';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isClockedIn: boolean;
  clockInTime?: string;
  location?: { name: string };
  onBreak?: boolean;
}

interface EditRequest {
  id: string;
  status: string;
  createdAt: string;
  fieldName: string;
  requestedBy: {
    firstName: string;
    lastName: string;
  };
}

interface TeamStats {
  totalMembers: number;
  clockedInNow: number;
  totalHoursThisWeek: number;
  expectedHoursThisWeek: number;
  pendingApprovals: number;
  overtimeHoursThisWeek: number;
  budgetedOvertime: number;
  complianceScore: number;
}

interface Schedule {
  id: string;
  date: string;
  employee: {
    firstName: string;
    lastName: string;
  };
  shift: {
    name: string;
    startTime: string;
    endTime: string;
  };
}

// Helper: Get status color based on value vs threshold
function getStatusColor(value: number, target: number, isLowerBetter = false): { text: string; bg: string; status: string } {
  const percentage = (value / target) * 100;
  if (isLowerBetter) {
    if (percentage <= 80) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', status: 'good' };
    if (percentage <= 100) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', status: 'warning' };
    return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', status: 'critical' };
  } else {
    if (percentage >= 90) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', status: 'good' };
    if (percentage >= 70) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', status: 'warning' };
    return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', status: 'critical' };
  }
}

// Helper: Get compliance score color
function getComplianceColor(score: number): { text: string; bg: string; gauge: string } {
  if (score >= 95) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', gauge: 'bg-emerald-500' };
  if (score >= 80) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', gauge: 'bg-amber-500' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', gauge: 'bg-red-500' };
}

// Helper: Format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

// Helper: Get relative day label
function getDayLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return targetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function ManagerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Get team stats with real-time polling
  const { data: teamStats, isLoading: loadingStats } = useQuery<TeamStats>({
    queryKey: ['team-stats'],
    queryFn: async () => {
      try {
        return await api.get('/time-tracking/team-stats');
      } catch {
        // Return mock data if endpoint doesn't exist yet
        return {
          totalMembers: 12,
          clockedInNow: 5,
          totalHoursThisWeek: 342,
          expectedHoursThisWeek: 480,
          pendingApprovals: 3,
          overtimeHoursThisWeek: 8,
          budgetedOvertime: 20,
          complianceScore: 94,
        };
      }
    },
    refetchInterval: 30000, // Real-time updates every 30s
  });

  // Get team members who are currently clocked in with polling
  const { data: clockedInMembers = [], isLoading: loadingMembers } = useQuery<TeamMember[]>({
    queryKey: ['clocked-in-members'],
    queryFn: async () => {
      try {
        return await api.get('/time-tracking/clocked-in');
      } catch {
        // Mock data for development
        return [
          { id: '1', firstName: 'Maria', lastName: 'Garcia', email: 'maria@example.com', isClockedIn: true, clockInTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), location: { name: 'Main Office' }, onBreak: false },
          { id: '2', firstName: 'Carlos', lastName: 'Lopez', email: 'carlos@example.com', isClockedIn: true, clockInTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), location: { name: 'Branch Office' }, onBreak: true },
          { id: '3', firstName: 'Ana', lastName: 'Martinez', email: 'ana@example.com', isClockedIn: true, clockInTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), location: { name: 'Main Office' }, onBreak: false },
        ];
      }
    },
    refetchInterval: 30000,
  });

  // Get pending edit requests with polling
  const { data: pendingRequests = [], isLoading: loadingRequests } = useQuery<EditRequest[]>({
    queryKey: ['pending-edit-requests'],
    queryFn: async () => {
      try {
        return await api.get('/approvals/edit-requests?status=PENDING');
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  // Get team schedules with polling
  const { data: teamSchedules = [], isLoading: loadingSchedules } = useQuery<Schedule[]>({
    queryKey: ['team-schedules'],
    queryFn: async () => {
      try {
        return await api.get('/scheduling/team-schedules');
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });

  const isLoading = loadingStats || loadingMembers || loadingRequests || loadingSchedules;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Calculate stats
  const hoursStatus = getStatusColor(
    teamStats?.totalHoursThisWeek ?? 0,
    teamStats?.expectedHoursThisWeek ?? 480
  );
  const overtimeStatus = getStatusColor(
    teamStats?.overtimeHoursThisWeek ?? 0,
    teamStats?.budgetedOvertime ?? 20,
    true
  );
  const complianceColors = getComplianceColor(teamStats?.complianceScore ?? 0);

  // Get today's schedules and upcoming
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const weekSchedules = teamSchedules.filter((s) => {
    const scheduleDate = new Date(s.date);
    return scheduleDate >= today && scheduleDate < endOfWeek;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ═══════════════════════════════════════════════════════════════════
          TEAM STATUS HERO CARD - Live Counter
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-blue-500/10" />
        </div>
        
        <div className="relative z-10">
          {/* Header with live indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-white/10 text-white backdrop-blur-sm">
              {/* Pulsing live indicator */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300" />
              </span>
              Live Status
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Main Counter */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/70 text-sm font-medium tracking-wide uppercase">
                    {t('dashboard.manager.teamOverview')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl sm:text-6xl font-black text-white tracking-tight tabular-nums">
                      {teamStats?.clockedInNow ?? 0}
                    </span>
                    <span className="text-2xl sm:text-3xl text-white/60 font-medium">/</span>
                    <span className="text-2xl sm:text-3xl text-white/60 font-medium tabular-nums">
                      {teamStats?.totalMembers ?? 0}
                    </span>
                  </div>
                  <p className="text-white/80 text-lg font-medium">
                    {t('dashboard.manager.clockedInNow')}
                  </p>
                </div>
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap items-center gap-4 text-white/70">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{teamStats?.totalHoursThisWeek ?? 0}h this week</span>
                </div>
                {(teamStats?.pendingApprovals ?? 0) > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full">
                    <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-amber-200">{teamStats?.pendingApprovals} pending approvals</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/app/team')}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-white text-slate-800 hover:bg-slate-100 rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                View Team
              </button>
              <button
                onClick={() => navigate('/app/reports')}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-semibold backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('dashboard.manager.generateReport')}
              </button>
              <button
                onClick={() => navigate('/app/schedules')}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-semibold backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t('dashboard.manager.manageSchedules')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          KEY METRICS GRID - 4 Columns
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hours This Week */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${hoursStatus.bg}`}>
                <svg className={`w-6 h-6 ${hoursStatus.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  {t('dashboard.manager.totalHoursThisWeek')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {teamStats?.totalHoursThisWeek ?? 0}h
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Expected: {teamStats?.expectedHoursThisWeek ?? 480}h
              </span>
              <span className={`font-semibold ${hoursStatus.text}`}>
                {Math.round(((teamStats?.totalHoursThisWeek ?? 0) / (teamStats?.expectedHoursThisWeek ?? 480)) * 100)}%
              </span>
            </div>
            <div className="mt-2 w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${hoursStatus.status === 'good' ? 'bg-emerald-500' : hoursStatus.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(((teamStats?.totalHoursThisWeek ?? 0) / (teamStats?.expectedHoursThisWeek ?? 480)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <button
          onClick={() => navigate('/app/approvals')}
          className="text-left bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl relative ${(teamStats?.pendingApprovals ?? 0) > 10 ? 'bg-red-50 dark:bg-red-900/30' : (teamStats?.pendingApprovals ?? 0) > 0 ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-slate-50 dark:bg-slate-700'}`}>
                <svg className={`w-6 h-6 ${(teamStats?.pendingApprovals ?? 0) > 10 ? 'text-red-600 dark:text-red-400' : (teamStats?.pendingApprovals ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {(teamStats?.pendingApprovals ?? 0) > 10 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">!</span>
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  {t('dashboard.manager.pendingApprovals')}
                </p>
                <p className={`text-2xl font-bold ${(teamStats?.pendingApprovals ?? 0) > 10 ? 'text-red-600 dark:text-red-400' : (teamStats?.pendingApprovals ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                  {teamStats?.pendingApprovals ?? 0}
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {(teamStats?.pendingApprovals ?? 0) === 0 ? t('dashboard.manager.allCaughtUp') : 'Click to review'}
            </span>
          </div>
        </button>

        {/* Overtime This Week */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${overtimeStatus.bg}`}>
                <svg className={`w-6 h-6 ${overtimeStatus.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  {t('overtime.title')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {teamStats?.overtimeHoursThisWeek ?? 0}h
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Budget: {teamStats?.budgetedOvertime ?? 20}h
              </span>
              <span className={`font-semibold ${overtimeStatus.text}`}>
                {Math.round(((teamStats?.overtimeHoursThisWeek ?? 0) / (teamStats?.budgetedOvertime ?? 20)) * 100)}%
              </span>
            </div>
            <div className="mt-2 w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${overtimeStatus.status === 'good' ? 'bg-emerald-500' : overtimeStatus.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(((teamStats?.overtimeHoursThisWeek ?? 0) / (teamStats?.budgetedOvertime ?? 20)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Compliance Score */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${complianceColors.bg}`}>
                <svg className={`w-6 h-6 ${complianceColors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                  Compliance Score
                </p>
                <p className={`text-2xl font-bold ${complianceColors.text}`}>
                  {teamStats?.complianceScore ?? 0}%
                </p>
              </div>
            </div>
          </div>
          {/* Gauge visualization */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="relative h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${complianceColors.gauge}`}
                style={{ width: `${teamStats?.complianceScore ?? 0}%` }}
              />
              {/* Threshold markers */}
              <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-amber-400/50" />
              <div className="absolute top-0 bottom-0 left-[95%] w-0.5 bg-emerald-400/50" />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-slate-400">
              <span>0%</span>
              <span>80%</span>
              <span>95%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT - Team Activity + Approvals Side by Side
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Team Activity Timeline */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">Team Activity</h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
              </div>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {clockedInMembers.length} active
            </span>
          </div>
          
          {clockedInMembers.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.users}
              title={t('dashboard.manager.noTeamMembers')}
              description="No team members are currently clocked in"
              variant="compact"
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
              {clockedInMembers.map((member) => (
                <div key={member.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  {/* Avatar with status indicator */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-200">
                        {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center ${member.onBreak ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                      {member.onBreak ? (
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                        </svg>
                      ) : (
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {member.firstName} {member.lastName}
                      </p>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${member.onBreak ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'}`}>
                        {member.onBreak ? 'On Break' : 'Working'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {member.clockInTime && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(member.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {member.location && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {member.location.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time ago */}
                  {member.clockInTime && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {formatTimeAgo(member.clockInTime)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals Queue */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${(teamStats?.pendingApprovals ?? 0) > 0 ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <svg className={`w-5 h-5 ${(teamStats?.pendingApprovals ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('dashboard.manager.pendingApprovals')}</h3>
            </div>
            <button
              onClick={() => navigate('/app/approvals')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
            >
              {t('dashboard.employee.viewAll')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {pendingRequests.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.checkmark}
              title={t('dashboard.manager.allCaughtUp')}
              description={t('dashboard.manager.noApprovals')}
              variant="compact"
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
              {pendingRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {request.requestedBy.firstName.charAt(0)}{request.requestedBy.lastName.charAt(0)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {request.requestedBy.firstName} {request.requestedBy.lastName}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full">
                      {request.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 ml-11">
                    <span className="capitalize">{request.fieldName.replace(/([A-Z])/g, ' $1').trim()} change</span>
                    <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SCHEDULE PREVIEW - This Week
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('scheduling.thisWeek')} Schedule</h3>
          </div>
          <button
            onClick={() => navigate('/app/schedules')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
          >
            {t('dashboard.employee.viewAll')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {weekSchedules.length === 0 ? (
          <EmptyState
            icon={EmptyIcons.calendar}
            title={t('scheduling.noSchedules')}
            description="No schedules for this week yet"
            variant="compact"
          />
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {/* Generate 7 day slots */}
              {Array.from({ length: 7 }).map((_, index) => {
                const dayDate = new Date(today);
                dayDate.setDate(today.getDate() + index);
                const daySchedules = weekSchedules.filter((s) => {
                  const scheduleDate = new Date(s.date);
                  return scheduleDate.toDateString() === dayDate.toDateString();
                });
                const isToday = index === 0;

                return (
                  <div
                    key={index}
                    className={`relative p-3 rounded-xl border-2 transition-all ${
                      isToday
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                        : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50'
                    }`}
                  >
                    {isToday && (
                      <div className="absolute -top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded uppercase">
                        {t('scheduling.today')}
                      </div>
                    )}
                    <p className={`text-xs font-bold mb-2 ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>
                      {getDayLabel(dayDate)}
                    </p>
                    {daySchedules.length === 0 ? (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">No shifts</p>
                    ) : (
                      <div className="space-y-1.5">
                        {daySchedules.slice(0, 3).map((schedule) => (
                          <div
                            key={schedule.id}
                            className={`p-1.5 rounded text-[10px] ${isToday ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-white dark:bg-slate-600'}`}
                          >
                            <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                              {schedule.employee.firstName} {schedule.employee.lastName.charAt(0)}.
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                              {schedule.shift.startTime}-{schedule.shift.endTime}
                            </p>
                          </div>
                        ))}
                        {daySchedules.length > 3 && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                            +{daySchedules.length - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
