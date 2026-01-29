# Torre Tempo Completion - Accumulated Wisdom

## Session Started: 2026-01-29

### Previous Accomplishments (Context)
- ✅ Spanish compliance validation (6 rules enforced)
- ✅ Deputy-style drag-and-drop rota (staff vertical, time horizontal)
- ✅ Both features deployed to production at https://time.lsltgroup.es

### Key Technical Patterns

#### Compliance Service Integration
- ComplianceService validates before clock-in
- Returns `ComplianceCheckResult` with violations array
- Blocking violations throw BadRequestException
- Warning violations logged but allow operation

#### Drag-and-Drop Architecture
- @dnd-kit/core for drag-and-drop primitives
- WeeklyRotaGrid: Main component with DndContext
- DraggableShiftCard: Individual shift cards
- DroppableTimeSlot: Staff/day cells
- PointerSensor for unified mouse/touch handling

#### Database Schema Notes
- Schedule model has `assignedUserId` (nullable for open shifts)
- TimeEntry model is immutable (append-only)
- Multi-tenant isolation via tenantId filter

### Conventions from Previous Work
- Mobile-first: Bottom nav <768px, huge touch targets
- i18n keys for all UI strings (no hardcoded text)
- TypeScript strict mode (no any, no ts-ignore)
- Tailwind for styling (no inline styles)
- TanStack Query for API state management

### Known Gotchas
- LSP cache issues with new files (restart editor)
- Nginx health check shows unhealthy but routes work
- Bundle size is 955KB (could optimize)
- date-fns required for timezone-aware calculations

---

## Task Execution Log

### 2026-01-29 - Compliance Badges on Shift Cards

#### What Was Done
- Created `compliance.controller.ts` with GET /compliance/check and /compliance/check-batch endpoints
- Added compliance badge display to `ShiftCard.tsx` (red=blocking, amber=warning, green=compliant, grey=loading/unchecked)
- Updated `DraggableShiftCard.tsx` to pass compliance data through props
- Modified `WeeklyRotaGrid.tsx` to fetch compliance data via TanStack Query with 5-min staleTime
- Added i18n keys for compliance tooltip text in en.json and es.json

#### Key Patterns Used
- Batch API endpoint `/compliance/check-batch?userIds=id1,id2,id3` for efficient fetching
- `ComplianceCheckResult` type exported from ShiftCard for reuse
- Badge uses absolute positioning (`absolute -top-1 -right-1`) in relative container
- Type narrowing with `!== null` for nullable userId in Schedule interface
- Tailwind `animate-pulse` for loading state indicator

#### Badge Color Mapping
```typescript
const getBadgeColor = (status: ComplianceStatus): string => {
  switch (status) {
    case 'blocking': return 'bg-red-500 text-white';
    case 'warning': return 'bg-amber-500 text-white';
    case 'compliant': return 'bg-green-500 text-white';
    case 'loading': return 'bg-slate-300 text-slate-600 animate-pulse';
    case 'unchecked': return 'bg-slate-300 text-slate-600';
  }
};
```

#### Badge Icons
- Blocking: 🚫
- Warning: ⚠️
- Compliant: ✓
- Loading: …
- Unchecked: ?

#### Technical Notes
- Schedule.userId can be `string | null` (null for open shifts)
- Need `!== null` type guard (not just truthy check) for TypeScript to narrow properly
- Compliance controller uses JwtAuthGuard and CurrentUser decorator pattern
- TanStack Query refetchOnWindowFocus disabled to prevent unnecessary API calls

### 2026-01-29 - Open Shifts (Self-Accept) Feature

#### What Was Done
- Made `userId` nullable in Schedule Prisma schema to support open shifts
- Added `getOpenShifts()` method to scheduling.service.ts (filters where `userId: { equals: null }`)
- Added `acceptShift()` method to scheduling.service.ts (assigns userId to open shift)
- Added GET /scheduling/open-shifts endpoint (available to all authenticated users)
- Added POST /scheduling/schedules/:id/accept endpoint (EMPLOYEE role only)
- Added open shifts section to WeeklyRotaGrid.tsx (above staff grid)
- Updated ShiftCard.tsx with optional accept button support
- Added i18n keys for en.json and es.json

#### Key Patterns Used
- Prisma null filtering: `userId: { equals: null }` (not `userId: null`)
- Schema change: `userId String? @db.Uuid` and `user User?` for optional relations
- Removed unique constraint `@@unique([userId, date])` since open shifts have null userId
- Role-based endpoint: `@Roles(Role.EMPLOYEE)` for accept action
- UI props pattern: `isOpenShift`, `showAcceptButton`, `onAccept` for ShiftCard flexibility

#### API Endpoints Added
```typescript
GET /api/scheduling/open-shifts
- Query params: startDate, endDate (optional)
- Returns: Schedule[] where userId IS NULL and isPublished=true

POST /api/scheduling/schedules/:id/accept
- Requires EMPLOYEE role
- Assigns current user to the open shift
- Validates: shift exists, is unassigned, is published, user has no other shift that date
```

