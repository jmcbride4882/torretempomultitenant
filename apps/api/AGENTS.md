# apps/api - Torre Tempo Backend

**Generated:** 2026-01-28 21:43
**Commit:** 0255da4
**Branch:** main

## OVERVIEW
NestJS REST API with Prisma/Postgres and global `/api` prefix. Auth service + DTOs exist; controllers/guards/strategies are still stubbed or empty.

## STRUCTURE

```
api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── health.controller.ts
│   ├── auth/
│   ├── prisma/
│   ├── approvals/
│   ├── audit/
│   ├── locations/
│   ├── reports/
│   ├── scheduling/
│   ├── tenants/
│   └── time-tracking/
└── prisma/schema.prisma
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Health check | `src/health.controller.ts` | `GET /api/health` |
| Auth business logic | `src/auth/auth.service.ts` | Login/register logic |
| Auth HTTP endpoints | `src/auth/auth.controller.ts` | Placeholder responses |
| Prisma client | `src/prisma/prisma.service.ts` | DB access |
| Schema | `prisma/schema.prisma` | Full models |

## CONVENTIONS
- DTOs use `class-validator`; ValidationPipe is global (`src/main.ts`).
- Controllers delegate to services; no DB access in controllers.
- Use PrismaService and always filter by `tenantId`.
- Throw NestJS exceptions for invalid requests.

## ANTI-PATTERNS
- No queries without `tenantId` filter.
- No direct Prisma calls in controllers.
- No `console.log` (use NestJS Logger).
- No `any` types.

## NOTES
- CORS origin from `CORS_ORIGIN`, default `http://localhost:3000`.
- Port defaults to `4000`.
- `src/auth/guards` and `src/auth/strategies` exist but are empty.
