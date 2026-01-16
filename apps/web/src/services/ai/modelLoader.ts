/**
 * @file modelLoader.ts
 * @description ONNX Runtime Web wrapper for loading and running all-MiniLM-L6-v2
 *
 * This module handles:
 * - Model initialization with optimal execution provider (WebGPU > WASM SIMD > WASM)
 * - Tokenization and embedding generation
 * - Graceful fallback chain
 * - Performance monitoring
 */

import * as ort from 'onnxruntime-web'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import type {
  ModelConfig,
  EmbedOptions,
  EmbedResult,
  ExecutionProvider,
  ModelLoaderState,
  BackendMetrics,
} from './types'
import { AIError, AIErrorCode } from './types'
import {
  detectOptimalProvider,
  getRecommendedDimension,
  normalize,
  reduceDimension,
  measureTime,
} from './utils'

// ============================================
// Configuration
// ============================================

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  name: 'all-MiniLM-L6-v2',
  dimension: getRecommendedDimension(), // 384 or 96 based on device
  modelPath: '/models/minilm-l6-v2/model.onnx',
  tokenizerPath: '/models/minilm-l6-v2/tokenizer.json',
  configPath: '/models/minilm-l6-v2/config.json',
  maxSequenceLength: 512,
}

// Configure ONNX Runtime Web to use local WASM files
ort.env.wasm.wasmPaths = '/onnx-wasm/'
ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4

// ============================================
// ModelLoader Class
// ============================================

export class ModelLoader {
  private session: ort.InferenceSession | null = null
  private tokenizer: any = null
  private config: ModelConfig
  private state: ModelLoaderState = {
    status: 'uninitialized',
    progress: 0,
    backend: null,
  }
  private metrics: BackendMetrics | null = null

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = { ...DEFAULT_MODEL_CONFIG, ...config }
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize the model with optimal execution provider
   */
  async initialize(
    onProgress?: (progress: number, message: string) => void
  ): Promise<void> {
    if (this.state.status === 'ready') {
      return // Already initialized
    }

    if (this.state.status === 'loading') {
      throw new Error('Model is already loading')
    }

    try {
      this.state.status = 'loading'
      this.state.progress = 0

      // Step 1: Detect optimal execution provider
      onProgress?.(10, 'Detecting GPU capabilities...')
      const provider = await detectOptimalProvider()
      this.state.backend = provider

      // Step 2: Load tokenizer
      onProgress?.(30, 'Loading tokenizer...')
      await this.loadTokenizer()

      // Step 3: Create ONNX session with optimal provider
      onProgress?.(50, `Initializing model (${provider})...`)
      await this.createSession(provider)

      // Step 4: Warm up model with dummy input
      onProgress?.(80, 'Warming up model...')
      await this.warmup()

      // Step 5: Ready
      onProgress?.(100, 'Model ready!')
      this.state.status = 'ready'
      this.state.progress = 100

      devLog('✅ Model initialized successfully', {
        backend: this.state.backend,
        dimension: this.config.dimension,
        metrics: this.metrics,
      })
    } catch (error) {
      this.state.status = 'failed'
      this.state.error = error instanceof Error ? error.message : 'Unknown error'
      logError('❌ Model initialization failed:', error)
      throw this.createError(AIErrorCode.ModelLoadFailed, 'Failed to initialize model', error)
    }
  }

  /**
   * Load tokenizer configuration
   */
  private async loadTokenizer(): Promise<void> {
    try {
      const response = await fetch(this.config.tokenizerPath)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      this.tokenizer = await response.json()
    } catch (error) {
      throw new Error(`Failed to load tokenizer: ${error}`)
    }
  }

