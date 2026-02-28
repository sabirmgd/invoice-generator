import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class SaveLlmKeyDto {
  @ApiProperty()
  @IsString()
  apiKey!: string;

  @ApiProperty({ enum: ['anthropic', 'openai'] })
  @IsIn(['anthropic', 'openai'])
  provider!: string;
}
