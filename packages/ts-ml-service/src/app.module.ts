/**
 * App Module - Root module for ts-ml-service
 */

import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { RagModule } from './rag/rag.module';
import { ComplexityModule } from './complexity/complexity.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { AnalysisModule } from './analysis/analysis.module';
import { HealthModule } from './health/health.module';
import { GenerationModule } from './generation/generation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule, // Conditionally loaded based on DATABASE_URL
    EmbeddingsModule,
    RagModule,
    ComplexityModule,
    TranscriptionModule,
    AnalysisModule,
    GenerationModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('database.url');
    if (databaseUrl) {
      this.logger.log('Database connection configured - request logging enabled');
    } else {
      this.logger.warn(
        'DATABASE_URL not configured - database features disabled',
      );
    }
  }

  configure(consumer: MiddlewareConsumer) {
    // Only apply middleware if database is configured
    const databaseUrl = this.configService.get<string>('database.url');
    if (databaseUrl) {
      consumer.apply(RequestLoggingMiddleware).forRoutes('*');
      this.logger.log('Request logging middleware registered');
    }
  }
}
