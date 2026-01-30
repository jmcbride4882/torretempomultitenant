# Torre Tempo - Rota/Scheduling Feature Plan (Deputy-Inspired)

**Created:** 2026-01-29  
**Status:** Planning  
**Priority:** Phase 2 (Post-v1.0)  
**Estimated Effort:** 2-3 weeks (1 developer)

---

## Executive Summary

Implement a comprehensive shift scheduling system inspired by Deputy, adapted for Spanish labor law compliance. This system will allow managers to create, assign, and publish employee schedules while ensuring compliance with rest period requirements, overtime limits, and convenio rules.

---

## Deputy-Inspired Features (Priority Order)

### 🎯 PHASE 1: Core Scheduling (Week 1) - P1

#### 1.1 Shift Templates
**Deputy Feature:** Pre-defined shift types for consistency

**Our Implementation:**
- Create reusable shift templates:
  * Morning shift (8:00-16:00)
  * Afternoon shift (14:00-22:00)
  * Night shift (22:00-6:00)
  * Split shift (custom times)
- Define break requirements per shift type
- Set expected hours per shift
- Color-coded shifts for visual clarity

**Database Schema:**
```prisma
model ShiftTemplate {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  
  name        String   // "Morning Shift"
  startTime   String   // "08:00"
  endTime     String   // "16:00"
  breakMins   Int      @default(30)
  color       String   // "#3B82F6" (hex color)
  
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  schedules   Schedule[]
  
  @@map("shift_templates")
}
```

#### 1.2 Weekly Calendar View
**Deputy Feature:** Drag-and-drop shift assignment

**Our Implementation:**
- Week-at-a-glance calendar (Monday-Sunday)
- Employee rows with daily shift slots
- Click to assign shift template to employee/day
- Visual indicators:
  * Assigned (blue)
  * Unassigned (gray)
  * Published (green)
  * Conflicts (red border)
- Mobile view: Day-by-day accordion

**UI Components:**
- `ScheduleCalendar.tsx` - Weekly grid
- `ShiftCell.tsx` - Individual shift slot
- `ShiftTemplateSelector.tsx` - Shift template picker

#### 1.3 Shift Assignment
**Deputy Feature:** Bulk assignment and copying

**Our Implementation:**
- Assign single shift: Click cell → Select template → Assign
- Bulk assign: Select multiple cells → Assign same template
- Copy week: Duplicate last week's schedule to next week
- Assign to multiple employees: Select employees → Select date → Assign template
- Unassign: Right-click → Remove shift

**API Endpoints:**
```typescript
POST /api/scheduling/assign-shift
POST /api/scheduling/bulk-assign
POST /api/scheduling/copy-week
DELETE /api/scheduling/shift/:id
```

---

### 🎯 PHASE 2: Publishing & Communication (Week 1-2) - P1

#### 2.1 Schedule Publishing
**Deputy Feature:** Publish schedules to employees

