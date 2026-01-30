## Global Admin Stats Endpoint Implementation

**Date:** 2026-01-30
**Task:** Implement GET /api/global-admin/stats endpoint

### Changes Made
- Updated `GlobalAdminService.getSystemStats()` in `apps/api/src/global-admin/global-admin.service.ts`
- Replaced location-based stats with time-tracking stats
- Added calculations for:
  - `activeTenants`: Count of tenants with time entries in last 30 days
  - `totalEntriesThisMonth`: Count of time entries since start of current month

### Key Implementation Details
- Used `groupBy` to count distinct tenants with recent activity
- Calculated date ranges (30 days ago, start of month) inline
- Maintained NO tenantId filtering (global admin sees all data)
- Removed error fallback values; now throws error for proper error handling

### Verification
- Build passed successfully
- Controller endpoint already existed at `@Get('stats')` with proper role guard
- Returns required fields: totalTenants, activeTenants, totalUsers, totalEntriesThisMonth

