/**
 * ts-ml-service entry point
 * TypeScript ML service - Full TypeScript alternative to Python ML services
 */

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Configure Swagger/OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('SynthStack ML Service')
    .setDescription(`
# TypeScript ML Service API

Full TypeScript alternative to Python ML services. No Python required!

## Features
- **Embeddings**: Generate text embeddings for semantic search
- **RAG Pipeline**: Build knowledge bases with vector search
- **Content Analysis**: AI-powered text analysis and generation
- **Complexity Estimation**: Task complexity prediction
- **Transcription**: Audio transcription with Whisper

## Authentication
Most endpoints require JWT token from API Gateway.
Pass token in Authorization header as Bearer <token>.
    `)
    .setVersion('1.0.0')
    .setContact('SynthStack Support', 'https://synthstack.app/contact', 'support@synthstack.app')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('Health', 'Service health checks')
    .addTag('Embeddings', 'Text embeddings for semantic search')
    .addTag('RAG', 'Retrieval-Augmented Generation')
    .addTag('Analysis', 'Content analysis and AI processing')
    .addTag('Complexity', 'Task complexity estimation')
    .addTag('Transcription', 'Audio transcription')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'SynthStack ML Service API',
    customfavIcon: 'https://synthstack.app/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3001);
  const host = configService.get<string>('host', '0.0.0.0');

  await app.listen(port, host);
  console.log(`ts-ml-service running on http://${host}:${port}`);
  console.log(`Swagger UI available at http://${host}:${port}/api/docs`);
  console.log('TypeScript ML Service - No Python required!');
}

bootstrap();
