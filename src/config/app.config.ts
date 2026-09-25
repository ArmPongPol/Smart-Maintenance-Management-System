import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME,
  env: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX,
  apiVersion: process.env.API_VERSION,
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  corsCredential: String(process.env.CORS_CREDENTIALS || 'true') === 'true',
}));
