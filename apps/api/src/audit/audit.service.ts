import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  tenantId: string;
  action: string;
  entity: string;
  entityId?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry
   * This is an immutable record - no update or delete methods
   */
  async createLog(data: AuditLogData) {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          actorId: data.actorId,
          actorEmail: data.actorEmail,
          actorRole: data.actorRole,
          changes: data.changes,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      this.logger.log(
        `Audit log created: ${data.action} on ${data.entity} by ${data.actorEmail || 'system'}`,
      );

      return auditLog;
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Don't throw - audit logging should not break the main operation
      return null;
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getLogsForEntity(
    tenantId: string,
    entity: string,
    entityId: string,
    page: number = 1,
    pageSize: number = 50,
  ) {
    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          entity,
          entityId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({
        where: {
          tenantId,
          entity,
          entityId,
        },
      }),
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get all audit logs for a tenant (manager/admin only)
   */
  async getAllLogs(
    tenantId: string,
    page: number = 1,
    pageSize: number = 50,
    entity?: string,
  ) {
    const skip = (page - 1) * pageSize;

    const where = {
      tenantId,
      ...(entity && { entity }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({
        where,
      }),
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Helper method to create audit log for time entry creation
   */
  async logTimeEntryCreation(
    tenantId: string,
    entryId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    entryData: Record<string, unknown>,
  ) {
    return this.createLog({
      tenantId,
      action: 'TIME_ENTRY_CREATED',
      entity: 'TimeEntry',
      entityId: entryId,
      actorId: userId,
      actorEmail: userEmail,
      actorRole: userRole,
      changes: {
        after: entryData,
      },
    });
  }

  /**
   * Helper method to create audit log for time entry update
   */
  async logTimeEntryUpdate(
    tenantId: string,
    entryId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    beforeData: Record<string, unknown>,
    afterData: Record<string, unknown>,
  ) {
    return this.createLog({
      tenantId,
      action: 'TIME_ENTRY_UPDATED',
      entity: 'TimeEntry',
      entityId: entryId,
      actorId: userId,
      actorEmail: userEmail,
      actorRole: userRole,
      changes: {
        before: beforeData,
        after: afterData,
      },
    });
  }

  /**
   * Helper method to create audit log for edit request
   */
  async logEditRequest(
    tenantId: string,
    requestId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    action: 'CREATED' | 'APPROVED' | 'REJECTED',
    requestData: Record<string, unknown>,
  ) {
    return this.createLog({
      tenantId,
      action: `EDIT_REQUEST_${action}`,
      entity: 'EditRequest',
      entityId: requestId,
      actorId: userId,
      actorEmail: userEmail,
      actorRole: userRole,
      changes: requestData,
    });
  }
}
