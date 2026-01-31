import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  shiftId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  /**
   * Date in ISO 8601 format (YYYY-MM-DD)
   */
  @IsDateString()
  date: string;
}
