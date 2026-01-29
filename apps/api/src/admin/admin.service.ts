import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get admin dashboard statistics for a tenant
   * @param tenantId - Tenant UUID
   * @returns Dashboard statistics
   */
  async getDashboardStats(tenantId: string) {
    // Get counts in parallel
    const [totalUsers, activeLocations, totalEntries] = await Promise.all([
      // Total users in tenant
      this.prisma.user.count({
        where: { tenantId },
      }),
      // Active locations
      this.prisma.location.count({
        where: {
          tenantId,
          isActive: true,
        },
      }),
      // Total time entries this month
      this.prisma.timeEntry.count({
        where: {
          tenantId,
          clockIn: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    this.logger.log(`Stats retrieved for tenant ${tenantId}`);

    return {
      totalUsers,
      activeLocations,
      totalEntries,
      pendingReports: 0, // TODO: Implement when reports are ready
      systemHealth: 'healthy' as const,
    };
  }

  /**
   * Get recent activity for a tenant
   * @param tenantId - Tenant UUID
   * @param limit - Max number of activities to return
   * @returns Recent activities
   */
  async getRecentActivity(tenantId: string, limit: number = 10) {
    // Get recent time entries with user info
    const recentEntries = await this.prisma.timeEntry.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Format as activity items
    const activities = recentEntries.map((entry) => ({
      id: entry.id,
      type: 'TIME_ENTRY',
      description: entry.clockOut
        ? 'Clocked out'
        : 'Clocked in',
      timestamp: entry.createdAt.toISOString(),
      user: {
        firstName: entry.user.firstName,
        lastName: entry.user.lastName,
      },
    }));

    this.logger.log(`Recent activity retrieved for tenant ${tenantId}`);

    return activities;
  }
}
