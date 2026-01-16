import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { EmbeddingsController } from '../../../src/embeddings/embeddings.controller';
import { EmbeddingsService } from '../../../src/embeddings/embeddings.service';

describe('EmbeddingsController', () => {
  let controller: EmbeddingsController;
  let embeddingsService: EmbeddingsService;

  const mockEmbedding = Array(1536).fill(0.1);
  const mockModels = [
    {
      id: 'text-embedding-3-small',
      dimensions: 1536,
      maxTokens: 8191,
      provider: 'openai',
      description: 'Most cost-effective embedding model',
    },
    {
      id: 'text-embedding-3-large',
      dimensions: 3072,
      maxTokens: 8191,
      provider: 'openai',
      description: 'Highest accuracy embedding model',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmbeddingsController],
      providers: [
        {
          provide: EmbeddingsService,
          useValue: {
            generateEmbedding: jest.fn().mockResolvedValue({
              embedding: mockEmbedding,
              model: 'text-embedding-3-small',
              dimensions: 1536,
            }),
            generateEmbeddings: jest.fn().mockResolvedValue({
              embeddings: [mockEmbedding, mockEmbedding],
              model: 'text-embedding-3-small',
              dimensions: 1536,
            }),
            calculateSimilarity: jest.fn().mockResolvedValue({
              similarity: 0.85,
              model: 'text-embedding-3-small',
            }),
            getAvailableModels: jest.fn().mockReturnValue(mockModels),
          },
        },
      ],
    }).compile();

    controller = module.get<EmbeddingsController>(EmbeddingsController);
    embeddingsService = module.get<EmbeddingsService>(EmbeddingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for single text', async () => {
      const result = await controller.generateEmbedding({ text: 'Hello world' });
      expect(result.success).toBe(true);
      expect(result.embedding).toHaveLength(1536);
      expect(result.model).toBe('text-embedding-3-small');
      expect(result.dimensions).toBe(1536);
    });

    it('should pass model parameter to service', async () => {
      await controller.generateEmbedding({
        text: 'Hello world',
        model: 'text-embedding-3-large',
      });
      expect(embeddingsService.generateEmbedding).toHaveBeenCalledWith(
        'Hello world',
        'text-embedding-3-large',
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(embeddingsService, 'generateEmbedding')
        .mockRejectedValue(new Error('API error'));

      await expect(
        controller.generateEmbedding({ text: 'Hello' }),
      ).rejects.toThrow(HttpException);
    });

    it('should include error message in exception', async () => {
      jest
        .spyOn(embeddingsService, 'generateEmbedding')
        .mockRejectedValue(new Error('OpenAI API error'));

      try {
        await controller.generateEmbedding({ text: 'Hello' });
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
  });

  describe('batchGenerateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const result = await controller.batchGenerateEmbeddings({
        texts: ['Hello', 'World'],
      });
      expect(result.success).toBe(true);
      expect(result.embeddings).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should reject more than 100 texts', async () => {
      const texts = Array(101).fill('text');
      await expect(
        controller.batchGenerateEmbeddings({ texts }),
      ).rejects.toThrow(HttpException);
    });

    it('should accept exactly 100 texts', async () => {
      const texts = Array(100).fill('text');
      jest.spyOn(embeddingsService, 'generateEmbeddings').mockResolvedValue({
        embeddings: Array(100).fill(mockEmbedding),
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      const result = await controller.batchGenerateEmbeddings({ texts });
      expect(result.success).toBe(true);
      expect(result.count).toBe(100);
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(embeddingsService, 'generateEmbeddings')
        .mockRejectedValue(new Error('Batch error'));

      await expect(
        controller.batchGenerateEmbeddings({ texts: ['test'] }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate similarity between two texts', async () => {
      const result = await controller.calculateSimilarity({
        text1: 'Hello',
        text2: 'Hi there',
      });
      expect(result.success).toBe(true);
      expect(result.similarity).toBe(0.85);
      expect(result.model).toBe('text-embedding-3-small');
    });

    it('should pass model parameter to service', async () => {
      await controller.calculateSimilarity({
        text1: 'Hello',
        text2: 'Hi',
        model: 'text-embedding-3-large',
      });
      expect(embeddingsService.calculateSimilarity).toHaveBeenCalledWith(
        'Hello',
        'Hi',
        'text-embedding-3-large',
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(embeddingsService, 'calculateSimilarity')
        .mockRejectedValue(new Error('Similarity error'));

      await expect(
        controller.calculateSimilarity({ text1: 'Hello', text2: 'Hi' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('listModels', () => {
    it('should return available models', () => {
      const result = controller.listModels();
      expect(result.success).toBe(true);
      expect(result.models).toEqual(mockModels);
    });

    it('should include model details', () => {
      const result = controller.listModels();
      expect(result.models[0]).toHaveProperty('id');
      expect(result.models[0]).toHaveProperty('dimensions');
      expect(result.models[0]).toHaveProperty('maxTokens');
      expect(result.models[0]).toHaveProperty('provider');
    });
  });
});
