/**
 * SEO Keywords Service
 *
 * Manages target keywords for SEO optimization.
 * Integrates with the SEO Writer agent for:
 * - Keyword research and discovery
 * - Content optimization audits
 * - SEO improvement suggestions
 * - PR generation for SEO changes
 */

import { directusClient } from './directus.js';

// COMMUNITY: AI agent functionality removed (PRO feature)
// agentService and suggestionsService are not available
type AgentSlug = string;

// Stub for unavailable AI features
const agentService = {
  async getPromptTemplate(_slug: AgentSlug, _template: string): Promise<string | null> {
    return null; // AI not available in Community Edition
  },
  async chat(_slug: AgentSlug, _userId: string, _message: string, _options?: unknown): Promise<{ message?: string; tool_calls?: unknown[] }> {
    throw new Error('AI features are not available in Community Edition. Upgrade to PRO at https://synthstack.app/pricing');
  },
};

const suggestionsService = {
  async createSuggestion(_userId: string, _params: unknown): Promise<null> {
    return null; // Suggestions not available in Community Edition
  },
};

// ============================================
// Types
// ============================================

export type KeywordCategory = 'primary' | 'secondary' | 'long_tail' | 'question';
export type KeywordIntent = 'informational' | 'transactional' | 'navigational' | 'commercial';
export type KeywordStatus = 'researched' | 'targeting' | 'optimizing' | 'ranking' | 'archived';
export type KeywordPriority = 'high' | 'medium' | 'low';
export type KeywordCompetition = 'high' | 'medium' | 'low';
export type KeywordSource = 'ai_research' | 'manual' | 'imported' | 'competitor_analysis';
export type ContentType = 'blog_post' | 'doc_page' | 'landing_page' | 'changelog' | 'faq';

export interface SEOKeyword {
  id: string;
  userId: string;
  keyword: string;
  category: KeywordCategory | null;
  searchIntent: KeywordIntent | null;
  volumeEstimate: string | null;
  competition: KeywordCompetition | null;
  difficultyScore: number | null;
  status: KeywordStatus;
  priority: KeywordPriority;
  targetUrl: string | null;
  currentPosition: number | null;
  bestPosition: number | null;
  positionUpdatedAt: string | null;
  source: KeywordSource;
  researchSessionId: string | null;
  notes: string | null;
  relatedKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KeywordContent {
  id: string;
  keywordId: string;
  contentType: ContentType;
  contentId: string;
  isPrimary: boolean;
  isOptimized: boolean;
  optimizationScore: number | null;
  lastAuditedAt: string | null;
  createdAt: string;
}

export interface SEOAudit {
  id: string;
  userId: string;
  contentType: ContentType;
  contentId: string;
  keywordId: string | null;
  overallScore: number | null;
  titleScore: number | null;
  metaScore: number | null;
  headingScore: number | null;
  contentScore: number | null;
  linkScore: number | null;
  findings: Record<string, unknown>;
  recommendations: Array<{ category: string; issue: string; suggestion: string; priority: string }>;
  sessionId: string | null;
  createdAt: string;
}

export interface CreateKeywordInput {
  keyword: string;
  category?: KeywordCategory;
  searchIntent?: KeywordIntent;
  volumeEstimate?: string;
  competition?: KeywordCompetition;
  difficultyScore?: number;
  priority?: KeywordPriority;
  targetUrl?: string;
  source?: KeywordSource;
  notes?: string;
  relatedKeywords?: string[];
}

export interface UpdateKeywordInput {
  category?: KeywordCategory;
  searchIntent?: KeywordIntent;
  volumeEstimate?: string;
  competition?: KeywordCompetition;
  difficultyScore?: number;
  status?: KeywordStatus;
  priority?: KeywordPriority;
  targetUrl?: string;
  currentPosition?: number;
  notes?: string;
  relatedKeywords?: string[];
}

export interface KeywordFilters {
  categories?: KeywordCategory[];
  statuses?: KeywordStatus[];
  priorities?: KeywordPriority[];
  sources?: KeywordSource[];
  search?: string;
}

export interface KeywordStats {
  total: number;
  byStatus: Record<KeywordStatus, number>;
  byCategory: Record<KeywordCategory, number>;
  byPriority: Record<KeywordPriority, number>;
  withContent: number;
  optimized: number;
}

export interface ResearchOptions {
  topic: string;
  industry: string;
  audience?: string;
  contentType?: string;
  competitors?: string;
  saveResults?: boolean;
}

export interface AuditOptions {
  contentId: string;
  contentType: ContentType;
  keywords: string[];
  contentUrl?: string;
  contentTitle?: string;
  contentMeta?: string;
  contentBody?: string;
}

// ============================================
// SEO Service Class
// ============================================

class SEOService {
  private readonly SEO_AGENT_SLUG: AgentSlug = 'seo_writer';

