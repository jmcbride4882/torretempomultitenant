import { IsUUID, IsNumber, IsEnum, Min } from 'class-validator';
import { OvertimeType } from '@prisma/client';

export class CreateOvertimeDto {
  @IsUUID()
  timeEntryId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  tenantId: string;

  @IsNumber()
  @Min(0)
  hours: number;

  @IsEnum(OvertimeType)
  type: OvertimeType;
}
