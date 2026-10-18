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

  // 👇 Функция для очистки URL от слэшей в конце
  const normalizeOrigin = (url: string) => url ? url.trim().replace(/\/$/, '').replace(/\/\.$/, '') : url;

  const frontendUrl = normalizeOrigin(cfg.get<string>('CORS_ORIGIN') || '');
  
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      // 👇 Очищаем входящий origin от лишних символов
      const normalizedRequestOrigin = normalizeOrigin(origin);
      
      if (allowedOrigins.includes(normalizedRequestOrigin)) {
        callback(null, true);
      } else {
        console.error(`🚫 Blocked by CORS: ${origin} (normalized: ${normalizedRequestOrigin}). Allowed: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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
  
  Logger.log(`🚀 API is running on port ${port}`, 'Bootstrap');
  Logger.log(`🛡️  CORS allowed for: ${allowedOrigins.join(', ')}`, 'Bootstrap');
}
bootstrap();