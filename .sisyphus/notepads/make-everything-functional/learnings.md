# Make Everything Functional - Learnings

## ESLint Configuration (2026-01-30)

### Files Created
- `apps/api/.eslintrc.js` - NestJS/TypeScript config
- `apps/web/.eslintrc.cjs` - React/TypeScript config (uses .cjs due to ES module)

### Key Learnings
1. **Web app requires .cjs extension**: The web app has `"type": "module"` in package.json, so ESLint config must use `.cjs` extension instead of `.js`
2. **API uses CommonJS**: API app uses CommonJS, so `.eslintrc.js` works fine
3. **Both configs execute successfully**: `npm run lint` runs without crashing on both apps
4. **Existing code has violations**: Both apps have existing linting errors (any types, unsafe member access, unused vars) - these are pre-existing issues, not config problems

### Configuration Details
- **API**: Extends `@typescript-eslint/recommended` + `recommended-requiring-type-checking`, strict rules for no-console and no-unused-vars
- **Web**: Extends `eslint:recommended` + `@typescript-eslint/recommended` + `react-hooks/recommended`, includes react-hooks rules
- Both use `root: true` to prevent config cascade
- Both allow `warn` and `error` console methods
- Both use `^_` pattern to allow unused vars prefixed with underscore

### Verification
- API: `npm run lint` executes, reports 770 problems (pre-existing code issues)
- Web: `npm run lint` executes, reports 23 problems (pre-existing code issues)
- Both configs are valid and functional

## Prisma GLOBAL_ADMIN Type Casting Fix (2026-01-30)

### Problem
- 7 instances of `'GLOBAL_ADMIN' as any` type casts across the codebase
- Prisma schema defined `GLOBAL_ADMIN` in Role enum, but TypeScript wasn't recognizing it
- Root cause: Prisma client needed regeneration after schema changes

### Solution Applied
1. **Regenerated Prisma client**: `npx prisma generate` in apps/api
2. **Removed all unsafe casts**:
   - `apps/api/src/admin/admin.controller.ts:11` - Changed to `Role.GLOBAL_ADMIN`
   - `apps/api/src/global-admin/global-admin.controller.ts:9` - Added Role import, changed to `Role.GLOBAL_ADMIN`
   - `apps/api/src/tenants/tenants.controller.ts:69, 86, 97, 118` - All 4 instances changed to `Role.GLOBAL_ADMIN`
   - `apps/api/prisma/seed.ts:31` - Added Role import, changed to `Role.GLOBAL_ADMIN`, removed `as any` wrapper

### Key Learnings
1. **Prisma regeneration is essential**: After schema changes, always run `npx prisma generate` to update the client
2. **Type safety improves with proper imports**: Importing `Role` enum from `@prisma/client` provides full type safety
3. **Seed file cleanup**: Removed unnecessary `@typescript-eslint/no-explicit-any` comment and `as any` wrapper on entire data object
4. **Verification**: `npx tsc --noEmit` passes with zero errors after fixes

### Files Modified
- `apps/api/src/admin/admin.controller.ts`
- `apps/api/src/global-admin/global-admin.controller.ts`
- `apps/api/src/tenants/tenants.controller.ts`
- `apps/api/prisma/seed.ts`

### Verification Results
- ✅ Prisma client regenerated successfully
- ✅ All 7 `'GLOBAL_ADMIN' as any` casts removed
- ✅ TypeScript compilation passes with zero errors
- ✅ No remaining unsafe casts in source files (only in generated coverage HTML)

## Team Stats Endpoint Implementation (2026-01-30)

### Files Modified
- `apps/api/src/time-tracking/dto/team-stats.dto.ts` - Created new DTO
- `apps/api/src/time-tracking/dto/index.ts` - Added export for TeamStatsDto
- `apps/api/src/time-tracking/time-tracking.service.ts` - Added getTeamStats method with timezone-aware calculations
- `apps/api/src/time-tracking/time-tracking.controller.ts` - Added GET /team-stats endpoint with MANAGER/ADMIN guard

