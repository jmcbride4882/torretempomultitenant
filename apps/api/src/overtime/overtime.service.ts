import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { OvertimeType, CompensationType } from '@prisma/client';
import { differenceInMinutes } from 'date-fns';

@Injectable()
export class OvertimeService {
  private readonly logger = new Logger(OvertimeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Detect overtime from a completed time entry
   * Checks if worked hours exceed 9h/day and creates overtime entry if needed
   */
  async detectOvertime(timeEntryId: string): Promise<any | null> {
    // Get time entry with breaks
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: { breaks: true },
    });

    if (!entry || !entry.clockOut) {
      return null;
    }

    // Calculate worked hours (excluding breaks)
    const totalMinutes = differenceInMinutes(entry.clockOut, entry.clockIn);
    const breakMinutes = entry.breaks.reduce((sum, b) => {
      if (b.endedAt) {
        return sum + differenceInMinutes(b.endedAt, b.startedAt);
      }
      return sum;
    }, 0);

    const workedHours = (totalMinutes - breakMinutes) / 60;
    const dailyLimit = 9; // TODO: Get from convenio rules

    if (workedHours > dailyLimit) {
      const overtimeHours = workedHours - dailyLimit;
      return this.createOvertimeEntry({
        timeEntryId,
        userId: entry.userId,
        tenantId: entry.tenantId,
        hours: overtimeHours,
        type: OvertimeType.ORDINARY,
      });
    }

    return null;
  }

  /**
   * Create an overtime entry manually
   */
  async createOvertimeEntry(data: CreateOvertimeDto): Promise<any> {
    // Verify time entry exists
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id: data.timeEntryId },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if overtime entry already exists for this time entry
    const existingOvertime = await this.prisma.overtimeEntry.findFirst({
      where: { timeEntryId: data.timeEntryId },
    });

    if (existingOvertime) {
      throw new BadRequestException(
        'Overtime entry already exists for this time entry',
      );
    }

    // Create overtime entry
    const overtimeEntry = await this.prisma.overtimeEntry.create({
      data: {
        timeEntryId: data.timeEntryId,
        userId: data.userId,
        tenantId: data.tenantId,
        hours: data.hours,
        type: data.type,
        compensationType: CompensationType.TIME_OFF,
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
        timeEntry: {
          select: {
            id: true,
            clockIn: true,
            clockOut: true,
          },
        },
      },
    });

    this.logger.log(
      `Overtime entry created: ${overtimeEntry.id} for user ${data.userId}`,
    );

    return overtimeEntry;
  }

  /**
   * Approve an overtime entry
   */
  async approveOvertime(
    overtimeId: string,
    approverId: string,
    approvalNote?: string,
  ): Promise<any> {
    // Verify overtime entry exists
    const overtimeEntry = await this.prisma.overtimeEntry.findUnique({
      where: { id: overtimeId },
    });

    if (!overtimeEntry) {
      throw new NotFoundException('Overtime entry not found');
    }

    // Verify approver exists
    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
    });

    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    // Update overtime entry with approval
    const approvedOvertime = await this.prisma.overtimeEntry.update({
      where: { id: overtimeId },
      data: {
        approvedById: approverId,
        approvedAt: new Date(),
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
        approvedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(
      `Overtime entry ${overtimeId} approved by ${approverId}`,
    );

    return approvedOvertime;
  }

  /**
   * Get annual overtime balance for a user
   * Calculates total ordinary overtime hours for the current year
   * Excludes force majeure overtime (not subject to 80h limit)
   */
  async getAnnualOvertime(userId: string): Promise<number> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const result = await this.prisma.overtimeEntry.aggregate({
      where: {
        userId,
        type: OvertimeType.ORDINARY, // Exclude force majeure
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      _sum: { hours: true },
    });

    return result._sum.hours || 0;
  }

  /**
   * Get overtime balance for a user
   * Returns total hours and remaining hours (80h limit - used hours)
   */
  async getOvertimeBalance(userId: string, year?: number): Promise<{
    totalHours: number;
    remainingHours: number;
    annualLimit: number;
  }> {
    const targetYear = year || new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

    const result = await this.prisma.overtimeEntry.aggregate({
      where: {
        userId,
        type: OvertimeType.ORDINARY,
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      _sum: { hours: true },
    });

    const totalHours = result._sum.hours || 0;
    const annualLimit = 80; // Spanish labor law limit
    const remainingHours = Math.max(0, annualLimit - totalHours);

    return {
      totalHours,
      remainingHours,
      annualLimit,
    };
  }

  /**
   * Get pending (unapproved) overtime entries for a tenant
   */
  async getPendingOvertimes(tenantId: string): Promise<any[]> {
    return this.prisma.overtimeEntry.findMany({
      where: {
        tenantId,
        approvedAt: null,
      },
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
        timeEntry: {
          select: {
            id: true,
            clockIn: true,
            clockOut: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get overtime history for a user
   */
  async getOvertimeHistory(
    userId: string,
    tenantId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{
    entries: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const skip = (page - 1) * pageSize;

    const [entries, total] = await Promise.all([
      this.prisma.overtimeEntry.findMany({
        where: {
          userId,
          tenantId,
        },
        include: {
          timeEntry: {
            select: {
              id: true,
              clockIn: true,
              clockOut: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.overtimeEntry.count({
        where: {
          userId,
          tenantId,
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
   * Get all overtime entries for a tenant (manager/admin view)
   */
  async getAllOvertimes(
    tenantId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{
    entries: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const skip = (page - 1) * pageSize;

    const [entries, total] = await Promise.all([
      this.prisma.overtimeEntry.findMany({
        where: {
          tenantId,
        },
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
          timeEntry: {
            select: {
              id: true,
              clockIn: true,
              clockOut: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.overtimeEntry.count({
        where: {
          tenantId,
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
