# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-01 00:32
**Commit:** f91395f
**Branch:** main

## OVERVIEW
Torre Tempo is a multi-tenant staff clocking system for Spanish labor-law compliance, delivered as a React PWA + NestJS API monorepo. Core stack: Vite/Tailwind frontend, Prisma/Postgres backend, Redis queues, Docker infra.

## STRUCTURE

```
torre-tempo/
├── apps/
│   ├── web/              # React + Vite PWA (mobile-first)
│   │   └── src/components/BottomNav.tsx  # Mobile navigation
│   ├── api/              # NestJS API
│   └── mobile/           # React Native (stub)
├── packages/
│   └── shared/           # Shared types/constants
├── infra/                # Docker + nginx + deploy scripts
├── docs/                 # Documentation
└── scripts/              # Migration scripts
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add UI route/screen | `apps/web/src/App.tsx` | Routes inline for now |
| Landing marketing page | `apps/web/src/features/landing/LandingPage.tsx` | Public site |
| Mobile navigation | `apps/web/src/components/BottomNav.tsx` | Bottom nav for <768px |
| Auth/API endpoints | `apps/api/src/auth/` | Service + DTOs; controller wiring still stub |
| DB schema | `apps/api/prisma/schema.prisma` | Multi-tenant models |
| Shared domain types | `packages/shared/src/index.ts` | Enums, interfaces, constants |
| Infra deploy | `infra/` | Dockerfiles, compose, scripts |
| API client | `apps/web/src/lib/api.ts` | Centralized fetch with token injection |
| State management | `apps/web/src/lib/store.ts` | Zustand stores (auth, clock, offline, UI) |
| Offline sync | `apps/web/src/lib/offline-queue.ts` | IndexedDB queue with retry logic |

## CONVENTIONS
- TypeScript base config adds `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess` (`tsconfig.base.json`).
- Web path alias: `@/*` → `apps/web/src/*`.
- API has global `/api` prefix + ValidationPipe (`apps/api/src/main.ts`).
- i18n locales live in `apps/web/src/i18n/locales`.
- Mobile-first: Bottom nav on <768px, huge buttons (96px dashboard, 80px clocking), touch targets ≥44px.
- **No Prettier** - ESLint only; 2-space indentation inferred.
- **Underscore-prefixed variables** ignored by linter (intentional unused params).
- **ESLint**: `console.log` blocked (warn/error only), `@typescript-eslint/no-explicit-any` is warn.
- **Test coverage**: 70% (web), 80% (API) minimum thresholds.

## ANTI-PATTERNS (THIS PROJECT)
- **CRITICAL**: No queries without `tenantId` filter on tenant-scoped tables.
- **CRITICAL**: Audit logs NEVER hard-deleted (5-year retention, Spanish law). `RetentionService` archives only.
- No `console.log` in production code (use logger).
- No `any`, `@ts-ignore`, or type-escape casts.
- No biometrics, PTO, payroll, or SSO in v1.
- No hardcoded UI strings (use i18n keys).
- **Known Issues**:
  - Overtime daily limit hardcoded to 9h (should read from convenio rules).
  - Company reports show single user data (should aggregate all users).
  - GLOBAL_ADMIN cannot manage users (needs tenantId query param support).
  - Notifications bell button non-functional (backend not implemented).

## UNIQUE STYLES
- Keep page components inline in `apps/web/src/App.tsx` until they exceed ~50 lines.
- Multi-tenant isolation is enforced at app layer (tenantId in queries); RLS planned.
- PWA service worker registration is in `apps/web/src/main.tsx`.
- **Dual deployment scripts**: `deploy.sh` (automated) + `deploy-interactive.sh` (wizard with license enforcement).
- **Backup with verification**: `backup.sh` uses SHA256 checksums + 30-day retention.

## MODULE PATTERNS
- **API**: Standard NestJS pattern - `{module}.module.ts`, `{module}.controller.ts`, `{module}.service.ts`, `dto/`.
- **Web**: Features in `features/`, shared components in `components/`, utilities in `lib/`.
- **Shared types**: Single file `packages/shared/src/index.ts` with all domain types.
- **Auth flow**: JWT + Passport → JwtAuthGuard → RolesGuard → TenantMiddleware sets context.

## BUILD & TEST
- **Dev**: `npm run dev` (concurrent API + Web)
- **Build**: `npm run build` (shared → api → web)
- **Test**: `npm run test:unit` (Vitest + Jest), `npm run test:e2e` (Playwright)
- **DB**: `npm run db:migrate`, `npm run db:generate`, `npm run db:studio`
- **API testing**: Jest with `@nestjs/testing`, centralized Prisma mocks in `src/test-utils/`.
- **Web testing**: Vitest with custom `render()` in `test-utils.tsx` (wraps Router, QueryClient, i18n).
- **E2E testing**: Playwright with fixtures in `e2e/fixtures/`.

## DEPLOY
- **Scripts**: `infra/scripts/deploy.sh` (auto), `deploy-interactive.sh` (wizard).
- **Management**: `infra/scripts/manage.sh` (start/stop/logs/backup/restore/migrate).
- **Health checks**: `infra/scripts/health-check.sh` (API, DB, Redis validation).
- **Docker**: Multi-stage builds in `infra/Dockerfile.{api,web}`.
- **SSL**: Automatic via Certbot in `docker-compose.prod.yml`.

## NOTES
- No CI workflows in `.github/workflows` (none present).
- Tests are configured (Jest/Vitest/Playwright) but coverage incomplete.
- `apps/*/dist` and `packages/shared/dist` are build outputs; avoid manual edits.
- PWA service worker registration is in `apps/web/src/main.tsx`.
- **API package.json broken**: Missing NestJS deps + build/dev scripts (root workspace relies on hoisting).
- **Legacy server.js**: 3135-line Express file exists but is dead code; NestJS is actual impl.
- `.sisyphus/` and `.opencode/` are AI tooling artifacts (not project code).
