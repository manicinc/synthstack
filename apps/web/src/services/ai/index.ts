/**
 * @file index.ts
 * @description Main entry point for offline AI services
 */

// Model loading
export { ModelLoader, getModelLoader, initializeModel, embedText } from './modelLoader'

// Search
export { SearchEngine, getSearchEngine, initializeSearch, search } from './searchEngine'

// Types
export type {
  Document,
  DocumentType,
  DocumentMetadata,
  ModelConfig,
  EmbedOptions,
  EmbedResult,
  SearchOptions,
  SearchResult,
  SearchBackend,
  SearchFilters,
  ExecutionProvider,
  ModelLoaderState,
  BackendMetrics,
  StorageQuota,
  NLPAnalysis,
  AIError,
  AIErrorCode,
} from './types'

// Utilities
export {
  cosineSimilarity,
  normalize,
  reduceDimension,
  extractSnippet,
  tokenize,
  removeStopWords,
  detectWebGPU,
  detectWasmSIMD,
  detectOptimalProvider,
  isMobile,
  getRecommendedDimension,
  formatBytes,
  formatTime,
  formatPercent,
} from './utils'

// Database
export {
  addDocument,
  getDocument,
  getAllDocuments,
  getDocumentsByType,
  getDocumentsByTag,
  updateDocument,
  deleteDocument,
  clearDocuments,
  countDocuments,
  getDatabaseStats,
} from '../db/schema'

// Quota monitoring
export {
  getStorageQuota,
  requestPersistentStorage,
  checkQuotaStatus,
  estimateDocumentSize,
  canStoreDocument,
  getCleanupRecommendations,
  getQuotaMonitor,
} from '../db/quota'
