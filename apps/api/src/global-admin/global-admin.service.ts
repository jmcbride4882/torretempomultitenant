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
      // Get counts in parallel - NO tenantId filter (global stats)
      const [totalTenants, totalUsers, totalLocations, activeLocations] =
        await Promise.all([
          // Total tenants in system
          this.prisma.tenant.count(),
          // Total users across all tenants
          this.prisma.user.count(),
          // Total locations across all tenants
          this.prisma.location.count(),
          // Active locations across all tenants
          this.prisma.location.count({
            where: {
              isActive: true,
            },
          }),
        ]);

      this.logger.log('System-wide stats retrieved');

      return {
        totalTenants,
        totalUsers,
        totalLocations,
        activeLocations,
        systemHealth: 'healthy' as const,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to retrieve system stats', error);
      // Return degraded health status on error
      return {
        totalTenants: 0,
        totalUsers: 0,
        totalLocations: 0,
        activeLocations: 0,
        systemHealth: 'critical' as const,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