**Our Implementation:**
- Draft mode: Managers build schedules (employees can't see)
- Publish action: Make schedule visible to employees
- Publish by week: "Publish Week of Jan 29-Feb 4"
- Email notifications on publish (optional)
- In-app notifications: "Your schedule for next week is ready"

**Workflow:**
1. Manager builds schedule in draft mode
2. System validates (compliance checks)
3. Manager clicks "Publish Schedule"
4. Employees receive notification
5. Schedule appears in employee dashboard and app

**Database:**
```prisma
model Schedule {
  // ... existing fields
  status      ScheduleStatus @default(DRAFT)
  publishedAt DateTime?
  publishedBy String?       @db.Uuid
}

enum ScheduleStatus {
  DRAFT      // Manager editing
  PUBLISHED  // Visible to employees
  ARCHIVED   // Past week, read-only
}
```

#### 2.2 Employee View
**Deputy Feature:** Employees see their schedule in advance

**Our Implementation:**
- **My Schedule** page showing next 4 weeks
- Calendar view + list view toggle
- Daily details:
  * Shift time (8:00-16:00)
  * Break allowance (30 mins)
  * Location (if assigned)
  * Total hours per day
- Weekly summary: Total hours this week
- Past schedules: Archive of previous weeks

**UI:**
- `MySchedulePage.tsx` - Employee schedule view
- `UpcomingShifts` widget on dashboard (next 7 days)

---

### 🎯 PHASE 3: Compliance & Conflicts (Week 2) - P0 (CRITICAL)

#### 3.1 Spanish Labor Law Validation
**Deputy Feature:** Conflict detection

**Our Implementation - Enforced Rules:**

1. **12-Hour Rest Between Shifts**
   - If employee has shift on Day 1 ending at 22:00
   - Cannot assign shift on Day 2 starting before 10:00
   - Visual warning: "⚠️ Insufficient rest (need 12h)"

2. **Weekly 36-Hour Rest**
   - Employees must have 1.5 consecutive days off per week
   - Visual indicator: "✓ Weekly rest satisfied" or "⚠️ No weekly rest"

3. **Daily 9-Hour Limit**
   - Shifts longer than 9 hours flagged
   - Overtime automatically calculated if scheduled >9h

4. **Weekly 40-Hour Limit**
   - Sum of all shifts in week
   - Warning if >40h: "Overtime will be incurred"

5. **Consecutive Days Limit**
   - Max 6 consecutive working days (Spanish law)
   - Auto-block 7th day: "⛔ Maximum consecutive days reached"

**Validation Engine:**
```typescript
// apps/api/src/scheduling/scheduling-validation.service.ts
class SchedulingValidationService {
  async validateShiftAssignment(
    userId: string, 
    date: Date, 
    shiftTemplate: ShiftTemplate
  ): Promise<ValidationResult> {
    // Check 12h rest
    const conflicts = await this.checkRestPeriods(userId, date);
    
    // Check weekly hours
    const weeklyHours = await this.getWeeklyHours(userId, date);
    
    // Check consecutive days
    const consecutiveDays = await this.getConsecutiveDays(userId, date);
    
    return {
      valid: conflicts.length === 0,
      warnings: [...],
      errors: [...],
      blockers: [...]  // Hard stops (cannot assign)
    };
  }
}
```

#### 3.2 Visual Conflict Indicators
**UI Warnings:**
- 🟢 Green: Valid shift, no issues
- 🟡 Amber: Warning (e.g., approaching 40h)
- 🔴 Red: Conflict (e.g., insufficient rest)
- ⛔ Blocked: Cannot assign (hard violation)

**Conflict Types:**
- `INSUFFICIENT_REST` - Less than 12h between shifts
- `NO_WEEKLY_REST` - Missing 36h weekly rest
- `OVERTIME_SCHEDULED` - Exceeds 40h/week
- `CONSECUTIVE_DAYS` - More than 6 days in a row
- `SHIFT_OVERLAP` - Two shifts on same day

---

### 🎯 PHASE 4: Advanced Features (Week 3) - P2

#### 4.1 Availability Management
**Deputy Feature:** Employees set availability

**Our Implementation:**
- Employees mark days/times they're available
- Recurring availability (e.g., "Not available Mondays")
- One-time unavailability (e.g., "Doctor appointment Feb 5")
- Manager sees availability when assigning shifts
- Visual indicator: Gray out unavailable slots

**Database:**
```prisma
model Availability {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  user        User     @relation(fields: [userId], references: [id])
  
  date        Date?    // Specific date (null = recurring)
  dayOfWeek   Int?     // 0-6 for recurring
  startTime   String   // "09:00"
  endTime     String   // "17:00"
  
  type        AvailabilityType
  note        String?
  
  @@map("availability")
}

enum AvailabilityType {
  AVAILABLE    // Can work these times
  UNAVAILABLE  // Cannot work (PTO, appointment)
  PREFERRED    // Prefers these times
}
```

#### 4.2 Time-Off Requests Integration
**Deputy Feature:** PTO blocks scheduling

**Our Implementation:**
- Integrate with existing TimeOffRequest system (if exists)
- Approved PTO automatically blocks scheduling
- Visual: "🏖️ PTO" on calendar
- Manager can't assign shifts during PTO period
- Employee can request time off from schedule page

#### 4.3 Shift Swapping (Employee-Initiated)
**Deputy Feature:** Employees swap shifts with approval

**Our Implementation:**
- Employee requests to swap shift with coworker
- Coworker accepts swap request
- Manager approves swap (optional setting)
- System validates compliance before swap
- Audit log: "Employee A swapped with Employee B on Date X"

**Workflow:**
1. Employee A: "I can't work Friday, swap with someone"
2. System shows eligible coworkers (same role, available, compliant)
3. Employee A selects Employee B
4. Employee B receives notification: "Accept swap?"
5. Manager receives notification: "Approve swap?" (if required)
6. On approval: Shifts updated, both notified

#### 4.4 Schedule Templates
**Deputy Feature:** Recurring schedule patterns

**Our Implementation:**
- Save schedule as template: "Week of Jan 29 - Standard Week"
- Apply template to future weeks
- Useful for rotating shifts (e.g., 4-week rotation)
- Templates can be tenant-level or location-level

**Use Case:**
- Hospitality: 4-week rotation (Week A, B, C, D)
- Retail: Standard Monday-Friday pattern
- Healthcare: Alternating day/night shifts

---

### 🎯 PHASE 5: Reporting & Analytics (Week 3) - P2

#### 5.1 Schedule Reports
**Deputy Feature:** Labor cost and coverage reports

**Our Implementation:**
- **Coverage Report:** How many employees scheduled per hour
- **Labor Cost Report:** Projected payroll based on schedule
- **Overtime Forecast:** Expected overtime based on schedule
- **Compliance Report:** Any violations or warnings in upcoming schedule
- **Utilization Report:** Employee scheduled hours vs. expected hours

**Reports:**
```typescript
POST /api/scheduling/reports/coverage?week=2026-01-29
POST /api/scheduling/reports/overtime-forecast?week=2026-01-29
POST /api/scheduling/reports/compliance?month=2026-01
```

#### 5.2 Schedule vs. Actual Comparison
**Deputy Feature:** Compare schedule to actual time worked

**Our Implementation:**
- Show scheduled hours vs. clocked hours
- Identify early clock-ins, late clock-outs
- Flag: "Employee worked 1.5h more than scheduled"
- Useful for payroll and compliance
- Export discrepancies report (CSV/PDF)

**Dashboard Widget:**
```
Scheduled vs. Actual (This Week)
---------------------------------
Scheduled: 40.0 hours
Clocked:   42.5 hours
Overtime:  +2.5 hours
```

---

## Technical Implementation Plan

### Database Schema Changes

#### New Models:
1. `ShiftTemplate` - Reusable shift definitions
2. `Availability` - Employee availability/unavailability
3. `ShiftSwapRequest` - Shift swap workflow
4. `ScheduleTemplate` - Saved schedule patterns

#### Modified Models:
1. `Schedule` - Add `status`, `publishedAt`, `publishedBy`, `templateId`
2. `User` - Add `availabilities` relation

### API Endpoints

**Shift Templates:**
- `GET /api/scheduling/templates` - List shift templates
- `POST /api/scheduling/templates` - Create shift template
- `PATCH /api/scheduling/templates/:id` - Update shift template
- `DELETE /api/scheduling/templates/:id` - Delete shift template

**Schedule Management:**
- `GET /api/scheduling/calendar?week=YYYY-MM-DD` - Get week calendar
- `POST /api/scheduling/assign` - Assign shift to employee
- `POST /api/scheduling/bulk-assign` - Assign multiple shifts
- `POST /api/scheduling/copy-week` - Copy week to another week
- `DELETE /api/scheduling/shift/:id` - Remove shift
- `POST /api/scheduling/publish` - Publish schedule for week
- `GET /api/scheduling/my-schedule` - Employee view (next 4 weeks)

**Compliance & Validation:**
- `POST /api/scheduling/validate` - Validate shift assignment
- `GET /api/scheduling/conflicts?week=YYYY-MM-DD` - Get all conflicts

**Availability:**
- `GET /api/scheduling/availability/:userId` - Get employee availability
- `POST /api/scheduling/availability` - Set availability
- `DELETE /api/scheduling/availability/:id` - Remove availability

**Shift Swapping:**
- `POST /api/scheduling/swap-request` - Request shift swap
- `POST /api/scheduling/swap-request/:id/accept` - Accept swap
- `POST /api/scheduling/swap-request/:id/approve` - Manager approval
- `DELETE /api/scheduling/swap-request/:id` - Cancel swap request

### Frontend Components

**Pages:**
- `ScheduleCalendarPage.tsx` - Manager: Weekly calendar with drag-drop
- `MySchedulePage.tsx` - Employee: View my upcoming shifts
- `ShiftTemplatesPage.tsx` - Admin: Manage shift templates
- `AvailabilityPage.tsx` - Employee: Set availability

**Components:**
- `WeeklyCalendar.tsx` - Calendar grid component
- `ShiftCell.tsx` - Individual shift cell with hover/click
- `ShiftTemplateCard.tsx` - Shift template selector
- `ConflictBadge.tsx` - Visual conflict indicator
- `ShiftSwapRequestCard.tsx` - Swap request UI
- `SchedulePublishModal.tsx` - Publish confirmation dialog

### Notification System

**When to Notify:**
1. Schedule published → Notify all employees with shifts
2. Shift assigned → Notify employee
3. Shift removed → Notify employee
4. Shift changed → Notify employee
5. Swap request received → Notify target employee
6. Swap request approved → Notify both employees
7. Compliance violation → Notify manager

**Notification Channels:**
- In-app notifications (bell icon)
- Email notifications (optional, configurable)
- PWA push notifications (future)

---

## Spanish Labor Law Integration

### Automatic Checks (Blocking)

1. **12-Hour Rest:** Check previous day's clock-out time
2. **Weekly Rest:** Ensure 36h consecutive rest in 7-day window
3. **Consecutive Days:** Block after 6 consecutive days
4. **Daily Hours:** Flag if shift >9h (overtime scheduled)

### Warnings (Non-Blocking)

1. **Weekly Hours:** Warn if total >40h (overtime expected)
2. **Night Shift Premium:** Flag night shifts for payroll (10pm-6am)
3. **Holiday Work:** Flag shifts on public holidays
4. **Convenio Hours:** Warn if exceeding convenio annual hours

### Compliance Dashboard Widget

```typescript
Scheduling Compliance (Next 7 Days)
------------------------------------
✓ All shifts comply with 12h rest
✓ All employees have weekly rest
⚠️ 3 employees scheduled for overtime
✓ No consecutive day violations
```

---

## Mobile Experience

### Manager Mobile View
- Swipe between weeks
- Tap cell to assign shift
- Quick actions: Publish, Copy week
- Conflict notifications

### Employee Mobile View
- Today's shift at top (big card)
- Upcoming shifts (list view)
- Tap shift for details (time, location, break)
- Request time off button
- Swap shift button

---

## Implementation Phases

### Week 1: Foundation (P1)
- [ ] Create ShiftTemplate model and API
- [ ] Build WeeklyCalendar component
- [ ] Implement shift assignment (single)
- [ ] Add Schedule.status (DRAFT/PUBLISHED)
- [ ] Build MySchedulePage for employees

### Week 2: Compliance & Publishing (P0 + P1)
- [ ] Implement compliance validation service
- [ ] Add conflict detection to calendar
- [ ] Build publish workflow
- [ ] Add notifications for schedule changes
- [ ] Test all compliance rules

### Week 3: Advanced Features (P2)
- [ ] Availability management
- [ ] Shift swapping
- [ ] Schedule templates
- [ ] Reports (coverage, overtime forecast)
- [ ] Schedule vs. actual comparison

---

## Success Metrics

1. **Adoption Rate:** % of managers using scheduling feature
2. **Compliance Rate:** % of schedules with zero violations
3. **Time Saved:** Reduction in time spent creating schedules
4. **Employee Satisfaction:** Feedback on schedule visibility and advance notice
5. **Swap Success Rate:** % of shift swaps completed vs. requested

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex UI/UX for calendar | High | Start with simple table view, iterate to drag-drop |
| Compliance validation performance | Medium | Cache validation results, use background jobs for weekly checks |
| Employee adoption | Medium | In-app tutorials, manager training, clear value proposition |
| Mobile usability | Medium | Mobile-first design, test on real devices |
| Timezone confusion | Low | Always store UTC, display in tenant timezone |

---

## Dependencies

**Existing Features:**
- User management (employees, managers)
- Tenant management
- Time tracking (to compare schedule vs. actual)
- Compliance service (for validation rules)

**New Dependencies:**
- Notification service (in-app + email)
- Background job queue (for validation checks)

---

## Cost Estimate

**Development Time:** 2-3 weeks (1 developer)

**Week 1:** Core scheduling (shift templates, calendar, assignment)  
**Week 2:** Compliance validation, publishing, notifications  
**Week 3:** Advanced features (availability, swapping, reports)

**Total:** 80-120 hours @ $50/hour = **$4,000 - $6,000**

---

## Future Enhancements (Post-v1.1)

- **AI Scheduling:** Auto-generate optimal schedules based on availability, labor laws, and historical data
- **Skills-Based Scheduling:** Match shifts to employee skills/certifications
- **Forecasting:** Predict labor needs based on historical busy periods
- **Budget Constraints:** Schedule within labor budget limits
- **Mobile App:** Native iOS/Android apps for better mobile experience
- **Calendar Integration:** Sync with Google Calendar, Outlook
- **Open Shift Marketplace:** Employees claim open shifts

---

## Conclusion

This rota/scheduling feature will transform Torre Tempo from a time tracking system into a comprehensive workforce management platform. By combining Deputy's intuitive UX with Spanish labor law compliance, we provide managers with a powerful tool to efficiently schedule staff while ensuring legal compliance.

**Next Steps:**
1. Review and approve this plan
2. Create detailed wireframes for calendar UI
3. Begin Week 1 implementation (shift templates + calendar)
4. Iterate based on user feedback

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-29  
**Author:** Atlas (Master Orchestrator)
