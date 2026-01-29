import { IsUUID, IsOptional, IsString } from 'class-validator';

export class ApproveOvertimeDto {
  @IsUUID()
  overtimeId: string;

  @IsUUID()
  approverId: string;

  @IsOptional()
  @IsString()
  approvalNote?: string;
}
