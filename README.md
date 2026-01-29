# Torre Tempo

**LSLT Group Internal Staff Clocking System**

Internal Progressive Web App (PWA) for Spanish labor law compliant time tracking (registro horario).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)

---

## Overview

Torre Tempo is an internal time tracking system for LSLT Group staff, ensuring compliance with Spanish labor law (RD-Ley 8/2019).

**Key Features:**
- QR code + geofence clock-in/out
- Offline support (PWA)
- Multi-language support (ES, EN, FR, DE, PL, NL-BE)
- Manager approvals workflow
- Compliant PDF reports
- Mobile-first responsive design

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS |
| **State** | TanStack Query + Zustand |
| **i18n** | i18next |
| **Backend** | NestJS + TypeScript |
| **Database** | PostgreSQL 16 + Prisma |
| **Queue** | BullMQ + Redis |
| **Deployment** | Docker + Nginx |

---

## Project Structure

```
torre-tempo/
├── apps/
│   ├── web/          # React PWA Frontend
│   └── api/          # NestJS Backend
├── packages/
│   └── shared/       # Shared TypeScript types
├── infra/            # Docker & deployment
└── docs/             # Documentation
```

---

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Commands

```bash
npm run dev          # Start dev servers (web + api)
npm run build        # Build for production
npm run db:migrate   # Run Prisma migrations
npm test             # Run tests
```

---

## Deployment

For internal deployment instructions, contact your system administrator.

---

## Support

For technical support or issues, contact:
- **Email:** info@lsltgroup.es
- **Developer:** John McBride

---

**© 2026 LSLT Group | Developed by John McBride**
