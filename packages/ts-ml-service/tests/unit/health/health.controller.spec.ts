import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../../../src/health/health.controller';
import { HealthService, HealthStatus } from '../../../src/health/health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockHealthStatus: HealthStatus = {
    status: 'ok',
    timestamp: '2024-01-01T00:00:00.000Z',
    version: '0.1.0',
    services: {
      embeddings: true,
      rag: true,
      transcription: true,
      analysis: true,
      complexity: true,
    },
    config: {
      hasOpenAiKey: true,
      hasQdrantUrl: true,
      embeddingModel: 'text-embedding-3-small',
      defaultLlmModel: 'gpt-4o-mini',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getHealth: jest.fn().mockReturnValue(mockHealthStatus),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = controller.getHealth();
      expect(result).toEqual(mockHealthStatus);
      expect(healthService.getHealth).toHaveBeenCalled();
    });

    it('should include all service statuses', () => {
      const result = controller.getHealth();
      expect(result.services).toHaveProperty('embeddings');
      expect(result.services).toHaveProperty('rag');
      expect(result.services).toHaveProperty('transcription');
      expect(result.services).toHaveProperty('analysis');
      expect(result.services).toHaveProperty('complexity');
    });

    it('should include config information', () => {
      const result = controller.getHealth();
      expect(result.config).toHaveProperty('hasOpenAiKey');
      expect(result.config).toHaveProperty('hasQdrantUrl');
      expect(result.config).toHaveProperty('embeddingModel');
      expect(result.config).toHaveProperty('defaultLlmModel');
    });
  });

  describe('getReady', () => {
    it('should return ready when status is ok', () => {
      const result = controller.getReady();
      expect(result).toEqual({
        ready: true,
        status: 'ok',
      });
    });

    it('should return ready when status is degraded', () => {
      jest.spyOn(healthService, 'getHealth').mockReturnValue({
        ...mockHealthStatus,
        status: 'degraded',
      });
      const result = controller.getReady();
      expect(result).toEqual({
        ready: true,
        status: 'degraded',
      });
    });

    it('should return not ready when status is error', () => {
      jest.spyOn(healthService, 'getHealth').mockReturnValue({
        ...mockHealthStatus,
        status: 'error',
      });
      const result = controller.getReady();
      expect(result).toEqual({
        ready: false,
        status: 'error',
      });
    });
  });

  describe('getLive', () => {
    it('should return live status', () => {
      const result = controller.getLive();
      expect(result).toHaveProperty('live', true);
      expect(result).toHaveProperty('timestamp');
    });

    it('should return valid ISO timestamp', () => {
      const result = controller.getLive();
      const date = new Date(result.timestamp);
      expect(date.toISOString()).toBe(result.timestamp);
    });
  });
});
