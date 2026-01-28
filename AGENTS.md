# AGENTS.md - Torre Tempo (Staff Clocking App)

**Generated:** 2025-01-28
**Status:** GREENFIELD - No code exists yet. This documents planned conventions.

## OVERVIEW

Multi-tenant PWA for Spanish labor law compliant time tracking (registro horario). Supports QR + geofence clock-in, offline queue, scheduling, approvals, and signed monthly reports. Target: Hosteleria de Murcia convenio (30000805011981).

## PLANNED STRUCTURE

```
torre-tempo/
├── apps/
│   ├── web/              # React + Vite PWA (frontend)
│   │   ├── src/
│   │   │   ├── features/ # Feature modules (clocking, scheduling, reports, etc.)
│   │   │   ├── components/ # Shared UI components
│   │   │   ├── hooks/    # Custom React hooks
│   │   │   ├── i18n/     # Translations (ES/EN/FR/DE/PL/NL-BE)
│   │   │   └── lib/      # Utilities, API client
│   │   └── public/
│   └── api/              # NestJS backend
│       └── src/
│           ├── auth/     # Email/password auth, RBAC
│           ├── tenants/  # Multi-tenant isolation
│           ├── time-tracking/ # Clock-in/out, offline sync
│           ├── locations/    # QR codes, geofences
│           ├── scheduling/   # Shifts, schedules
│           ├── approvals/    # Edit requests, manager approval
│           ├── audit/        # Immutable audit log
│           └── reports/      # PDF generation, CSV/XLSX export
├── packages/
│   └── shared/           # Shared types, constants
└── infra/
    ├── docker-compose.yml
    └── nginx/
```

## COMMANDS

```bash
# Development (after scaffold)
npm run dev           # Start web + API concurrently
npm run dev:web       # Web only (Vite)
npm run dev:api       # API only (NestJS)

# Testing
npm test              # Run all tests
npm run test:unit     # Vitest unit tests
npm run test:e2e      # Playwright E2E tests
npx vitest run src/features/clocking/clocking.test.ts  # Single test file

# Build
npm run build         # Build all
npm run build:web     # Build PWA
npm run build:api     # Build API

# Database
npx prisma migrate dev    # Run migrations
npx prisma generate       # Generate client
npx prisma studio         # DB GUI

# Linting
npm run lint          # ESLint + Prettier check
npm run lint:fix      # Auto-fix
```

## TECH STACK

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React 18 + Vite + TypeScript | PWA with vite-plugin-pwa |
| Styling | Tailwind CSS | Mobile-first |
| State | TanStack Query + Zustand | Server state + client state |
| i18n | i18next | 6 locales + language packs |
| Backend | NestJS + TypeScript | REST API |
| ORM | Prisma | PostgreSQL |
| Queue | BullMQ + Redis | Background jobs |
| Storage | S3-compatible | PDFs, exports |
| Auth | Passport + JWT | Email/password |

## CODE STYLE

### TypeScript
- Strict mode enabled (`strict: true`)
- No `any` - use `unknown` and narrow
- No `@ts-ignore` or `@ts-expect-error`
- Explicit return types on exported functions
- Prefer `interface` over `type` for object shapes

### Imports (auto-sorted)
```typescript
// 1. Node/external packages
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

// 2. Internal packages
import { TimeEntry } from '@torre-tempo/shared';

// 3. Relative imports
import { ClockingService } from './clocking.service';
```

### Naming
| Item | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `time-entry.service.ts` |
| Classes | PascalCase | `TimeEntryService` |
| Functions | camelCase | `clockIn()` |
| Constants | SCREAMING_SNAKE | `MAX_HOURS_PER_WEEK` |
| DB tables | snake_case | `time_entries` |
| API routes | kebab-case | `/api/time-entries` |

### React Components
```tsx
// Functional components only, named exports
export function ClockInButton({ locationId }: ClockInButtonProps) {
  // hooks first
  const { t } = useTranslation();
  const mutation = useClockIn();
  
  // handlers
  const handleClick = () => { ... };
  
  // render
  return <button onClick={handleClick}>{t('clock_in')}</button>;
}
```

