# Torre Tempo - Missing Features Implementation Plan

**Created:** 2026-01-30  
**Priority:** HIGH  
**User Feedback:** "things like user management, reports are awkward we need the rota to link with the clock, rules need to be configurable"

---

## User Requirements (Clarified)

### 1. User Management
**Issue:** User management exists but UI is awkward/incomplete
**Need:** Better UI for managing users

### 2. Reports
**Issue:** Reports are awkward to use
**Need:** Improve report generation and viewing experience

### 3. Rota/Schedule Integration
**Issue:** Rota (schedule) doesn't link with clock in/out
**Need:** Connect scheduling system with time tracking
- Validate clock-ins against scheduled shifts
- Show scheduled shift when clocking in
- Warn if clocking in outside scheduled time

### 4. Configurable Rules
**Issue:** Rules are hardcoded
**Need:** Make compliance rules configurable
- Break requirements (currently hardcoded 15min after 6h)
- Overtime limits (currently hardcoded 80h/year)
- Daily hour limits
- Rest period requirements
- Geofence radius
- QR code expiry

---

## Implementation Priority

### Phase 1: Rota/Clock Integration (HIGHEST PRIORITY)
**Why:** Core functionality that affects daily use
**Estimated Time:** 2-3 hours

**Tasks:**
1. [ ] Add schedule lookup when clocking in
2. [ ] Display scheduled shift on clock page
3. [ ] Validate clock-in time against schedule
4. [ ] Show warning if clocking in early/late
5. [ ] Show warning if no shift scheduled
6. [ ] Link schedule view from clock page

**Files to modify:**
- `apps/api/src/time-tracking/time-tracking.service.ts` - Add schedule validation
- `apps/web/src/features/clocking/ClockingPage.tsx` - Show schedule info
- `apps/api/src/time-tracking/dto/clock-in.dto.ts` - Add schedule validation

### Phase 2: Configurable Rules (HIGH PRIORITY)
**Why:** Flexibility for different tenants/locations
**Estimated Time:** 3-4 hours

**Tasks:**
1. [ ] Create ComplianceSettings model in database
2. [ ] Create settings API endpoints
3. [ ] Create settings UI page
4. [ ] Update compliance service to use settings
5. [ ] Add tenant-level and location-level overrides

**Settings to make configurable:**
- Break requirements (minutes after hours worked)
- Overtime annual limit (hours)
- Daily hour limit (hours)
- Minimum rest between shifts (hours)
- Weekly rest requirement (hours)
- Geofence radius (meters)
- QR code expiry (minutes)
- Grace period for clock in/out (minutes)

**Files to create:**
- `apps/api/prisma/migrations/XXX_add_compliance_settings.sql`
- `apps/api/src/settings/settings.module.ts`
- `apps/api/src/settings/settings.service.ts`
- `apps/api/src/settings/settings.controller.ts`
- `apps/web/src/features/settings/ComplianceSettingsPage.tsx`

### Phase 3: Improve User Management UI (MEDIUM PRIORITY)
**Why:** Admin usability
**Estimated Time:** 2 hours

**Tasks:**
1. [ ] Improve user list table (sortable, filterable)
2. [ ] Add bulk actions (activate/deactivate multiple)
3. [ ] Improve add/edit user form
4. [ ] Add user import (CSV)
5. [ ] Add user role management UI

**Files to modify:**
- `apps/web/src/features/users/UserManagementPage.tsx`
- Add new components for bulk actions and import

### Phase 4: Improve Reports UI (MEDIUM PRIORITY)
**Why:** Manager usability
**Estimated Time:** 2 hours

**Tasks:**
1. [ ] Add report preview before download
2. [ ] Add report templates
3. [ ] Add custom date range picker
4. [ ] Add report scheduling (email reports)
5. [ ] Improve report filters

**Files to modify:**
- `apps/web/src/features/reports/ReportsPage.tsx`
- `apps/api/src/reports/reports.service.ts`

---

## Detailed Implementation: Rota/Clock Integration

### Backend Changes

**1. Add schedule validation to clock-in:**

