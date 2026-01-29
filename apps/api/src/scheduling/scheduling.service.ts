import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // SHIFTS (Templates)
  // ============================================

  /**
   * Create a shift template
   */
  async createShift(tenantId: string, dto: CreateShiftDto) {
    const shift = await this.prisma.shift.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        breakMins: dto.breakMins || 0,
        isActive: true,
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

    this.logger.log(`Shift created: ${shift.id} - ${shift.name}`);

    return shift;
  }

  /**
   * Get all shifts for a tenant
   */
  async getShifts(tenantId: string, includeInactive = false) {
    const where: any = { tenantId };

    if (!includeInactive) {
      where.isActive = true;
    }

    const shifts = await this.prisma.shift.findMany({
      where,
      orderBy: {
        name: 'asc',
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

    return shifts;
  }

  /**
   * Get a single shift by ID
   */
  async getShift(tenantId: string, shiftId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: {
        id: shiftId,
        tenantId,
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

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  /**
   * Update a shift
   */
  async updateShift(tenantId: string, shiftId: string, dto: UpdateShiftDto) {
    // Verify shift exists and belongs to tenant
    await this.getShift(tenantId, shiftId);

    const shift = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        locationId: dto.locationId,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        breakMins: dto.breakMins,
        isActive: dto.isActive,
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

    this.logger.log(`Shift updated: ${shift.id} - ${shift.name}`);

    return shift;
  }

  /**
   * Soft delete a shift (set isActive = false)
   */
  async deleteShift(tenantId: string, shiftId: string) {
    // Verify shift exists and belongs to tenant
    await this.getShift(tenantId, shiftId);

    const shift = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`Shift deleted (soft): ${shift.id} - ${shift.name}`);

    return shift;
  }

  // ============================================
  // SCHEDULES (Assignments)
  // ============================================

  /**
   * Create a schedule assignment
   */
  async createSchedule(tenantId: string, dto: CreateScheduleDto) {
    // Verify shift exists and belongs to tenant
    const shift = await this.prisma.shift.findFirst({
      where: {
        id: dto.shiftId,
        tenantId,
      },
    });

    if (!shift) {
      throw new BadRequestException('Shift not found');
    }

    // Verify user exists and belongs to tenant
    const user = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        tenantId,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check for existing schedule on same date (unique constraint)
    const existing = await this.prisma.schedule.findFirst({
      where: {
        userId: dto.userId,
        date: new Date(dto.date),
      },
    });

    if (existing) {
      throw new BadRequestException(
        'User already has a schedule for this date',
      );
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        tenantId,
        userId: dto.userId,
        shiftId: dto.shiftId,
        locationId: dto.locationId,
        date: new Date(dto.date),
        isPublished: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            breakMins: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Schedule created: ${schedule.id} for user ${user.email} on ${dto.date}`,
    );

    return schedule;
  }

  /**
   * Get schedules with filtering
   * Employees see only their own published schedules
   * Managers/Admins see all schedules
   */
  async getSchedules(
    tenantId: string,
    userId: string,
    userRole: string,
    startDate?: string,
    endDate?: string,
    employeeId?: string,
  ) {
    const where: any = { tenantId };

    // Role-based filtering
    if (userRole === Role.EMPLOYEE) {
      where.userId = userId;
      where.isPublished = true;
    } else if (employeeId) {
      where.userId = employeeId;
    }

    // Date range filtering
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            breakMins: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return schedules;
  }

  /**
   * Get a single schedule by ID
   */
  async getSchedule(
    tenantId: string,
    scheduleId: string,
    userId: string,
    userRole: string,
  ) {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            breakMins: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    // Employees can only see their own published schedules
    if (userRole === Role.EMPLOYEE) {
      if (schedule.userId !== userId || !schedule.isPublished) {
        throw new ForbiddenException('You can only view your own schedules');
      }
    }

    return schedule;
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    tenantId: string,
    scheduleId: string,
    dto: UpdateScheduleDto,
  ) {
    // Verify schedule exists and belongs to tenant
    const existing = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Schedule not found');
    }

    const schedule = await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        shiftId: dto.shiftId,
        locationId: dto.locationId,
        date: dto.date ? new Date(dto.date) : undefined,
        isPublished: dto.isPublished,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            breakMins: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Schedule updated: ${schedule.id}`);

    return schedule;
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(tenantId: string, scheduleId: string) {
    // Verify schedule exists and belongs to tenant
    const existing = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Schedule not found');
    }

    await this.prisma.schedule.delete({
      where: { id: scheduleId },
    });

    this.logger.log(`Schedule deleted: ${scheduleId}`);

    return { message: 'Schedule deleted successfully' };
  }

  /**
   * Publish a single schedule
   */
  async publishSchedule(tenantId: string, scheduleId: string) {
    const schedule = await this.updateSchedule(tenantId, scheduleId, {
      isPublished: true,
    });

    this.logger.log(`Schedule published: ${scheduleId}`);

    return schedule;
  }

  /**
   * Bulk publish schedules
   */
  async publishMany(tenantId: string, scheduleIds: string[]) {
    const result = await this.prisma.schedule.updateMany({
      where: {
        id: { in: scheduleIds },
        tenantId,
      },
      data: {
        isPublished: true,
      },
    });

    this.logger.log(
      `Bulk published ${result.count} schedules for tenant ${tenantId}`,
    );

    return { publishedCount: result.count };
  }

  /**
   * Get my published schedules (employee view)
   */
  async getMySchedules(
    tenantId: string,
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      tenantId,
      userId,
      isPublished: true,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
      include: {
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            breakMins: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return schedules;
  }

  /**
   * Get my schedule for a specific week
   */
  async getMyWeekSchedule(tenantId: string, userId: string, weekStart: string) {
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // 7 days total

    return this.getMySchedules(
      tenantId,
      userId,
      startDate.toISOString(),
      endDate.toISOString(),
    );
  }

  // ============================================
  // COMPLIANCE: Scheduled vs Actual Hours
  // ============================================

  /**
   * Get open shifts (unassigned schedules where userId is null)
   */
  async getOpenShifts(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Build where clause for date filtering
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        userId: { equals: undefined },
        isPublished: true,
        ...(startDate || endDate ? { date: dateFilter } : {}),
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            breakMins: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return schedules;
  }

  /**
   * Accept an open shift (employee self-assignment)
   */
  async acceptShift(
    tenantId: string,
    scheduleId: string,
    userId: string,
  ) {
    // Verify schedule exists and belongs to tenant
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        tenantId,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    // Verify the shift is open (unassigned)
    if (schedule.userId !== null) {
      throw new BadRequestException('This shift is already assigned');
    }

    // Verify the shift is published
    if (!schedule.isPublished) {
      throw new BadRequestException('This shift is not available for acceptance');
    }

    // Check if user already has a schedule for that date
    const existingSchedule = await this.prisma.schedule.findFirst({
      where: {
        userId,
        date: schedule.date,
        tenantId,
      },
    });

    if (existingSchedule) {
      throw new BadRequestException('You already have a shift scheduled for this date');
    }

    // Assign the shift to the user
    const updatedSchedule = await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            breakMins: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Shift accepted: ${scheduleId} by user ${userId}`,
    );

    return updatedSchedule;
  }

  /**
   * Compare scheduled hours vs actual time entries
   */
  async getScheduledVsActual(
    tenantId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
  ) {
    // Get published schedules for the period
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        userId: employeeId,
        isPublished: true,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        shift: true,
      },
    });

    // Get actual time entries for the period
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        tenantId,
        userId: employeeId,
        clockIn: {
          gte: new Date(startDate),
        },
        clockOut: {
          lte: new Date(endDate),
        },
      },
    });

    // Calculate scheduled hours
    let scheduledMinutes = 0;
    for (const schedule of schedules) {
      const [startHour, startMin] = schedule.shift.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.shift.endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;

      // Handle overnight shifts
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
      }

      const shiftMinutes = endMinutes - startMinutes - schedule.shift.breakMins;
      scheduledMinutes += shiftMinutes;
    }

    // Calculate actual hours
    let actualMinutes = 0;
    for (const entry of timeEntries) {
      if (entry.clockOut) {
        const diffMs = entry.clockOut.getTime() - entry.clockIn.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const breakMinutes = entry.breakMinutes || 0;
        actualMinutes += diffMinutes - breakMinutes;
      }
    }

    const scheduledHours = scheduledMinutes / 60;
    const actualHours = actualMinutes / 60;
    const variance = actualHours - scheduledHours;

    return {
      scheduledHours: parseFloat(scheduledHours.toFixed(2)),
      actualHours: parseFloat(actualHours.toFixed(2)),
      variance: parseFloat(variance.toFixed(2)),
      scheduleCount: schedules.length,
      entryCount: timeEntries.length,
    };
  }
}
