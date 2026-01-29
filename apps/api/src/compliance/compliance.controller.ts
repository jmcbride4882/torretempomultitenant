import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  /**
   * Check compliance for a user on a specific date
   * GET /api/compliance/check?userId=xxx&date=yyyy-mm-dd
   */
  @Get('check')
  async checkCompliance(
    @CurrentUser() user: { tenantId: string; id: string },
    @Query('userId') userId?: string,
    @Query('date') date?: string,
  ) {
    // Use current user if no userId provided
    const targetUserId = userId || user.id;

    return this.complianceService.validateClockInAllowed(
      targetUserId,
      user.tenantId,
    );
  }

  /**
   * Batch check compliance for multiple users
   * GET /api/compliance/check-batch?userIds=id1,id2,id3
   */
  @Get('check-batch')
  async checkComplianceBatch(
    @CurrentUser() user: { tenantId: string },
    @Query('userIds') userIds: string,
  ) {
    const userIdList = userIds.split(',').filter(Boolean);

    const results = await Promise.all(
      userIdList.map(async (userId) => {
        const result = await this.complianceService.validateClockInAllowed(
          userId,
          user.tenantId,
        );
        return { userId, ...result };
      }),
    );

    return results;
  }
}
