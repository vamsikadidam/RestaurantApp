import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  const globalPrefix = configService.get<string>('app.globalPrefix') ?? 'api';
  const port = configService.get<number>('app.port') ?? 3000;
  const corsAllowedOrigins = configService.get<string[]>('app.corsAllowedOrigins') ?? [];

  app.use(helmet());
  app.setGlobalPrefix(globalPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: corsAllowedOrigins.length > 0 ? corsAllowedOrigins : false,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Restaurant Platform API')
    .setDescription(
      'Backend API for the restaurant ordering platform: authentication, menu, cart, orders, payments (Clover), and account management.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);

  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}/${globalPrefix}`);
  logger.log(`Swagger docs available at http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
