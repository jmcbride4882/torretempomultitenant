-- CreateEnum: OvertimeType
CREATE TYPE "OvertimeType" AS ENUM ('ORDINARY', 'FORCE_MAJEURE');

-- CreateEnum: CompensationType
CREATE TYPE "CompensationType" AS ENUM ('TIME_OFF', 'PAY');

-- CreateTable: Add overtime_entries table for Spanish labor law compliance
-- Tracks overtime hours beyond 9h/day or 40h/week with compensation tracking
-- Implements RD-Ley 8/2019 requirements for overtime management

CREATE TABLE "overtime_entries" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "timeEntryId" UUID NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "type" "OvertimeType" NOT NULL DEFAULT 'ORDINARY',
    "compensationType" "CompensationType" NOT NULL DEFAULT 'TIME_OFF',
    "compensatedAt" TIMESTAMP(3),
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overtime_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "overtime_entries_tenantId_userId_createdAt_idx" ON "overtime_entries"("tenantId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "overtime_entries" ADD CONSTRAINT "overtime_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_entries" ADD CONSTRAINT "overtime_entries_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_entries" ADD CONSTRAINT "overtime_entries_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
