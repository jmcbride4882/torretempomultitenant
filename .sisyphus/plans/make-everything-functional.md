# Make Everything Functional — Work Plan

## TL;DR

> **Quick Summary**: Fix the remaining 15-20% of Torre Tempo to achieve 100% functionality. Focus on missing dashboard API endpoints (users see mock data), broken tests, type safety violations, and compliance gaps.
>
> **Deliverables**:
> - 7 missing dashboard API endpoints implemented (Manager/Admin/Global Admin dashboards)
> - All 74 tests passing (currently 16 failing)
> - Zero type safety violations (`as any` removed)
> - Complete audit logging for compliance
> - ESLint configs added
>
> **Estimated Effort**: Medium (3-5 days)
> **Parallel Execution**: YES - 3 phases
> **Critical Path**: Type safety fix → Dashboard endpoints → Test fixes

---

## Context

### Current State (From Comprehensive Audit)
**Overall Status**: 75-80% Functional

**What's Working** ✅:
- Authentication & authorization (JWT, role-based access)
- Clock in/out with QR codes, geofencing, breaks
- Offline support (IndexedDB queue, background sync)
- Scheduling (shifts, open shifts, team schedules)
- Approval workflow (edit requests)
- Report generation (PDF/CSV/XLSX with digital signatures)
- Multi-tenant isolation
- 6 languages (i18n)
- PWA features (service worker, offline indicator)

**What's Broken** ❌:
- **CRITICAL**: 7 dashboard endpoints missing → users see mock data
- **HIGH**: 16 tests failing (TimeTrackingService)
- **HIGH**: 13 type safety violations (`'GLOBAL_ADMIN' as any`)
- **MEDIUM**: Audit logs incomplete for break operations
- **MEDIUM**: ESLint configs missing (linting fails)
- **MEDIUM**: Console.log statements in production code
- **LOW**: Missing initial database migration

---

## Work Objectives

### Core Objective
Fix all incomplete/broken features to achieve 100% functionality and production readiness.

### Concrete Deliverables
1. All dashboard endpoints implemented and returning real data
2. All tests passing (74/74)
3. Zero type safety violations
4. Complete audit logging for compliance
5. ESLint configs present and linting passes
6. Console logs replaced with proper logging
7. Initial database migration created

### Definition of Done
- [ ] Manager Dashboard shows real team statistics
- [ ] Admin Dashboard shows real system metrics
- [ ] Global Admin Dashboard shows real tenant data
- [ ] All 74 tests pass
- [ ] `npm run lint` succeeds
- [ ] `npm run build` succeeds
- [ ] No `as any` type casts in production code
- [ ] Break operations have audit logs

---

## Execution Strategy

### Phase 1: Foundation (Fix Build & Type Safety)
**Goal**: Unblock development by fixing type safety and tests

- Task 1: Fix GLOBAL_ADMIN type casting (regenerate Prisma client)
- Task 2: Fix 16 failing tests (add OvertimeService mock)
- Task 3: Create ESLint configs (both apps)

**Can Run in Parallel**: YES (all independent)
**Estimated Time**: 2 hours

---

### Phase 2: Critical Features (Dashboard Endpoints)
**Goal**: Implement missing dashboard API endpoints to replace mock data

- Task 4: Implement `GET /api/time-tracking/team-stats` (Manager Dashboard)
- Task 5: Implement `GET /api/time-tracking/clocked-in` (Manager Dashboard)
- Task 6: Implement `GET /api/admin/stats` (Admin Dashboard)
- Task 7: Implement `GET /api/admin/activity` (Admin Dashboard)
- Task 8: Implement `GET /api/global-admin/stats` (Global Admin Dashboard)
- Task 9: Fix pending approvals count in AppLayout (call existing API)
- Task 10: Implement `GET /api/scheduling/team-schedules` (Manager Dashboard)

**Can Run in Parallel**: YES (tasks 4-8, 10 are independent)
**Must Run Sequential**: Task 9 (depends on Task 4 pattern)
**Estimated Time**: 1 day

---

### Phase 3: Compliance & Polish
**Goal**: Complete audit logging, clean up code quality issues

- Task 11: Add audit logs for break operations (compliance requirement)
- Task 12: Replace console.log with proper logging
- Task 13: Create initial database migration
- Task 14: Add tests for new dashboard endpoints

**Can Run in Parallel**: YES (tasks 11-13 independent)
**Must Run Sequential**: Task 14 (after endpoints implemented)
**Estimated Time**: 4 hours

---

## TODOs

