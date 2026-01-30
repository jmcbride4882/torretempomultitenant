import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, differenceInMinutes } from 'date-fns';
import { api } from '../../lib/api';
import { syncService } from '../../lib/sync-service';
import { OfflineQueue } from './OfflineQueue';
import { QRScanner } from '../../components/QRScanner';
import type { TimeEntry, EntryOrigin } from '@torre-tempo/shared';

// ============================================
// TYPES
// ============================================

interface TimeEntryWithLocation extends TimeEntry {
  location?: {
    id: string;
    name: string;
  };
}

interface TimeEntriesResponse {
  entries: TimeEntryWithLocation[];
  total: number;
  page: number;
  pageSize: number;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

type MutationError = Error & { message: string };

// ============================================
// HELPERS
// ============================================

function formatElapsedTime(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const elapsed = Math.max(0, now - start);

  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatDuration(clockIn: string, clockOut: string | null): string {
  if (!clockOut) return '--:--';
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  const elapsed = Math.max(0, end - start);

  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function getOriginBadgeClass(origin: EntryOrigin): string {
  switch (origin) {
    case 'QR':
      return 'bg-blue-100 text-blue-800';
    case 'GEOFENCE':
      return 'bg-green-100 text-green-800';
    case 'OFFLINE':
      return 'bg-yellow-100 text-yellow-800';
    case 'MANUAL':
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ============================================
// COMPONENT
// ============================================

export function ClockingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeBreak, setActiveBreak] = useState<any>(null);
  const [breaks, setBreaks] = useState<any[]>([]);

  // Initialize sync service and listeners
  useEffect(() => {
    syncService.start();

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    const updateQueueCount = async () => {
      const count = await syncService.getQueueCount();
      setQueueCount(count);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    const intervalId = setInterval(updateQueueCount, 2000);
    updateQueueCount();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(intervalId);
    };
  }, []);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // ============================================
  // QUERIES
  // ============================================

  // Current time entry query
  const { data: currentEntry, isLoading: isLoadingCurrent } = useQuery<TimeEntryWithLocation | null>({
    queryKey: ['current-time-entry'],
    queryFn: async () => {
      try {
        const response = await api.get<TimeEntryWithLocation>('/time-tracking/current');
        return response;
      } catch (e) {
        const error = e as Error;
        if (error.message.includes('HTTP 404')) return null;
        throw e;
      }
    },
    retry: (count, e) => {
      const error = e as Error;
      return !error.message.includes('HTTP 404') && count < 2;
    },
    refetchInterval: 30000,
  });

  // Recent entries query
  const { data: recentEntriesData, isLoading: isLoadingEntries } = useQuery<TimeEntriesResponse>({
    queryKey: ['time-entries', { page: 1, pageSize: 10 }],
    queryFn: async () => {
      return api.get<TimeEntriesResponse>('/time-tracking/entries?page=1&pageSize=10');
    },
    refetchInterval: 60000,
  });

  const recentEntries = recentEntriesData?.entries ?? [];

  // ============================================
  // ELAPSED TIME TIMER
  // ============================================

  const isClockedIn = !!currentEntry && !currentEntry.clockOut;

  useEffect(() => {
    if (!isClockedIn || !currentEntry) {
      setElapsedTime('00:00:00');
      return;
    }

    const updateElapsed = () => {
      setElapsedTime(formatElapsedTime(currentEntry.clockIn));
    };

    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);

    return () => clearInterval(intervalId);
  }, [isClockedIn, currentEntry]);

  // ============================================
  // GEOLOCATION
  // ============================================

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t('locations.gpsPermissionRequired'));
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError(null);
        setLocationLoading(false);
      },
      (error) => {
        let message = t('locations.gpsPermissionDenied');
        if (error.code === error.TIMEOUT) {
          message = t('clocking.locationTimeout');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = t('clocking.locationUnavailable');
        }
        setLocationError(message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [t]);

  // ============================================
  // QR HANDLING
  // ============================================

  const handleQRScan = (token: string) => {
    setQrToken(token);
    setShowQRScanner(false);
    setSuccessMessage(t('qr.validCode'));
    requestGeolocation();
  };

  // ============================================
  // MUTATIONS
  // ============================================

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const body = {
        offlineId: !isOnline ? crypto.randomUUID() : undefined,
        qrTokenId: qrToken || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
      };

      if (!isOnline) {
        await syncService.addToQueue('/time-tracking/clock-in', 'POST', body);
        return { queued: true };
      }

      return api.post('/time-tracking/clock-in', body);
    },
    onSuccess: () => {
      setQrToken(null);
      setLocation(null);
      setLocationError(null);
      setSuccessMessage(t('clock.success.clockIn'));
      queryClient.invalidateQueries({ queryKey: ['current-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
    onError: (error: MutationError) => {
      if (error.message.includes('already clocked')) {
        setErrorMessage(t('clock.error.alreadyClockedIn'));
      } else if (error.message.includes('geofence') || error.message.includes('outside')) {
        setErrorMessage(t('clock.error.geofence'));
      } else if (error.message.includes('QR') || error.message.includes('invalid')) {
        setErrorMessage(t('clock.error.qrInvalid'));
      } else {
        setErrorMessage(error.message || t('common.error'));
      }
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (breakMinutes?: number) => {
      const body = { breakMinutes: breakMinutes || 0 };

      if (!isOnline) {
        await syncService.addToQueue('/time-tracking/clock-out', 'POST', body);
        return { queued: true };
      }

      return api.post('/time-tracking/clock-out', body);
    },
    onSuccess: async () => {
      queryClient.setQueryData(['current-time-entry'], null);
      setSuccessMessage(t('clock.success.clockOut'));
      await queryClient.invalidateQueries({ queryKey: ['current-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
    onError: (error: MutationError) => {
      if (error.message.includes('not clocked')) {
        setErrorMessage(t('clock.error.notClockedIn'));
      } else {
        setErrorMessage(error.message || t('common.error'));
      }
    },
  });

  // ============================================
  // HANDLERS
  // ============================================

  const handleClockIn = () => {
    setErrorMessage(null);
    clockInMutation.mutate();
  };

  const handleClockOut = () => {
    setErrorMessage(null);
    clockOutMutation.mutate(0);
  };

  // ============================================
  // BREAK TRACKING
  // ============================================

  // Fetch breaks when current entry changes
  useEffect(() => {
    if (currentEntry?.id) {
      fetchActiveBreak();
      fetchBreaks();
    } else {
      setActiveBreak(null);
      setBreaks([]);
    }
  }, [currentEntry?.id]);

   const fetchActiveBreak = async () => {
     if (!currentEntry?.id) return;
     try {
       const response = await api.get<any[]>(`/time-tracking/breaks/${currentEntry.id}`);
       const activeBreak = response.find((b: any) => !b.endedAt);
       setActiveBreak(activeBreak || null);
     } catch {
       // Failed to fetch active break - continue with null state
     }
   };

   const fetchBreaks = async () => {
     if (!currentEntry?.id) return;
     try {
       const response = await api.get<any[]>(`/time-tracking/breaks/${currentEntry.id}`);
       setBreaks(response);
     } catch {
       // Failed to fetch breaks - continue with empty state
     }
   };

  const startBreakMutation = useMutation({
    mutationFn: async (timeEntryId: string) => {
      return api.post('/time-tracking/breaks/start', { timeEntryId });
    },
    onSuccess: (data) => {
      setActiveBreak(data);
      setSuccessMessage(t('clocking.breakStarted'));
    },
    onError: (error: MutationError) => {
      setErrorMessage(error.message || t('clocking.breakStartFailed'));
    },
  });

  const endBreakMutation = useMutation({
    mutationFn: async (breakId: string) => {
      return api.post('/time-tracking/breaks/end', { breakId });
    },
    onSuccess: async () => {
      setActiveBreak(null);
      await fetchBreaks();
      setSuccessMessage(t('clocking.breakEnded'));
    },
    onError: (error: MutationError) => {
      setErrorMessage(error.message || t('clocking.breakEndFailed'));
    },
  });

  const handleStartBreak = () => {
    if (currentEntry?.id) {
      setErrorMessage(null);
      startBreakMutation.mutate(currentEntry.id);
    }
  };

  const handleEndBreak = () => {
    if (activeBreak?.id) {
      setErrorMessage(null);
      endBreakMutation.mutate(activeBreak.id);
    }
  };

  const isBreakMinimumMet = (startTime: string) => {
    return differenceInMinutes(new Date(), new Date(startTime)) >= 15;
  };

  const formatBreakElapsedTime = (startTime: string) => {
    const elapsed = differenceInMinutes(new Date(), new Date(startTime));
    return `${elapsed} ${t('common.minutes')}`;
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoadingCurrent) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        role="status"
        aria-label={t('common.loading')}
      >
        <div className="flex flex-col items-center gap-4">
          <svg 
            className="animate-spin w-12 h-12 text-blue-600" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-600 text-lg">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        
        {/* Success Message Toast */}
        {successMessage && (
          <div 
            className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm animate-fade-in"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-emerald-800 font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message Toast */}
        {errorMessage && (
          <div 
            className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm animate-fade-in"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800 font-medium">{errorMessage}</span>
              <button 
                onClick={() => setErrorMessage(null)}
                className="ml-auto text-red-600 hover:text-red-800 p-1"
                aria-label={t('common.close')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Network Status Banner */}
        {!isOnline && (
          <div 
            className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-amber-800 font-medium">{t('clocking.offlineMode')}</span>
            </div>
          </div>
        )}

        {/* Queue Status */}
        {queueCount > 0 && (
          <div 
            className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-3 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-blue-800 font-medium">{t('clocking.pendingSync', { count: queueCount })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Clock Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h1 className="text-2xl font-bold text-slate-900">{t('clocking.title')}</h1>
          </div>

          <div className="p-6">
            {/* Current Status */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600 font-medium">{t('clocking.status')}</span>
                <span 
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    isClockedIn 
                      ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-200' 
                      : 'bg-slate-100 text-slate-700'
                  }`}
                  role="status"
                  aria-label={isClockedIn ? t('clocking.clockedIn') : t('clocking.clockedOut')}
                >
                  {isClockedIn ? t('clocking.clockedIn') : t('clocking.clockedOut')}
                </span>
              </div>

              {/* Active Session Card */}
              {isClockedIn && currentEntry && (
                <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  {/* Live Elapsed Time */}
                  <div className="text-center mb-4">
                    <div 
                      className="text-4xl font-mono font-bold text-emerald-700 tracking-wider"
                      role="timer"
                      aria-label={t('clocking.elapsedTime', { time: elapsedTime })}
                    >
                      {elapsedTime}
                    </div>
                    <p className="text-sm text-emerald-600 mt-1">{t('clocking.timeElapsed')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-200">
                    <div>
                      <span className="text-xs text-emerald-600 uppercase tracking-wide">{t('clocking.clockInTime')}</span>
                      <p className="text-lg font-semibold text-emerald-900 mt-0.5">
                        {formatTime(currentEntry.clockIn)}
                      </p>
                    </div>
                    {currentEntry.location && (
                      <div>
                        <span className="text-xs text-emerald-600 uppercase tracking-wide">{t('clocking.location')}</span>
                        <p className="text-lg font-semibold text-emerald-900 mt-0.5 truncate">
                          {currentEntry.location.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Origin Badge */}
                  <div className="mt-4 flex justify-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOriginBadgeClass(currentEntry.origin)}`}>
                      {currentEntry.origin}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* QR & Geolocation Options (only when not clocked in) */}
            {!isClockedIn && (
              <div className="mb-6 space-y-3">
                {/* QR Scan Button */}
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-medium py-4 px-5 rounded-xl transition-all duration-200 flex items-center justify-center border border-blue-200 hover:border-blue-300 min-h-[56px] active:scale-[0.98]"
                  aria-label={t('locations.scanQR')}
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  {qrToken ? (
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('qr.validCode')}
                    </span>
                  ) : (
                    t('locations.scanQR')
                  )}
                </button>

                {/* Location Request Button */}
                <button
                  onClick={requestGeolocation}
                  disabled={locationLoading}
                  className="w-full bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 text-slate-700 font-medium py-4 px-5 rounded-xl transition-all duration-200 flex items-center justify-center border border-slate-200 hover:border-slate-300 min-h-[56px] active:scale-[0.98] disabled:opacity-60"
                  aria-label={t('clocking.getLocation')}
                >
                  {locationLoading ? (
                    <>
                      <svg className="animate-spin w-6 h-6 mr-3 text-slate-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('locations.gettingLocation')}
                    </>
                  ) : location ? (
                    <>
                      <svg className="w-6 h-6 mr-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('locations.insideGeofence')}
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t('clocking.getLocation')}
                    </>
                  )}
                </button>

                {/* Location Error */}
                {locationError && (
                  <div 
                    className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 flex items-center"
                    role="alert"
                  >
                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">{locationError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Clock In/Out Buttons */}
            <div className="space-y-4">
              {!isClockedIn ? (
                <button
                  onClick={handleClockIn}
                  disabled={clockInMutation.isPending}
                  className="w-full h-20 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold text-xl px-6 rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all duration-200 active:scale-[0.98] disabled:shadow-none flex items-center justify-center gap-3"
                  aria-label={t('clocking.clockIn')}
                  aria-busy={clockInMutation.isPending}
                >
                  {clockInMutation.isPending ? (
                    <>
                      <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{t('common.loading')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{t('clocking.clockIn')}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleClockOut}
                  disabled={clockOutMutation.isPending}
                  className="w-full h-20 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold text-xl px-6 rounded-2xl shadow-lg shadow-rose-200 hover:shadow-rose-300 transition-all duration-200 active:scale-[0.98] disabled:shadow-none flex items-center justify-center gap-3"
                  aria-label={t('clocking.clockOut')}
                  aria-busy={clockOutMutation.isPending}
                >
                  {clockOutMutation.isPending ? (
                    <>
                      <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{t('common.loading')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      <span>{t('clocking.clockOut')}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Break Tracking Section */}
            {currentEntry && !currentEntry.clockOut && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {t('clocking.breaks')}
                </h3>
                
                {!activeBreak ? (
                  <button
                    onClick={handleStartBreak}
                    disabled={startBreakMutation.isPending}
                    className="w-full bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:shadow-none flex items-center justify-center gap-2 shadow-md"
                    aria-label={t('clocking.startBreak')}
                  >
                    {startBreakMutation.isPending ? (
                      <>
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{t('common.loading')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">☕</span>
                        <span>{t('clocking.startBreak')}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm text-amber-800 mb-2 font-medium">
                        {t('clocking.onBreak')}
                      </p>
                      <p className="text-3xl font-mono font-bold text-amber-900">
                        {formatBreakElapsedTime(activeBreak.startedAt)}
                      </p>
                      <p className="text-xs text-amber-700 mt-2">
                        {t('clocking.breakStarted')}: {format(new Date(activeBreak.startedAt), 'HH:mm')}
                      </p>
                    </div>
                    
                    <button
                      onClick={handleEndBreak}
                      disabled={endBreakMutation.isPending || !isBreakMinimumMet(activeBreak.startedAt)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:shadow-none flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
                      aria-label={t('clocking.endBreak')}
                    >
                      {endBreakMutation.isPending ? (
                        <>
                          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>{t('common.loading')}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{t('clocking.endBreak')}</span>
                        </>
                      )}
                    </button>
                    
                    {!isBreakMinimumMet(activeBreak.startedAt) && (
                      <p className="text-sm text-amber-600 text-center font-medium">
                        {t('clocking.breakMinimum')}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Break History */}
                {breaks.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                      {t('clocking.breaksToday')}
                    </h4>
                    <div className="space-y-2">
                      {breaks.map((breakEntry) => (
                        <div
                          key={breakEntry.id}
                          className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded-lg border border-slate-200"
                        >
                          <span className="text-slate-600">
                            {format(new Date(breakEntry.startedAt), 'HH:mm')} -{' '}
                            {breakEntry.endedAt ? format(new Date(breakEntry.endedAt), 'HH:mm') : t('clocking.ongoing')}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {breakEntry.endedAt
                              ? `${differenceInMinutes(new Date(breakEntry.endedAt), new Date(breakEntry.startedAt))} ${t('common.minutes')}`
                              : t('clocking.ongoing')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Entries Section */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-lg font-bold text-slate-900">{t('clocking.recentEntries')}</h2>
          </div>

          {isLoadingEntries ? (
            <div className="p-6 flex justify-center" role="status" aria-label={t('common.loading')}>
              <svg className="animate-spin w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-500">{t('entries.noEntries')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100" aria-label={t('clocking.recentEntries')}>
              {recentEntries.map((entry) => (
                <li 
                  key={entry.id} 
                  className="px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">
                          {formatDate(entry.clockIn)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getOriginBadgeClass(entry.origin)}`}>
                          {entry.origin}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>
                          <span className="text-slate-400">{t('entries.clockIn')}:</span>{' '}
                          {formatTime(entry.clockIn)}
                        </span>
                        <span>
                          <span className="text-slate-400">{t('entries.clockOut')}:</span>{' '}
                          {entry.clockOut ? formatTime(entry.clockOut) : '--:--'}
                        </span>
                      </div>
                      {entry.location && (
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {entry.location.name}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 text-right">
                      <span className="text-lg font-bold text-slate-900">
                        {formatDuration(entry.clockIn, entry.clockOut)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Offline Queue Component */}
        <OfflineQueue />
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}
