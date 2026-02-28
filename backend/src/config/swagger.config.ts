import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Invoice Generator API')
  .setDescription('Generate professional invoices with reusable profiles')
  .setVersion('1.0')
  .build();