### **PHASE 1: Foundation (Parallel)**

- [x] **1. Fix GLOBAL_ADMIN type casting**

  **Problem**: 13 instances of `'GLOBAL_ADMIN' as any` across codebase
  
  **Root Cause**: Prisma client not regenerated after schema changes
  
  **Files Affected**:
  - `apps/api/src/admin/admin.controller.ts:11`
  - `apps/api/src/global-admin/global-admin.controller.ts:9`
  - `apps/api/src/tenants/tenants.controller.ts:69, 86, 97, 118`
  - `apps/api/prisma/seed.ts:31-32`
  
  **What to do**:
  1. Run `cd apps/api && npx prisma generate`
  2. Remove all `as any` type casts
  3. Verify TypeScript compiles: `npx tsc --noEmit`
  
  **Must NOT do**:
  - Don't modify Prisma schema (it's correct)
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple fix - regenerate types and remove casts
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 1 (with Tasks 2, 3)
  - **Blocks**: None (but should be done first for clean slate)
  - **Blocked By**: None
  
  **Acceptance Criteria**:
  - [ ] `npx prisma generate` succeeds
  - [ ] All `'GLOBAL_ADMIN' as any` removed
  - [ ] `npx tsc --noEmit` passes in apps/api
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npx prisma generate
  npx tsc --noEmit
  ```

---

- [x] **2. Fix 16 failing tests (TimeTrackingService)**

  **Problem**: `TimeTrackingService` tests fail because OvertimeService mock is missing
  
  **Error**: `Nest can't resolve dependencies of the TimeTrackingService (..., ?, ...)`
  
  **File**: `apps/api/src/time-tracking/time-tracking.service.spec.ts`
  
  **What to do**:
  1. Read the test file (lines 32-50)
  2. Add `OvertimeService` to the providers array
  3. Import mock from `../test-utils/prisma-mock`
  4. Run tests: `npm test time-tracking.service.spec.ts`
  
  **Must NOT do**:
  - Don't skip tests or mark them as `.skip()`
  - Don't modify the service implementation
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Add one mock to test providers
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 1
  - **Blocks**: None
  - **Blocked By**: None
  
  **Acceptance Criteria**:
  - [ ] All 74 tests pass
  - [ ] No test failures in `npm test`
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npm test time-tracking.service.spec.ts
  npm test
  ```

---

- [x] **3. Create ESLint configs**

  **Problem**: Linting fails because configs missing
  
  **Missing Files**:
  - `apps/api/.eslintrc.js`
  - `apps/web/.eslintrc.js`
  
  **What to do**:
  1. Create ESLint config for NestJS/TypeScript (API)
  2. Create ESLint config for React/TypeScript (Web)
  3. Run `npm run lint` to verify
  
  **Must NOT do**:
  - Don't use auto-fix on existing code (too many changes)
  - Don't fail on warnings (only errors)
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Create 2 config files
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 1
  - **Blocks**: None
  - **Blocked By**: None
  
  **Acceptance Criteria**:
  - [ ] Both ESLint config files created
  - [ ] `npm run lint` runs without crashing
  
  **Verification Commands**:
  ```bash
  npm run lint
  ```

---

### **PHASE 2: Dashboard Endpoints (Parallel)**

- [ ] **4. Implement `GET /api/time-tracking/team-stats`**

  **Problem**: Manager Dashboard shows mock data
  
  **Frontend**: `apps/web/src/features/dashboard/ManagerDashboard.tsx:115-126`
  
  **Expected Response**:
  ```typescript
  {
    totalEmployees: number;
    clockedIn: number;
    totalHoursToday: number;
    totalHoursWeek: number;
    overtimeHours: number;
  }
  ```
  
  **What to do**:
  1. Add method to `TimeTrackingService`
  2. Add endpoint to `TimeTrackingController`
  3. Query:
     - Count users in current tenant with EMPLOYEE/MANAGER role
     - Count active time entries (clockOut === null)
     - Sum worked minutes for today (tenant timezone)
     - Sum worked minutes for current week
     - Sum approved overtime for current week
  4. Apply `@Roles(Role.MANAGER, Role.ADMIN)` guard
  5. Test manually with curl
  
  **Must NOT do**:
  - Don't return mock data
  - Don't skip timezone handling
  
  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Business logic for statistics
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 2 (with Tasks 5-8, 10)
  - **Blocks**: None
  - **Blocked By**: Task 1 (type safety fix)
  
  **References**:
  - Existing: `apps/api/src/time-tracking/time-tracking.service.ts`
  - Existing: `apps/api/src/time-tracking/time-tracking.controller.ts`
  
  **Acceptance Criteria**:
  - [ ] Endpoint returns real data
  - [ ] Tenant isolation enforced
  - [ ] Timezone-aware calculations
  - [ ] Role guard applied (MANAGER/ADMIN only)
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npm run build
  npm test
  # Manual: curl with manager token
  ```

