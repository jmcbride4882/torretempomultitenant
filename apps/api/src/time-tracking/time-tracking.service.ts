import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';
import { ComplianceService } from '../compliance/compliance.service';
import { OvertimeService } from '../overtime/overtime.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { TeamStatsDto } from './dto/team-stats.dto';
import { ClockedInEmployeeDto } from './dto/clocked-in-employee.dto';
import { EntryOrigin, EntryStatus, Role } from '@prisma/client';
import { differenceInMinutes } from 'date-fns';

@Injectable()
export class TimeTrackingService {
  private readonly logger = new Logger(TimeTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly complianceService: ComplianceService,
    private readonly overtimeService: OvertimeService,
    @Inject(forwardRef(() => LocationsService))
    private readonly locationsService: LocationsService,
  ) {}

  /**
   * Clock in a user
   * Creates a new time entry with clockIn timestamp
   */
  async clockIn(
    userId: string,
    tenantId: string,
    userEmail: string,
    userRole: string,
    dto: ClockInDto,
  ) {
    // Check if user already has an active time entry
    const activeEntry = await this.prisma.timeEntry.findFirst({
      where: {
        userId,
        tenantId,
        clockOut: null,
        status: EntryStatus.ACTIVE,
      },
    });

    if (activeEntry) {
      throw new BadRequestException(
        'User is already clocked in. Please clock out first.',
      );
    }

    // Validate Spanish labor law compliance (RD-Ley 8/2019)
    const complianceCheck = await this.complianceService.validateClockInAllowed(
      userId,
      tenantId,
    );

    if (!complianceCheck.isCompliant) {
      const violations = complianceCheck.violations
        .map((v) => v.message)
        .join('; ');
      this.logger.warn(
        `Clock-in blocked for user ${userId}: ${violations}`,
      );
      throw new BadRequestException(
        `Clock-in not allowed: ${violations}`,
      );
    }

    // Log warnings if any
    if (complianceCheck.warnings.length > 0) {
      const warnings = complianceCheck.warnings
        .map((w) => w.message)
        .join('; ');
      this.logger.warn(
        `Clock-in warnings for user ${userId}: ${warnings}`,
      );
    }

    // Validate QR token if provided
    let validatedLocation = null;
    if (dto.qrTokenId) {
      validatedLocation = await this.locationsService.validateQRToken(
        dto.qrTokenId,
      );
      this.logger.log(
        `QR validation successful for location ${validatedLocation.id}`,
      );
    }

    // Validate geofence if coordinates provided
    if (dto.latitude && dto.longitude && dto.locationId) {
      await this.locationsService.validateGeofence(
        dto.locationId,
        dto.latitude,
        dto.longitude,
      );
      this.logger.log(`Geofence validation successful for location ${dto.locationId}`);
    }

    // Determine origin
    let origin: EntryOrigin = EntryOrigin.MANUAL;
    if (dto.offlineId) {
      origin = EntryOrigin.OFFLINE;
    } else if (dto.qrTokenId) {
      origin = EntryOrigin.QR;
    } else if (dto.latitude && dto.longitude) {
      origin = EntryOrigin.GEOFENCE;
    }

    // Use validated location ID if QR was scanned
    const locationId = validatedLocation?.id || dto.locationId;

    // Create time entry
    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        userId,
        tenantId,
        locationId,
        clockIn: new Date(),
        origin,
        qrTokenId: dto.qrTokenId,
        clockInLat: dto.latitude,
        clockInLng: dto.longitude,
        offlineId: dto.offlineId,
        syncedAt: dto.offlineId ? new Date() : undefined,
        status: EntryStatus.ACTIVE,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`User ${userId} clocked in at ${timeEntry.clockIn.toISOString()}`);

    // Log to audit
    await this.auditService.logTimeEntryCreation(
      tenantId,
      timeEntry.id,
      userId,
      userEmail,
      userRole,
      {
        clockIn: timeEntry.clockIn.toISOString(),
        locationId: timeEntry.locationId,
        origin: timeEntry.origin,
      },
    );

