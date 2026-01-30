import { Controller, Get, UseGuards } from '@nestjs/common';
import { GlobalAdminService } from './global-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('global-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.GLOBAL_ADMIN)
export class GlobalAdminController {
  constructor(private readonly globalAdminService: GlobalAdminService) {}

  /**
   * Get system-wide statistics (all tenants)
   * GET /api/global-admin/stats
   * Restricted to GLOBAL_ADMIN role only
   */
  @Get('stats')
  async getStats() {
    return this.globalAdminService.getSystemStats();
  }
}
