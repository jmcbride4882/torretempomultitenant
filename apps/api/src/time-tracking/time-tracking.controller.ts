import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
  Param,
} from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { ClockInDto, ClockOutDto, StartBreakDto, EndBreakDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('time-tracking')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  /**
   * Clock in
   * POST /api/time-tracking/clock-in
   */
  @Post('clock-in')
  async clockIn(@CurrentUser() user: any, @Body() dto: ClockInDto) {
    return this.timeTrackingService.clockIn(
      user.id,
      user.tenantId,
      user.email,
      user.role,
      dto,
    );
  }

  /**
   * Clock out
   * POST /api/time-tracking/clock-out
   */
  @Post('clock-out')
  async clockOut(@CurrentUser() user: any, @Body() dto: ClockOutDto) {
    return this.timeTrackingService.clockOut(
      user.id,
      user.tenantId,
      user.email,
      user.role,
      dto,
    );
  }

  /**
   * Get current active time entry
   * GET /api/time-tracking/current
   */
  @Get('current')
  async getCurrentEntry(@CurrentUser() user: any) {
    return this.timeTrackingService.getCurrentEntry(user.id, user.tenantId);
  }

  /**
   * Get my time entries (employee view)
   * GET /api/time-tracking/entries
   */
  @Get('entries')
  async getMyEntries(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.timeTrackingService.getEntries(
      user.id,
      user.tenantId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * Get all time entries (manager/admin view)
   * GET /api/time-tracking/all
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async getAllEntries(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.timeTrackingService.getAllEntries(
      user.tenantId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * Start a break
   * POST /api/time-tracking/breaks/start
   */
  @Post('breaks/start')
  async startBreak(@CurrentUser() user: any, @Body() dto: StartBreakDto) {
    return this.timeTrackingService.startBreak(dto.timeEntryId, user.id);
  }

  /**
   * End a break
   * POST /api/time-tracking/breaks/end
   */
  @Post('breaks/end')
  async endBreak(@CurrentUser() user: any, @Body() dto: EndBreakDto) {
    return this.timeTrackingService.endBreak(dto.breakId, user.id);
  }

  /**
   * Get breaks for a time entry
   * GET /api/time-tracking/breaks/:timeEntryId
   */
  @Get('breaks/:timeEntryId')
  async getBreaks(@Param('timeEntryId') timeEntryId: string) {
    return this.timeTrackingService.getBreaks(timeEntryId);
  }
}