  // ============================================
  // Keyword CRUD
  // ============================================

  /**
   * Create a new keyword
   */
  async createKeyword(userId: string, input: CreateKeywordInput): Promise<SEOKeyword> {
    const keyword = await directusClient.items('seo_keywords').createOne({
      user_id: userId,
      keyword: input.keyword.toLowerCase().trim(),
      category: input.category || null,
      search_intent: input.searchIntent || null,
      volume_estimate: input.volumeEstimate || null,
      competition: input.competition || null,
      difficulty_score: input.difficultyScore || null,
      status: 'researched',
      priority: input.priority || 'medium',
      target_url: input.targetUrl || null,
      source: input.source || 'manual',
      notes: input.notes || null,
      related_keywords: input.relatedKeywords || [],
    });

    return this.mapKeywordFromDb(keyword);
  }

  /**
   * Create multiple keywords (from AI research)
   */
  async createKeywords(userId: string, keywords: CreateKeywordInput[], sessionId?: string): Promise<SEOKeyword[]> {
    const created: SEOKeyword[] = [];

    for (const input of keywords) {
      try {
        const keyword = await directusClient.items('seo_keywords').createOne({
          user_id: userId,
          keyword: input.keyword.toLowerCase().trim(),
          category: input.category || null,
          search_intent: input.searchIntent || null,
          volume_estimate: input.volumeEstimate || null,
          competition: input.competition || null,
          difficulty_score: input.difficultyScore || null,
          status: 'researched',
          priority: input.priority || 'medium',
          source: input.source || 'ai_research',
          research_session_id: sessionId || null,
          notes: input.notes || null,
          related_keywords: input.relatedKeywords || [],
        });
        created.push(this.mapKeywordFromDb(keyword));
      } catch (error) {
        // Skip duplicates
        console.warn(`Skipping duplicate keyword: ${input.keyword}`);
      }
    }

    return created;
  }

  /**
   * Get a keyword by ID
   */
  async getKeyword(keywordId: string, userId: string): Promise<SEOKeyword | null> {
    try {
      const keyword = await directusClient.items('seo_keywords').readOne(keywordId);
      if (!keyword || keyword.user_id !== userId) {
        return null;
      }
      return this.mapKeywordFromDb(keyword);
    } catch {
      return null;
    }
  }

  /**
   * Get all keywords for a user with filters
   */
  async getKeywords(
    userId: string,
    filters: KeywordFilters = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<{ keywords: SEOKeyword[]; total: number }> {
    const filterConditions: Record<string, unknown> = {
      user_id: { _eq: userId },
    };

    // Apply status filter
    if (filters.statuses && filters.statuses.length > 0) {
      filterConditions.status = { _in: filters.statuses };
    }

    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
      filterConditions.category = { _in: filters.categories };
    }

    // Apply priority filter
    if (filters.priorities && filters.priorities.length > 0) {
      filterConditions.priority = { _in: filters.priorities };
    }

    // Apply source filter
    if (filters.sources && filters.sources.length > 0) {
      filterConditions.source = { _in: filters.sources };
    }

    // Apply search filter
    if (filters.search) {
      filterConditions.keyword = { _contains: filters.search.toLowerCase() };
    }

    // Get total count
    const countResponse = await directusClient.items('seo_keywords').readByQuery({
      filter: filterConditions,
      aggregate: { count: '*' },
    });
    const total = Number(countResponse.data?.[0]?.count || 0);

    // Get keywords
    const response = await directusClient.items('seo_keywords').readByQuery({
      filter: filterConditions,
      sort: ['-priority', '-created_at'],
      limit,
      offset,
    });

    const keywords = (response.data || []).map((k: Record<string, unknown>) => this.mapKeywordFromDb(k));

    return { keywords, total };
  }

