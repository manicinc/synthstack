/**
 * Hybrid Search Service
 *
 * Combines vector similarity search (Qdrant) with keyword search
 * for improved retrieval accuracy using Reciprocal Rank Fusion (RRF).
 *
 * Why hybrid search?
 * - Vector search: Great for semantic similarity, handles synonyms and paraphrasing
 * - Keyword search: Precise for exact terms, acronyms, proper nouns
 * - Combined: Best of both worlds with RRF ranking
 */

import { vectorDB, type SearchResult } from './vector-db.js';
import { embeddingsService } from './embeddings.js';
import { directus } from './directus.js';

// ============================================
// Types
// ============================================

export interface HybridSearchOptions {
  /** Weight for vector search results (0-1, default: 0.7) */
  vectorWeight: number;
  /** Weight for keyword search results (0-1, default: 0.3) */
  keywordWeight: number;
  /** Minimum combined score to include (default: 0.1) */
  minScore: number;
  /** Maximum results to return (default: 10) */
  limit: number;
  /** Filter to apply to both searches */
  filter?: Record<string, any>;
  /** Enable/disable vector search (default: true) */
  useVector: boolean;
  /** Enable/disable keyword search (default: true) */
  useKeyword: boolean;
  /** RRF k constant (default: 60) - higher values reduce ranking differences */
  rrfK: number;
}

export interface HybridSearchResult {
  /** Document ID */
  id: string;
  /** Document content */
  content: string;
  /** Combined score from RRF */
  score: number;
  /** Vector similarity score (if available) */
  vectorScore?: number;
  /** Keyword relevance score (if available) */
  keywordScore?: number;
  /** Additional metadata */
  metadata: Record<string, any>;
  /** Source of this result */
  source: 'vector' | 'keyword' | 'both';
}

export interface HybridSearchResponse {
  /** Search results sorted by combined score */
  results: HybridSearchResult[];
  /** Original query */
  query: string;
  /** Search statistics */
  stats: {
    vectorResultCount: number;
    keywordResultCount: number;
    combinedResultCount: number;
    searchTimeMs: number;
  };
}

// ============================================
// Default Options
// ============================================

export const DEFAULT_HYBRID_OPTIONS: HybridSearchOptions = {
  vectorWeight: 0.7,
  keywordWeight: 0.3,
  minScore: 0.1,
  limit: 10,
  useVector: true,
  useKeyword: true,
  rrfK: 60,
};

// ============================================
// Keyword Search Implementation
// ============================================

interface KeywordSearchResult {
  id: string;
  content: string;
  rank: number;
  metadata: Record<string, any>;
}

/**
 * Perform keyword search using Directus/PostgreSQL
 * Uses simple text matching since full-text search may not be configured
 */
async function keywordSearch(
  query: string,
  limit: number = 20,
  filter?: Record<string, any>
): Promise<KeywordSearchResult[]> {
  try {
    // Extract keywords from query (remove common stop words)
    const keywords = extractKeywords(query);

    if (keywords.length === 0) {
      return [];
    }

    // Search in knowledge_entries collection (common RAG source)
    const knowledgeResults = await searchKnowledgeEntries(keywords, limit, filter);

    // Search in shared_context collection
    const contextResults = await searchSharedContext(keywords, limit, filter);

    // Combine and rank results
    const combined = [...knowledgeResults, ...contextResults];

    // Score by keyword match count and position
    const scored = combined.map((result) => ({
      ...result,
      rank: calculateKeywordScore(result.content, keywords),
    }));

    // Sort by rank and limit
    return scored.sort((a, b) => b.rank - a.rank).slice(0, limit);
  } catch (error) {
    console.error('Keyword search error:', error);
    return [];
  }
}