#### Frontend Changes
- WeeklyRotaGrid accepts `openShifts`, `currentUserRole`, `onAcceptShift` props
- Open shifts section uses emerald color theme to differentiate from assigned shifts
- Accept button: min-height 48px for touch-friendly tap targets
- ShiftCard can render in three modes: published (blue), draft (amber), open (emerald)

#### Prisma Schema Update
```prisma
model Schedule {
  userId String? @db.Uuid  // Now nullable
  user   User?   @relation(fields: [userId], references: [id])
  
  // Removed: @@unique([userId, date])
  // Added: @@index([userId, date])
}
```

#### i18n Keys Added
```json
{
  "scheduling": {
    "openShifts": "Open Shifts",
    "openShiftsDescription": "{{count}} shift(s) available to claim",
    "open": "Open",
    "acceptShift": "Accept Shift",
    "shiftAccepted": "Shift accepted successfully",
    "noOpenShifts": "No open shifts available"
  }
}
```

#### Notes
- Task said "userId is already nullable" but schema had it non-nullable - had to update schema
- Run `npx prisma generate` after schema changes to regenerate client types
- LSP may show errors until types are regenerated (build still works)
- TanStack Query mutation should be used for optimistic UI updates (not implemented yet)

### 2026-01-29 - Centralized Configuration File (infra/config.sh)

#### What Was Done
- Created `infra/config.sh` with all hardcoded deployment values centralized
- Used `${VAR:-default}` pattern for all variables to allow environment overrides
- Organized variables into logical sections with clear comments
- Made file executable with `chmod +x`
- Verified bash syntax with `bash -n`

#### Configuration Sections
1. **Application Configuration**: APP_NAME, APP_DIR, REPO_URL
2. **Domain Configuration**: PRIMARY_DOMAIN, SECONDARY_DOMAIN, CERTBOT_EMAIL
3. **Container Names**: CONTAINER_API, CONTAINER_WEB, CONTAINER_DB, CONTAINER_REDIS, CONTAINER_NGINX
4. **Network Configuration**: NETWORK_NAME
5. **Port Configuration**: API_PORT, DB_PORT, REDIS_PORT
6. **Backup Configuration**: BACKUP_DIR, BACKUP_RETENTION_DAYS
7. **Health Check Configuration**: HEALTH_CHECK_URL, HEALTH_CHECK_TIMEOUT, HEALTH_CHECK_RETRIES
8. **Output Colors**: RED, GREEN, YELLOW, BLUE, NC (for colored terminal output)

#### Key Patterns Used
- All variables use `export` to make them available to sourced scripts
- Default values follow project conventions (e.g., `/opt/torre-tempo` for app directory)
- Health check URL uses variable interpolation: `${PRIMARY_DOMAIN}` for dynamic domain
- Color codes use ANSI escape sequences for terminal output formatting
- Comments use `=` dividers for clear section separation

#### Usage in Deployment Scripts
Scripts should source this file at the beginning:
```bash
#!/bin/bash
source "$(dirname "$0")/config.sh"

# Now use variables like:
docker run --name "$CONTAINER_API" -p "$API_PORT:4000" ...
```

#### Environment Override Example
```bash
# Override defaults at runtime
PRIMARY_DOMAIN=custom.domain.com BACKUP_RETENTION_DAYS=60 ./deploy.sh
```

#### Technical Notes
- File is executable (chmod +x) for consistency with other scripts
- Bash syntax verified with `bash -n` (no errors)
- No secrets included (passwords, tokens, API keys)
- All values have sensible defaults matching current deployment
- File location: `infra/config.sh` (at root of infra directory)


## Shared Utility Library (common.sh) - 2026-01-29

### Implementation Summary
Created `infra/lib/common.sh` with comprehensive reusable functions for all deployment scripts.

### Functions Implemented

**Logging Functions (4)**
- `log_info()` - Blue info messages
- `log_success()` - Green success messages with ✓ symbol
- `log_error()` - Red error messages to stderr with ✗ symbol
- `log_warning()` - Yellow warning messages with ⚠ symbol

**Error Handling (1)**
- `die()` - Log error and exit with code 1

**Command Checks (1)**
- `require_command()` - Verify command exists, die if not found

**Service Health Checks (1)**
- `wait_for_service()` - HTTP health check with retry logic (curl-based)
  - Parameters: url, timeout (default 30s), retries (default 3)
  - 5s delay between retries
  - Returns 0 on success, 1 on failure

**Docker Helpers (4)**
- `docker_exec()` - Execute command in container with error handling
- `docker_health()` - Get container health status (healthy/unhealthy/starting/unknown)
- `docker_wait_healthy()` - Wait for container to be healthy (default 60s timeout)
- `docker_is_running()` - Check if container is running

**Validation Helpers (3)**
- `require_var()` - Verify variable is set and not empty
- `require_file()` - Verify file exists
- `require_dir()` - Verify directory exists

**Utility Functions (2)**
- `run_cmd()` - Execute command with logging and error handling
- `retry_cmd()` - Retry command with exponential backoff (1s, 2s, 4s, etc.)

### Key Design Decisions

