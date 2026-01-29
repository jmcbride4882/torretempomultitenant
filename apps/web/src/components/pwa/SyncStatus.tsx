import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { syncService } from '../../lib/sync-service';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

interface SyncStatusProps {
  variant?: 'badge' | 'full';
  className?: string;
}

export function SyncStatus({ variant = 'badge', className = '' }: SyncStatusProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateQueueCount = async () => {
      try {
        const count = await syncService.getQueueCount();
        setPendingCount(count);
        
        // If we have pending items and we're online, show syncing
        if (count > 0 && navigator.onLine) {
          setSyncState('syncing');
        } else if (count === 0) {
          setSyncState('idle');
        }
      } catch {
        setSyncState('error');
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setSyncState('syncing');
      updateQueueCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncState('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll for queue count
    const intervalId = setInterval(updateQueueCount, 3000);
    updateQueueCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  // Show success briefly after sync completes
  useEffect(() => {
    if (syncState === 'syncing' && pendingCount === 0 && isOnline) {
      setSyncState('success');
      const timeout = setTimeout(() => setSyncState('idle'), 2000);
      return () => clearTimeout(timeout);
    }
  }, [pendingCount, syncState, isOnline]);

  // Don't render if nothing to show
  if (syncState === 'idle' && pendingCount === 0) return null;

  if (variant === 'badge') {
    return <SyncStatusBadge state={syncState} count={pendingCount} className={className} />;
  }

  return <SyncStatusFull state={syncState} count={pendingCount} className={className} />;
}

interface SyncStatusBadgeProps {
  state: SyncState;
  count: number;
  className?: string;
}

function SyncStatusBadge({ state, count, className = '' }: SyncStatusBadgeProps) {
  const { t } = useTranslation();

  const styles = {
    idle: 'bg-slate-100 text-slate-700',
    syncing: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[state]} ${className}`}>
      {state === 'syncing' && (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {state === 'success' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {state === 'error' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {count > 0 && (
        <div className="w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
          {count > 9 ? '9+' : count}
        </div>
      )}
      <span>
        {state === 'syncing' && t('pwa.syncing')}
        {state === 'success' && t('pwa.syncComplete')}
        {state === 'error' && t('pwa.syncError')}
        {state === 'idle' && count > 0 && t('pwa.itemsPending', { count })}
      </span>
    </div>
  );
}

interface SyncStatusFullProps {
  state: SyncState;
  count: number;
  className?: string;
}

function SyncStatusFull({ state, count, className = '' }: SyncStatusFullProps) {
  const { t } = useTranslation();

  const backgrounds = {
    idle: 'bg-slate-50 border-slate-200',
    syncing: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
  };

  const iconColors = {
    idle: 'text-slate-400',
    syncing: 'text-blue-500',
    success: 'text-green-500',
    error: 'text-red-500',
  };

  return (
    <div className={`rounded-xl border p-4 ${backgrounds[state]} ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${state === 'syncing' ? 'bg-blue-100' : state === 'success' ? 'bg-green-100' : state === 'error' ? 'bg-red-100' : 'bg-slate-100'}`}>
          {state === 'syncing' ? (
            <svg className={`w-5 h-5 animate-spin ${iconColors[state]}`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : state === 'success' ? (
            <svg className={`w-5 h-5 ${iconColors[state]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : state === 'error' ? (
            <svg className={`w-5 h-5 ${iconColors[state]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className={`w-5 h-5 ${iconColors[state]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">
            {state === 'syncing' && t('pwa.syncing')}
            {state === 'success' && t('pwa.syncComplete')}
            {state === 'error' && t('pwa.syncError')}
            {state === 'idle' && count > 0 && t('pwa.itemsPending', { count })}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {state === 'syncing' && t('pwa.syncingDescription')}
            {state === 'error' && 'Will automatically retry'}
            {count > 0 && state !== 'syncing' && `${count} actions queued`}
          </p>
        </div>
      </div>
    </div>
  );
}
