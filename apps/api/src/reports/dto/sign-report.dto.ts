import { IsString, IsNotEmpty } from 'class-validator';

export class SignReportDto {
  @IsString()
  @IsNotEmpty()
  imageBase64: string; // Base64 PNG signature image
}
