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
    // Calculate start and end of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get counts in parallel
    const [totalUsers, activeUsers, totalLocations, timeEntries] = await Promise.all([
      // Total users in tenant
      this.prisma.user.count({
        where: { tenantId },
      }),
      // Active users
      this.prisma.user.count({
        where: {
          tenantId,
          isActive: true,
        },
      }),
      // Total locations (all, not just active)
      this.prisma.location.count({
        where: { tenantId },
      }),
      // All time entries this month for compliance calculation
      this.prisma.timeEntry.findMany({
        where: {
          tenantId,
          clockIn: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: {
          id: true,
          validationWarning: true,
        },
      }),
    ]);

    // Calculate compliance score: % of entries with no warnings
    const totalEntriesThisMonth = timeEntries.length;
    const compliantEntries = timeEntries.filter(
      (entry) => !entry.validationWarning || entry.validationWarning.trim() === '',
    );
    const complianceScore =
      totalEntriesThisMonth > 0
        ? Math.round((compliantEntries.length / totalEntriesThisMonth) * 100)
        : 100;

    this.logger.log(`Stats retrieved for tenant ${tenantId}: ${totalUsers} users, ${totalEntriesThisMonth} entries, ${complianceScore}% compliance`);

    return {
      totalUsers,
      activeUsers,
      totalLocations,
      totalEntriesThisMonth,
      complianceScore,
    };
  }

  /**
   * Get recent activity for a tenant from audit logs
   * @param tenantId - Tenant UUID
   * @param limit - Max number of activities to return (default 50)
   * @returns Recent activities formatted for display
   */
  async getRecentActivity(tenantId: string, limit: number = 50) {
    // Get recent audit logs
    const logs = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Map action + entity to human-readable strings
    const actionMap: Record<string, string> = {
      'TIME_ENTRY_CREATED': 'Clocked in',
      'TIME_ENTRY_UPDATED': 'Modified time entry',
      'EDIT_REQUEST_CREATED': 'Requested edit',
      'EDIT_REQUEST_APPROVED': 'Approved edit request',
      'EDIT_REQUEST_REJECTED': 'Rejected edit request',
      'USER_LOGIN': 'Logged in',
      'USER_LOGOUT': 'Logged out',
      'USER_CREATED': 'User created',
      'USER_UPDATED': 'User updated',
      'LOCATION_CREATED': 'Location created',
      'LOCATION_UPDATED': 'Location updated',
      'REPORT_GENERATED': 'Report generated',
    };

    // Format as activity feed
    const activities = logs.map((log) => {
      const actionKey = `${log.entity}_${log.action}`.toUpperCase().replace(/\s+/g, '_');
      const action = actionMap[log.action] || actionMap[actionKey] || log.action;
      const user = log.actorEmail || 'System';
      
      // Build details string
      let details = `${action}`;
      if (log.entity && log.entityId) {
        details += ` (${log.entity} ${log.entityId.substring(0, 8)})`;
      }

      return {
        timestamp: log.createdAt.toISOString(),
        user,
        action,
        details,
      };
    });

    this.logger.log(`Recent activity retrieved for tenant ${tenantId}: ${activities.length} entries`);

    return activities;
  }
}
