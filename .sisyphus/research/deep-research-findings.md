# Deep Research Findings - Torre Tempo

**Date:** 2025-01-28
**Status:** Complete

---

## 1. Spanish Labor Law (RD-Ley 8/2019)

### Legal Basis
- **Law**: Real Decreto-ley 8/2019, de 8 de marzo (BOE-A-2019-3481)
- **Effective**: May 12, 2019
- **Modifies**: Article 34 of Estatuto de los Trabajadores (Workers' Statute)

### Core Requirements

| Requirement | Detail |
|-------------|--------|
| **What to record** | Start and end time of each worker's daily shift |
| **Who** | ALL workers under ET Article 1 scope |
| **Retention** | 4 years minimum (we do 5) |
| **Access** | Workers, legal representatives, Labor Inspectorate |
| **Format** | Objective, reliable, accessible, tamper-proof |

### Exceptions (NOT required to register)
- Senior management (alta direccion) under RD 1382/1985
- Special labor relationships (some categories)
- Self-employed (autonomos)
- Cooperative members (socios trabajadores)

### Who IS Included
- Mobile workers, commercial staff
- Remote/teleworkers
- Temporary workers (ETT)
- Part-time workers
- Workers with flexible hours (still must record actual times)

### Penalties (Sanciones)
| Severity | Amount | Trigger |
|----------|--------|---------|
| Minor (leve) | 626 - 6,250 | Formal defects in registry |
| Serious (grave) | 6,251 - 25,000 | Systematic non-compliance |
| Very Serious (muy grave) | 25,001 - 187,515 | Repeated violations, fraud |

### Upcoming Changes (Draft Royal Decree 2025-2026)
- **Mandatory digital format** (paper prohibited)
- **Real-time remote access** for Labor Inspectorate
- **Interoperable system** across companies
- **Cannot modify unilaterally** - employee consent required for changes
- **Phased rollout**: 2026 full adoption

---

## 2. Estatuto de los Trabajadores - Article 34

### Working Time Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Weekly max | 40 hours | Effective work, annual average |
| Daily max | 9 hours | Unless collective agreement allows more |
| Under-18 daily max | 8 hours | Strict limit |

### Rest Periods

| Type | Duration | Condition |
|------|----------|-----------|
| Between shifts | 12 hours minimum | Between end of one day and start of next |
| Weekly rest | 1.5 days uninterrupted | Usually includes all Sunday |
| Break during shift | 15 minutes | After 6+ continuous hours |
| Under-18 break | 30 minutes | After 4.5+ hours |

### Overtime (Horas Extraordinarias)
- Must be voluntary (except emergency/force majeure)
- Max 80 hours/year ordinary overtime
- Compensated by: time off (within 4 months) OR pay (min 175% of normal rate, unless collective agreement)

---

## 3. Convenio Hosteleria de Murcia (30000805011981)

### Basic Info
- **Code**: 30000805011981
- **Validity**: March 1, 2023 - December 31, 2025
- **Published**: BORM July 10, 2023
- **Parties**: CCOO, UGT, HOYTU, HOSTECAR

### Working Time

| Metric | Value |
|--------|-------|
| Weekly hours | 40 hours effective work |
| Annual hours | 1,822 hours maximum |
| Weekly rest | 2 days mandatory |

### Night Work Premiums
- Night work: 10pm - 6am
- Premium: 25% surcharge for hours between 1am - 6am
- If job is inherently nocturnal: 10% base salary increase instead

### Salary Updates (2023-2025)
- 2023: +15.8%
- 2024: +3%
- 2025: +3%
- Guarantee: minimum 0.5% above SMI

### Implementation Note
System should validate:
- Weekly hours <= 40
- Annual hours <= 1,822
- Flag warnings at 90% thresholds
- Support future convenios via configurable rule engine

---

## 4. GDPR & Biometrics (AEPD Guidelines)

### AEPD Position (November 2023)
The Spanish Data Protection Agency (AEPD) has issued clear guidance **advising against** biometrics for time tracking.

### Key Points

| Aspect | Requirement |
|--------|-------------|
| Classification | Biometric data = Special Category Data (GDPR Art. 9) |
| Default | Processing PROHIBITED |
| Consent validity | Generally INVALID in employment (power imbalance) |
| DPIA | MANDATORY before implementation |
| Alternatives | MUST offer non-biometric options |

### Why Consent Fails
- Employee-employer relationship creates power imbalance
- "Voluntary" consent questionable when job depends on compliance
- AEPD June 2024 resolution: biometric time tracking = high risk

### Our Decision: NO BIOMETRICS
**Correct approach.** Use instead:
- QR codes (something you have)
- Geofencing (where you are)
- PIN/password (something you know)
- Audit trail for accountability

---

## 5. Multi-Tenant Architecture (PostgreSQL RLS)

### Recommended Pattern: Row-Level Security

```sql
-- 1. Add tenant_id to all tables
CREATE TABLE time_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  -- ...
);

-- 2. Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- 3. Create policy
CREATE POLICY tenant_isolation ON time_entries
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 4. Application sets context
SET app.current_tenant = 'tenant-uuid-here';
```

### Why RLS > Application-Layer Filtering
- **Defense in depth**: Even if app code has bugs, DB enforces isolation
- **Centralized**: Policy defined once, enforced everywhere
- **Auditable**: Clear security boundary
- **Performance**: Postgres optimizes RLS queries

### Implementation Steps
1. Every tenant-scoped table gets `tenant_id UUID NOT NULL`
2. Enable RLS on each table
3. Create USING policy checking `current_setting('app.current_tenant')`
4. Middleware sets tenant context on every request
5. Superuser/admin queries bypass RLS only when explicitly needed

---

## 6. PWA Offline Sync Pattern

### Architecture

```
[User Action] 
    |
    v
[Check Online?]
    |
    +-- Online --> [API Call] --> [Update IndexedDB cache]
    |
    +-- Offline --> [Queue in IndexedDB] --> [Background Sync later]
```

### IndexedDB Schema for Offline Queue

```typescript
interface OfflineQueueItem {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'EDIT_REQUEST';
  payload: {
    timestamp: string;      // ISO 8601
    locationId?: string;
    coordinates?: { lat: number; lng: number };
    qrToken?: string;
  };
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
}
```

### Conflict Resolution Strategy
| Scenario | Resolution |
|----------|------------|
| Offline clock-in, server has newer entry | Server wins; flag for manager review |
| Duplicate clock-in timestamps | Keep first, reject second |
| Offline edit during approved period | Reject; notify user |

### Service Worker Background Sync

```typescript
// Register sync
navigator.serviceWorker.ready.then(sw => {
  return sw.sync.register('sync-clock-entries');
});

// Service worker handles sync event
self.addEventListener('sync', event => {
  if (event.tag === 'sync-clock-entries') {
    event.waitUntil(syncOfflineQueue());
  }
});
```

### Libraries
- **IndexedDB**: `idb` (lightweight wrapper) or `Dexie.js` (full ORM)
- **Service Worker**: Workbox (Google's PWA toolkit)
- **State**: TanStack Query with `persistQueryClient` for cache persistence

---

## 7. Signature Capture Implementation

### Recommended Library
`react-signature-canvas` - mature, touch-friendly, React-native compatible

### Implementation

```tsx
import SignatureCanvas from 'react-signature-canvas';

function SignatureCapture({ onSave }: { onSave: (base64: string) => void }) {
  const sigRef = useRef<SignatureCanvas>(null);

  const handleSave = () => {
    if (sigRef.current) {
      const base64 = sigRef.current.toDataURL('image/png');
      onSave(base64);
    }
  };

  const handleClear = () => sigRef.current?.clear();

  return (
    <div>
      <SignatureCanvas
        ref={sigRef}
        canvasProps={{
          className: 'signature-canvas',
          width: 400,
          height: 200,
        }}
        penColor="black"
      />
      <button onClick={handleClear}>Clear</button>
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### Storage
- **In PDF**: Embed base64 as image + store hash in metadata
- **In DB**: Store base64 string with timestamp and user ID
- **Verification**: Hash of (signature + document content + timestamp) for integrity

---

## 8. Labor Inspection Access Requirements

### Current (RD-Ley 8/2019)
- Records must be at workplace or immediately accessible
- Inspector can request on-site or remote access
- Must provide within reasonable time

### Future (Draft Royal Decree)
- **Real-time remote access** for inspectors
- **Digital interoperable format** required
- **Immediate availability** - no delays allowed

### System Requirements
- Export function: CSV, XLSX, PDF on demand
- API endpoint for inspector access (authenticated)
- Audit log of all access requests
- Data must be unaltered (audit trail proves integrity)

---

## 9. Feature Comparison (Market Research)

### Common Features in 2024 Time Tracking Apps

| Feature | Priority | Our Plan |
|---------|----------|----------|
| Mobile app / PWA | Essential | Yes |
| Geofencing | High | Yes |
| QR code clock-in | High | Yes |
| Offline support | High | Yes |
| GPS tracking | Medium | Geofence only (privacy) |
| Photo proof | Medium | No (v1) |
| Biometrics | Low | No (AEPD guidance) |
| Employee self-service | Essential | Yes |
| Manager approvals | Essential | Yes |
| Scheduling | High | Yes |
| Reports/exports | Essential | Yes (PDF/CSV/XLSX) |
| Multi-language | High | Yes (6 locales) |
| Integrations (payroll) | Medium | No (v1) |

---

## 10. Key Takeaways for Implementation

### Legal Compliance Checklist
- [ ] Record start/end time per worker per day
- [ ] Store for 5 years (exceeds 4-year minimum)
- [ ] Employee can view own records anytime
- [ ] Manager/admin can view team records
- [ ] Export capability for inspector
- [ ] Immutable audit log for all changes
- [ ] No unilateral modifications (approval required)

### Technical Priorities
1. **Multi-tenant isolation** via PostgreSQL RLS
2. **Offline-first PWA** with IndexedDB + Background Sync
3. **Audit trail** on every data mutation
4. **Signature capture** with integrity hash
5. **Convenio rules** as configurable engine

### Anti-Patterns Confirmed
- NO biometrics (AEPD guidance)
- NO silent edits (audit required)
- NO paper-only records (digital required soon)
- NO cross-tenant queries (RLS enforces)

---

## Sources

1. BOE-A-2019-3481: https://www.boe.es/buscar/doc.php?id=BOE-A-2019-3481
2. Ministry Guide: https://www.mites.gob.es/ficheros/ministerio/GuiaRegistroJornada.pdf
3. AEPD Biometric Guide: https://www.aepd.es/guides/guidelines-clocking-and-attendance-control-processing-using-biometric-systems.pdf
4. AWS RLS Guide: https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security
5. PostgreSQL RLS Docs: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
6. Convenio Summary: https://ccoo.app/convenio/convenio-colectivo-hosteleria-de-c-autonoma-de-murcia/
