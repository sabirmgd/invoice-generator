import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'Web Development Services' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Sender profile UUID' })
  @IsUUID()
  senderProfileId!: string;

  @ApiProperty({ description: 'Client profile UUID' })
  @IsUUID()
  clientProfileId!: string;

  @ApiPropertyOptional({
    description: 'Bank profile UUID (uses default if omitted)',
  })
  @IsOptional()
  @IsUUID()
  bankProfileId?: string;

  @ApiProperty({ example: '2026-02-28' })
  @IsDateString()
  issueDate!: string;

  @ApiProperty({ example: '2026-03-30' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({
    description: 'Override auto-generated invoice number',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    example: 'SAR',
    description: 'Defaults to system setting',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'Defaults to system setting',
  })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];
}
