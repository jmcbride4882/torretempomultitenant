import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

interface EditRequest {
  id: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedAt?: string;
  approvalNote?: string;
  timeEntry: {
    id: string;
    clockIn: string;
    clockOut: string | null;
    location?: {
      id: string;
      name: string;
    };
  };
  requestedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  approvedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface EditRequestsResponse {
  requests: EditRequest[];
  total: number;
  page: number;
  pageSize: number;
}

export function ApprovalsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const { data, isLoading } = useQuery<EditRequestsResponse>({
    queryKey: ['edit-requests', statusFilter],
    queryFn: () => api.get(`/approvals/edit-requests?status=${statusFilter}`),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      return api.post(`/approvals/edit-requests/${id}/approve`, {
        approvalNote: note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      setSelectedRequest(null);
      setReviewComment('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      return api.post(`/approvals/edit-requests/${id}/reject`, {
        approvalNote: note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-requests'] });
      setSelectedRequest(null);
      setReviewComment('');
    },
  });

  const handleApprove = (request: EditRequest) => {
    if (window.confirm(t('approvals.approveConfirm'))) {
      approveMutation.mutate({ id: request.id, note: reviewComment });
    }
  };

  const handleReject = (request: EditRequest) => {
    if (window.confirm(t('approvals.rejectConfirm'))) {
      rejectMutation.mutate({ id: request.id, note: reviewComment });
    }
  };

  const formatFieldValue = (fieldName: string, value: string) => {
    if (fieldName === 'clockIn' || fieldName === 'clockOut') {
      return new Date(value).toLocaleString();
    }
    if (fieldName === 'breakMinutes') {
      return `${value} ${t('entries.duration')}`;
    }
    return value;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('approvals.title')}</h1>

        {/* Status Filter */}
        <div className="mb-6 flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t(`approvals.${status.toLowerCase()}`)}
            </button>
          ))}
        </div>

        {/* Edit Requests List */}
        {!data || data.requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
            {t('approvals.noRequests')}
          </div>
        ) : (
          <div className="space-y-4">
            {data.requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.requestedBy.firstName} {request.requestedBy.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{request.requestedBy.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(request.status)}`}>
                    {t(`approvals.${request.status.toLowerCase()}`)}
                  </span>
                </div>

                {/* Time Entry Info */}
                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">{t('entries.clockIn')}:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(request.timeEntry.clockIn).toLocaleString()}
                      </span>
                    </div>
                    {request.timeEntry.clockOut && (
                      <div>
                        <span className="font-medium text-gray-700">{t('entries.clockOut')}:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(request.timeEntry.clockOut).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {request.timeEntry.location && (
                      <div>
                        <span className="font-medium text-gray-700">{t('entries.location')}:</span>
                        <span className="ml-2 text-gray-900">{request.timeEntry.location.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Details */}
                <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">{t('approvals.fieldName')}</p>
                    <p className="text-sm text-gray-900">{t(`approvals.fields.${request.fieldName}`)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">{t('approvals.oldValue')}</p>
                    <p className="text-sm text-gray-900">{formatFieldValue(request.fieldName, request.oldValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">{t('approvals.newValue')}</p>
                    <p className="text-sm text-gray-900 font-semibold">{formatFieldValue(request.fieldName, request.newValue)}</p>
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">{t('approvals.requestReason')}</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{request.reason}</p>
                </div>

                {/* Review Section (for PENDING requests) */}
                {request.status === 'PENDING' && (
                  <div className="border-t border-gray-200 pt-4">
                    <textarea
                      value={selectedRequest?.id === request.id ? reviewComment : ''}
                      onChange={(e) => {
                        setSelectedRequest(request);
                        setReviewComment(e.target.value);
                      }}
                      placeholder={t('approvals.reviewComment')}
                      rows={2}
                      className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(request)}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                      >
                        {approveMutation.isPending ? t('common.loading') : t('approvals.approve')}
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        disabled={rejectMutation.isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
                      >
                        {rejectMutation.isPending ? t('common.loading') : t('approvals.reject')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Info (for APPROVED/REJECTED requests) */}
                {request.status !== 'PENDING' && request.approvedBy && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">{t('approvals.reviewedBy')}:</span>
                        <span className="ml-2 text-gray-900">
                          {request.approvedBy.firstName} {request.approvedBy.lastName}
                        </span>
                      </div>
                      {request.approvedAt && (
                        <div>
                          <span className="font-medium text-gray-700">{t('approvals.reviewedAt')}:</span>
                          <span className="ml-2 text-gray-900">
                            {new Date(request.approvedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {request.approvalNote && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">{t('approvals.reviewComment')}</p>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{request.approvalNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
