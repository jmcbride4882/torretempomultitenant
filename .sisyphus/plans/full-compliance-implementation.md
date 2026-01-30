# Torre Tempo - Full Spanish Labor Law Compliance Implementation Plan

**Created:** 2026-01-29  
**Status:** Planning  
**Target:** v1.0 Production Release  
**Legal Basis:** RD-Ley 8/2019, Estatuto de los Trabajadores Article 34

---

## Executive Summary

This plan outlines all features required to make Torre Tempo a fully-fledged internal time tracking system that complies with Spanish labor law (RD-Ley 8/2019). Based on comprehensive legal research and current implementation audit, we've identified **critical gaps** that must be addressed before production deployment for LSLT Group staff.

**Current State:** ~85% complete (core features working)  
**Target State:** 100% legally compliant + production-ready  
**Estimated Effort:** 3-4 weeks (1 developer)

---

## Legal Compliance Requirements (RD-Ley 8/2019)

### ✅ ALREADY IMPLEMENTED

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Record start/end time per worker per day | ✅ Complete | TimeEntry model with clockIn/clockOut |
| Store for 4+ years | ✅ Complete | No deletion, retention service exists |
| Employee can view own records | ✅ Complete | ClockingPage shows recent entries |
| Manager can view team records | ✅ Complete | ManagerDashboard + approvals |
| Export capability for inspector | ✅ Complete | ReportsService with PDF/CSV/XLSX |
| Audit log for all changes | ✅ Complete | AuditLog model + AuditService |
| Multi-tenant isolation | ✅ Complete | tenantId on all models |
| Immutable records | ✅ Complete | EditRequest approval workflow |

### ❌ CRITICAL GAPS (Must Fix for v1.0)

| Requirement | Status | Impact | Priority |
|-------------|--------|--------|----------|
| **12-hour rest validation** | ❌ Missing | Legal violation | P0 |
| **Daily 9-hour limit enforcement** | ❌ Missing | Legal violation | P0 |
| **Break after 6 hours** | ❌ Missing | Legal violation | P0 |
| **Weekly 36-hour rest validation** | ❌ Missing | Legal violation | P0 |
| **Overtime tracking** | ❌ Missing | Legal violation | P0 |
| **Convenio rule engine** | ❌ Missing | Legal violation | P0 |
| **Report signature acknowledgment** | ⚠️ Partial | Legal requirement | P1 |
| **Real-time inspector access** | ❌ Missing | Future requirement | P2 |

---

## Feature Implementation Plan

### PHASE 1: Critical Compliance (P0) - Week 1-2

#### 1.1 Compliance Validation Service (CRITICAL)

**Legal Basis:** RD-Ley 8/2019 + Estatuto de los Trabajadores Article 34

**Requirements:**
- [ ] **12-hour rest between shifts** - Validate before allowing clock-in
- [ ] **Daily 9-hour limit** - Warn at 8h, block at 9h (unless convenio allows)
- [ ] **Break after 6 hours** - Require break entry after 6h continuous work
- [ ] **Weekly 36-hour consecutive rest** - Validate weekly schedule
- [ ] **Under-18 limits** - 8h daily max, 30min break after 4.5h

**Implementation:**
```typescript
// apps/api/src/compliance/compliance.service.ts
class ComplianceService {
  // ALREADY EXISTS - needs enhancement
  
  async validateClockIn(userId: string, tenantId: string): Promise<ValidationResult> {
    // ✅ Check if already clocked in (EXISTS)
    // ❌ ADD: Check 12-hour rest since last clock-out
    // ❌ ADD: Check weekly hours not exceeded
    // ❌ ADD: Check convenio-specific rules
  }
  
  async validateClockOut(entryId: string): Promise<ValidationResult> {
    // ❌ ADD: Check if break required (6+ hours)
    // ❌ ADD: Calculate overtime if daily limit exceeded
    // ❌ ADD: Flag compliance violations
  }
  
  async validateWeeklyRest(userId: string, weekStart: Date): Promise<boolean> {
    // ❌ NEW: Calculate consecutive rest hours
    // ❌ NEW: Ensure 36+ hours uninterrupted
  }
  
  async checkBreakRequirement(entryId: string): Promise<BreakRequirement> {
    // ❌ NEW: Check if 6+ hours worked
    // ❌ NEW: Check if break already taken
    // ❌ NEW: Return required break duration
  }
}
```

**Files to Modify:**
- `apps/api/src/compliance/compliance.service.ts` - Add validation methods
- `apps/api/src/compliance/compliance.controller.ts` - Add validation endpoints
- `apps/api/src/time-tracking/time-tracking.service.ts` - Call validation before clock-in/out
- `apps/web/src/features/clocking/ClockingPage.tsx` - Show validation errors

**Testing:**
- [ ] Unit tests for each validation rule
- [ ] Integration tests with real time entries
- [ ] Edge cases: midnight crossover, DST changes, timezone handling

**Acceptance Criteria:**
- Clock-in blocked if <12h rest since last clock-out
- Warning shown at 8h worked, blocked at 9h
- Break prompt shown after 6h continuous work
- Weekly rest validation prevents scheduling violations

---

#### 1.2 Break Tracking System (CRITICAL)

**Legal Basis:** Estatuto de los Trabajadores Article 34.4

