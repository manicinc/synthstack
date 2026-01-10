import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsService } from '../../../src/embeddings/embeddings.service';

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;
  let configService: ConfigService;

  const mockEmbedding = Array(1536).fill(0.1);

  const mockOpenAI = {
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { total_tokens: 10 },
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'openaiApiKey') return 'test-api-key';
              if (key === 'embeddingModel') return defaultValue || 'text-embedding-3-small';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmbeddingsService>(EmbeddingsService);
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

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      const result = await service.generateEmbedding('Hello world');
      expect(result.embedding).toEqual(mockEmbedding);
      expect(result.model).toBe('text-embedding-3-small');
      expect(result.dimensions).toBe(1536);
    });

    it('should call OpenAI API with correct parameters', async () => {
      await service.generateEmbedding('Test text', 'text-embedding-3-large');
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: 'Test text',
        encoding_format: 'float',
      });
    });

    it('should use default model when not specified', async () => {
      await service.generateEmbedding('Test text');
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
        }),
      );
    });

    it('should trim input text', async () => {
      await service.generateEmbedding('  Hello world  ');
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'Hello world',
        }),
      );
    });

    it('should throw error for empty text', async () => {
      await expect(service.generateEmbedding('')).rejects.toThrow(
        'Cannot generate embedding for empty text',
      );
    });

    it('should throw error for whitespace-only text', async () => {
      await expect(service.generateEmbedding('   ')).rejects.toThrow(
        'Cannot generate embedding for empty text',
      );
    });

    it('should throw error when OpenAI client not initialized', async () => {
      (service as any).openai = null;
      await expect(service.generateEmbedding('test')).rejects.toThrow(
        'OpenAI client not initialized',
      );
    });

    it('should throw error when no embedding returned', async () => {
      mockOpenAI.embeddings.create.mockResolvedValueOnce({ data: [] });
      await expect(service.generateEmbedding('test')).rejects.toThrow(
        'No embedding returned from OpenAI',
      );
    });
  });

  describe('generateEmbeddings', () => {
    beforeEach(() => {
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding }, { embedding: mockEmbedding }],
      });
    });

    it('should generate embeddings for multiple texts', async () => {
      const result = await service.generateEmbeddings(['Hello', 'World']);
      expect(result.embeddings).toHaveLength(2);
      expect(result.model).toBe('text-embedding-3-small');
    });

    it('should return empty array for empty input', async () => {
      const result = await service.generateEmbeddings([]);
      expect(result.embeddings).toEqual([]);
      expect(result.dimensions).toBe(0);
    });

    it('should filter out empty texts', async () => {
      await service.generateEmbeddings(['Hello', '', 'World', '  ']);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: ['Hello', 'World'],
        }),
      );
    });

    it('should throw error when all texts are empty', async () => {
      await expect(service.generateEmbeddings(['', '  '])).rejects.toThrow(
        'Cannot generate embeddings for empty texts',
      );
    });

    it('should throw error when OpenAI client not initialized', async () => {
      (service as any).openai = null;
      await expect(service.generateEmbeddings(['test'])).rejects.toThrow(
        'OpenAI client not initialized',
      );
    });

    it('should handle batch size of 100', async () => {
      const texts = Array(150).fill('text');
      mockOpenAI.embeddings.create
        .mockResolvedValueOnce({
          data: Array(100).fill({ embedding: mockEmbedding }),
        })
        .mockResolvedValueOnce({
          data: Array(50).fill({ embedding: mockEmbedding }),
        });

      const result = await service.generateEmbeddings(texts);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2);
      expect(result.embeddings).toHaveLength(150);
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate cosine similarity between two texts', async () => {
      const result = await service.calculateSimilarity('Hello', 'World');
      expect(result.similarity).toBeCloseTo(1.0);
      expect(result.model).toBe('text-embedding-3-small');
    });

    it('should call generateEmbedding for both texts', async () => {
      const spy = jest.spyOn(service, 'generateEmbedding');
      await service.calculateSimilarity('Text 1', 'Text 2');
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should pass model parameter to generateEmbedding', async () => {
      const spy = jest.spyOn(service, 'generateEmbedding');
      await service.calculateSimilarity('Text 1', 'Text 2', 'text-embedding-3-large');
      expect(spy).toHaveBeenCalledWith('Text 1', 'text-embedding-3-large');
      expect(spy).toHaveBeenCalledWith('Text 2', 'text-embedding-3-large');
    });
  });

  describe('cosineSimilarity (private)', () => {
    it('should return 1.0 for identical vectors', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      const similarity = (service as any).cosineSimilarity(a, b);
      expect(similarity).toBe(1.0);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const similarity = (service as any).cosineSimilarity(a, b);
      expect(similarity).toBe(0);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];
      const similarity = (service as any).cosineSimilarity(a, b);
      expect(similarity).toBe(-1);
    });

    it('should throw error for vectors of different lengths', () => {
      const a = [1, 0, 0];
      const b = [1, 0];
      expect(() => (service as any).cosineSimilarity(a, b)).toThrow(
        'Vectors must have the same length',
      );
    });

    it('should return 0 for zero vectors', () => {
      const a = [0, 0, 0];
      const b = [1, 0, 0];
      const similarity = (service as any).cosineSimilarity(a, b);
      expect(similarity).toBe(0);
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', () => {
      const models = service.getAvailableModels();
      expect(models).toHaveLength(3);
    });

    it('should include text-embedding-3-small', () => {
      const models = service.getAvailableModels();
      const small = models.find((m) => m.id === 'text-embedding-3-small');
      expect(small).toBeDefined();
      expect(small?.dimensions).toBe(1536);
    });

    it('should include text-embedding-3-large', () => {
      const models = service.getAvailableModels();
      const large = models.find((m) => m.id === 'text-embedding-3-large');
      expect(large).toBeDefined();
      expect(large?.dimensions).toBe(3072);
    });

    it('should include text-embedding-ada-002', () => {
      const models = service.getAvailableModels();
      const ada = models.find((m) => m.id === 'text-embedding-ada-002');
      expect(ada).toBeDefined();
    });

    it('should include model details', () => {
      const models = service.getAvailableModels();
      models.forEach((model) => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('dimensions');
        expect(model).toHaveProperty('maxTokens');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('description');
      });
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
      const newService = new EmbeddingsService(configService);
      newService.onModuleInit();
      expect((newService as any).openai).toBeDefined();
    });

    it('should not initialize OpenAI client when API key is missing', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const newService = new EmbeddingsService(configService);
      newService.onModuleInit();

      expect((newService as any).openai).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
