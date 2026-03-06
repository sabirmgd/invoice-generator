import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(8100),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(8001),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNC: Joi.string().valid('true', 'false').default('false'),
  DB_LOGGING: Joi.string().valid('true', 'false').default('false'),
  DB_SOCKET_PATH: Joi.string().optional().allow(''),
  CLOUD_SQL_CONNECTION_NAME: Joi.string().optional().allow(''),
  PDF_OUTPUT_DIR: Joi.string().default('./generated/invoices'),

  // Firebase (optional — disabled if not set)
  FIREBASE_PROJECT_ID: Joi.string().optional().allow(''),
  FIREBASE_CLIENT_EMAIL: Joi.string().optional().allow(''),
  FIREBASE_PRIVATE_KEY: Joi.string().optional().allow(''),

  // Encryption (optional — random key used in dev if not set)
  ENCRYPTION_MASTER_KEY: Joi.string().optional().allow(''),

  // reCAPTCHA Enterprise (optional — skipped if not set)
  RECAPTCHA_SITE_KEY: Joi.string().optional().allow(''),
  RECAPTCHA_PROJECT_ID: Joi.string().optional().allow(''),
  RECAPTCHA_SCORE_THRESHOLD: Joi.number().default(0.5),

  // Server-side Anthropic key (optional — enables no-BYOK mode)
  ANTHROPIC_API_KEY: Joi.string().optional().allow(''),
});
