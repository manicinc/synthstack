import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ComplexityController } from '../../../src/complexity/complexity.controller';
import { ComplexityService } from '../../../src/complexity/complexity.service';

describe('ComplexityController', () => {
  let controller: ComplexityController;
  let complexityService: ComplexityService;

  const mockPreEstimate = {
    complexityScore: 3,
    complexityName: 'Moderate',
    estimatedHours: 10,
    estimatedPoints: 5,
    factors: { descriptionLength: 500 },
    reasoning: 'Estimated as Moderate',
    confidence: 0.7,
    timestamp: '2024-01-01T00:00:00.000Z',
  };

  const mockPostAnalyze = {
    actualComplexity: 3,
    complexityName: 'Moderate',
    actualPoints: 5,
    metrics: { totalLinesChanged: 300, filesChanged: 5 },
    accuracyScore: 100,
    pointAdjustment: 1.1,
    adjustmentReason: 'Perfect estimation accuracy',
    analysis: 'Actual complexity: Moderate',
    timestamp: '2024-01-01T00:00:00.000Z',
  };

  const mockScale = {
    1: { level: 1, name: 'Trivial', description: 'Quick fix', hoursMin: 0.1, hoursMax: 1, basePoints: 1, indicators: [] },
    2: { level: 2, name: 'Simple', description: 'Small change', hoursMin: 1, hoursMax: 4, basePoints: 3, indicators: [] },
    3: { level: 3, name: 'Moderate', description: 'Standard feature', hoursMin: 4, hoursMax: 16, basePoints: 5, indicators: [] },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplexityController],
      providers: [
        {
          provide: ComplexityService,
          useValue: {
            preEstimate: jest.fn().mockResolvedValue(mockPreEstimate),
            postAnalyze: jest.fn().mockResolvedValue(mockPostAnalyze),
            getComplexityScale: jest.fn().mockReturnValue(mockScale),
            calculatePointAdjustment: jest.fn().mockReturnValue({
              multiplier: 1.1,
              bonusPercent: 10,
              reason: 'Perfect estimation accuracy',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ComplexityController>(ComplexityController);
    complexityService = module.get<ComplexityService>(ComplexityService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('preEstimate', () => {
    it('should return complexity estimate', async () => {
      const result = await controller.preEstimate({
        title: 'Add new feature',
        description: 'Implement user authentication',
      });
      expect(result.complexityScore).toBe(3);
      expect(result.complexityName).toBe('Moderate');
      expect(result.estimatedHours).toBe(10);
    });

    it('should pass all parameters to service', async () => {
      await controller.preEstimate({
        title: 'Title',
        description: 'Description',
        issueType: 'feature',
        labels: ['enhancement'],
        milestone: 'v1.0',
        projectContext: 'Backend service',
        relatedFiles: ['src/auth.ts'],
      });

      expect(complexityService.preEstimate).toHaveBeenCalledWith({
        title: 'Title',
        description: 'Description',
        issueType: 'feature',
        labels: ['enhancement'],
        milestone: 'v1.0',
        projectContext: 'Backend service',
        relatedFiles: ['src/auth.ts'],
      });
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(complexityService, 'preEstimate')
        .mockRejectedValue(new Error('Estimation failed'));

      await expect(
        controller.preEstimate({ title: 'Test' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('postAnalyze', () => {
    it('should return post-analysis results', async () => {
      const result = await controller.postAnalyze({
        linesAdded: 200,
        linesRemoved: 100,
        filesChanged: 5,
        commits: 10,
      });
      expect(result.actualComplexity).toBe(3);
      expect(result.actualPoints).toBe(5);
    });

    it('should pass pre-estimate when provided', async () => {
      await controller.postAnalyze({
        linesAdded: 200,
        linesRemoved: 100,
        filesChanged: 5,
        commits: 10,
        preComplexityScore: 3,
        preEstimatedHours: 10,
        preReasoning: 'Test reasoning',
      });

      expect(complexityService.postAnalyze).toHaveBeenCalledWith(
        expect.any(Object),
        {
          complexityScore: 3,
          estimatedHours: 10,
          reasoning: 'Test reasoning',
        },
      );
    });

    it('should not pass pre-estimate when not provided', async () => {
      await controller.postAnalyze({
        linesAdded: 200,
        linesRemoved: 100,
        filesChanged: 5,
        commits: 10,
      });

      expect(complexityService.postAnalyze).toHaveBeenCalledWith(
        expect.any(Object),
        undefined,
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(complexityService, 'postAnalyze')
        .mockRejectedValue(new Error('Analysis failed'));

      await expect(
        controller.postAnalyze({
          linesAdded: 100,
          linesRemoved: 50,
          filesChanged: 3,
          commits: 5,
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getComplexityScale', () => {
    it('should return complexity scale', () => {
      const result = controller.getComplexityScale();
      expect(result.scale).toHaveLength(3);
    });

    it('should include all scale properties', () => {
      const result = controller.getComplexityScale();
      expect(result.scale[0]).toHaveProperty('level');
      expect(result.scale[0]).toHaveProperty('name');
      expect(result.scale[0]).toHaveProperty('description');
      expect(result.scale[0]).toHaveProperty('hoursMin');
      expect(result.scale[0]).toHaveProperty('hoursMax');
      expect(result.scale[0]).toHaveProperty('basePoints');
      expect(result.scale[0]).toHaveProperty('indicators');
    });
  });

  describe('calculateAdjustment', () => {
    it('should return point adjustment', () => {
      const result = controller.calculateAdjustment({
        preLevel: 3,
        actualLevel: 3,
      });
      expect(result.multiplier).toBe(1.1);
      expect(result.bonusPercent).toBe(10);
      expect(result.reason).toBe('Perfect estimation accuracy');
    });

    it('should pass levels to service', () => {
      controller.calculateAdjustment({
        preLevel: 2,
        actualLevel: 4,
      });
      expect(complexityService.calculatePointAdjustment).toHaveBeenCalledWith(2, 4);
    });

    it('should throw HttpException on service error', () => {
      jest
        .spyOn(complexityService, 'calculatePointAdjustment')
        .mockImplementation(() => {
          throw new Error('Calculation failed');
        });

      expect(() =>
        controller.calculateAdjustment({ preLevel: 2, actualLevel: 4 }),
      ).toThrow(HttpException);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', () => {
      const result = controller.healthCheck();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('complexity-estimation');
      expect(result.timestamp).toBeDefined();
    });
  });
});
