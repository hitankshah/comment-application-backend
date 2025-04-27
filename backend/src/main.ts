import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Enable CORS with simplified configuration
  const corsOrigin = configService.get('CORS_ORIGIN', '*');
  console.log(`Configuring CORS with origin: ${corsOrigin}`);
  
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition']
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Comments API')
    .setDescription('API for the comments application')
    .setVersion('1.0')
    .addTag('comments')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(configService.get<number>('PORT', 3000), '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