**Requirements:**
- [ ] Break entry model (start/end times)
- [ ] Break tracking UI in ClockingPage
- [ ] Break validation (minimum 15 minutes)
- [ ] Break enforcement after 6 hours
- [ ] Break reporting in monthly reports

**Database Schema:**
```prisma
// apps/api/prisma/schema.prisma
model BreakEntry {
  id          String    @id @default(uuid()) @db.Uuid
  timeEntryId String    @db.Uuid
  timeEntry   TimeEntry @relation(fields: [timeEntryId], references: [id])
  
  startedAt   DateTime
  endedAt     DateTime?
  
  createdAt   DateTime  @default(now())
  
  @@map("break_entries")
}

// Add to TimeEntry model:
model TimeEntry {
  // ... existing fields
  breaks      BreakEntry[]
}
```

**API Implementation:**
```typescript
// apps/api/src/time-tracking/dto/start-break.dto.ts
export class StartBreakDto {
  @IsUUID()
  timeEntryId: string;
}

// apps/api/src/time-tracking/time-tracking.controller.ts
@Post('breaks/start')
async startBreak(@Body() dto: StartBreakDto) {
  return this.timeTrackingService.startBreak(dto.timeEntryId);
}

@Post('breaks/end')
async endBreak(@Body() dto: { breakId: string }) {
  return this.timeTrackingService.endBreak(dto.breakId);
}
```

**UI Implementation:**
```tsx
// apps/web/src/features/clocking/ClockingPage.tsx
// Add break tracking section:
{currentEntry && (
  <div className="break-section">
    {!activeBreak ? (
      <button onClick={handleStartBreak}>
        Start Break
      </button>
    ) : (
      <div>
        <p>Break started: {formatTime(activeBreak.startedAt)}</p>
        <button onClick={handleEndBreak}>
          End Break
        </button>
      </div>
    )}
  </div>
)}
```

**Files to Create/Modify:**
- `apps/api/prisma/schema.prisma` - Add BreakEntry model
- `apps/api/src/time-tracking/dto/start-break.dto.ts` - New DTO
- `apps/api/src/time-tracking/time-tracking.service.ts` - Add break methods
- `apps/api/src/time-tracking/time-tracking.controller.ts` - Add break endpoints
- `apps/web/src/features/clocking/ClockingPage.tsx` - Add break UI

**Testing:**
- [ ] Can start break during active time entry
- [ ] Cannot start break when not clocked in
- [ ] Break duration calculated correctly
- [ ] Break time excluded from worked hours
- [ ] Multiple breaks per shift supported

---

#### 1.3 Overtime Tracking & Calculation (CRITICAL)

**Legal Basis:** Estatuto de los Trabajadores Article 35

**Requirements:**
- [ ] Automatic overtime detection (>9h daily, >40h weekly)
- [ ] Overtime approval workflow
- [ ] Overtime compensation tracking (time off vs. pay)
- [ ] 80-hour annual overtime limit enforcement
- [ ] Overtime reporting

**Database Schema:**
```prisma
// apps/api/prisma/schema.prisma
model OvertimeEntry {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  userId      String   @db.Uuid
  user        User     @relation(fields: [userId], references: [id])
  
  timeEntryId String   @db.Uuid
  timeEntry   TimeEntry @relation(fields: [timeEntryId], references: [id])
  
  hours       Float    // Overtime hours
  type        OvertimeType @default(ORDINARY)
  
  // Compensation
  compensationType CompensationType @default(TIME_OFF)
  compensatedAt    DateTime?
  
  // Approval
  approvedById String?  @db.Uuid
  approvedBy   User?    @relation("OvertimeApprovedBy", fields: [approvedById], references: [id])
  approvedAt   DateTime?
  
  createdAt   DateTime @default(now())
  
  @@index([tenantId, userId, createdAt])
  @@map("overtime_entries")
}

enum OvertimeType {
  ORDINARY      // Normal overtime
  FORCE_MAJEURE // Emergency/force majeure (exempt from 80h limit)
}

enum CompensationType {
  TIME_OFF // Compensated with time off (within 4 months)
  PAY      // Compensated with pay (175% minimum)
}
```

**API Implementation:**
```typescript
// apps/api/src/time-tracking/time-tracking.service.ts
async clockOut(entryId: string, clockOutData: ClockOutDto) {
  // ... existing clock-out logic
  
  // Calculate overtime
  const workedHours = differenceInHours(clockOut, entry.clockIn);
  const dailyLimit = await this.getDailyLimit(entry.tenantId); // From convenio
  
  if (workedHours > dailyLimit) {
    const overtimeHours = workedHours - dailyLimit;
    await this.createOvertimeEntry({
      timeEntryId: entryId,
      userId: entry.userId,
      hours: overtimeHours,
      type: OvertimeType.ORDINARY,
    });
  }
  
  // Check annual overtime limit
  const annualOvertime = await this.getAnnualOvertime(entry.userId);
  if (annualOvertime > 80) {
    await this.flagComplianceViolation({
      userId: entry.userId,
      type: 'OVERTIME_LIMIT_EXCEEDED',
      description: `Annual overtime limit exceeded: ${annualOvertime}h`,
    });
  }
}
```

**Files to Create/Modify:**
- `apps/api/prisma/schema.prisma` - Add OvertimeEntry model
- `apps/api/src/time-tracking/time-tracking.service.ts` - Add overtime calculation
- `apps/api/src/overtime/overtime.service.ts` - New service for overtime management
- `apps/api/src/overtime/overtime.controller.ts` - New controller
- `apps/web/src/features/overtime/OvertimePage.tsx` - New page for overtime management

