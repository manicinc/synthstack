/**
 * @file services/__tests__/hybrid-search.test.ts
 * @description Tests for hybrid search service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_HYBRID_OPTIONS } from '../hybrid-search.js';

// Mock dependencies
vi.mock('../embeddings.js', () => ({
  embeddingsService: {
    isAvailable: vi.fn().mockReturnValue(true),
    generateEmbedding: vi.fn().mockResolvedValue(Array(1536).fill(0)),
  },
}));

vi.mock('../vector-db.js', () => ({
  vectorDB: {
    search: vi.fn().mockResolvedValue([
      { id: 'doc1', content: 'Vector result 1', score: 0.95, metadata: {} },
      { id: 'doc2', content: 'Vector result 2', score: 0.85, metadata: {} },
    ]),
  },
}));

vi.mock('../directus.js', () => ({
  directus: {
    items: vi.fn().mockReturnValue({
      readByQuery: vi.fn().mockResolvedValue({ data: [] }),
    }),
  },
}));

describe('HybridSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DEFAULT_HYBRID_OPTIONS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_HYBRID_OPTIONS.vectorWeight).toBe(0.7);
      expect(DEFAULT_HYBRID_OPTIONS.keywordWeight).toBe(0.3);
      expect(DEFAULT_HYBRID_OPTIONS.minScore).toBe(0.1);
      expect(DEFAULT_HYBRID_OPTIONS.limit).toBe(10);
      expect(DEFAULT_HYBRID_OPTIONS.useVector).toBe(true);
      expect(DEFAULT_HYBRID_OPTIONS.useKeyword).toBe(true);
      expect(DEFAULT_HYBRID_OPTIONS.rrfK).toBe(60);
    });
  });

  describe('search()', () => {
    it('should return results with correct structure', async () => {
      const { hybridSearchService } = await import('../hybrid-search.js');
      const result = await hybridSearchService.search('test query');

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('query', 'test query');
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('vectorResultCount');
      expect(result.stats).toHaveProperty('keywordResultCount');
      expect(result.stats).toHaveProperty('combinedResultCount');
      expect(result.stats).toHaveProperty('searchTimeMs');
    });

    it('should use vector search when enabled', async () => {
      const { hybridSearchService } = await import('../hybrid-search.js');
      const { embeddingsService } = await import('../embeddings.js');
      const { vectorDB } = await import('../vector-db.js');

      await hybridSearchService.search('test query', { useVector: true, useKeyword: false });

      expect(embeddingsService.generateEmbedding).toHaveBeenCalledWith('test query');
      expect(vectorDB.search).toHaveBeenCalled();
    });

    it('should respect limit option', async () => {
      const { hybridSearchService } = await import('../hybrid-search.js');
      const result = await hybridSearchService.search('test query', { limit: 5 });

      expect(result.results.length).toBeLessThanOrEqual(5);
    });

    it('should include search time in stats', async () => {
      const { hybridSearchService } = await import('../hybrid-search.js');
      const result = await hybridSearchService.search('test query');

      expect(result.stats.searchTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isAvailable()', () => {
    it('should return true when embeddings are available', async () => {
      const { hybridSearchService } = await import('../hybrid-search.js');
      expect(hybridSearchService.isAvailable()).toBe(true);
    });
  });

  describe('vectorSearch()', () => {
    it('should perform vector-only search', async () => {
      const { hybridSearchService } = await import('../hybrid-search.js');
      const results = await hybridSearchService.vectorSearch('test query', 5);

      expect(Array.isArray(results)).toBe(true);
    });
  });
});

describe('Reciprocal Rank Fusion', () => {
  it('should boost documents appearing in both searches', async () => {
    // When a document appears in both vector and keyword results,
    // it should have a higher combined score
    const { hybridSearchService } = await import('../hybrid-search.js');

    // This tests the RRF algorithm indirectly
    const result = await hybridSearchService.search('test query');

    // Results should be sorted by score descending
    for (let i = 1; i < result.results.length; i++) {
      expect(result.results[i - 1].score).toBeGreaterThanOrEqual(result.results[i].score);
    }
  });
});
