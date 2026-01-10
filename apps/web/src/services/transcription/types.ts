/**
 * Transcription Service Types
 *
 * TypeScript interfaces for the multi-backend transcription engine.
 */

// ============================================
// Backend Types
// ============================================

export type TranscriptionBackend =
  | 'whisper-api' // OpenAI Whisper API (cloud)
  | 'whisper-wasm' // Whisper.cpp WASM (browser)
  | 'web-speech' // Web Speech API (free fallback)
  | 'auto' // Automatic selection

export type TranscriptionMode = 'batch' | 'streaming'

export type TranscriptionStatus =
  | 'pending'
  | 'preprocessing'
  | 'transcribing'
  | 'completed'
  | 'failed'
  | 'cancelled'

// ============================================
// Audio Types
// ============================================

export interface AudioMetadata {
  duration: number // seconds
  sampleRate: number // Hz (target: 16000 for Whisper)
  channels: number // 1 for mono
  format: AudioFormat
  size: number // bytes
  bitRate?: number // kbps
}

export type AudioFormat = 'webm' | 'mp3' | 'wav' | 'flac' | 'm4a' | 'ogg'

export interface AudioChunk {
  id: string
  index: number
  startTime: number // seconds
  endTime: number // seconds
  data: ArrayBuffer | Blob
  format: AudioFormat
}

// ============================================
// Transcription Request/Response Types
// ============================================

export interface TranscriptionRequest {
  audio: File | Blob | ArrayBuffer
  options?: TranscriptionOptions
}

export interface TranscriptionOptions {
  backend?: TranscriptionBackend
  mode?: TranscriptionMode
  language?: string // ISO 639-1 code (e.g., 'en', 'es')
  prompt?: string // Context for better accuracy
  temperature?: number // 0-1, lower = more deterministic
  wordTimestamps?: boolean // Include word-level timestamps
  maxDuration?: number // Max seconds per chunk (default: 30)
  onProgress?: ProgressCallback
}

export interface TranscriptionResult {
  id: string
  text: string
  segments: TranscriptionSegment[]
  words?: TranscriptionWord[]
  language: string
  duration: number
  backend: TranscriptionBackend
  metadata: TranscriptionMetadata
}

export interface TranscriptionSegment {
  id: number
  start: number // seconds
  end: number // seconds
  text: string
  confidence?: number // 0-1
  speaker?: string // Future: speaker diarization
}

export interface TranscriptionWord {
  word: string
  start: number
  end: number
  confidence: number
}

export interface TranscriptionMetadata {
  processingTimeMs: number
  chunksProcessed: number
  modelVersion?: string
  cost?: CostEstimate
}

// ============================================
// Streaming Types
// ============================================

export interface StreamingTranscriptionOptions extends TranscriptionOptions {
  interimResults?: boolean // Return partial results
  maxSilenceMs?: number // Auto-pause detection (default: 1500)
  sampleRate?: number // Input sample rate
}

export interface StreamingResult {
  type: 'interim' | 'final'
  text: string
  confidence: number
  isFinal: boolean
  timestamp: number
}

// ============================================
// Cost Estimation Types
// ============================================

export interface CostEstimate {
  backend: TranscriptionBackend
  durationMinutes: number
  estimatedCost: number // USD
  currency: 'USD'
  breakdown?: {
    audioProcessing?: number
    transcription: number
    storage?: number
  }
}

export const PRICING: Record<TranscriptionBackend, number> = {
  'whisper-api': 0.006, // $0.006/minute
  'whisper-wasm': 0, // Free (browser)
  'web-speech': 0, // Free (browser)
  auto: 0, // Depends on selection
}

// ============================================
// Storage Types
// ============================================

export interface StoredTranscription {
  id: string
  projectId?: string
  title: string
  result: TranscriptionResult
  audioUrl?: string // S3/Directus URL
  localAudioId?: string // IndexedDB key
  createdAt: string
  updatedAt: string
  status: TranscriptionStatus
  metadata: {
    source: 'upload' | 'recording' | 'url'
    originalFilename?: string
    fileSize: number
  }
}

// ============================================
// Backend Adapter Interface
// ============================================

export interface TranscriptionAdapter {
  readonly name: TranscriptionBackend
  readonly supportsStreaming: boolean
  readonly maxFileSizeMB: number
  readonly supportedFormats: AudioFormat[]

  // Check if backend is available
  isAvailable(): Promise<boolean>

  // Batch transcription
  transcribe(
    audio: Blob | ArrayBuffer,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult>

  // Streaming transcription (if supported)
  streamTranscribe?(
    stream: MediaStream,
    options?: StreamingTranscriptionOptions
  ): AsyncGenerator<StreamingResult, TranscriptionResult, unknown>

  // Cost estimation
  estimateCost(durationSeconds: number): CostEstimate

  // Cleanup resources
  dispose(): Promise<void>
}

// ============================================
// Progress & Error Types
// ============================================

export type ProgressCallback = (progress: TranscriptionProgress) => void

export interface TranscriptionProgress {
  stage: 'preprocessing' | 'uploading' | 'transcribing' | 'postprocessing'
  current: number
  total: number
  percent: number
  message?: string
  chunkIndex?: number
  totalChunks?: number
}

export enum TranscriptionErrorCode {
  AudioTooLong = 'AUDIO_TOO_LONG',
  AudioTooShort = 'AUDIO_TOO_SHORT',
  UnsupportedFormat = 'UNSUPPORTED_FORMAT',
  BackendUnavailable = 'BACKEND_UNAVAILABLE',
  NetworkError = 'NETWORK_ERROR',
  QuotaExceeded = 'QUOTA_EXCEEDED',
  ConversionFailed = 'CONVERSION_FAILED',
  TranscriptionFailed = 'TRANSCRIPTION_FAILED',
  Cancelled = 'CANCELLED',
}

export class TranscriptionError extends Error {
  code: TranscriptionErrorCode
  details?: any

  constructor(code: TranscriptionErrorCode, message: string, details?: any) {
    super(message)
    this.name = 'TranscriptionError'
    this.code = code
    this.details = details
  }
}

// ============================================
// Summarization Types
// ============================================

export interface SummarizationRequest {
  transcript: string
  options?: SummarizationOptions
}

export interface SummarizationOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  language?: string
}

export interface SummarizationResult {
  summary: string
  actionItems: string[]
  keyPoints: string[]
  decisions: string[]
  nextSteps: string[]
  model: string
  tokensUsed: number
  processingTimeMs: number
}
