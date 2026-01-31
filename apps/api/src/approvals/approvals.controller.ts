import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
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
import { RequestUser } from '../auth/interfaces/request-user.interface';

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
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateEditRequestDto,
  ) {
    // GLOBAL_ADMIN users don't have tenantId - they cannot create edit requests
    if (!user.tenantId) {
      throw new BadRequestException('GLOBAL_ADMIN users cannot create edit requests');
    }
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
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    const statusEnum = status as ApprovalStatus | undefined;

    // GLOBAL_ADMIN users don't have tenantId - return empty
    if (!user.tenantId) {
      return { editRequests: [], total: 0, page: pageNum || 1, pageSize: pageSizeNum || 50 };
    }

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
  async getEditRequest(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    // GLOBAL_ADMIN users don't have tenantId - allow cross-tenant lookup
    return this.approvalsService.getEditRequest(
      id,
      user.id,
      user.tenantId || null,
      user.role,
    );
  }

  /**
   * Approve edit request
   * POST /api/approvals/edit-requests/:id/approve
   * Manager/Admin/GLOBAL_ADMIN only
   */
  @Post('edit-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async approveEditRequest(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewEditRequestDto,
  ) {
    // GLOBAL_ADMIN users don't have tenantId - they cannot approve edit requests
    if (!user.tenantId) {
      throw new BadRequestException('GLOBAL_ADMIN users cannot approve edit requests without specifying a tenant');
    }
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
   * Manager/Admin/GLOBAL_ADMIN only
   */
  @Post('edit-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async rejectEditRequest(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewEditRequestDto,
  ) {
    // GLOBAL_ADMIN users don't have tenantId - they cannot reject edit requests
    if (!user.tenantId) {
      throw new BadRequestException('GLOBAL_ADMIN users cannot reject edit requests without specifying a tenant');
    }
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
   * Manager/Admin/GLOBAL_ADMIN only
   */
  @Get('audit/entry/:entryId')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async getAuditLogsForEntry(
    @CurrentUser() user: RequestUser,
    @Param('entryId') entryId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    // GLOBAL_ADMIN users don't have tenantId - return empty for now
    if (!user.tenantId) {
      return { logs: [], total: 0, page: pageNum, pageSize: pageSizeNum };
    }

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
   * Manager/Admin/GLOBAL_ADMIN only
   */
  @Get('audit')
  @UseGuards(RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.GLOBAL_ADMIN)
  async getAllAuditLogs(
    @CurrentUser() user: RequestUser,
    @Query('entity') entity?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    // GLOBAL_ADMIN users don't have tenantId - return empty for now
    if (!user.tenantId) {
      return { logs: [], total: 0, page: pageNum, pageSize: pageSizeNum };
    }

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
   * Admin/GLOBAL_ADMIN only - Returns statistics without applying any changes
   */
  @Get('retention/check')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  async checkRetentionPolicy() {
    return this.retentionService.runManualRetentionCheck();
  }

  /**
   * Run retention policy manually
   * POST /api/approvals/retention/run
   * Admin/GLOBAL_ADMIN only - Actually applies the retention policy (archives old data)
   */
  @Post('retention/run')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  async runRetentionPolicy() {
    return this.retentionService.runRetentionPolicyNow();
  }
}
