import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateEditRequestDto {
  @IsUUID()
  @IsNotEmpty()
  timeEntryId: string;

  @IsString()
  @IsNotEmpty()
  fieldName: string;

  @IsString()
  @IsNotEmpty()
  newValue: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
