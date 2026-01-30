# Learnings - LSLT Internal Deployment

## Playwright E2E Testing Setup (2026-01-29)

### What Was Done
- Installed Playwright (@playwright/test v1.58.0) and browser binaries (chromium)
- Created playwright.config.ts with proper configuration for Torre Tempo
- Set up test fixtures with helper functions for common operations (login, logout, navigation)
- Wrote comprehensive E2E tests covering all critical user flows:
  - Employee time tracking (Login → Clock In → Clock Out → Logout)
  - Manager approval workflow (view, filter, approve, reject edit requests)
  - Admin user management (view, create, edit, search users)
  - Global admin tenant management (view, create, search tenants)

### Test Structure
```
apps/web/e2e/
├── fixtures/
│   └── test-users.ts       # Test user credentials and helper functions
├── time-tracking.spec.ts   # Employee time tracking tests (3 tests)
├── manager-approvals.spec.ts  # Manager approval tests (5 tests)
├── admin-user-management.spec.ts  # Admin user tests (7 tests)
└── global-admin-tenants.spec.ts   # Global admin tests (7 tests)
```

Total: 22 E2E tests across 4 test suites

### Key Patterns Discovered

1. Test User Setup
   - Created reusable test users for each role (EMPLOYEE, MANAGER, ADMIN, GLOBAL_ADMIN)
   - Used existing seeded users with Test123! password
   - Centralized credentials in fixtures/test-users.ts

2. Helper Functions
   - login(page, user): Handles login flow and waits for dashboard
   - logout(page): Handles logout from both desktop and mobile views
   - navigateTo(page, path): Navigates and waits for page load

3. Selector Strategy
   - Used semantic selectors: hasText, filter, role attributes
   - Avoided brittle selectors (specific class names, IDs when possible)
   - Used locator().filter() chains for better stability

4. Wait Strategies
   - Used waitForLoadState('networkidle') after navigation
   - Added explicit waitForTimeout() for mutations (2000ms)
   - Used waitForURL() to verify navigation success

5. Handling Dynamic State
   - Tests check current state before attempting actions
   - Use conditional logic to handle "already clocked in" scenarios
   - Skip tests when required data is not available (using test.skip())

### Configuration Decisions

Playwright Config:
- baseURL: http://localhost:3000 (dev server)
- Browser: Chromium only (for speed)
- Retries: 2 retries on CI, 0 locally
- Workers: 1 on CI (sequential), undefined locally (parallel)
- Traces: On first retry only
- Web Server: Auto-starts dev server with npm run dev

### Test Data Requirements

For tests to pass, the following test data must exist:

1. Test Users:
   - john@lsltgroup.es (EMPLOYEE role)
   - manager@lsltgroup.es (MANAGER role)
   - admin@lsltgroup.es (ADMIN role)
   - info@lsltgroup.es (GLOBAL_ADMIN role)
   - All with password: Test123!

2. Test Tenant:
   - LSLT Group tenant must exist

### Running the Tests

Commands:
```bash
npm run test:e2e              # Run all tests
npx playwright test --list    # List all tests
npx playwright test --headed  # Run in headed mode
npx playwright test --ui      # Run in UI mode
npx playwright show-report    # View report
```

### Testing Coverage (22 total tests)

- Employee: 3 tests (time tracking cycle, double clock-in prevention, state persistence)
- Manager: 5 tests (view, filter, approve, reject, details)
- Admin: 7 tests (view, create, search, edit, validation, roles)
- Global Admin: 7 tests (view, create, search, details, validation, statistics)

All critical user flows are covered.
## Vitest Testing Framework Setup - Learnings

### Testing Infrastructure Created
- **Date**: 2026-01-29
- **Vitest version**: 1.6.1
- **React Testing Library**: Successfully integrated
- **jsdom environment**: Configured for DOM testing

### Test Files Created
1. **BottomNav.test.tsx** - 11 tests, all passing
   - Tests navigation item rendering
   - Tests active state highlighting
   - Tests click interactions
   - Tests mobile navigation behavior

2. **ClockingPage.test.tsx** - 25 tests, all passing
   - Tests loading states
   - Tests clocked in/out states  
   - Tests clock in/out interactions
   - Tests QR scanner integration
   - Tests geolocation features
   - Tests offline mode
   - Tests recent entries display

3. **ApprovalsPage.test.tsx** - 17 tests (some failures due to ambiguous queries)
   - Tests loading and empty states
   - Tests approval requests display
   - Tests approve/reject workflow
   - Tests status filtering
   - **Issue**: Some tests fail due to filter buttons having similar text to action buttons

### Configuration Files
- **vitest.config.ts**: Configured with jsdom, coverage settings, path aliases
- **test-setup.ts**: Mock setup for window APIs, geolocation, crypto, etc.
- **test-utils.tsx**: Custom render function with all providers (React Query, Router, i18n)

### Testing Patterns Discovered
1. **Mock API calls**: Use vi.mock() for API module, then vi.mocked() to control responses
2. **Query optimization**: Use getAllBy*  variants when multiple elements match
3. **Async testing**: Always use waitFor() for async state changes
4. **User interactions**: Use userEvent from test-utils for realistic interactions
5. **Provider setup**: Wrap tests with QueryClient, Router, and i18n providers

