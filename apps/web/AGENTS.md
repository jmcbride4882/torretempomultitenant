# apps/web - Torre Tempo Frontend

**Generated:** 2026-02-01 00:32
**Commit:** f91395f
**Branch:** main

## OVERVIEW
React 18 + Vite PWA with Tailwind. Routes are inline in App.tsx; i18n and state tooling are wired. Offline-first with IndexedDB queue and Service Worker sync.

## STRUCTURE

```
web/
├── src/
│   ├── App.tsx               # Routes + page components (inline until >50 lines)
│   ├── main.tsx              # Entry point + SW registration
│   ├── features/             # Domain features (10 subdirs, 33 files)
│   │   ├── landing/
│   │   ├── clocking/
│   │   ├── dashboard/
│   │   ├── approvals/
│   │   ├── scheduling/
│   │   ├── overtime/
│   │   ├── reports/
│   │   ├── locations/
│   │   ├── users/
│   │   ├── profile/
│   │   ├── settings/
│   │   └── tenants/
│   ├── components/           # Shared components (22 files)
│   │   ├── layout/           # AppLayout, QuickActions, BottomNav
│   │   ├── pwa/              # InstallPrompt, OfflineIndicator
│   │   └── ui/               # Reusable UI primitives
│   ├── lib/                  # Utilities (4 files)
│   │   ├── api.ts            # Centralized API client
│   │   ├── store.ts          # Zustand stores
│   │   ├── offline-queue.ts  # IndexedDB queue
│   │   └── sync-service.ts   # Background sync
│   ├── hooks/                # Custom React hooks (empty - use stores)
│   └── i18n/                 # i18next config + locales
└── vite.config.ts
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add route/page | `src/App.tsx` | Inline routes/components |
| Landing page | `src/features/landing/LandingPage.tsx` | Public marketing |
| Mobile bottom nav | `src/components/BottomNav.tsx` | Thumb-friendly nav for <768px |
| Auth state | `src/lib/store.ts` | Zustand stores (auth, clock, offline, UI) |
| API client | `src/lib/api.ts` | Singleton with token injection |
| Offline queue | `src/lib/offline-queue.ts` | IndexedDB with retry logic |
| Sync service | `src/lib/sync-service.ts` | Background sync orchestration |
| i18n config | `src/i18n/index.ts` | i18next setup |
| Locales | `src/i18n/locales/` | JSON translations (es, en, fr, de, pl, nl-BE) |
| PWA config | `vite.config.ts` | VitePWA + proxy |
| Test utils | `src/test-utils.tsx` | Custom render with providers |
| Test setup | `src/test-setup.ts` | Global mocks (matchMedia, geolocation, etc.) |

## LIB UTILITIES (apps/web/src/lib)

### api.ts - Centralized API Client
- Singleton with automatic Bearer token injection
- Automatic 401 handling (clears auth, redirects to login)
- Binary response support (PDF, CSV, Excel)
- Methods: `get<T>()`, `post<T>()`, `put<T>()`, `patch<T>()`, `delete<T>()`
- Exported: `authApi.login()`, `authApi.me()`, `authApi.logout()`

### store.ts - State Management (Zustand)
- **AuthStore**: user, tenant, accessToken, isAuthenticated
- **ClockStore**: currentEntry, isClockedIn (tracks active time entry)
- **OfflineStore**: isOnline, pendingCount (monitors connectivity)
- **UIStore**: isSidebarOpen (UI state)
- Auth state persists to localStorage
- Listens to online/offline events

### offline-queue.ts - IndexedDB Queue
- Persistent storage for failed requests
- Max 5 retries per request
- Schema: id, endpoint, method, body, timestamp, retries, lastError
- Methods: `add()`, `getAll()`, `get()`, `remove()`, `incrementRetry()`, `clear()`, `count()`

### sync-service.ts - Background Sync
- Processes offline queue every 30 seconds when online
- Integrates with Service Worker
- Listens to online/offline events
- Prevents concurrent syncs with `isSyncing` flag
- Methods: `start()`, `stop()`, `processQueue()`, `addToQueue()`, `getQueueCount()`, `clearQueue()`

## CONVENTIONS
- Tailwind utility classes only; no inline styles.
- Mobile-first layouts.
- Bottom nav replaces hamburger menu on <768px; huge clock buttons (96px dashboard, 80px clocking).
- Use path alias `@/*`.
- Query cache configured in `src/main.tsx`.
- **Colocated tests**: `.test.tsx` files next to components.
- **Custom render**: Import from `test-utils.tsx` (wraps Router, QueryClient, i18n).
- **Service Worker**: Registration in `main.tsx`, cache strategy in `vite.config.ts`.

## COMPONENT ORGANIZATION
- **Features** (`features/`): Domain-specific pages and forms (ClockingPage, SchedulingPage, etc.).
- **Layout** (`components/layout/`): AppLayout, QuickActions, BottomNav.
- **PWA** (`components/pwa/`): InstallPrompt, OfflineIndicator.
- **UI** (`components/ui/`): Reusable primitives (TouchTarget, MapPicker, QRScanner).
- **Inline pages**: Keep in App.tsx until >50 lines, then extract to `features/`.

## OFFLINE-FIRST FLOW
1. Request fails → added to `offlineQueue` via `syncService.addToQueue()`
2. `syncService.start()` polls queue every 30 seconds
3. When online, `processQueue()` retries failed requests
4. Successful requests removed from queue
5. Failed requests retry up to 5 times, then discarded
6. Service Worker integration for background sync

## AUTHENTICATION FLOW
1. User logs in via `authApi.login(credentials)`
2. JWT token stored in `useAuthStore`
3. `api` client automatically injects token in Authorization header
4. API validates with JwtAuthGuard + RolesGuard
5. TenantMiddleware sets tenant context

## ANTI-PATTERNS
- No `console.log` in components.
- No `any` types.
- No hardcoded UI strings (use i18n keys).
- **Known Issue**: Notifications bell button non-functional (backend not implemented).

## TESTING
- Framework: Vitest + jsdom
- Pattern: Colocated `.test.tsx` files
- Setup: `src/test-setup.ts` (global mocks: matchMedia, IntersectionObserver, geolocation, crypto)
- Utils: `src/test-utils.tsx` (custom render wrapping Router, QueryClient, i18n)
- Coverage: 70% threshold for lines, functions, branches, statements
- E2E: Playwright in `e2e/` directory with fixtures

## NOTES
- Service worker registration lives in `src/main.tsx`.
- Dev proxy maps `/api` → `http://localhost:4000`.
- PWA icons regenerated with Torre Tempo branding (2c40d20).
- **hooks/ directory empty** - use Zustand stores instead of custom hooks.
