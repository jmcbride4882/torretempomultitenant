# Torre Tempo - Architecture & Data Model

## Multi-Tenant Strategy

### Isolation Model: Shared Database + Row-Level Security

All tenants share a single PostgreSQL database with tenant isolation enforced at two levels:

1. **Application Layer**: Every query includes `tenantId` filter
2. **Database Layer**: PostgreSQL RLS policies as defense-in-depth

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ Tenant A│  │ Tenant B│  │ Tenant C│  │ Tenant D│    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │            │            │          │
│       └────────────┴─────┬──────┴────────────┘          │
│                          │                               │
│              ┌───────────▼───────────┐                  │
│              │   Tenant Middleware   │                  │
│              │ SET app.current_tenant│                  │
│              └───────────┬───────────┘                  │
└──────────────────────────┼──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    Database Layer                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │              PostgreSQL + RLS Policies              │ │
│  │                                                      │ │
│  │  POLICY tenant_isolation ON *                       │ │
│  │    USING (tenant_id = current_setting(             │ │
│  │           'app.current_tenant')::UUID)              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Why This Approach

| Consideration | Decision |
|---------------|----------|
| Cost | Single DB = lower hosting cost |
| Scalability | Add tenants without provisioning |
| Isolation | RLS enforces even if app has bugs |
| Compliance | Audit trail per tenant |
| Migration | Easy to shard later if needed |

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Tenant    │───────│    User     │───────│    Role     │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │
      │                     │
      ▼                     ▼
┌─────────────┐       ┌─────────────┐
│  Location   │◄──────│ TimeEntry   │
└─────────────┘       └─────────────┘
      │                     │
      │                     │
      ▼                     ▼
┌─────────────┐       ┌─────────────┐
│  Geofence   │       │ EditRequest │
└─────────────┘       └─────────────┘
      │                     │
      │                     │
      ▼                     ▼
