/**
 * SerpAPI Service
 *
 * Integration with SerpAPI for SERP ranking tracking.
 * Includes quota management to stay within monthly limits.
 *
 * Features:
 * - Google search results parsing
 * - Position tracking
 * - SERP feature detection
 * - Competitor monitoring
 * - Monthly quota enforcement
 */

import { config } from '../config/index.js';
import { directusClient } from './directus.js';

// ============================================
// Types
// ============================================

export interface SerpSearchParams {
  query: string;
  location?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  language?: string;
  num?: number;  // Number of results (max 100)
  [key: string]: unknown;  // Index signature for Record<string, unknown> compatibility
}

export interface SerpResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  displayed_link: string;
}

export interface SerpFeature {
  type: string;
  position?: number;
  data: Record<string, unknown>;
}

export interface SerpResponse {
  searchMetadata: {
    id: string;
    status: string;
    totalTimeTaken: number;
    totalResults: number;
  };
  organicResults: SerpResult[];
  features: SerpFeature[];
  rawResponse?: Record<string, unknown>;
}

export interface QuotaStatus {
  used: number;
  remaining: number;
  limit: number;
  yearMonth: string;
  canSearch: boolean;
}

export interface RankingResult {
  keywordId: string;
  keyword: string;
  position: number | null;
  url: string | null;
  title: string | null;
  snippet: string | null;
  features: SerpFeature[];
  competitors: Array<{
    domain: string;
    position: number;
    url: string;
  }>;
  checkedAt: string;
}

// ============================================
// SerpAPI Service Class
// ============================================

class SerpAPIService {
  private readonly baseUrl = 'https://serpapi.com/search';
  private readonly apiKey: string | undefined;
  private readonly monthlyLimit: number;

  constructor() {
    this.apiKey = config.serpapi.apiKey;
    this.monthlyLimit = config.serpapi.monthlyLimit;
  }

  // ============================================
  // Core Search
  // ============================================

