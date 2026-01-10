/**
 * @file services/__tests__/web-search.test.ts
 * @description Tests for web search service
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

// Mock the config module before importing web-search
vi.mock('../../config/index.js', () => ({
  config: {
    serpapi: {
      apiKey: 'test-serpapi-key',
      monthlyLimit: 100,
    },
  },
}));

// Mock the directus client
vi.mock('../directus.js', () => ({
  directusClient: {
    items: vi.fn(() => ({
      readByQuery: vi.fn().mockResolvedValue({ data: [] }),
      createOne: vi.fn().mockResolvedValue({}),
      updateOne: vi.fn().mockResolvedValue({}),
    })),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks are set up
import { webSearchService, type WebSearchOptions } from '../web-search.js';

describe('WebSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when API key is configured', () => {
      expect(webSearchService.isAvailable()).toBe(true);
    });
  });

  describe('search', () => {
    it('should perform a search and return structured results', async () => {
      const mockResponse = {
        organic_results: [
          {
            title: 'Test Result 1',
            link: 'https://example.com/1',
            snippet: 'This is the first test result snippet.',
            displayed_link: 'example.com › 1',
          },
          {
            title: 'Test Result 2',
            link: 'https://example.com/2',
            snippet: 'This is the second test result snippet.',
            displayed_link: 'example.com › 2',
          },
        ],
        search_information: {
          total_results: 1000000,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await webSearchService.search('test query', { numResults: 2 });

      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({
        position: 1,
        title: 'Test Result 1',
        url: 'https://example.com/1',
        snippet: 'This is the first test result snippet.',
      });
      expect(result.totalResults).toBe(1000000);
      expect(result.quotaRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should use default options when none provided', async () => {
      const mockResponse = {
        organic_results: Array(5).fill({
          title: 'Test',
          link: 'https://example.com',
          snippet: 'Snippet',
          displayed_link: 'example.com',
        }),
        search_information: {
          total_results: 100,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await webSearchService.search('default query');

      expect(result.results).toHaveLength(5); // Default numResults
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('engine=google');
      expect(callUrl).toContain('q=default+query');
    });

    it('should handle related searches when requested', async () => {
      const mockResponse = {
        organic_results: [
          {
            title: 'Test',
            link: 'https://example.com',
            snippet: 'Snippet',
            displayed_link: 'example.com',
          },
        ],
        search_information: { total_results: 100 },
        related_searches: [
          { query: 'related query 1' },
          { query: 'related query 2' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await webSearchService.search('test', {
        numResults: 1,
        includeRelated: true,
      });

      expect(result.relatedSearches).toEqual(['related query 1', 'related query 2']);
    });

    it('should throw error when API response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(webSearchService.search('test')).rejects.toThrow(
        'Web search failed: 500 Internal Server Error'
      );
    });

    it('should exclude snippets when includeSnippets is false', async () => {
      const mockResponse = {
        organic_results: [
          {
            title: 'Test',
            link: 'https://example.com',
            snippet: 'This should not appear',
            displayed_link: 'example.com',
          },
        ],
        search_information: { total_results: 100 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await webSearchService.search('test', {
        numResults: 1,
        includeSnippets: false,
      });

      expect(result.results[0].snippet).toBe('');
    });

    it('should parse string total_results correctly', async () => {
      const mockResponse = {
        organic_results: [
          {
            title: 'Test',
            link: 'https://example.com',
            snippet: 'Snippet',
            displayed_link: 'example.com',
          },
        ],
        search_information: {
          total_results: 'About 1,234,567 results',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await webSearchService.search('test', { numResults: 1 });

      expect(result.totalResults).toBe(1234567);
    });

    it('should handle empty organic_results', async () => {
      const mockResponse = {
        organic_results: [],
        search_information: { total_results: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await webSearchService.search('no results query');

      expect(result.results).toHaveLength(0);
      expect(result.totalResults).toBe(0);
    });
  });

  describe('searchAndFormat', () => {
    it('should return formatted context for LLM consumption', async () => {
      const mockResponse = {
        organic_results: [
          {
            title: 'AI Trends 2026',
            link: 'https://example.com/ai-trends',
            snippet: 'The latest trends in artificial intelligence.',
            displayed_link: 'example.com › ai-trends',
          },
        ],
        search_information: { total_results: 50000 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await webSearchService.searchAndFormat('AI trends 2026');

      expect(result.summary).toContain('Web search results for: "AI trends 2026"');
      expect(result.summary).toContain('[1] AI Trends 2026');
      expect(result.summary).toContain('URL: https://example.com/ai-trends');
      expect(result.summary).toContain('The latest trends in artificial intelligence.');

      expect(result.citations).toHaveLength(1);
      expect(result.citations[0]).toBe('[1] AI Trends 2026 - https://example.com/ai-trends');

      expect(result.raw).toHaveLength(1);
    });

    it('should include related searches in summary when available', async () => {
      const mockResponse = {
        organic_results: [
          {
            title: 'Test',
            link: 'https://example.com',
            snippet: 'Snippet',
            displayed_link: 'example.com',
          },
        ],
        search_information: { total_results: 100 },
        related_searches: [{ query: 'related 1' }, { query: 'related 2' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await webSearchService.searchAndFormat('test', {
        includeRelated: true,
      });

      expect(result.summary).toContain('Related searches: related 1, related 2');
    });
  });

  describe('quickSearch', () => {
    it('should return just the formatted summary string', async () => {
      const mockResponse = {
        organic_results: [
          {
            title: 'Quick Result',
            link: 'https://example.com/quick',
            snippet: 'A quick result.',
            displayed_link: 'example.com',
          },
        ],
        search_information: { total_results: 10 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await webSearchService.quickSearch('quick query');

      expect(typeof result).toBe('string');
      expect(result).toContain('Web search results');
      expect(result).toContain('Quick Result');
    });

    it('should return error message on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const result = await webSearchService.quickSearch('failing query');

      expect(result).toContain('Web search failed');
    });
  });

  describe('shouldTriggerSearch', () => {
    it('should return true for queries with time-sensitive keywords', () => {
      expect(webSearchService.shouldTriggerSearch('What are the latest AI trends?')).toBe(true);
      expect(webSearchService.shouldTriggerSearch('Current crypto prices')).toBe(true);
      expect(webSearchService.shouldTriggerSearch('News about Tesla')).toBe(true);
      expect(webSearchService.shouldTriggerSearch('What happened today in tech?')).toBe(true);
    });

    it('should return true for year-specific queries', () => {
      expect(webSearchService.shouldTriggerSearch('Best laptops 2026')).toBe(true);
      expect(webSearchService.shouldTriggerSearch('Election results 2024')).toBe(true);
    });

    it('should return true for market/research queries', () => {
      expect(webSearchService.shouldTriggerSearch('Market analysis for SaaS')).toBe(true);
      expect(webSearchService.shouldTriggerSearch('Competitor analysis for CRM')).toBe(true);
      expect(webSearchService.shouldTriggerSearch('Industry statistics')).toBe(true);
    });

    it('should return true for comparison queries', () => {
      expect(webSearchService.shouldTriggerSearch('React vs Vue comparison')).toBe(true);
      expect(webSearchService.shouldTriggerSearch('AWS versus Azure')).toBe(true);
    });

    it('should return true for pricing queries', () => {
      expect(webSearchService.shouldTriggerSearch('How much does Slack cost?')).toBe(true);
      expect(webSearchService.shouldTriggerSearch('Price of gold today')).toBe(true);
    });

    it('should return false for pure technical/coding questions', () => {
      expect(webSearchService.shouldTriggerSearch('How to implement a function in JavaScript')).toBe(false);
      expect(webSearchService.shouldTriggerSearch('Fix this error in my code')).toBe(false);
      expect(webSearchService.shouldTriggerSearch('Syntax for Python list comprehension')).toBe(false);
    });

    it('should return false for generic questions without triggers', () => {
      expect(webSearchService.shouldTriggerSearch('Hello, how are you?')).toBe(false);
      expect(webSearchService.shouldTriggerSearch('Tell me a joke')).toBe(false);
    });

    it('should handle question-style queries appropriately', () => {
      // General "what/who/where" questions (non-technical) trigger search
      expect(webSearchService.shouldTriggerSearch('What is the capital of France?')).toBe(true);
      expect(webSearchService.shouldTriggerSearch('Who is the CEO of Apple?')).toBe(true);

      // Technical questions should NOT trigger search
      expect(webSearchService.shouldTriggerSearch('What is this code doing?')).toBe(false);
    });
  });
});

describe('WebSearchService - Unconfigured State', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should throw when search is called without API key', async () => {
    // Re-mock with no API key
    vi.doMock('../../config/index.js', () => ({
      config: {
        serpapi: {
          apiKey: undefined,
          monthlyLimit: 100,
        },
      },
    }));

    // Re-import to get unconfigured instance
    const { webSearchService: unconfiguredService } = await import('../web-search.js');

    await expect(unconfiguredService.search('test')).rejects.toThrow(
      'Web search not available: SerpAPI key not configured'
    );
  });
});
