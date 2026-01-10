import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { RagController } from '../../../src/rag/rag.controller';
import { RagService } from '../../../src/rag/rag.service';

describe('RagController', () => {
  let controller: RagController;
  let ragService: RagService;

  const mockSearchResult = [
    {
      content: 'Test content',
      source: 'doc1.md',
      sourceType: 'document',
      relevanceScore: 0.9,
      metadata: {},
    },
  ];

  const mockQueryResult = {
    answer: 'This is the answer',
    sources: mockSearchResult,
    model: 'gpt-4o-mini',
    tokensUsed: 200,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RagController],
      providers: [
        {
          provide: RagService,
          useValue: {
            indexDocument: jest.fn().mockResolvedValue({
              success: true,
              documentId: 'doc-123',
            }),
            indexProjectDocument: jest.fn().mockResolvedValue({
              success: true,
              chunksCreated: 5,
              collection: 'project_123',
            }),
            search: jest.fn().mockResolvedValue(mockSearchResult),
            query: jest.fn().mockResolvedValue(mockQueryResult),
            listCollections: jest.fn().mockResolvedValue(['default', 'project_1']),
            deleteCollection: jest.fn().mockResolvedValue(undefined),
            getStats: jest.fn().mockResolvedValue({
              totalCollections: 2,
              collections: {},
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<RagController>(RagController);
    ragService = module.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('indexDocument', () => {
    it('should index document successfully', async () => {
      const result = await controller.indexDocument({
        content: 'Test content',
        source: 'test.md',
      });
      expect(result.success).toBe(true);
      expect(result.documentId).toBe('doc-123');
    });

    it('should pass all parameters to service', async () => {
      await controller.indexDocument({
        content: 'Content',
        source: 'file.md',
        sourceType: 'markdown',
        metadata: { author: 'test' },
        collection: 'custom',
      });

      expect(ragService.indexDocument).toHaveBeenCalledWith(
        'Content',
        'file.md',
        'markdown',
        { author: 'test' },
        'custom',
      );
    });

    it('should use defaults for optional parameters', async () => {
      await controller.indexDocument({
        content: 'Content',
        source: 'file.md',
      });

      expect(ragService.indexDocument).toHaveBeenCalledWith(
        'Content',
        'file.md',
        'document',
        {},
        'default',
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(ragService, 'indexDocument')
        .mockRejectedValue(new Error('Indexing failed'));

      await expect(
        controller.indexDocument({
          content: 'Content',
          source: 'file.md',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('indexProjectDocument', () => {
    it('should index project document successfully', async () => {
      const result = await controller.indexProjectDocument({
        documentId: 'doc-123',
        projectId: 'proj-456',
        filename: 'readme.md',
        content: 'Project content',
        fileType: 'markdown',
      });
      expect(result.success).toBe(true);
      expect(result.chunksCreated).toBe(5);
    });

    it('should pass chunking parameters to service', async () => {
      await controller.indexProjectDocument({
        documentId: 'doc-123',
        projectId: 'proj-456',
        filename: 'readme.md',
        content: 'Content',
        fileType: 'markdown',
        chunkSize: 500,
        chunkOverlap: 100,
      });

      expect(ragService.indexProjectDocument).toHaveBeenCalledWith(
        'doc-123',
        'proj-456',
        'readme.md',
        'Content',
        'markdown',
        500,
        100,
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(ragService, 'indexProjectDocument')
        .mockRejectedValue(new Error('Indexing failed'));

      await expect(
        controller.indexProjectDocument({
          documentId: 'doc-123',
          projectId: 'proj-456',
          filename: 'readme.md',
          content: 'Content',
          fileType: 'markdown',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('search', () => {
    it('should return search results', async () => {
      const result = await controller.search({
        query: 'test query',
      });
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.totalFound).toBe(1);
    });

    it('should pass all parameters to service', async () => {
      await controller.search({
        query: 'test',
        collection: 'custom',
        limit: 10,
        minScore: 0.7,
        sourceTypes: ['document', 'code'],
      });

      expect(ragService.search).toHaveBeenCalledWith(
        'test',
        'custom',
        10,
        0.7,
        ['document', 'code'],
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(ragService, 'search')
        .mockRejectedValue(new Error('Search failed'));

      await expect(
        controller.search({ query: 'test' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('query', () => {
    it('should return query results with answer', async () => {
      const result = await controller.query({
        query: 'What is this about?',
      });
      expect(result.success).toBe(true);
      expect(result.answer).toBe('This is the answer');
      expect(result.sources).toHaveLength(1);
    });

    it('should pass all parameters to service', async () => {
      await controller.query({
        query: 'Question',
        collection: 'custom',
        contextLimit: 10,
        model: 'gpt-4',
        systemPrompt: 'Custom prompt',
      });

      expect(ragService.query).toHaveBeenCalledWith(
        'Question',
        'custom',
        10,
        'gpt-4',
        'Custom prompt',
      );
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(ragService, 'query')
        .mockRejectedValue(new Error('Query failed'));

      await expect(
        controller.query({ query: 'test' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('listCollections', () => {
    it('should return list of collections', async () => {
      const result = await controller.listCollections();
      expect(result.success).toBe(true);
      expect(result.collections).toEqual(['default', 'project_1']);
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(ragService, 'listCollections')
        .mockRejectedValue(new Error('Failed'));

      await expect(controller.listCollections()).rejects.toThrow(HttpException);
    });
  });

  describe('deleteCollection', () => {
    it('should delete collection successfully', async () => {
      const result = await controller.deleteCollection('test-collection');
      expect(result.success).toBe(true);
      expect(result.message).toContain('test-collection');
    });

    it('should call service with collection name', async () => {
      await controller.deleteCollection('my-collection');
      expect(ragService.deleteCollection).toHaveBeenCalledWith('my-collection');
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(ragService, 'deleteCollection')
        .mockRejectedValue(new Error('Delete failed'));

      await expect(
        controller.deleteCollection('test'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getStats', () => {
    it('should return collection stats', async () => {
      const result = await controller.getStats();
      expect(result.success).toBe(true);
      expect(result.stats).toHaveProperty('totalCollections');
    });

    it('should throw HttpException on service error', async () => {
      jest
        .spyOn(ragService, 'getStats')
        .mockRejectedValue(new Error('Stats failed'));

      await expect(controller.getStats()).rejects.toThrow(HttpException);
    });
  });
});
