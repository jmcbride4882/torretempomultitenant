import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ComplianceCheckDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  tenantId: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  weekStart?: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number;
}
