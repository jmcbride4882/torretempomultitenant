import { PartialType } from '@nestjs/mapped-types';
import { CreateShiftDto } from './create-shift.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateShiftDto extends PartialType(CreateShiftDto) {
  /**
   * Set to false to soft delete (deactivate) the shift
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
