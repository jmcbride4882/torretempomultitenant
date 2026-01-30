# Code Examples for Spanish Labor Law Compliance

## Complete Validation Service

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { differenceInHours, differenceInMinutes, addHours } from 'date-fns';

@Injectable()
export class TimeTrackingValidationService {
  
  // RD-Ley 8/2019 Article 34.3 - 12 hour rest
  validateRestPeriod(lastOut: Date, nextIn: Date) {
    const rest = differenceInHours(nextIn, lastOut);
    
    if (rest < 12) {
      const required = addHours(lastOut, 12);
      throw new BadRequestException(
        `12-hour rest required. Cannot clock in before ${required.toISOString()}`
      );
    }
  }

  // Article 34.1 - Daily limits
  validateDailyHours(clockIn: Date, clockOut: Date, max = 9) {
    const hours = differenceInHours(clockOut, clockIn);
    
    if (hours > max) {
      throw new BadRequestException(
        `Daily limit of ${max} hours exceeded (worked: ${hours}h)`
      );
    }
  }

  // Article 34.4 - Break after 6 hours
  validateBreak(clockIn: Date, now: Date, breakTaken: boolean) {
    const hours = differenceInHours(now, clockIn);
    
    if (hours >= 6 && !breakTaken) {
      throw new BadRequestException(
        'Break required after 6 continuous hours'
      );
    }
  }
}
```

## Prisma Schema

```prisma
model TimeEntry {
  id          String   @id @default(cuid())
  tenantId    String
  userId      String
  clockInAt   DateTime
  clockOutAt  DateTime?
  createdAt   DateTime @default(now())
  createdBy   String
  location    Json?
  ipAddress   String?
  
  breaks      BreakEntry[]
  corrections TimeEntryCorrection[]
  
  @@index([tenantId, userId, clockInAt])
  @@index([tenantId, createdAt])
}

model BreakEntry {
  id          String   @id @default(cuid())
  timeEntryId String
  startedAt   DateTime
  endedAt     DateTime?
  createdAt   DateTime @default(now())
  
  @@index([timeEntryId])
}

model TimeEntryCorrection {
  id              String   @id @default(cuid())
  originalEntryId String
  reason          String
  correctedIn     DateTime?
  correctedOut    DateTime?
  approvedBy      String
  approvedAt      DateTime @default(now())
  
  @@index([originalEntryId])
}
```

## Service Implementation

```typescript
@Injectable()
export class TimeTrackingService {
  constructor(
    private prisma: PrismaService,
    private validation: TimeTrackingValidationService
  ) {}

  async clockIn(userId: string, tenantId: string) {
    // Get last entry
    const last = await this.prisma.timeEntry.findFirst({
      where: { tenantId, userId, clockOutAt: { not: null } },
      orderBy: { clockOutAt: 'desc' }
    });

    // Validate 12-hour rest
    if (last?.clockOutAt) {
      this.validation.validateRestPeriod(last.clockOutAt, new Date());
    }

    // Create immutable record
    return this.prisma.timeEntry.create({
      data: {
        tenantId,
        userId,
        clockInAt: new Date(),
        createdBy: userId
      }
    });
  }

  async clockOut(userId: string, tenantId: string) {
    const active = await this.prisma.timeEntry.findFirst({
      where: { tenantId, userId, clockOutAt: null },
      include: { breaks: true }
    });

    if (!active) {
      throw new BadRequestException('No active clock-in');
    }

    const now = new Date();

    // Validate daily hours
    this.validation.validateDailyHours(active.clockInAt, now);

    // Validate break
    this.validation.validateBreak(
      active.clockInAt,
      now,
      active.breaks.length > 0
    );

    // Update with clockOut
    return this.prisma.timeEntry.update({
      where: { id: active.id },
      data: { clockOutAt: now }
    });
  }
}
```

## Controller

```typescript
@Controller('time-tracking')
export class TimeTrackingController {
  constructor(private service: TimeTrackingService) {}

  @Post('clock-in')
  async clockIn(@CurrentUser() user: User) {
    return this.service.clockIn(user.id, user.tenantId);
  }

  @Post('clock-out')
  async clockOut(@CurrentUser() user: User) {
    return this.service.clockOut(user.id, user.tenantId);
  }
}
```

## Compliance Report

```typescript
async generateReport(tenantId: string, start: Date, end: Date) {
  const entries = await this.prisma.timeEntry.findMany({
    where: {
      tenantId,
      clockInAt: { gte: start, lte: end },
      clockOutAt: { not: null }
    },
    include: { user: true }
  });

  return entries.map(e => ({
    date: format(e.clockInAt, 'yyyy-MM-dd'),
    user: e.user.name,
    clockIn: e.clockInAt,
    clockOut: e.clockOutAt,
    hours: differenceInHours(e.clockOutAt!, e.clockInAt),
    exceedsLimit: differenceInHours(e.clockOutAt!, e.clockInAt) > 9
  }));
}
```
