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
    breaks: Array<{
      id: string;
      startedAt: Date;
      endedAt: Date | null;
    }>;
    overtimeEntries: Array<{
      id: string;
      hours: number;
      type: string;
      compensationType: string;
      approvedAt: Date | null;
      compensatedAt: Date | null;
    }>;
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
  annualOvertimeSummary: {
    totalOrdinary: number;
    totalForceMajeure: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
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
    const existingReport = await this.prisma.report.findFirst({
      where: {
        tenantId,
        type: dto.type,
        period: dto.period,
        userId: dto.userId ?? null,
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
      dto.type,
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
        userId: dto.userId, // Store employee ID for MONTHLY_EMPLOYEE reports
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
    const where: { tenantId: string; signatures?: { some: { userId: string } } } = { tenantId };

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
    const _report = await this.getReport(reportId, tenantId);

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

    // Use userId from report (for MONTHLY_EMPLOYEE) or first user (for company reports)
    let userId = report.userId;
    
    if (!userId && report.type === ReportType.MONTHLY_EMPLOYEE) {
      throw new BadRequestException('Employee report must have a userId');
    }

    // For company/compliance reports without userId, use first user as fallback
    if (!userId) {
      const firstUser = await this.prisma.user.findFirst({
        where: { tenantId },
        select: { id: true },
      });
      if (!firstUser) {
        throw new NotFoundException('No users found in tenant');
      }
      userId = firstUser.id;
    }

    // Get signature if exists
    const signature = await this.prisma.signature.findFirst({
      where: { reportId },
      include: { user: true },
    });

    // Extract period from report
    const period = report.period;

    // Gather report data
    const reportData = await this.gatherReportData(tenantId, userId, period, report.type);

    // Generate PDF with signature if exists
    const pdfBuffer = await this.generatePDF(reportData, signature);

    return pdfBuffer;
  }

  /**
   * Generate CSV export for a report
   */
  async generateReportCSV(reportId: string, tenantId: string): Promise<Buffer> {
    const report = await this.getReport(reportId, tenantId);

    // Use userId from report
    let userId = report.userId;
    
    if (!userId) {
      const firstUser = await this.prisma.user.findFirst({
        where: { tenantId },
        select: { id: true },
      });
      if (!firstUser) {
        throw new NotFoundException('No users found in tenant');
      }
      userId = firstUser.id;
    }

    const reportData = await this.gatherReportData(
      tenantId,
      userId,
      report.period,
      report.type,
    );

    return new Promise((resolve, reject) => {
      const rows: string[][] = [];

      // Header
      rows.push([
        'Date',
        'Clock In',
        'Clock Out',
        'Break (min)',
        'Break Count',
        'Total Hours',
        'Overtime Hours',
        'Overtime Type',
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

        // Calculate break count and total minutes
        const breakCount = entry.breaks ? entry.breaks.length : 0;
        const actualBreakMinutes = entry.breaks
          ? entry.breaks.reduce((sum, brk) => {
              if (brk.endedAt) {
                const minutes =
                  (new Date(brk.endedAt).getTime() -
                    new Date(brk.startedAt).getTime()) /
                  (1000 * 60);
                return sum + minutes;
              }
              return sum;
            }, 0)
          : 0;

        // Calculate overtime hours and type
        const overtimeHours =
          entry.overtimeEntries && entry.overtimeEntries.length > 0
            ? entry.overtimeEntries.reduce((sum, ot) => sum + ot.hours, 0)
            : 0;
        const overtimeType =
          entry.overtimeEntries && entry.overtimeEntries.length > 0
            ? entry.overtimeEntries.map((ot) => ot.type).join(', ')
            : '';

        rows.push([
          clockInDate.toISOString().split('T')[0],
          clockInDate.toTimeString().split(' ')[0],
          clockOutDate ? clockOutDate.toTimeString().split(' ')[0] : '',
          Math.round(actualBreakMinutes).toString(),
          breakCount.toString(),
          totalHours.toFixed(2),
          overtimeHours.toFixed(1),
          overtimeType,
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
    
    // Sheet 1: Time Entries
    const worksheet = workbook.addWorksheet('Time Entries');
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

    // Sheet 2: Breaks
    const breaksSheet = workbook.addWorksheet('Breaks');
    breaksSheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Break Start', key: 'startTime', width: 12 },
      { header: 'Break End', key: 'endTime', width: 12 },
      { header: 'Duration (min)', key: 'duration', width: 14 },
      { header: 'Location', key: 'location', width: 20 },
    ];

    reportData.timeEntries.forEach((entry) => {
      if (entry.breaks && entry.breaks.length > 0) {
        entry.breaks.forEach((brk) => {
          const startTime = new Date(brk.startedAt);
          const endTime = brk.endedAt ? new Date(brk.endedAt) : null;
          const duration = endTime
            ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
            : null;

          breaksSheet.addRow({
            date: new Date(entry.clockIn).toISOString().split('T')[0],
            startTime: startTime.toTimeString().split(' ')[0],
            endTime: endTime ? endTime.toTimeString().split(' ')[0] : 'Ongoing',
            duration: duration !== null ? duration : 'N/A',
            location: entry.location?.name || '',
          });
        });
      }
    });

    // Sheet 3: Overtime
    const overtimeSheet = workbook.addWorksheet('Overtime');
    overtimeSheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Hours', key: 'hours', width: 10 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Compensation', key: 'compensation', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Approved At', key: 'approvedAt', width: 18 },
      { header: 'Compensated At', key: 'compensatedAt', width: 18 },
    ];

    reportData.timeEntries.forEach((entry) => {
      if (entry.overtimeEntries && entry.overtimeEntries.length > 0) {
        entry.overtimeEntries.forEach((ot) => {
          overtimeSheet.addRow({
            date: new Date(entry.clockIn).toISOString().split('T')[0],
            hours: ot.hours.toFixed(1),
            type: ot.type,
            compensation: ot.compensationType,
            status: ot.approvedAt ? 'Approved' : 'Pending',
            approvedAt: ot.approvedAt
              ? new Date(ot.approvedAt).toISOString().split('T')[0]
              : '',
            compensatedAt: ot.compensatedAt
              ? new Date(ot.compensatedAt).toISOString().split('T')[0]
              : '',
          });
        });
      }
    });

    // Sheet 4: Compliance Summary
    const complianceSheet = workbook.addWorksheet('Compliance Summary');
    complianceSheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    const currentYear = new Date(reportData.period).getFullYear();
    complianceSheet.addRow({
      metric: 'Report Period',
      value: reportData.period,
    });
    complianceSheet.addRow({
      metric: 'Employee',
      value: `${reportData.employee.firstName} ${reportData.employee.lastName}`,
    });
    complianceSheet.addRow({
      metric: 'Employee Code',
      value: reportData.employee.employeeCode || 'N/A',
    });
    complianceSheet.addRow({ metric: '', value: '' }); // Empty row
    complianceSheet.addRow({
      metric: `Annual Overtime Limit (${currentYear})`,
      value: `${reportData.annualOvertimeSummary.limit} hours`,
    });
    complianceSheet.addRow({
      metric: 'Ordinary Overtime Used',
      value: `${reportData.annualOvertimeSummary.totalOrdinary.toFixed(1)} hours`,
    });
    complianceSheet.addRow({
      metric: 'Force Majeure Overtime (exempt)',
      value: `${reportData.annualOvertimeSummary.totalForceMajeure.toFixed(1)} hours`,
    });
    complianceSheet.addRow({
      metric: 'Remaining Ordinary Overtime',
      value: `${reportData.annualOvertimeSummary.remaining.toFixed(1)} hours`,
    });
    complianceSheet.addRow({
      metric: 'Percentage Used',
      value: `${reportData.annualOvertimeSummary.percentage.toFixed(0)}%`,
    });
    complianceSheet.addRow({ metric: '', value: '' }); // Empty row
    
    // Add warning if applicable
    if (reportData.annualOvertimeSummary.percentage > 75) {
      complianceSheet.addRow({
        metric: 'WARNING',
        value: 'Exceeding recommended overtime limit',
      });
    } else if (reportData.annualOvertimeSummary.percentage > 60) {
      complianceSheet.addRow({
        metric: 'CAUTION',
        value: 'Approaching annual overtime limit',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Gather data for report generation
   */
  private async gatherReportData(
    tenantId: string,
    userId: string | undefined,
    period: string,
    reportType?: ReportType,
  ): Promise<ReportData> {
    // For employee reports, userId is required
    if (reportType === ReportType.MONTHLY_EMPLOYEE && !userId) {
      throw new BadRequestException('userId is required for employee reports');
    }

    // For company/compliance reports, use first available user as fallback for data structure
    // TODO: In future, aggregate data from all users for company reports
    if (!userId && reportType && (reportType === ReportType.MONTHLY_COMPANY || reportType === ReportType.COMPLIANCE_EXPORT)) {
      // Get first user in tenant for data structure compatibility
      const firstUser = await this.prisma.user.findFirst({
        where: { tenantId },
        select: { id: true },
      });
      if (!firstUser) {
        throw new BadRequestException('No users found in tenant');
      }
      userId = firstUser.id;
    }

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
        breaks: {
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
          },
          orderBy: {
            startedAt: 'asc',
          },
        },
        overtimeEntries: {
          select: {
            id: true,
            hours: true,
            type: true,
            compensationType: true,
            approvedAt: true,
            compensatedAt: true,
          },
          orderBy: {
            createdAt: 'asc',
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

    // Calculate annual overtime balance (for compliance summary)
    const yearStartDate = new Date(year, 0, 1);
    const yearEndDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const ordinaryOvertimeTotal = await this.prisma.overtimeEntry.aggregate({
      where: {
        userId,
        tenantId,
        type: 'ORDINARY',
        createdAt: {
          gte: yearStartDate,
          lte: yearEndDate,
        },
      },
      _sum: {
        hours: true,
      },
    });

    const forceMajeureOvertimeTotal = await this.prisma.overtimeEntry.aggregate({
      where: {
        userId,
        tenantId,
        type: 'FORCE_MAJEURE',
        createdAt: {
          gte: yearStartDate,
          lte: yearEndDate,
        },
      },
      _sum: {
        hours: true,
      },
    });

    const totalOrdinary = ordinaryOvertimeTotal._sum.hours || 0;
    const totalForceMajeure = forceMajeureOvertimeTotal._sum.hours || 0;
    const annualLimit = 80; // Spanish labor law: 80h annual overtime limit
    const remaining = Math.max(0, annualLimit - totalOrdinary);
    const percentage = Math.min(100, (totalOrdinary / annualLimit) * 100);

    return {
      tenant,
      employee,
      period,
      timeEntries,
      auditLogs,
      totalHours,
      scheduledHours,
      annualOvertimeSummary: {
        totalOrdinary,
        totalForceMajeure,
        limit: annualLimit,
        remaining,
        percentage,
      },
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

        // Breaks section
        const entriesWithBreaks = data.timeEntries.filter(
          (entry) => entry.breaks && entry.breaks.length > 0,
        );
        if (entriesWithBreaks.length > 0) {
          doc.fontSize(14).text('Breaks Taken', { underline: true });
          doc.fontSize(10);
          entriesWithBreaks.forEach((entry) => {
            const clockInDate = new Date(entry.clockIn);
            doc.text(`Date: ${clockInDate.toISOString().split('T')[0]}`);
            let totalBreakMinutes = 0;
            entry.breaks.forEach((brk) => {
              const startTime = new Date(brk.startedAt);
              const endTime = brk.endedAt ? new Date(brk.endedAt) : null;
              if (endTime) {
                const breakMinutes = Math.round(
                  (endTime.getTime() - startTime.getTime()) / (1000 * 60),
                );
                totalBreakMinutes += breakMinutes;
                doc.text(
                  `  • ${startTime.toTimeString().split(' ')[0]} - ${endTime.toTimeString().split(' ')[0]} (${breakMinutes} minutes)`,
                );
              } else {
                doc.text(
                  `  • ${startTime.toTimeString().split(' ')[0]} - Ongoing`,
                );
              }
            });
            if (totalBreakMinutes > 0) {
              doc.text(`  Total: ${totalBreakMinutes} minutes`);
            }
          });
          doc.moveDown();
        }

        // Overtime section
        const allOvertimeEntries = data.timeEntries.flatMap((entry) =>
          entry.overtimeEntries.map((ot) => ({
            ...ot,
            date: new Date(entry.clockIn),
          })),
        );
        if (allOvertimeEntries.length > 0) {
          doc.fontSize(14).text('Overtime Hours', { underline: true });
          doc.fontSize(10);
          doc.text(
            'Date       | Hours | Type        | Status    | Compensation',
          );
          doc.text('-'.repeat(60));
          let totalOvertimeHours = 0;
          allOvertimeEntries.forEach((ot) => {
            totalOvertimeHours += ot.hours;
            const status = ot.approvedAt ? 'Approved' : 'Pending';
            const compensation = ot.compensatedAt
              ? 'Compensated'
              : ot.compensationType === 'TIME_OFF'
                ? 'Time Off'
                : 'Pay';
            doc.text(
              `${ot.date.toISOString().split('T')[0]} | ${ot.hours.toFixed(1)}h | ${ot.type.padEnd(11)} | ${status.padEnd(9)} | ${compensation}`,
            );
          });
          doc.moveDown();
          doc.text(`Total Overtime This Month: ${totalOvertimeHours.toFixed(1)} hours`);
          doc.moveDown();
        }

        // Annual Compliance Summary
        const currentYear = new Date(data.period).getFullYear();
        doc.fontSize(14).text(`Annual Compliance Summary (${currentYear})`, { underline: true });
        doc.fontSize(10);
        doc.text(`Annual Overtime Limit: ${data.annualOvertimeSummary.limit} hours`);
        doc.text(
          `Overtime Used: ${data.annualOvertimeSummary.totalOrdinary.toFixed(1)} hours (${data.annualOvertimeSummary.percentage.toFixed(0)}%)`,
        );
        doc.text(`Remaining: ${data.annualOvertimeSummary.remaining.toFixed(1)} hours`);
        if (data.annualOvertimeSummary.totalForceMajeure > 0) {
          doc.text(
            `Force Majeure Overtime (exempt): ${data.annualOvertimeSummary.totalForceMajeure.toFixed(1)} hours`,
          );
        }
        doc.moveDown();
        
        // Compliance warnings
        if (data.annualOvertimeSummary.percentage > 75) {
          doc.fontSize(11)
            .fillColor('red')
            .text('⚠️ WARNING: Exceeding recommended overtime limit');
          doc.fillColor('black');
        } else if (data.annualOvertimeSummary.percentage > 60) {
          doc.fontSize(11)
            .fillColor('orange')
            .text('⚠️ Approaching annual overtime limit');
          doc.fillColor('black');
        }
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