┌─────────────┐       ┌─────────────┐
│  QRToken    │       │  AuditLog   │
└─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│   Shift     │───────│  Schedule   │
└─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│   Report    │───────│  Signature  │
└─────────────┘       └─────────────┘
```

---

## Data Model (Prisma Schema)

### Core Entities

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// TENANT & AUTH
// ============================================

model Tenant {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  slug      String   @unique
  timezone  String   @default("Europe/Madrid")
  locale    String   @default("es")
  
  // Convenio settings
  convenioCode      String?  // e.g., "30000805011981"
  maxWeeklyHours    Int      @default(40)
  maxAnnualHours    Int      @default(1822)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  users      User[]
  locations  Location[]
  shifts     Shift[]
  reports    Report[]
  auditLogs  AuditLog[]
  
  @@map("tenants")
}

model User {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  email           String
  passwordHash    String
  firstName       String
  lastName        String
  employeeCode    String?
  role            Role     @default(EMPLOYEE)
  isActive        Boolean  @default(true)
  
  // Locale override (falls back to tenant)
  locale    String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  timeEntries    TimeEntry[]
  editRequests   EditRequest[]   @relation("RequestedBy")
  approvals      EditRequest[]   @relation("ApprovedBy")
  schedules      Schedule[]
  signatures     Signature[]
  
  @@unique([tenantId, email])
  @@map("users")
}

enum Role {
  EMPLOYEE
  MANAGER
  ADMIN
}

// ============================================
// LOCATIONS & GEOFENCING
// ============================================

model Location {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  name      String
  address   String?
  isActive  Boolean  @default(true)
  
  // Geofence (circular)
  latitude    Float?
  longitude   Float?
  radiusMeters Int?   @default(100)
  
  // QR settings
  qrEnabled   Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  qrTokens    QRToken[]
  timeEntries TimeEntry[]
  shifts      Shift[]
  schedules   Schedule[]
  
  @@map("locations")
}

model QRToken {
  id         String   @id @default(uuid()) @db.Uuid
  locationId String   @db.Uuid
  location   Location @relation(fields: [locationId], references: [id])
  
  token      String   @unique @default(uuid())
  isActive   Boolean  @default(true)
  expiresAt  DateTime?
  
  createdAt  DateTime @default(now())
  
  @@map("qr_tokens")
}

// ============================================
// TIME TRACKING
// ============================================

model TimeEntry {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  
  locationId String?  @db.Uuid
  location   Location? @relation(fields: [locationId], references: [id])
  
  // Core timestamps (always UTC, displayed in tenant timezone)
  clockIn    DateTime
  clockOut   DateTime?
  
  // Break tracking (optional)
  breakMinutes Int?
  
  // Proof of presence
  origin     EntryOrigin  @default(MANUAL)
  qrTokenId  String?
  
  // Geolocation at clock-in/out
  clockInLat   Float?
  clockInLng   Float?
  clockOutLat  Float?
  clockOutLng  Float?
  
  // Offline sync metadata
  offlineId     String?   // Client-generated ID for dedup
  syncedAt      DateTime?
  conflictFlag  Boolean   @default(false)
  
  // Status
  status     EntryStatus @default(ACTIVE)
  
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  editRequests EditRequest[]
  
  @@index([tenantId, userId, clockIn])
  @@map("time_entries")
}

enum EntryOrigin {
  MANUAL      // Admin/manager created
  QR          // QR code scan
  GEOFENCE    // Auto clock-in via geofence
  OFFLINE     // Queued offline, synced later
}

enum EntryStatus {
  ACTIVE
  EDITED      // Modified via approval
  DELETED     // Soft delete
}

// ============================================
// APPROVALS & AUDIT
// ============================================

model EditRequest {
  id           String   @id @default(uuid()) @db.Uuid
  timeEntryId  String   @db.Uuid
  timeEntry    TimeEntry @relation(fields: [timeEntryId], references: [id])
  
  requestedById String  @db.Uuid
  requestedBy   User    @relation("RequestedBy", fields: [requestedById], references: [id])
  
  // What changed
  fieldName    String   // e.g., "clockIn", "clockOut"
  oldValue     String
  newValue     String
  reason       String
  
  // Approval
  status       ApprovalStatus @default(PENDING)
  approvedById String?  @db.Uuid
  approvedBy   User?    @relation("ApprovedBy", fields: [approvedById], references: [id])
  approvalNote String?
  approvedAt   DateTime?
  
  createdAt    DateTime @default(now())
  
  @@map("edit_requests")
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  // What happened
  action    String   // CREATE, UPDATE, DELETE, LOGIN, EXPORT, etc.
  entity    String   // TimeEntry, User, Location, etc.
  entityId  String?  @db.Uuid
  
  // Who did it
  actorId   String?  @db.Uuid
  actorEmail String?
  actorRole  String?
  
  // Details
  changes   Json?    // { before: {...}, after: {...} }
  ipAddress String?
  userAgent String?
  
  createdAt DateTime @default(now())
  
  @@index([tenantId, createdAt])
  @@index([tenantId, entity, entityId])
  @@map("audit_logs")
}

// ============================================
// SCHEDULING
// ============================================

model Shift {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  locationId String?  @db.Uuid
  location   Location? @relation(fields: [locationId], references: [id])
  
  name       String   // e.g., "Morning", "Evening", "Night"
  startTime  String   // HH:mm format
  endTime    String   // HH:mm format
  breakMins  Int      @default(0)
  
  isActive   Boolean  @default(true)
  
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  schedules  Schedule[]
  
  @@map("shifts")
}

model Schedule {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  
  shiftId   String   @db.Uuid
  shift     Shift    @relation(fields: [shiftId], references: [id])
  
  locationId String?  @db.Uuid
  location   Location? @relation(fields: [locationId], references: [id])
  
  date      DateTime @db.Date
  
  // Published = visible to employee
  isPublished Boolean @default(false)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, date])
  @@index([tenantId, date])
  @@map("schedules")
}

// ============================================
// REPORTS & SIGNATURES
// ============================================

model Report {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  type      ReportType
  period    String   // e.g., "2025-01" for monthly
  
  // Generated file
  fileUrl   String?
  fileHash  String?  // SHA-256 for integrity
  
  generatedAt DateTime @default(now())
  
  signatures Signature[]
  
  @@unique([tenantId, type, period])
  @@map("reports")
}

enum ReportType {
  MONTHLY_EMPLOYEE  // Individual monthly report
  MONTHLY_COMPANY   // Company-wide summary
  COMPLIANCE_EXPORT // For inspector
}

model Signature {
  id        String   @id @default(uuid()) @db.Uuid
  reportId  String   @db.Uuid
  report    Report   @relation(fields: [reportId], references: [id])
  
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  
  // Signature data
  imageBase64 String  @db.Text
  
  // Acknowledgment
  acknowledgedAt DateTime @default(now())
  ipAddress      String?
  userAgent      String?
  
  @@unique([reportId, userId])
  @@map("signatures")
}
```

