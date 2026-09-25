import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Registered here instead of in a module so it runs before Nest's body parser;
  // otherwise body-parser errors (bad JSON, payload too large) would have no request id.
  app.use(requestIdMiddleware);

  const apiPrefix = config.get<string>('app.apiPrefix');
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  // An empty CORS_ORIGINS allows no cross-origin requests.
  app.enableCors({
    origin: config.get<string[]>('app.corsOrigins'),
    credentials: config.get<boolean>('app.corsCredential'),
  });

  // whitelist + forbidNonWhitelisted: unknown fields (e.g. `role` on register)
  // are rejected with 400 instead of being passed through to the service.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app);
  await app.listen(config.getOrThrow<number>('app.port'));
}
bootstrap();
