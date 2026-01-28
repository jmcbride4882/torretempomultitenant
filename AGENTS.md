# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-28 21:43
**Commit:** 0255da4
**Branch:** main

## OVERVIEW
Torre Tempo is a multi-tenant staff clocking system for Spanish labor-law compliance, delivered as a React PWA + NestJS API monorepo. Core stack: Vite/Tailwind frontend, Prisma/Postgres backend, Redis queues, Docker infra.

## STRUCTURE

```
torre-tempo/
├── apps/
│   ├── web/              # React + Vite PWA
│   └── api/              # NestJS API
├── packages/
│   └── shared/           # Shared types/constants
├── infra/                # Docker + nginx + deploy scripts
└── docs/
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add UI route/screen | `apps/web/src/App.tsx` | Routes inline for now |
| Landing marketing page | `apps/web/src/features/landing/LandingPage.tsx` | Public site |
| Auth/API endpoints | `apps/api/src/auth/` | Service + DTOs; controller wiring still stub |
| DB schema | `apps/api/prisma/schema.prisma` | Multi-tenant models |
| Shared domain types | `packages/shared/src/index.ts` | Enums, interfaces, constants |
| Infra deploy | `infra/` | Dockerfiles, compose, scripts |

## CONVENTIONS
- TypeScript base config adds `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess` (`tsconfig.base.json`).
- Web path alias: `@/*` → `apps/web/src/*`.
- API has global `/api` prefix + ValidationPipe (`apps/api/src/main.ts`).
- i18n locales live in `apps/web/src/i18n/locales`.

## ANTI-PATTERNS (THIS PROJECT)
- No queries without `tenantId` filter on tenant-scoped tables.
- No `console.log` in production code (use logger).
- No `any`, `@ts-ignore`, or type-escape casts.
- No biometrics, PTO, payroll, or SSO in v1.
- No hardcoded UI strings (use i18n keys).

## UNIQUE STYLES
- Keep page components inline in `apps/web/src/App.tsx` until they exceed ~50 lines.
- Multi-tenant isolation is enforced at app layer (tenantId in queries); RLS planned.
- PWA service worker registration is in `apps/web/src/main.tsx`.

## COMMANDS

```bash
npm run dev
npm run build
npm run db:migrate
npm test
```

## NOTES
- No CI workflows in `.github/workflows` (none present).
- Tests are configured (Jest/Vitest/Playwright) but none exist yet.
- `apps/*/dist` and `packages/shared/dist` are build outputs; avoid manual edits.
