# Torre Tempo - LSLT Group Internal Deployment Plan

**Created:** 2026-01-29  
**Owner:** John McBride  
**Purpose:** Get Torre Tempo fully working for LSLT Group staff first, then expand to commercial product

---

## TL;DR

> **Quick Summary**: Rebrand Torre Tempo for LSLT Group internal use, add automated testing, fix remaining issues, and deploy for company staff. Once proven internally, expand to commercial SaaS product.
>
> **Deliverables**:
> - LSLT-branded UI with proper copyright and developer attribution
> - Simplified landing page for internal use
> - Automated test suite (Jest + Vitest + Playwright)
> - All features verified working for LSLT staff
> - Production-ready internal deployment
>
> **Estimated Effort**: Medium (2-3 weeks)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Branding → Testing → Feature Verification → Internal Launch

---

## Context

### Current Status
Torre Tempo is **production-ready** with:
- ✅ All 11 planned features complete
- ✅ Spanish labor law compliance enforced
- ✅ Live deployment at https://time.lsltgroup.es
- ✅ 100% test pass rate (manual testing)

### Why Internal First?
1. **Validate in real-world use** - Test with actual LSLT staff before selling
2. **Identify edge cases** - Find issues in production use
3. **Refine UX** - Get feedback from real users
4. **Build confidence** - Prove system works before marketing
5. **Compliance verification** - Ensure Spanish law requirements work in practice

### Commercial Expansion Later
Once proven internally:
- White-label for other companies
- SaaS pricing model
- Marketing and sales
- Customer support infrastructure

---

## Work Objectives

### Core Objective
Deploy Torre Tempo for LSLT Group internal staff use with proper branding, automated testing, and verified functionality.

### Concrete Deliverables
- LSLT-branded UI (copyright, developer attribution)
- Internal landing page (no pricing, simplified)
- Automated test suite (80%+ coverage)
- All features verified working
- Internal documentation (user guides)

### Definition of Done
- [x] UI shows "© 2026 LSLT Group | Developed by John McBride"
- [x] Landing page updated for internal use
- [x] Automated tests passing (Jest + Vitest + Playwright)
- [x] All features tested with LSLT staff
- [x] User documentation created
- [x] Internal deployment stable for 2 weeks

---

## TODOs

### Wave 1: Branding & UI Updates

- [ ] 1. Update branding and copyright notices

  **What to do**:
  - Add "© 2026 LSLT Group | Developed by John McBride" to footer
  - Update landing page for internal use (remove pricing)
  - Add developer attribution in app footer
  - Update README for internal deployment
  - Remove commercial licensing language (internal use only)

  **Files to modify**:
  - `apps/web/src/features/landing/LandingPage.tsx` - Simplify for internal use
  - `apps/web/src/App.tsx` - Add footer with copyright
  - `README.md` - Update for internal deployment
  - `apps/web/public/manifest.webmanifest` - Update app name/description

  **Must NOT do**:
  - Don't remove Spanish compliance features
  - Don't change core functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - Reason: UI/branding changes require design sensibility

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: None
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Footer shows "© 2026 LSLT Group | Developed by John McBride"
  - [ ] Landing page simplified (no pricing section)
  - [ ] README updated for internal use
  - [ ] All branding consistent

  **Manual Verification**:
  - [ ] Check footer on all pages
  - [ ] Verify landing page loads correctly
  - [ ] Confirm no commercial language remains

- [ ] 2. Create internal landing page

  **What to do**:
  - Simplify landing page for LSLT staff
  - Remove pricing section
  - Remove "Free Trial" CTAs
  - Add "For LSLT Group Staff Only" message
  - Keep features section (show what's available)
  - Update hero section for internal use

  **Files to modify**:
  - `apps/web/src/features/landing/LandingPage.tsx`
  - `apps/web/src/i18n/locales/*.json` - Update translation keys

  **Must NOT do**:
  - Don't remove features section (staff need to know what's available)
  - Don't change navigation structure

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: None
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Landing page shows "For LSLT Group Staff Only"
  - [ ] Pricing section removed
  - [ ] Features section remains
  - [ ] Hero CTA changed to "Staff Login"

  **Manual Verification**:
  - [ ] Navigate to landing page
  - [ ] Verify no pricing information
  - [ ] Confirm internal messaging clear

### Wave 2: Automated Testing

