/**
 * @file utils.ts
 * @description Utility functions for AI operations
 */

// ============================================
// Vector Operations
// ============================================

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 is identical
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} !== ${b.length}`)
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

/**
 * L2 normalize a vector (make it unit length)
 */
export function normalize(vector: Float32Array): Float32Array {
  let norm = 0
  for (let i = 0; i < vector.length; i++) {
    norm += vector[i] * vector[i]
  }
  norm = Math.sqrt(norm)

  if (norm === 0) return vector

  const normalized = new Float32Array(vector.length)
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / norm
  }

  return normalized
}

/**
 * Reduce embedding dimension using random projection
 * Useful for mobile devices to save storage and memory
 */
export function reduceDimension(
  embedding: Float32Array,
  targetDim: number,
  seed = 42
): Float32Array {
  if (embedding.length <= targetDim) {
    return embedding
  }

  // Simple random projection matrix (seeded for reproducibility)
  const rng = seededRandom(seed)
  const reduced = new Float32Array(targetDim)

  for (let i = 0; i < targetDim; i++) {
    let sum = 0
    for (let j = 0; j < embedding.length; j++) {
      // Random -1 or 1
      const weight = rng() > 0.5 ? 1 : -1
      sum += embedding[j] * weight
    }
    reduced[i] = sum / Math.sqrt(embedding.length)
  }

  return normalize(reduced)
}

/**
 * Seeded random number generator (LCG algorithm)
 */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32
    return state / 2 ** 32
  }
}

// ============================================
// Text Processing
// ============================================

/**
 * Extract a relevant snippet from text around query matches
 */
export function extractSnippet(
  text: string,
  query: string,
  maxLength = 200
): string {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()

  // Find first occurrence of any query word
  const queryWords = queryLower.split(/\s+/)
  let bestIndex = -1
  let bestWord = ''

  for (const word of queryWords) {
    const index = textLower.indexOf(word)
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index
      bestWord = word
    }
  }

  if (bestIndex === -1) {
    // No match found, return beginning
    return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '')
  }

  // Center snippet around the match
  const halfLength = Math.floor(maxLength / 2)
  let start = Math.max(0, bestIndex - halfLength)
  let end = Math.min(text.length, bestIndex + bestWord.length + halfLength)

  // Adjust to word boundaries
  if (start > 0) {
    const spaceIndex = text.lastIndexOf(' ', start)
    if (spaceIndex !== -1 && spaceIndex > 0) {
      start = spaceIndex + 1
    }
  }

  if (end < text.length) {
    const spaceIndex = text.indexOf(' ', end)
    if (spaceIndex !== -1) {
      end = spaceIndex
    }
  }

  let snippet = text.slice(start, end)
  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'

  return snippet
}

/**
 * Tokenize text (simple whitespace + punctuation splitting)
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .split(/\s+/)
    .filter((token) => token.length > 0)
}

/**
 * Remove stop words from token array
 */
export function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((token) => !STOP_WORDS.has(token))
}

/**
 * Common English stop words
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
])

/**
 * Calculate edit distance between two strings (Levenshtein)
 */
export function editDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// ============================================
// Hashing & Caching
// ============================================

/**
 * Simple string hash function (djb2)
 */
export function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Create cache key from query and options
 */
export function createCacheKey(query: string, options?: any): string {
  const key = query + JSON.stringify(options || {})
  return hashString(key)
}

// ============================================
// Performance Monitoring
// ============================================

/**
 * Measure execution time of async function
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; timeMs: number }> {
  const start = performance.now()
  const result = await fn()
  const timeMs = performance.now() - start
  return { result, timeMs }
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delayMs)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delayMs) {
      lastCall = now
      fn(...args)
    }
  }
}

// ============================================
// Browser Detection
// ============================================

/**
 * Detect if WebGPU is available
 */
export async function detectWebGPU(): Promise<boolean> {
  if (!navigator.gpu) return false

  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

/**
 * Detect if WASM SIMD is supported
 */
export function detectWasmSIMD(): boolean {
  try {
    return WebAssembly.validate(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0,
        253, 15, 253, 98, 11,
      ])
    )
  } catch {
    return false
  }
}

/**
 * Detect optimal execution provider for ONNX Runtime
 */
export async function detectOptimalProvider(): Promise<
  'webgpu' | 'wasm-simd' | 'wasm'
> {
  // WebGPU is fastest (5-10x speedup)
  if (await detectWebGPU()) {
    return 'webgpu'
  }

  // WASM SIMD is 2-3x faster than plain WASM
  if (detectWasmSIMD()) {
    return 'wasm-simd'
  }

  return 'wasm'
}

/**
 * Detect if running on mobile device
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Get recommended embedding dimension based on device
 */
export function getRecommendedDimension(): number {
  return isMobile() ? 96 : 384
}

// ============================================
// Array Utilities
// ============================================

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Sort array by multiple keys
 */
export function sortBy<T>(
  array: T[],
  ...keys: ((item: T) => number | string)[]
): T[] {
  return array.sort((a, b) => {
    for (const key of keys) {
      const aVal = key(a)
      const bVal = key(b)
      if (aVal < bVal) return -1
      if (aVal > bVal) return 1
    }
    return 0
  })
}

// ============================================
// Format Utilities
// ============================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

/**
 * Format milliseconds to human-readable string
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return ms.toFixed(0) + 'ms'
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's'
  return (ms / 60000).toFixed(1) + 'min'
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return (value * 100).toFixed(decimals) + '%'
}
