import { IsString, IsOptional, IsIn } from 'class-validator';
import { SUPPORTED_LOCALES } from '@torre-tempo/shared';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LOCALES, { message: 'Invalid locale' })
  locale?: string;
}
