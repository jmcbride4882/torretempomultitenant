import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { Role } from '@torre-tempo/shared';

interface OvertimeBalance {
  totalHours: number;
  remainingHours: number;
  annualLimit: number;
}

interface OvertimeEntry {
  id: string;
  hours: number;
  type: 'ORDINARY' | 'FORCE_MAJEURE';
  compensationType: 'TIME_OFF' | 'PAY';
  compensatedAt?: string;
  approvedAt?: string;
  createdAt: string;
  timeEntry: {
    clockIn: string;
    clockOut: string;
  };
  approvedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface PendingOvertime extends OvertimeEntry {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface HistoryResponse {
  entries: OvertimeEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface PendingResponse {
  entries: PendingOvertime[];
}

function getProgressColor(hours: number): string {
  if (hours < 60) return 'bg-green-500';
  if (hours < 75) return 'bg-amber-500';
  return 'bg-red-500';
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function OvertimePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);

  // Get annual balance
  const { data: balance, isLoading: balanceLoading } = useQuery<OvertimeBalance>({
    queryKey: ['overtime-balance'],
    queryFn: () => api.get('/overtime/balance'),
  });

  // Get overtime history
  const { data: history, isLoading: historyLoading } = useQuery<HistoryResponse>({
    queryKey: ['overtime-history', page],
    queryFn: () => api.get(`/overtime/history?page=${page}&pageSize=10`),
  });

  // Get pending overtimes (managers only)
  const { data: pending, isLoading: pendingLoading } = useQuery<PendingResponse>({
    queryKey: ['overtime-pending'],
    queryFn: () => api.get('/overtime/pending'),
    enabled: user?.role === Role.MANAGER || user?.role === Role.ADMIN,
  });

  // Approve overtime mutation
  const approveMutation = useMutation({
    mutationFn: (overtimeId: string) =>
      api.post(`/overtime/${overtimeId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-pending'] });
      queryClient.invalidateQueries({ queryKey: ['overtime-history'] });
      queryClient.invalidateQueries({ queryKey: ['overtime-balance'] });
    },
  });

  const isManager = user?.role === Role.MANAGER || user?.role === Role.ADMIN;
  const isExceeded = balance && balance.totalHours > 80;
  const isApproaching = balance && balance.totalHours > 60 && balance.totalHours <= 80;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('overtime.title')}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Balance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('overtime.balance')}
          </h2>

          {balanceLoading ? (
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
          ) : balance ? (
            <div className="space-y-4">
              {/* Warning Banner */}
              {isExceeded && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    ⚠️ {t('overtime.limitExceeded')}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    {balance.totalHours.toFixed(2)}h / {balance.annualLimit}h
                  </p>
                </div>
              )}

              {isApproaching && !isExceeded && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    ⚠️ {t('overtime.limitWarning')}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {balance.totalHours.toFixed(2)}h / {balance.annualLimit}h
                  </p>
                </div>
              )}

              {/* Balance Display */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('overtime.hours')} {t('common.used')}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {balance.totalHours.toFixed(1)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('overtime.limit')}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {balance.annualLimit}h
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all ${getProgressColor(
                      balance.totalHours
                    )}`}
                    style={{
                      width: `${Math.min(
                        (balance.totalHours / balance.annualLimit) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {balance.remainingHours.toFixed(1)}h {t('common.remaining')}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Pending Approvals (Managers Only) */}
        {isManager && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('overtime.pending')}
            </h2>

            {pendingLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : pending && pending.entries.length > 0 ? (
              <div className="space-y-3">
                {pending.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {entry.user.firstName} {entry.user.lastName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.hours.toFixed(1)}h - {formatDate(entry.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => approveMutation.mutate(entry.id)}
                      disabled={approveMutation.isPending}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {approveMutation.isPending ? t('common.loading') : t('overtime.approve')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                {t('overtime.noOvertimeYet')}
              </p>
            )}
          </div>
        )}

        {/* History Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('overtime.history')}
          </h2>

          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                />
              ))}
            </div>
          ) : history && history.entries.length > 0 ? (
            <div className="space-y-3">
              {history.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('overtime.date')}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(entry.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('overtime.hours')}
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {entry.hours.toFixed(1)}h
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('overtime.type')}
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {entry.type === 'ORDINARY'
                          ? t('overtime.ordinary')
                          : t('overtime.forceMajeure')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('overtime.compensation')}
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {entry.compensationType === 'TIME_OFF'
                          ? t('overtime.timeOff')
                          : t('overtime.pay')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        entry.approvedAt ? 'APPROVED' : 'PENDING'
                      )}`}
                    >
                      {entry.approvedAt ? t('overtime.status.approved') : t('overtime.status.pending')}
                    </span>
                    {entry.approvedBy && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('approvals.reviewedBy')}: {entry.approvedBy.firstName}{' '}
                        {entry.approvedBy.lastName}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {history.total > 10 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('common.back')}
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('common.page')} {page} {t('common.of')}{' '}
                    {Math.ceil(history.total / 10)}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(history.total / 10)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('common.next')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              {t('overtime.noOvertimeYet')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