  /**
   * Create ONNX inference session
   */
  private async createSession(provider: ExecutionProvider): Promise<void> {
    const startTime = performance.now()

    try {
      const sessionOptions: ort.InferenceSession.SessionOptions = {
        executionProviders: this.getExecutionProviders(provider),
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
      }

      this.session = await ort.InferenceSession.create(
        this.config.modelPath,
        sessionOptions
      )

      const loadTime = performance.now() - startTime

      this.metrics = {
        backend: provider,
        available: true,
        loadTimeMs: loadTime,
        inferenceTimeMs: 0, // Will be updated on first inference
        memoryUsageMB: 0, // Will be estimated
        lastUsed: Date.now(),
      }

      devLog(`Model loaded in ${loadTime.toFixed(0)}ms using ${provider}`)
    } catch (error) {
      logError(`Failed to create session with ${provider}:`, error)
      throw error
    }
  }

  /**
   * Get execution providers in fallback order
   */
  private getExecutionProviders(
    preferred: ExecutionProvider
  ): ort.InferenceSession.ExecutionProviderConfig[] {
    const providers: ort.InferenceSession.ExecutionProviderConfig[] = []

    if (preferred === 'webgpu') {
      providers.push('webgpu')
    }

    // Always add WASM as fallback
    providers.push('wasm')

    return providers
  }

  /**
   * Warm up model with dummy input to optimize first real inference
   */
  private async warmup(): Promise<void> {
    const dummyInput = 'This is a test sentence for model warmup.'
    await this.embed(dummyInput, { normalize: true })
  }

  // ============================================
  // Embedding Generation
  // ============================================

  /**
   * Generate embedding for text
   */
  async embed(text: string, options: EmbedOptions = {}): Promise<EmbedResult> {
    if (!this.session || this.state.status !== 'ready') {
      throw this.createError(
        AIErrorCode.ModelLoadFailed,
        'Model not initialized. Call initialize() first.'
      )
    }

    try {
      const { result, timeMs } = await measureTime(async () => {
        // Step 1: Tokenize
        const tokens = this.tokenizeText(text, options.truncate !== false)

        // Step 2: Prepare input tensors
        const inputIds = new ort.Tensor('int64', BigInt64Array.from(tokens.input_ids), [
          1,
          tokens.input_ids.length,
        ])
        const attentionMask = new ort.Tensor(
          'int64',
          BigInt64Array.from(tokens.attention_mask),
          [1, tokens.attention_mask.length]
        )

        // Step 3: Run inference
        const feeds = {
          input_ids: inputIds,
          attention_mask: attentionMask,
        }

        const results = await this.session!.run(feeds)

        // Step 4: Extract embeddings
        const lastHiddenState = results.last_hidden_state as ort.Tensor
        let embedding = this.poolEmbeddings(
          lastHiddenState.data as Float32Array,
          tokens.attention_mask,
          options.pooling || 'mean'
        )

        // Step 5: Normalize if requested (default: true)
        if (options.normalize !== false) {
          embedding = normalize(embedding)
        }

        // Step 6: Reduce dimension if needed (mobile optimization)
        if (this.config.dimension < 384) {
          embedding = reduceDimension(embedding, this.config.dimension)
        }

        return {
          embedding,
          tokenCount: tokens.input_ids.length,
          truncated: tokens.truncated,
        }
      })

      // Update metrics
      if (this.metrics) {
        this.metrics.inferenceTimeMs = timeMs
        this.metrics.lastUsed = Date.now()
      }

      return {
        ...result,
        inferenceTimeMs: timeMs,
      }
    } catch (error) {
      logError('Embedding generation failed:', error)
      throw this.createError(AIErrorCode.InferenceFailed, 'Failed to generate embedding', error)
    }
  }