**Testing:**
- [ ] Overtime detected when >9h worked
- [ ] Overtime requires approval
- [ ] Annual 80h limit enforced
- [ ] Compensation tracking works
- [ ] Force majeure overtime exempt from limit

---

#### 1.4 Convenio Rule Engine (CRITICAL)

**Legal Basis:** Collective agreements (convenios colectivos)

**Requirements:**
- [ ] Configurable rule engine per tenant
- [ ] Support for different convenios (Hosteleria Murcia, etc.)
- [ ] Weekly/annual hour limits
- [ ] Night work premiums (10pm-6am)
- [ ] Holiday work rules
- [ ] Custom break requirements

**Database Schema:**
```prisma
// apps/api/prisma/schema.prisma
model ConvenioRule {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id])
  
  ruleType String // WEEKLY_HOURS, ANNUAL_HOURS, NIGHT_PREMIUM, etc.
  config   Json   // Flexible JSON config
  
  isActive Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("convenio_rules")
}

// Add to Tenant model:
model Tenant {
  // ... existing fields
  convenioRules ConvenioRule[]
}
```

**Rule Engine Implementation:**
```typescript
// apps/api/src/compliance/convenio-engine.service.ts
@Injectable()
export class ConvenioEngineService {
  async evaluateRules(
    tenantId: string,
    userId: string,
    action: 'CLOCK_IN' | 'CLOCK_OUT',
    context: any
  ): Promise<RuleEvaluationResult> {
    const rules = await this.getActiveRules(tenantId);
    const violations: RuleViolation[] = [];
    
    for (const rule of rules) {
      const result = await this.evaluateRule(rule, userId, action, context);
      if (!result.passed) {
        violations.push(result.violation);
      }
    }
    
    return {
      passed: violations.length === 0,
      violations,
    };
  }
  
  private async evaluateRule(
    rule: ConvenioRule,
    userId: string,
    action: string,
    context: any
  ): Promise<RuleResult> {
    switch (rule.ruleType) {
      case 'WEEKLY_HOURS':
        return this.checkWeeklyHours(userId, rule.config);
      case 'ANNUAL_HOURS':
        return this.checkAnnualHours(userId, rule.config);
      case 'NIGHT_PREMIUM':
        return this.checkNightWork(context.clockIn, context.clockOut, rule.config);
      // ... more rule types
    }
  }
}
```

**Files to Create:**
- `apps/api/src/compliance/convenio-engine.service.ts` - Rule engine
- `apps/api/src/compliance/dto/convenio-rule.dto.ts` - DTOs
- `apps/api/prisma/schema.prisma` - Add ConvenioRule model
- `apps/web/src/features/settings/ConvenioRulesPage.tsx` - UI for rule management

**Testing:**
- [ ] Weekly hour limit enforced (40h Hosteleria Murcia)
- [ ] Annual hour limit enforced (1,822h Hosteleria Murcia)
- [ ] Night work premium calculated (25% 1am-6am)
- [ ] Rules can be enabled/disabled per tenant
- [ ] Multiple rules can be active simultaneously

---

### PHASE 2: Enhanced Compliance (P1) - Week 2-3

#### 2.1 Report Signature & Acknowledgment (P1)

**Legal Basis:** RD-Ley 8/2019 requires employee acknowledgment

**Current State:** 
- ✅ Report generation works (PDF/CSV/XLSX)
- ✅ Signature model exists
- ⚠️ Signature capture component exists but not integrated
- ❌ Acknowledgment workflow missing

**Requirements:**
- [ ] Employee must review and sign monthly reports
- [ ] Signature captured with timestamp, IP, device
- [ ] Signed reports immutable
- [ ] Unsigned reports flagged for follow-up
- [ ] Signature integrity verification (hash)

**Implementation:**
```typescript
// apps/api/src/reports/reports.service.ts
async acknowledgeReport(
  reportId: string,
  userId: string,
  signatureData: string,
  ipAddress: string,
  userAgent: string
): Promise<Signature> {
  // Verify user has access to this report
  const report = await this.getReport(reportId);
  if (report.type !== ReportType.MONTHLY_EMPLOYEE) {
    throw new BadRequestException('Only employee reports can be signed');
  }
  
  // Create signature
  const signature = await this.prisma.signature.create({
    data: {
      reportId,
      userId,
      imageBase64: signatureData,
      ipAddress,
      userAgent,
      acknowledgedAt: new Date(),
    },
  });
  
  // Generate integrity hash
  const hash = this.generateSignatureHash(report, signature);
  await this.prisma.report.update({
    where: { id: reportId },
    data: { fileHash: hash },
  });
  
  return signature;
}
```

**UI Implementation:**
```tsx
// apps/web/src/features/reports/ReportAcknowledgmentModal.tsx
function ReportAcknowledgmentModal({ report, onClose }: Props) {
  const sigRef = useRef<SignatureCanvas>(null);
  
  const handleSign = async () => {
    const signatureData = sigRef.current?.toDataURL('image/png');
    await acknowledgeReport(report.id, signatureData);
    onClose();
  };
  
  return (
    <Modal>
      <h2>Acknowledge Monthly Report</h2>
      <p>Review your time entries for {report.period}</p>
      
      {/* Show report summary */}
      <ReportSummary report={report} />
      
      {/* Signature canvas */}
      <SignatureCanvas ref={sigRef} />
      
      <button onClick={handleSign}>Sign & Acknowledge</button>
    </Modal>
  );
}
```