/**
 * Extract keywords from query (remove stop words)
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'can',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'what',
    'which',
    'who',
    'how',
    'why',
    'when',
    'where',
    'if',
    'then',
    'so',
    'as',
    'just',
    'about',
    'into',
    'out',
    'up',
    'down',
    'any',
    'all',
    'each',
    'every',
    'some',
    'such',
    'no',
    'not',
    'only',
    'own',
    'same',
    'than',
    'too',
    'very',
    'can',
    'will',
    'just',
    'i',
    'me',
    'my',
    'you',
    'your',
    'we',
    'our',
    'they',
    'their',
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Calculate keyword score based on match count and positions
 */
function calculateKeywordScore(content: string, keywords: string[]): number {
  const lowerContent = content.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    // Count occurrences
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
    const matches = lowerContent.match(regex);
    const count = matches ? matches.length : 0;

    // Add to score (diminishing returns for multiple matches)
    score += Math.min(count, 5) * (1 / keywords.length);

    // Boost for keyword in title/heading position (first 100 chars)
    if (lowerContent.slice(0, 100).includes(keyword)) {
      score += 0.5;
    }
  }

  return score;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search knowledge_entries collection
 */
async function searchKnowledgeEntries(
  keywords: string[],
  limit: number,
  filter?: Record<string, any>
): Promise<KeywordSearchResult[]> {
  try {
    const knowledgeItems = directus.items('knowledge_entries');
    const results = await knowledgeItems.readByQuery({
      fields: ['id', 'title', 'content', 'category', 'tags', 'source_type'],
      filter: {
        _and: [
          {
            _or: keywords.map((kw) => ({
              _or: [{ title: { _contains: kw } }, { content: { _contains: kw } }],
            })),
          },
          ...(filter ? [filter] : []),
        ],
      },
      limit,
    });

    return (results.data || []).map((item: any) => ({
      id: item.id,
      content: `${item.title || ''}\n${item.content || ''}`,
      rank: 0,
      metadata: {
        title: item.title,
        category: item.category,
        tags: item.tags,
        source_type: item.source_type,
        collection: 'knowledge_entries',
      },
    }));
  } catch (error) {
    // Collection may not exist
    console.debug('Knowledge entries search skipped:', error);
    return [];
  }
}

/**
 * Search shared_context collection
 */
async function searchSharedContext(
  keywords: string[],
  limit: number,
  filter?: Record<string, any>
): Promise<KeywordSearchResult[]> {
  try {
    const contextItems = directus.items('shared_context');
    const results = await contextItems.readByQuery({
      fields: ['id', 'title', 'content', 'context_type', 'source_agent'],
      filter: {
        _and: [
          {
            _or: keywords.map((kw) => ({
              _or: [{ title: { _contains: kw } }, { content: { _contains: kw } }],
            })),
          },
          ...(filter ? [filter] : []),
        ],
      },
      limit,
    });

    return (results.data || []).map((item: any) => ({
      id: item.id,
      content: `${item.title || ''}\n${item.content || ''}`,
      rank: 0,
      metadata: {
        title: item.title,
        context_type: item.context_type,
        source_agent: item.source_agent,
        collection: 'shared_context',
      },
    }));
  } catch (error) {
    // Collection may not exist
    console.debug('Shared context search skipped:', error);
    return [];
  }
}

// ============================================
// Reciprocal Rank Fusion (RRF)
// ============================================

/**
 * Combine rankings using Reciprocal Rank Fusion
 * RRF(d) = Σ 1/(k + rank(d)) for each ranking
 *
 * @param vectorResults - Results from vector search
 * @param keywordResults - Results from keyword search
 * @param options - Hybrid search options
 */
