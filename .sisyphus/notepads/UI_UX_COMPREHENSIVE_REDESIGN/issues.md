# Issues - UI/UX Comprehensive Redesign

## Known Issues

### TypeScript LSP Warnings (Non-Blocking)
- Prisma Client type errors in `time-tracking.service.ts` and `overtime.service.ts`
- **Cause:** Prisma Client not regenerated in local dev environment
- **Fix:** Run `cd apps/api && npx prisma generate`
- **Impact:** None - production builds work fine

### API Endpoints with Mock Data Fallbacks
- `/time-tracking/team-stats` - Returns mock data if endpoint fails
- `/time-tracking/clocked-in` - Returns empty array if endpoint fails
- `/admin/stats` - Returns mock data if endpoint fails
- `/admin/activity` - Returns empty array if endpoint fails

**Note:** These are intentional fallbacks to allow UI development to proceed independently of backend implementation.

## 2026-01-30 - PRODUCTION EMERGENCY: Dashboard White Screen

### Issue
After deploying enhanced dashboards, all dashboards showed white screen with JavaScript error:
```
TypeError: Cannot read properties of undefined (reading 'status')
```

### Root Cause
- `/health/metrics` API endpoint returns different structure than expected
- API returns: `{timestamp, process, memory, cpu}`
- Code expected: `{api: {...}, database: {...}, redis: {...}, storage: {...}}`
- Accessing `healthMetrics.api.status` when `api` was undefined caused crash

### Solution
- Simplified `healthMetrics` query in AdminDashboard.tsx to always return mock data
- Removed API call until backend implements proper format
- Kept `refetchInterval: 30000` for future integration

### Files Fixed
- `apps/web/src/features/dashboard/AdminDashboard.tsx` (lines 268-280)

### Commit
- `f202510` - fix(dashboard): AdminDashboard white screen - use mock health metrics

### Deployment
- Fixed file copied to VPS via scp
- Docker container rebuilt and deployed
- Verified working in browser (no console errors)

### Prevention
- Always validate API response structure matches expected types
- Add null checks before accessing nested properties
- Test with actual API responses, not just mock data
- Add error boundaries to catch React crashes

### Time to Resolution
- Detected: 2026-01-30 07:53 UTC
- Fixed: 2026-01-30 08:00 UTC
- **Duration: 7 minutes**
