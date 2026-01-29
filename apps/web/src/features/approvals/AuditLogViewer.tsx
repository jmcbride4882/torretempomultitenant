import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  changes: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    [key: string]: any;
  } | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

interface AuditLogViewerProps {
  timeEntryId?: string;
}

export function AuditLogViewer({ timeEntryId }: AuditLogViewerProps) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', timeEntryId],
    queryFn: () => {
      if (timeEntryId) {
        return api.get(`/approvals/audit/entry/${timeEntryId}`);
      }
      return api.get('/approvals/audit');
    },
  });

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return t('audit.noChanges');
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return new Date(value).toLocaleString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getActionBadge = (action: string) => {
    const styles = {
      TIME_ENTRY_CREATED: 'bg-blue-100 text-blue-800',
      TIME_ENTRY_UPDATED: 'bg-yellow-100 text-yellow-800',
      EDIT_REQUEST_CREATED: 'bg-purple-100 text-purple-800',
      EDIT_REQUEST_APPROVED: 'bg-green-100 text-green-800',
      EDIT_REQUEST_REJECTED: 'bg-red-100 text-red-800',
    };
    return styles[action as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  if (!data || data.logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
        {t('audit.noChanges')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('audit.title')}</h2>

      {data.logs.map((log) => (
        <div key={log.id} className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${getActionBadge(log.action)}`}>
                {t(`audit.actions.${log.action}`, { defaultValue: log.action })}
              </span>
              <div className="text-sm text-gray-600">
                {log.actorEmail && (
                  <div>
                    <span className="font-medium">{t('audit.user')}:</span>{' '}
                    {log.actorEmail} {log.actorRole && `(${log.actorRole})`}
                  </div>
                )}
                <div>
                  <span className="font-medium">{t('audit.timestamp')}:</span>{' '}
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Changes */}
          {log.changes && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('audit.changes')}</h4>
              
              {/* Before/After comparison */}
              {log.changes.before || log.changes.after ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {log.changes.before && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">{t('audit.before')}</p>
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        {Object.entries(log.changes.before).map(([key, value]) => (
                          <div key={key} className="text-sm mb-1">
                            <span className="font-medium text-gray-700">{key}:</span>{' '}
                            <span className="text-gray-900">{formatValue(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {log.changes.after && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">{t('audit.after')}</p>
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        {Object.entries(log.changes.after).map(([key, value]) => (
                          <div key={key} className="text-sm mb-1">
                            <span className="font-medium text-gray-700">{key}:</span>{' '}
                            <span className="text-gray-900">{formatValue(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Other change formats
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  {Object.entries(log.changes)
                    .filter(([key]) => key !== 'before' && key !== 'after')
                    .map(([key, value]) => (
                      <div key={key} className="text-sm mb-1">
                        <span className="font-medium text-gray-700">{key}:</span>{' '}
                        <span className="text-gray-900">{formatValue(value)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          {(log.ipAddress || log.userAgent) && (
            <div className="border-t border-gray-200 mt-4 pt-4">
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700">
                  Technical Details
                </summary>
                <div className="mt-2 space-y-1">
                  {log.ipAddress && <div>IP: {log.ipAddress}</div>}
                  {log.userAgent && <div>User Agent: {log.userAgent}</div>}
                  {log.entityId && <div>Entity ID: {log.entityId}</div>}
                </div>
              </details>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