### Implementation Pattern
1. **DTO Creation**: Simple class with typed properties for response shape
2. **Service Method**: 
   - Get tenant with timezone for date calculations
   - Use Intl.DateTimeFormat for timezone-aware date parsing
   - Execute parallel queries with Promise.all for performance
   - Calculate date ranges: today (00:00 - 23:59), this week (Mon-Sun)
   - Count employees: role IN [EMPLOYEE, MANAGER] AND isActive = true
   - Count clocked in: clockOut IS NULL AND status = ACTIVE
   - Calculate hours: Sum worked minutes minus break minutes, handle partial overlaps
   - Sum overtime: approved overtime entries (approvedAt IS NOT NULL)
3. **Controller Endpoint**:
   - Use `@UseGuards(RolesGuard)` at method level
   - Use `@Roles(Role.MANAGER, Role.ADMIN)` decorator for authorization
   - Extract tenantId from `@CurrentUser()` decorator
   - Return typed DTO with Promise<TeamStatsDto>

### Key Learnings
1. **Timezone Handling**: Replicate ComplianceService patterns for consistent date calculations
   - Use Intl.DateTimeFormat with tenant timezone
   - Calculate start/end of day and week in tenant timezone
   - Convert zoned time to UTC for database queries
2. **Tenant Isolation**: All queries filter by tenantId
3. **Performance**: Use Promise.all to execute independent queries in parallel
4. **Hours Calculation**: 
   - Handle active entries (clockOut = null) by using current time as end
   - Calculate overlap between entry and date range
   - Proportionally allocate break minutes to overlapping time
5. **Role Guards**: Apply at method level with `@UseGuards(RolesGuard)` + `@Roles(...)`

### Verification
- ✅ Build passes: `npm run build` completes successfully
- ✅ No TypeScript errors in modified files
- ✅ Endpoint returns real data (not mock)
- ✅ Tenant isolation enforced
- ✅ Role-based access control applied (MANAGER/ADMIN only)

## Admin Dashboard Stats Endpoint Implementation (2026-01-30)

### Files Modified
- `apps/api/src/admin/admin.service.ts` - Updated getDashboardStats with real Prisma queries
- `apps/api/src/admin/admin.controller.ts` - Applied @Roles(Role.ADMIN) guard at method level

### Implementation Pattern
1. **Response Shape Alignment**:
   - Frontend expects: `totalUsers, activeUsers, totalLocations, totalEntriesThisMonth, complianceScore`
   - Removed old fields: `pendingReports, systemHealth`
   - Added new queries: activeUsers count, compliance score calculation

2. **Service Method**:
   - Calculate month date range using timezone-aware Date objects
   - Use `Promise.all` to execute 4 queries in parallel for performance:
     * Total users count (all users in tenant)
     * Active users count (isActive = true)
     * Total locations count (all locations, not just active)
     * All time entries with validationWarning field for compliance
   - Calculate compliance score: % of entries without validation warnings

3. **Compliance Score Calculation**:
   - Fetch all time entries for current month with `validationWarning` field
   - Count entries where `validationWarning` is null or empty string
   - Formula: `Math.round((compliantEntries / totalEntries) * 100)`
   - Return 100 if no entries (perfect score when no data)

4. **Role Guard Application**:
   - Removed class-level `@Roles(...)` decorator (was allowing all roles)
   - Applied `@Roles(Role.ADMIN)` directly on `getStats()` method
   - Ensures only ADMIN users can access dashboard statistics

### Key Learnings
1. **Prisma Schema Field Name**: TimeEntry uses `validationWarning` (singular, string), NOT `complianceWarnings` (plural, array)
2. **Date Range Calculation**: Use `new Date(year, month + 1, 0, 23, 59, 59, 999)` for end of month
3. **Compliance Score Logic**: Empty/null validationWarning = compliant entry
4. **Method-Level Guards**: Apply `@Roles()` at method level when different endpoints need different role restrictions
5. **Tenant Isolation**: All queries filter by tenantId (including timeEntry.findMany)
6. **Response Shape**: Match exact frontend expectations to avoid integration issues

### Verification
- ✅ Build passes: `npm run build --workspace=apps/api` completes successfully
- ✅ No TypeScript compilation errors
- ✅ Service returns real database statistics (not hardcoded values)
- ✅ Compliance score calculated from actual time entry data
- ✅ Endpoint restricted to ADMIN role only
- ✅ All queries enforce tenant isolation

