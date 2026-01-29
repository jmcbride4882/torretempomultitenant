import { IsString } from 'class-validator';

export class ValidateQRDto {
  @IsString()
  token: string;
}
