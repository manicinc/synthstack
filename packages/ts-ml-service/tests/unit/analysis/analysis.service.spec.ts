import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnalysisService } from '../../../src/analysis/analysis.service';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let configService: ConfigService;

  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'openaiApiKey') return 'test-api-key';
              if (key === 'defaultLlmModel') return defaultValue || 'gpt-4o-mini';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock the OpenAI client
    (service as any).openai = mockOpenAI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('summarize', () => {
    beforeEach(() => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'This is a summary.',
                keyPoints: ['Point 1', 'Point 2'],
              }),
            },
          },
        ],
        usage: { total_tokens: 100 },
      });
    });

    it('should summarize text', async () => {
      const result = await service.summarize('Long text to summarize');
      expect(result.summary).toBe('This is a summary.');
      expect(result.keyPoints).toEqual(['Point 1', 'Point 2']);
    });

    it('should use default model', async () => {
      await service.summarize('Text');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
        }),
      );
    });

    it('should use specified model', async () => {
      await service.summarize('Text', undefined, 'gpt-4');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        }),
      );
    });

    it('should include maxLength instruction when provided', async () => {
      await service.summarize('Text', 50);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('under 50 words'),
            }),
          ]),
        }),
      );
    });

    it('should include tokens used', async () => {
      const result = await service.summarize('Text');
      expect(result.tokensUsed).toBe(100);
    });

    it('should handle non-JSON response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Plain text summary',
            },
          },
        ],
      });
      const result = await service.summarize('Text');
      expect(result.summary).toBe('Plain text summary');
      expect(result.keyPoints).toEqual([]);
    });

    it('should throw error when OpenAI client not initialized', async () => {
      (service as any).openai = null;
      await expect(service.summarize('Text')).rejects.toThrow(
        'OpenAI client not initialized',
      );
    });

    it('should use JSON response format', async () => {
      await service.summarize('Text');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' },
        }),
      );
    });
  });

  describe('analyzeSentiment', () => {
    beforeEach(() => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'positive',
                score: 0.8,
                confidence: 0.95,
              }),
            },
          },
        ],
      });
    });

    it('should analyze sentiment', async () => {
      const result = await service.analyzeSentiment('Great product!');
      expect(result.sentiment).toBe('positive');
      expect(result.score).toBe(0.8);
      expect(result.confidence).toBe(0.95);
    });

    it('should default to neutral for invalid response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'invalid json' } }],
      });
      const result = await service.analyzeSentiment('Text');
      expect(result.sentiment).toBe('neutral');
    });

    it('should include aspects when requested', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'mixed',
                score: 0.2,
                confidence: 0.85,
                aspects: [
                  { aspect: 'quality', sentiment: 'positive', score: 0.9 },
                  { aspect: 'price', sentiment: 'negative', score: -0.7 },
                ],
              }),
            },
          },
        ],
      });
      const result = await service.analyzeSentiment('Text', true);
      expect(result.aspects).toHaveLength(2);
      expect(result.aspects?.[0].aspect).toBe('quality');
    });

    it('should not include aspects when not requested', async () => {
      const result = await service.analyzeSentiment('Text', false);
      expect(result.aspects).toBeUndefined();
    });

    it('should use specified model', async () => {
      await service.analyzeSentiment('Text', false, 'gpt-4');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        }),
      );
    });

    it('should throw error when OpenAI client not initialized', async () => {
      (service as any).openai = null;
      await expect(service.analyzeSentiment('Text')).rejects.toThrow(
        'OpenAI client not initialized',
      );
    });

    it('should handle empty response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
      });
      const result = await service.analyzeSentiment('Text');
      expect(result.sentiment).toBe('neutral');
      expect(result.score).toBe(0);
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('extractKeywords', () => {
    beforeEach(() => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                keywords: ['keyword1', 'keyword2', 'keyword3'],
              }),
            },
          },
        ],
      });
    });

    it('should extract keywords', async () => {
      const result = await service.extractKeywords('Sample text');
      expect(result.keywords).toEqual(['keyword1', 'keyword2', 'keyword3']);
      expect(result.model).toBe('gpt-4o-mini');
    });

    it('should pass maxKeywords to prompt', async () => {
      await service.extractKeywords('Text', 5);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('5 most important'),
            }),
          ]),
        }),
      );
    });

    it('should use default maxKeywords of 10', async () => {
      await service.extractKeywords('Text');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('10 most important'),
            }),
          ]),
        }),
      );
    });

    it('should use specified model', async () => {
      await service.extractKeywords('Text', 10, 'gpt-4');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        }),
      );
    });

    it('should handle empty keywords response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
      });
      const result = await service.extractKeywords('Text');
      expect(result.keywords).toEqual([]);
    });

    it('should throw error when OpenAI client not initialized', async () => {
      (service as any).openai = null;
      await expect(service.extractKeywords('Text')).rejects.toThrow(
        'OpenAI client not initialized',
      );
    });
  });

  describe('isAvailable', () => {
    it('should return true when OpenAI client is initialized', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when OpenAI client is not initialized', () => {
      (service as any).openai = null;
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should initialize OpenAI client when API key is present', () => {
      const newService = new AnalysisService(configService);
      newService.onModuleInit();
      expect((newService as any).openai).toBeDefined();
    });

    it('should not initialize OpenAI client when API key is missing', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const newService = new AnalysisService(configService);
      newService.onModuleInit();

      expect((newService as any).openai).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