**Files to Modify:**
- `apps/api/src/reports/reports.service.ts` - Add acknowledgment method
- `apps/api/src/reports/reports.controller.ts` - Add acknowledgment endpoint
- `apps/web/src/features/reports/MyReportsPage.tsx` - Add acknowledgment flow
- `apps/web/src/features/reports/ReportAcknowledgmentModal.tsx` - New component
- `apps/web/src/components/SignatureCanvas.tsx` - Integrate existing component

**Testing:**
- [ ] Employee can view unsigned reports
- [ ] Signature captured correctly
- [ ] Signed reports cannot be modified
- [ ] Signature hash verifies integrity
- [ ] Manager can see who signed/unsigned

---

#### 2.2 Compliance Violation Dashboard (P1)

**Current State:**
- ✅ ComplianceViolation model exists in schema
- ❌ No UI for viewing violations
- ❌ No automated violation detection

**Requirements:**
- [ ] Automated violation detection on clock-in/out
- [ ] Violation dashboard for managers/admins
- [ ] Violation resolution workflow
- [ ] Violation reporting for Labor Inspection
- [ ] Email alerts for critical violations

**Implementation:**
```typescript
// apps/api/src/compliance/compliance.service.ts
async detectViolations(timeEntry: TimeEntry): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = [];
  
  // Check 12-hour rest
  const lastEntry = await this.getLastEntry(timeEntry.userId);
  if (lastEntry) {
    const rest = differenceInHours(timeEntry.clockIn, lastEntry.clockOut);
    if (rest < 12) {
      violations.push(await this.createViolation({
        tenantId: timeEntry.tenantId,
        userId: timeEntry.userId,
        type: 'INSUFFICIENT_REST',
        severity: 'SERIOUS',
        description: `Only ${rest}h rest between shifts (12h required)`,
        entityId: timeEntry.id,
      }));
    }
  }
  
  // Check daily limit
  const workedHours = differenceInHours(timeEntry.clockOut, timeEntry.clockIn);
  if (workedHours > 9) {
    violations.push(await this.createViolation({
      tenantId: timeEntry.tenantId,
      userId: timeEntry.userId,
      type: 'DAILY_LIMIT_EXCEEDED',
      severity: 'SERIOUS',
      description: `Worked ${workedHours}h (9h limit)`,
      entityId: timeEntry.id,
    }));
  }
  
  // Check break requirement
  if (workedHours > 6) {
    const breaks = await this.getBreaks(timeEntry.id);
    if (breaks.length === 0) {
      violations.push(await this.createViolation({
        tenantId: timeEntry.tenantId,
        userId: timeEntry.userId,
        type: 'MISSING_BREAK',
        severity: 'SERIOUS',
        description: `No break taken after ${workedHours}h work`,
        entityId: timeEntry.id,
      }));
    }
  }
  
  return violations;
}
```

**Database Schema Enhancement:**
```prisma
// apps/api/prisma/schema.prisma
model ComplianceViolation {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id])
  
  userId   String @db.Uuid
  user     User   @relation(fields: [userId], references: [id])
  
  type        String // INSUFFICIENT_REST, DAILY_LIMIT_EXCEEDED, etc.
  severity    ViolationSeverity
  description String
  
  entityType String? // TimeEntry, Schedule, etc.
  entityId   String? @db.Uuid
  
  // Resolution
  resolved      Boolean  @default(false)
  resolvedById  String?  @db.Uuid
  resolvedBy    User?    @relation("ResolvedBy", fields: [resolvedById], references: [id])
  resolvedAt    DateTime?
  resolutionNote String?
  
  detectedAt DateTime @default(now())
  
  @@index([tenantId, resolved, detectedAt])
  @@map("compliance_violations")
}

enum ViolationSeverity {
  MINOR   // Leve (€626-€6,250)
  SERIOUS // Grave (€6,251-€25,000)
  VERY_SERIOUS // Muy grave (€25,001-€187,515)
}
```

**UI Implementation:**
```tsx
// apps/web/src/features/compliance/ComplianceViolationsPage.tsx
function ComplianceViolationsPage() {
  const { data: violations } = useQuery({
    queryKey: ['violations'],
    queryFn: () => api.get('/compliance/violations'),
  });
  
  return (
    <div>
      <h1>Compliance Violations</h1>
      
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <h3>Minor</h3>
          <p className="text-2xl">{violations.minor}</p>
        </Card>
        <Card>
          <h3>Serious</h3>
          <p className="text-2xl text-orange-600">{violations.serious}</p>
        </Card>
        <Card>
          <h3>Very Serious</h3>
          <p className="text-2xl text-red-600">{violations.verySevere}</p>
        </Card>
      </div>
      
      {/* Violation list */}
      <ViolationList violations={violations.items} />
    </div>
  );
}
```

**Files to Create/Modify:**
- `apps/api/prisma/schema.prisma` - Enhance ComplianceViolation model
- `apps/api/src/compliance/compliance.service.ts` - Add violation detection
- `apps/api/src/compliance/compliance.controller.ts` - Add violation endpoints
- `apps/web/src/features/compliance/ComplianceViolationsPage.tsx` - New page
- `apps/web/src/features/compliance/ViolationList.tsx` - New component

