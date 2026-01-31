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
import { RequestUser } from '../auth/interfaces/request-user.interface';
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
  @UseGuards(RolesGuard)
  @Roles(Role.GLOBAL_ADMIN, Role.ADMIN, Role.MANAGER)
  async createOvertime(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateOvertimeDto,
  ) {
    const userId = dto.userId || user.id;
    const tenantId = user.tenantId!;
    
    return this.overtimeService.createOvertimeEntry({
      timeEntryId: dto.timeEntryId,
      userId,
      tenantId,
      hours: dto.hours,
      type: dto.type,
    });
  }

  /**
   * Approve overtime entry (managers only)
   * POST /api/overtime/:id/approve
   */
  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.GLOBAL_ADMIN, Role.ADMIN, Role.MANAGER)
  async approveOvertime(
    @CurrentUser() user: RequestUser,
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
  async getBalance(@CurrentUser() user: RequestUser) {
    const year = new Date().getFullYear();
    return this.overtimeService.getOvertimeBalance(user.id, year);
  }

  /**
   * Get pending overtime approvals (managers only)
   * GET /api/overtime/pending
   */
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.GLOBAL_ADMIN, Role.ADMIN, Role.MANAGER)
  async getPendingOvertimes(@CurrentUser() user: RequestUser) {
    return this.overtimeService.getPendingOvertimes(user.tenantId!);
  }

  /**
   * Get user's overtime history
   * GET /api/overtime/history
   */
  @Get('history')
  async getOvertimeHistory(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    return this.overtimeService.getOvertimeHistory(
      user.id,
      user.tenantId!,
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
  @Roles(Role.GLOBAL_ADMIN, Role.ADMIN, Role.MANAGER)
  async getAllOvertimes(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    return this.overtimeService.getAllOvertimes(
      user.tenantId!,
      pageNum,
      pageSizeNum,
    );
  }
}
