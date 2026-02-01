import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { Role } from '@prisma/client';

@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  /**
   * Check compliance for a user on a specific date
   * GET /api/compliance/check?userId=xxx&date=yyyy-mm-dd
   */
  @Get('check')
  @Roles(Role.GLOBAL_ADMIN, Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)
  async checkCompliance(
    @CurrentUser() user: RequestUser,
    @Query('userId') userId?: string,
    @Query('date') _date?: string,
  ) {
    // Use current user if no userId provided
    const targetUserId = userId || user.id;

    return this.complianceService.validateClockInAllowed(
      targetUserId,
      user.tenantId!,
    );
  }

  /**
   * Batch check compliance for multiple users
   * GET /api/compliance/check-batch?userIds=id1,id2,id3
   */
  @Get('check-batch')
  @Roles(Role.GLOBAL_ADMIN, Role.ADMIN, Role.MANAGER)
  async checkComplianceBatch(
    @CurrentUser() user: RequestUser,
    @Query('userIds') userIds: string,
  ) {
    const userIdList = userIds.split(',').filter(Boolean);

    const results = await Promise.all(
      userIdList.map(async (userId) => {
        const result = await this.complianceService.validateClockInAllowed(
          userId,
          user.tenantId!,
        );
        return { userId, ...result };
      }),
    );

    return results;
  }
}