function reciprocalRankFusion(
  vectorResults: SearchResult[],
  keywordResults: KeywordSearchResult[],
  options: HybridSearchOptions
): HybridSearchResult[] {
  const { vectorWeight, keywordWeight, rrfK } = options;
  const scoreMap = new Map<string, HybridSearchResult>();

  // Process vector results
  vectorResults.forEach((result, rank) => {
    const rrfScore = vectorWeight * (1 / (rrfK + rank + 1));
    scoreMap.set(result.id, {
      id: result.id,
      content: result.content,
      score: rrfScore,
      vectorScore: result.score,
      metadata: result.metadata,
      source: 'vector',
    });
  });

  // Process keyword results
  keywordResults.forEach((result, rank) => {
    const rrfScore = keywordWeight * (1 / (rrfK + rank + 1));
    const existing = scoreMap.get(result.id);

    if (existing) {
      // Combine scores
      existing.score += rrfScore;
      existing.keywordScore = result.rank;
      existing.source = 'both';
    } else {
      scoreMap.set(result.id, {
        id: result.id,
        content: result.content,
        score: rrfScore,
        keywordScore: result.rank,
        metadata: result.metadata,
        source: 'keyword',
      });
    }
  });

  // Convert to array and sort by combined score
  return Array.from(scoreMap.values()).sort((a, b) => b.score - a.score);
}

// ============================================
// Main Hybrid Search Class
// ============================================

class HybridSearchService {
  /**
   * Perform hybrid search combining vector and keyword search
   */
  async search(
    query: string,
    options: Partial<HybridSearchOptions> = {}
  ): Promise<HybridSearchResponse> {
    const startTime = Date.now();
    const opts: HybridSearchOptions = { ...DEFAULT_HYBRID_OPTIONS, ...options };

    // Fetch more results than needed for better RRF
    const fetchLimit = Math.min(opts.limit * 3, 50);

    let vectorResults: SearchResult[] = [];
    let keywordResults: KeywordSearchResult[] = [];

    // Parallel execution of both searches
    const promises: Promise<any>[] = [];

    if (opts.useVector && embeddingsService.isAvailable()) {
      promises.push(
        (async () => {
          try {
            const embedding = await embeddingsService.generateEmbedding(query);
            vectorResults = await vectorDB.search(embedding, fetchLimit, opts.filter);
          } catch (error) {
            console.error('Vector search failed:', error);
          }
        })()
      );
    }

    if (opts.useKeyword) {
      promises.push(
        (async () => {
          try {
            keywordResults = await keywordSearch(query, fetchLimit, opts.filter);
          } catch (error) {
            console.error('Keyword search failed:', error);
          }
        })()
      );
    }

    await Promise.all(promises);

    // Apply RRF to combine results
    let combined = reciprocalRankFusion(vectorResults, keywordResults, opts);

    // Filter by minimum score
    combined = combined.filter((r) => r.score >= opts.minScore);

    // Limit results
    combined = combined.slice(0, opts.limit);

    const searchTimeMs = Date.now() - startTime;

    return {
      results: combined,
      query,
      stats: {
        vectorResultCount: vectorResults.length,
        keywordResultCount: keywordResults.length,
        combinedResultCount: combined.length,
        searchTimeMs,
      },
    };
  }

  /**
   * Convenience method for vector-only search
   */
  async vectorSearch(
    query: string,
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    if (!embeddingsService.isAvailable()) {
      throw new Error('Embeddings service not available');
    }

    const embedding = await embeddingsService.generateEmbedding(query);
    return vectorDB.search(embedding, limit, filter);
  }

  /**
   * Convenience method for keyword-only search
   */
  async keywordSearchOnly(
    query: string,
    limit: number = 10,
    filter?: Record<string, any>
  ): Promise<KeywordSearchResult[]> {
    return keywordSearch(query, limit, filter);
  }

  /**
   * Check if hybrid search is available
   */
  isAvailable(): boolean {
    return embeddingsService.isAvailable();
  }
}

// Singleton instance
export const hybridSearchService = new HybridSearchService();

// Convenience function
export async function hybridSearch(
  query: string,
  options: Partial<HybridSearchOptions> = {}
): Promise<HybridSearchResponse> {
  return hybridSearchService.search(query, options);
}
