import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const cfg = app.get(ConfigService);

  // Глобальный префикс для всех роутов (например, /api/auth/login)
  app.setGlobalPrefix('api');
  
  // Подключаем cookie-parser (если используешь refresh-токены в куках)
  app.use(cookieParser());

  // ─── НАСТРОЙКА CORS ───
  const frontendUrl = cfg.get<string>('CORS_ORIGIN');
  
  // Формируем белый список доменов
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:5173', // Vite локально
    'http://localhost:3000', // На всякий случай
  ].filter(Boolean); // Убираем undefined, если переменная не задана

  app.enableCors({
    origin: (origin, callback) => {
      // 1. Разрешаем запросы без origin (например, от Postman, Swagger или серверных скриптов)
      if (!origin) return callback(null, true);
      
      // 2. Если домен в белом списке — пропускаем
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // 3. Иначе — блокируем и пишем в консоль Render, чтобы было видно, кто стучится
        console.error(`🚫 Blocked by CORS: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // Разрешаем передачу кук и заголовков авторизации
  });

  // Глобальная валидация DTO (чтобы работали декораторы @IsEmail, @IsString и т.д.)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── НАСТРОЙКА SWAGGER ───
  const swaggerCfg = new DocumentBuilder()
    .setTitle('Coworking API')
    .setDescription('API управления коворкинг-пространством')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerCfg);
  SwaggerModule.setup('api/docs', app, doc);

  // Запуск сервера
  const port = cfg.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
  
  Logger.log(`🚀 API is running on: http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`, 'Bootstrap');
  Logger.log(`🛡️  CORS allowed for: ${allowedOrigins.join(', ')}`, 'Bootstrap');
}
bootstrap();