**Testing:**
- [ ] Violations detected automatically on clock-out
- [ ] Violations categorized by severity
- [ ] Manager can view team violations
- [ ] Violations can be resolved with notes
- [ ] Export violations for Labor Inspection

---

#### 2.3 Enhanced Scheduling Features (P1)

**Current State:**
- ✅ Basic shift management works
- ✅ Schedule assignment works
- ⚠️ No shift templates
- ⚠️ No recurring schedules
- ❌ No shift swap requests

**Requirements:**
- [ ] Shift templates (reusable shift patterns)
- [ ] Recurring schedule generation (weekly/monthly)
- [ ] Shift swap requests (employee-initiated)
- [ ] Schedule conflict detection
- [ ] Schedule compliance validation

**Implementation:**
```typescript
// apps/api/src/scheduling/scheduling.service.ts
async createRecurringSchedule(dto: CreateRecurringScheduleDto) {
  const { userId, shiftId, startDate, endDate, daysOfWeek } = dto;
  
  const schedules: Schedule[] = [];
  let currentDate = startDate;
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    
    if (daysOfWeek.includes(dayOfWeek)) {
      // Check for conflicts
      const conflicts = await this.checkScheduleConflicts(userId, currentDate);
      if (conflicts.length === 0) {
        schedules.push(await this.createSchedule({
          userId,
          shiftId,
          date: currentDate,
          isPublished: false,
        }));
      }
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return schedules;
}

async requestShiftSwap(dto: ShiftSwapRequestDto) {
  const { scheduleId, targetUserId, reason } = dto;
  
  // Verify both users have compatible roles/locations
  const schedule = await this.getSchedule(scheduleId);
  const targetUser = await this.usersService.findOne(targetUserId);
  
  // Create swap request
  return this.prisma.shiftSwapRequest.create({
    data: {
      scheduleId,
      requestedById: schedule.userId,
      targetUserId,
      reason,
      status: 'PENDING',
    },
  });
}
```

**Database Schema:**
```prisma
// apps/api/prisma/schema.prisma
model ShiftTemplate {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id])
  
  name        String
  description String?
  
  // Pattern (e.g., [1,2,3,4,5] for Mon-Fri)
  daysOfWeek  Int[]
  
  shiftId String @db.Uuid
  shift   Shift  @relation(fields: [shiftId], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("shift_templates")
}

model ShiftSwapRequest {
  id         String @id @default(uuid()) @db.Uuid
  scheduleId String @db.Uuid
  schedule   Schedule @relation(fields: [scheduleId], references: [id])
  
  requestedById String @db.Uuid
  requestedBy   User   @relation("SwapRequester", fields: [requestedById], references: [id])
  
  targetUserId String @db.Uuid
  targetUser   User   @relation("SwapTarget", fields: [targetUserId], references: [id])
  
  reason String
  
  status       SwapStatus @default(PENDING)
  approvedById String?    @db.Uuid
  approvedBy   User?      @relation("SwapApprover", fields: [approvedById], references: [id])
  approvedAt   DateTime?
  
  createdAt DateTime @default(now())
  
  @@map("shift_swap_requests")
}

enum SwapStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}
```

**Files to Create/Modify:**
- `apps/api/prisma/schema.prisma` - Add ShiftTemplate, ShiftSwapRequest models
- `apps/api/src/scheduling/scheduling.service.ts` - Add recurring schedules, swap requests
- `apps/api/src/scheduling/dto/recurring-schedule.dto.ts` - New DTOs
- `apps/web/src/features/scheduling/ShiftTemplatesPage.tsx` - New page
- `apps/web/src/features/scheduling/ShiftSwapRequestsPage.tsx` - New page

**Testing:**
- [ ] Recurring schedules generated correctly
- [ ] Shift templates can be created and reused
- [ ] Shift swap requests require approval
- [ ] Schedule conflicts detected
- [ ] Compliance rules enforced in scheduling

---

### PHASE 3: Production Readiness (P2) - Week 3-4

#### 3.1 Real-Time Inspector Access (P2)

**Legal Basis:** Draft Royal Decree 2025-2026 (future requirement)

**Requirements:**
- [ ] Inspector role with read-only access
- [ ] Real-time data export API
- [ ] Audit log of inspector access
- [ ] Secure authentication for inspectors
- [ ] Compliance report generation on-demand

**Implementation:**
```typescript
// apps/api/src/inspector/inspector.controller.ts
@Controller('inspector')
@UseGuards(InspectorAuthGuard)
export class InspectorController {
  @Get('tenants/:tenantId/time-entries')
  async getTimeEntries(
    @Param('tenantId') tenantId: string,
    @Query() query: InspectorQueryDto
  ) {
    // Log inspector access
    await this.auditService.log({
      action: 'INSPECTOR_ACCESS',
      entity: 'TimeEntry',
      tenantId,
      actorRole: 'INSPECTOR',
    });
    
    // Return time entries with full audit trail
    return this.timeTrackingService.getEntriesForInspector(tenantId, query);
  }
  
  @Get('tenants/:tenantId/compliance-report')
  async getComplianceReport(@Param('tenantId') tenantId: string) {
    return this.reportsService.generateComplianceReport(tenantId);
  }
}
```

