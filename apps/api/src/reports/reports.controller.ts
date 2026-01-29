import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { SignReportDto } from './dto/sign-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Response } from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Generate monthly report (MANAGER/ADMIN only)
   */
  @Post('generate')
  @Roles(Role.MANAGER, Role.ADMIN)
  async generateReport(
    @CurrentUser() user: any,
    @Body() dto: GenerateReportDto,
  ) {
    const report = await this.reportsService.generateReport(
      user.tenantId,
      user.userId,
      dto,
    );
    return report;
  }

  /**
   * Get all reports (filtered by role)
   */
  @Get()
  async getReports(@CurrentUser() user: any) {
    const reports = await this.reportsService.getReports(
      user.tenantId,
      user.userId,
      user.role,
    );
    return reports;
  }

  /**
   * Get single report
   */
  @Get(':id')
  async getReport(@CurrentUser() user: any, @Param('id') id: string) {
    const report = await this.reportsService.getReport(id, user.tenantId);
    return report;
  }

  /**
   * Get my reports (employee view)
   */
  @Get('my/reports')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.ADMIN)
  async getMyReports(@CurrentUser() user: any) {
    const reports = await this.reportsService.getMyReports(
      user.tenantId,
      user.userId,
    );
    return reports;
  }

  /**
   * Download PDF report
   */
  @Get(':id/pdf')
  async downloadPDF(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportsService.generateReportPDF(
      id,
      user.tenantId,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${id}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  /**
   * Download CSV export
   */
  @Get(':id/csv')
  async downloadCSV(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const csvBuffer = await this.reportsService.generateReportCSV(
      id,
      user.tenantId,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${id}.csv"`,
    );
    res.send(csvBuffer);
  }

  /**
   * Download XLSX export
   */
  @Get(':id/xlsx')
  async downloadXLSX(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const xlsxBuffer = await this.reportsService.generateReportXLSX(
      id,
      user.tenantId,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${id}.xlsx"`,
    );
    res.send(xlsxBuffer);
  }

  /**
   * Sign report (employee acknowledges)
   */
  @Post(':id/sign')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.ADMIN)
  async signReport(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SignReportDto,
    @Req() req: any,
  ) {
    const signature = await this.reportsService.signReport(
      id,
      user.tenantId,
      user.userId,
      user.email,
      user.role,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
    return signature;
  }
}
