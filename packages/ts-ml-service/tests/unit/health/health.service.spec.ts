import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from '../../../src/health/health.service';
import { EmbeddingsService } from '../../../src/embeddings/embeddings.service';
import { TranscriptionService } from '../../../src/transcription/transcription.service';
import { AnalysisService } from '../../../src/analysis/analysis.service';

describe('HealthService', () => {
  let service: HealthService;
  let configService: ConfigService;
  let embeddingsService: EmbeddingsService;
  let transcriptionService: TranscriptionService;
  let analysisService: AnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                openaiApiKey: 'test-api-key',
                qdrantUrl: 'http://localhost:6333',
                embeddingModel: 'text-embedding-3-small',
                defaultLlmModel: 'gpt-4o-mini',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: EmbeddingsService,
          useValue: {
            isAvailable: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: TranscriptionService,
          useValue: {
            isAvailable: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: AnalysisService,
          useValue: {
            isAvailable: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    configService = module.get<ConfigService>(ConfigService);
    embeddingsService = module.get<EmbeddingsService>(EmbeddingsService);
    transcriptionService = module.get<TranscriptionService>(TranscriptionService);
    analysisService = module.get<AnalysisService>(AnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return ok status when all services are available', () => {
      const result = service.getHealth();
      expect(result.status).toBe('ok');
    });

    it('should return degraded status when some services are unavailable', () => {
      jest.spyOn(embeddingsService, 'isAvailable').mockReturnValue(false);
      const result = service.getHealth();
      expect(result.status).toBe('degraded');
    });

    it('should return degraded status when most services are unavailable', () => {
      jest.spyOn(embeddingsService, 'isAvailable').mockReturnValue(false);
      jest.spyOn(transcriptionService, 'isAvailable').mockReturnValue(false);
      jest.spyOn(analysisService, 'isAvailable').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const result = service.getHealth();
      // Status is degraded because complexity service is always available
      expect(result.status).toBe('degraded');
    });

    it('should include version', () => {
      const result = service.getHealth();
      expect(result.version).toBe('0.1.0');
    });

    it('should include timestamp', () => {
      const result = service.getHealth();
      expect(result.timestamp).toBeDefined();
      const date = new Date(result.timestamp);
      expect(date.toISOString()).toBe(result.timestamp);
    });

    it('should check embeddings service availability', () => {
      service.getHealth();
      expect(embeddingsService.isAvailable).toHaveBeenCalled();
    });

    it('should check transcription service availability', () => {
      service.getHealth();
      expect(transcriptionService.isAvailable).toHaveBeenCalled();
    });

    it('should check analysis service availability', () => {
      service.getHealth();
      expect(analysisService.isAvailable).toHaveBeenCalled();
    });

    it('should report complexity as always available', () => {
      const result = service.getHealth();
      expect(result.services.complexity).toBe(true);
    });

    it('should report RAG availability based on config', () => {
      const result = service.getHealth();
      expect(result.services.rag).toBe(true);
    });

    it('should report RAG unavailable when Qdrant URL missing', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'qdrantUrl') return undefined;
        if (key === 'openaiApiKey') return 'test-key';
        return undefined;
      });
      const result = service.getHealth();
      expect(result.services.rag).toBe(false);
    });

    it('should include hasOpenAiKey in config', () => {
      const result = service.getHealth();
      expect(result.config.hasOpenAiKey).toBe(true);
    });

    it('should include hasQdrantUrl in config', () => {
      const result = service.getHealth();
      expect(result.config.hasQdrantUrl).toBe(true);
    });

    it('should include embeddingModel in config', () => {
      const result = service.getHealth();
      expect(result.config.embeddingModel).toBe('text-embedding-3-small');
    });

    it('should include defaultLlmModel in config', () => {
      const result = service.getHealth();
      expect(result.config.defaultLlmModel).toBe('gpt-4o-mini');
    });
  });
});
