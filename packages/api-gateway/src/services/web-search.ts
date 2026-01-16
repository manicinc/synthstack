/**
 * Web Search Service
 *
 * Simplified web search wrapper for AI agents.
 * Uses SerpAPI under the hood but provides a cleaner interface
 * for agent tool calling and context injection.
 *
 * Features:
 * - Simple search interface for agents
 * - Formatted results for LLM consumption
 * - Quota-aware searching
 * - Source citations
 */

import { config } from '../config/index.js';

// ============================================
// Types
// ============================================

export interface WebSearchOptions {
  numResults?: number;       // Number of results to return (default: 5)
  location?: string;         // Geographic location for localized results
  includeSnippets?: boolean; // Include full snippets (default: true)
  includeRelated?: boolean;  // Include related searches (default: false)
}

export interface WebSearchResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
  displayedUrl: string;
  date?: string;  // If available from the result
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  totalResults: number;
  relatedSearches?: string[];
  searchTime: number;
  quotaRemaining: number;
}

export interface FormattedSearchContext {
  summary: string;           // Brief summary for system prompt
  citations: string[];       // Formatted citations
  raw: WebSearchResult[];    // Raw results if needed
}

// ============================================
// Web Search Service Class
// ============================================

class WebSearchService {
  private readonly baseUrl = 'https://serpapi.com/search';
  private readonly apiKey: string | undefined;
  private readonly monthlyLimit: number;

  constructor() {
    this.apiKey = config.serpapi.apiKey;
    this.monthlyLimit = config.serpapi.monthlyLimit;
  }

