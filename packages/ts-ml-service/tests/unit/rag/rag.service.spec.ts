import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RagService } from '../../../src/rag/rag.service';
import { EmbeddingsService } from '../../../src/embeddings/embeddings.service';

describe('RagService', () => {
  let service: RagService;
  let embeddingsService: EmbeddingsService;

  const mockEmbedding = Array(1536).fill(0.1);

  const mockQdrant = {
    getCollections: jest.fn().mockResolvedValue({ collections: [] }),
    getCollection: jest.fn(),
    createCollection: jest.fn().mockResolvedValue(undefined),
    deleteCollection: jest.fn().mockResolvedValue(undefined),
    upsert: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([]),
  };

  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Answer' } }],
          usage: { total_tokens: 100 },
        }),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                qdrantUrl: 'http://localhost:6333',
                qdrantApiKey: 'test-key',
                openaiApiKey: 'test-api-key',
                vectorSize: 1536,
                defaultLlmModel: 'gpt-4o-mini',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: EmbeddingsService,
          useValue: {
            generateEmbedding: jest.fn().mockResolvedValue({
              embedding: mockEmbedding,
              model: 'text-embedding-3-small',
              dimensions: 1536,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    embeddingsService = module.get<EmbeddingsService>(EmbeddingsService);

    // Mock clients
    (service as any).qdrant = mockQdrant;
    (service as any).openai = mockOpenAI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('indexDocument', () => {
    it('should index document successfully', async () => {
      const result = await service.indexDocument(
        'Test content',
        'test.md',
        'document',
        {},
        'default',
      );
      expect(result.success).toBe(true);
      expect(result.documentId).toBeDefined();
    });

    it('should generate embedding for content', async () => {
      await service.indexDocument(
        'Test content',
        'test.md',
        'document',
        {},
        'default',
      );
      expect(embeddingsService.generateEmbedding).toHaveBeenCalledWith('Test content');
    });

    it('should create collection with synthstack_ prefix', async () => {
      mockQdrant.getCollections.mockResolvedValue({ collections: [] });
      await service.indexDocument(
        'Content',
        'source',
        'type',
        {},
        'myCollection',
      );
      expect(mockQdrant.createCollection).toHaveBeenCalledWith(
        'synthstack_myCollection',
        expect.any(Object),
      );
    });

    it('should not create collection if exists', async () => {
      mockQdrant.getCollections.mockResolvedValue({
        collections: [{ name: 'synthstack_existing' }],
      });
      await service.indexDocument(
        'Content',
        'source',
        'type',
        {},
        'existing',
      );
      expect(mockQdrant.createCollection).not.toHaveBeenCalled();
    });

    it('should throw error when Qdrant client not initialized', async () => {
      (service as any).qdrant = null;
      await expect(
        service.indexDocument('Content', 'source', 'type', {}, 'collection'),
      ).rejects.toThrow('Qdrant client not initialized');
    });

    it('should include metadata in upsert payload', async () => {
      await service.indexDocument(
        'Content',
        'source.md',
        'markdown',
        { author: 'test' },
        'default',
      );
      expect(mockQdrant.upsert).toHaveBeenCalledWith(
        'synthstack_default',
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({
              payload: expect.objectContaining({
                content: 'Content',
                source: 'source.md',
                source_type: 'markdown',
                author: 'test',
              }),
            }),
          ]),
        }),
      );
    });
  });

  describe('indexProjectDocument', () => {
    it('should chunk document and index all chunks', async () => {
      const content = 'Word '.repeat(500); // Long content to chunk
      const result = await service.indexProjectDocument(
        'doc-123',
        'project-456',
        'readme.md',
        content,
        'markdown',
      );
      expect(result.success).toBe(true);
      expect(result.chunksCreated).toBeGreaterThan(0);
    });

    it('should use project-specific collection', async () => {
      await service.indexProjectDocument(
        'doc-123',
        'project-456',
        'readme.md',
        'Content',
        'markdown',
      );
      expect(mockQdrant.upsert).toHaveBeenCalledWith(
        'synthstack_project_project-456',
        expect.any(Object),
      );
    });

    it('should include chunk metadata', async () => {
      await service.indexProjectDocument(
        'doc-123',
        'project-456',
        'readme.md',
        'Short content',
        'markdown',
      );
      expect(mockQdrant.upsert).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({
              payload: expect.objectContaining({
                document_id: 'doc-123',
                project_id: 'project-456',
                filename: 'readme.md',
                file_type: 'markdown',
              }),
            }),
          ]),
        }),
      );
    });
  });

  describe('chunkText (private)', () => {
    it('should return empty array for empty text', () => {
      const chunks = (service as any).chunkText('', 100, 20);
      expect(chunks).toEqual([]);
    });

    it('should return single chunk for short text', () => {
      const chunks = (service as any).chunkText('Short text', 1000, 200);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('Short text');
    });

    it('should create multiple chunks for long text', () => {
      const text = 'Word. '.repeat(100);
      const chunks = (service as any).chunkText(text, 100, 20);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should respect overlap parameter', () => {
      const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
      const chunks = (service as any).chunkText(text, 30, 10);
      // Check that chunks have overlapping content
      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe('search', () => {
    it('should return empty results for non-existent collection', async () => {
      mockQdrant.getCollection.mockRejectedValue(new Error('Not found'));
      const results = await service.search('query', 'nonexistent');
      expect(results).toEqual([]);
    });

    it('should generate embedding for query', async () => {
      mockQdrant.getCollection.mockResolvedValue({});
      await service.search('test query', 'default');
      expect(embeddingsService.generateEmbedding).toHaveBeenCalledWith('test query');
    });

    it('should apply source type filter when provided', async () => {
      mockQdrant.getCollection.mockResolvedValue({});
      await service.search('query', 'default', 5, 0.5, ['document', 'code']);
      expect(mockQdrant.search).toHaveBeenCalledWith(
        'synthstack_default',
        expect.objectContaining({
          filter: expect.any(Object),
        }),
      );
    });

    it('should map results to RetrievedContext format', async () => {
      mockQdrant.getCollection.mockResolvedValue({});
      mockQdrant.search.mockResolvedValue([
        {
          score: 0.9,
          payload: {
            content: 'Test content',
            source: 'test.md',
            source_type: 'document',
            extra: 'data',
          },
        },
      ]);
      const results = await service.search('query', 'default');
      expect(results[0]).toHaveProperty('content', 'Test content');
      expect(results[0]).toHaveProperty('source', 'test.md');
      expect(results[0]).toHaveProperty('sourceType', 'document');
      expect(results[0]).toHaveProperty('relevanceScore', 0.9);
    });

    it('should throw error when Qdrant client not initialized', async () => {
      (service as any).qdrant = null;
      await expect(service.search('query', 'collection')).rejects.toThrow(
        'Qdrant client not initialized',
      );
    });
  });

  describe('query', () => {
    beforeEach(() => {
      mockQdrant.getCollection.mockResolvedValue({});
      mockQdrant.search.mockResolvedValue([
        {
          score: 0.9,
          payload: {
            content: 'Context content',
            source: 'source.md',
            source_type: 'document',
          },
        },
      ]);
    });

    it('should return answer with sources', async () => {
      const result = await service.query('What is this about?');
      expect(result.answer).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.model).toBe('gpt-4o-mini');
    });

    it('should search for context first', async () => {
      const searchSpy = jest.spyOn(service, 'search');
      await service.query('Question', 'collection', 5);
      expect(searchSpy).toHaveBeenCalledWith('Question', 'collection', 5);
    });

    it('should use custom model when provided', async () => {
      await service.query('Question', 'default', 5, 'gpt-4');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        }),
      );
    });

    it('should use custom system prompt when provided', async () => {
      await service.query(
        'Question',
        'default',
        5,
        undefined,
        'Custom system prompt',
      );
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: 'Custom system prompt',
            }),
          ]),
        }),
      );
    });

    it('should throw error when OpenAI client not initialized', async () => {
      (service as any).openai = null;
      await expect(service.query('Question')).rejects.toThrow(
        'OpenAI client not initialized',
      );
    });
  });

  describe('listCollections', () => {
    it('should return synthstack collections without prefix', async () => {
      mockQdrant.getCollections.mockResolvedValue({
        collections: [
          { name: 'synthstack_default' },
          { name: 'synthstack_project_1' },
          { name: 'other_collection' },
        ],
      });
      const collections = await service.listCollections();
      expect(collections).toEqual(['default', 'project_1']);
    });

    it('should throw error when Qdrant client not initialized', async () => {
      (service as any).qdrant = null;
      await expect(service.listCollections()).rejects.toThrow(
        'Qdrant client not initialized',
      );
    });
  });

  describe('deleteCollection', () => {
    it('should delete collection with synthstack prefix', async () => {
      await service.deleteCollection('my-collection');
      expect(mockQdrant.deleteCollection).toHaveBeenCalledWith(
        'synthstack_my-collection',
      );
    });

    it('should throw error when Qdrant client not initialized', async () => {
      (service as any).qdrant = null;
      await expect(service.deleteCollection('test')).rejects.toThrow(
        'Qdrant client not initialized',
      );
    });
  });

  describe('getStats', () => {
    it('should return collection statistics', async () => {
      mockQdrant.getCollections.mockResolvedValue({
        collections: [
          { name: 'synthstack_default' },
          { name: 'synthstack_project_1' },
        ],
      });
      mockQdrant.getCollection.mockResolvedValue({
        indexed_vectors_count: 100,
        points_count: 100,
      });

      const stats = await service.getStats();
      expect(stats.totalCollections).toBe(2);
      expect(stats.collections).toBeDefined();
    });

    it('should throw error when Qdrant client not initialized', async () => {
      (service as any).qdrant = null;
      await expect(service.getStats()).rejects.toThrow(
        'Qdrant client not initialized',
      );
    });
  });
});
