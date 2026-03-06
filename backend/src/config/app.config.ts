import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8100', 10),
  pdfOutputDir: process.env.PDF_OUTPUT_DIR || './generated/invoices',

  recaptcha: {
    siteKey: process.env.RECAPTCHA_SITE_KEY || '',
    projectId: process.env.RECAPTCHA_PROJECT_ID || '',
    scoreThreshold: parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD ?? '0.5'),
  },

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
}));