---

## PostgreSQL RLS Policies

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- Create policies (example for time_entries)
CREATE POLICY tenant_isolation_select ON time_entries
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_insert ON time_entries
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_update ON time_entries
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_delete ON time_entries
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Repeat for other tables...

-- Middleware sets this on every request:
-- SET app.current_tenant = 'tenant-uuid-here';
```

---

## API Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      NestJS API                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Guards     │  │  Middleware  │  │ Interceptors │     │
│  │  - JWT Auth  │  │  - Tenant    │  │  - Logging   │     │
│  │  - Roles     │  │    Context   │  │  - Transform │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    Controllers                       │  │
│  │  /api/auth      - Login, logout, password reset     │  │
│  │  /api/users     - CRUD users (admin)                │  │
│  │  /api/locations - CRUD locations, QR codes          │  │
│  │  /api/clock     - Clock in/out, sync offline        │  │
│  │  /api/entries   - View/edit time entries            │  │
│  │  /api/approvals - Request/approve edits             │  │
│  │  /api/schedules - View/manage schedules             │  │
│  │  /api/reports   - Generate/download reports         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                     Services                         │  │
│  │  - Business logic                                   │  │
│  │  - Validation (hours limits, geofence, etc.)        │  │
│  │  - Audit logging                                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  Prisma Client                       │  │
│  │  - All queries scoped by tenantId                   │  │
│  │  - Soft deletes where applicable                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Validation Rules (Business Logic)

### Clock-In Validation

```typescript
async validateClockIn(ctx: TenantContext, data: ClockInDto): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // 1. Check if already clocked in
  const openEntry = await this.getOpenEntry(ctx.userId);
  if (openEntry) {
    errors.push('ALREADY_CLOCKED_IN');
  }
  
  // 2. Check 12-hour rest rule
  const lastClockOut = await this.getLastClockOut(ctx.userId);
  if (lastClockOut) {
    const hoursSince = differenceInHours(new Date(), lastClockOut);
    if (hoursSince < 12) {
      errors.push('INSUFFICIENT_REST_PERIOD');
    }
  }
  
  // 3. Validate geofence (if required)
  if (data.locationId && data.coordinates) {
    const location = await this.getLocation(data.locationId);
    if (location.latitude && location.longitude) {
      const distance = calculateDistance(
        data.coordinates,
        { lat: location.latitude, lng: location.longitude }
      );
      if (distance > location.radiusMeters) {
        errors.push('OUTSIDE_GEOFENCE');
      }
    }
  }
  
  // 4. Validate QR token (if provided)
  if (data.qrToken) {
    const token = await this.validateQRToken(data.qrToken, data.locationId);
    if (!token.valid) {
      errors.push('INVALID_QR_TOKEN');
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Hours Limit Validation

```typescript
async checkHoursLimits(ctx: TenantContext, userId: string): Promise<HoursWarning[]> {
  const warnings: HoursWarning[] = [];
  const tenant = await this.getTenant(ctx.tenantId);
  
  // Weekly hours
  const weeklyHours = await this.getWeeklyHours(userId);
  if (weeklyHours >= tenant.maxWeeklyHours) {
    warnings.push({ type: 'WEEKLY_LIMIT_REACHED', hours: weeklyHours });
  } else if (weeklyHours >= tenant.maxWeeklyHours * 0.9) {
    warnings.push({ type: 'WEEKLY_LIMIT_WARNING', hours: weeklyHours });
  }
  
  // Daily hours
  const dailyHours = await this.getTodayHours(userId);
  if (dailyHours >= 9) {
    warnings.push({ type: 'DAILY_LIMIT_REACHED', hours: dailyHours });
  } else if (dailyHours >= 8) {
    warnings.push({ type: 'DAILY_LIMIT_WARNING', hours: dailyHours });
  }
  
  // Annual hours (convenio)
  const annualHours = await this.getAnnualHours(userId);
  if (annualHours >= tenant.maxAnnualHours) {
    warnings.push({ type: 'ANNUAL_LIMIT_REACHED', hours: annualHours });
  } else if (annualHours >= tenant.maxAnnualHours * 0.9) {
    warnings.push({ type: 'ANNUAL_LIMIT_WARNING', hours: annualHours });
  }
  
  return warnings;
}
```

---

## Offline Sync Strategy

### Client-Side Queue (IndexedDB)

```typescript
interface OfflineQueueItem {
  id: string;           // Client-generated UUID
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  payload: {
    timestamp: string;  // ISO 8601
    locationId?: string;
    qrToken?: string;
    coordinates?: { lat: number; lng: number };
  };
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}
```

### Sync Flow

```
1. User clocks in offline
   └── Store in IndexedDB with status='pending'
   
2. Network restored (online event / periodic check)
   └── Service Worker triggers sync
   
3. For each pending item:
   ├── Set status='syncing'
   ├── POST to /api/clock/sync
   │   ├── Success: status='synced', remove from queue
   │   └── Conflict: status='failed', flag for review
   └── Retry logic (max 3 attempts)
   
4. Server-side conflict resolution:
   ├── Duplicate offlineId: Reject (already synced)
   ├── Overlapping entry: Server wins, flag for manager
   └── Success: Create entry with origin='OFFLINE'
```

---

## Convenio Rule Engine

### Configurable Per Tenant

```typescript
interface ConvenioRules {
  code: string;                    // e.g., "30000805011981"
  maxWeeklyHours: number;          // 40
  maxDailyHours: number;           // 9
  maxAnnualHours: number;          // 1822
  minRestBetweenShifts: number;    // 12 hours
  minWeeklyRest: number;           // 1.5 days
  breakAfterHours: number;         // 6
  breakMinutes: number;            // 15
  nightPremiumStart: string;       // "22:00"
  nightPremiumEnd: string;         // "06:00"
  nightPremiumRate: number;        // 1.25 (25%)
}

// Default: Hosteleria de Murcia
const DEFAULT_CONVENIO: ConvenioRules = {
  code: "30000805011981",
  maxWeeklyHours: 40,
  maxDailyHours: 9,
  maxAnnualHours: 1822,
  minRestBetweenShifts: 12,
  minWeeklyRest: 1.5,
  breakAfterHours: 6,
  breakMinutes: 15,
  nightPremiumStart: "22:00",
  nightPremiumEnd: "06:00",
  nightPremiumRate: 1.25,
};
```

---

## Next Steps

1. **Task 2**: Scaffold repo with this schema
2. **Wave 2**: Implement auth, time tracking, QR/geofence
3. **Wave 3**: Approvals, reports, i18n, deployment
