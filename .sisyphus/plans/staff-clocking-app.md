# Staff Clocking App (Spain) — Work Plan

## TL;DR

> **Quick Summary**: Build a greenfield multi-tenant web app + PWA for staff clock-in/out, scheduling, approvals, and compliant reporting under Spain’s registro horario rules and the Hosteleria de Murcia convenio (30000805011981).
>
> **Deliverables**:
> - PWA web app (Employee/Manager/Admin) with QR + geofence clocking, offline queue
> - Multi-tenant backend API + database with audit log and retention policy
> - Reporting: monthly signed PDF + CSV/XLSX exports; employee self-service access
> - Scheduling module, approvals workflow, and compliance access/export tools
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Data model → Auth/tenant core → Time tracking → Reporting/compliance

---

## Context

### Original Request
Build a staff clocking in/out app that is 100% compliant with Spanish labor law and Hosteleria de Murcia convenio (code 30000805011981). Must support BYOD, mobile clocking via PWA, modern UI, and “all features most systems have,” with multi-tenant SaaS readiness.

### Interview Summary
**Key Decisions**:
- Platform: greenfield web app + PWA, BYOD friendly
- Auth: email/password (SSO later)
- Proof-of-presence: QR code per location + geofence (no biometrics in v1)
- Offline: queue clock-ins/offline sync
- Multi-tenant from day one; roles: Employee/Manager/Admin
- Shift scheduling included; PTO excluded for v1
- Reporting: monthly PDF with in-app signature + CSV/XLSX
- Data retention: 5 years; EU-only hosting; Ubuntu 25.04
- Languages: ES/EN/FR/DE/PL/NL-BE with installable language packs
- Test strategy: tests after implementation

**Research Findings** (Deep Research Completed 2025-01-28):

**Legal Framework (RD-Ley 8/2019)**:
- Daily registro horario mandatory since May 12, 2019
- Must record start/end times for EACH worker EACH day
- Records retained 4 years minimum (we do 5)
- Accessible to: workers, legal reps, Labor Inspectorate
- Penalties: €626-€6,250 (minor) up to €187,515 (very serious)
- Upcoming: mandatory digital format + real-time inspector access (2026)

**Workers' Statute Article 34 Limits**:
- 40 hours/week max (annual average)
- 9 hours/day max (unless collective agreement)
- 12 hours minimum rest between shifts
- 15-minute break after 6 continuous hours
- 1.5 days weekly rest (uninterrupted)

**Convenio Hosteleria de Murcia (30000805011981)**:
- Validity: March 2023 - December 2025
- 40 hours/week, 1,822 hours/year max
- 2 rest days/week mandatory
- Night premium: 25% surcharge (1am-6am)
- Salary updates: +15.8% (2023), +3% (2024), +3% (2025)

**AEPD/Biometrics Guidance (November 2023)**:
- Biometrics = Special Category Data under GDPR
- AEPD advises AGAINST biometrics for time tracking
- Consent invalid in employment (power imbalance)
- Our decision: NO biometrics is CORRECT

**Technical Patterns Confirmed**:
- Multi-tenant: PostgreSQL Row-Level Security (RLS)
- Offline sync: IndexedDB + Service Worker + Background Sync API
- Signature capture: react-signature-canvas + base64 export

### Deep Research
**Status**: Complete. Full findings in `.sisyphus/research/deep-research-findings.md`

---

## Work Objectives

### Core Objective
Deliver a compliant, intuitive, mobile-first time tracking and scheduling system with multi-tenant SaaS readiness, aligned with Spanish registro horario requirements and the Hosteleria de Murcia convenio.

### Concrete Deliverables
- PWA + web app UI for Employee/Manager/Admin
- Backend API + DB schema with audit logs, retention, and multi-tenant isolation
- QR/geofence clocking workflow and offline sync
- Scheduling, approvals, and reporting (PDF + CSV/XLSX)
- i18n with language pack support

