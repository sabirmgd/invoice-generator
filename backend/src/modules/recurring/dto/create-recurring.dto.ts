import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurringFrequency } from '../../../db/entities/recurring-invoice.entity';

class RecurringItemDto {
  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateRecurringDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: RecurringFrequency })
  @IsEnum(RecurringFrequency)
  frequency!: RecurringFrequency;

  @ApiProperty()
  @IsUUID()
  senderProfileId!: string;

  @ApiProperty()
  @IsUUID()
  clientProfileId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bankProfileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [RecurringItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecurringItemDto)
  items!: RecurringItemDto[];

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoSendEmail?: boolean;
}