  /**
   * Check if web search is available (API key configured)
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Perform a web search and return structured results
   */
  async search(query: string, options: WebSearchOptions = {}): Promise<WebSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Web search not available: SerpAPI key not configured');
    }

    const {
      numResults = 5,
      location = 'United States',
      includeSnippets = true,
      includeRelated = false,
    } = options;

    // Check quota before searching
    const quotaStatus = await this.getQuotaRemaining();
    if (quotaStatus <= 0) {
      throw new Error('Web search quota exceeded for this month');
    }

    const startTime = Date.now();

    const searchParams = new URLSearchParams({
      api_key: this.apiKey,
      engine: 'google',
      q: query,
      location,
      device: 'desktop',
      hl: 'en',
      gl: 'us',
      num: String(Math.min(numResults * 2, 20)), // Fetch extra to filter
      output: 'json',
    });

    const response = await fetch(`${this.baseUrl}?${searchParams}`);

    if (!response.ok) {
      throw new Error(`Web search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const searchTime = Date.now() - startTime;

    // Parse organic results
    const organicResults = (data.organic_results || []) as any[];
    const results: WebSearchResult[] = organicResults
      .slice(0, numResults)
      .map((result: any, index: number) => ({
        position: index + 1,
        title: result.title || '',
        url: result.link || '',
        snippet: includeSnippets ? (result.snippet || '') : '',
        displayedUrl: result.displayed_link || '',
        date: result.date || undefined,
      }));

    // Extract related searches if requested
    let relatedSearches: string[] | undefined;
    if (includeRelated && data.related_searches) {
      relatedSearches = (data.related_searches as any[])
        .slice(0, 5)
        .map((r: any) => r.query);
    }

    // Get total results count
    const searchInfo = data.search_information || {};
    const totalResults = typeof searchInfo.total_results === 'number'
      ? searchInfo.total_results
      : this.parseResultCount(searchInfo.total_results);

    // Update quota tracking (fire and forget)
    this.incrementQuotaUsage().catch(() => {});

    return {
      query,
      results,
      totalResults,
      relatedSearches,
      searchTime,
      quotaRemaining: quotaStatus - 1,
    };
  }

  /**
   * Search and format results for agent context injection
   * Returns a formatted string suitable for adding to system prompts
   */
  async searchAndFormat(query: string, options: WebSearchOptions = {}): Promise<FormattedSearchContext> {
    const response = await this.search(query, { ...options, includeSnippets: true });

    // Build summary for LLM context
    const summaryLines: string[] = [
      `Web search results for: "${query}"`,
      `Found ${response.totalResults.toLocaleString()} results. Top ${response.results.length} shown:`,
      '',
    ];

    const citations: string[] = [];

    for (const result of response.results) {
      summaryLines.push(`[${result.position}] ${result.title}`);
      summaryLines.push(`    URL: ${result.url}`);
      if (result.snippet) {
        summaryLines.push(`    ${result.snippet}`);
      }
      summaryLines.push('');

      citations.push(`[${result.position}] ${result.title} - ${result.url}`);
    }

    if (response.relatedSearches && response.relatedSearches.length > 0) {
      summaryLines.push('Related searches: ' + response.relatedSearches.join(', '));
    }

    return {
      summary: summaryLines.join('\n'),
      citations,
      raw: response.results,
    };
  }

  /**
   * Quick search that returns just the formatted summary string
   * Ideal for simple agent tool calls
   */
  async quickSearch(query: string, numResults: number = 5): Promise<string> {
    try {
      const formatted = await this.searchAndFormat(query, { numResults });
      return formatted.summary;
    } catch (error: any) {
      return `Web search failed: ${error.message}`;
    }
  }

  /**
   * Check if a query should trigger web search (heuristic)
   * Used for auto-search detection
   */
  shouldTriggerSearch(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Keywords that suggest current/real-time info needed
    const searchTriggers = [
      'latest', 'recent', 'current', 'today', 'this week', 'this month', 'this year',
      '2024', '2025', '2026',
      'news', 'update', 'announcement',
      'what is the', 'who is', 'where is',
      'how much does', 'how many',
      'price of', 'cost of',
      'best', 'top', 'popular',
      'trending', 'trend',
      'compare', 'vs', 'versus',
      'review', 'reviews',
      'statistics', 'stats', 'data',
      'market', 'industry',
      'competitor', 'competition',
      'research', 'study', 'studies',
    ];

    // Check for triggers
    for (const trigger of searchTriggers) {
      if (lowerMessage.includes(trigger)) {
        return true;
      }
    }

    // Questions about specific topics often need search
    if (lowerMessage.startsWith('what') ||
        lowerMessage.startsWith('who') ||
        lowerMessage.startsWith('when') ||
        lowerMessage.startsWith('where') ||
        lowerMessage.startsWith('how')) {
      // But not for programming/technical questions that don't need real-time data
      const technicalTerms = ['code', 'function', 'error', 'bug', 'implement', 'syntax'];
      const isTechnical = technicalTerms.some(term => lowerMessage.includes(term));
      if (!isTechnical) {
        return true;
      }
    }

    return false;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private parseResultCount(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.replace(/,/g, '').match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }

  private async getQuotaRemaining(): Promise<number> {
    // Simple quota tracking using config limit
    // In production, this should check against actual usage in DB
    // For now, return a reasonable default
    try {
      const { directusClient } = await import('./directus.js');
      const yearMonth = this.getCurrentYearMonth();

      const usage = await directusClient.items('serp_api_monthly_usage').readByQuery({
        filter: { year_month: { _eq: yearMonth }, api_provider: { _eq: 'serpapi' } },
        limit: 1,
      });

      if (usage.data && usage.data.length > 0) {
        const record = usage.data[0];
        return Math.max(0, (record.monthly_limit as number || this.monthlyLimit) - (record.total_searches as number || 0));
      }

      return this.monthlyLimit;
    } catch {
      // If DB not available, assume quota is available
      return this.monthlyLimit;
    }
  }

  private async incrementQuotaUsage(): Promise<void> {
    try {
      const { directusClient } = await import('./directus.js');
      const yearMonth = this.getCurrentYearMonth();

      const usage = await directusClient.items('serp_api_monthly_usage').readByQuery({
        filter: { year_month: { _eq: yearMonth }, api_provider: { _eq: 'serpapi' } },
        limit: 1,
      });

      if (usage.data && usage.data.length > 0) {
        const record = usage.data[0];
        await directusClient.items('serp_api_monthly_usage').updateOne(record.id as string, {
          total_searches: (record.total_searches as number || 0) + 1,
          successful_searches: (record.successful_searches as number || 0) + 1,
          remaining: Math.max(0, (record.remaining as number || this.monthlyLimit) - 1),
        });
      } else {
        // Create new record
        await directusClient.items('serp_api_monthly_usage').createOne({
          year_month: yearMonth,
          api_provider: 'serpapi',
          total_searches: 1,
          successful_searches: 1,
          failed_searches: 0,
          monthly_limit: this.monthlyLimit,
          remaining: this.monthlyLimit - 1,
        });
      }
    } catch {
      // Silently fail quota tracking - don't break search
    }
  }

  private getCurrentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

// Singleton export
export const webSearchService = new WebSearchService();
