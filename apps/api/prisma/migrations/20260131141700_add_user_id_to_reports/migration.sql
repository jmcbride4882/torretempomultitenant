-- AlterTable
ALTER TABLE "reports" ADD COLUMN "userId" UUID;

-- Add foreign key constraint
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old unique constraint
ALTER TABLE "reports" DROP CONSTRAINT "reports_tenantId_type_period_key";

-- Add new unique constraint including userId
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenantId_type_period_userId_key" UNIQUE("tenantId", "type", "period", "userId");
