import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { syncService } from '../../lib/sync-service';
import { OfflineQueue } from './OfflineQueue';
import { QRScanner } from '../../components/QRScanner';

interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut: string | null;
  location?: {
    id: string;
    name: string;
  };
  origin: string;
  breakMinutes?: number;
}

export function ClockingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

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

   const { data: currentEntry, isLoading } = useQuery<TimeEntry | null>({
     queryKey: ['current-time-entry'],
     queryFn: async () => {
       try {
         const response = await api.get<TimeEntry>('/time-tracking/current');
         return response;
       } catch (e) {
         // 404 means "no active entry" - this is valid, not an error
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

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationError(t('locations.gpsPermissionRequired'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError(null);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError(t('locations.gpsPermissionDenied'));
      },
    );
  };

  const handleQRScan = (token: string) => {
    setQrToken(token);
    setShowQRScanner(false);
    // Auto-request location when QR is scanned
    requestGeolocation();
  };

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
      queryClient.invalidateQueries({ queryKey: ['current-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
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
       // Immediately set cache to null for instant UI update
       queryClient.setQueryData(['current-time-entry'], null);
       // Then invalidate for eventual consistency
       await queryClient.invalidateQueries({ queryKey: ['current-time-entry'] });
       queryClient.invalidateQueries({ queryKey: ['time-entries'] });
     },
   });

  const isClockedIn = !!currentEntry && !currentEntry.clockOut;

  const handleClockIn = () => {
    clockInMutation.mutate();
  };

  const handleClockOut = () => {
    clockOutMutation.mutate(0);
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Network Status Banner */}
        {!isOnline && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-yellow-800 font-medium">{t('clocking.offlineMode')}</span>
            </div>
          </div>
        )}

        {/* Queue Status */}
        {queueCount > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-blue-800">{t('clocking.pendingSync', { count: queueCount })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Clock Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('clocking.title')}</h1>

          {/* Current Status */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">{t('clocking.status')}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isClockedIn 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {isClockedIn ? t('clocking.clockedIn') : t('clocking.clockedOut')}
              </span>
            </div>

            {isClockedIn && currentEntry && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('clocking.clockInTime')}</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {new Date(currentEntry.clockIn).toLocaleTimeString()}
                  </span>
                </div>
                {currentEntry.location && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('clocking.location')}</span>
                    <span className="text-sm text-gray-900">{currentEntry.location.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QR & Geolocation Status */}
          {!isClockedIn && (
            <div className="mb-6 space-y-3">
              {/* QR Scan Button */}
              <button
                onClick={() => setShowQRScanner(true)}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center border border-blue-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                {qrToken ? t('qr.validCode') : t('locations.scanQR')}
              </button>

              {/* Location Status */}
              {qrToken && (
                <div className={`p-3 rounded-lg ${location ? 'bg-green-50 text-green-800' : locationError ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'}`}>
                  {location ? (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('locations.insideGeofence')}
                    </div>
                  ) : locationError ? (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {locationError}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('locations.gettingLocation')}
                    </div>
                  )}
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
                className="w-full h-20 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold text-xl px-6 rounded-xl shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-3"
              >
                {clockInMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('clocking.clockIn')}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleClockOut}
                disabled={clockOutMutation.isPending}
                className="w-full h-20 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold text-xl px-6 rounded-xl shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-3"
              >
                {clockOutMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    {t('clocking.clockOut')}
                  </>
                )}
              </button>
            )}
          </div>
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
