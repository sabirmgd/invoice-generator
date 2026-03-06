import { IsString, IsNotEmpty, IsOptional, IsIn, Allow } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'API key (optional BYOK override)' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'reCAPTCHA Enterprise token' })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;

  @Allow()
  files?: any;
}
