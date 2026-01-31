import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { syncService } from '../../lib/sync-service';

interface QueueItem {
  id: string;
  endpoint: string;
  method: string;
  body: unknown;
  timestamp: number;
  retries: number;
  lastError?: string;
}

export function OfflineQueue() {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateQueue = async () => {
      const items = await syncService.getQueue();
      setQueue(items);
    };

    updateQueue();
    const intervalId = setInterval(updateQueue, 2000);

    return () => clearInterval(intervalId);
  }, []);

  if (queue.length === 0) return null;

  return (
    <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center">
          <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-gray-900">{t('clocking.offlineQueue')}</span>
          <span className="ml-2 text-sm text-gray-600">({queue.length})</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="px-6 py-4 space-y-3">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {item.endpoint.includes('clock-in') ? t('clocking.clockIn') : t('clocking.clockOut')}
                  </div>
                  <div className="text-xs text-gray-600">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  {item.retries > 0 && (
                    <div className="text-xs text-yellow-600 mt-1">
                      {t('clocking.retryAttempt', { count: item.retries })}
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <svg className="w-5 h-5 text-yellow-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
