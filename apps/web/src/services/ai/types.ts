/**
 * @file types.ts
 * @description TypeScript interfaces and types for the offline AI system
 */

// ============================================
// Document Types
// ============================================

/**
 * Document stored in IndexedDB with embeddings
 */
export interface Document {
  id: string
  title: string
  content: string
  type: DocumentType
  tags: string[]
  uploadedAt: string // ISO timestamp
  embedding: Float32Array // 384-dim vector (or 96-dim on mobile)
  metadata: DocumentMetadata
}

export type DocumentType =
  | 'documentation'
  | 'tutorial'
  | 'api-reference'
  | 'guide'
  | 'faq'
  | 'other'

export interface DocumentMetadata {
  fileType: 'pdf' | 'txt' | 'md' | 'json' | 'csv' | 'docx' | 'url' | 'text'
  source: string // Original filename or URL
  size: number // Bytes
  extractedKeywords?: string[]
  detectedTopics?: string[]
  headings?: string[]
  codeBlocks?: CodeBlock[]
  links?: string[]
  language?: string
}

export interface CodeBlock {
  language: string
  code: string
  lineNumber?: number
}

// ============================================
// Embedding & Model Types
// ============================================

/**
 * ONNX model configuration
 */
export interface ModelConfig {
  name: string // 'all-MiniLM-L6-v2'
  dimension: number // 384 (desktop) or 96 (mobile)
  modelPath: string // Path to .onnx file
  tokenizerPath: string // Path to tokenizer.json
  configPath: string // Path to config.json
  maxSequenceLength: number // 512 for all-MiniLM-L6-v2
}

/**
 * Embedding request options
 */
export interface EmbedOptions {
  normalize?: boolean // L2 normalize embeddings (default: true)
  pooling?: 'mean' | 'cls' | 'max' // Token pooling strategy (default: mean)
  truncate?: boolean // Truncate to maxSequenceLength (default: true)
}

/**
 * Embedding result
 */
export interface EmbedResult {
  embedding: Float32Array
  tokenCount: number
  truncated: boolean
  inferenceTimeMs: number
}

// ============================================
// Search Types
// ============================================

/**
 * Search query options
 */
export interface SearchOptions {
  topK?: number // Number of results to return (default: 10)
  minScore?: number // Minimum similarity score 0-1 (default: 0.3)
  filters?: SearchFilters
  backend?: SearchBackend // Force specific backend
  hybrid?: boolean // Combine semantic + lexical (default: true)
  hybridAlpha?: number // Semantic weight 0-1 (default: 0.7)
}

export interface SearchFilters {
  types?: DocumentType[]
  tags?: string[]
  dateRange?: {
    from?: string // ISO timestamp
    to?: string // ISO timestamp
  }
  sources?: string[]
}

export type SearchBackend = 'onnx' | 'transformers' | 'bm25' | 'auto'

/**
 * Search result with score and context
 */
export interface SearchResult {
  document: Document
  score: number // 0-1 similarity score
  snippet: string // Relevant excerpt with query context
  highlights: SearchHighlight[]
  backend: SearchBackend // Which backend was used
}

export interface SearchHighlight {
  start: number // Character offset in content
  end: number
  type: 'exact' | 'fuzzy' | 'semantic'
}

// ============================================
// Backend Types
// ============================================

/**
 * Backend performance metrics
 */
export interface BackendMetrics {
  backend: ExecutionProvider
  available: boolean
  loadTimeMs: number
  inferenceTimeMs: number // Average inference time
  memoryUsageMB: number
  lastUsed: number // Timestamp
}

/**
 * Model loader state
 */
export interface ModelLoaderState {
  status: 'uninitialized' | 'loading' | 'ready' | 'failed'
  progress: number // 0-100 for download progress
  error?: string
  backend: ExecutionProvider | null
  metrics?: BackendMetrics
}

/**
 * Execution provider options for ONNX Runtime
 */
export type ExecutionProvider =
  | 'webgpu'
  | 'wasm'
  | 'wasm-simd'
  | 'wasm-threaded'
  | 'cpu'

// ============================================
// Storage Types
// ============================================

/**
 * IndexedDB store names
 */
export enum StoreName {
  Documents = 'documents',
  ModelCache = 'model_cache',
  SearchCache = 'search_cache',
}

/**
 * Model cache entry
 */
export interface ModelCacheEntry {
  key: 'onnx-model' | 'tokenizer' | 'config'
  data: ArrayBuffer
  version: string
  cachedAt: number // Timestamp
}

/**
 * Search cache entry
 */
export interface SearchCacheEntry {
  queryHash: string // Hash of query text + options
  results: SearchResult[]
  timestamp: number
  ttl: number // Cache TTL in ms
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  usage: number // Bytes used
  quota: number // Total bytes available
  percentUsed: number // 0-100
  persistent: boolean // Has persistent storage permission
}

// ============================================
// NLP Types
// ============================================

/**
 * NLP analysis result from compromise.js
 */
export interface NLPAnalysis {
  title: string // Extracted or inferred title
  type: DocumentType // Auto-detected document type
  tags: string[] // Extracted keywords and topics
  keywords: string[] // Nouns, verbs, technical terms
  topics: string[] // Detected topics (authentication, API, etc.)
  entities: string[] // Product names, technologies
  language: string // Detected language (default: 'en')
  headings: string[] // Extracted headings (H1-H3)
  codeBlocks: CodeBlock[] // Code snippets with language
  summary?: string // Generated summary (first 200 chars)
}

/**
 * Document categorization confidence
 */
export interface CategoryConfidence {
  category: DocumentType
  confidence: number // 0-1
  keywords: string[] // Matched keywords
}

// ============================================
// BM25 Types
// ============================================

/**
 * BM25 algorithm parameters
 */
export interface BM25Config {
  k1: number // Term frequency saturation (default: 1.5)
  b: number // Length normalization (default: 0.75)
  epsilon: number // IDF floor (default: 0.25)
}

/**
 * BM25 document representation
 */
export interface BM25Document {
  id: string
  tokens: string[]
  tokenFrequency: Map<string, number>
  length: number
}

// ============================================
// Error Types
// ============================================

/**
 * AI service error codes
 */
export enum AIErrorCode {
  ModelLoadFailed = 'MODEL_LOAD_FAILED',
  InferenceFailed = 'INFERENCE_FAILED',
  StorageQuotaExceeded = 'STORAGE_QUOTA_EXCEEDED',
  InvalidInput = 'INVALID_INPUT',
  BackendUnavailable = 'BACKEND_UNAVAILABLE',
  NetworkError = 'NETWORK_ERROR',
}

/**
 * Structured error for AI operations
 */
export class AIError extends Error {
  code: AIErrorCode
  details?: any

  constructor(code: AIErrorCode, message: string, details?: any) {
    super(message)
    this.name = 'AIError'
    this.code = code
    this.details = details
  }
}

// ============================================
// Utility Types
// ============================================

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (progress: {
  current: number
  total: number
  percent: number
  message?: string
}) => void

/**
 * Async iterator result type
 */
export type AsyncResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

// ============================================
// Parser Types
// ============================================

/**
 * Parsed document result from file parsers
 */
export interface ParsedDocument {
  content: string
  metadata: Record<string, any>
}

/**
 * Parser options for document parsing
 */
export interface ParserOptions {
  maxLength?: number // Maximum content length
  includeMetadata?: boolean // Include extracted metadata
  preserveFormatting?: boolean // Preserve formatting when possible
}
