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
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { EntryOrigin, EntryStatus } from '@prisma/client';

@Injectable()
export class TimeTrackingService {
  private readonly logger = new Logger(TimeTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
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

    this.logger.log(`User ${userId} clocked in at ${timeEntry.clockIn}`);

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

    this.logger.log(`User ${userId} clocked out at ${timeEntry.clockOut}`);

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
}
