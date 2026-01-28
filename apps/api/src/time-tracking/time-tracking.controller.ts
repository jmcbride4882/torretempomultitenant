import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
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
    return this.timeTrackingService.clockIn(user.id, user.tenantId, dto);
  }

  /**
   * Clock out
   * POST /api/time-tracking/clock-out
   */
  @Post('clock-out')
  async clockOut(@CurrentUser() user: any, @Body() dto: ClockOutDto) {
    return this.timeTrackingService.clockOut(user.id, user.tenantId, dto);
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
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.timeTrackingService.getEntries(
      user.id,
      user.tenantId,
      page,
      pageSize,
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
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.timeTrackingService.getAllEntries(
      user.tenantId,
      page,
      pageSize,
    );
  }
}
