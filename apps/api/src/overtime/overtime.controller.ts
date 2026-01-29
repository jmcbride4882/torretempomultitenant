import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { OvertimeService } from './overtime.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('overtime')
@UseGuards(JwtAuthGuard)
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  /**
   * Create overtime entry manually
   * POST /api/overtime
   */
  @Post()
  async createOvertime(
    @CurrentUser() user: any,
    @Body() dto: CreateOvertimeDto,
  ) {
    return this.overtimeService.createOvertimeEntry({
      ...dto,
      userId: dto.userId || user.id,
      tenantId: user.tenantId,
    });
  }

  /**
   * Approve overtime entry (managers only)
   * POST /api/overtime/:id/approve
   */
  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async approveOvertime(
    @CurrentUser() user: any,
    @Param('id') overtimeId: string,
    @Body() dto: ApproveOvertimeDto,
  ) {
    if (dto.overtimeId !== overtimeId) {
      throw new BadRequestException(
        'Overtime ID in URL does not match request body',
      );
    }

    return this.overtimeService.approveOvertime(
      overtimeId,
      user.id,
      dto.approvalNote,
    );
  }

  /**
   * Get user's annual overtime balance
   * GET /api/overtime/balance
   */
  @Get('balance')
  async getBalance(@CurrentUser() user: any) {
    const year = new Date().getFullYear();
    return this.overtimeService.getOvertimeBalance(user.id, year);
  }

  /**
   * Get pending overtime approvals (managers only)
   * GET /api/overtime/pending
   */
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async getPendingOvertimes(@CurrentUser() user: any) {
    return this.overtimeService.getPendingOvertimes(user.tenantId);
  }

  /**
   * Get user's overtime history
   * GET /api/overtime/history
   */
  @Get('history')
  async getOvertimeHistory(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    return this.overtimeService.getOvertimeHistory(
      user.id,
      user.tenantId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * Get all overtime entries for tenant (managers only)
   * GET /api/overtime/all
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async getAllOvertimes(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    return this.overtimeService.getAllOvertimes(
      user.tenantId,
      pageNum,
      pageSizeNum,
    );
  }
}
