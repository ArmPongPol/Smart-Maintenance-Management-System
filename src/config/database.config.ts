import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DATABASE,
  synchronize: String(process.env.DATABASE_SYNCHRONIZE || 'false') === 'true',
  logging: String(process.env.DB_LOGGING || 'false') === 'true',
  ssl: String(process.env.DATABASE_SSL || 'false') === 'true',
}));