**Files to Create:**
- `apps/api/src/inspector/inspector.controller.ts` - New controller
- `apps/api/src/inspector/inspector.service.ts` - New service
- `apps/api/src/inspector/inspector-auth.guard.ts` - New guard
- `apps/api/src/inspector/dto/inspector-query.dto.ts` - New DTOs

**Testing:**
- [ ] Inspector can access all tenant data
- [ ] Inspector cannot modify data
- [ ] All inspector access logged
- [ ] Compliance reports generated correctly
- [ ] Secure authentication enforced

---

#### 3.2 Advanced Reporting Features (P2)

**Current State:**
- ✅ Basic PDF/CSV/XLSX export works
- ❌ No custom report builder
- ❌ No report scheduling
- ❌ No email delivery

**Requirements:**
- [ ] Custom report builder (select fields, filters, date ranges)
- [ ] Scheduled report generation (monthly auto-generation)
- [ ] Email delivery of reports
- [ ] Report templates
- [ ] Advanced analytics (charts, graphs)

**Implementation:**
```typescript
// apps/api/src/reports/reports.service.ts
async scheduleMonthlyReports(tenantId: string) {
  // Schedule job to run on 1st of each month
  const job = await this.queueService.addJob('generate-monthly-reports', {
    tenantId,
    period: format(new Date(), 'yyyy-MM'),
  }, {
    repeat: {
      cron: '0 0 1 * *', // 1st of each month at midnight
    },
  });
  
  return job;
}

async generateCustomReport(dto: CustomReportDto) {
  const { tenantId, fields, filters, dateRange, format } = dto;
  
  // Build dynamic query based on filters
  const query = this.buildReportQuery(filters, dateRange);
  const data = await this.prisma.timeEntry.findMany(query);
  
  // Generate report in requested format
  switch (format) {
    case 'PDF':
      return this.generatePDF(data, fields);
    case 'CSV':
      return this.generateCSV(data, fields);
    case 'XLSX':
      return this.generateXLSX(data, fields);
  }
}
```

**Files to Create/Modify:**
- `apps/api/src/reports/reports.service.ts` - Add custom reports, scheduling
- `apps/api/src/reports/dto/custom-report.dto.ts` - New DTOs
- `apps/api/src/queue/queue.service.ts` - Add report scheduling
- `apps/web/src/features/reports/CustomReportBuilder.tsx` - New component

**Testing:**
- [ ] Custom reports generated with selected fields
- [ ] Scheduled reports run automatically
- [ ] Email delivery works
- [ ] Report templates can be saved and reused
- [ ] Charts and graphs render correctly

---

#### 3.3 Notification System (P2)

**Current State:**
- ❌ No notification system
- ❌ No email alerts
- ❌ No push notifications

**Requirements:**
- [ ] In-app notification center
- [ ] Email notifications (violations, approvals, reports)
- [ ] Push notifications (PWA)
- [ ] Notification preferences per user
- [ ] Notification history

**Implementation:**
```typescript
// apps/api/src/notifications/notifications.service.ts
@Injectable()
export class NotificationsService {
  async sendNotification(dto: SendNotificationDto) {
    const { userId, type, title, message, data } = dto;
    
    // Create in-app notification
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
        read: false,
      },
    });
    
    // Send email if user has email notifications enabled
    const user = await this.usersService.findOne(userId);
    if (user.emailNotifications) {
      await this.emailService.send({
        to: user.email,
        subject: title,
        body: message,
      });
    }
    
    // Send push notification if user has push enabled
    if (user.pushNotifications && user.pushSubscription) {
      await this.pushService.send(user.pushSubscription, {
        title,
        body: message,
        data,
      });
    }
    
    return notification;
  }
  
  async notifyComplianceViolation(violation: ComplianceViolation) {
    // Notify user
    await this.sendNotification({
      userId: violation.userId,
      type: 'COMPLIANCE_VIOLATION',
      title: 'Compliance Violation Detected',
      message: violation.description,
      data: { violationId: violation.id },
    });
    
    // Notify manager
    const manager = await this.usersService.getManager(violation.userId);
    if (manager) {
      await this.sendNotification({
        userId: manager.id,
        type: 'TEAM_VIOLATION',
        title: 'Team Member Compliance Violation',
        message: `${violation.user.firstName} ${violation.user.lastName}: ${violation.description}`,
        data: { violationId: violation.id },
      });
    }
  }
}
```

**Database Schema:**
```prisma
// apps/api/prisma/schema.prisma
model Notification {
  id     String @id @default(uuid()) @db.Uuid
  userId String @db.Uuid
  user   User   @relation(fields: [userId], references: [id])
  
  type    NotificationType
  title   String
  message String
  data    Json?
  
  read   Boolean  @default(false)
  readAt DateTime?
  
  createdAt DateTime @default(now())
  
  @@index([userId, read, createdAt])
  @@map("notifications")
}

enum NotificationType {
  COMPLIANCE_VIOLATION
  APPROVAL_REQUEST
  APPROVAL_DECISION
  REPORT_READY
  SCHEDULE_PUBLISHED
  SHIFT_SWAP_REQUEST
  SYSTEM_ALERT
}

// Add to User model:
model User {
  // ... existing fields
  emailNotifications Boolean @default(true)
  pushNotifications  Boolean @default(false)
  pushSubscription   Json?
  notifications      Notification[]
}
```