### Dependencies Installed
- @vitest/ui
- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event
- @testing-library/dom
- jsdom
- @vitest/coverage-v8

### Issues Encountered
1. **npm peer dependency conflicts**: Resolved with --legacy-peer-deps flag
2. **Coverage provider version mismatch**: vitest 1.6.1 has compatibility issue with @vitest/coverage-v8
3. **LSP false positives**: TypeScript LSP reports screen/waitFor not exported, but tests run fine
4. **Ambiguous text matching**: Need more specific queries when text appears in multiple places

### Test Results Summary
- **BottomNav**: 11/11 passing (100%)
- **ClockingPage**: 25/25 passing (100%)
- **ApprovalsPage**: 10/17 passing (59%) - needs query refinement
- **Total passing**: 46+ tests

### Next Steps for Future Work
1. Fix ApprovalsPage query ambiguities by using more specific selectors
2. Add tests for TenantManagementPage
3. Resolve coverage-v8 version compatibility issue
4. Add integration tests for complex workflows
5. Consider E2E tests with Playwright for critical user journeys


## User Documentation Creation (2026-01-29)

### Documentation Files Created
Successfully created three comprehensive documentation files:

1. **docs/USER_GUIDE.md** (602 lines, 19KB)
   - Complete employee guide covering all features
   - Login, clocking, schedules, edit requests, reports
   - PWA installation for iOS/Android/Desktop
   - Troubleshooting and FAQs

2. **docs/ADMIN_GUIDE.md** (892 lines, 23KB)
   - Manager and admin complete reference
   - User and location management
   - Approval workflows and reporting
   - Compliance monitoring
   - Role permission matrix

3. **docs/QUICK_REFERENCE.md** (502 lines, 12KB)
   - One-page cheat sheet (PDF-ready)
   - Quick start for all roles
   - Common tasks and troubleshooting
   - Print-friendly format

### Documentation Quality
- Clear, non-technical language
- Step-by-step instructions
- Visual indicators (💡 Tips, ⚠️ Warnings)
- Based on actual codebase features
- Covers offline mode, PWA, QR codes, geofencing
- Spanish labor law compliance explained
- GDPR and data security covered

### Key Features Documented
- Clock in/out with QR and geofence
- Offline mode and sync
- Edit request workflow
- Monthly report signing
- User management (CRUD)
- Location management with geofencing
- QR code generation
- Compliance dashboard
- Multi-language support

### Ready for Production
All documentation is production-ready and can be:
- Shared with LSLT staff immediately
- Printed for physical posting
- Included in onboarding materials
- Referenced for training sessions

## Branding and Copyright Verification (2026-01-30)

### Verified Implementation
All LSLT Group branding requirements were already implemented:

1. **Footer in AppLayout.tsx** (lines 285-290)
   - Shows: "© 2026 LSLT Group | Developed by John McBride"
   - Styling: text-xs, centered, slate-500 color
   - Responsive: Uses Tailwind responsive padding classes
   - Dark mode supported: dark:text-slate-400, dark:bg-slate-900

2. **Footer Visibility**
   - Only on authenticated pages (inside AppLayout)
   - NOT on landing page (LandingPage rendered standalone)
   - Route structure confirmed in App.tsx

3. **README.md Updated**
   - Title: "LSLT Group Internal Staff Clocking System"
   - Clear internal deployment messaging
   - No commercial/SaaS language
   - Developer credit: John McBride
   - Support email: info@lsltgroup.es

### Build Verification
- npm run build: SUCCESS
- All packages compiled (shared, api, web)
- PWA service worker generated


## Landing Page Internal Simplification (2026-01-30)

### Changes Made
1. Added `landing.internal.staffLogin` i18n key to both locale files:
   - es.json: "Acceso Personal"
   - en.json: "Staff Login"

2. Updated hero CTA in LandingPage.tsx to use `t('landing.internal.staffLogin')` instead of `t('landing.hero.cta')`

### Pre-existing State (Already Implemented)
- **Internal badge**: Already present in hero section using `landing.internal.badge`
- **No pricing section**: Component never had pricing section (only i18n keys existed unused)
- **Hero CTA already linked to /login**: Was using generic `landing.hero.cta` key
- **Footer already branded**: Shows LSLT Group and developer attribution

### Landing Page Structure (Post-Change)
1. Navbar - Features, FAQ links, language toggle, Login button
2. Hero - Internal badge, title, subtitle, "Staff Login" CTA, "See Features" secondary CTA
3. Trust Badges - RD-Ley 8/2019, RGPD, 5-year retention, No biometrics
4. Features Section - 6 feature cards (QR, Geo, Offline, Approvals, Reports, Multi-language)
5. How It Works - 3-step process
6. FAQ Section - 4 questions about legal compliance, offline, data storage, plan changes
7. CTA Section - "Ready to clock in?" with Login button
8. Footer - LSLT Group branding, product/legal links, contact info

### Verification
- Build passes: `npm run build` succeeded in apps/web
- No pricing section visible
- No "Free Trial" CTAs anywhere
- "Staff Login" / "Acceso Personal" button links to /login
- Internal staff badge prominently displayed