---

- [ ] **5. Implement `GET /api/time-tracking/clocked-in`**

  **Problem**: Manager Dashboard can't see who's currently clocked in
  
  **Frontend**: `apps/web/src/features/dashboard/ManagerDashboard.tsx:142`
  
  **Expected Response**:
  ```typescript
  Array<{
    userId: string;
    userName: string;
    location: string | null;
    clockInTime: string;
    duration: number; // minutes
  }>
  ```
  
  **What to do**:
  1. Add method to `TimeTrackingService`
  2. Add endpoint to `TimeTrackingController`
  3. Query time entries where `clockOut === null` for tenant
  4. Include user name, location name, calculate duration
  5. Apply `@Roles(Role.MANAGER, Role.ADMIN)` guard
  
  **Must NOT do**:
  - Don't expose time entries from other tenants
  
  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 2
  - **Blocks**: None
  - **Blocked By**: Task 1
  
  **References**:
  - Existing: `apps/api/src/time-tracking/time-tracking.service.ts`
  
  **Acceptance Criteria**:
  - [ ] Returns list of clocked-in employees
  - [ ] Duration calculated correctly
  - [ ] Tenant isolation enforced
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npm run build
  npm test
  ```

---

- [ ] **6. Implement `GET /api/admin/stats`**

  **Problem**: Admin Dashboard shows mock statistics
  
  **Frontend**: `apps/web/src/features/dashboard/AdminDashboard.tsx:251`
  
  **Expected Response**:
  ```typescript
  {
    totalUsers: number;
    activeUsers: number;
    totalLocations: number;
    totalEntriesThisMonth: number;
    complianceScore: number; // 0-100
  }
  ```
  
  **What to do**:
  1. Update `AdminService.getDashboardStats()`
  2. Query:
     - Count users in tenant
     - Count users where isActive = true
     - Count locations in tenant
     - Count time entries for current month
     - Calculate compliance score (% of entries with no violations)
  3. Apply `@Roles(Role.ADMIN)` guard
  
  **Must NOT do**:
  - Don't hardcode values
  
  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 2
  - **Blocks**: None
  - **Blocked By**: Task 1
  
  **References**:
  - Existing: `apps/api/src/admin/admin.service.ts`
  - Existing: `apps/api/src/admin/admin.controller.ts`
  
  **Acceptance Criteria**:
  - [ ] Returns real tenant statistics
  - [ ] Compliance score calculated accurately
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npm run build
  npm test
  ```

---

- [ ] **7. Implement `GET /api/admin/activity`**

  **Problem**: Admin Dashboard has no activity feed
  
  **Frontend**: `apps/web/src/features/dashboard/AdminDashboard.tsx:271`
  
  **Expected Response**:
  ```typescript
  Array<{
    timestamp: string;
    user: string;
    action: string;
    details: string;
  }>
  ```
  
  **What to do**:
  1. Add method to `AdminService`
  2. Query recent audit logs (last 50 entries)
  3. Format for display: user name, action type, details
  4. Apply `@Roles(Role.ADMIN)` guard
  
  **Must NOT do**:
  - Don't expose sensitive audit data
  
  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 2
  - **Blocks**: None
  - **Blocked By**: Task 1
  
  **References**:
  - Existing: `apps/api/src/audit/audit.service.ts`
  
  **Acceptance Criteria**:
  - [ ] Returns recent activity feed
  - [ ] Tenant isolation enforced
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npm run build
  npm test
  ```

---

- [ ] **8. Implement `GET /api/global-admin/stats`**

  **Problem**: Global Admin Dashboard shows mock data
  
  **Frontend**: `apps/web/src/features/dashboard/GlobalAdminDashboard.tsx:63`
  
  **Expected Response**:
  ```typescript
  {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    totalEntriesThisMonth: number;
  }
  ```
  
  **What to do**:
  1. Update `GlobalAdminService.getStats()` (or create if missing)
  2. Query:
     - Count all tenants
     - Count tenants with recent activity (last 30 days)
     - Count all users across all tenants
     - Count all time entries for current month
  3. Apply `@Roles('GLOBAL_ADMIN')` guard
  
  **Must NOT do**:
  - Don't filter by tenantId (global admin sees all)
  
  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 2
  - **Blocks**: None
  - **Blocked By**: Task 1
  
  **References**:
  - Existing: `apps/api/src/global-admin/` (may need service creation)
  
  **Acceptance Criteria**:
  - [ ] Returns system-wide statistics
  - [ ] No tenant filtering applied
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npm run build
  npm test
  ```