### Definition of Done
- [ ] Clock-in/out captures start/end time per employee and is exportable
- [ ] Records are accessible to employees and exportable for inspector access
- [ ] Monthly PDF report includes in-app signature + audit trail
- [ ] CSV/XLSX exports generated on demand
- [ ] Data retention job preserves 5 years and purges beyond
- [ ] Multi-tenant isolation verified (no cross-tenant data access)
- [ ] Offline queue syncs reliably and flags conflicts

### Must Have
- Registro horario: daily start/end per worker, accessible to employee/inspector
- Audit log of edits with manager approval + reason
- QR + geofence clock-in validation, BYOD, PWA offline queue
- Monthly signed PDF + CSV/XLSX exports
- Multi-tenant SaaS-ready architecture

### Must NOT Have (Guardrails)
- No biometrics in v1 (AEPD guidance: avoid for time tracking)
- No PTO/leave requests in v1
- No payroll integration in v1
- No SSO in v1 (email/password only)
- No photo proof in v1

### Legal Compliance Rules (Hardcoded)

| Rule | Limit | System Action |
|------|-------|---------------|
| Weekly hours | 40 max | Warn at 36, block at 40 |
| Daily hours | 9 max | Warn at 8, block at 9 |
| Annual hours (convenio) | 1,822 max | Track cumulative, warn at 1,640 |
| Rest between shifts | 12 hours min | Block clock-in if <12h since clock-out |
| Data retention | 5 years | Auto-archive, never delete |
| Audit trail | All edits | Immutable log, no silent changes |

---

## Verification Strategy (Tests After)

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **User wants tests**: Tests after implementation
- **Framework**: Vitest (unit/integration), Playwright (E2E)

Each task includes manual QA steps and tests added after implementation for critical flows.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundations)
- Task 1: Product architecture + data model
- Task 2: Repo scaffold + core services

Wave 2 (Core Features)
- Task 3: Auth + tenant/role management
- Task 4: Time tracking core + offline queue
- Task 5: QR/geofence validation + location management
- Task 6: Scheduling module

Wave 3 (Compliance + UX)
- Task 7: Approvals + audit log
- Task 8: Reporting (PDF + CSV/XLSX) + signature capture
- Task 9: i18n + language packs
- Task 10: UI/UX polish + PWA installability
- Task 11: Deployment on Ubuntu 25.04

Critical Path: Task 1 → Task 3 → Task 4 → Task 8

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3,4,5,6 | 2 |
| 2 | None | 3,4,5,6 | 1 |
| 3 | 1,2 | 4,5,6,7 | 4,5,6 |
| 4 | 1,3 | 7,8 | 5,6 |
| 5 | 1,3 | 4,8 | 4,6 |
| 6 | 1,3 | 8 | 4,5 |
| 7 | 4 | 8 | 6 |
| 8 | 4,7 | 9,10 | 9,10 |
| 9 | 2 | 10 | 8 |
| 10 | 8,9 | 11 | None |
| 11 | 2,10 | None | None |

---

## TODOs

> Note: Greenfield project. File paths below are proposed targets for implementation.

- [x] 1. Define product architecture + data model (multi-tenant)

  **What to do**:
  - Define tenant isolation strategy (tenant_id everywhere)
  - Model entities: orgs, users, roles, locations, geofences, QR tokens, shifts, schedules, time entries, edit requests, approvals, audit log, reports, signatures
  - Map Hosteleria de Murcia constraints into rule engine (hours/week, annual cap)

  **Must NOT do**:
  - No biometrics, no PTO, no payroll

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Cross-cutting architecture + compliance mapping
  - **Skills**: (none required)
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI work not needed here
    - `playwright`: not needed for modeling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 3,4,5,6
  - **Blocked By**: None

  **References**:
  - External: https://www.boe.es/buscar/doc.php?id=BOE-A-2019-3481 (registro horario obligation)
  - External: https://www.mites.gob.es/ficheros/ministerio/GuiaRegistroJornada.pdf (Ministerio guide)
  - External: https://ccoo.app/convenio/convenio-colectivo-hosteleria-de-c-autonoma-de-murcia/ (convenio summary; verify official text)

  **Acceptance Criteria**:
  - [ ] Data model document created with entity list + key fields
  - [ ] Tenant isolation rules documented
  - [ ] Convenio rule placeholders identified for future agreements

  **Manual Verification**:
  - [ ] Review model doc for completeness and compliance coverage

