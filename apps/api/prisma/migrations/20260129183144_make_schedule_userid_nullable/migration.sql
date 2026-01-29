-- AlterTable: Make userId nullable in schedules table for open shifts support
-- Drop unique constraint on (userId, date) since userId can be null
-- Add index on (userId, date) for query performance

-- Drop the unique constraint
ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "schedules_userId_date_key";

-- Make userId nullable
ALTER TABLE "schedules" ALTER COLUMN "userId" DROP NOT NULL;

-- Add index for query performance (if not exists)
CREATE INDEX IF NOT EXISTS "schedules_userId_date_idx" ON "schedules"("userId", "date");
