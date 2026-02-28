import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import {
  appConfig,
  databaseConfig,
  envValidationSchema,
} from './config';
import { SnakeCaseNamingStrategy } from './db/naming.strategy';
import { HealthModule } from './modules/health';
import { SettingsModule } from './modules/settings';
import { ProfilesModule } from './modules/profiles';
import { InvoicesModule } from './modules/invoices';
import { AuthModule } from './modules/auth';
import { ChatbotModule } from './modules/chatbot';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        synchronize: config.get('database.synchronize'),
        logging: config.get('database.logging'),
        namingStrategy: new SnakeCaseNamingStrategy(),
        autoLoadEntities: true,
      }),
    }),
    HealthModule,
    AuthModule,
    SettingsModule,
    ProfilesModule,
    InvoicesModule,
    ChatbotModule,
  ],
})
export class AppModule {}
