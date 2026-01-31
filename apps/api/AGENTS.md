# apps/api - Torre Tempo Backend

**Generated:** 2026-02-01 00:32
**Commit:** f91395f
**Branch:** main

## OVERVIEW
NestJS REST API with Prisma/Postgres and global `/api` prefix. Auth service + DTOs exist; controllers/guards/strategies are wired.

## STRUCTURE

```
api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── health.controller.ts
│   ├── auth/              # Auth, guards, decorators, strategies
│   ├── prisma/            # Prisma service
│   ├── common/            # Middleware (TenantMiddleware)
│   ├── config/            # Logger config
│   ├── test-utils/        # Centralized Prisma mocks
│   ├── approvals/
│   ├── audit/             # Utility module (no controller)
│   ├── locations/
│   ├── reports/
│   ├── scheduling/
│   ├── tenants/
│   ├── time-tracking/
│   ├── users/
│   ├── overtime/
│   ├── compliance/
│   ├── admin/
│   └── global-admin/
└── prisma/schema.prisma
```

## MODULE PATTERN (Standard Across 90% of Modules)

**File Organization:**
```
module-name/
├── module-name.module.ts      # @Module decorator
├── module-name.controller.ts  # HTTP endpoints
├── module-name.service.ts     # Business logic
├── module-name.service.spec.ts # Unit tests
└── dto/                       # Data Transfer Objects
    ├── index.ts               # Barrel export
    ├── create-*.dto.ts
    └── update-*.dto.ts
```

**Module Structure:**
```typescript
@Module({
  imports: [PrismaModule, ...otherModules],
  controllers: [ModuleController],
  providers: [ModuleService],
  exports: [ModuleService],  // If used by other modules
})
export class ModuleModule {}
```

**Service Injection:**
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly audit: AuditService,
) {}
```

**Controller Guards:**
```typescript
@Controller('module-name')
@UseGuards(JwtAuthGuard)  // Class-level auth
export class ModuleController {
  @Get()
  @UseGuards(RolesGuard)  // Method-level RBAC
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll(@CurrentUser() user: AuthUser) {}
}
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Health check | `src/health.controller.ts` | `GET /api/health` |
| Auth business logic | `src/auth/auth.service.ts` | Login/register logic |
| Auth HTTP endpoints | `src/auth/auth.controller.ts` | JWT + Passport |
| Guards | `src/auth/guards/` | JwtAuthGuard, RolesGuard |
| Decorators | `src/auth/decorators/` | @CurrentUser(), @Roles() |
| JWT Strategy | `src/auth/strategies/jwt.strategy.ts` | Token validation |
| Prisma client | `src/prisma/prisma.service.ts` | DB access |
| Schema | `prisma/schema.prisma` | Full models |
| Tenant isolation | `src/common/middleware/tenant.middleware.ts` | Sets tenant context |
| Audit logging | `src/audit/audit.service.ts` | Cross-cutting audit |
| Test mocks | `src/test-utils/prisma-mock.ts` | `resetPrismaMocks()` |
| Logger config | `src/config/logger.config.ts` | Winston + rotation |

## CONVENTIONS
- DTOs use `class-validator`; ValidationPipe is global (`src/main.ts`).
- Controllers delegate to services; no DB access in controllers.
- Use PrismaService and always filter by `tenantId`.
- Throw NestJS exceptions for invalid requests.
- **@UseGuards(JwtAuthGuard)** at class level, **@UseGuards(RolesGuard)** at method level.
- **@CurrentUser()** decorator extracts user from JWT payload.
- **TenantMiddleware** applied globally; sets tenant context for RLS.
- **AuditService** injected by: Tenants, Users, TimeTracking, Reports modules.
- **forwardRef()** used only for circular deps (e.g., TimeTracking ↔ Locations).

## MODULE DEPENDENCIES

| Module | Imports | Exports | Notes |
|--------|---------|---------|-------|
| auth | Prisma, Passport, JWT | AuthService, Guards, Strategy | Provides auth infrastructure |
| tenants | Prisma, Audit | TenantsService | Standard CRUD |
| time-tracking | Prisma, Auth, Audit, Compliance, Overtime, Locations | TimeTrackingService | Uses forwardRef for Locations |
| scheduling | Prisma | SchedulingService | Minimal deps |
| users | Prisma, Audit | UsersService | Standard CRUD |
| audit | Prisma | AuditService, RetentionService | Utility module (no controller) |
| compliance | Prisma, Tenants | ComplianceService | Imports TenantsModule |
| reports | Prisma, Audit, Auth | ReportsService | Multiple deps |

## ANTI-PATTERNS
- No queries without `tenantId` filter.
- No direct Prisma calls in controllers.
- No `console.log` (use NestJS Logger).
- No `any` types.
- **CRITICAL**: Audit logs never hard-deleted (5-year retention). `RetentionService` archives only.

## DEVIATIONS FROM STANDARD
- **AUDIT Module**: No controller (utility module providing cross-cutting audit logging).
- **TIME-TRACKING Module**: Uses `forwardRef(() => LocationsModule)` for circular dependency.
- **ADMIN Module**: Does not export service (internal only).
- **COMMON Module**: Middleware only, no module definition (applied globally in AppModule).

## TESTING
- Framework: Jest with ts-jest
- Pattern: Colocated `.spec.ts` files (e.g., `auth.service.spec.ts`)
- Mocks: Centralized Prisma mocks in `src/test-utils/prisma-mock.ts`
- Setup: Use `@nestjs/testing` Test module, `mockPrismaService`, `resetPrismaMocks()`
- Coverage: 80%+ target (except ComplianceService at 63.76%)

## NOTES
- CORS origin from `CORS_ORIGIN`, default `http://localhost:3000`.
- Port defaults to `4000`.
- `src/auth/guards` and `src/auth/strategies` are fully implemented.
- **Legacy server.js**: 3135-line Express file at root is dead code; ignore it.
- **Broken package.json**: Missing NestJS dependencies and build/dev scripts (hoisted from root).
- **GLOBAL_ADMIN issue**: Cannot manage users; needs tenantId query param support (4 TODOs in users.controller.ts).
