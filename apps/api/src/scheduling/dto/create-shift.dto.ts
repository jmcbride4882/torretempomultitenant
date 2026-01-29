import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Matches,
} from 'class-validator';

export class CreateShiftDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsString()
  name: string;

  /**
   * Start time in HH:mm format (e.g., "09:00")
   */
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format (e.g., 09:00)',
  })
  startTime: string;

  /**
   * End time in HH:mm format (e.g., "17:00")
   */
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format (e.g., 17:00)',
  })
  endTime: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  breakMins?: number;
}
