import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { SnakeCaseNamingStrategy } from './naming.strategy';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '8001', 10),
  username: process.env.DB_USERNAME || 'invoice_user',
  password: process.env.DB_PASSWORD || 'invoice_secret_2024',
  database: process.env.DB_DATABASE || 'invoice_generator',
  synchronize: false,
  logging: true,
  namingStrategy: new SnakeCaseNamingStrategy(),
  entities: ['src/db/entities/**/*.entity.ts'],
  migrations: ['src/db/migrations/**/*.ts'],
});
