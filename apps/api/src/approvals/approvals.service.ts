import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEditRequestDto } from './dto/create-edit-request.dto';
import { ReviewEditRequestDto } from './dto/review-edit-request.dto';
import { ApprovalStatus, Role, EntryStatus } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new edit request
   * Employee requests an edit to a time entry
   */
  async createEditRequest(
    userId: string,
    tenantId: string,
    userEmail: string,
    userRole: string,
    dto: CreateEditRequestDto,
  ) {
    // Verify time entry exists and belongs to user's tenant
    const timeEntry = await this.prisma.timeEntry.findFirst({
      where: {
        id: dto.timeEntryId,
        tenantId,
      },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    // Employees can only edit their own entries
    if (timeEntry.userId !== userId && userRole === Role.EMPLOYEE) {
      throw new ForbiddenException(
        'You can only request edits to your own time entries',
      );
    }

    // Get the current value from the time entry
    const oldValue = this.getFieldValue(timeEntry, dto.fieldName);

    if (oldValue === undefined) {
      throw new BadRequestException(`Invalid field name: ${dto.fieldName}`);
    }

    // Create edit request
    const editRequest = await this.prisma.editRequest.create({
      data: {
        timeEntryId: dto.timeEntryId,
        requestedById: userId,
        fieldName: dto.fieldName,
        oldValue: String(oldValue),
        newValue: dto.newValue,
        reason: dto.reason,
        status: ApprovalStatus.PENDING,
      },
      include: {
        timeEntry: {
          select: {
            id: true,
            clockIn: true,
            clockOut: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log to audit
    await this.auditService.logEditRequest(
      tenantId,
      editRequest.id,
      userId,
      userEmail,
      userRole,
      'CREATED',
      {
        timeEntryId: dto.timeEntryId,
        fieldName: dto.fieldName,
        oldValue: String(oldValue),
        newValue: dto.newValue,
        reason: dto.reason,
      },
    );

    this.logger.log(
      `Edit request created: ${editRequest.id} by ${userEmail} for entry ${dto.timeEntryId}`,
    );

    return editRequest;
  }

  /**
   * Get edit requests with filtering
   * Employees see only their own requests
   * Managers/Admins see all requests in their tenant
   */
  async getEditRequests(
    userId: string,
    tenantId: string,
    userRole: string,
    status?: ApprovalStatus,
    page: number = 1,
    pageSize: number = 50,
  ) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.EditRequestWhereInput = {
      timeEntry: {
        tenantId,
      },
    };

    // Employees only see their own requests
    if (userRole === Role.EMPLOYEE) {
      where.requestedById = userId;
    }

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      this.prisma.editRequest.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
        include: {
          timeEntry: {
            select: {
              id: true,
              clockIn: true,
              clockOut: true,
              location: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          requestedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.editRequest.count({
        where,
      }),
    ]);

    return {
      requests,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get a single edit request
   * For GLOBAL_ADMIN (tenantId=null), allows cross-tenant lookup
   */
  async getEditRequest(
    requestId: string,
    userId: string,
    tenantId: string | null,
    userRole: string,
  ) {
    const editRequest = await this.prisma.editRequest.findFirst({
      where: {
        id: requestId,
        ...(tenantId !== null && {
          timeEntry: {
            tenantId,
          },
        }),
      },
      include: {
        timeEntry: {
          select: {
            id: true,
            clockIn: true,
            clockOut: true,
            breakMinutes: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!editRequest) {
      throw new NotFoundException('Edit request not found');
    }

    // Employees can only see their own requests
    if (
      editRequest.requestedById !== userId &&
      userRole === Role.EMPLOYEE
    ) {
      throw new ForbiddenException('You can only view your own edit requests');
    }

    return editRequest;
  }

  /**
   * Approve an edit request
   * Manager/Admin applies the requested change to the time entry
   */
  async approveEditRequest(
    requestId: string,
    managerId: string,
    tenantId: string,
    managerEmail: string,
    managerRole: string,
    dto: ReviewEditRequestDto,
  ) {
    // Get edit request
    const editRequest = await this.prisma.editRequest.findFirst({
      where: {
        id: requestId,
        timeEntry: {
          tenantId,
        },
      },
      include: {
        timeEntry: true,
      },
    });

    if (!editRequest) {
      throw new NotFoundException('Edit request not found');
    }

    if (editRequest.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        `Edit request is already ${editRequest.status.toLowerCase()}`,
      );
    }

    // Store before state
    const beforeData = {
      [editRequest.fieldName]: this.getFieldValue(
        editRequest.timeEntry,
        editRequest.fieldName,
      ),
    };

    // Apply the change to the time entry
    const updateData = this.buildUpdateData(
      editRequest.fieldName,
      editRequest.newValue,
    );

    // Update time entry with new value and mark as edited
    const updatedEntry = await this.prisma.timeEntry.update({
      where: { id: editRequest.timeEntry.id },
      data: {
        ...updateData,
        status: EntryStatus.EDITED,
      },
    });

    // Store after state
    const afterData = {
      [editRequest.fieldName]: this.getFieldValue(
        updatedEntry,
        editRequest.fieldName,
      ),
    };

    // Update edit request status
    const approvedRequest = await this.prisma.editRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedById: managerId,
        approvedAt: new Date(),
        approvalNote: dto.approvalNote,
      },
      include: {
        timeEntry: {
          select: {
            id: true,
            clockIn: true,
            clockOut: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log to audit - edit request approval
    await this.auditService.logEditRequest(
      tenantId,
      requestId,
      managerId,
      managerEmail,
      managerRole,
      'APPROVED',
      {
        timeEntryId: editRequest.timeEntry.id,
        fieldName: editRequest.fieldName,
        reason: editRequest.reason,
        approvalNote: dto.approvalNote,
      },
    );

    // Log to audit - time entry update
    await this.auditService.logTimeEntryUpdate(
      tenantId,
      editRequest.timeEntry.id,
      managerId,
      managerEmail,
      managerRole,
      beforeData,
      afterData,
    );

    this.logger.log(
      `Edit request approved: ${requestId} by ${managerEmail} for entry ${editRequest.timeEntry.id}`,
    );

    return approvedRequest;
  }

  /**
   * Reject an edit request
   * Manager/Admin rejects the request without changing the time entry
   */
  async rejectEditRequest(
    requestId: string,
    managerId: string,
    tenantId: string,
    managerEmail: string,
    managerRole: string,
    dto: ReviewEditRequestDto,
  ) {
    // Get edit request
    const editRequest = await this.prisma.editRequest.findFirst({
      where: {
        id: requestId,
        timeEntry: {
          tenantId,
        },
      },
    });

    if (!editRequest) {
      throw new NotFoundException('Edit request not found');
    }

    if (editRequest.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        `Edit request is already ${editRequest.status.toLowerCase()}`,
      );
    }

    // Update edit request status
    const rejectedRequest = await this.prisma.editRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.REJECTED,
        approvedById: managerId,
        approvedAt: new Date(),
        approvalNote: dto.approvalNote,
      },
      include: {
        timeEntry: {
          select: {
            id: true,
            clockIn: true,
            clockOut: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log to audit
    await this.auditService.logEditRequest(
      tenantId,
      requestId,
      managerId,
      managerEmail,
      managerRole,
      'REJECTED',
      {
        timeEntryId: editRequest.timeEntryId,
        fieldName: editRequest.fieldName,
        reason: editRequest.reason,
        approvalNote: dto.approvalNote,
      },
    );

    this.logger.log(
      `Edit request rejected: ${requestId} by ${managerEmail} for entry ${editRequest.timeEntryId}`,
    );

    return rejectedRequest;
  }

  /**
   * Helper: Get field value from time entry
   */
  private getFieldValue(timeEntry: { clockIn: Date; clockOut: Date | null; breakMinutes: number | null; locationId: string | null }, fieldName: string): Date | number | string | null | undefined {
    switch (fieldName) {
      case 'clockIn':
        return timeEntry.clockIn;
      case 'clockOut':
        return timeEntry.clockOut;
      case 'breakMinutes':
        return timeEntry.breakMinutes;
      case 'locationId':
        return timeEntry.locationId;
      default:
        return undefined;
    }
  }

  /**
   * Helper: Build update data for time entry
   */
  private buildUpdateData(fieldName: string, newValue: string): { clockIn?: Date; clockOut?: Date; breakMinutes?: number; locationId?: string } {
    switch (fieldName) {
      case 'clockIn':
        return { clockIn: new Date(newValue) };
      case 'clockOut':
        return { clockOut: new Date(newValue) };
      case 'breakMinutes':
        return { breakMinutes: parseInt(newValue, 10) };
      case 'locationId':
        return { locationId: newValue };
      default:
        throw new BadRequestException(`Cannot update field: ${fieldName}`);
    }
  }
}
