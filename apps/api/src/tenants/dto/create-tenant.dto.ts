import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  Matches,
  IsEmail,
  MinLength,
} from 'class-validator';

const SUPPORTED_LOCALES = ['es', 'en', 'fr', 'de', 'pl', 'nl-BE'];

// IANA timezone validation pattern (simplified)
const TIMEZONE_PATTERN = /^[A-Za-z]+\/[A-Za-z_]+$/;

export class CreateTenantDto {
  @IsString()
  companyName!: string;

  @IsOptional()
  @IsString()
  @Matches(TIMEZONE_PATTERN, {
    message: 'Timezone must be a valid IANA timezone (e.g., Europe/Madrid)',
  })
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LOCALES, {
    message: `Locale must be one of: ${SUPPORTED_LOCALES.join(', ')}`,
  })
  locale?: string;

  @IsOptional()
  @IsString()
  convenioCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  maxWeeklyHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760)
  maxAnnualHours?: number;

  // Admin user details
  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  adminPassword!: string;

  @IsString()
  adminFirstName!: string;

  @IsString()
  adminLastName!: string;
}
