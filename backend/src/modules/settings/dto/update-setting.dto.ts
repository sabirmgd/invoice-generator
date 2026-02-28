import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({ example: 'SAR' })
  @IsString()
  @IsNotEmpty()
  value!: string;
}
