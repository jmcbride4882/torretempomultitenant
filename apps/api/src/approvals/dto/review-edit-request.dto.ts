import { IsString, IsOptional } from 'class-validator';

export class ReviewEditRequestDto {
  @IsOptional()
  @IsString()
  approvalNote?: string;
}