**Files to Create:**
- `apps/api/src/notifications/notifications.service.ts` - New service
- `apps/api/src/notifications/notifications.controller.ts` - New controller
- `apps/api/src/notifications/email.service.ts` - Email service
- `apps/api/src/notifications/push.service.ts` - Push notification service
- `apps/api/prisma/schema.prisma` - Add Notification model
- `apps/web/src/features/notifications/NotificationCenter.tsx` - New component
- `apps/web/src/features/notifications/NotificationBell.tsx` - New component

**Testing:**
- [ ] In-app notifications displayed
- [ ] Email notifications sent
- [ ] Push notifications work on PWA
- [ ] Notification preferences respected
- [ ] Notification history accessible

---

#### 3.4 Settings & Configuration (P2)

**Current State:**
- ⚠️ TenantSettingsPage exists but is stub/placeholder
- ❌ No user profile settings
- ❌ No notification preferences

**Requirements:**
- [ ] Tenant settings (convenio, hours, locale, timezone)
- [ ] User profile settings (name, email, password, locale)
- [ ] Notification preferences
- [ ] Privacy settings
- [ ] Account management

**Implementation:**
```tsx
// apps/web/src/features/settings/TenantSettingsPage.tsx
function TenantSettingsPage() {
  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => api.get('/tenants/current'),
  });
  
  return (
    <div>
      <h1>Tenant Settings</h1>
      
      <Tabs>
        <Tab label="General">
          <GeneralSettings tenant={tenant} />
        </Tab>
        <Tab label="Labor Law">
          <LaborLawSettings tenant={tenant} />
        </Tab>
        <Tab label="Locations">
          <LocationSettings tenant={tenant} />
        </Tab>
        <Tab label="Convenio Rules">
          <ConvenioRulesSettings tenant={tenant} />
        </Tab>
      </Tabs>
    </div>
  );
}

// apps/web/src/features/settings/UserProfilePage.tsx
function UserProfilePage() {
  const { data: user } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => api.get('/users/me'),
  });
  
  return (
    <div>
      <h1>My Profile</h1>
      
      <Tabs>
        <Tab label="Profile">
          <ProfileForm user={user} />
        </Tab>
        <Tab label="Security">
          <SecuritySettings user={user} />
        </Tab>
        <Tab label="Notifications">
          <NotificationPreferences user={user} />
        </Tab>
        <Tab label="Privacy">
          <PrivacySettings user={user} />
        </Tab>
      </Tabs>
    </div>
  );
}
```

**Files to Modify/Create:**
- `apps/web/src/features/settings/TenantSettingsPage.tsx` - Complete implementation
- `apps/web/src/features/settings/UserProfilePage.tsx` - New page
- `apps/web/src/features/settings/GeneralSettings.tsx` - New component
- `apps/web/src/features/settings/LaborLawSettings.tsx` - New component
- `apps/web/src/features/settings/NotificationPreferences.tsx` - New component
- `apps/api/src/tenants/tenants.controller.ts` - Add settings endpoints
- `apps/api/src/users/users.controller.ts` - Add profile endpoints

**Testing:**
- [ ] Tenant settings can be updated
- [ ] User profile can be updated
- [ ] Password change works
- [ ] Notification preferences saved
- [ ] Locale changes reflected immediately

---

### PHASE 4: Polish & Testing (P3) - Week 4

#### 4.1 Comprehensive Testing

**Requirements:**
- [ ] Unit tests for all services (80%+ coverage)
- [ ] Integration tests for critical flows
- [ ] E2E tests for user journeys
- [ ] Performance testing
- [ ] Security testing

**Testing Checklist:**
- [ ] All compliance validation rules tested
- [ ] Break tracking tested
- [ ] Overtime calculation tested
- [ ] Convenio rules tested
- [ ] Report generation tested
- [ ] Signature acknowledgment tested
- [ ] Offline sync tested
- [ ] Multi-tenant isolation tested
- [ ] Role-based access control tested
- [ ] Audit logging tested

---

#### 4.2 Documentation

**Requirements:**
- [ ] API documentation (Swagger/OpenAPI)
- [ ] User guides (employee, manager, admin)
- [ ] Admin setup guide
- [ ] Compliance guide (legal requirements)
- [ ] Troubleshooting guide

**Documents to Create:**
- `docs/API.md` - API reference
- `docs/USER_GUIDE.md` - ✅ Already exists
- `docs/ADMIN_GUIDE.md` - ✅ Already exists
- `docs/COMPLIANCE_GUIDE.md` - New document
- `docs/TROUBLESHOOTING.md` - New document

---

#### 4.3 Performance Optimization

**Requirements:**
- [ ] Database query optimization
- [ ] API response time <200ms
- [ ] Frontend bundle size <1MB
- [ ] Lighthouse score >90
- [ ] Offline performance

**Optimization Tasks:**
- [ ] Add database indexes for common queries
- [ ] Implement query result caching
- [ ] Code splitting for frontend
- [ ] Image optimization
- [ ] Service worker caching strategy

---

#### 4.4 Security Hardening

**Requirements:**
- [ ] OWASP Top 10 compliance
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Input validation
- [ ] Output encoding
- [ ] Secure headers

**Security Checklist:**
- [ ] All inputs validated with class-validator
- [ ] Prisma prevents SQL injection
- [ ] React prevents XSS by default
- [ ] CSRF tokens on state-changing operations
- [ ] Rate limiting on auth endpoints
- [ ] Helmet.js security headers
- [ ] HTTPS enforced
- [ ] Secure cookie settings

