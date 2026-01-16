import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { TranscriptionService } from '../transcription/transcription.service';
import { AnalysisService } from '../analysis/analysis.service';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  services: {
    embeddings: boolean;
    rag: boolean;
    transcription: boolean;
    analysis: boolean;
    complexity: boolean;
  };
  config: {
    hasOpenAiKey: boolean;
    hasQdrantUrl: boolean;
    embeddingModel: string;
    defaultLlmModel: string;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private configService: ConfigService,
    private embeddingsService: EmbeddingsService,
    private transcriptionService: TranscriptionService,
    private analysisService: AnalysisService,
  ) {}

  getHealth(): HealthStatus {
    const hasOpenAiKey = !!this.configService.get<string>('openaiApiKey');
    const hasQdrantUrl = !!this.configService.get<string>('qdrantUrl');

    const services = {
      embeddings: this.embeddingsService.isAvailable(),
      rag: hasQdrantUrl && hasOpenAiKey,
      transcription: this.transcriptionService.isAvailable(),
      analysis: this.analysisService.isAvailable(),
      complexity: true, // Rule-based, always available
    };

    const allServicesOk = Object.values(services).every((v) => v);
    const someServicesOk = Object.values(services).some((v) => v);

    let status: HealthStatus['status'] = 'error';
    if (allServicesOk) {
      status = 'ok';
    } else if (someServicesOk) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      services,
      config: {
        hasOpenAiKey,
        hasQdrantUrl,
        embeddingModel: this.configService.get<string>(
          'embeddingModel',
          'text-embedding-3-small',
        ),
        defaultLlmModel: this.configService.get<string>(
          'defaultLlmModel',
          'gpt-4o-mini',
        ),
      },
    };
  }
}
