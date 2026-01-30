# Issues & Gotchas



## [2026-01-28 22:08] Database Setup Blocker

### Issue
Docker not available on Windows dev environment. Cannot run `docker compose up -d` to start PostgreSQL + Redis.

### Impact
- Prisma migrations cannot run
- Auth endpoints cannot be tested end-to-end
- Frontend cannot test real API calls

### Workarounds
1. Install Docker Desktop for Windows
2. Use WSL2 with Docker
3. Install PostgreSQL + Redis natively on Windows
4. Use cloud-hosted dev database

### Current Action
Proceeding with code implementation; database setup deferred for testing phase.


## [2026-01-28 21:50] LSP Server Not Installed

### Issue
TypeScript LSP server not installed globally. Cannot run `lsp_diagnostics` for project-level verification.

### Impact
- Cannot use LSP tools for real-time error checking
- Relying on `npm run build` for TypeScript verification (which works fine)

### Workaround
Use `npm run build` as the source of truth for TypeScript errors. Build succeeded with zero errors.

### Resolution (Optional)
Install TypeScript LSP server globally:
```bash
npm install -g typescript-language-server typescript
```


## [2026-01-28 22:47] Prisma Client Cache Issue (RESOLVED)

### Issue
After running `prisma db push` to create database schema, API container showed error:
```
The table `public.users` does not exist in the current database.
```

Even though the table existed in the database.

### Root Cause
The Prisma client in the running API container was generated during the Docker build BEFORE the schema was pushed to the database. The cached Prisma client metadata didn't know about the newly created tables.

### Resolution
Restarted the API container to clear the Prisma client cache:
```bash
docker compose -f docker-compose.prod.yml restart api
```

### Verification
✅ Login endpoint working: `curl https://time.lsltgroup.es/api/auth/login`
✅ Health endpoint working: `curl https://time.lsltgroup.es/api/health`
✅ No errors in API logs

### Prevention
For future deployments:
1. Always run schema migrations BEFORE starting API container
2. Or restart API container after schema changes
3. Consider using proper Prisma migrations instead of `db push` for production


## CRITICAL BUG: Dashboard Crashes on Initial Login (2026-01-29)

**Severity:** P0 - BLOCKING  
**Status:** FOUND IN PRODUCTION  
**Affects:** All GLOBAL_ADMIN users

### Symptom
- When GLOBAL_ADMIN user logs in, `/app/dashboard` shows blank white screen
- JavaScript error: `TypeError: l.filter is not a function`
- Error location: Bundled JS file at line 136:166494

### Reproduction
1. Login as GLOBAL_ADMIN user (info@lsltgroup.es)
2. Dashboard loads blank on initial redirect after login
3. Console shows: `TypeError: l.filter is not a function`
4. Workaround: Navigate to System Admin, then back to Dashboard → works fine

### Root Cause (Suspected)
Recent pagination changes (commits edb70a3, 39817e3) introduced a type error. Code assumes data is an array and calls `.filter()`, but initial state might be `undefined`, `null`, or an object.

### Likely File
- `apps/web/src/features/dashboard/GlobalAdminDashboard.tsx`

### Fix Required
- Add defensive type checking: `(data || []).filter(...)` or `data?.filter(...)`
- Ensure initial state is always empty array: `useState([])`
- Add null checks before array operations
- Review pagination response handling

### Impact
**SHOWSTOPPER:** All GLOBAL_ADMIN users cannot access dashboard on first login. This blocks primary functionality.

### Tested Successfully
- ✅ System Admin page loads correctly
- ✅ Tenant Management page works
- ✅ Create Tenant form shows all 6 placeholders
- ✅ Navigation between pages works
- ✅ Dashboard works after navigating away and back

---

## ✅ RESOLVED: Dashboard TypeError Bug (2026-01-29 16:00)

**Original Issue:** CRITICAL BUG - Dashboard Crashes on Initial Login

**Status:** ✅ FIXED AND VERIFIED IN PRODUCTION

**Fix Applied:** Commit 52159c1 - "fix: add defensive array checks to prevent TypeError on initial dashboard load"

**Files Modified:**
1. `apps/web/src/App.tsx` - Added `(navItems ?? []).filter(...)`
2. `apps/web/src/components/BottomNav.tsx` - Added default param and nullish coalescing

**Verification Results (Production Testing):**
- ✅ Login as GLOBAL_ADMIN → Dashboard loads immediately
- ✅ No JavaScript console errors
- ✅ No "TypeError: l.filter is not a function" error
- ✅ Dashboard displays all content correctly (stats, locations, activity)
- ✅ No blank white screen on initial login
- ✅ Navigation works properly between all pages
- ✅ No workaround needed (previously: had to navigate to System Admin first)

**Test Evidence:**
- Full test report: `DASHBOARD_FIX_VERIFICATION_REPORT.md`
- Screenshot: `tmp/dashboard-initial-load.png`
- Console log: `tmp/console-errors.txt` (empty - no errors)

**Resolution Date:** 2026-01-29 16:00  
**Verified By:** Automated Playwright test on production  
**Production URL:** https://time.lsltgroup.es  

**Recommendation:** Update GLOBAL_ADMIN_TEST_REPORT.md status from "⚠️ PASS with CRITICAL BUG" to "✅ PASS"