---

## Implementation Priority Matrix

| Feature | Legal Priority | Complexity | Estimated Time | Phase |
|---------|---------------|------------|----------------|-------|
| **12-hour rest validation** | P0 (Critical) | Low | 2 days | 1 |
| **Daily 9-hour limit** | P0 (Critical) | Low | 1 day | 1 |
| **Break after 6 hours** | P0 (Critical) | Medium | 3 days | 1 |
| **Weekly 36-hour rest** | P0 (Critical) | Medium | 2 days | 1 |
| **Overtime tracking** | P0 (Critical) | High | 4 days | 1 |
| **Convenio rule engine** | P0 (Critical) | High | 5 days | 1 |
| **Report signatures** | P1 (High) | Medium | 3 days | 2 |
| **Violation dashboard** | P1 (High) | Medium | 3 days | 2 |
| **Enhanced scheduling** | P1 (High) | High | 4 days | 2 |
| **Inspector access** | P2 (Medium) | Medium | 3 days | 3 |
| **Advanced reporting** | P2 (Medium) | High | 4 days | 3 |
| **Notification system** | P2 (Medium) | High | 4 days | 3 |
| **Settings pages** | P2 (Medium) | Low | 2 days | 3 |
| **Testing** | P3 (Low) | High | 5 days | 4 |
| **Documentation** | P3 (Low) | Low | 2 days | 4 |
| **Performance** | P3 (Low) | Medium | 3 days | 4 |
| **Security** | P3 (Low) | Medium | 3 days | 4 |

**Total Estimated Time:** 55 days (11 weeks at 5 days/week)  
**With 1 developer:** ~3 months  
**With 2 developers:** ~6 weeks

---

## Risk Assessment

### High Risk (Must Address)

1. **Legal Compliance Gaps** - Current system does NOT enforce critical labor law requirements
   - **Impact:** Serious legal violations, fines €6,251-€187,515
   - **Mitigation:** Prioritize Phase 1 (P0 features) immediately

2. **Data Integrity** - No validation prevents invalid time entries
   - **Impact:** Unreliable data, audit failures
   - **Mitigation:** Implement validation service in Phase 1

3. **Audit Trail Gaps** - Some actions not logged
   - **Impact:** Cannot prove compliance to Labor Inspection
   - **Mitigation:** Enhance audit logging in Phase 2

### Medium Risk

4. **Performance at Scale** - No load testing done
   - **Impact:** Slow response times with many users
   - **Mitigation:** Performance testing in Phase 4

5. **Offline Sync Conflicts** - Edge cases not fully tested
   - **Impact:** Data loss or conflicts
   - **Mitigation:** Comprehensive offline testing in Phase 4

### Low Risk

6. **Browser Compatibility** - Only tested on Chrome
   - **Impact:** Issues on Safari/Firefox
   - **Mitigation:** Cross-browser testing in Phase 4

7. **Mobile Device Testing** - Limited real device testing
   - **Impact:** UI issues on some devices
   - **Mitigation:** Device testing in Phase 4

---

## Success Criteria

### Legal Compliance (Must Have)
- [ ] All RD-Ley 8/2019 requirements implemented
- [ ] All Estatuto de los Trabajadores Article 34 rules enforced
- [ ] Convenio Hosteleria Murcia rules configurable
- [ ] 4-year data retention guaranteed
- [ ] Immutable audit trail complete
- [ ] Labor Inspection export ready

### Functional Completeness (Must Have)
- [ ] All P0 features implemented and tested
- [ ] All P1 features implemented and tested
- [ ] Core user journeys work end-to-end
- [ ] Offline mode fully functional
- [ ] Multi-tenant isolation verified

### Quality (Should Have)
- [ ] 80%+ test coverage
- [ ] API response time <200ms
- [ ] Frontend Lighthouse score >90
- [ ] Zero critical security vulnerabilities
- [ ] Comprehensive documentation

### User Experience (Should Have)
- [ ] Mobile-first design validated on real devices
- [ ] Accessibility WCAG 2.1 AA compliant
- [ ] i18n working for all 6 languages
- [ ] Error messages clear and actionable
- [ ] Loading states smooth and informative

---

## Next Steps

1. **Review this plan** with stakeholders (LSLT Group management, legal counsel)
2. **Prioritize features** based on business needs and legal requirements
3. **Assign resources** (developers, testers, legal advisor)
4. **Set timeline** for v1.0 production release
5. **Begin Phase 1** implementation immediately (P0 features)

---

## Appendix: Legal References

- **RD-Ley 8/2019**: https://www.boe.es/buscar/doc.php?id=BOE-A-2019-3481
- **Estatuto de los Trabajadores**: https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430
- **Convenio Hosteleria Murcia**: https://ccoo.app/convenio/convenio-colectivo-hosteleria-de-c-autonoma-de-murcia/
- **AEPD Biometric Guidelines**: https://www.aepd.es/guides/guidelines-clocking-and-attendance-control-processing-using-biometric-systems.pdf
- **Ministry Guide**: https://www.mites.gob.es/ficheros/ministerio/GuiaRegistroJornada.pdf

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-29  
**Author:** Atlas (Master Orchestrator)  
**Status:** Ready for Review
