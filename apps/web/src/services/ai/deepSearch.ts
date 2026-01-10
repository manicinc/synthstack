/**
 * @file deepSearch.ts
 * @description Deep learning search service for copilot chat integration
 *
 * Provides offline semantic search with citations for the main copilot interface.
 * No LLM required - uses ONNX embeddings + BM25 hybrid search.
 */

import { getSearchEngine } from './searchEngine'
import { getDocument } from '../db/schema'
import type { SearchResult, SearchOptions, SearchFilters } from './types'

// ============================================
// Types
// ============================================

export interface DeepSearchResult {
  results: SearchResult[]
  summary: string
  citations: Citation[]
  inferenceTimeMs: number
  backend: 'onnx' | 'transformers' | 'bm25'
  projectScope: boolean
}

export interface Citation {
  id: string
  title: string
  snippet: string
  score: number
  type: string
  source: string
}

export interface DeepSearchOptions {
  projectId?: string
  topK?: number
  minScore?: number
  includeSnippets?: boolean
}

// ============================================
// Deep Search Functions
// ============================================

/**
 * Perform deep learning search with automatic summary generation
 */
export async function performDeepSearch(
  query: string,
  options: DeepSearchOptions = {}
): Promise<DeepSearchResult> {
  const startTime = performance.now()
  const engine = getSearchEngine()

  // Check if engine is ready
  if (!engine.isReady()) {
    await engine.loadDocuments()
  }

  // Build search filters
  const filters: SearchFilters | undefined = options.projectId
    ? {
        sources: [`project:${options.projectId}`],
      }
    : undefined

  // Execute hybrid search
  const searchOptions: SearchOptions = {
    topK: options.topK || 10,
    minScore: options.minScore || 0.3,
    filters,
    hybrid: true,
    hybridAlpha: 0.7, // 70% semantic, 30% lexical
  }

  const results = await engine.search(query, searchOptions)
  const inferenceTimeMs = performance.now() - startTime

  // Generate summary from results
  const summary = generateSummary(query, results)

  // Extract citations
  const citations = extractCitations(results)

  // Determine backend used
  const backend: 'onnx' | 'transformers' | 'bm25' =
    (results[0]?.backend === 'auto' ? 'onnx' : results[0]?.backend) || 'bm25'

  return {
    results,
    summary,
    citations,
    inferenceTimeMs,
    backend,
    projectScope: !!options.projectId,
  }
}

/**
 * Search within a specific project scope
 */
export async function searchInProject(
  projectId: string,
  query: string,
  options: Omit<DeepSearchOptions, 'projectId'> = {}
): Promise<DeepSearchResult> {
  return performDeepSearch(query, {
    ...options,
    projectId,
  })
}

/**
 * Get similar documents to a given document
 */
export async function findSimilarDocuments(
  documentId: string,
  options: DeepSearchOptions = {}
): Promise<DeepSearchResult> {
  const document = await getDocument(documentId)

  if (!document) {
    throw new Error(`Document not found: ${documentId}`)
  }

  // Use document content as query
  return performDeepSearch(document.content.substring(0, 500), {
    ...options,
    topK: options.topK || 5,
  })
}

// ============================================
// Summary Generation
// ============================================

/**
 * Generate a natural language summary from search results
 */
function generateSummary(query: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return `No results found for "${query}". Try rephrasing your question or uploading more documents.`
  }

  const topResults = results.slice(0, 3)
  const sources = topResults.map((r) => r.document.title).join(', ')

  // Build summary based on result count
  if (results.length === 1) {
    return `Found 1 document about "${query}":\n\n${topResults[0].snippet}\n\nSource: ${topResults[0].document.title}`
  }

  // Multiple results
  const snippets = topResults
    .map((r, i) => `${i + 1}. ${r.snippet} (from ${r.document.title})`)
    .join('\n\n')

  return `Found ${results.length} documents related to "${query}":\n\n${snippets}`
}

/**
 * Extract structured citations from search results
 */
function extractCitations(results: SearchResult[]): Citation[] {
  return results.map((result) => ({
    id: result.document.id,
    title: result.document.title,
    snippet: result.snippet,
    score: result.score,
    type: result.document.type,
    source: result.document.metadata.source || 'Unknown',
  }))
}

// ============================================
// Statistics & Analytics
// ============================================

export interface SearchStats {
  totalQueries: number
  averageLatency: number
  backendUsage: {
    onnx: number
    transformers: number
    bm25: number
  }
  topQueries: Array<{ query: string; count: number }>
}

let searchHistory: Array<{
  query: string
  backend: string
  latency: number
  timestamp: number
}> = []

/**
 * Track search for analytics
 */
export function trackSearch(
  query: string,
  backend: string,
  latency: number
): void {
  searchHistory.push({
    query,
    backend,
    latency,
    timestamp: Date.now(),
  })

  // Keep only last 100 searches
  if (searchHistory.length > 100) {
    searchHistory = searchHistory.slice(-100)
  }
}

/**
 * Get search statistics
 */
export function getSearchStats(): SearchStats {
  if (searchHistory.length === 0) {
    return {
      totalQueries: 0,
      averageLatency: 0,
      backendUsage: { onnx: 0, transformers: 0, bm25: 0 },
      topQueries: [],
    }
  }

  const totalQueries = searchHistory.length
  const averageLatency =
    searchHistory.reduce((sum, s) => sum + s.latency, 0) / totalQueries

  // Backend usage
  const backendCounts = searchHistory.reduce(
    (acc, s) => {
      acc[s.backend as keyof typeof acc]++
      return acc
    },
    { onnx: 0, transformers: 0, bm25: 0 }
  )

  // Top queries (count frequency)
  const queryFreq = searchHistory.reduce(
    (acc, s) => {
      acc[s.query] = (acc[s.query] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const topQueries = Object.entries(queryFreq)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalQueries,
    averageLatency,
    backendUsage: backendCounts,
    topQueries,
  }
}

/**
 * Clear search history
 */
export function clearSearchHistory(): void {
  searchHistory = []
}

// ============================================
// Export
// ============================================

export default {
  performDeepSearch,
  searchInProject,
  findSimilarDocuments,
  generateSummary,
  extractCitations,
  getSearchStats,
  clearSearchHistory,
  trackSearch,
}
