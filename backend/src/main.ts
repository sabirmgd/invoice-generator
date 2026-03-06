import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { swaggerConfig } from './config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function applyRuntimeSchemaPatches(
  dataSource: DataSource,
  logger: Logger,
): Promise<void> {
  const patches = [
    {
      id: 'drop-global-unique-invoice-number',
      sql: `
        DO $$
        DECLARE constraint_name text;
        BEGIN
          FOR constraint_name IN
            SELECT c.conname
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.conkey[1]
            WHERE n.nspname = 'public'
              AND t.relname = 'invoices'
              AND c.contype = 'u'
              AND array_length(c.conkey, 1) = 1
              AND a.attname = 'invoice_number'
          LOOP
            EXECUTE format('ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS %I', constraint_name);
          END LOOP;
        END
        $$;
      `,
    },
    {
      id: 'add-owner-invoice-number-unique-index',
      sql: `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_owner_invoice_number_unique
        ON public.invoices (owner_id, invoice_number)
      `,
    },
  ];

  for (const patch of patches) {
    try {
      await dataSource.query(patch.sql);
      logger.log(`Applied runtime schema patch: ${patch.id}`);
    } catch (error) {
      logger.warn(
        `Runtime schema patch failed (${patch.id}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(compression());
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const config = app.get(ConfigService);
  const dataSource = app.get(DataSource);
  const logger = app.get(Logger);
  await applyRuntimeSchemaPatches(dataSource, logger);

  const port = config.get<number>('app.port', 8100);

  await app.listen(port);
  logger.log(`Invoice Generator API running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
