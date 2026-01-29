import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { AuditService } from '../audit/audit.service';
import { RetentionService } from '../audit/retention.service';
import { CreateEditRequestDto } from './dto/create-edit-request.dto';
import { ReviewEditRequestDto } from './dto/review-edit-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, ApprovalStatus } from '@prisma/client';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(
    private readonly approvalsService: ApprovalsService,
    private readonly auditService: AuditService,
    private readonly retentionService: RetentionService,
  ) {}

  /**
   * Create edit request
   * POST /api/approvals/edit-requests
   * Any authenticated user can create an edit request
   */
  @Post('edit-requests')
  async createEditRequest(
    @CurrentUser() user: any,
    @Body() dto: CreateEditRequestDto,
  ) {
    return this.approvalsService.createEditRequest(
      user.id,
      user.tenantId,
      user.email,
      user.role,
      dto,
    );
  }

  /**
   * Get edit requests
   * GET /api/approvals/edit-requests
   * Employees see their own, managers/admins see all
   */
  @Get('edit-requests')
  async getEditRequests(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    const statusEnum = status as ApprovalStatus | undefined;

    return this.approvalsService.getEditRequests(
      user.id,
      user.tenantId,
      user.role,
      statusEnum,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * Get single edit request
   * GET /api/approvals/edit-requests/:id
   */
  @Get('edit-requests/:id')
  async getEditRequest(@CurrentUser() user: any, @Param('id') id: string) {
    return this.approvalsService.getEditRequest(
      id,
      user.id,
      user.tenantId,
      user.role,
    );
  }

  /**
   * Approve edit request
   * POST /api/approvals/edit-requests/:id/approve
   * Manager/Admin only
   */
  @Post('edit-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async approveEditRequest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewEditRequestDto,
  ) {
    return this.approvalsService.approveEditRequest(
      id,
      user.id,
      user.tenantId,
      user.email,
      user.role,
      dto,
    );
  }

  /**
   * Reject edit request
   * POST /api/approvals/edit-requests/:id/reject
   * Manager/Admin only
   */
  @Post('edit-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async rejectEditRequest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewEditRequestDto,
  ) {
    return this.approvalsService.rejectEditRequest(
      id,
      user.id,
      user.tenantId,
      user.email,
      user.role,
      dto,
    );
  }

  /**
   * Get audit logs for a time entry
   * GET /api/approvals/audit/entry/:entryId
   * Manager/Admin only
   */
  @Get('audit/entry/:entryId')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async getAuditLogsForEntry(
    @CurrentUser() user: any,
    @Param('entryId') entryId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    return this.auditService.getLogsForEntity(
      user.tenantId,
      'TimeEntry',
      entryId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * Get all audit logs
   * GET /api/approvals/audit
   * Manager/Admin only
   */
  @Get('audit')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async getAllAuditLogs(
    @CurrentUser() user: any,
    @Query('entity') entity?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    return this.auditService.getAllLogs(
      user.tenantId,
      pageNum,
      pageSizeNum,
      entity,
    );
  }

  /**
   * Check retention policy status (dry-run)
   * GET /api/approvals/retention/check
   * Admin only - Returns statistics without applying any changes
   */
  @Get('retention/check')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async checkRetentionPolicy() {
    return this.retentionService.runManualRetentionCheck();
  }

  /**
   * Run retention policy manually
   * POST /api/approvals/retention/run
   * Admin only - Actually applies the retention policy (archives old data)
   */
  @Post('retention/run')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async runRetentionPolicy() {
    return this.retentionService.runRetentionPolicyNow();
  }
}
