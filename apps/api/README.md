# Torre Tempo API

NestJS REST API backend for Torre Tempo staff clocking system.

## Database Migrations

### Migration Strategy

This project uses **Prisma migrations** for database schema management. The migration baseline was established on **2026-01-30** to ensure production-safe deployment.

#### Migration History

| Order | Migration | Purpose |
|-------|-----------|---------|
| 1 | `20260130000000_init` | **Baseline**: Creates all core tables (tenants, users, locations, time_entries, schedules, reports, etc.) |
| 2 | `20260130000001_make_schedule_userid_nullable` | Makes `userId` nullable in schedules for open shifts support |
| 3 | `20260130000002_add_break_tracking` | Adds break tracking via `BreakEntry` model |
| 4 | `20260130000003_add_overtime_tracking` | Adds overtime tracking via `OvertimeEntry` model |
| 5 | `20260130000004_add_schedule_link_to_time_entries` | Links time entries to schedules |

### Setup Instructions

#### Fresh Database (Development)

```bash
# Install dependencies
npm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env

# Run all migrations (creates schema from baseline)
npm run db:migrate

# Verify migration status
cd apps/api && npx prisma migrate status
```

#### Existing Database

If you have an existing database created via `prisma db push`:

```bash
# Mark all migrations as applied (they already exist in the database)
cd apps/api
npx prisma migrate resolve --applied 20260130000000_init
npx prisma migrate resolve --applied 20260130000001_make_schedule_userid_nullable
npx prisma migrate resolve --applied 20260130000002_add_break_tracking
npx prisma migrate resolve --applied 20260130000003_add_overtime_tracking
npx prisma migrate resolve --applied 20260130000004_add_schedule_link_to_time_entries

# Verify clean state
npx prisma migrate status
```

### Common Commands

```bash
# Check migration status
npm run db:migrate:status

# Create a new migration (after schema changes)
npm run db:migrate:dev -- --name <migration_name>

# Reset database (development only - DESTRUCTIVE)
npm run db:reset

# Generate Prisma client
npm run db:generate
```

### Important Notes

- **Never use `prisma db push` in production** - always use migrations
- All migrations are timestamped and ordered sequentially
- The baseline migration (`20260130000000_init`) contains the complete schema as of 2026-01-30
- Subsequent migrations are incremental changes applied on top of the baseline
- Database connection requires PostgreSQL 16+ running at `localhost:5432` (configurable via `DATABASE_URL`)

### Troubleshooting

**Error: "Can't reach database server"**
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env` file
- Verify network connectivity to database host

**Error: "Migration already applied"**
- Use `npx prisma migrate resolve --applied <migration_name>` to mark as applied
- This is safe if the migration SQL already exists in the database

**Error: "Prisma schema validation failed"**
- Check `prisma/schema.prisma` for syntax errors
- Run `npx prisma validate` to check schema validity

## Development

See root `README.md` for full development setup and commands.
