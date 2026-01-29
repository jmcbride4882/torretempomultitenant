import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, 'GLOBAL_ADMIN' as any)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get dashboard statistics
   * GET /api/admin/stats
   */
  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return this.adminService.getDashboardStats(user.tenantId);
  }

  /**
   * Get recent activity
   * GET /api/admin/activity
   */
  @Get('activity')
  async getActivity(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getRecentActivity(user.tenantId, limitNum);
  }
}
