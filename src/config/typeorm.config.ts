import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const synchronize = config.get<boolean>('database.synchronize') ?? false;

  if (synchronize && config.get<string>('app.env') === 'production') {
    throw new Error(
      `DB_SYNCHRONIZE must never be enabled in production. Use migrations`,
    );
  }

  return {
    type: 'postgres',
    host: config.get<string>('database.host'),
    port: config.get<number>('database.port'),
    username: config.get<string>('database.username'),
    password: config.get<string>('database.password'),
    database: config.get<string>('database.database'),
    ssl: config.get<boolean>('database.ssl')
      ? { rejectUnauthorized: false }
      : false,
    autoLoadEntities: true,
    synchronize,
    logging: config.get<boolean>('database.logging'),
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    migrationsRun: false,
  };
}
