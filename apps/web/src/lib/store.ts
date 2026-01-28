import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant, TimeEntry } from '@torre-tempo/shared';

// ============================================
// AUTH STORE
// ============================================

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tenant: Tenant, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, tenant, token) =>
        set({
          user,
          tenant,
          accessToken: token,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          tenant: null,
          accessToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'torre-tempo-auth',
    }
  )
);

// ============================================
// CLOCK STATE STORE
// ============================================

interface ClockState {
  currentEntry: TimeEntry | null;
  isClockedIn: boolean;
  setCurrentEntry: (entry: TimeEntry | null) => void;
  clockIn: (entry: TimeEntry) => void;
  clockOut: () => void;
}

export const useClockStore = create<ClockState>((set) => ({
  currentEntry: null,
  isClockedIn: false,
  setCurrentEntry: (entry) =>
    set({
      currentEntry: entry,
      isClockedIn: entry !== null && entry.clockOut === null,
    }),
  clockIn: (entry) =>
    set({
      currentEntry: entry,
      isClockedIn: true,
    }),
  clockOut: () =>
    set({
      currentEntry: null,
      isClockedIn: false,
    }),
}));

// ============================================
// OFFLINE STORE
// ============================================

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  setOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: navigator.onLine,
  pendingCount: 0,
  setOnline: (online) => set({ isOnline: online }),
  setPendingCount: (count) => set({ pendingCount: count }),
}));

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnline(true);
  });
  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnline(false);
  });
}

// ============================================
// UI STORE
// ============================================

interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}));
