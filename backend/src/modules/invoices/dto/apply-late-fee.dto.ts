import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyLateFeeDto {
  @ApiProperty({ description: 'Late fee amount to apply' })
  @IsNumber()
  @Min(0.01)
  amount!: number;
}
