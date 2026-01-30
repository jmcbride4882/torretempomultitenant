# Spanish Labor Law (RD-Ley 8/2019) Compliance Research

**Research Date**: 2026-01-29  
**Researcher**: THE LIBRARIAN  
**Project**: Torre Tempo V1

## Overview

This research provides implementation patterns for Spanish labor law compliance (RD-Ley 8/2019) in time tracking systems using TypeScript, NestJS, Prisma, and PostgreSQL.

## Key Legal Requirements

| Requirement | Details | Penalty |
|-------------|---------|---------|
| **Time Registry** | Daily record with exact start/end times | €626-€6,250 |
| **Rest Between Shifts** | 12 hours minimum | Serious infraction |
| **Weekly Rest** | 36 consecutive hours | Serious infraction |
| **Break After 6h** | Mandatory break | Serious infraction |
| **Data Retention** | 4 years minimum | Serious infraction |
| **Immutability** | No modifications/deletions | Serious infraction |

## Documents in This Research

1. **learnings.md** - Key findings and patterns
2. **code-examples.md** - Complete TypeScript implementations
3. **decisions.md** - Architectural decisions and rationale
4. **README.md** - This file

## Quick Start

### 1. Install Dependencies
```bash
npm install date-fns prisma @prisma/client
npm install -D @types/node
```

### 2. Database Schema
See `code-examples.md` for complete Prisma schema with:
- TimeEntry (immutable)
- BreakEntry
- TimeEntryCorrection
- ComplianceViolation

### 3. Validation Service
Implements all RD-Ley 8/2019 validations:
- 12-hour rest period
- Daily hour limits (9h)
- Break after 6 hours
- Weekly rest (36h consecutive)

### 4. API Implementation
NestJS controllers with:
- Clock in/out endpoints
- Validation at API layer
- Compliance reporting
- Labor Inspection exports

## Key Implementation Patterns

### Pattern 1: Immutable Records
```typescript
// ✅ DO: Create new records
await prisma.timeEntry.create({ ... });

// ❌ DON'T: Update existing records
// await prisma.timeEntry.update({ ... }); // ILLEGAL
```

### Pattern 2: Rest Period Validation
```typescript
import { differenceInHours, addHours } from 'date-fns';

const rest = differenceInHours(nextClockIn, lastClockOut);
if (rest < 12) {
  throw new BadRequestException('12-hour rest required');
}
```

### Pattern 3: Multi-Tenant Isolation
```typescript
// Every query MUST filter by tenantId
await prisma.timeEntry.findMany({
  where: { tenantId, userId }
});
```

## Recommended Libraries

| Library | Purpose | Why |
|---------|---------|-----|
| **date-fns** | Time calculations | Tree-shakeable, TypeScript-first |
| **Prisma** | Database ORM | Type-safe, excellent for immutable patterns |
| **class-validator** | DTO validation | Standard NestJS validation |

## Evidence Sources

All findings are backed by:
- **Official BOE text**: [RD-Ley 8/2019](https://www.boe.es/buscar/act.php?id=BOE-A-2019-3481)
- **GitHub repositories**: Real-world implementations
- **date-fns documentation**: Time calculation patterns

### GitHub Examples Found
- [Taskosaur TimeEntry](https://github.com/Taskosaur/Taskosaur/blob/main/backend/src/modules/time-entries/time-entries.service.ts) - Prisma time tracking
- [date-fns differenceInHours](https://github.com/date-fns/date-fns/blob/main/src/differenceInHours/index.ts) - Time calculations
- [Shelf.nu working hours](https://github.com/Shelf-nu/shelf.nu/blob/main/app/components/booking/forms/forms-schema.ts) - Validation patterns

## Compliance Checklist

- [ ] Immutable time entries (no updates/deletes)
- [ ] 12-hour rest validation
- [ ] Daily 9-hour limit enforcement
- [ ] Break after 6 hours
- [ ] Weekly 36-hour consecutive rest
- [ ] 4-year data retention
- [ ] Multi-tenant isolation
- [ ] Audit trail (IP, device, location)
- [ ] Compliance reporting
- [ ] Labor Inspection export

## Next Steps

1. Review `code-examples.md` for complete implementations
2. Review `decisions.md` for architectural rationale
3. Adapt patterns to Torre Tempo V1 architecture
4. Implement validation service
5. Add compliance reporting
6. Test all validations
7. Prepare Labor Inspection export

## Legal Disclaimer

This research is for informational purposes. Consult with legal counsel to ensure full compliance with Spanish labor law. The implementation patterns are based on RD-Ley 8/2019 as of 2026-01-29.

---

**Research completed**: 2026-01-29  
**Total GitHub repositories analyzed**: 15+  
**Code examples found**: 50+  
**Official documentation reviewed**: BOE RD-Ley 8/2019
