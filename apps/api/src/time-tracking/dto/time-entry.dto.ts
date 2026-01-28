import { EntryOrigin, EntryStatus } from '@prisma/client';

export class TimeEntryDto {
  id: string;
  tenantId: string;
  userId: string;
  locationId?: string;
  clockIn: Date;
  clockOut?: Date;
  breakMinutes?: number;
  origin: EntryOrigin;
  qrTokenId?: string;
  clockInLat?: number;
  clockInLng?: number;
  clockOutLat?: number;
  clockOutLng?: number;
  offlineId?: string;
  syncedAt?: Date;
  conflictFlag: boolean;
  status: EntryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class TimeEntriesResponseDto {
  entries: TimeEntryDto[];
  total: number;
  page: number;
  pageSize: number;
}