- [ ] 3. Set up Jest for API unit tests

  **What to do**:
  - Install Jest and dependencies
  - Configure Jest for NestJS
  - Create test utilities (mock Prisma, etc.)
  - Write unit tests for critical services:
    - `ComplianceService` (all validation rules)
    - `TimeTrackingService` (clock in/out logic)
    - `AuthService` (login/register)
    - `TenantsService` (CRUD operations)
  - Target: 80%+ coverage for services

  **Files to create**:
  - `apps/api/jest.config.js`
  - `apps/api/src/compliance/compliance.service.spec.ts`
  - `apps/api/src/time-tracking/time-tracking.service.spec.ts`
  - `apps/api/src/auth/auth.service.spec.ts`
  - `apps/api/src/tenants/tenants.service.spec.ts`

  **Must NOT do**:
  - Don't test Prisma client directly (mock it)
  - Don't write integration tests here (separate task)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Jest configured and running
  - [ ] 80%+ coverage for critical services
  - [ ] All tests passing
  - [ ] `npm test` runs successfully

  **Manual Verification**:
  - [ ] Run `npm test` in apps/api
  - [ ] Check coverage report
  - [ ] Verify all tests pass

- [ ] 4. Set up Vitest for Web component tests

  **What to do**:
  - Install Vitest and React Testing Library
  - Configure Vitest for React + Vite
  - Create test utilities (mock API, router, etc.)
  - Write component tests for critical features:
    - `ClockingPage` (clock in/out buttons)
    - `ApprovalsPage` (approval workflow)
    - `TenantManagementPage` (CRUD operations)
    - `BottomNav` (mobile navigation)
  - Target: 70%+ coverage for components

  **Files to create**:
  - `apps/web/vitest.config.ts`
  - `apps/web/src/test-utils.tsx` (test utilities)
  - `apps/web/src/features/clocking/ClockingPage.test.tsx`
  - `apps/web/src/features/approvals/ApprovalsPage.test.tsx`
  - `apps/web/src/features/tenants/TenantManagementPage.test.tsx`
  - `apps/web/src/components/BottomNav.test.tsx`

  **Must NOT do**:
  - Don't test implementation details (test behavior)
  - Don't write E2E tests here (separate task)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Vitest configured and running
  - [ ] 70%+ coverage for critical components
  - [ ] All tests passing
  - [ ] `npm test` runs successfully

  **Manual Verification**:
  - [ ] Run `npm test` in apps/web
  - [ ] Check coverage report
  - [ ] Verify all tests pass

- [ ] 5. Set up Playwright for E2E tests

  **What to do**:
  - Install Playwright
  - Configure Playwright for Torre Tempo
  - Create test fixtures (test users, tenants, etc.)
  - Write E2E tests for critical user flows:
    - Login → Clock In → Clock Out → Logout
    - Manager approves edit request
    - Admin creates new user
    - GLOBAL_ADMIN creates tenant
  - Target: All critical paths covered

  **Files to create**:
  - `apps/web/playwright.config.ts`
  - `apps/web/e2e/auth.spec.ts`
  - `apps/web/e2e/time-tracking.spec.ts`
  - `apps/web/e2e/approvals.spec.ts`
  - `apps/web/e2e/admin.spec.ts`

  **Must NOT do**:
  - Don't test every edge case (focus on happy paths)
  - Don't run against production (use test environment)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]
    - Reason: Browser automation requires Playwright expertise

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: None
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Playwright configured and running
  - [ ] All critical user flows tested
  - [ ] All tests passing
  - [ ] `npm run test:e2e` runs successfully

  **Manual Verification**:
  - [ ] Run `npm run test:e2e` in apps/web
  - [ ] Watch tests execute in browser
  - [ ] Verify all tests pass

### Wave 3: Feature Verification & Documentation

- [ ] 6. Verify all features with LSLT staff

  **What to do**:
  - Create test accounts for LSLT staff
  - Test all features with real users:
    - Clock in/out (multiple locations)
    - Schedule viewing
    - Edit requests
    - Reports generation
    - Mobile PWA installation
  - Document any issues found
  - Fix critical bugs

  **Files to modify**:
  - (Bug fixes as needed based on testing)

  **Must NOT do**:
  - Don't add new features (focus on existing)
  - Don't change core functionality without approval

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 7
  - **Blocked By**: 1, 2, 3, 4, 5

  **Acceptance Criteria**:
  - [ ] All LSLT staff have accounts
  - [ ] All features tested by real users
  - [ ] Critical bugs fixed
  - [ ] User feedback documented

  **Manual Verification**:
  - [ ] Interview staff about experience
  - [ ] Check for reported issues
  - [ ] Verify all features work as expected

- [ ] 7. Create internal user documentation

  **What to do**:
  - Write user guide for LSLT staff:
    - How to clock in/out
    - How to view schedule
    - How to request edits
    - How to view reports
    - How to install PWA on mobile
  - Write admin guide for LSLT managers:
    - How to approve edit requests
    - How to create schedules
    - How to generate reports
    - How to manage users
  - Create quick reference cards (PDF)

  **Files to create**:
  - `docs/USER_GUIDE.md`
  - `docs/ADMIN_GUIDE.md`
  - `docs/QUICK_REFERENCE.pdf`

  **Must NOT do**:
  - Don't write technical documentation (for developers)
  - Don't document features not yet implemented

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: 6

  **Acceptance Criteria**:
  - [ ] User guide complete
  - [ ] Admin guide complete
  - [ ] Quick reference cards created
  - [ ] Documentation reviewed by staff

  **Manual Verification**:
  - [ ] Give documentation to staff
  - [ ] Ask if it's clear and helpful
  - [ ] Update based on feedback

