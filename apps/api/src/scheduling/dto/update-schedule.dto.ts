import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleDto } from './create-schedule.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  /**
   * Set to true to publish the schedule (make it visible to employees)
   */
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