    return timeEntry;
  }

  /**
   * Clock out a user
   * Updates the active time entry with clockOut timestamp
   */
  async clockOut(
    userId: string,
    tenantId: string,
    userEmail: string,
    userRole: string,
    dto: ClockOutDto,
  ) {
    // Find active time entry
    const activeEntry = await this.prisma.timeEntry.findFirst({
      where: {
        userId,
        tenantId,
        clockOut: null,
        status: EntryStatus.ACTIVE,
      },
    });

    if (!activeEntry) {
      throw new BadRequestException(
        'No active clock-in found. Please clock in first.',
      );
    }

    const clockOutTime = new Date();

    // Validate clockOut is after clockIn
    if (clockOutTime <= activeEntry.clockIn) {
      throw new BadRequestException(
        'Clock-out time must be after clock-in time.',
      );
    }

    // Update time entry
    const timeEntry = await this.prisma.timeEntry.update({
      where: { id: activeEntry.id },
      data: {
        clockOut: clockOutTime,
        clockOutLat: dto.latitude,
        clockOutLng: dto.longitude,
        breakMinutes: dto.breakMinutes || 0,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

     this.logger.log(`User ${userId} clocked out at ${timeEntry.clockOut?.toISOString() ?? 'null'}`);

     // Log to audit
     await this.auditService.logTimeEntryUpdate(
       tenantId,
       timeEntry.id,
       userId,
       userEmail,
       userRole,
       {
         clockOut: null,
         breakMinutes: null,
       },
       {
         clockOut: timeEntry.clockOut?.toISOString(),
         breakMinutes: timeEntry.breakMinutes,
       },
     );

     // Detect overtime
     try {
       const overtime = await this.overtimeService.detectOvertime(
         timeEntry.id,
       );

       if (overtime) {
         this.logger.log(
           `Overtime detected for user ${userId}: ${overtime.hours}h`,
         );

         // Check annual limit
         const annualOvertime = await this.overtimeService.getAnnualOvertime(
           userId,
         );

         if (annualOvertime > 80) {
           this.logger.warn(
             `Annual overtime limit exceeded for user ${userId}: ${annualOvertime.toFixed(2)}h / 80h`,
           );

           // Log compliance violation to audit
           await this.auditService.logTimeEntryUpdate(
             tenantId,
             timeEntry.id,
             userId,
             userEmail,
             userRole,
             { complianceStatus: 'OK' },
             {
               complianceStatus: 'OVERTIME_LIMIT_EXCEEDED',
               details: `Annual overtime: ${annualOvertime.toFixed(2)}h / 80h limit`,
             },
           );
         }
       }
      } catch (error) {
        this.logger.error(
          `Error detecting overtime for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Don't fail the clock-out if overtime detection fails
      }

     return timeEntry;
  }

  /**
   * Get current active time entry for a user
   */
  async getCurrentEntry(userId: string, tenantId: string) {
    const activeEntry = await this.prisma.timeEntry.findFirst({
      where: {
        userId,
        tenantId,
        clockOut: null,
        status: EntryStatus.ACTIVE,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return activeEntry;
  }

  /**
   * Get time entries for a user with pagination
   */
  async getEntries(
    userId: string,
    tenantId: string,
    page: number = 1,
    pageSize: number = 50,
  ) {
    const skip = (page - 1) * pageSize;

    const [entries, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where: {
          userId,
          tenantId,
          status: EntryStatus.ACTIVE,
        },
        orderBy: {
          clockIn: 'desc',
        },
        skip,
        take: pageSize,
        include: {
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.timeEntry.count({
        where: {
          userId,
          tenantId,
          status: EntryStatus.ACTIVE,
        },
      }),
    ]);

    return {
      entries,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get time entries for all users in a tenant (manager/admin view)
   */
  async getAllEntries(
    tenantId: string,
    page: number = 1,
    pageSize: number = 50,
  ) {
    const skip = (page - 1) * pageSize;

    const [entries, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where: {
          tenantId,
          status: EntryStatus.ACTIVE,
        },
        orderBy: {
          clockIn: 'desc',
        },
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.timeEntry.count({
        where: {
          tenantId,
          status: EntryStatus.ACTIVE,
        },
      }),
    ]);

    return {
      entries,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Start a break for an active time entry
   */
  async startBreak(timeEntryId: string, userId: string) {
    // Verify time entry exists and belongs to user
    const timeEntry = await this.prisma.timeEntry.findFirst({
      where: {
        id: timeEntryId,
        userId,
        clockOut: null, // Must be clocked in
      },
    });

    if (!timeEntry) {
      throw new NotFoundException('Active time entry not found');
    }

    // Check if already on break
    const activeBreak = await this.prisma.breakEntry.findFirst({
      where: {
        timeEntryId,
        endedAt: null,
      },
    });

    if (activeBreak) {
      throw new BadRequestException('Already on break');
    }

     // Create break entry
     const breakEntry = await this.prisma.breakEntry.create({
       data: {
         timeEntryId,
         startedAt: new Date(),
       },
     });

     this.logger.log(`Break started for time entry ${timeEntryId}`);

     // Log to audit
     await this.auditService.createLog({
       tenantId: timeEntry.tenantId,
       action: 'CREATE',
       entity: 'BREAK_ENTRY',
       entityId: breakEntry.id,
       actorId: userId,
       changes: {
         startedAt: breakEntry.startedAt.toISOString(),
       },
     });

     return breakEntry;
  }

  /**
   * End an active break
   */
  async endBreak(breakId: string, userId: string) {
    // Verify break exists and belongs to user
    const breakEntry = await this.prisma.breakEntry.findFirst({
      where: {
        id: breakId,
        timeEntry: {
          userId,
        },
        endedAt: null,
      },
      include: {
        timeEntry: true,
      },
    });

    if (!breakEntry) {
      throw new NotFoundException('Active break not found');
    }

    // Validate minimum break duration (15 minutes)
    const breakDurationMinutes = differenceInMinutes(new Date(), breakEntry.startedAt);
    if (breakDurationMinutes < 15) {
      throw new BadRequestException(
        `Break must be at least 15 minutes (current: ${breakDurationMinutes} minutes)`
      );
    }

     // Update break entry
     const updatedBreak = await this.prisma.breakEntry.update({
       where: { id: breakId },
       data: { endedAt: new Date() },
     });

     this.logger.log(`Break ended for time entry ${breakEntry.timeEntryId}`);

     // Log to audit
     await this.auditService.createLog({
       tenantId: breakEntry.timeEntry.tenantId,
       action: 'UPDATE',
       entity: 'BREAK_ENTRY',
       entityId: breakId,
       actorId: userId,
       changes: {
         endedAt: updatedBreak.endedAt?.toISOString(),
       },
     });

     return updatedBreak;
  }

  /**
   * Get breaks for a time entry
   */
  async getBreaks(timeEntryId: string) {
    return this.prisma.breakEntry.findMany({
      where: { timeEntryId },
      orderBy: { startedAt: 'asc' },
    });
  }

  /**
   * Get active break for a time entry
   */
  async getActiveBreak(timeEntryId: string) {
    return this.prisma.breakEntry.findFirst({
      where: {
        timeEntryId,
        endedAt: null,
      },
    });
  }

  /**
   * Get list of currently clocked-in employees
   * Returns employee details with clock-in time and duration
   */
  async getClockedInEmployees(tenantId: string): Promise<ClockedInEmployeeDto[]> {
    const activeEntries = await this.prisma.timeEntry.findMany({
      where: {
        tenantId,
        clockOut: null,
        status: EntryStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        location: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        clockIn: 'desc',
      },
    });

    const now = new Date();

    return activeEntries.map((entry) => {
      const clockIn = new Date(entry.clockIn);
      const durationMs = now.getTime() - clockIn.getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      return {
        userId: entry.user.id,
        userName: `${entry.user.firstName} ${entry.user.lastName}`,
        location: entry.location?.name ?? null,
        clockInTime: entry.clockIn.toISOString(),
        duration: durationMinutes,
      };
    });
  }

  /**
   * Get team statistics for manager dashboard
   * Returns real-time stats: total employees, clocked in, hours today/week, overtime
   */
  async getTeamStats(tenantId: string): Promise<TeamStatsDto> {
    // Get tenant with timezone for date calculations
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const now = new Date();
    const timezone = tenant.timezone;

    // Calculate today's range in tenant timezone
    const { start: todayStart, end: todayEnd } = this.getZonedDayRange(
      now,
      timezone,
    );

    // Calculate this week's range (Mon-Sun) in tenant timezone
    const weekStart = this.getZonedStartOfWeek(now, timezone);
    const weekEnd = this.addZonedDays(weekStart, timezone, 7);

    // Execute all queries in parallel for performance
    const [
      totalEmployees,
      clockedIn,
      todayEntries,
      weekEntries,
      overtimeEntries,
    ] = await Promise.all([
      // Count total employees (EMPLOYEE or MANAGER role)
      this.prisma.user.count({
        where: {
          tenantId,
          isActive: true,
          role: { in: [Role.EMPLOYEE, Role.MANAGER] },
        },
      }),

      // Count currently clocked in users
      this.prisma.timeEntry.count({
        where: {
          tenantId,
          clockOut: null,
          status: EntryStatus.ACTIVE,
        },
      }),

      // Get all time entries for today
      this.prisma.timeEntry.findMany({
        where: {
          tenantId,
          status: EntryStatus.ACTIVE,
          clockIn: { lt: todayEnd },
          OR: [{ clockOut: { gte: todayStart } }, { clockOut: null }],
        },
        select: {
          clockIn: true,
          clockOut: true,
          breakMinutes: true,
        },
      }),

      // Get all time entries for this week
      this.prisma.timeEntry.findMany({
        where: {
          tenantId,
          status: EntryStatus.ACTIVE,
          clockIn: { lt: weekEnd },
          OR: [{ clockOut: { gte: weekStart } }, { clockOut: null }],
        },
        select: {
          clockIn: true,
          clockOut: true,
          breakMinutes: true,
        },
      }),

      // Get approved overtime for this week
      this.prisma.overtimeEntry.findMany({
        where: {
          tenantId,
          approvedAt: { not: null },
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        select: {
          hours: true,
        },
      }),
    ]);

    // Calculate total hours today
    const totalHoursToday = this.calculateTotalHours(
      todayEntries,
      todayStart,
      todayEnd,
      now,
    );

    // Calculate total hours this week
    const totalHoursWeek = this.calculateTotalHours(
      weekEntries,
      weekStart,
      weekEnd,
      now,
    );

    // Sum approved overtime hours
    const overtimeHours = overtimeEntries.reduce(
      (sum, entry) => sum + entry.hours,
      0,
    );

    return {
      totalEmployees,
      clockedIn,
      totalHoursToday: Math.round(totalHoursToday * 100) / 100, // Round to 2 decimals
      totalHoursWeek: Math.round(totalHoursWeek * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
    };
  }

  /**
   * Calculate total worked hours from time entries within a date range
   * Accounts for partial overlaps and subtracts break minutes
   */
  private calculateTotalHours(
    entries: Array<{
      clockIn: Date;
      clockOut: Date | null;
      breakMinutes: number | null;
    }>,
    rangeStart: Date,
    rangeEnd: Date,
    now: Date,
  ): number {
    let totalMinutes = 0;

    for (const entry of entries) {
      const entryEnd = entry.clockOut ?? now;

      // Calculate overlap between entry and range
      const overlapStart =
        entry.clockIn > rangeStart ? entry.clockIn : rangeStart;
      const overlapEnd = entryEnd < rangeEnd ? entryEnd : rangeEnd;

      if (overlapEnd <= overlapStart) {
        continue; // No overlap
      }

      const overlapMinutes = differenceInMinutes(overlapEnd, overlapStart);
      const totalEntryMinutes = differenceInMinutes(entryEnd, entry.clockIn);
      const breakMinutes = entry.breakMinutes ?? 0;

      // Proportionally allocate break time to the overlap
      if (breakMinutes > 0 && totalEntryMinutes > 0) {
        const ratio = overlapMinutes / totalEntryMinutes;
        const allocatedBreak = Math.min(breakMinutes * ratio, overlapMinutes);
        totalMinutes += Math.max(0, overlapMinutes - allocatedBreak);
      } else {
        totalMinutes += overlapMinutes;
      }
    }

    return totalMinutes / 60; // Convert to hours
  }

  /**
   * Get today's date range in tenant timezone
   */
  private getZonedDayRange(date: Date, timeZone: string) {
    const start = this.getZonedStartOfDay(date, timeZone);
    const nextDate = this.addZonedDays(date, timeZone, 1);
    const end = this.getZonedStartOfDay(nextDate, timeZone);
    return { start, end };
  }

  /**
   * Get start of week (Monday) in tenant timezone
   */
  private getZonedStartOfWeek(date: Date, timeZone: string): Date {
    const weekday = this.getZonedWeekday(date, timeZone);
    const weekStartsOn = 1; // Monday
    const daysSinceWeekStart = (weekday - weekStartsOn + 7) % 7;
    const weekStartDate = this.addZonedDays(date, timeZone, -daysSinceWeekStart);
    return this.getZonedStartOfDay(weekStartDate, timeZone);
  }

  /**
   * Get weekday (0=Sun, 1=Mon, ..., 6=Sat) in tenant timezone
   */
  private getZonedWeekday(date: Date, timeZone: string): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const weekday = formatter.format(date);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[weekday] ?? 0;
  }

  /**
   * Get start of day (00:00:00) in tenant timezone
   */
  private getZonedStartOfDay(date: Date, timeZone: string): Date {
    const parts = this.getZonedDateParts(date, timeZone);
    return this.zonedTimeToUtc(
      {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: 0,
        minute: 0,
        second: 0,
      },
      timeZone,
    );
  }

  /**
   * Add days to a date in tenant timezone (handles DST correctly)
   */
  private addZonedDays(date: Date, timeZone: string, days: number): Date {
    const parts = this.getZonedDateParts(date, timeZone);
    const midday = this.zonedTimeToUtc(
      {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: 12,
        minute: 0,
        second: 0,
      },
      timeZone,
    );
    return new Date(midday.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Parse date into components in tenant timezone
   */
  private getZonedDateParts(date: Date, timeZone: string) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const values: Record<string, string> = {};

    for (const part of parts) {
      if (part.type !== 'literal') {
        values[part.type] = part.value;
      }
    }

    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      hour: Number(values.hour),
      minute: Number(values.minute),
      second: Number(values.second),
    };
  }

  /**
   * Convert zoned time components to UTC Date
   */
  private zonedTimeToUtc(
    parts: {
      year: number;
      month: number;
      day: number;
      hour?: number;
      minute?: number;
      second?: number;
    },
    timeZone: string,
  ): Date {
    const utcDate = new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour ?? 0,
        parts.minute ?? 0,
        parts.second ?? 0,
      ),
    );
    const offset = this.getTimeZoneOffsetMs(utcDate, timeZone);
    return new Date(utcDate.getTime() - offset);
  }

  /**
   * Get timezone offset in milliseconds
   */
  private getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const parts = this.getZonedDateParts(date, timeZone);
    const utcTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    return utcTime - date.getTime();
  }
}
