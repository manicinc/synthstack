/**
 * @file searchEngine.ts
 * @description Hybrid search engine combining semantic (ONNX) and lexical (BM25) search
 */

import type {
  Document,
  SearchOptions,
  SearchResult,
  SearchBackend,
  SearchFilters,
} from './types'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import { getModelLoader, embedText } from './modelLoader'
import { getAllDocuments } from '../db/schema'
import {
  cosineSimilarity,
  extractSnippet,
  tokenize,
  removeStopWords,
  createCacheKey,
  measureTime,
  sortBy,
} from './utils'
import { getCachedSearchResults, cacheSearchResults } from '../db/schema'

// ============================================
// Search Engine Class
// ============================================

export class SearchEngine {
  private documents: Document[] = []
  private bm25Index: BM25Index | null = null

  /**
   * Load all documents from IndexedDB
   */
  async loadDocuments(): Promise<void> {
    this.documents = await getAllDocuments()
    devLog(`Loaded ${this.documents.length} documents for search`)

    // Build BM25 index for lexical search
    this.buildBM25Index()
  }

  /**
   * Refresh document index (call after adding/removing documents)
   */
  async refresh(): Promise<void> {
    await this.loadDocuments()
  }

  /**
   * Search documents using hybrid approach
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      topK = 10,
      minScore = 0.3,
      filters,
      backend = 'auto',
      hybrid = true,
      hybridAlpha = 0.7, // 70% semantic, 30% lexical
    } = options

    // Check cache first
    const cacheKey = createCacheKey(query, options)
    const cached = await getCachedSearchResults(cacheKey)
    if (cached) {
      devLog('Using cached search results')
      return cached.results
    }

    // Apply filters first to reduce search space
    const filteredDocs = this.applyFilters(this.documents, filters)

    if (filteredDocs.length === 0) {
      return []
    }

    // Determine search backend
    const actualBackend = await this.selectBackend(backend)

    let results: SearchResult[]

    if (hybrid && actualBackend !== 'bm25') {
      // Hybrid search: combine semantic + lexical
      results = await this.hybridSearch(query, filteredDocs, topK, hybridAlpha)
    } else if (actualBackend === 'bm25') {
      // Lexical-only search
      results = await this.lexicalSearch(query, filteredDocs, topK)
    } else {
      // Semantic-only search
      results = await this.semanticSearch(query, filteredDocs, topK, actualBackend)
    }

    // Filter by minimum score
    results = results.filter((r) => r.score >= minScore)

    // Cache results (5 minute TTL)
    await cacheSearchResults({
      queryHash: cacheKey,
      results,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000, // 5 minutes
    })

    return results
  }

  // ============================================
  // Search Implementations
  // ============================================

  /**
   * Semantic search using embeddings
   */
  private async semanticSearch(
    query: string,
    documents: Document[],
    topK: number,
    backend: SearchBackend
  ): Promise<SearchResult[]> {
    const { result, timeMs } = await measureTime(async () => {
      // Generate query embedding
      const queryEmbedding = await embedText(query)

      // Calculate similarity with all documents
      const scored = documents.map((doc) => ({
        document: doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding),
      }))

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score)

      // Take top K
      const topResults = scored.slice(0, topK)

      // Add snippets and highlights
      return topResults.map((item) => ({
        document: item.document,
        score: item.score,
        snippet: extractSnippet(item.document.content, query),
        highlights: [],
        backend,
      }))
    })

    devLog(`Semantic search completed in ${timeMs.toFixed(0)}ms`)
    return result
  }

  /**
   * Lexical search using BM25
   */
  private async lexicalSearch(
    query: string,
    documents: Document[],
    topK: number
  ): Promise<SearchResult[]> {
    const { result, timeMs } = await measureTime(async () => {
      if (!this.bm25Index) {
        this.buildBM25Index()
      }

      const queryTokens = tokenize(query)
      const queryTokensFiltered = removeStopWords(queryTokens)

      // Calculate BM25 score for each document
      const scored = documents.map((doc) => ({
        document: doc,
        score: this.calculateBM25Score(queryTokensFiltered, doc),
      }))

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score)

      // Take top K
      const topResults = scored.slice(0, topK)

      // Normalize scores to 0-1 range
      const maxScore = topResults[0]?.score || 1
      return topResults.map((item) => ({
        document: item.document,
        score: item.score / maxScore, // Normalize
        snippet: extractSnippet(item.document.content, query),
        highlights: [],
        backend: 'bm25' as SearchBackend,
      }))
    })

    devLog(`Lexical search completed in ${timeMs.toFixed(0)}ms`)
    return result
  }

  /**
   * Hybrid search combining semantic and lexical
   */
  private async hybridSearch(
    query: string,
    documents: Document[],
    topK: number,
    alpha: number
  ): Promise<SearchResult[]> {
    const { result, timeMs } = await measureTime(async () => {
      // Run both searches in parallel
      const [semanticResults, lexicalResults] = await Promise.all([
        this.semanticSearch(query, documents, topK * 2, 'onnx'),
        this.lexicalSearch(query, documents, topK * 2),
      ])

      // Create score maps
      const semanticScores = new Map(
        semanticResults.map((r) => [r.document.id, r.score])
      )
      const lexicalScores = new Map(lexicalResults.map((r) => [r.document.id, r.score]))

      // Combine scores using weighted average
      const combinedScores = new Map<string, number>()
      const allDocIds = new Set([
        ...semanticScores.keys(),
        ...lexicalScores.keys(),
      ])

      for (const docId of allDocIds) {
        const semanticScore = semanticScores.get(docId) || 0
        const lexicalScore = lexicalScores.get(docId) || 0
        const combinedScore = alpha * semanticScore + (1 - alpha) * lexicalScore
        combinedScores.set(docId, combinedScore)
      }

      // Sort by combined score
      const sortedDocs = Array.from(combinedScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topK)

      // Build results
      return sortedDocs.map(([docId, score]) => {
        const doc = documents.find((d) => d.id === docId)!
        return {
          document: doc,
          score,
          snippet: extractSnippet(doc.content, query),
          highlights: [],
          backend: 'onnx' as SearchBackend, // Primary backend
        }
      })
    })

    devLog(`Hybrid search completed in ${timeMs.toFixed(0)}ms`)
    return result
  }

  // ============================================
  // BM25 Implementation
  // ============================================

  /**
   * Build BM25 index from documents
   */
  private buildBM25Index(): void {
    const docLengths: number[] = []
    const termFreqs: Map<string, number>[] = []

    for (const doc of this.documents) {
      const tokens = tokenize(doc.content)
      const tokensFiltered = removeStopWords(tokens)

      docLengths.push(tokensFiltered.length)

      const termFreq = new Map<string, number>()
      for (const token of tokensFiltered) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1)
      }
      termFreqs.push(termFreq)
    }

    const avgDocLength =
      docLengths.reduce((sum, len) => sum + len, 0) / docLengths.length || 1

    this.bm25Index = {
      docLengths,
      termFreqs,
      avgDocLength,
    }

    devLog('Built BM25 index')
  }

  /**
   * Calculate BM25 score for a document
   */
  private calculateBM25Score(queryTokens: string[], doc: Document): number {
    if (!this.bm25Index) return 0

    const k1 = 1.5 // Term frequency saturation
    const b = 0.75 // Length normalization

    const docIndex = this.documents.findIndex((d) => d.id === doc.id)
    if (docIndex === -1) return 0

    const docLength = this.bm25Index.docLengths[docIndex]
    const termFreq = this.bm25Index.termFreqs[docIndex]
    const avgDocLength = this.bm25Index.avgDocLength

    let score = 0

    for (const term of queryTokens) {
      const tf = termFreq.get(term) || 0
      if (tf === 0) continue

      // Calculate IDF (inverse document frequency)
      const docsWithTerm = this.bm25Index.termFreqs.filter((tf) => tf.has(term)).length
      const idf = Math.log(
        (this.documents.length - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1
      )

      // BM25 formula
      const numerator = tf * (k1 + 1)
      const denominator = tf + k1 * (1 - b + (b * docLength) / avgDocLength)
      score += idf * (numerator / denominator)
    }

    return score
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Select appropriate search backend
   */
  private async selectBackend(
    requested: SearchBackend
  ): Promise<Exclude<SearchBackend, 'auto'>> {
    if (requested !== 'auto') {
      return requested as Exclude<SearchBackend, 'auto'>
    }

    // Auto-detect best available backend
    const modelLoader = getModelLoader()

    if (modelLoader.isReady()) {
      return 'onnx'
    }

    // Try to initialize model
    try {
      await modelLoader.initialize()
      return 'onnx'
    } catch {
      // Fall back to BM25
      devWarn('ONNX model unavailable, using BM25 lexical search')
      return 'bm25'
    }
  }

  /**
   * Apply filters to documents
   */
  private applyFilters(documents: Document[], filters?: SearchFilters): Document[] {
    if (!filters) return documents

    let filtered = documents

    // Filter by type
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter((doc) => filters.types!.includes(doc.type))
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((doc) =>
        filters.tags!.some((tag) => doc.tags.includes(tag))
      )
    }

    // Filter by date range
    if (filters.dateRange) {
      const { from, to } = filters.dateRange
      filtered = filtered.filter((doc) => {
        const uploadedAt = new Date(doc.uploadedAt).getTime()
        if (from && uploadedAt < new Date(from).getTime()) return false
        if (to && uploadedAt > new Date(to).getTime()) return false
        return true
      })
    }

    // Filter by source
    if (filters.sources && filters.sources.length > 0) {
      filtered = filtered.filter((doc) =>
        filters.sources!.some((source) => doc.metadata.source.includes(source))
      )
    }

    return filtered
  }

  /**
   * Get total document count
   */
  getDocumentCount(): number {
    return this.documents.length
  }

  /**
   * Check if search engine is ready
   */
  isReady(): boolean {
    return this.documents.length > 0
  }
}

// ============================================
// Types
// ============================================

interface BM25Index {
  docLengths: number[]
  termFreqs: Map<string, number>[]
  avgDocLength: number
}

// ============================================
// Singleton Instance
// ============================================

let searchEngineInstance: SearchEngine | null = null

/**
 * Get singleton search engine instance
 */
export function getSearchEngine(): SearchEngine {
  if (!searchEngineInstance) {
    searchEngineInstance = new SearchEngine()
  }
  return searchEngineInstance
}

/**
 * Initialize search engine
 */
export async function initializeSearch(): Promise<void> {
  const engine = getSearchEngine()
  await engine.loadDocuments()
}

/**
 * Search documents
 */
export async function search(
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  const engine = getSearchEngine()
  if (!engine.isReady()) {
    await engine.loadDocuments()
  }
  return await engine.search(query, options)
}

// ============================================
// Export
// ============================================

export default SearchEngine
