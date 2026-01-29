import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { DashboardSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState, EmptyIcons } from '../../components/ui/EmptyState';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isClockedIn: boolean;
  clockInTime?: string;
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
  pendingApprovals: number;
}

export function ManagerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Get team stats - mock data for now since we may not have real endpoints
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
          pendingApprovals: 3,
        };
      }
    },
  });

  // Get team members who are currently clocked in
  const { data: clockedInMembers = [], isLoading: loadingMembers } = useQuery<TeamMember[]>({
    queryKey: ['clocked-in-members'],
    queryFn: async () => {
      try {
        return await api.get('/time-tracking/clocked-in');
      } catch {
        return [];
      }
    },
  });

  // Get pending edit requests
  const { data: pendingRequests = [], isLoading: loadingRequests } = useQuery<EditRequest[]>({
    queryKey: ['pending-edit-requests'],
    queryFn: async () => {
      try {
        return await api.get('/approvals/edit-requests?status=PENDING');
      } catch {
        return [];
      }
    },
  });

  const isLoading = loadingStats || loadingMembers || loadingRequests;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {t('dashboard.manager.title')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('dashboard.welcome', { name: user ? `${user.firstName} ${user.lastName}` : 'Manager' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.manager.teamMembers')}</p>
              <p className="text-xl font-bold text-slate-900">{teamStats?.totalMembers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-xl">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.manager.clockedInNow')}</p>
              <p className="text-xl font-bold text-green-600">{teamStats?.clockedInNow || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-xl">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.manager.totalHoursThisWeek')}</p>
              <p className="text-xl font-bold text-slate-900">{teamStats?.totalHoursThisWeek || 0}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${(teamStats?.pendingApprovals || 0) > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
              <svg className={`w-5 h-5 ${(teamStats?.pendingApprovals || 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t('dashboard.manager.awaitingReview')}</p>
              <p className={`text-xl font-bold ${(teamStats?.pendingApprovals || 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {teamStats?.pendingApprovals || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <h3 className="font-semibold text-lg mb-4">{t('dashboard.manager.quickActions')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/app/reports')}
            className="flex items-center gap-3 px-5 py-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-left"
          >
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-medium">{t('dashboard.manager.generateReport')}</span>
          </button>

          <button
            onClick={() => navigate('/app/approvals')}
            className="flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-left relative"
          >
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <span className="font-medium">{t('dashboard.manager.viewApprovals')}</span>
            {(teamStats?.pendingApprovals || 0) > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {teamStats?.pendingApprovals}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/app/schedules')}
            className="flex items-center gap-3 px-5 py-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-left"
          >
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-medium">{t('dashboard.manager.manageSchedules')}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Overview - Who's clocked in */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{t('dashboard.manager.teamOverview')}</h3>
            <span className="text-sm text-slate-500">{t('dashboard.manager.clockedInNow')}</span>
          </div>
          {clockedInMembers.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.users}
              title={t('dashboard.manager.noTeamMembers')}
              description="No team members are currently clocked in"
              variant="compact"
            />
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {clockedInMembers.map((member) => (
                <div key={member.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-slate-600">
                        {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${member.isClockedIn ? 'bg-green-500' : 'bg-slate-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {member.clockInTime && `Since ${new Date(member.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{t('dashboard.manager.pendingApprovals')}</h3>
            <button
              onClick={() => navigate('/app/approvals')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('dashboard.employee.viewAll')}
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
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {pendingRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900">
                      {request.requestedBy.firstName} {request.requestedBy.lastName}
                    </p>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                      {request.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Change to {request.fieldName} - {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
