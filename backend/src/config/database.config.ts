import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_SOCKET_PATH
    ? `${process.env.DB_SOCKET_PATH}/${process.env.CLOUD_SQL_CONNECTION_NAME}`
    : process.env.DB_HOST || 'localhost',
  port: process.env.DB_SOCKET_PATH
    ? undefined
    : parseInt(process.env.DB_PORT || '8001', 10),
  username: process.env.DB_USERNAME || 'invoice_user',
  password: process.env.DB_PASSWORD || 'invoice_secret_2024',
  database: process.env.DB_DATABASE || 'invoice_generator',
  synchronize: process.env.DB_SYNC === 'true',
  logging: process.env.DB_LOGGING === 'true',
  ...(process.env.DB_SOCKET_PATH && {
    extra: { socketPath: `${process.env.DB_SOCKET_PATH}/${process.env.CLOUD_SQL_CONNECTION_NAME}` },
  }),
}));