## Clocked-In Employees Endpoint Implementation (2026-01-30)

### Files Modified
- `apps/api/src/time-tracking/dto/clocked-in-employee.dto.ts` - Created new DTO for response shape
- `apps/api/src/time-tracking/dto/index.ts` - Added export for ClockedInEmployeeDto
- `apps/api/src/time-tracking/time-tracking.service.ts` - Added getClockedInEmployees method
- `apps/api/src/time-tracking/time-tracking.controller.ts` - Added GET /clocked-in endpoint with MANAGER/ADMIN guard

### Implementation Pattern
1. **DTO Creation**: 
   - Simple class with 5 fields: userId, userName, location, clockInTime (ISO 8601), duration (minutes)
   - Matches frontend expected response shape exactly

2. **Service Method**:
   - Query time entries where `clockOut === null` AND `status === ACTIVE`
   - Include user relation: select id, firstName, lastName
   - Include location relation: select name
   - Order by clockIn DESC (most recent first)
   - Calculate duration: `Math.round((now - clockIn) / 60000)` for minutes
   - Format userName: `${firstName} ${lastName}`
   - Return location name as string | null (handle missing location)

3. **Controller Endpoint**:
   - Route: `GET /api/time-tracking/clocked-in`
   - Apply `@UseGuards(RolesGuard)` at method level
   - Apply `@Roles(Role.MANAGER, Role.ADMIN)` decorator for authorization
   - Extract tenantId from `@CurrentUser()` decorator
   - Return typed Promise<ClockedInEmployeeDto[]>

### Key Learnings
1. **Active Entry Detection**: Use `clockOut === null` AND `status === ACTIVE` to find currently clocked-in users
2. **Duration Calculation**: Calculate in milliseconds first, then convert to minutes with Math.round
3. **Prisma Relations**: Use `include` with `select` to fetch specific fields from related models
4. **Response Formatting**: Map database results to DTO shape with proper field transformations
5. **Tenant Isolation**: Always filter by tenantId in where clause
6. **Null Safety**: Use optional chaining (`?.`) and nullish coalescing (`??`) for location field
7. **Role Guards**: Apply at method level for manager/admin-only endpoints

### Verification
- ✅ Build passes: `npm run build` completes successfully
- ✅ No TypeScript compilation errors
- ✅ DTO matches frontend expected response shape
- ✅ Service method queries active entries only
- ✅ Duration calculated correctly in minutes
- ✅ Endpoint restricted to MANAGER/ADMIN roles
- ✅ Tenant isolation enforced

### Acceptance Criteria Met
- ✅ Returns list of currently clocked-in employees
- ✅ Duration calculated correctly (minutes since clock-in)
- ✅ Tenant isolation enforced (all queries filter by tenantId)
- ✅ Role guard applied (MANAGER/ADMIN only)
- ✅ Response shape matches frontend expectations


## GET /api/admin/activity Endpoint Implementation (2026-01-30)

### What Was Done
- Modified `apps/api/src/admin/admin.service.ts` to query audit logs instead of time entries
- Updated `getRecentActivity` method to:
  - Query `AuditLog` table with tenant isolation
  - Return last 50 entries by default (configurable via limit param)
  - Map action strings to human-readable descriptions
  - Format response as: `{ timestamp, user, action, details }`
- Added `@Roles(Role.ADMIN)` guard to GET /activity endpoint in `admin.controller.ts`

### Key Patterns
- **Action Mapping**: Created `actionMap` object to convert audit log actions (e.g., "TIME_ENTRY_CREATED") to user-friendly strings (e.g., "Clocked in")
- **Tenant Isolation**: Always filter by `tenantId` in Prisma queries
- **Default Values**: User shows as "System" when `actorEmail` is null
- **Details Format**: Combines action + entity + entityId substring for context

### Response Format
```typescript
Array<{
  timestamp: string;  // ISO 8601
  user: string;       // actorEmail or "System"
  action: string;     // Human-readable from actionMap
  details: string;    // Action + entity info
}>
```

### Verification
- Build passed successfully
- TypeScript clean (no errors or warnings)
- Endpoint properly guarded with @Roles(Role.ADMIN)
