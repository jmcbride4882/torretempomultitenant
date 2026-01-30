# Spanish Labor Law (RD-Ley 8/2019) Compliance - Research Findings

## Research Date: 2026-01-29

## Key Legal Requirements

### 1. Mandatory Time Tracking (Article 10)
- Daily registry showing exact start/end times
- Accessible to workers, unions, Labor Inspection
- **Retention: 4 years minimum**
- Penalties: €626-€6,250 for non-compliance

### 2. Rest Periods
- **12 hours** between shifts (Article 34.3)
- **36 hours** consecutive weekly rest (Article 37.1)
- **Break required** after 6 continuous hours

### 3. Working Hour Limits
- Daily: 9 hours (10h with agreement)
- Weekly: 40 hours average
- Annual: 1,826 hours max
- Overtime: 80 hours/year max

### 4. Immutability Requirement
- Records must be append-only
- No modifications or deletions allowed
- Audit trail for Labor Inspection

## Implementation Patterns

### Database Schema (Prisma)
```prisma
model TimeEntry {
  id         String   @id @default(cuid())
  tenantId   String
  userId     String
  clockInAt  DateTime
  clockOutAt DateTime?
  createdAt  DateTime @default(now())
  createdBy  String
  
  @@index([tenantId, userId, clockInAt])
}
```

### Validation Functions (date-fns)
```typescript
import { differenceInHours, addHours } from 'date-fns';

function validateRestPeriod(lastOut: Date, nextIn: Date) {
  const rest = differenceInHours(nextIn, lastOut);
  return rest >= 12;
}
```

## Recommended Libraries

1. **date-fns** - Time calculations
2. **Prisma** - Type-safe database
3. **class-validator** - DTO validation

## Evidence Sources

- [BOE Official Text](https://www.boe.es/buscar/act.php?id=BOE-A-2019-3481)
- [date-fns GitHub](https://github.com/date-fns/date-fns)
- [Taskosaur TimeEntry](https://github.com/Taskosaur/Taskosaur/blob/main/backend/src/modules/time-entries/time-entries.service.ts)