```typescript
// apps/api/src/time-tracking/time-tracking.service.ts

async clockIn(userId: string, tenantId: string, dto: ClockInDto) {
  // Get user's scheduled shift for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const scheduledShift = await this.prisma.schedule.findFirst({
    where: {
      userId,
      tenantId,
      date: today,
    },
    include: {
      shift: true,
    },
  });

  // Validate clock-in time against schedule
  let validationWarning = null;
  if (scheduledShift) {
    const now = new Date();
    const shiftStart = this.parseTime(scheduledShift.shift.startTime);
    const gracePeriod = 15; // minutes - should be configurable
    
    const minutesEarly = (shiftStart.getTime() - now.getTime()) / (1000 * 60);
    const minutesLate = (now.getTime() - shiftStart.getTime()) / (1000 * 60);
    
    if (minutesEarly > gracePeriod) {
      validationWarning = `You are clocking in ${Math.floor(minutesEarly)} minutes early`;
    } else if (minutesLate > gracePeriod) {
      validationWarning = `You are clocking in ${Math.floor(minutesLate)} minutes late`;
    }
  } else {
    validationWarning = 'No shift scheduled for today';
  }

  // Create time entry
  const entry = await this.prisma.timeEntry.create({
    data: {
      userId,
      tenantId,
      locationId: dto.locationId,
      clockIn: new Date(),
      origin: dto.origin,
      scheduleId: scheduledShift?.id,
      validationWarning,
    },
  });

  return {
    entry,
    scheduledShift,
    validationWarning,
  };
}
```

**2. Add scheduleId to TimeEntry model:**

```prisma
// apps/api/prisma/schema.prisma

model TimeEntry {
  id                String    @id @default(cuid())
  tenantId          String
  userId            String
  locationId        String?
  scheduleId        String?   // NEW: Link to scheduled shift
  clockIn           DateTime
  clockOut          DateTime?
  breakMinutes      Int?
  origin            EntryOrigin
  validationWarning String?   // NEW: Store validation warnings
  
  user              User      @relation(fields: [userId], references: [id])
  tenant            Tenant    @relation(fields: [tenantId], references: [id])
  location          Location? @relation(fields: [locationId], references: [id])
  schedule          Schedule? @relation(fields: [scheduleId], references: [id]) // NEW
  breaks            BreakEntry[]
  overtimeEntries   OvertimeEntry[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([userId, tenantId])
  @@index([tenantId, clockIn])
}
```

### Frontend Changes

**3. Update ClockingPage to show schedule:**

```typescript
// apps/web/src/features/clocking/ClockingPage.tsx

// Add query for today's schedule
const { data: todaySchedule } = useQuery({
  queryKey: ['today-schedule'],
  queryFn: () => api.get('/scheduling/today'),
});

// Show schedule info in clock card
{!isClockedIn && todaySchedule && (
  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
    <div className="flex items-center gap-2 mb-2">
      <CalendarIcon className="w-5 h-5 text-blue-600" />
      <span className="font-semibold text-blue-900 dark:text-blue-100">
        {t('scheduling.scheduledShift')}
      </span>
    </div>
    <p className="text-sm text-blue-800 dark:text-blue-200">
      {todaySchedule.shift.name}: {todaySchedule.shift.startTime} - {todaySchedule.shift.endTime}
    </p>
    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
      {todaySchedule.location.name}
    </p>
  </div>
)}

// Show validation warning after clock-in
{currentEntry?.validationWarning && (
  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
    <div className="flex items-center gap-2">
      <AlertIcon className="w-4 h-4 text-amber-600" />
      <span className="text-sm text-amber-800 dark:text-amber-200">
        {currentEntry.validationWarning}
      </span>
    </div>
  </div>
)}
```

---

## Detailed Implementation: Configurable Rules

### Database Schema

```prisma
// apps/api/prisma/schema.prisma

model ComplianceSettings {
  id                    String   @id @default(cuid())
  tenantId              String
  locationId            String?  // null = tenant-level default
  
  // Break rules
  breakRequiredAfterHours Float   @default(6)    // Hours worked before break required
  breakMinimumMinutes     Int     @default(15)   // Minimum break duration
  
  // Overtime rules
  overtimeAnnualLimit     Float   @default(80)   // Annual overtime limit in hours
  overtimeDailyThreshold  Float   @default(9)    // Hours before overtime kicks in
  
  // Rest period rules
  minimumRestHours        Float   @default(12)   // Minimum rest between shifts
  weeklyRestHours         Float   @default(36)   // Minimum weekly rest
  
  // Clock in/out rules
  gracePerio dMinutes      Int     @default(15)   // Grace period for early/late clock
  geofenceRadiusMeters    Int     @default(100)  // Geofence radius
  qrCodeExpiryMinutes     Int     @default(5)    // QR code validity
  
  // Daily limits
  dailyHourLimit          Float   @default(9)    // Maximum daily hours
  consecutiveDaysLimit    Int     @default(6)    // Max consecutive work days
  
  tenant                  Tenant  @relation(fields: [tenantId], references: [id])
  location                Location? @relation(fields: [locationId], references: [id])
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  @@unique([tenantId, locationId])
  @@index([tenantId])
}
```

