import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { RagModule } from '../rag/rag.module';
import { TranscriptionModule } from '../transcription/transcription.module';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
  imports: [EmbeddingsModule, RagModule, TranscriptionModule, AnalysisModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
