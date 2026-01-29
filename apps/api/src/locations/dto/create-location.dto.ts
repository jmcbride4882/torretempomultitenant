import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsLatitude,
  IsLongitude,
  Min,
} from 'class-validator';

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  radiusMeters?: number;

  @IsOptional()
  @IsBoolean()
  qrEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
