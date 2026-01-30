import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useTranslation } from 'react-i18next';

interface QRScannerProps {
  onScan: (token: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const handleScan = (result: string) => {
    if (result) {
      onScan(result);
    }
  };

  const handleError = (err: Error) => {
    if (err.message.includes('Permission')) {
      setError(t('qr.cameraPermissionDenied'));
    } else {
      setError(t('qr.scanError'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">{t('qr.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scanner */}
        <div className="p-4">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">{t('qr.scanInstructions')}</p>
              <div className="rounded-lg overflow-hidden bg-black">
                <Scanner
                  onScan={(detectedCodes) => {
                    const code = detectedCodes[0];
                    if (code?.rawValue) {
                      handleScan(code.rawValue);
                    }
                  }}
                  onError={(err) => handleError(err as Error)}
                  styles={{
                    container: {
                      width: '100%',
                      height: '300px',
                    },
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('qr.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