- [x] 2. Scaffold repo + core services (PWA + API)

  **What to do**:
  - Choose default stack: React + Vite + TypeScript + Tailwind + i18next + Vite PWA plugin
  - Backend: Node.js (NestJS), PostgreSQL, Prisma ORM, Redis (queues), S3-compatible storage
  - Define project structure (apps/web, apps/api, packages/shared)

  **Must NOT do**:
  - Avoid heavyweight HRIS or payroll modules

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: cross-service scaffolding
  - **Skills**: (none required)
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: design later

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 3,4,5,6,9,11
  - **Blocked By**: None

  **References**:
  - Proposed: `apps/web` (PWA frontend)
  - Proposed: `apps/api` (backend API)
  - Proposed: `packages/shared` (shared types)

  **Acceptance Criteria**:
  - [ ] Web app builds and runs locally
  - [ ] API runs locally with health check

  **Manual Verification**:
  - [ ] `npm run dev` launches web + API

- [x] 3. Auth + tenant/role management

  **What to do**:
  - Implement email/password login + password reset
  - Tenant-scoped RBAC for Employee/Manager/Admin
  - Tenant onboarding flow (admin creates org + locations)

  **Must NOT do**:
  - No SSO in v1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4–6)
  - **Blocks**: 4,5,6,7
  - **Blocked By**: 1,2

  **References**:
  - Proposed: `apps/api/src/auth`
  - Proposed: `apps/web/src/features/auth`

  **Acceptance Criteria**:
  - [ ] Login/logout works
  - [ ] Tenant isolation enforced for all auth endpoints

  **Manual Verification**:
  - [ ] Log in as admin and verify no cross-tenant data access

- [x] 4. Time tracking core + offline queue

  **What to do**:
  - Clock-in/out with start/end time, time zone handling
  - Optional break tracking (pause/resume) for completeness
  - Offline queue using IndexedDB with conflict resolution on sync
  - Server validation: geofence/QR proof present when required

  **Must NOT do**:
  - No biometrics

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3,5,6)
  - **Blocks**: 7,8
  - **Blocked By**: 1,3

  **References**:
  - External: https://www.boe.es/buscar/doc.php?id=BOE-A-2019-3481
  - Proposed: `apps/api/src/time-tracking`
  - Proposed: `apps/web/src/features/clocking`

  **Acceptance Criteria**:
  - [ ] Clock-in/out creates records with start/end timestamps
  - [ ] Offline entries sync and are marked with origin + sync time

  **Manual Verification**:
  - [ ] Disable network, clock-in, then re-enable and verify sync

- [x] 5. QR + geofence validation + location management

  **What to do**:
  - Admin creates locations with geofence boundaries
  - Generate per-location QR codes; PWA scans QR at clock-in
  - Validate geofence + QR before accepting clock-in

  **Must NOT do**:
  - No biometric or photo proof

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 4,8
  - **Blocked By**: 1,3

  **References**:
  - Proposed: `apps/api/src/locations`
  - Proposed: `apps/web/src/features/locations`

  **Acceptance Criteria**:
  - [ ] QR scan ties to location
  - [ ] Geofence validation rejects out-of-bounds clock-ins

  **Manual Verification**:
  - [ ] Scan QR inside/outside geofence and confirm results

- [x] 6. Scheduling module

  **What to do**:
  - Create shifts and schedules per location/team
  - Allow managers to publish schedules to employees
  - Track scheduled vs actual hours for compliance

  **Must NOT do**:
  - No PTO/leave requests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 8
  - **Blocked By**: 1,3

  **References**:
  - Proposed: `apps/api/src/scheduling`
  - Proposed: `apps/web/src/features/scheduling`

  **Acceptance Criteria**:
  - [ ] Managers can create/publish schedules
  - [ ] Employees can view their schedules

  **Manual Verification**:
  - [ ] Publish schedule and confirm employee view

