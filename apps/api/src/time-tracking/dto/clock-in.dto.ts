import { IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';

export class ClockInDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  qrTokenId?: string;

  @IsOptional()
  @IsString()
  offlineId?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
