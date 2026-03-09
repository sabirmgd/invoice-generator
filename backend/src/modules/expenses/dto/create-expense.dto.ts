import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../../../db/entities/expense.entity';

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory, example: 'software' })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiProperty({ example: 'Claude API usage' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount!: number;

  @ApiProperty({ example: '2026-03-09' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Anthropic' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  taxDeductible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