---

- [ ] **9. Fix pending approvals count in AppLayout**

  **Problem**: Hardcoded pending count (always shows 3)
  
  **File**: `apps/web/src/components/layout/AppLayout.tsx:33`
  
  **What to do**:
  1. Use TanStack Query to fetch `GET /api/approvals/edit-requests?status=PENDING`
  2. Extract count from response
  3. Update badge to show real count
  4. Poll every 30s for updates
  
  **Must NOT do**:
  - Don't remove the endpoint (it already exists!)
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple API call hookup
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 4 (use pattern from team-stats)
  
  **References**:
  - Frontend: `apps/web/src/components/layout/AppLayout.tsx`
  
  **Acceptance Criteria**:
  - [ ] Badge shows real pending count
  - [ ] Updates every 30s
  
  **Verification Commands**:
  ```bash
  cd apps/web
  npm run build
  npm test
  ```

---

- [ ] **10. Implement `GET /api/scheduling/team-schedules`**

  **Problem**: Manager Dashboard can't preview upcoming schedules
  
  **Frontend**: `apps/web/src/features/dashboard/ManagerDashboard.tsx:159`
  
  **Expected Response**:
  ```typescript
  Array<{
    date: string;
    user: string;
    shift: string;
    location: string;
  }>
  ```
  
  **What to do**:
  1. Add method to `SchedulingService`
  2. Add endpoint to `SchedulingController`
  3. Query next 7 days of published schedules for tenant
  4. Include user name, shift name, location
  5. Apply `@Roles(Role.MANAGER, Role.ADMIN)` guard
  
  **Must NOT do**:
  - Don't return unpublished schedules to managers
  
  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 2
  - **Blocks**: None
  - **Blocked By**: Task 1
  
  **References**:
  - Existing: `apps/api/src/scheduling/scheduling.service.ts`
  
  **Acceptance Criteria**:
  - [ ] Returns next 7 days of schedules
  - [ ] Only published schedules shown
  - [ ] Tenant isolation enforced
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npm run build
  npm test
  ```

---

### **PHASE 3: Compliance & Polish (Parallel)**

- [ ] **11. Add audit logs for break operations**

  **Problem**: Break start/end missing audit logs (compliance risk)
  
  **Files**:
  - `apps/api/src/time-tracking/time-tracking.service.ts:452` (break start)
  - `apps/api/src/time-tracking/time-tracking.service.ts:496` (break end)
  
  **What to do**:
  1. Add `this.auditService.log()` calls after break operations
  2. Include:
     - Entity: 'BreakEntry'
     - Action: 'CREATE' or 'UPDATE'
     - Actor: current user
     - Changes: break start/end timestamps
  3. Follow existing audit log patterns in the same file
  
  **Must NOT do**:
  - Don't skip audit logs (Spanish labor law requirement)
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Add 2 audit log calls
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 3 (with Tasks 12, 13)
  - **Blocks**: None
  - **Blocked By**: None
  
  **References**:
  - Existing: `apps/api/src/audit/audit.service.ts`
  
  **Acceptance Criteria**:
  - [ ] Break start logs to audit trail
  - [ ] Break end logs to audit trail
  - [ ] Audit log includes before/after timestamps
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npm run build
  npm test
  ```

---

- [ ] **12. Replace console.log with proper logging**

  **Problem**: 4 console.log instances in production code (anti-pattern)
  
  **Files**:
  - `apps/web/src/main.tsx:32` (service worker error)
  - `apps/web/src/components/QRScanner.tsx:21` (QR scan error)
  - `apps/web/src/features/clocking/ClockingPage.tsx:353, 363` (fetch errors)
  
  **What to do**:
  1. Frontend: Replace with structured logging or remove (errors already handled)
  2. Backend: Use NestJS Logger instead of console.log
  
  **Must NOT do**:
  - Don't remove error handling, just the console.log
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Replace 4 console.log statements
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 3
  - **Blocks**: None
  - **Blocked By**: None
  
  **Acceptance Criteria**:
  - [ ] No console.log in production code
  - [ ] Error handling still works
  
  **Verification Commands**:
  ```bash
  grep -r "console.log" apps/web/src --exclude="*.test.*"
  npm run build
  ```

