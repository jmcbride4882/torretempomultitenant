import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GlobalAdminService {
  private readonly logger = new Logger(GlobalAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get system-wide statistics across ALL tenants
   * @returns System-wide dashboard statistics
   */
  async getSystemStats() {
    try {
      // Calculate date ranges
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Get counts in parallel - NO tenantId filter (global stats)
      const [totalTenants, totalUsers, activeTenantGroups, totalEntriesThisMonth] =
        await Promise.all([
          // Total tenants in system
          this.prisma.tenant.count(),
          // Total users across all tenants
          this.prisma.user.count(),
          // Tenants with time entries in last 30 days
          this.prisma.timeEntry.groupBy({
            by: ['tenantId'],
            where: {
              createdAt: { gte: thirtyDaysAgo },
            },
            _count: true,
          }),
          // Total time entries this month
          this.prisma.timeEntry.count({
            where: {
              createdAt: { gte: startOfMonth },
            },
          }),
        ]);

      const activeTenants = activeTenantGroups.length;

      this.logger.log('System-wide stats retrieved');

      return {
        totalTenants,
        activeTenants,
        totalUsers,
        totalEntriesThisMonth,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve system stats', error);
      throw error;
    }
  }
}
