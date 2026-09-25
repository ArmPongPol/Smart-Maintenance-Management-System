import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Registered here instead of in a module so it runs before Nest's body parser;
  // otherwise body-parser errors (bad JSON, payload too large) would have no request id.
  app.use(requestIdMiddleware);
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
