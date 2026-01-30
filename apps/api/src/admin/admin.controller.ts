import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get dashboard statistics
   * GET /api/admin/stats
   * Admin only
   */
  @Get('stats')
  @Roles(Role.ADMIN)
  async getStats(@CurrentUser() user: any) {
    return this.adminService.getDashboardStats(user.tenantId);
  }

  /**
   * Get recent activity from audit logs
   * GET /api/admin/activity
   * Admin only
   */
  @Get('activity')
  @Roles(Role.ADMIN)
  async getActivity(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.adminService.getRecentActivity(user.tenantId, limitNum);
  }
}