1. **Color Variables**: Uses config.sh color exports (RED, GREEN, YELLOW, BLUE, NC)
2. **Error Handling**: All functions that can fail use `die()` for consistent error exit
3. **Logging**: All output uses consistent emoji + color scheme
4. **Docker Health**: Includes both status check and wait-for-healthy helper
5. **Retry Logic**: Exponential backoff for resilience (1s → 2s → 4s)
6. **Function Exports**: All functions exported for use in subshells

### Verification Completed
✓ File created at `infra/lib/common.sh`
✓ File is executable (755 permissions)
✓ Sources config.sh correctly
✓ All 15 functions defined and exported
✓ Bash syntax check passed
✓ Functions verified with `declare -F`

### Usage Pattern
```bash
#!/bin/bash
source "$(dirname "$0")/lib/common.sh"

log_info "Starting deployment..."
require_command docker
wait_for_service "http://localhost:4000/health" 30 3
docker_wait_healthy "torre-tempo-api" 60
log_success "All checks passed"
```

### Future Integration Points
- `scripts/deploy.sh` - Use for deployment logging and error handling
- `scripts/update.sh` - Use for service health checks
- `scripts/manage.sh` - Use for Docker container management
- `scripts/backup.sh` - Use for backup operation logging


## Security Audit Baseline - 2026-01-29

### Audit Execution
- Ran `npm audit --json` and `npm audit` to capture current vulnerability state
- Generated comprehensive baseline report at `.sisyphus/notepads/torre-tempo-completion/security-audit-baseline.md`
- Baseline established for future comparison and tracking

### Key Findings

#### Vulnerability Summary
- **Total:** 21 vulnerabilities
- **Critical:** 0 (✅ None)
- **High:** 4 (⚠️ Requires attention)
- **Moderate:** 13 (⚠️ Should be addressed)
- **Low:** 4 (ℹ️ Monitor)

#### High Severity Issues (4)
1. **glob** (10.2.0-10.4.5) - Command injection via -c/--cmd (CVSS 7.5)
   - Affects: @nestjs/cli
   - Fix: @nestjs/cli@11.0.16 (breaking change)

2. **tar** (<=7.5.6) - Multiple path traversal vulnerabilities
   - 3 separate CVEs with CVSS up to 8.8
   - Affects: @mapbox/node-pre-gyp
   - Fix: Available via `npm audit fix` (non-breaking)

3. **@nestjs/cli** (2.0.0-rc.1 - 10.4.9) - Transitive HIGH
   - Root causes: glob, inquirer, @angular-devkit/schematics-cli
   - Fix: @nestjs/cli@11.0.16 (breaking change)

#### Moderate Severity Issues (13)
- **Build chain:** esbuild, eslint, vite, vite-node, vitest, vite-plugin-pwa
- **TypeScript linting:** @typescript-eslint/eslint-plugin, parser, type-utils, utils
- **React linting:** eslint-plugin-react-hooks
- **Backend config:** @nestjs/config (depends on vulnerable lodash)
- **Utilities:** lodash (prototype pollution in _.unset and _.omit)

#### Low Severity Issues (4)
- **CLI tools:** inquirer, external-editor, tmp
- **Build tools:** @angular-devkit/schematics-cli

### Dependency Statistics
- Production dependencies: 428
- Development dependencies: 943
- Optional dependencies: 78
- Peer dependencies: 8
- **Total: 1,373 dependencies**

### Risk Assessment

#### Development vs. Production Impact
- **Development Only:** eslint, @typescript-eslint/*, vitest, vite (dev dependencies)
- **Production Risk:** None directly (all vulnerabilities in dev/build chain)
- **Transitive Risk:** lodash in @nestjs/config (backend runtime)

#### Critical Path Vulnerabilities
1. @nestjs/cli - Used in development; HIGH severity
2. tar - Used in dependency installation; HIGH severity
3. glob - Used in build processes; HIGH severity

### Recommended Action Plan

#### Phase 1: Immediate (Critical)
1. Update tar: `npm audit fix` (non-breaking)
2. Test build and functionality

#### Phase 2: Short-term (1-2 weeks)
1. Update @nestjs/cli to 11.0.16 with `npm audit fix --force`
2. Update eslint ecosystem to latest
3. Update vite ecosystem to latest
4. Run full test suite and verify no breaking changes

#### Phase 3: Medium-term (1 month)
1. Review lodash usage in @nestjs/config
2. Consider alternative to lodash if possible
3. Audit glob usage in build scripts
4. Implement automated security scanning in CI/CD

### Long-term Security Strategy
1. Implement automated security scanning (npm audit in CI)
2. Set up Dependabot or similar for automated PRs
3. Establish security update SLA (e.g., critical within 24h)
4. Regular security audits (monthly)
5. Keep dependencies up-to-date with latest patches

### Technical Notes
- All vulnerabilities are in dev/build dependencies except lodash (transitive in @nestjs/config)
- No production-critical vulnerabilities detected
- Most fixes require major version bumps (breaking changes)
- tar vulnerability is fixable without breaking changes
- Baseline report includes detailed CWE mappings and CVSS scores for each vulnerability

