import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { RequestUser } from '../auth/interfaces/request-user.interface';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get dashboard statistics
   * GET /api/admin/stats
   * Admin/GLOBAL_ADMIN only
   */
  @Get('stats')
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  async getStats(@CurrentUser() user: RequestUser) {
    // GLOBAL_ADMIN users don't have tenantId - return empty stats
    if (!user.tenantId) {
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalLocations: 0,
        totalTimeEntries: 0,
        recentSignups: [],
      };
    }
    return this.adminService.getDashboardStats(user.tenantId);
  }

  /**
   * Get recent activity from audit logs
   * GET /api/admin/activity
   * Admin/GLOBAL_ADMIN only
   */
  @Get('activity')
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  async getActivity(
    @CurrentUser() user: RequestUser,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    // GLOBAL_ADMIN users don't have tenantId - return empty activity
    if (!user.tenantId) {
      return [];
    }
    return this.adminService.getRecentActivity(user.tenantId, limitNum);
  }
}
