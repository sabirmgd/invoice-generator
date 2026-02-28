import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8100', 10),
  pdfOutputDir: process.env.PDF_OUTPUT_DIR || './generated/invoices',
}));
