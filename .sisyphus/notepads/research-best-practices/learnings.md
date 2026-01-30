# Torre Tempo Tech Stack Best Practices Research

Date: 2026-01-29

## 1. PWA Best Practices (2026)

### Service Worker Patterns
- Workbox is industry standard
- Network-First for API calls (already implemented)
- Background Sync needed for offline clock-ins
- IndexedDB for persistent offline queue

### Current Status
- GOOD: vite-plugin-pwa with Workbox
- NEEDS FIX: Manual SW registration in main.tsx
- MISSING: Background Sync API
- MISSING: IndexedDB offline queue

### Touch Targets
- WCAG 2.5.5: 44x44px minimum
- Torre Tempo: 96px/80px buttons (EXCELLENT)

## 2. NestJS Multi-Tenant (2026)

### Best Practice
- Use nestjs-cls for tenant context
- Prisma Client Extensions for auto-filtering
- Durable Providers for performance

### Current Status
- CRITICAL: No tenant isolation implemented
- MISSING: Tenant context extraction
- MISSING: Automatic tenant filtering

### Recommended Implementation
```typescript
// Use nestjs-cls + Prisma extensions
ClsModule.forRoot({
  middleware: {
    setup: (cls, req) => {
      cls.set('tenantId', extractFromJWT(req));
    }
  }
})
```

## 3. Prisma Multi-Tenant (2026)

### Current Status
- GOOD: All models have tenantId
- GOOD: Proper indexes
- MISSING: Prisma Client Extensions
- MISSING: Row-Level Security

### Recommendation
- Phase 1: Prisma extensions for app-level filtering
- Phase 2: PostgreSQL RLS for defense-in-depth

## 4. React/Vite Monorepo (2026)

### Current Status
- EXCELLENT: Clean structure
- GOOD: Path aliases configured
- IMPROVEMENT: Add TypeScript Project References
- IMPROVEMENT: Dedupe React in Vite config

## 5. Spanish Labor Law (2026)

### Requirements (Updated 2026)
- Digital-only (paper prohibited)
- 4-year retention minimum
- Immutable audit trail
- Remote Labour Inspectorate access

### Current Status
- EXCELLENT: Digital-only system
- GOOD: Audit trail
- MISSING: 4-year retention enforcement
- MISSING: Automated monthly reports
- MISSING: Employee signature flow

## Priority Recommendations

### P0 - Security (IMMEDIATE)
1. Implement tenant context (nestjs-cls)
2. Add Prisma extensions for tenant filtering
3. Validate tenant in JWT

### P1 - Core Functionality
1. Background Sync for offline clock-ins
2. IndexedDB offline queue
3. Remove manual SW registration
4. Automate monthly reports

### P2 - Compliance
1. 4-year retention enforcement
2. Employee signature flow
3. Compliance dashboard

### P3 - Performance
1. TypeScript Project References
2. Vite React deduplication
3. PostgreSQL RLS