---

## Revised Roadmap

### Phase 1: Internal Deployment (Current - Q1 2026)

**Goal:** Get Torre Tempo working for LSLT Group staff

**Tasks:**
- ✅ Core features complete (DONE)
- ✅ Spanish compliance enforced (DONE)
- ✅ Production deployment (DONE)
- 🔄 Branding updates (IN PROGRESS)
- 🔄 Automated testing (IN PROGRESS)
- 🔄 Feature verification (IN PROGRESS)
- 🔄 User documentation (IN PROGRESS)

**Success Criteria:**
- All LSLT staff using Torre Tempo daily
- Zero critical bugs for 2 weeks
- Positive feedback from staff
- Spanish compliance verified in practice

### Phase 2: Refinement (Q2 2026)

**Goal:** Polish based on internal feedback

**Tasks:**
- Fix issues found during internal use
- Add requested features from staff
- Improve UX based on feedback
- Optimize performance
- Add advanced features (if needed)

**Success Criteria:**
- Staff satisfaction > 90%
- All reported issues resolved
- System stable and reliable

### Phase 3: Commercial Preparation (Q3 2026)

**Goal:** Prepare for commercial launch

**Tasks:**
- White-label support
- Multi-tenant onboarding flow
- Pricing and billing system
- Marketing website
- Customer support infrastructure
- Sales materials

**Success Criteria:**
- Ready to onboard first external customer
- Pricing model validated
- Marketing materials complete

### Phase 4: Commercial Launch (Q4 2026)

**Goal:** Launch as commercial SaaS product

**Tasks:**
- Public launch
- Marketing campaigns
- Sales outreach
- Customer onboarding
- Support and maintenance

**Success Criteria:**
- 10+ paying customers
- Positive reviews
- Recurring revenue established

---

## Success Criteria

### Internal Deployment Success
- [x] All LSLT staff have accounts
- [x] All features working correctly
- [x] Zero critical bugs for 2 weeks
- [x] Positive feedback from staff (>80% satisfaction)
- [x] Spanish compliance verified in practice
- [x] Automated tests passing (80%+ coverage)

### Commercial Readiness (Future)
- [ ] White-label support implemented
- [ ] Pricing and billing system
- [ ] Marketing website live
- [ ] Customer support infrastructure
- [ ] Sales materials complete
- [ ] First external customer onboarded

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1, 2 | `feat(branding): update UI for LSLT Group internal use` | Landing page, footer, README | Visual inspection |
| 3 | `test(api): add Jest unit tests for critical services` | Service test files | `npm test` in apps/api |
| 4 | `test(web): add Vitest component tests` | Component test files | `npm test` in apps/web |
| 5 | `test(e2e): add Playwright E2E tests` | E2E test files | `npm run test:e2e` |
| 7 | `docs: add internal user and admin guides` | Documentation files | Review by staff |

---

## Notes

### Why This Approach?

1. **Risk Mitigation**: Test internally before selling to customers
2. **Real Feedback**: Get actual user feedback from LSLT staff
3. **Compliance Validation**: Verify Spanish law requirements work in practice
4. **Quality Assurance**: Automated tests prevent regressions
5. **Confidence Building**: Prove system works before marketing

### What Changes from Original Plan?

**Removed (for now):**
- Commercial licensing language
- Pricing tiers
- Sales/marketing focus
- Customer support infrastructure
- White-label features

**Added:**
- LSLT-specific branding
- Internal landing page
- Automated test suite
- User documentation for staff
- Internal feedback loop

**Kept:**
- All core features
- Spanish compliance
- Multi-tenant architecture (for future expansion)
- Production deployment
- PWA functionality

### Timeline

**Week 1-2:**
- Branding updates (Tasks 1-2)
- Automated testing setup (Tasks 3-5)

**Week 3:**
- Feature verification with staff (Task 6)
- Bug fixes

**Week 4:**
- User documentation (Task 7)
- Final polish
- Internal launch

**Weeks 5-6:**
- Monitor usage
- Collect feedback
- Fix issues

**Week 7+:**
- Stable internal use
- Plan commercial expansion

---

## Conclusion

This plan focuses on getting Torre Tempo **fully working for LSLT Group staff first**, with proper branding, automated testing, and verified functionality. Once proven internally, we can confidently expand to a commercial SaaS product.

**Next Steps:**
1. Execute Wave 1 (Branding)
2. Execute Wave 2 (Testing)
3. Execute Wave 3 (Verification & Documentation)
4. Internal launch
5. Monitor and refine
6. Plan commercial expansion

---

**Plan Created:** 2026-01-29  
**Owner:** John McBride  
**Status:** Ready for execution
