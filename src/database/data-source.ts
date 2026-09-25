import { ConfigService } from '@nestjs/config';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import appConfig from '../config/app.config';
import databaseConfig from '../config/database.config';
import { buildTypeOrmOptions } from '../config/typeorm.config';

// Used by the TypeORM CLI only (the migration:* scripts in package.json).
// The app itself connects through TypeOrmModule in AppModule with the same options.
loadEnv({ quiet: true });

const config = new ConfigService({
  app: appConfig(),
  database: databaseConfig(),
});

export default new DataSource({
  ...(buildTypeOrmOptions(config) as DataSourceOptions),
  // autoLoadEntities only works inside Nest, so the CLI finds entities by file name.
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
});
