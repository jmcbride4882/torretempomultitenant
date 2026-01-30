# Complete Torre Tempo Functionality

## TL;DR

> **Quick Summary**: Implement 7 missing dashboard API endpoints, fix 16 failing tests, complete audit logging, remove type safety violations, add ESLint configs.
>
> **Deliverables**: 7 endpoints + full test coverage (unit + integration + E2E), 74/74 tests passing, zero type errors, complete audit trail, production-ready linting
>
> **Estimated Effort**: Large (~3-5 days with heavy parallelization)
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Type safety → Test fixes → Core endpoints → Integration tests → E2E → Migration

---

## Context

### Original Request
"Make everything functional" - complete all missing features in Torre Tempo for production readiness

### Interview Summary
- **Research**: 3 agents analyzed backend patterns, frontend contracts, NestJS best practices
- **User Decisions**:
  - Test coverage: Unit + Integration tests
  - ESLint: NestJS + Minimal
  - Scope: Include Priority 3 as optional
  - Verification: Automated + Playwright E2E

### Current State
- 75-80% functional
- Core features work (clocking, auth, compliance)
- Dashboards show mock data (7 endpoints missing)
- 58/74 tests passing

### Research Findings
- Backend: Multi-tenant patterns enforced (`where: { tenantId }`), `Promise.all()` for aggregations
- Frontend: TanStack Query with 30s polling, graceful mock data fallback
- Best Practices: Import Prisma enums (no `as any`), mock ALL dependencies in tests

---

## Work Objectives

### Core Objective
Implement all missing backend endpoints, fix tests, complete compliance audit logging, eliminate type violations.

### Deliverables
1. **7 API endpoints** returning real data
2. **74/74 tests passing**
3. **Complete audit logging** for break operations
4. **Zero type violations**
5. **ESLint configs**
6. **Clean logging** (no console.log)
7. **Initial database migration**
8. **Optional**: Notifications, cold storage, bundle optimization

### Definition of Done
- [ ] All dashboards display real data (no mock fallbacks)
- [ ] `npm test` shows 74/74 passing
- [ ] `npm run build` succeeds (no type errors)
- [ ] `npm run lint` succeeds
- [ ] Break operations create audit logs
- [ ] Playwright E2E tests pass

### Must Have
- Multi-tenant isolation (`tenantId` filter) in ALL queries
- Unit + integration tests for ALL endpoints
- Playwright E2E tests for ALL dashboards
- No `any` types or `console.log` in new code

### Must NOT Have
- ❌ Modifications to working features (clocking, auth, compliance engine)
- ❌ Database schema changes
- ❌ New architectural patterns
- ❌ Queries without `tenantId` filter (except Global Admin)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Jest + Playwright)
- **User wants tests**: Unit + Integration + E2E
- **Frameworks**: Jest (API), Playwright (E2E)

### Test Structure
1. **Unit Tests**: Service layer with mocked Prisma
2. **Integration Tests**: Real database with transaction rollback
3. **E2E Tests**: Playwright browser automation

---

## Execution Strategy

### Wave 0: Prerequisites (Sequential, ~10 min)
```
Task 1: Fix type safety (npx prisma generate) → Unblocks all
Task 2: Fix tests (add OvertimeService mock) → Validates test infra
```

### Wave 1: Core Endpoints (Parallel, ~2 hrs)
```
Task 3: GET /time-tracking/team-stats
Task 4: GET /time-tracking/clocked-in
Task 5: GET /locations
Task 6: ESLint configs
```

### Wave 2: Admin & Polish (Parallel, ~2 hrs)
```
Task 7: GET /tenants
Task 8: GET /scheduling/team-schedules
Task 9: GET /admin/health
Task 10: Break audit logging
Task 11: Replace console.logs
Task 12: Wire AppLayout pending approvals
```

### Wave 3: Integration Tests (Parallel, ~1.5 hrs)
```
Task 13: Manager endpoints integration tests
Task 14: Admin endpoints integration tests
Task 15: Global Admin integration tests
```

### Wave 4: E2E Tests (Sequential, ~2 hrs)
```
Task 16: Manager Dashboard E2E
Task 17: Admin Dashboard E2E
Task 18: Global Admin Dashboard E2E
```

### Wave 5: Optional (Parallel, defer if needed)
```
Task 19: Notifications panel
Task 20: Cold storage archival
Task 21: Bundle optimization
```

### Final
```
Task 22: Initial migration + full verification
```

---

## TODOs

### Wave 0: Prerequisites

