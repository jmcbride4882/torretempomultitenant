# Torre Tempo

**Spanish Labor Law Compliant Staff Clocking System**

A multi-tenant PWA for time tracking (registro horario) compliant with RD-Ley 8/2019 and Convenio Hosteleria de Murcia.

---

## Status: Planning Complete

| Document | Location |
|----------|----------|
| Agent Guidelines | `AGENTS.md` |
| Work Plan | `.sisyphus/plans/staff-clocking-app.md` |
| Deep Research | `.sisyphus/research/deep-research-findings.md` |

---

## What We're Building

**Core**: PWA web app for staff clock-in/out with QR codes, geofencing, offline support, approvals, scheduling, and compliant reporting.

**Target**: Hosteleria de Murcia businesses (convenio 30000805011981)

**Future**: Multi-tenant SaaS for any Spanish business

---

## Key Features

| Feature | Description |
|---------|-------------|
| **QR Clock-in** | Scan location QR code to clock in |
| **Geofencing** | Validate employee is at work location |
| **Offline Mode** | Queue clock-ins when offline, sync later |
| **Approvals** | Manager approves time entry edits |
| **Monthly PDF** | Signed reports with in-app signature |
| **Exports** | CSV/XLSX for payroll and audits |
| **Multi-language** | ES/EN/FR/DE/PL/NL-BE |
| **Multi-tenant** | SaaS-ready from day one |

---

## Legal Compliance

### RD-Ley 8/2019 (Registro Horario)
- Daily start/end time per worker
- 5-year retention (exceeds 4-year minimum)
- Employee and inspector access
- Immutable audit trail

### Workers' Statute Article 34
- 40 hours/week max
- 9 hours/day max
- 12 hours rest between shifts
- 15-minute break after 6 hours

### Convenio Hosteleria de Murcia
- 1,822 hours/year max
- 2 rest days/week
- Night premiums (25% for 1am-6am)

### AEPD Guidance
- **NO biometrics** (special category data, consent invalid in employment)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind |
| PWA | vite-plugin-pwa + Workbox |
| State | TanStack Query + Zustand |
| Offline | IndexedDB + Service Worker |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL + Prisma |
| Auth | Passport + JWT |
| Queue | BullMQ + Redis |
| i18n | i18next |

---

## Project Structure

```
torre-tempo/
├── apps/
│   ├── web/              # React PWA frontend
│   └── api/              # NestJS backend
├── packages/
│   └── shared/           # Shared types
├── infra/
│   ├── docker-compose.yml
│   └── nginx/
├── AGENTS.md             # Agent guidelines
└── README.md             # This file
```

---

## Roles

| Role | Capabilities |
|------|--------------|
| **Employee** | Clock in/out, view own records, sign monthly PDF |
| **Manager** | Above + view team, approve edits, create schedules |
| **Admin** | Above + manage locations, users, exports, settings |

---

## What's NOT in v1

- Biometrics (AEPD guidance)
- PTO/leave requests
- Payroll integration
- SSO (email/password only)
- Photo proof

---

## Getting Started

> **Note**: Project is in planning phase. Implementation will follow the work plan.

```bash
# After scaffold (Wave 1, Task 2)
npm install
npm run dev
```

---

## Commands (Planned)

```bash
npm run dev           # Start web + API
npm run dev:web       # Web only
npm run dev:api       # API only
npm test              # Run all tests
npm run build         # Production build
npx prisma migrate dev    # Run migrations
```

---

## License

Proprietary - All rights reserved

---

## Contact

[Your contact info here]
