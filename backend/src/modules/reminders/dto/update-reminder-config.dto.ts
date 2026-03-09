import { IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReminderConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableBeforeDue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  daysBeforeDue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableOnDue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableOverdue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  daysAfterDue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxOverdueReminders?: number;
}