- [ ] **1. Fix Type Safety** (Quick, 10 min)

  **What**: Run `npx prisma generate`, replace 13 `'GLOBAL_ADMIN' as any` with `UserRole.GLOBAL_ADMIN`

  **Files**: `apps/api/src/admin/admin.controller.ts:11`, `global-admin/global-admin.controller.ts:9`, `tenants/tenants.controller.ts` (4 instances), `prisma/seed.ts` (2 instances)

  **Agent**: `quick`, no skills

  **Parallel**: NO (Wave 0, blocks ALL)

  **References**:
  - `apps/api/src/time-tracking/time-tracking.service.ts:1-10` - Prisma enum import pattern
  - Prisma docs: `https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client`

  **Acceptance**:
  ```bash
  cd apps/api && npx prisma generate
  grep -n "as any" src/admin/*.ts src/global-admin/*.ts src/tenants/*.ts prisma/seed.ts
  # Assert: No matches
  npm run build
  # Assert: Exit code 0
  ```

  **Commit**: `fix(api): regenerate prisma client and remove type casts`

---

- [ ] **2. Fix Failing Tests** (Quick, 5 min)

  **What**: Add `OvertimeService` mock to `TimeTrackingService` test providers

  **Files**: `apps/api/src/time-tracking/time-tracking.service.spec.ts:32-50`

  **Agent**: `quick`, no skills

  **Parallel**: NO (Wave 0, after Task 1)

  **References**:
  - `apps/api/src/time-tracking/time-tracking.service.spec.ts:32-62` - Test module setup pattern
  - `apps/api/src/overtime/overtime.service.ts` - Methods to mock

  **Acceptance**:
  ```bash
  npm test -- time-tracking.service.spec.ts
  # Assert: 74/74 passing
  ```

  **Commit**: `fix(api): add OvertimeService mock to tests`

---

### Wave 1: Core Endpoints

- [ ] **3. GET /time-tracking/team-stats** (Quick, 30 min)

  **What**: Add `getTeamStats(tenantId)` to `TimeTrackingService`, query team metrics with `Promise.all()`, add controller endpoint

  **Expected Response**: `{ totalMembers, clockedInNow, totalHoursThisWeek, expectedHoursThisWeek, pendingApprovals, overtimeHoursThisWeek, budgetedOvertime, complianceScore }`

  **Agent**: `quick`, no skills

  **Parallel**: YES (Wave 1 with 4, 5, 6)

  **References**:
  - `apps/api/src/admin/admin.service.ts:getDashboardStats()` - Parallel query pattern
  - `apps/web/src/features/dashboard/ManagerDashboard.tsx:30-39` - Expected response shape

  **Acceptance**:
  ```bash
  npm run build && npm test -- time-tracking.service.spec.ts
  ```

  **Commit**: `feat(api): add GET /time-tracking/team-stats`

---

- [ ] **4. GET /time-tracking/clocked-in** (Quick, 30 min)

  **What**: Add `getClockedInTeamMembers(tenantId)` to `TimeTrackingService`, query active entries with user/location

  **Expected Response**: `[{ id, firstName, lastName, email, isClockedIn, clockInTime, location: { name }, onBreak }]`

  **Agent**: `quick`, no skills

  **Parallel**: YES (Wave 1 with 3, 5, 6)

  **References**:
  - `apps/api/src/time-tracking/time-tracking.service.ts:200-220` - Query with includes pattern
  - `apps/web/src/features/dashboard/ManagerDashboard.tsx:8-17` - Expected response

  **Acceptance**:
  ```bash
  npm run build && npm test -- time-tracking.service.spec.ts
  ```

  **Commit**: `feat(api): add GET /time-tracking/clocked-in`

---

- [ ] **5. GET /locations** (Quick, 20 min)

  **What**: Add `getLocations(tenantId)` to `LocationsService`, include QR/geofence flags

  **Expected Response**: `[{ id, name, address, isActive, qrEnabled, geofenceEnabled }]`

  **Agent**: `quick`, no skills

  **Parallel**: YES (Wave 1 with 3, 4, 6)

  **References**:
  - `apps/api/src/locations/locations.service.ts` - Existing service
  - `apps/web/src/features/dashboard/AdminDashboard.tsx:19-27` - Expected response

  **Acceptance**:
  ```bash
  npm run build && npm test -- locations.service.spec.ts
  ```

  **Commit**: `feat(api): add GET /locations`

---

- [ ] **6. ESLint Configs** (Quick, 15 min)

  **What**: Create `.eslintrc.js` for API (NestJS) and 