- [x] 7. Edit approvals + audit log

  **What to do**:
  - Employees request edits with reason
  - Managers approve/reject; audit log captures before/after
  - Immutable audit events with timestamps and actor identity

  **Must NOT do**:
  - No silent edits without approval

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 8
  - **Blocked By**: 4

  **References**:
  - Proposed: `apps/api/src/audit`
  - Proposed: `apps/web/src/features/approvals`

  **Acceptance Criteria**:
  - [ ] Edit requests require manager approval
  - [ ] Audit log retains before/after values + reason

  **Manual Verification**:
  - [ ] Submit edit, approve, and verify audit trail

- [x] 8. Reporting + signed monthly PDF + CSV/XLSX exports

  **What to do**:
  - Generate monthly reports per employee + company
  - Include signature capture (canvas) + audit hash in PDF
  - Export CSV/XLSX for payroll/audits
  - Ensure employee self-service access to own reports

  **Must NOT do**:
  - No external payroll integration in v1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 9,10
  - **Blocked By**: 4,7

  **References**:
  - External: https://www.boe.es/buscar/doc.php?id=BOE-A-2019-3481
  - Proposed: `apps/api/src/reports`
  - Proposed: `apps/web/src/features/reports`

  **Acceptance Criteria**:
  - [ ] PDF report renders and stores signature metadata
  - [ ] CSV/XLSX exports generated correctly

  **Manual Verification**:
  - [ ] Generate report for a test month and download PDF/CSV/XLSX

- [x] 9. i18n + language packs

  **What to do**:
  - Implement i18n framework
  - Provide initial locales: ES/EN/FR/DE/PL/NL-BE
  - Allow optional language pack installation after deploy

  **Must NOT do**:
  - No auto-translation in v1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 10
  - **Blocked By**: 2

  **References**:
  - Proposed: `apps/web/src/i18n`

  **Acceptance Criteria**:
  - [ ] Language switcher works
  - [ ] Language packs can be added post-deploy

  **Manual Verification**:
  - [ ] Switch among locales and verify UI text updates

- [x] 10. Modern UI/UX + PWA polish

  **What to do**:
  - Create modern, intuitive mobile-first UX
  - PWA installability, offline indicators, sync status
  - Role-based dashboards (Employee/Manager/Admin)

  **Must NOT do**:
  - Avoid generic boilerplate UI

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Required for modern, intentional UI
  - **Skills Evaluated but Omitted**:
    - `playwright`: not required for design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 11
  - **Blocked By**: 8,9

  **References**:
  - Proposed: `apps/web/src/features/dashboard`

  **Acceptance Criteria**:
  - [ ] PWA installable on mobile
  - [ ] UI usable on desktop + mobile

  **Manual Verification**:
  - [ ] Install PWA and verify offline indicator

- [ ] 11. Deployment on Ubuntu 25.04

  **What to do**:
  - Dockerized deployment (web + API + DB + Redis)
  - HTTPS, backups, retention jobs
  - Monitoring/logging for audit compliance

  **Must NOT do**:
  - No external SaaS dependencies that violate EU-only hosting

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: (none required)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: 2,10

  **References**:
  - Proposed: `infra/docker-compose.yml`
  - Proposed: `infra/nginx/`

  **Acceptance Criteria**:
  - [ ] App runs on Ubuntu 25.04 with HTTPS
  - [ ] Backups and retention job documented

  **Manual Verification**:
  - [ ] Deploy and verify web + API health

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `chore(scaffold): initialize web and api` | `apps/web`, `apps/api` | `npm run dev` |
| 4 | `feat(time-tracking): clock in/out with offline queue` | `apps/api/src/time-tracking`, `apps/web/src/features/clocking` | `npm test` |
| 8 | `feat(reports): signed pdf and exports` | `apps/api/src/reports`, `apps/web/src/features/reports` | `npm test` |

---

## Success Criteria

### Verification Commands
```bash
npm test
npm run dev
```

### Final Checklist
- [ ] All Must Have items complete
- [ ] Must NOT Have items not implemented
- [ ] Legal compliance evidence (exportable records + audit logs)
- [ ] PWA works on modern desktop + mobile browsers
