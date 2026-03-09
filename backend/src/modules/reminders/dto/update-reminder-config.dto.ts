import { IsOptional, IsBoolean, IsInt, IsNumber, IsIn, Min, Max } from 'class-validator';
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

  // Late fees
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableLateFees?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  lateFeeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  lateFeeValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  lateFeeGraceDays?: number;
}
