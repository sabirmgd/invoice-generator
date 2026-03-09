import { IsOptional, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendInvoiceDto {
  @ApiPropertyOptional({
    description: 'Override recipient email (defaults to client profile email)',
  })
  @IsOptional()
  @IsEmail()
  recipientOverride?: string;
}
