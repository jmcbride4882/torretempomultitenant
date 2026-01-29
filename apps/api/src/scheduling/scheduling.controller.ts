import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Controller('scheduling')
@UseGuards(JwtAuthGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // ============================================
  // SHIFTS (Manager/Admin only)
  // ============================================

  /**
   * Create a shift template
   * POST /api/scheduling/shifts
   */
  @Post('shifts')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async createShift(@CurrentUser() user: any, @Body() dto: CreateShiftDto) {
    return this.schedulingService.createShift(user.tenantId, dto);
  }

  /**
   * Get all shifts
   * GET /api/scheduling/shifts
   */
  @Get('shifts')
  async getShifts(
    @CurrentUser() user: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.schedulingService.getShifts(
      user.tenantId,
      includeInactive === 'true',
    );
  }

  /**
   * Get a single shift
   * GET /api/scheduling/shifts/:id
   */
  @Get('shifts/:id')
  async getShift(@CurrentUser() user: any, @Param('id') id: string) {
    return this.schedulingService.getShift(user.tenantId, id);
  }

  /**
   * Update a shift
   * PATCH /api/scheduling/shifts/:id
   */
  @Patch('shifts/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async updateShift(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.schedulingService.updateShift(user.tenantId, id, dto);
  }

  /**
   * Soft delete a shift
   * DELETE /api/scheduling/shifts/:id
   */
  @Delete('shifts/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async deleteShift(@CurrentUser() user: any, @Param('id') id: string) {
    return this.schedulingService.deleteShift(user.tenantId, id);
  }

  // ============================================
  // SCHEDULES
  // ============================================

  /**
   * Create a schedule assignment
   * POST /api/scheduling/schedules
   */
  @Post('schedules')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async createSchedule(@CurrentUser() user: any, @Body() dto: CreateScheduleDto) {
    return this.schedulingService.createSchedule(user.tenantId, dto);
  }

  /**
   * Get schedules
   * GET /api/scheduling/schedules
   * Employees see only their own published schedules
   * Managers/Admins see all schedules
   */
  @Get('schedules')
  async getSchedules(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.schedulingService.getSchedules(
      user.tenantId,
      user.id,
      user.role,
      startDate,
      endDate,
      employeeId,
    );
  }

  /**
   * Get a single schedule
   * GET /api/scheduling/schedules/:id
   */
  @Get('schedules/:id')
  async getSchedule(@CurrentUser() user: any, @Param('id') id: string) {
    return this.schedulingService.getSchedule(
      user.tenantId,
      id,
      user.id,
      user.role,
    );
  }

  /**
   * Update a schedule
   * PATCH /api/scheduling/schedules/:id
   */
  @Patch('schedules/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async updateSchedule(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulingService.updateSchedule(user.tenantId, id, dto);
  }

  /**
   * Delete a schedule
   * DELETE /api/scheduling/schedules/:id
   */
  @Delete('schedules/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async deleteSchedule(@CurrentUser() user: any, @Param('id') id: string) {
    return this.schedulingService.deleteSchedule(user.tenantId, id);
  }

  /**
   * Publish a single schedule
   * POST /api/scheduling/schedules/:id/publish
   */
  @Post('schedules/:id/publish')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async publishSchedule(@CurrentUser() user: any, @Param('id') id: string) {
    return this.schedulingService.publishSchedule(user.tenantId, id);
  }

  /**
   * Bulk publish schedules
   * POST /api/scheduling/schedules/publish-many
   */
  @Post('schedules/publish-many')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async publishMany(
    @CurrentUser() user: any,
    @Body() dto: { scheduleIds: string[] },
  ) {
    return this.schedulingService.publishMany(user.tenantId, dto.scheduleIds);
  }

  // ============================================
  // EMPLOYEE VIEW
  // ============================================

  /**
   * Get my published schedules
   * GET /api/scheduling/my-schedule
   */
  @Get('my-schedule')
  async getMySchedules(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.schedulingService.getMySchedules(
      user.tenantId,
      user.id,
      startDate,
      endDate,
    );
  }

  /**
   * Get my schedule for a specific week
   * GET /api/scheduling/my-schedule/week/:date
   */
  @Get('my-schedule/week/:date')
  async getMyWeekSchedule(
    @CurrentUser() user: any,
    @Param('date') date: string,
  ) {
    return this.schedulingService.getMyWeekSchedule(
      user.tenantId,
      user.id,
      date,
    );
  }

  // ============================================
  // COMPLIANCE
  // ============================================

  /**
   * Compare scheduled hours vs actual time entries
   * GET /api/scheduling/scheduled-vs-actual
   */
  @Get('scheduled-vs-actual')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async getScheduledVsActual(
    @CurrentUser() user: any,
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.schedulingService.getScheduledVsActual(
      user.tenantId,
      userId,
      startDate,
      endDate,
    );
  }
}
