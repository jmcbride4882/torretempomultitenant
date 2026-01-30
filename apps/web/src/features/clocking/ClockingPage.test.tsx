import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test-utils';
import { ClockingPage } from './ClockingPage';
import * as api from '../../lib/api';

// Mock the API
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock the sync service
vi.mock('../../lib/sync-service', () => ({
  syncService: {
    start: vi.fn(),
    getQueueCount: vi.fn(() => Promise.resolve(0)),
    addToQueue: vi.fn(() => Promise.resolve()),
  },
}));

// Mock the OfflineQueue component
vi.mock('./OfflineQueue', () => ({
  OfflineQueue: () => <div data-testid="offline-queue">Offline Queue</div>,
}));

// Mock the QRScanner component
vi.mock('../../components/QRScanner', () => ({
  QRScanner: ({ onScan, onClose }: { onScan: (token: string) => void; onClose: () => void }) => (
    <div data-testid="qr-scanner">
      <button onClick={() => onScan('test-qr-token')}>Scan QR</button>
      <button onClick={onClose}>Close Scanner</button>
    </div>
  ),
}));

describe('ClockingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  describe('Loading State', () => {
    it('displays loading spinner when fetching current entry', async () => {
      vi.mocked(api.api.get).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ClockingPage />);

      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Clocked Out State', () => {
    beforeEach(() => {
      // Mock API to return no current entry (404)
      vi.mocked(api.api.get).mockImplementation(async (path: string) => {
        if (path === '/time-tracking/current') {
          throw new Error('HTTP 404');
        }
        if (path.includes('/time-tracking/entries')) {
          return { entries: [], total: 0, page: 1, pageSize: 10 };
        }
        throw new Error('Unknown path');
      });
    });

    it('displays clocked out status', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByText(/clocked out/i)).toBeInTheDocument();
      });
    });

    it('displays clock in button when not clocked in', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        const clockInButton = screen.getByRole('button', { name: /clock in/i });
        expect(clockInButton).toBeInTheDocument();
        expect(clockInButton).toBeEnabled();
      });
    });

    it('displays QR scanner button when not clocked in', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /scan qr/i })).toBeInTheDocument();
      });
    });

    it('displays get location button when not clocked in', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /get location/i })).toBeInTheDocument();
      });
    });

    it('does not display clock out button when not clocked in', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /clock out/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Clocked In State', () => {
    const mockCurrentEntry = {
      id: 'entry-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      locationId: 'location-1',
      clockIn: new Date().toISOString(),
      clockOut: null,
      breakMinutes: null,
      origin: 'MANUAL',
      qrTokenId: null,
      clockInLat: 40.4168,
      clockInLng: -3.7038,
      clockOutLat: null,
      clockOutLng: null,
      offlineId: null,
      syncedAt: null,
      conflictFlag: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      location: {
        id: 'location-1',
        name: 'Main Office',
      },
    };

    beforeEach(() => {
      vi.mocked(api.api.get).mockImplementation(async (path: string) => {
        if (path === '/time-tracking/current') {
          return mockCurrentEntry;
        }
        if (path.includes('/time-tracking/entries')) {
          return { entries: [], total: 0, page: 1, pageSize: 10 };
        }
        throw new Error('Unknown path');
      });
    });

    it('displays clocked in status', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByText(/clocked in/i)).toBeInTheDocument();
      });
    });

    it('displays elapsed time timer', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        // Look for timer role or elapsed time display
        const timer = screen.getByRole('timer');
        expect(timer).toBeInTheDocument();
        expect(timer).toHaveTextContent(/\d{2}:\d{2}:\d{2}/); // Format: HH:MM:SS
      });
    });

    it('displays clock out button when clocked in', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        const clockOutButton = screen.getByRole('button', { name: /clock out/i });
        expect(clockOutButton).toBeInTheDocument();
        expect(clockOutButton).toBeEnabled();
      });
    });

    it('does not display clock in button when clocked in', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /^clock in$/i })).not.toBeInTheDocument();
      });
    });

    it('displays location name when available', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByText('Main Office')).toBeInTheDocument();
      });
    });

    it('displays origin badge', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByText('MANUAL')).toBeInTheDocument();
      });
    });
  });

  describe('Clock In Interaction', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockImplementation(async (path: string) => {
        if (path === '/time-tracking/current') {
          throw new Error('HTTP 404');
        }
        if (path.includes('/time-tracking/entries')) {
          return { entries: [], total: 0, page: 1, pageSize: 10 };
        }
        throw new Error('Unknown path');
      });
    });

    it('calls API when clock in button is clicked', async () => {
      const mockPost = vi.mocked(api.api.post).mockResolvedValue({});

      const { user } = render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clock in/i })).toBeInTheDocument();
      });

      const clockInButton = screen.getByRole('button', { name: /clock in/i });
      await user.click(clockInButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/time-tracking/clock-in', expect.any(Object));
      });
    });

    it('displays success message after successful clock in', async () => {
      vi.mocked(api.api.post).mockResolvedValue({});

      const { user } = render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clock in/i })).toBeInTheDocument();
      });

      const clockInButton = screen.getByRole('button', { name: /clock in/i });
      await user.click(clockInButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/clocked in successfully/i)).toBeInTheDocument();
      });
    });

    it('displays error message when clock in fails', async () => {
      vi.mocked(api.api.post).mockRejectedValue(new Error('Already clocked in'));

      const { user } = render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clock in/i })).toBeInTheDocument();
      });

      const clockInButton = screen.getByRole('button', { name: /clock in/i });
      await user.click(clockInButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/already clocked in/i)).toBeInTheDocument();
      });
    });
  });

  describe('Clock Out Interaction', () => {
    const mockCurrentEntry = {
      id: 'entry-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      locationId: 'location-1',
      clockIn: new Date().toISOString(),
      clockOut: null,
      breakMinutes: null,
      origin: 'MANUAL',
      qrTokenId: null,
      clockInLat: 40.4168,
      clockInLng: -3.7038,
      clockOutLat: null,
      clockOutLng: null,
      offlineId: null,
      syncedAt: null,
      conflictFlag: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    beforeEach(() => {
      vi.mocked(api.api.get).mockImplementation(async (path: string) => {
        if (path === '/time-tracking/current') {
          return mockCurrentEntry;
        }
        if (path.includes('/time-tracking/entries')) {
          return { entries: [], total: 0, page: 1, pageSize: 10 };
        }
        throw new Error('Unknown path');
      });
    });

    it('calls API when clock out button is clicked', async () => {
      const mockPost = vi.mocked(api.api.post).mockResolvedValue({});

      const { user } = render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clock out/i })).toBeInTheDocument();
      });

      const clockOutButton = screen.getByRole('button', { name: /clock out/i });
      await user.click(clockOutButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/time-tracking/clock-out', expect.any(Object));
      });
    });

    it('displays success message after successful clock out', async () => {
      vi.mocked(api.api.post).mockResolvedValue({});

      const { user } = render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clock out/i })).toBeInTheDocument();
      });

      const clockOutButton = screen.getByRole('button', { name: /clock out/i });
      await user.click(clockOutButton);

      await waitFor(() => {
        expect(screen.getByText(/clocked out successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('QR Scanner', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockImplementation(async (path: string) => {
        if (path === '/time-tracking/current') {
          throw new Error('HTTP 404');
        }
        if (path.includes('/time-tracking/entries')) {
          return { entries: [], total: 0, page: 1, pageSize: 10 };
        }
        throw new Error('Unknown path');
      });
    });

    it('opens QR scanner when scan button is clicked', async () => {
      const { user } = render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /scan qr/i })).toBeInTheDocument();
      });

      const scanButton = screen.getByRole('button', { name: /scan qr/i });
      await user.click(scanButton);

      await waitFor(() => {
        expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
      });
    });

    it('closes QR scanner when close is clicked', async () => {
      const { user } = render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /scan qr/i })).toBeInTheDocument();
      });

      const scanButton = screen.getByRole('button', { name: /scan qr/i });
      await user.click(scanButton);

      await waitFor(() => {
        expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close Scanner');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('qr-scanner')).not.toBeInTheDocument();
      });
    });

    it('displays success message when QR code is scanned', async () => {
      const { user } = render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /scan qr/i })).toBeInTheDocument();
      });

      const scanButton = screen.getByRole('button', { name: /scan qr/i });
      await user.click(scanButton);

      await waitFor(() => {
        expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
      });

      const scanQRButton = screen.getByText('Scan QR');
      await user.click(scanQRButton);

      await waitFor(() => {
        // Look for the success alert with the QR code message
        const alerts = screen.getAllByRole('alert');
        const successAlert = alerts.find((alert: HTMLElement) => alert.textContent?.includes('Valid QR code'));
        expect(successAlert).toBeInTheDocument();
      });
    });
  });

  describe('Geolocation', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockImplementation(async (path: string) => {
        if (path === '/time-tracking/current') {
          throw new Error('HTTP 404');
        }
        if (path.includes('/time-tracking/entries')) {
          return { entries: [], total: 0, page: 1, pageSize: 10 };
        }
        throw new Error('Unknown path');
      });
    });

    it('requests geolocation when get location button is clicked', async () => {
      const mockGetCurrentPosition = vi.fn();
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        writable: true,
      });

      const { user } = render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /get location/i })).toBeInTheDocument();
      });

      const locationButton = screen.getByRole('button', { name: /get location/i });
      await user.click(locationButton);

      expect(mockGetCurrentPosition).toHaveBeenCalled();
    });

    it('displays error when geolocation fails', async () => {
      const mockGetCurrentPosition = vi.fn((_success, error) => {
        error({ code: 1, message: 'Permission denied' });
      });
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        writable: true,
      });

      const { user } = render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /get location/i })).toBeInTheDocument();
      });

      const locationButton = screen.getByRole('button', { name: /get location/i });
      await user.click(locationButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/gps permission denied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Mode', () => {
    beforeEach(() => {
      vi.mocked(api.api.get).mockImplementation(async (path: string) => {
        if (path === '/time-tracking/current') {
          throw new Error('HTTP 404');
        }
        if (path.includes('/time-tracking/entries')) {
          return { entries: [], total: 0, page: 1, pageSize: 10 };
        }
        throw new Error('Unknown path');
      });

      // Set navigator to offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    });

    it('displays offline banner when offline', async () => {
      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
      });
    });
  });

  describe('Recent Entries', () => {
    it('displays recent entries when available', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          locationId: null,
          clockIn: new Date('2024-01-15T09:00:00').toISOString(),
          clockOut: new Date('2024-01-15T17:00:00').toISOString(),
          breakMinutes: 30,
          origin: 'MANUAL',
          qrTokenId: null,
          clockInLat: null,
          clockInLng: null,
          clockOutLat: null,
          clockOutLng: null,
          offlineId: null,
          syncedAt: null,
          conflictFlag: false,
          status: 'ACTIVE',
          createdAt: new Date('2024-01-15T09:00:00').toISOString(),
          updatedAt: new Date('2024-01-15T17:00:00').toISOString(),
        },
      ];

      vi.mocked(api.api.get).mockImplementation(async (path: string) => {
        if (path === '/time-tracking/current') {
          throw new Error('HTTP 404');
        }
        if (path.includes('/time-tracking/entries')) {
          return { entries: mockEntries, total: 1, page: 1, pageSize: 10 };
        }
        throw new Error('Unknown path');
      });

      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByText(/recent entries/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        // Check that the entry is displayed
        const entryList = screen.getByRole('list', { name: /recent entries/i });
        expect(entryList).toBeInTheDocument();
        expect(entryList.querySelectorAll('li')).toHaveLength(1);
      });
    });

    it('displays no entries message when no entries available', async () => {
      vi.mocked(api.api.get).mockImplementation(async (path: string) => {
        if (path === '/time-tracking/current') {
          throw new Error('HTTP 404');
        }
        if (path.includes('/time-tracking/entries')) {
          return { entries: [], total: 0, page: 1, pageSize: 10 };
        }
        throw new Error('Unknown path');
      });

      render(<ClockingPage />);

      await waitFor(() => {
        expect(screen.getByText(/no entries/i)).toBeInTheDocument();
      });
    });
  });
});
