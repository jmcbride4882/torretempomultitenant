import { IsUUID } from 'class-validator';

export class StartBreakDto {
  @IsUUID()
  timeEntryId: string;
}
