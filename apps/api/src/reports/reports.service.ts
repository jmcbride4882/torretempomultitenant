import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { SignReportDto } from './dto/sign-report.dto';
import { ReportType } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { Workbook } from 'exceljs';
import { format } from '@fast-csv/format';
import { createHash } from 'crypto';

interface ReportData {
  tenant: {
    id: string;
    name: string;
    timezone: string;
  };
  employee: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    employeeCode: string | null;
  };
  period: string;
  timeEntries: Array<{
    id: string;
    clockIn: Date;
    clockOut: Date | null;
    breakMinutes: number | null;
    location: { name: string } | null;
    origin: string;
    status: string;
  }>;
  auditLogs: Array<{
    action: string;
    createdAt: Date;
    actorEmail: string | null;
  }>;
  totalHours: number;
  scheduledHours: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate a monthly report for an employee or company
   */
  async generateReport(
    tenantId: string,
    generatedById: string,
    dto: GenerateReportDto,
  ) {
    // Validate period format (YYYY-MM)
    const periodRegex = /^\d{4}-\d{2}$/;
    if (!periodRegex.test(dto.period)) {
      throw new BadRequestException(
        'Invalid period format. Expected YYYY-MM (e.g., 2026-01)',
      );
    }

    // For MONTHLY_EMPLOYEE, userId is required
    if (dto.type === ReportType.MONTHLY_EMPLOYEE && !dto.userId) {
      throw new BadRequestException(
        'userId is required for MONTHLY_EMPLOYEE reports',
      );
    }

    // Check if report already exists
    const existingReport = await this.prisma.report.findUnique({
      where: {
        tenantId_type_period: {
          tenantId,
          type: dto.type,
          period: dto.period,
        },
      },
    });

    if (existingReport) {
      return existingReport;
    }

    // Gather report data
    const reportData = await this.gatherReportData(
      tenantId,
      dto.userId,
      dto.period,
    );

    // Generate PDF and calculate hash
    const pdfBuffer = await this.generatePDF(reportData);
    const fileHash = this.calculateHash(pdfBuffer);

    // Create report record (fileUrl will be set when PDF is uploaded/served)
    const report = await this.prisma.report.create({
      data: {
        tenantId,
        type: dto.type,
        period: dto.period,
        fileHash,
        fileUrl: null, // Will be generated dynamically
      },
    });

    this.logger.log(`Report ${report.id} generated for period ${dto.period}`);

    return report;
  }

  /**
   * Get all reports for a tenant (filtered by role)
   */
  async getReports(tenantId: string, userId: string, userRole: string) {
    const where: any = { tenantId };

    // Employees can only see their own reports
    if (userRole === 'EMPLOYEE') {
      where.signatures = {
        some: {
          userId,
        },
      };
    }

    const reports = await this.prisma.report.findMany({
      where,
      orderBy: {
        generatedAt: 'desc',
      },
      include: {
        signatures: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return reports;
  }

  /**
   * Get single report
   */
  async getReport(reportId: string, tenantId: string) {
    const report = await this.prisma.report.findFirst({
      where: {
        id: reportId,
        tenantId,
      },
      include: {
        signatures: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  /**
   * Get my reports (employee view)
   */
  async getMyReports(tenantId: string, userId: string) {
    const reports = await this.prisma.report.findMany({
      where: {
        tenantId,
        signatures: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
      include: {
        signatures: {
          where: {
            userId,
          },
        },
      },
    });

    return reports;
  }

  /**
   * Sign a report (employee acknowledges report)
   */
  async signReport(
    reportId: string,
    tenantId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    dto: SignReportDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const report = await this.getReport(reportId, tenantId);

    // Check if user already signed
    const existingSignature = await this.prisma.signature.findUnique({
      where: {
        reportId_userId: {
          reportId,
          userId,
        },
      },
    });

    if (existingSignature) {
      throw new BadRequestException('Report already signed by this user');
    }

    // Create signature
    const signature = await this.prisma.signature.create({
      data: {
        reportId,
        userId,
        imageBase64: dto.imageBase64,
        ipAddress,
        userAgent,
      },
    });

    this.logger.log(`Report ${reportId} signed by user ${userId}`);

    // Log to audit
    await this.auditService.createLog({
      tenantId,
      action: 'REPORT_SIGNED',
      entity: 'Report',
      entityId: reportId,
      actorId: userId,
      actorEmail: userEmail,
      actorRole: userRole,
      changes: {
        signatureId: signature.id,
      },
      ipAddress,
      userAgent,
    });

    return signature;
  }

  /**
   * Generate PDF for a report
   */
  async generateReportPDF(reportId: string, tenantId: string): Promise<Buffer> {
    const report = await this.getReport(reportId, tenantId);

    // Extract userId from report metadata or signatures
    const signature = await this.prisma.signature.findFirst({
      where: { reportId },
      include: { user: true },
    });

    if (!signature) {
      throw new NotFoundException('No employee associated with this report');
    }

    const userId = signature.userId;

    // Extract period from report
    const period = report.period;

    // Gather report data
    const reportData = await this.gatherReportData(tenantId, userId, period);

    // Generate PDF with signature if exists
    const pdfBuffer = await this.generatePDF(reportData, signature);

    return pdfBuffer;
  }

  /**
   * Generate CSV export for a report
   */
  async generateReportCSV(reportId: string, tenantId: string): Promise<Buffer> {
    const report = await this.getReport(reportId, tenantId);

    // Get report data
    const signature = await this.prisma.signature.findFirst({
      where: { reportId },
    });

    if (!signature) {
      throw new NotFoundException('No employee associated with this report');
    }

    const reportData = await this.gatherReportData(
      tenantId,
      signature.userId,
      report.period,
    );

    return new Promise((resolve, reject) => {
      const rows: string[][] = [];

      // Header
      rows.push([
        'Date',
        'Clock In',
        'Clock Out',
        'Break (min)',
        'Total Hours',
        'Location',
        'Origin',
        'Status',
      ]);

      // Data rows
      reportData.timeEntries.forEach((entry) => {
        const clockInDate = new Date(entry.clockIn);
        const clockOutDate = entry.clockOut ? new Date(entry.clockOut) : null;
        const totalHours = clockOutDate
          ? (clockOutDate.getTime() - clockInDate.getTime() -
              (entry.breakMinutes || 0) * 60 * 1000) /
            (1000 * 60 * 60)
          : 0;

        rows.push([
          clockInDate.toISOString().split('T')[0],
          clockInDate.toTimeString().split(' ')[0],
          clockOutDate ? clockOutDate.toTimeString().split(' ')[0] : '',
          (entry.breakMinutes || 0).toString(),
          totalHours.toFixed(2),
          entry.location?.name || '',
          entry.origin,
          entry.status,
        ]);
      });

      const csvData: string[] = [];
      const stream = format({ headers: false });
      stream.on('data', (row: string) => csvData.push(row));
      stream.on('end', () => resolve(Buffer.from(csvData.join(''))));
      stream.on('error', reject);
      
      rows.forEach((row) => stream.write(row));
      stream.end();
    });
  }

  /**
   * Generate XLSX export for a report
   */
  async generateReportXLSX(
    reportId: string,
    tenantId: string,
  ): Promise<Buffer> {
    const report = await this.getReport(reportId, tenantId);

    const signature = await this.prisma.signature.findFirst({
      where: { reportId },
    });

    if (!signature) {
      throw new NotFoundException('No employee associated with this report');
    }

    const reportData = await this.gatherReportData(
      tenantId,
      signature.userId,
      report.period,
    );

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Time Entries');

    // Add header
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Clock In', key: 'clockIn', width: 12 },
      { header: 'Clock Out', key: 'clockOut', width: 12 },
      { header: 'Break (min)', key: 'breakMinutes', width: 12 },
      { header: 'Total Hours', key: 'totalHours', width: 12 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Origin', key: 'origin', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    // Add data rows
    reportData.timeEntries.forEach((entry) => {
      const clockInDate = new Date(entry.clockIn);
      const clockOutDate = entry.clockOut ? new Date(entry.clockOut) : null;
      const totalHours = clockOutDate
        ? (clockOutDate.getTime() - clockInDate.getTime() -
            (entry.breakMinutes || 0) * 60 * 1000) /
          (1000 * 60 * 60)
        : 0;

      worksheet.addRow({
        date: clockInDate.toISOString().split('T')[0],
        clockIn: clockInDate.toTimeString().split(' ')[0],
        clockOut: clockOutDate ? clockOutDate.toTimeString().split(' ')[0] : '',
        breakMinutes: entry.breakMinutes || 0,
        totalHours: parseFloat(totalHours.toFixed(2)),
        location: entry.location?.name || '',
        origin: entry.origin,
        status: entry.status,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Gather report data (time entries, audit logs, calculations)
   */
  private async gatherReportData(
    tenantId: string,
    userId: string | undefined,
    period: string,
  ): Promise<ReportData> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    // Parse period
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, timezone: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get employee
    const employee = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get time entries
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        tenantId,
        clockIn: {
          gte: startDate,
          lte: endDate,
        },
        status: 'ACTIVE',
      },
      include: {
        location: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        clockIn: 'asc',
      },
    });

    // Get audit logs for this employee's time entries
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entity: 'TimeEntry',
        actorId: userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        action: true,
        createdAt: true,
        actorEmail: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Calculate total hours worked
    const totalHours = timeEntries.reduce((sum, entry) => {
      if (entry.clockOut) {
        const hours =
          (entry.clockOut.getTime() - entry.clockIn.getTime()) / (1000 * 60 * 60);
        const breakHours = (entry.breakMinutes || 0) / 60;
        return sum + hours - breakHours;
      }
      return sum;
    }, 0);

    // Get scheduled hours for this period
    const schedules = await this.prisma.schedule.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        isPublished: true,
      },
      include: {
        shift: true,
      },
    });

    const scheduledHours = schedules.reduce((sum, schedule) => {
      const [startHour, startMin] = schedule.shift.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.shift.endTime.split(':').map(Number);
      const shiftMinutes =
        endHour * 60 + endMin - (startHour * 60 + startMin) - schedule.shift.breakMins;
      return sum + shiftMinutes / 60;
    }, 0);

    return {
      tenant,
      employee,
      period,
      timeEntries,
      auditLogs,
      totalHours,
      scheduledHours,
    };
  }

  /**
   * Generate PDF document
   */
  private async generatePDF(
    data: ReportData,
    signature?: { imageBase64: string; acknowledgedAt: Date } | null,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text(data.tenant.name, { align: 'center' });
        doc.fontSize(16).text('Monthly Time Report', { align: 'center' });
        doc.moveDown();

        // Employee info
        doc.fontSize(12).text(`Employee: ${data.employee.firstName} ${data.employee.lastName}`);
        doc.text(`Email: ${data.employee.email}`);
        if (data.employee.employeeCode) {
          doc.text(`Employee Code: ${data.employee.employeeCode}`);
        }
        doc.text(`Period: ${data.period}`);
        doc.moveDown();

        // Summary
        doc.fontSize(14).text('Summary', { underline: true });
        doc.fontSize(12).text(`Total Hours Worked: ${data.totalHours.toFixed(2)} hours`);
        doc.text(`Scheduled Hours: ${data.scheduledHours.toFixed(2)} hours`);
        doc.text(
          `Difference: ${(data.totalHours - data.scheduledHours).toFixed(2)} hours`,
        );
        doc.moveDown();

        // Daily breakdown
        doc.fontSize(14).text('Daily Breakdown', { underline: true });
        doc.fontSize(10);
        data.timeEntries.forEach((entry) => {
          const clockIn = new Date(entry.clockIn);
          const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
          const hours = clockOut
            ? ((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) -
                (entry.breakMinutes || 0) / 60).toFixed(2)
            : 'N/A';

          doc.text(
            `${clockIn.toISOString().split('T')[0]} | ${clockIn.toTimeString().split(' ')[0]} - ${clockOut ? clockOut.toTimeString().split(' ')[0] : 'N/A'} | ${hours} hours | ${entry.location?.name || 'N/A'}`,
          );
        });
        doc.moveDown();

        // Audit log summary
        if (data.auditLogs.length > 0) {
          doc.fontSize(14).text('Audit Log Summary', { underline: true });
          doc.fontSize(10);
          doc.text(
            `Total edits/changes: ${data.auditLogs.filter((log) => log.action.includes('UPDATED')).length}`,
          );
          doc.text(
            `Total approvals: ${data.auditLogs.filter((log) => log.action.includes('APPROVED')).length}`,
          );
          doc.moveDown();
        }

        // Signature section
        doc.fontSize(14).text('Employee Acknowledgment', { underline: true });
        doc.fontSize(10);
        if (signature) {
          doc.text('Signed on: ' + new Date(signature.acknowledgedAt).toLocaleString());
          doc.moveDown();
          // Add signature image (base64 PNG)
          try {
            const base64Data = signature.imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            doc.image(imageBuffer, { fit: [200, 100] });
          } catch (err) {
            doc.text('[Signature image error]');
          }
        } else {
          doc.text('Status: Unsigned');
          doc.moveDown();
          doc.text('Signature: _______________________');
          doc.text('Date: _______________________');
        }
        doc.moveDown();

        // Footer with hash
        const reportHash = this.calculateHash(
          Buffer.from(JSON.stringify({ ...data, timestamp: new Date().toISOString() })),
        );
        doc.fontSize(8).text(`Report generated: ${new Date().toISOString()}`, { align: 'center' });
        doc.text(`Audit Hash: ${reportHash}`, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Calculate SHA-256 hash for file integrity
   */
  private calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
