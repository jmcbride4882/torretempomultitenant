-- AlterTable
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "userId" UUID;

-- Add foreign key constraint
DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop old unique constraint if exists
DO $$ BEGIN
  ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_tenantId_type_period_key";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Add new unique constraint including userId
DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_tenantId_type_period_userId_key" UNIQUE("tenantId", "type", "period", "userId");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
