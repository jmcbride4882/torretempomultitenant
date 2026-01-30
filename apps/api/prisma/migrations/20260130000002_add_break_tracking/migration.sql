-- CreateTable: Add break_entries table for Spanish labor law compliance
-- Tracks breaks taken during work shifts (Article 34.4 - 15 min after 6 hours)

CREATE TABLE "break_entries" (
    "id" UUID NOT NULL,
    "timeEntryId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "break_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "break_entries_timeEntryId_idx" ON "break_entries"("timeEntryId");

-- AddForeignKey
ALTER TABLE "break_entries" ADD CONSTRAINT "break_entries_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