### Error Handling
```typescript
// API: Use NestJS exceptions
throw new BadRequestException('Invalid QR code');
throw new ForbiddenException('Not authorized for this tenant');

// Frontend: Use error boundaries + toast
try {
  await clockIn();
} catch (error) {
  toast.error(getErrorMessage(error));
}
```

## MULTI-TENANT ISOLATION (CRITICAL)

Use PostgreSQL Row-Level Security (RLS) as defense-in-depth:

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Policy: rows visible only to current tenant
CREATE POLICY tenant_isolation ON time_entries
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

Application layer ALSO enforces tenant filtering:
```typescript
// CORRECT - double protection
await prisma.timeEntry.findMany({
  where: { tenantId: ctx.tenantId, userId: ctx.userId }
});

// WRONG - cross-tenant data leak
await prisma.timeEntry.findMany({
  where: { userId: ctx.userId }
});
```

Use `@TenantScoped()` decorator on all controllers. Middleware sets `app.current_tenant` on every request.

## COMPLIANCE REQUIREMENTS (RD-Ley 8/2019)

### Must Capture
- Daily start/end time per worker
- Timezone-aware timestamps (Europe/Madrid default)
- Origin indicator (QR, geofence, manual, offline-sync)

### Must Retain
- 5 years (exceeds legal minimum of 4)
- Immutable audit log for all edits

### Must Provide Access
- Employee: own records, monthly PDF with signature
- Manager: team records, approval queue
- Admin: all records, compliance exports
- Inspector: on-demand export capability

### Convenio Hosteleria de Murcia (30000805011981)
- 40 hours/week max
- 1,822 hours/year max
- Validate against these limits in reporting

## WORKERS' STATUTE (Article 34) LIMITS

| Limit | Value | Action |
|-------|-------|--------|
| Weekly max | 40 hours | Warn at 90%, block at 100% |
| Daily max | 9 hours | Warn at 8 hours |
| Rest between shifts | 12 hours min | Validate on clock-in |
| Weekly rest | 1.5 days | Track in scheduling |
| Break after 6 hrs | 15 min | Prompt user |

## ANTI-PATTERNS (DO NOT)

- `as any` or type assertions to bypass checks
- Silent edits without audit trail
- Queries without `tenantId` filter
- Hardcoded strings (use i18n keys)
- `console.log` in production code (use logger)
- Biometrics or photo proof (not in v1)
- PTO/leave features (not in v1)
- Payroll integration (not in v1)
- SSO (not in v1, email/password only)

## OFFLINE SYNC

PWA must queue clock-ins when offline:
```typescript
// Use IndexedDB via idb-keyval or Dexie
const offlineQueue = await getOfflineQueue();
offlineQueue.push({ type: 'CLOCK_IN', timestamp, locationId });

// On reconnect, sync with conflict resolution
// Server wins for overlapping entries; flag for review
```

## TESTING STRATEGY

Tests added AFTER implementation for critical flows:
- Auth: login, logout, password reset
- Clocking: clock-in, clock-out, offline sync
- Approvals: request edit, approve, reject
- Reports: generate PDF, export CSV

```typescript
// Vitest unit test example
describe('ClockingService', () => {
  it('rejects clock-in outside geofence', async () => {
    const result = await service.clockIn({
      locationId: 'loc-1',
      coordinates: { lat: 0, lng: 0 }, // outside
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('OUTSIDE_GEOFENCE');
  });
});
```

## DEPLOYMENT

- Target: Ubuntu 25.04
- Containerized: Docker Compose (web, api, postgres, redis)
- HTTPS required
- EU-only hosting (GDPR compliance)
- Backup: daily DB dumps, 30-day retention

## NOTES

- Signature capture: HTML5 canvas, store as base64 in PDF metadata
- QR codes: one per location, rotatable by admin
- Geofence: circular boundary (lat, lng, radius in meters)
- Language packs: JSON files, loadable post-deploy
