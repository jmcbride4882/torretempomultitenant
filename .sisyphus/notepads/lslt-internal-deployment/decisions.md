# Decisions - LSLT Internal Deployment

## Playwright E2E Testing Decisions (2026-01-29)

### Decision 1: Use Playwright over Cypress
**Context**: Need E2E testing framework for Torre Tempo PWA

**Decision**: Chose Playwright

**Rationale**:
- Better TypeScript support out of the box
- Faster execution and more reliable auto-waiting
- Multi-browser support (Chromium, Firefox, WebKit)
- Better handling of modern web features (PWA, offline mode)
- Official Microsoft support and active development
- Better debugging tools (trace viewer, inspector)

**Trade-offs**: Slightly less mature ecosystem than Cypress, but more aligned with modern web testing

---

### Decision 2: Test Fixture Pattern for User Management
**Context**: Need to manage test users across multiple test files

**Decision**: Centralized test user credentials in fixtures/test-users.ts with helper functions

**Rationale**:
- DRY principle - single source of truth for test users
- Easy to update credentials if they change
- Helper functions encapsulate common patterns (login, logout)
- Type safety with TypeScript
- Reusable across all test files

**Implementation**:
```typescript
export const testUsers = {
  employee: { email: 'john@lsltgroup.es', password: 'Test123!', role: 'EMPLOYEE' },
  // ... other roles
};

export async function login(page: Page, user: typeof testUsers.employee) {
  // Centralized login logic
}
```

---

### Decision 3: Semantic Selectors Over Data-TestId
**Context**: How to identify elements in tests

**Decision**: Use semantic selectors (hasText, filter, role) primarily, avoid data-testid unless necessary

**Rationale**:
- Semantic selectors are more maintainable and readable
- Tests break when user-visible text changes (which is good - it's a real breaking change)
- Avoids polluting production code with test-specific attributes
- More closely simulates how users interact with the app
- Playwright's locator().filter() chains provide good stability

**Example**:
```typescript
// Preferred
page.locator('button').filter({ hasText: /clock in/i })

// Avoid unless necessary
page.locator('[data-testid="clock-in-button"]')
```

---

### Decision 4: Single Browser (Chromium) for Initial Setup
**Context**: Which browsers to test against

**Decision**: Start with Chromium only, add Firefox/WebKit later if needed

**Rationale**:
- Faster test execution (single browser)
- Torre Tempo is primarily used on Chrome/Edge in corporate environment
- PWA features work best in Chromium
- Can add more browsers later if cross-browser issues arise
- Resource constraints (CI/CD pipeline)

**Future**: Consider adding Firefox and WebKit for broader coverage

---

### Decision 5: Test Isolation Strategy
**Context**: How to handle test data and state

**Decision**: Tests check and adapt to existing state, use unique data for creates

**Rationale**:
- Shared test database makes full isolation difficult
- Tests that create data use timestamps for uniqueness
- Tests that modify state (clock in/out) check current state first
- Tests that require specific data (edit requests) skip if not available
- Pragmatic approach balancing speed and reliability

**Implementation**:
- Check state: `if (await clockedInBadge.isVisible()) { /* clock out first */ }`
- Unique data: `email: testuser${Date.now()}@example.com`
- Skip: `if (requestCount === 0) { test.skip(); }`

---

### Decision 6: Auto-Start Dev Server
**Context**: How to ensure dev server is running for tests

**Decision**: Configure Playwright to auto-start dev server with webServer config

**Rationale**:
- Convenience - developers don't need to manually start server
- Consistency - same server config for all environments
- CI/CD friendly - server starts automatically in pipeline
- Reuse existing server if already running (local dev)

**Configuration**:
```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,
}
```

---

### Decision 7: Test Organization by User Role
**Context**: How to organize test files

**Decision**: One test file per user role/workflow

**Rationale**:
- Clear separation of concerns
- Easy to run specific role tests
- Matches user story structure
- Independent test suites can run in parallel
- Easy to assign ownership to team members

**Structure**:
- time-tracking.spec.ts (Employee)
- manager-approvals.spec.ts (Manager)
- admin-user-management.spec.ts (Admin)
- global-admin-tenants.spec.ts (Global Admin)

---

### Decision 8: Minimal Wait Times
**Context**: How long to wait for async operations

**Decision**: Use Playwright's built-in auto-waiting, add explicit waits only when necessary

**Rationale**:
- Playwright auto-waits for actionability (visible, enabled, stable)
- Reduces flakiness compared to fixed waits
- Explicit waits only for known async operations (mutations, API calls)
- Use waitForLoadState('networkidle') after navigation
- Use waitForTimeout(2000) after mutations that update UI

**Guidelines**:
- Navigation: waitForLoadState('networkidle')
- Mutations: waitForTimeout(2000) for UI update
- Assertions: Use timeout parameter on expect()

---

### Decision 9: .gitignore for Test Artifacts
**Context**: What test artifacts to exclude from git

**Decision**: Exclude test-results/, playwright-report/, playwright/.cache/

**Rationale**:
- Test results are ephemeral and environment-specific
- Reports can be regenerated from test runs
- Cache files are browser binaries (large)
- Keeps repository clean
- Standard Playwright practice

---

### Decision 10: npm run test:e2e Script
**Context**: How to run E2E tests

**Decision**: Use existing test:e2e script in package.json (already existed)

**Rationale**:
- Consistency with project conventions
- Script already existed in package.json
- Simple command for developers to remember
- Can be extended with additional flags if needed

**Command**: `npm run test:e2e`
