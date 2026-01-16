import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AnalysisController } from '../../../src/analysis/analysis.controller';
import { AnalysisService, SummarizeResult, SentimentResult } from '../../../src/analysis/analysis.service';

describe('AnalysisController', () => {
  let controller: AnalysisController;
  let analysisService: AnalysisService;

  const mockSummarizeResult: SummarizeResult = {
    summary: 'This is a test summary.',
    keyPoints: ['Point 1', 'Point 2', 'Point 3'],
    model: 'gpt-4o-mini',
    tokensUsed: 150,
  };

  const mockSentimentResult: SentimentResult = {
    sentiment: 'positive',
    score: 0.8,
    confidence: 0.95,
    model: 'gpt-4o-mini',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisController],
      providers: [
        {
          provide: AnalysisService,
          useValue: {
            summarize: jest.fn().mockResolvedValue(mockSummarizeResult),
            analyzeSentiment: jest.fn().mockResolvedValue(mockSentimentResult),
            extractKeywords: jest.fn().mockResolvedValue({
              keywords: ['test', 'analysis', 'keyword'],
              model: 'gpt-4o-mini',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalysisController>(AnalysisController);
    analysisService = module.get<AnalysisService>(AnalysisService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('summarize', () => {
    it('should return summary for text', async () => {
      const result = await controller.summarize({ text: 'Long text to summarize' });
      expect(result.success).toBe(true);
      expect(result.summary).toBe('This is a test summary.');
      expect(result.keyPoints).toHaveLength(3);
    });

    it('should pass maxLength to service', async () => {
      await controller.summarize({ text: 'Text', maxLength: 100 });
      expect(analysisService.summarize).toHaveBeenCalledWith('Text', 100, undefined);
    });

    it('should pass model to service', async () => {
      await controller.summarize({ text: 'Text', model: 'gpt-4' });
      expect(analysisService.summarize).toHaveBeenCalledWith('Text', undefined, 'gpt-4');
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(analysisService, 'summarize')
        .mockRejectedValue(new Error('API error'));

      await expect(controller.summarize({ text: 'Test' })).rejects.toThrow(
        HttpException,
      );
    });

    it('should return error with correct status code', async () => {
      jest
        .spyOn(analysisService, 'summarize')
        .mockRejectedValue(new Error('Summarization failed'));

      try {
        await controller.summarize({ text: 'Test' });
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
  });

  describe('analyzeSentiment', () => {
    it('should return sentiment analysis', async () => {
      const result = await controller.analyzeSentiment({ text: 'Great product!' });
      expect(result.success).toBe(true);
      expect(result.sentiment).toBe('positive');
      expect(result.score).toBe(0.8);
      expect(result.confidence).toBe(0.95);
    });

    it('should pass includeAspects to service', async () => {
      await controller.analyzeSentiment({ text: 'Text', includeAspects: true });
      expect(analysisService.analyzeSentiment).toHaveBeenCalledWith(
        'Text',
        true,
        undefined,
      );
    });

    it('should return aspects when requested', async () => {
      jest.spyOn(analysisService, 'analyzeSentiment').mockResolvedValue({
        ...mockSentimentResult,
        aspects: [
          { aspect: 'quality', sentiment: 'positive', score: 0.9 },
          { aspect: 'price', sentiment: 'negative', score: -0.5 },
        ],
      });

      const result = await controller.analyzeSentiment({
        text: 'Text',
        includeAspects: true,
      });
      expect(result.aspects).toHaveLength(2);
    });

    it('should pass model to service', async () => {
      await controller.analyzeSentiment({ text: 'Text', model: 'gpt-4' });
      expect(analysisService.analyzeSentiment).toHaveBeenCalledWith(
        'Text',
        undefined,
        'gpt-4',
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(analysisService, 'analyzeSentiment')
        .mockRejectedValue(new Error('Analysis error'));

      await expect(
        controller.analyzeSentiment({ text: 'Test' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('extractKeywords', () => {
    it('should return extracted keywords', async () => {
      const result = await controller.extractKeywords({ text: 'Sample text' });
      expect(result.success).toBe(true);
      expect(result.keywords).toEqual(['test', 'analysis', 'keyword']);
    });

    it('should pass maxKeywords to service', async () => {
      await controller.extractKeywords({ text: 'Text', maxKeywords: 5 });
      expect(analysisService.extractKeywords).toHaveBeenCalledWith(
        'Text',
        5,
        undefined,
      );
    });

    it('should pass model to service', async () => {
      await controller.extractKeywords({ text: 'Text', model: 'gpt-4' });
      expect(analysisService.extractKeywords).toHaveBeenCalledWith(
        'Text',
        undefined,
        'gpt-4',
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(analysisService, 'extractKeywords')
        .mockRejectedValue(new Error('Extraction error'));

      await expect(
        controller.extractKeywords({ text: 'Test' }),
      ).rejects.toThrow(HttpException);
    });
  });
});
