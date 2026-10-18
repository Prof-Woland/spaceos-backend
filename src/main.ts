import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const cfg = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: cfg.get<string>('CORS_ORIGIN')?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerCfg = new DocumentBuilder()
    .setTitle('Coworking API')
    .setDescription('API управления коворкинг-пространством')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerCfg);
  SwaggerModule.setup('api/docs', app, doc);

  const port = cfg.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`API on http://localhost:${port}/api  •  docs on /api/docs`, 'Bootstrap');
}
bootstrap();