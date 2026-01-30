# Make Everything Functional - Learnings

## ESLint Configuration (2026-01-30)

### Files Created
- `apps/api/.eslintrc.js` - NestJS/TypeScript config
- `apps/web/.eslintrc.cjs` - React/TypeScript config (uses .cjs due to ES module)

### Key Learnings
1. **Web app requires .cjs extension**: The web app has `"type": "module"` in package.json, so ESLint config must use `.cjs` extension instead of `.js`
2. **API uses CommonJS**: API app uses CommonJS, so `.eslintrc.js` works fine
3. **Both configs execute successfully**: `npm run lint` runs without crashing on both apps
4. **Existing code has violations**: Both apps have existing linting errors (any types, unsafe member access, unused vars) - these are pre-existing issues, not config problems

### Configuration Details
- **API**: Extends `@typescript-eslint/recommended` + `recommended-requiring-type-checking`, strict rules for no-console and no-unused-vars
- **Web**: Extends `eslint:recommended` + `@typescript-eslint/recommended` + `react-hooks/recommended`, includes react-hooks rules
- Both use `root: true` to prevent config cascade
- Both allow `warn` and `error` console methods
- Both use `^_` pattern to allow unused vars prefixed with underscore

### Verification
- API: `npm run lint` executes, reports 770 problems (pre-existing code issues)
- Web: `npm run lint` executes, reports 23 problems (pre-existing code issues)
- Both configs are valid and functional

## Prisma GLOBAL_ADMIN Type Casting Fix (2026-01-30)

### Problem
- 7 instances of `'GLOBAL_ADMIN' as any` type casts across the codebase
- Prisma schema defined `GLOBAL_ADMIN` in Role enum, but TypeScript wasn't recognizing it
- Root cause: Prisma client needed regeneration after schema changes

### Solution Applied
1. **Regenerated Prisma client**: `npx prisma generate` in apps/api
2. **Removed all unsafe casts**:
   - `apps/api/src/admin/admin.controller.ts:11` - Changed to `Role.GLOBAL_ADMIN`
   - `apps/api/src/global-admin/global-admin.controller.ts:9` - Added Role import, changed to `Role.GLOBAL_ADMIN`
   - `apps/api/src/tenants/tenants.controller.ts:69, 86, 97, 118` - All 4 instances changed to `Role.GLOBAL_ADMIN`
   - `apps/api/prisma/seed.ts:31` - Added Role import, changed to `Role.GLOBAL_ADMIN`, removed `as any` wrapper

### Key Learnings
1. **Prisma regeneration is essential**: After schema changes, always run `npx prisma generate` to update the client
2. **Type safety improves with proper imports**: Importing `Role` enum from `@prisma/client` provides full type safety
3. **Seed file cleanup**: Removed unnecessary `@typescript-eslint/no-explicit-any` comment and `as any` wrapper on entire data object
4. **Verification**: `npx tsc --noEmit` passes with zero errors after fixes

### Files Modified
- `apps/api/src/admin/admin.controller.ts`
- `apps/api/src/global-admin/global-admin.controller.ts`
- `apps/api/src/tenants/tenants.controller.ts`
- `apps/api/prisma/seed.ts`

### Verification Results
- ✅ Prisma client regenerated successfully
- ✅ All 7 `'GLOBAL_ADMIN' as any` casts removed
- ✅ TypeScript compilation passes with zero errors
- ✅ No remaining unsafe casts in source files (only in generated coverage HTML)
