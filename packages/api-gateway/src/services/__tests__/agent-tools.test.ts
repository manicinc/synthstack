/**
 * @file services/__tests__/agent-tools.test.ts
 * @description Tests for agent tools registry and executor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the web-search service
const mockIsAvailable = vi.fn();
const mockSearchAndFormat = vi.fn();
const mockShouldTriggerSearch = vi.fn();

vi.mock('../web-search.js', () => ({
  webSearchService: {
    isAvailable: () => mockIsAvailable(),
    searchAndFormat: (query: string, options: any) => mockSearchAndFormat(query, options),
    shouldTriggerSearch: (message: string) => mockShouldTriggerSearch(message),
  },
}));

// Import after mocks
import {
  AgentToolExecutor,
  TOOL_DEFINITIONS,
  createAgentToolExecutor,
  parseOpenAIToolCalls,
  parseAnthropicToolUse,
  shouldAutoSearch,
  formatToolResultsForContext,
  type ToolCall,
  type ToolResult,
} from '../agent-tools.js';

describe('Agent Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAvailable.mockReturnValue(true);
  });

  describe('TOOL_DEFINITIONS', () => {
    it('should have web_search tool defined', () => {
      expect(TOOL_DEFINITIONS.web_search).toBeDefined();
      expect(TOOL_DEFINITIONS.web_search.name).toBe('web_search');
      expect(TOOL_DEFINITIONS.web_search.description).toContain('Search the web');
    });

    it('should have proper parameter schema for web_search', () => {
      const webSearch = TOOL_DEFINITIONS.web_search;

      expect(webSearch.parameters.type).toBe('object');
      expect(webSearch.parameters.required).toContain('query');
      expect(webSearch.parameters.properties.query).toBeDefined();
      expect(webSearch.parameters.properties.query.type).toBe('string');
      expect(webSearch.parameters.properties.num_results).toBeDefined();
      expect(webSearch.parameters.properties.num_results.type).toBe('number');
    });
  });

  describe('AgentToolExecutor', () => {
    describe('constructor', () => {
      it('should create executor with specified tools', () => {
        const executor = new AgentToolExecutor(['web_search']);
        expect(executor.hasTool('web_search')).toBe(true);
      });

      it('should create executor with empty tools list', () => {
        const executor = new AgentToolExecutor([]);
        expect(executor.hasTool('web_search')).toBe(false);
      });
    });

    describe('hasTool', () => {
      it('should return true for enabled tools', () => {
        const executor = new AgentToolExecutor(['web_search']);
        expect(executor.hasTool('web_search')).toBe(true);
      });

      it('should return false for disabled tools', () => {
        const executor = new AgentToolExecutor([]);
        expect(executor.hasTool('web_search')).toBe(false);
      });

      it('should return false for unknown tools', () => {
        const executor = new AgentToolExecutor(['web_search']);
        expect(executor.hasTool('unknown_tool')).toBe(false);
      });
    });

    describe('getToolDefinitions', () => {
      it('should return definitions for enabled tools only', () => {
        const executor = new AgentToolExecutor(['web_search']);
        const definitions = executor.getToolDefinitions();

        expect(definitions).toHaveLength(1);
        expect(definitions[0].name).toBe('web_search');
      });

      it('should return empty array when no tools enabled', () => {
        const executor = new AgentToolExecutor([]);
        const definitions = executor.getToolDefinitions();

        expect(definitions).toHaveLength(0);
      });

      it('should filter out unknown tool names', () => {
        const executor = new AgentToolExecutor(['web_search', 'fake_tool']);
        const definitions = executor.getToolDefinitions();

        expect(definitions).toHaveLength(1);
        expect(definitions[0].name).toBe('web_search');
      });
    });

    describe('getOpenAITools', () => {
      it('should return tools in OpenAI function format', () => {
        const executor = new AgentToolExecutor(['web_search']);
        const tools = executor.getOpenAITools();

        expect(tools).toHaveLength(1);
        expect(tools[0].type).toBe('function');
        expect(tools[0].function.name).toBe('web_search');
        expect(tools[0].function.parameters).toBeDefined();
      });
    });

    describe('getAnthropicTools', () => {
      it('should return tools in Anthropic format', () => {
        const executor = new AgentToolExecutor(['web_search']);
        const tools = executor.getAnthropicTools();

        expect(tools).toHaveLength(1);
        expect(tools[0].name).toBe('web_search');
        expect(tools[0].description).toContain('Search the web');
        expect(tools[0].input_schema).toBeDefined();
        expect(tools[0].input_schema.type).toBe('object');
        expect(tools[0].input_schema.properties.query).toBeDefined();
        expect(tools[0].input_schema.required).toContain('query');
      });
    });

    describe('execute', () => {
      it('should execute web_search tool successfully', async () => {
        mockSearchAndFormat.mockResolvedValueOnce({
          summary: 'Search results for test query',
          citations: ['[1] Test - https://example.com'],
          raw: [{ position: 1, title: 'Test', url: 'https://example.com', snippet: 'Test snippet' }],
        });

        const executor = new AgentToolExecutor(['web_search']);
        const result = await executor.execute({
          name: 'web_search',
          arguments: { query: 'test query', num_results: 3 },
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.formattedOutput).toBe('Search results for test query');
        expect(mockSearchAndFormat).toHaveBeenCalledWith('test query', { numResults: 3 });
      });

      it('should fail when tool is not available', async () => {
        const executor = new AgentToolExecutor([]); // No tools enabled
        const result = await executor.execute({
          name: 'web_search',
          arguments: { query: 'test' },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not available');
      });

      it('should fail when query is missing', async () => {
        const executor = new AgentToolExecutor(['web_search']);
        const result = await executor.execute({
          name: 'web_search',
          arguments: {},
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('query is required');
      });

      it('should fail when web search service is not configured', async () => {
        mockIsAvailable.mockReturnValue(false);

        const executor = new AgentToolExecutor(['web_search']);
        const result = await executor.execute({
          name: 'web_search',
          arguments: { query: 'test' },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not configured');
      });

      it('should fail for unknown tool', async () => {
        const executor = new AgentToolExecutor(['web_search']);
        const result = await executor.execute({
          name: 'unknown_tool',
          arguments: {},
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not available');
      });

      it('should clamp num_results to valid range', async () => {
        mockSearchAndFormat.mockResolvedValueOnce({
          summary: 'Results',
          citations: [],
          raw: [],
        });

        const executor = new AgentToolExecutor(['web_search']);

        // Test upper bound - should clamp to 10
        await executor.execute({
          name: 'web_search',
          arguments: { query: 'test', num_results: 100 },
        });
        expect(mockSearchAndFormat).toHaveBeenCalledWith('test', { numResults: 10 });

        mockSearchAndFormat.mockClear();
        mockSearchAndFormat.mockResolvedValueOnce({
          summary: 'Results',
          citations: [],
          raw: [],
        });

        // Test lower bound - 0 is falsy so defaults to 5, then clamps to valid range
        await executor.execute({
          name: 'web_search',
          arguments: { query: 'test', num_results: 0 },
        });
        // 0 || 5 = 5, Math.max(1, 5) = 5, Math.min(5, 10) = 5
        expect(mockSearchAndFormat).toHaveBeenCalledWith('test', { numResults: 5 });
      });

      it('should use minimum of 1 result when explicitly set low', async () => {
        mockSearchAndFormat.mockResolvedValueOnce({
          summary: 'Results',
          citations: [],
          raw: [],
        });

        const executor = new AgentToolExecutor(['web_search']);

        // Test with -5 (negative) - should clamp to 1
        await executor.execute({
          name: 'web_search',
          arguments: { query: 'test', num_results: -5 },
        });
        // -5 || 5 = -5 (truthy), Math.max(1, -5) = 1, Math.min(1, 10) = 1
        expect(mockSearchAndFormat).toHaveBeenCalledWith('test', { numResults: 1 });
      });

      it('should handle execution errors gracefully', async () => {
        mockSearchAndFormat.mockRejectedValueOnce(new Error('API error'));

        const executor = new AgentToolExecutor(['web_search']);
        const result = await executor.execute({
          name: 'web_search',
          arguments: { query: 'test' },
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('API error');
      });
    });
  });

  describe('createAgentToolExecutor', () => {
    it('should create executor with web_search when available', () => {
      mockIsAvailable.mockReturnValue(true);

      const executor = createAgentToolExecutor('researcher');

      expect(executor.hasTool('web_search')).toBe(true);
    });

    it('should create executor without web_search when not available', () => {
      mockIsAvailable.mockReturnValue(false);

      const executor = createAgentToolExecutor('researcher');

      expect(executor.hasTool('web_search')).toBe(false);
    });

    it('should work without agent slug parameter', () => {
      mockIsAvailable.mockReturnValue(true);

      const executor = createAgentToolExecutor();

      expect(executor.hasTool('web_search')).toBe(true);
    });
  });

  describe('parseOpenAIToolCalls', () => {
    it('should parse OpenAI function calls correctly', () => {
      const openaiCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: {
            name: 'web_search',
            arguments: JSON.stringify({ query: 'test query', num_results: 5 }),
          },
        },
      ];

      const parsed = parseOpenAIToolCalls(openaiCalls);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('web_search');
      expect(parsed[0].arguments).toEqual({ query: 'test query', num_results: 5 });
    });

    it('should handle multiple tool calls', () => {
      const openaiCalls = [
        {
          id: 'call_1',
          type: 'function' as const,
          function: {
            name: 'web_search',
            arguments: JSON.stringify({ query: 'query 1' }),
          },
        },
        {
          id: 'call_2',
          type: 'function' as const,
          function: {
            name: 'web_search',
            arguments: JSON.stringify({ query: 'query 2' }),
          },
        },
      ];

      const parsed = parseOpenAIToolCalls(openaiCalls);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].arguments.query).toBe('query 1');
      expect(parsed[1].arguments.query).toBe('query 2');
    });
  });

  describe('parseAnthropicToolUse', () => {
    it('should parse Anthropic tool use correctly', () => {
      const anthropicToolUse = [
        {
          type: 'tool_use' as const,
          id: 'toolu_123',
          name: 'web_search',
          input: { query: 'test query', num_results: 3 },
        },
      ];

      const parsed = parseAnthropicToolUse(anthropicToolUse);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('web_search');
      expect(parsed[0].arguments).toEqual({ query: 'test query', num_results: 3 });
    });

    it('should handle multiple tool uses', () => {
      const anthropicToolUse = [
        {
          type: 'tool_use' as const,
          id: 'toolu_1',
          name: 'web_search',
          input: { query: 'search 1' },
        },
        {
          type: 'tool_use' as const,
          id: 'toolu_2',
          name: 'web_search',
          input: { query: 'search 2' },
        },
      ];

      const parsed = parseAnthropicToolUse(anthropicToolUse);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].arguments.query).toBe('search 1');
      expect(parsed[1].arguments.query).toBe('search 2');
    });
  });

  describe('shouldAutoSearch', () => {
    it('should delegate to webSearchService', () => {
      mockIsAvailable.mockReturnValue(true);
      mockShouldTriggerSearch.mockReturnValue(true);

      const result = shouldAutoSearch('What are the latest news?');

      expect(result).toBe(true);
      expect(mockShouldTriggerSearch).toHaveBeenCalledWith('What are the latest news?');
    });

    it('should return false when web search is not available', () => {
      mockIsAvailable.mockReturnValue(false);
      mockShouldTriggerSearch.mockReturnValue(true);

      const result = shouldAutoSearch('What are the latest news?');

      expect(result).toBe(false);
    });
  });

  describe('formatToolResultsForContext', () => {
    it('should format successful results', () => {
      const results: ToolResult[] = [
        {
          success: true,
          formattedOutput: 'Search results here...',
        },
      ];

      const formatted = formatToolResultsForContext(results);

      expect(formatted).toContain('**Tool Results:**');
      expect(formatted).toContain('Search results here...');
    });

    it('should format multiple results', () => {
      const results: ToolResult[] = [
        {
          success: true,
          formattedOutput: 'First result',
        },
        {
          success: true,
          formattedOutput: 'Second result',
        },
      ];

      const formatted = formatToolResultsForContext(results);

      expect(formatted).toContain('First result');
      expect(formatted).toContain('Second result');
    });

    it('should format error results', () => {
      const results: ToolResult[] = [
        {
          success: false,
          error: 'Search failed due to quota',
        },
      ];

      const formatted = formatToolResultsForContext(results);

      expect(formatted).toContain('Tool error: Search failed due to quota');
    });

    it('should return empty string for empty results', () => {
      const results: ToolResult[] = [];

      const formatted = formatToolResultsForContext(results);

      expect(formatted).toBe('');
    });

    it('should handle mixed success and error results', () => {
      const results: ToolResult[] = [
        {
          success: true,
          formattedOutput: 'Successful search',
        },
        {
          success: false,
          error: 'Second search failed',
        },
      ];

      const formatted = formatToolResultsForContext(results);

      expect(formatted).toContain('Successful search');
      expect(formatted).toContain('Tool error: Second search failed');
    });

    it('should skip results without formatted output or error', () => {
      const results: ToolResult[] = [
        {
          success: true,
          // No formattedOutput
        },
        {
          success: false,
          // No error message
        },
      ];

      const formatted = formatToolResultsForContext(results);

      expect(formatted).toBe('');
    });
  });
});