  /**
   * Update a keyword
   */
  async updateKeyword(keywordId: string, userId: string, input: UpdateKeywordInput): Promise<SEOKeyword> {
    const keyword = await this.getKeyword(keywordId, userId);
    if (!keyword) {
      throw new Error('Keyword not found');
    }

    const updateData: Record<string, unknown> = {};
    if (input.category !== undefined) updateData.category = input.category;
    if (input.searchIntent !== undefined) updateData.search_intent = input.searchIntent;
    if (input.volumeEstimate !== undefined) updateData.volume_estimate = input.volumeEstimate;
    if (input.competition !== undefined) updateData.competition = input.competition;
    if (input.difficultyScore !== undefined) updateData.difficulty_score = input.difficultyScore;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.targetUrl !== undefined) updateData.target_url = input.targetUrl;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.relatedKeywords !== undefined) updateData.related_keywords = input.relatedKeywords;

    if (input.currentPosition !== undefined) {
      updateData.current_position = input.currentPosition;
      updateData.position_updated_at = new Date().toISOString();
      // Track best position
      if (!keyword.bestPosition || input.currentPosition < keyword.bestPosition) {
        updateData.best_position = input.currentPosition;
      }
    }

    const updated = await directusClient.items('seo_keywords').updateOne(keywordId, updateData);
    return this.mapKeywordFromDb(updated);
  }

  /**
   * Delete a keyword
   */
  async deleteKeyword(keywordId: string, userId: string): Promise<boolean> {
    const keyword = await this.getKeyword(keywordId, userId);
    if (!keyword) {
      throw new Error('Keyword not found');
    }

    await directusClient.items('seo_keywords').deleteOne(keywordId);
    return true;
  }

  /**
   * Bulk update keyword status
   */
  async bulkUpdateStatus(keywordIds: string[], userId: string, status: KeywordStatus): Promise<number> {
    let updated = 0;
    for (const id of keywordIds) {
      try {
        await this.updateKeyword(id, userId, { status });
        updated++;
      } catch {
        // Skip failed updates
      }
    }
    return updated;
  }

  // ============================================
  // Keyword-Content Mapping
  // ============================================

  /**
   * Link a keyword to content
   */
  async linkKeywordToContent(
    keywordId: string,
    contentType: ContentType,
    contentId: string,
    isPrimary: boolean = false
  ): Promise<KeywordContent> {
    const link = await directusClient.items('seo_keyword_content').createOne({
      keyword_id: keywordId,
      content_type: contentType,
      content_id: contentId,
      is_primary: isPrimary,
      is_optimized: false,
    });

    return this.mapKeywordContentFromDb(link);
  }

  /**
   * Get content linked to a keyword
   */
  async getKeywordContent(keywordId: string): Promise<KeywordContent[]> {
    const response = await directusClient.items('seo_keyword_content').readByQuery({
      filter: { keyword_id: { _eq: keywordId } },
      sort: ['-is_primary', '-created_at'],
    });

    return (response.data || []).map((c: Record<string, unknown>) => this.mapKeywordContentFromDb(c));
  }

  /**
   * Get keywords linked to content
   */
  async getContentKeywords(contentType: ContentType, contentId: string): Promise<SEOKeyword[]> {
    const response = await directusClient.items('seo_keyword_content').readByQuery({
      filter: {
        content_type: { _eq: contentType },
        content_id: { _eq: contentId },
      },
    });

    const keywords: SEOKeyword[] = [];
    for (const link of response.data || []) {
      try {
        const keyword = await directusClient.items('seo_keywords').readOne(link.keyword_id);
        if (keyword) {
          keywords.push(this.mapKeywordFromDb(keyword));
        }
      } catch {
        // Skip missing keywords
      }
    }

    return keywords;
  }

  /**
   * Update content optimization status
   */
  async updateContentOptimization(
    keywordId: string,
    contentType: ContentType,
    contentId: string,
    optimizationScore: number,
    isOptimized: boolean = true
  ): Promise<void> {
    const response = await directusClient.items('seo_keyword_content').readByQuery({
      filter: {
        keyword_id: { _eq: keywordId },
        content_type: { _eq: contentType },
        content_id: { _eq: contentId },
      },
      limit: 1,
    });

    if (response.data && response.data.length > 0) {
      await directusClient.items('seo_keyword_content').updateOne(response.data[0].id, {
        is_optimized: isOptimized,
        optimization_score: optimizationScore,
        last_audited_at: new Date().toISOString(),
      });
    }
  }

  // ============================================
  // AI-Powered Features
  // ============================================

  /**
   * Research keywords for a topic using SEO Writer agent
   */
  async researchKeywords(userId: string, options: ResearchOptions): Promise<{
    keywords: SEOKeyword[];
    sessionId: string;
    rawResponse: string;
  }> {
    // Get the keyword_research prompt template
    const template = await agentService.getPromptTemplate(this.SEO_AGENT_SLUG, 'keyword_research');
    if (!template) {
      throw new Error('Keyword research template not found');
    }

    // Prepare template variables
    const variables: Record<string, string> = {
      topic: options.topic,
      industry: options.industry,
      audience: options.audience || 'general audience',
      content_type: options.contentType || 'blog',
      competitors: options.competitors || 'none specified',
    };

    // Call the SEO Writer agent
    const response = await agentService.chat(
      this.SEO_AGENT_SLUG,
      userId,
      [{ role: 'user', content: template.template }],
      {
        promptTemplateId: 'keyword_research',
        promptVariables: variables,
        enableChainOfThought: true,
      }
    );

    // Parse keywords from response
    const parsedKeywords = this.parseKeywordsFromResponse(response.message);

    // Save keywords if requested
    let savedKeywords: SEOKeyword[] = [];
    if (options.saveResults !== false && parsedKeywords.length > 0) {
      savedKeywords = await this.createKeywords(userId, parsedKeywords, response.sessionId);
    }

    return {
      keywords: savedKeywords,
      sessionId: response.sessionId,
      rawResponse: response.message,
    };
  }

  /**
   * Run SEO audit on content
   */
  async auditContent(userId: string, options: AuditOptions): Promise<SEOAudit> {
    // Get the seo_audit prompt template
    const template = await agentService.getPromptTemplate(this.SEO_AGENT_SLUG, 'seo_audit');
    if (!template) {
      throw new Error('SEO audit template not found');
    }

    // Prepare template variables
    const variables: Record<string, string> = {
      url: options.contentUrl || '',
      keyword: options.keywords.join(', '),
      title: options.contentTitle || '',
      meta_description: options.contentMeta || '',
      content: options.contentBody || '',
    };

    // Call the SEO Writer agent
    const response = await agentService.chat(
      this.SEO_AGENT_SLUG,
      userId,
      [{ role: 'user', content: template.template }],
      {
        promptTemplateId: 'seo_audit',
        promptVariables: variables,
        enableChainOfThought: true,
      }
    );

    // Parse audit results from response
    const auditResults = this.parseAuditFromResponse(response.message);

    // Get primary keyword ID if available
    let keywordId: string | null = null;
    if (options.keywords.length > 0) {
      const keywordsResponse = await directusClient.items('seo_keywords').readByQuery({
        filter: {
          user_id: { _eq: userId },
          keyword: { _eq: options.keywords[0].toLowerCase() },
        },
        limit: 1,
      });
      if (keywordsResponse.data && keywordsResponse.data.length > 0) {
        keywordId = keywordsResponse.data[0].id;
      }
    }

    // Save audit to history
    const audit = await directusClient.items('seo_audit_history').createOne({
      user_id: userId,
      content_type: options.contentType,
      content_id: options.contentId,
      keyword_id: keywordId,
      overall_score: auditResults.overallScore,
      title_score: auditResults.titleScore,
      meta_score: auditResults.metaScore,
      heading_score: auditResults.headingScore,
      content_score: auditResults.contentScore,
      link_score: auditResults.linkScore,
      findings: auditResults.findings,
      recommendations: auditResults.recommendations,
      session_id: response.sessionId,
    });

    return this.mapAuditFromDb(audit);
  }

  /**
   * Generate SEO improvement suggestion
   */
  async generateOptimizationSuggestion(
    userId: string,
    keywordIds: string[],
    contentType: ContentType,
    contentId: string,
    contentTitle: string,
    contentBody: string
  ): Promise<string> {
    // Get keywords
    const keywords: string[] = [];
    for (const id of keywordIds) {
      const keyword = await this.getKeyword(id, userId);
      if (keyword) {
        keywords.push(keyword.keyword);
      }
    }

    if (keywords.length === 0) {
      throw new Error('No valid keywords found');
    }

    // Run audit first
    const audit = await this.auditContent(userId, {
      contentId,
      contentType,
      keywords,
      contentTitle,
      contentBody,
    });

    // Create suggestion from audit
    const suggestion = await suggestionsService.createSuggestion(userId, {
      agentSlug: this.SEO_AGENT_SLUG,
      sessionId: audit.sessionId || undefined,
      type: 'seo_improvement',
      title: `SEO Optimization: ${keywords[0]}`,
      summary: `Improve SEO for "${contentTitle}" targeting keywords: ${keywords.join(', ')}`,
      content: this.formatOptimizationContent(audit),
      draftData: {
        contentType,
        contentId,
        keywords,
        audit: {
          overallScore: audit.overallScore,
          recommendations: audit.recommendations,
        },
      },
      targetCollection: contentType === 'blog_post' ? 'blog_posts' : contentType === 'doc_page' ? 'doc_pages' : undefined,
      contextType: 'content',
      contextReference: contentId,
      priority: audit.overallScore && audit.overallScore < 50 ? 'high' : 'medium',
    });

    return suggestion.id;
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get keyword statistics for a user
   */
  async getStats(userId: string): Promise<KeywordStats> {
    const response = await directusClient.items('seo_keywords').readByQuery({
      filter: { user_id: { _eq: userId } },
    });

    const keywords = response.data || [];

    const stats: KeywordStats = {
      total: keywords.length,
      byStatus: {
        researched: 0,
        targeting: 0,
        optimizing: 0,
        ranking: 0,
        archived: 0,
      },
      byCategory: {
        primary: 0,
        secondary: 0,
        long_tail: 0,
        question: 0,
      },
      byPriority: {
        high: 0,
        medium: 0,
        low: 0,
      },
      withContent: 0,
      optimized: 0,
    };

    for (const keyword of keywords) {
      // Count by status
      if (keyword.status) {
        stats.byStatus[keyword.status as KeywordStatus]++;
      }

      // Count by category
      if (keyword.category) {
        stats.byCategory[keyword.category as KeywordCategory]++;
      }

      // Count by priority
      if (keyword.priority) {
        stats.byPriority[keyword.priority as KeywordPriority]++;
      }
    }

    // Count keywords with content
    const contentResponse = await directusClient.items('seo_keyword_content').readByQuery({
      filter: {
        keyword_id: { _in: keywords.map((k: Record<string, unknown>) => k.id) },
      },
      aggregate: { countDistinct: 'keyword_id' },
    });
    stats.withContent = Number(contentResponse.data?.[0]?.countDistinct?.keyword_id || 0);

    // Count optimized
    const optimizedResponse = await directusClient.items('seo_keyword_content').readByQuery({
      filter: {
        keyword_id: { _in: keywords.map((k: Record<string, unknown>) => k.id) },
        is_optimized: { _eq: true },
      },
      aggregate: { countDistinct: 'keyword_id' },
    });
    stats.optimized = Number(optimizedResponse.data?.[0]?.countDistinct?.keyword_id || 0);

    return stats;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private mapKeywordFromDb(data: Record<string, unknown>): SEOKeyword {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      keyword: data.keyword as string,
      category: data.category as KeywordCategory | null,
      searchIntent: data.search_intent as KeywordIntent | null,
      volumeEstimate: data.volume_estimate as string | null,
      competition: data.competition as KeywordCompetition | null,
      difficultyScore: data.difficulty_score as number | null,
      status: data.status as KeywordStatus,
      priority: data.priority as KeywordPriority,
      targetUrl: data.target_url as string | null,
      currentPosition: data.current_position as number | null,
      bestPosition: data.best_position as number | null,
      positionUpdatedAt: data.position_updated_at as string | null,
      source: data.source as KeywordSource,
      researchSessionId: data.research_session_id as string | null,
      notes: data.notes as string | null,
      relatedKeywords: (data.related_keywords as string[]) || [],
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private mapKeywordContentFromDb(data: Record<string, unknown>): KeywordContent {
    return {
      id: data.id as string,
      keywordId: data.keyword_id as string,
      contentType: data.content_type as ContentType,
      contentId: data.content_id as string,
      isPrimary: data.is_primary as boolean,
      isOptimized: data.is_optimized as boolean,
      optimizationScore: data.optimization_score as number | null,
      lastAuditedAt: data.last_audited_at as string | null,
      createdAt: data.created_at as string,
    };
  }

  private mapAuditFromDb(data: Record<string, unknown>): SEOAudit {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      contentType: data.content_type as ContentType,
      contentId: data.content_id as string,
      keywordId: data.keyword_id as string | null,
      overallScore: data.overall_score as number | null,
      titleScore: data.title_score as number | null,
      metaScore: data.meta_score as number | null,
      headingScore: data.heading_score as number | null,
      contentScore: data.content_score as number | null,
      linkScore: data.link_score as number | null,
      findings: (data.findings as Record<string, unknown>) || {},
      recommendations: (data.recommendations as SEOAudit['recommendations']) || [],
      sessionId: data.session_id as string | null,
      createdAt: data.created_at as string,
    };
  }

  /**
   * Parse keywords from AI response
   */
  private parseKeywordsFromResponse(response: string): CreateKeywordInput[] {
    const keywords: CreateKeywordInput[] = [];

    // Simple parsing - look for bullet points or numbered lists
    const lines = response.split('\n');
    let currentCategory: KeywordCategory = 'primary';

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect category headers
      if (/primary/i.test(trimmed)) currentCategory = 'primary';
      else if (/secondary/i.test(trimmed)) currentCategory = 'secondary';
      else if (/long.?tail/i.test(trimmed)) currentCategory = 'long_tail';
      else if (/question/i.test(trimmed)) currentCategory = 'question';

      // Extract keywords from bullet points
      const bulletMatch = trimmed.match(/^[-*•]\s*"?([^":\n]+)"?\s*[-–:]?\s*(.*)?$/);
      if (bulletMatch) {
        const keyword = bulletMatch[1].trim().toLowerCase();
        const meta = bulletMatch[2] || '';

        if (keyword.length > 2 && keyword.length < 100) {
          const input: CreateKeywordInput = {
            keyword,
            category: currentCategory,
            source: 'ai_research',
          };

          // Try to extract volume/competition from meta
          if (/high\s*volume/i.test(meta)) input.volumeEstimate = 'high';
          else if (/medium\s*volume/i.test(meta)) input.volumeEstimate = 'medium';
          else if (/low\s*volume/i.test(meta)) input.volumeEstimate = 'low';

          if (/high\s*competition/i.test(meta)) input.competition = 'high';
          else if (/medium\s*competition/i.test(meta)) input.competition = 'medium';
          else if (/low\s*competition/i.test(meta)) input.competition = 'low';

          if (/informational/i.test(meta)) input.searchIntent = 'informational';
          else if (/transactional/i.test(meta)) input.searchIntent = 'transactional';
          else if (/navigational/i.test(meta)) input.searchIntent = 'navigational';
          else if (/commercial/i.test(meta)) input.searchIntent = 'commercial';

          keywords.push(input);
        }
      }
    }

    return keywords;
  }

  /**
   * Parse audit results from AI response
   */
  private parseAuditFromResponse(response: string): {
    overallScore: number | null;
    titleScore: number | null;
    metaScore: number | null;
    headingScore: number | null;
    contentScore: number | null;
    linkScore: number | null;
    findings: Record<string, unknown>;
    recommendations: Array<{ category: string; issue: string; suggestion: string; priority: string }>;
  } {
    const result = {
      overallScore: null as number | null,
      titleScore: null as number | null,
      metaScore: null as number | null,
      headingScore: null as number | null,
      contentScore: null as number | null,
      linkScore: null as number | null,
      findings: {} as Record<string, unknown>,
      recommendations: [] as Array<{ category: string; issue: string; suggestion: string; priority: string }>,
    };

    // Try to extract scores (look for patterns like "Score: 75/100" or "75%")
    const scorePatterns = [
      { key: 'overallScore', pattern: /overall\s*(?:score)?[:\s]*(\d+)/i },
      { key: 'titleScore', pattern: /title\s*(?:score)?[:\s]*(\d+)/i },
      { key: 'metaScore', pattern: /meta\s*(?:description)?\s*(?:score)?[:\s]*(\d+)/i },
      { key: 'headingScore', pattern: /head(?:ing|er)s?\s*(?:score)?[:\s]*(\d+)/i },
      { key: 'contentScore', pattern: /content\s*(?:score)?[:\s]*(\d+)/i },
      { key: 'linkScore', pattern: /link(?:ing|s)?\s*(?:score)?[:\s]*(\d+)/i },
    ];

    for (const { key, pattern } of scorePatterns) {
      const match = response.match(pattern);
      if (match) {
        (result as Record<string, unknown>)[key] = Math.min(100, Math.max(0, parseInt(match[1], 10)));
      }
    }

    // Extract recommendations (look for bullet points with suggestions)
    const lines = response.split('\n');
    let currentCategory = 'general';

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect category headers
      if (/title/i.test(trimmed) && !trimmed.includes(':')) currentCategory = 'title';
      else if (/meta/i.test(trimmed) && !trimmed.includes(':')) currentCategory = 'meta';
      else if (/heading/i.test(trimmed) && !trimmed.includes(':')) currentCategory = 'heading';
      else if (/content/i.test(trimmed) && !trimmed.includes(':')) currentCategory = 'content';
      else if (/link/i.test(trimmed) && !trimmed.includes(':')) currentCategory = 'linking';

      // Extract recommendations from bullet points
      const bulletMatch = trimmed.match(/^[-*•]\s*(.+)$/);
      if (bulletMatch) {
        const text = bulletMatch[1].trim();
        if (text.length > 10 && text.length < 500) {
          result.recommendations.push({
            category: currentCategory,
            issue: text,
            suggestion: text,
            priority: /urgent|critical|important/i.test(text) ? 'high' : 'medium',
          });
        }
      }
    }

    result.findings = {
      rawResponse: response,
      parsedAt: new Date().toISOString(),
    };

    return result;
  }

  /**
   * Format optimization content for suggestion
   */
  private formatOptimizationContent(audit: SEOAudit): string {
    let content = `## SEO Audit Results\n\n`;
    content += `**Overall Score:** ${audit.overallScore || 'N/A'}/100\n\n`;

    content += `### Scores by Category\n`;
    content += `- Title: ${audit.titleScore || 'N/A'}/100\n`;
    content += `- Meta Description: ${audit.metaScore || 'N/A'}/100\n`;
    content += `- Headings: ${audit.headingScore || 'N/A'}/100\n`;
    content += `- Content: ${audit.contentScore || 'N/A'}/100\n`;
    content += `- Internal Linking: ${audit.linkScore || 'N/A'}/100\n\n`;

    if (audit.recommendations.length > 0) {
      content += `### Recommendations\n\n`;
      for (const rec of audit.recommendations) {
        content += `- **[${rec.category}]** ${rec.suggestion}\n`;
      }
    }

    return content;
  }
}

// Singleton instance
export const seoService = new SEOService();
