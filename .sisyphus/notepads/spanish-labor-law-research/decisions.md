# Architectural Decisions for Spanish Labor Law Compliance

## Decision 1: Immutability Strategy
**Decision**: Use append-only pattern with separate correction table

**Rationale**:
- Spanish law requires 4-year audit trail
- Labor Inspection must verify historical records
- No modifications/deletions allowed

**Implementation**:
- TimeEntry: No `@updatedAt`, only `@default(now())`
- Corrections: Separate table referencing original
- Updates: Only `clockOutAt` (completing incomplete record)

**Evidence**: [BOE Article 10](https://www.boe.es/buscar/act.php?id=BOE-A-2019-3481)

---

## Decision 2: Validation at API Layer
**Decision**: Enforce all validations before database write

**Rationale**:
- Prevent invalid data from entering system
- Provide immediate feedback to users
- Reduce compliance violations

**Implementation**:
- Validation service with date-fns
- BadRequestException for violations
- Log all validation failures

**Trade-offs**:
- More complex API logic
- Better data quality
- Easier compliance reporting

---

## Decision 3: Multi-Tenant Isolation
**Decision**: Enforce tenantId in all queries via Prisma middleware

**Rationale**:
- Legal requirement: each company's data separate
- Security: prevent cross-tenant data leaks
- Performance: indexed queries

**Implementation**:
```typescript
prisma.$use(async (params, next) => {
  if (params.model === 'TimeEntry') {
    params.args.where = { 
      ...params.args.where, 
      tenantId: currentTenantId 
    };
  }
  return next(params);
});
```

---

## Decision 4: Use date-fns over Luxon/Moment
**Decision**: date-fns for all time calculations

**Rationale**:
- Tree-shakeable (smaller bundle)
- TypeScript-first
- Immutable by default
- Active maintenance

**Functions needed**:
- `differenceInHours()` - Rest validation
- `differenceInDays()` - Weekly rest
- `addHours()` - Calculate required rest end
- `isAfter()`, `isBefore()` - Comparisons

**Evidence**: [date-fns GitHub](https://github.com/date-fns/date-fns)

---

## Decision 5: Separate Break Tracking
**Decision**: BreakEntry as separate model

**Rationale**:
- Legal requirement: track breaks explicitly
- Validation: 6-hour rule enforcement
- Reporting: break compliance reports

**Schema**:
```prisma
model BreakEntry {
  id          String   @id
  timeEntryId String
  startedAt   DateTime
  endedAt     DateTime?
  createdAt   DateTime @default(now())
}
```

---

## Decision 6: Compliance Violation Logging
**Decision**: Log all violations in separate table

**Rationale**:
- Audit trail for Labor Inspection
- Analytics: identify patterns
- Alerts: notify managers

**Implementation**:
```prisma
model ComplianceViolation {
  id            String   @id
  tenantId      String
  userId        String
  violationType String
  description   String
  detectedAt    DateTime @default(now())
  resolved      Boolean  @default(false)
}
```

---

## Decision 7: 4-Year Retention Strategy
**Decision**: Never delete, archive after 4 years

**Rationale**:
- Legal requirement: 4-year minimum
- Performance: mark as archived
- Storage: move to cold storage

**Implementation**:
```typescript
// Add archived field for query optimization
model TimeEntry {
  archived Boolean @default(false)
}

// Archive old records
await prisma.timeEntry.updateMany({
  where: { createdAt: { lt: subYears(new Date(), 4) } },
  data: { archived: true }
});
```

---

## Decision 8: Location Tracking (Optional)
**Decision**: Store GPS coordinates as JSON

**Rationale**:
- Some companies require location proof
- Flexible: not all companies need it
- Privacy: opt-in per company

**Schema**:
```prisma
model TimeEntry {
  location Json? // { lat: number, lng: number }
}
```

---

## Decision 9: IP Address Logging
**Decision**: Store IP address for audit trail

**Rationale**:
- Fraud prevention
- Audit trail completeness
- Labor Inspection may request

**Implementation**:
```typescript
clockInAt: new Date(),
ipAddress: req.ip,
deviceInfo: req.headers['user-agent']
```

---

## Decision 10: Weekly Rest Calculation
**Decision**: Calculate on-demand, not stored

**Rationale**:
- Complex calculation (36 consecutive hours)
- Depends on multiple entries
- Better as computed value

**Implementation**:
```typescript
async validateWeeklyRest(userId, weekStart) {
  const entries = await getWeekEntries(userId, weekStart);
  return calculateMaxConsecutiveRest(entries);
}
```
