-- AlterTable: Add schedule integration fields to time_entries
-- Add scheduleId to link time entries with scheduled shifts
-- Add validationWarning to store clock-in validation messages (early/late/no schedule)

-- Add scheduleId column (nullable, references schedules table)
ALTER TABLE "time_entries" ADD COLUMN "scheduleId" UUID;

-- Add validationWarning column (nullable, stores warning messages)
ALTER TABLE "time_entries" ADD COLUMN "validationWarning" TEXT;

-- Add foreign key constraint to schedules table
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_scheduleId_fkey" 
  FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for query performance on scheduleId
CREATE INDEX "time_entries_scheduleId_idx" ON "time_entries"("scheduleId");
