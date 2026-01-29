import { IsString, IsLatitude, IsLongitude } from 'class-validator';

export class ValidateGeofenceDto {
  @IsString()
  locationId: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}
