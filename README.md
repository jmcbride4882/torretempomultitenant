# Torre Tempo

Multi-tenant PWA for Spanish labor law compliant time tracking (registro horario).

## Features

- **QR + Geofence Clock-in**: Workers clock in by scanning location QR codes, validated against GPS boundaries
- **Offline Support**: PWA queues clock-ins when offline, syncs when connection restored
- **Spanish Labor Law Compliance**: RD-Ley 8/2019 compliant with 5-year retention
- **Multi-tenant**: Complete data isolation per organization
- **Convenio Support**: Hosteleria de Murcia (30000805011981) with 40h/week, 1822h/year limits
- **Manager Approvals**: Edit requests require manager sign-off
- **Signed Reports**: Monthly PDF reports with employee signature acknowledgment
- **Multi-language**: ES, EN, FR, DE, PL, NL-BE

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| State | TanStack Query + Zustand |
| i18n | i18next |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL + Prisma |
| Queue | BullMQ + Redis |
| Storage | S3-compatible |

## Getting Started

### Prerequisites

- Node.js >= 20
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis (or use Docker)

### Development Setup

```bash
# Install dependencies
npm install

# Start database and Redis
docker compose up -d postgres redis

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

The web app runs at http://localhost:5173 and API at http://localhost:3000.

### Commands

```bash
npm run dev           # Start web + API concurrently
npm run dev:web       # Web only (Vite)
npm run dev:api       # API only (NestJS)
npm run build         # Build all
npm run test          # Run all tests
npm run lint          # ESLint + Prettier check
npm run db:migrate    # Run Prisma migrations
npm run db:studio     # Open Prisma Studio
```

## Project Structure

```
torre-tempo/
├── apps/
│   ├── web/              # React + Vite PWA
│   └── api/              # NestJS backend
├── packages/
│   └── shared/           # Shared types and constants
├── infra/
│   ├── docker-compose.yml
│   └── nginx/
└── docs/
```

## Legal Compliance

This application is designed to comply with:

- **RD-Ley 8/2019**: Mandatory time tracking for all employees
- **Workers' Statute Article 34**: Working time limits (40h/week, 9h/day)
- **GDPR**: EU data protection (no biometrics, proper consent)
- **Convenio Hosteleria de Murcia**: 1,822 hours/year maximum

## License

Proprietary - LSLT Group