  /**
   * Perform a Google search via SerpAPI
   */
  async search(params: SerpSearchParams, userId?: string, keywordId?: string): Promise<SerpResponse> {
    // Check quota first
    const quota = await this.getQuotaStatus();
    if (!quota.canSearch) {
      throw new Error(`Monthly SerpAPI quota exceeded. Used ${quota.used}/${quota.limit} searches.`);
    }

    if (!this.apiKey) {
      throw new Error('SerpAPI key not configured');
    }

    const startTime = Date.now();
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'google',
        q: params.query,
        location: params.location || 'United States',
        device: params.device || 'desktop',
        hl: params.language || 'en',
        gl: 'us',
        num: String(params.num || 100),
        output: 'json',
      });

      const response = await fetch(`${this.baseUrl}?${searchParams}`);
      statusCode = response.status;

      if (!response.ok) {
        errorMessage = `SerpAPI error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      // Log usage
      await this.logUsage({
        keywordId,
        userId,
        searchQuery: params.query,
        parameters: params,
        statusCode,
        responseTimeMs: responseTime,
      });

      // Parse response
      return this.parseResponse(data);
    } catch (error: any) {
      // Log failed usage
      await this.logUsage({
        keywordId,
        userId,
        searchQuery: params.query,
        parameters: params,
        statusCode,
        responseTimeMs: Date.now() - startTime,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Parse SerpAPI response into structured format
   */
  private parseResponse(data: Record<string, unknown>): SerpResponse {
    const searchMetadata = data.search_metadata as Record<string, unknown> | undefined;
    const searchInformation = data.search_information as Record<string, unknown> | undefined;
    const response: SerpResponse = {
      searchMetadata: {
        id: searchMetadata?.id as string || '',
        status: searchMetadata?.status as string || 'unknown',
        totalTimeTaken: searchMetadata?.total_time_taken as number || 0,
        totalResults: this.parseResultCount(searchInformation?.total_results),
      },
      organicResults: [],
      features: [],
      rawResponse: data,
    };

    // Parse organic results
    const organicResults = data.organic_results as any[] || [];
    response.organicResults = organicResults.map((result, index) => ({
      position: result.position || index + 1,
      title: result.title || '',
      link: result.link || '',
      snippet: result.snippet || '',
      displayed_link: result.displayed_link || '',
    }));

    // Detect SERP features
    response.features = this.detectFeatures(data);

    return response;
  }

  /**
   * Detect SERP features in response
   */
  private detectFeatures(data: Record<string, unknown>): SerpFeature[] {
    const features: SerpFeature[] = [];

    // Featured snippet
    if (data.answer_box || data.featured_snippet) {
      const snippet = (data.answer_box || data.featured_snippet) as Record<string, unknown>;
      features.push({
        type: 'featured_snippet',
        position: 0,
        data: {
          title: snippet.title,
          snippet: snippet.snippet || snippet.answer,
          link: snippet.link,
        },
      });
    }

    // People Also Ask
    if (data.related_questions) {
      const questions = data.related_questions as any[];
      features.push({
        type: 'people_also_ask',
        position: this.findFeaturePosition(data, 'related_questions'),
        data: {
          questions: questions.slice(0, 5).map(q => q.question),
          count: questions.length,
        },
      });
    }

    // Knowledge Panel
    if (data.knowledge_graph) {
      features.push({
        type: 'knowledge_panel',
        data: data.knowledge_graph as Record<string, unknown>,
      });
    }

    // Local Pack
    const localResults = data.local_results as Record<string, unknown> | undefined;
    if (localResults?.places) {
      features.push({
        type: 'local_pack',
        position: this.findFeaturePosition(data, 'local_results'),
        data: {
          places: (localResults.places as unknown[])?.slice(0, 3),
        },
      });
    }

    // Top Stories
    if (data.top_stories) {
      features.push({
        type: 'top_stories',
        position: this.findFeaturePosition(data, 'top_stories'),
        data: { count: (data.top_stories as any[]).length },
      });
    }

    // Images
    if (data.inline_images) {
      features.push({
        type: 'images',
        data: { count: (data.inline_images as any[]).length },
      });
    }

    // Videos
    if (data.inline_videos) {
      features.push({
        type: 'videos',
        data: { count: (data.inline_videos as any[]).length },
      });
    }

    // Shopping results
    if (data.shopping_results) {
      features.push({
        type: 'shopping',
        data: { count: (data.shopping_results as any[]).length },
      });
    }

    // Related searches
    if (data.related_searches) {
      features.push({
        type: 'related_searches',
        data: {
          queries: (data.related_searches as any[]).slice(0, 8).map(r => r.query),
        },
      });
    }

    return features;
  }

  /**
   * Find approximate position of a SERP feature
   */
  private findFeaturePosition(_data: Record<string, unknown>, _featureKey: string): number | undefined {
    // This is approximate - SerpAPI doesn't always give exact positions
    // Estimate based on organic result positions around the feature
    return undefined;
  }

  /**
   * Parse result count from string like "About 1,230,000 results"
   */
  private parseResultCount(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.replace(/,/g, '').match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }

  // ============================================
  // Keyword Ranking Check
  // ============================================

  /**
   * Check ranking for a specific keyword
   */
  async checkKeywordRanking(
    keywordId: string,
    userId: string,
    targetDomain: string,
    competitorDomains: string[] = []
  ): Promise<RankingResult> {
    // Get keyword from database
    const keyword = await directusClient.items('seo_keywords').readOne(keywordId);
    if (!keyword || keyword.user_id !== userId) {
      throw new Error('Keyword not found');
    }

    // Perform search
    const searchResult = await this.search(
      { query: keyword.keyword as string, num: 100 },
      userId,
      keywordId
    );

    // Find our position
    let ourPosition: number | null = null;
    let ourUrl: string | null = null;
    let ourTitle: string | null = null;
    let ourSnippet: string | null = null;

    for (const result of searchResult.organicResults) {
      try {
        const resultDomain = new URL(result.link).hostname.replace('www.', '');
        if (resultDomain.includes(targetDomain) || targetDomain.includes(resultDomain)) {
          ourPosition = result.position;
          ourUrl = result.link;
          ourTitle = result.title;
          ourSnippet = result.snippet;
          break;
        }
      } catch {
        // Invalid URL, skip
      }
    }

    // Find competitor positions
    const competitorResults: RankingResult['competitors'] = [];
    for (const competitorDomain of competitorDomains) {
      for (const result of searchResult.organicResults) {
        try {
          const resultDomain = new URL(result.link).hostname.replace('www.', '');
          if (resultDomain.includes(competitorDomain) || competitorDomain.includes(resultDomain)) {
            competitorResults.push({
              domain: competitorDomain,
              position: result.position,
              url: result.link,
            });
            break;
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }

    const checkedAt = new Date().toISOString();

    // Save ranking to history
    const rankingRecord = await directusClient.items('serp_ranking_history').createOne({
      keyword_id: keywordId,
      user_id: userId,
      position: ourPosition,
      url: ourUrl,
      title: ourTitle,
      snippet: ourSnippet,
      search_engine: 'google',
      location: 'United States',
      device: 'desktop',
      language: 'en',
      total_results: searchResult.searchMetadata.totalResults,
      search_time: searchResult.searchMetadata.totalTimeTaken,
      checked_at: checkedAt,
    });

    // Save SERP features
    for (const feature of searchResult.features) {
      await directusClient.items('serp_features_history').createOne({
        ranking_id: rankingRecord.id,
        feature_type: feature.type,
        position: feature.position,
        data: feature.data,
      });
    }

    // Save competitor rankings
    for (const competitor of competitorResults) {
      // Find or create competitor record
      const existingCompetitor = await directusClient.items('serp_competitors').readByQuery({
        filter: { user_id: { _eq: userId }, domain: { _eq: competitor.domain } },
        limit: 1,
      });

      let competitorId: string;
      if (existingCompetitor.data && existingCompetitor.data.length > 0) {
        competitorId = existingCompetitor.data[0].id as string;
      } else {
        const newCompetitor = await directusClient.items('serp_competitors').createOne({
          user_id: userId,
          domain: competitor.domain,
          is_active: true,
        });
        competitorId = newCompetitor.id as string;
      }

      await directusClient.items('serp_competitor_rankings').createOne({
        ranking_id: rankingRecord.id,
        competitor_id: competitorId,
        position: competitor.position,
        url: competitor.url,
      });
    }

    return {
      keywordId,
      keyword: keyword.keyword as string,
      position: ourPosition,
      url: ourUrl,
      title: ourTitle,
      snippet: ourSnippet,
      features: searchResult.features,
      competitors: competitorResults,
      checkedAt,
    };
  }

  // ============================================
  // Quota Management
  // ============================================

  /**
   * Get current quota status
   */
  async getQuotaStatus(): Promise<QuotaStatus> {
    const yearMonth = this.getCurrentYearMonth();

    // Get or create monthly usage record
    let usage = await directusClient.items('serp_api_monthly_usage').readByQuery({
      filter: { year_month: { _eq: yearMonth }, api_provider: { _eq: 'serpapi' } },
      limit: 1,
    });

    if (!usage.data || usage.data.length === 0) {
      // Create new record for this month
      const newUsage = await directusClient.items('serp_api_monthly_usage').createOne({
        year_month: yearMonth,
        api_provider: 'serpapi',
        total_searches: 0,
        successful_searches: 0,
        failed_searches: 0,
        monthly_limit: this.monthlyLimit,
        remaining: this.monthlyLimit,
      });
      usage = { data: [newUsage] };
    }

    const record = usage.data[0];
    const used = record.total_searches as number || 0;
    const limit = record.monthly_limit as number || this.monthlyLimit;
    const remaining = Math.max(0, limit - used);

    return {
      used,
      remaining,
      limit,
      yearMonth,
      canSearch: remaining > 0,
    };
  }

  /**
   * Log API usage
   */
  private async logUsage(params: {
    keywordId?: string;
    userId?: string;
    searchQuery: string;
    parameters: Record<string, unknown>;
    statusCode: number;
    responseTimeMs: number;
    errorMessage?: string;
  }): Promise<void> {
    const yearMonth = this.getCurrentYearMonth();
    const isSuccess = params.statusCode >= 200 && params.statusCode < 300 && !params.errorMessage;

    // Log individual request
    await directusClient.items('serp_api_usage').createOne({
      api_provider: 'serpapi',
      endpoint: 'search',
      keyword_id: params.keywordId || null,
      user_id: params.userId || null,
      search_query: params.searchQuery,
      parameters: params.parameters,
      status_code: params.statusCode,
      credits_used: isSuccess ? 1 : 0,
      response_time_ms: params.responseTimeMs,
      error_message: params.errorMessage || null,
    });

    // Update monthly totals
    const usage = await directusClient.items('serp_api_monthly_usage').readByQuery({
      filter: { year_month: { _eq: yearMonth }, api_provider: { _eq: 'serpapi' } },
      limit: 1,
    });

    if (usage.data && usage.data.length > 0) {
      const record = usage.data[0];
      await directusClient.items('serp_api_monthly_usage').updateOne(record.id as string, {
        total_searches: (record.total_searches as number || 0) + 1,
        successful_searches: (record.successful_searches as number || 0) + (isSuccess ? 1 : 0),
        failed_searches: (record.failed_searches as number || 0) + (isSuccess ? 0 : 1),
        remaining: Math.max(0, (record.remaining as number || this.monthlyLimit) - (isSuccess ? 1 : 0)),
      });
    }
  }

  /**
   * Get current year-month string
   */
  private getCurrentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // ============================================
  // Ranking History
  // ============================================

  /**
   * Get ranking history for a keyword
   */
  async getRankingHistory(
    keywordId: string,
    userId: string,
    limit: number = 30
  ): Promise<Array<{
    position: number | null;
    url: string | null;
    checkedAt: string;
    features: string[];
  }>> {
    const history = await directusClient.items('serp_ranking_history').readByQuery({
      filter: {
        keyword_id: { _eq: keywordId },
        user_id: { _eq: userId },
      },
      sort: ['-checked_at'],
      limit,
    });

    const results = [];
    for (const record of history.data || []) {
      // Get features for this ranking
      const features = await directusClient.items('serp_features_history').readByQuery({
        filter: { ranking_id: { _eq: record.id } },
      });

      results.push({
        position: record.position as number | null,
        url: record.url as string | null,
        checkedAt: record.checked_at as string,
        features: (features.data || []).map((f: Record<string, unknown>) => f.feature_type as string),
      });
    }

    return results;
  }

  /**
   * Get keywords due for checking
   */
  async getKeywordsDueForCheck(userId?: string, limit: number = 10): Promise<string[]> {
    const now = new Date().toISOString();
    const filter: Record<string, unknown> = {
      _or: [
        { next_check_at: { _lte: now } },
        { next_check_at: { _null: true }, last_serp_check_at: { _null: true } },
      ],
      check_frequency: { _neq: 'manual' },
    };

    if (userId) {
      filter.user_id = { _eq: userId };
    }

    const keywords = await directusClient.items('seo_keywords').readByQuery({
      filter,
      sort: ['next_check_at', 'priority'],
      limit,
      fields: ['id'],
    } as any);

    return (keywords.data || []).map((k: Record<string, unknown>) => k.id as string);
  }

  /**
   * Update next check time for a keyword
   */
  async updateNextCheckTime(keywordId: string): Promise<void> {
    const keyword = await directusClient.items('seo_keywords').readOne(keywordId);
    if (!keyword) return;

    const frequency = keyword.check_frequency as string || 'monthly';
    const now = new Date();
    let nextCheck: Date;

    switch (frequency) {
      case 'daily':
        nextCheck = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextCheck = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'biweekly':
        nextCheck = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
      default:
        nextCheck = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
    }

    await directusClient.items('seo_keywords').updateOne(keywordId, {
      next_check_at: nextCheck.toISOString(),
    });
  }
}

// Singleton export
export const serpApiService = new SerpAPIService();
