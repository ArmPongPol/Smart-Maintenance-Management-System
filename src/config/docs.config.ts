import { registerAs } from '@nestjs/config';

export default registerAs('docs', () => ({
  enable: String(process.env.DOCS_ENABLED ?? 'true') === 'true',
  path: process.env.DOCS_PATH || 'docs',
  title: process.env.APP_NAME || 'API',
  description: process.env.DOCS_DESCRIPTION,
}));
