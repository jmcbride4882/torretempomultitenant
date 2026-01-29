import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Audit Log Retention Service
 * Implements Spanish labor law compliance (5-year retention for audit logs)
 * 
 * Runs daily at 3 AM to archive old audit logs
 * Does NOT delete logs, only marks them as archived for performance optimization
 */
@Injectable()
export class RetentionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Enforce 5-year audit log retention policy
   * Runs daily at 3:00 AM
   * 
   * Spanish labor law requires 5-year retention of time tracking records.
   * This job archives old records (soft delete time entries, count audit logs)
   * to optimize query performance while maintaining compliance.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async enforceRetentionPolicy(): Promise<void> {
    this.logger.log('Starting data retention policy enforcement', 'RetentionService');

    try {
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      // 1. Audit Logs - Count only (never delete for compliance)
      const oldLogsCount = await this.prisma.auditLog.count({
        where: {
          createdAt: { lt: fiveYearsAgo },
        },
      });

      this.logger.log(
        `Audit logs older than 5 years: ${oldLogsCount}`,
        'RetentionService',
      );

      // 2. Time Entries - Soft delete (set status to DELETED)
      const archivedEntriesResult = await this.prisma.timeEntry.updateMany({
        where: {
          createdAt: { lt: fiveYearsAgo },
          status: { not: 'DELETED' },
        },
        data: {
          status: 'DELETED',
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Time entries archived (soft deleted): ${archivedEntriesResult.count}`,
        'RetentionService',
      );

      // 3. Edit Requests - Count old requests (keep for audit trail)
      const oldEditRequests = await this.prisma.editRequest.count({
        where: {
          createdAt: { lt: fiveYearsAgo },
        },
      });

      this.logger.log(
        `Edit requests older than 5 years: ${oldEditRequests}`,
        'RetentionService',
      );

      // 4. Reports - Keep forever (legal requirement for signatures)
      const oldReports = await this.prisma.report.count({
        where: {
          generatedAt: { lt: fiveYearsAgo },
        },
      });

      this.logger.log(
        `Reports older than 5 years (kept for legal compliance): ${oldReports}`,
        'RetentionService',
      );

      this.logger.log(
        `Retention policy enforcement complete. Cutoff date: ${fiveYearsAgo.toISOString()}`,
        'RetentionService',
      );

    } catch (error) {
      this.logger.error(
        'Error during retention policy enforcement',
        error,
        'RetentionService',
      );
      throw error;
    }
  }

  /**
   * Optional: Archive old audit logs to cold storage
   * This is a placeholder for future implementation when S3/cold storage is configured
   * 
   * Implementation steps:
   * 1. Export old logs to JSON/CSV files
   * 2. Upload to S3-compatible storage (Wasabi, Backblaze B2, etc.)
   * 3. Optionally delete from main table after successful export
   * 4. Keep manifest file with archive locations for retrieval
   */
  private async archiveOldLogs(cutoffDate: Date): Promise<void> {
    // TODO: Implement when cold storage is configured
    // Example implementation:
    //
    // const oldLogs = await this.prisma.auditLog.findMany({
    //   where: { createdAt: { lt: cutoffDate } },
    //   take: 10000, // Process in batches
    // });
    //
    // const exportPath = `/tmp/audit_logs_${Date.now()}.json`;
    // await fs.writeFile(exportPath, JSON.stringify(oldLogs, null, 2));
    //
    // await s3Client.upload({
    //   Bucket: 'torre-tempo-archives',
    //   Key: `audit_logs/${cutoffDate.getFullYear()}/audit_logs_${Date.now()}.json.gz`,
    //   Body: fs.createReadStream(exportPath).pipe(zlib.createGzip()),
    // });
    //
    // await this.prisma.auditLog.deleteMany({
    //   where: { id: { in: oldLogs.map(l => l.id) } },
    // });
    
    this.logger.log(
      `Archive function called for logs older than ${cutoffDate.toISOString()}`,
      'RetentionService',
    );
  }

  /**
   * Manual trigger for retention policy (for testing/admin use)
   * Returns statistics without applying any changes (dry-run mode)
   */
  async runManualRetentionCheck(): Promise<{
    cutoffDate: string;
    oldLogsCount: number;
    archivedEntriesCount: number;
    oldEditRequests: number;
    oldReports: number;
  }> {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const [oldLogsCount, archivedEntriesCount, oldEditRequests, oldReports] = 
      await Promise.all([
        // Audit logs older than 5 years
        this.prisma.auditLog.count({
          where: { createdAt: { lt: fiveYearsAgo } },
        }),
        
        // Time entries that would be archived
        this.prisma.timeEntry.count({
          where: {
            createdAt: { lt: fiveYearsAgo },
            status: { not: 'DELETED' },
          },
        }),
        
        // Edit requests older than 5 years
        this.prisma.editRequest.count({
          where: { createdAt: { lt: fiveYearsAgo } },
        }),
        
        // Reports older than 5 years
        this.prisma.report.count({
          where: { generatedAt: { lt: fiveYearsAgo } },
        }),
      ]);

    return {
      cutoffDate: fiveYearsAgo.toISOString(),
      oldLogsCount,
      archivedEntriesCount,
      oldEditRequests,
      oldReports,
    };
  }

  /**
   * Force run retention policy manually (for admin use)
   * Actually applies the retention policy (not a dry-run)
   */
  async runRetentionPolicyNow(): Promise<{
    cutoffDate: string;
    archivedEntriesCount: number;
    success: boolean;
  }> {
    this.logger.log('Manual retention policy execution requested', 'RetentionService');

    try {
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const archivedEntriesResult = await this.prisma.timeEntry.updateMany({
        where: {
          createdAt: { lt: fiveYearsAgo },
          status: { not: 'DELETED' },
        },
        data: {
          status: 'DELETED',
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Manual retention: Archived ${archivedEntriesResult.count} time entries`,
        'RetentionService',
      );

      return {
        cutoffDate: fiveYearsAgo.toISOString(),
        archivedEntriesCount: archivedEntriesResult.count,
        success: true,
      };
    } catch (error) {
      this.logger.error('Manual retention policy failed', error, 'RetentionService');
      throw error;
    }
  }
}
