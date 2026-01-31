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
import { TimeTrackingService } from './time-tracking.service';
import {
  ClockInDto,
  ClockOutDto,
  StartBreakDto,
  EndBreakDto,
  TeamStatsDto,
  ClockedInEmployeeDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
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
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async clockIn(@CurrentUser() user: RequestUser, @Body() dto: ClockInDto) {
    // GLOBAL_ADMIN users don't have tenantId - they cannot clock in
    if (!user.tenantId) {
      throw new BadRequestException('GLOBAL_ADMIN users cannot clock in/out');
    }
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
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async clockOut(@CurrentUser() user: RequestUser, @Body() dto: ClockOutDto) {
    // GLOBAL_ADMIN users don't have tenantId - they cannot clock out
    if (!user.tenantId) {
      throw new BadRequestException('GLOBAL_ADMIN users cannot clock in/out');
    }
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
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async getCurrentEntry(@CurrentUser() user: RequestUser) {
    // GLOBAL_ADMIN users don't have tenantId and don't clock in/out
    if (!user.tenantId) {
      return null;
    }
    return this.timeTrackingService.getCurrentEntry(user.id, user.tenantId);
  }

  /**
   * Get my time entries (employee view)
   * GET /api/time-tracking/entries
   */
  @Get('entries')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async getMyEntries(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    // GLOBAL_ADMIN users don't have tenantId and don't clock in/out
    if (!user.tenantId) {
      return { entries: [], total: 0, page: pageNum || 1, pageSize: pageSizeNum || 50 };
    }
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
  @Roles(Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async getAllEntries(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    // GLOBAL_ADMIN users don't have tenantId - return empty
    if (!user.tenantId) {
      return { entries: [], total: 0, page: pageNum || 1, pageSize: pageSizeNum || 50 };
    }
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
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async startBreak(@CurrentUser() user: RequestUser, @Body() dto: StartBreakDto) {
    return this.timeTrackingService.startBreak(dto.timeEntryId, user.id);
  }

  /**
   * End a break
   * POST /api/time-tracking/breaks/end
   */
  @Post('breaks/end')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async endBreak(@CurrentUser() user: RequestUser, @Body() dto: EndBreakDto) {
    return this.timeTrackingService.endBreak(dto.breakId, user.id);
  }

  /**
   * Get breaks for a time entry
   * GET /api/time-tracking/breaks/:timeEntryId
   */
  @Get('breaks/:timeEntryId')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async getBreaks(@Param('timeEntryId') timeEntryId: string) {
    return this.timeTrackingService.getBreaks(timeEntryId);
  }

  /**
   * Get currently clocked-in employees (manager/admin view)
   * GET /api/time-tracking/clocked-in
   */
  @Get('clocked-in')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async getClockedInEmployees(
    @CurrentUser() user: RequestUser,
  ): Promise<ClockedInEmployeeDto[]> {
    // GLOBAL_ADMIN users don't have tenantId - return empty array
    if (!user.tenantId) {
      return [];
    }
    return this.timeTrackingService.getClockedInEmployees(user.tenantId);
  }

  /**
   * Get team statistics (manager/admin view)
   * GET /api/time-tracking/team-stats
   */
  @Get('team-stats')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async getTeamStats(@CurrentUser() user: RequestUser): Promise<TeamStatsDto> {
    // GLOBAL_ADMIN users don't have tenantId - return empty stats
    if (!user.tenantId) {
      return {
        totalEmployees: 0,
        clockedIn: 0,
        totalHoursToday: 0,
        totalHoursWeek: 0,
        overtimeHours: 0,
      };
    }
    return this.timeTrackingService.getTeamStats(user.tenantId);
  }
}