### Settings API

```typescript
// apps/api/src/settings/settings.controller.ts

@Controller('settings/compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplianceSettingsController {
  @Get()
  @Roles('MANAGER', 'ADMIN', 'GLOBAL_ADMIN')
  async getSettings(@CurrentUser() user: any) {
    return this.settingsService.getSettings(user.tenantId);
  }

  @Put()
  @Roles('ADMIN', 'GLOBAL_ADMIN')
  async updateSettings(
    @CurrentUser() user: any,
    @Body() dto: UpdateComplianceSettingsDto,
  ) {
    return this.settingsService.updateSettings(user.tenantId, dto);
  }
}
```

### Settings UI

```typescript
// apps/web/src/features/settings/ComplianceSettingsPage.tsx

export function ComplianceSettingsPage() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['compliance-settings'],
    queryFn: () => api.get('/settings/compliance'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.put('/settings/compliance', data),
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {t('settings.complianceRules')}
      </h1>

      <div className="space-y-6">
        {/* Break Rules */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Break Requirements</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Break required after (hours)"
                type="number"
                value={settings?.breakRequiredAfterHours}
                onChange={(v) => updateField('breakRequiredAfterHours', v)}
              />
              <FormField
                label="Minimum break duration (minutes)"
                type="number"
                value={settings?.breakMinimumMinutes}
                onChange={(v) => updateField('breakMinimumMinutes', v)}
              />
            </div>
          </CardBody>
        </Card>

        {/* Overtime Rules */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Overtime Limits</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Annual overtime limit (hours)"
                type="number"
                value={settings?.overtimeAnnualLimit}
                onChange={(v) => updateField('overtimeAnnualLimit', v)}
              />
              <FormField
                label="Daily overtime threshold (hours)"
                type="number"
                value={settings?.overtimeDailyThreshold}
                onChange={(v) => updateField('overtimeDailyThreshold', v)}
              />
            </div>
          </CardBody>
        </Card>

        {/* Rest Period Rules */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Rest Periods</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Minimum rest between shifts (hours)"
                type="number"
                value={settings?.minimumRestHours}
                onChange={(v) => updateField('minimumRestHours', v)}
              />
              <FormField
                label="Weekly rest requirement (hours)"
                type="number"
                value={settings?.weeklyRestHours}
                onChange={(v) => updateField('weeklyRestHours', v)}
              />
            </div>
          </CardBody>
        </Card>

        {/* Clock Rules */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Clock In/Out Rules</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                label="Grace period (minutes)"
                type="number"
                value={settings?.gracePeriodMinutes}
                onChange={(v) => updateField('gracePeriodMinutes', v)}
              />
              <FormField
                label="Geofence radius (meters)"
                type="number"
                value={settings?.geofenceRadiusMeters}
                onChange={(v) => updateField('geofenceRadiusMeters', v)}
              />
              <FormField
                label="QR code expiry (minutes)"
                type="number"
                value={settings?.qrCodeExpiryMinutes}
                onChange={(v) => updateField('qrCodeExpiryMinutes', v)}
              />
            </div>
          </CardBody>
        </Card>

        <Button
          onClick={() => updateMutation.mutate(settings)}
          disabled={updateMutation.isPending}
        >
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
```

---

## Next Steps

**Immediate Action:**
1. Implement Rota/Clock integration (Phase 1) - 2-3 hours
2. Implement Configurable Rules (Phase 2) - 3-4 hours
3. Improve User Management UI (Phase 3) - 2 hours
4. Improve Reports UI (Phase 4) - 2 hours

**Total Estimated Time:** 9-11 hours

**Priority Order:**
1. Rota/Clock integration (most impactful)
2. Configurable rules (flexibility)
3. User Management improvements
4. Reports improvements

---

**Status:** Plan created, ready to implement
**Next:** Start with Phase 1 (Rota/Clock Integration)
