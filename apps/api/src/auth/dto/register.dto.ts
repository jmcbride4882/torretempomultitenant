import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class RegisterUserDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsString()
  @MinLength(1, { message: 'First name is required' })
  firstName!: string;

  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  lastName!: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;
}

export class RegisterTenantDto {
  @IsString()
  @MinLength(2, { message: 'Company name must be at least 2 characters' })
  companyName!: string;

  @IsEmail({}, { message: 'Invalid email address' })
  adminEmail!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  adminPassword!: string;

  @IsString()
  @MinLength(1, { message: 'First name is required' })
  adminFirstName!: string;

  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  adminLastName!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
