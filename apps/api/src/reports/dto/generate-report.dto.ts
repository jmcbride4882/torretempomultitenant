import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ReportType } from '@prisma/client';

export class GenerateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsString()
  period: string; // e.g., "2026-01" for monthly reports

  @IsOptional()
  @IsString()
  userId?: string; // For MONTHLY_EMPLOYEE reports, specify the employee
}