---

- [ ] **13. Create initial database migration**

  **Problem**: No baseline migration exists (only 4 incremental)
  
  **What to do**:
  1. Check if database already exists with schema
  2. If yes: Run `npx prisma migrate resolve --applied <migration_name>` for existing migrations
  3. If no: Run `npx prisma migrate dev --name init`
  4. Document migration strategy in `apps/api/README.md`
  
  **Must NOT do**:
  - Don't modify existing schema
  - Don't break existing databases
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Run Prisma command, document
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Phase 3
  - **Blocks**: None
  - **Blocked By**: None
  
  **Acceptance Criteria**:
  - [ ] Migration baseline established
  - [ ] Documented in README
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npx prisma migrate status
  ```

---

- [ ] **14. Add tests for new dashboard endpoints**

  **Problem**: New endpoints have no tests
  
  **What to do**:
  1. Create test files for new endpoints:
     - `time-tracking.controller.spec.ts` (team-stats, clocked-in)
     - `admin.controller.spec.ts` (stats, activity)
     - `global-admin.controller.spec.ts` (stats)
     - `scheduling.controller.spec.ts` (team-schedules)
  2. Follow existing test patterns
  3. Mock PrismaService responses
  4. Verify role guards work
  
  **Must NOT do**:
  - Don't skip tests for critical endpoints
  
  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Write comprehensive tests
  - **Skills**: (none required)
  
  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Tasks 4-8, 10 (endpoints must exist first)
  
  **References**:
  - Existing: `apps/api/src/auth/auth.service.spec.ts`
  
  **Acceptance Criteria**:
  - [ ] All new endpoints have tests
  - [ ] Tests verify role guards
  - [ ] Tests verify tenant isolation
  
  **Verification Commands**:
  ```bash
  cd apps/api
  npm test
  ```

---

## Dependency Matrix

| Task | Phase | Depends On | Blocks | Parallel With |
|------|-------|------------|--------|---------------|
| 1    | 1     | None       | 4-8,10 | 2,3           |
| 2    | 1     | None       | None   | 1,3           |
| 3    | 1     | None       | None   | 1,2           |
| 4    | 2     | 1          | 9,14   | 5,6,7,8,10    |
| 5    | 2     | 1          | 14     | 4,6,7,8,10    |
| 6    | 2     | 1          | 14     | 4,5,7,8,10    |
| 7    | 2     | 1          | 14     | 4,5,6,8,10    |
| 8    | 2     | 1          | 14     | 4,5,6,7,10    |
| 9    | 2     | 4          | None   | None          |
| 10   | 2     | 1          | 14     | 4,5,6,7,8     |
| 11   | 3     | None       | None   | 12,13         |
| 12   | 3     | None       | None   | 11,13         |
| 13   | 3     | None       | None   | 11,12         |
| 14   | 3     | 4-8,10     | None   | None          |

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 1-3        | `fix: resolve type safety violations and test failures` | `npm test && npm run build` |
| 4-10       | `feat(dashboard): implement missing dashboard endpoints` | `npm test && npm run build` |
| 11-13      | `fix(compliance): complete audit logging and clean up code` | `npm test && npm run lint` |
| 14         | `test: add tests for dashboard endpoints` | `npm test` |

---

## Success Criteria

### Must Have (v1 Production Ready)
- [ ] All dashboard endpoints return real data (no mock)
- [ ] All 74 tests passing
- [ ] Zero `as any` type casts
- [ ] Audit logs complete for break operations
- [ ] ESLint configs present and linting succeeds
- [ ] Build succeeds: `npm run build`

### Should Have
- [ ] Console logs replaced with proper logging
- [ ] Initial database migration created
- [ ] Documentation updated

### Nice to Have (Post-v1)
- [ ] Notifications panel implemented
- [ ] Cold storage archival implemented
- [ ] Bundle size optimized

### Verification Commands
```bash
# Phase 1
cd apps/api && npx prisma generate
npm test
npm run lint

# Phase 2
npm run build
cd apps/api && npm test

# Phase 3
npm run build
npm test
npm run lint
```

### Final Checklist
- [ ] Manager Dashboard shows real team stats
- [ ] Admin Dashboard shows real system metrics
- [ ] Global Admin Dashboard shows real tenant data
- [ ] All tests pass (74/74)
- [ ] No type safety violations
- [ ] Audit logs complete
- [ ] ESLint succeeds
- [ ] Production build succeeds
