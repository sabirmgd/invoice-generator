import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Create an invoice for Client X' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ description: 'Existing conversation ID to continue' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ enum: ['anthropic', 'openai'] })
  @IsIn(['anthropic', 'openai'])
  provider!: string;

  @ApiPropertyOptional({ description: 'API key (required if no saved key)' })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