  /**
   * Tokenize text using the loaded tokenizer
   */
  private tokenizeText(
    text: string,
    truncate: boolean
  ): {
    input_ids: number[]
    attention_mask: number[]
    truncated: boolean
  } {
    // Simple tokenization (in production, use proper tokenizer library)
    // For MVP, we'll do basic word-level tokenization
    const words = text.toLowerCase().split(/\s+/)
    const maxLength = this.config.maxSequenceLength

    // Add special tokens
    const tokens = [101] // [CLS] token
    for (const word of words) {
      // Simple hash to token ID (replace with proper vocab lookup)
      const tokenId = this.wordToTokenId(word)
      tokens.push(tokenId)

      if (tokens.length >= maxLength - 1) {
        break
      }
    }
    tokens.push(102) // [SEP] token

    const truncated = words.length + 2 > maxLength
    const attentionMask = tokens.map(() => 1)

    return {
      input_ids: tokens,
      attention_mask: attentionMask,
      truncated,
    }
  }

  /**
   * Simple word to token ID mapping (replace with proper vocab lookup)
   */
  private wordToTokenId(word: string): number {
    // Simple hash function for demo
    // In production, use tokenizer vocab
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash) % 30000 + 1000 // Keep in reasonable range
  }

  /**
   * Pool token embeddings into a single sentence embedding
   */
  private poolEmbeddings(
    hiddenStates: Float32Array,
    attentionMask: number[],
    pooling: 'mean' | 'cls' | 'max'
  ): Float32Array {
    const seqLength = attentionMask.length
    const embeddingDim = 384 // all-MiniLM-L6-v2 dimension

    if (pooling === 'cls') {
      // Use [CLS] token embedding (first token)
      return new Float32Array(hiddenStates.slice(0, embeddingDim))
    }

    if (pooling === 'max') {
      // Max pooling across sequence
      const maxPooled = new Float32Array(embeddingDim)
      for (let d = 0; d < embeddingDim; d++) {
        let max = -Infinity
        for (let s = 0; s < seqLength; s++) {
          if (attentionMask[s] === 1) {
            const value = hiddenStates[s * embeddingDim + d]
            if (value > max) max = value
          }
        }
        maxPooled[d] = max
      }
      return maxPooled
    }

    // Mean pooling (default)
    const meanPooled = new Float32Array(embeddingDim)
    let validTokens = 0

    for (let s = 0; s < seqLength; s++) {
      if (attentionMask[s] === 1) {
        validTokens++
        for (let d = 0; d < embeddingDim; d++) {
          meanPooled[d] += hiddenStates[s * embeddingDim + d]
        }
      }
    }

    for (let d = 0; d < embeddingDim; d++) {
      meanPooled[d] /= validTokens
    }

    return meanPooled
  }

  // ============================================
  // State & Diagnostics
  // ============================================

  /**
   * Get current state
   */
  getState(): ModelLoaderState {
    return { ...this.state }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): BackendMetrics | null {
    return this.metrics ? { ...this.metrics } : null
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.state.status === 'ready'
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release()
      this.session = null
    }
    this.tokenizer = null
    this.state.status = 'uninitialized'
    this.state.progress = 0
  }

  // ============================================
  // Error Handling
  // ============================================

  private createError(code: AIErrorCode, message: string, details?: any): AIError {
    const error = new Error(message) as AIError
    error.code = code
    error.details = details
    return error
  }
}

// ============================================
// Singleton Instance
// ============================================

let instance: ModelLoader | null = null

/**
 * Get singleton instance of ModelLoader
 */
export function getModelLoader(): ModelLoader {
  if (!instance) {
    instance = new ModelLoader()
  }
  return instance
}

/**
 * Initialize the global model loader
 */
export async function initializeModel(
  onProgress?: (progress: number, message: string) => void
): Promise<void> {
  const loader = getModelLoader()
  await loader.initialize(onProgress)
}

/**
 * Generate embedding using the global model loader
 */
export async function embedText(
  text: string,
  options?: EmbedOptions
): Promise<Float32Array> {
  const loader = getModelLoader()
  if (!loader.isReady()) {
    await loader.initialize()
  }
  const result = await loader.embed(text, options)
  return result.embedding
}

// ============================================
// Export
// ============================================

export default ModelLoader
