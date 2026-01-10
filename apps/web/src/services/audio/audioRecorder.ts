/**
 * Audio Recorder Service
 *
 * Provides audio recording capabilities using the MediaRecorder API.
 * Supports microphone, system audio (via screen share), or both.
 */

import type { AudioSource } from '@/stores/recorder'

// ============================================
// Types
// ============================================

export interface AudioRecorderOptions {
  source: AudioSource
  sampleRate?: number
  channelCount?: number
  mimeType?: string
  audioBitsPerSecond?: number
  timeslice?: number // ms between data chunks
  onDataAvailable?: (blob: Blob) => void
  onDurationUpdate?: (seconds: number) => void
  onError?: (error: Error) => void
  onStateChange?: (state: RecordingState) => void
}

export type RecordingState = 'inactive' | 'recording' | 'paused'

export interface AudioRecorderResult {
  blob: Blob
  duration: number
  format: string
}

// ============================================
// Constants
// ============================================

// Preferred MIME types in order of preference
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
]

// ============================================
// AudioRecorder Class
// ============================================

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private mediaStream: MediaStream | null = null
  private audioChunks: Blob[] = []
  private startTime: number = 0
  private pausedDuration: number = 0
  private pauseStartTime: number = 0
  private durationInterval: number | null = null
  private options: AudioRecorderOptions

  private _state: RecordingState = 'inactive'
  private _duration: number = 0
  private _mimeType: string = ''

  constructor(options: AudioRecorderOptions) {
    this.options = {
      sampleRate: 48000,
      channelCount: 1,
      audioBitsPerSecond: 128000,
      timeslice: 1000, // 1 second chunks
      ...options,
    }
  }

  // ============================================
  // Getters
  // ============================================

  get state(): RecordingState {
    return this._state
  }

  get duration(): number {
    return this._duration
  }

  get mimeType(): string {
    return this._mimeType
  }

  get isRecording(): boolean {
    return this._state === 'recording'
  }

  get isPaused(): boolean {
    return this._state === 'paused'
  }

  get stream(): MediaStream | null {
    return this.mediaStream
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Start recording audio from the specified source
   */
  async start(): Promise<void> {
    if (this._state !== 'inactive') {
      throw new Error('Recording already in progress')
    }

    try {
      // Get media stream based on source
      this.mediaStream = await this.getMediaStream()

      // Determine MIME type
      this._mimeType = this.getSupportedMimeType()

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: this._mimeType,
        audioBitsPerSecond: this.options.audioBitsPerSecond,
      })

      // Reset state
      this.audioChunks = []
      this.startTime = Date.now()
      this.pausedDuration = 0
      this._duration = 0

      // Set up event handlers
      this.setupEventHandlers()

      // Start recording
      this.mediaRecorder.start(this.options.timeslice)
      this.setState('recording')

      // Start duration timer
      this.startDurationTimer()
    } catch (error) {
      this.cleanup()
      throw error
    }
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (this._state !== 'recording' || !this.mediaRecorder) {
      return
    }

    this.mediaRecorder.pause()
    this.pauseStartTime = Date.now()
    this.stopDurationTimer()
    this.setState('paused')
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (this._state !== 'paused' || !this.mediaRecorder) {
      return
    }

    this.pausedDuration += Date.now() - this.pauseStartTime
    this.mediaRecorder.resume()
    this.startDurationTimer()
    this.setState('recording')
  }

  /**
   * Stop recording and return the recorded audio
   */
  async stop(): Promise<AudioRecorderResult> {
    return new Promise((resolve, reject) => {
      if (this._state === 'inactive' || !this.mediaRecorder) {
        reject(new Error('No recording in progress'))
        return
      }

      // Handle the final data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        this.stopDurationTimer()

        // Create final blob
        const blob = new Blob(this.audioChunks, { type: this._mimeType })
        const format = this._mimeType.split('/')[1]?.split(';')[0] || 'webm'

        const result: AudioRecorderResult = {
          blob,
          duration: this._duration,
          format,
        }

        this.cleanup()
        resolve(result)
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * Cancel recording and discard all data
   */
  cancel(): void {
    if (this.mediaRecorder && this._state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    this.cleanup()
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.cancel()
  }

  // ============================================
  // Private Methods
  // ============================================

  private async getMediaStream(): Promise<MediaStream> {
    const { source, sampleRate, channelCount } = this.options

    const audioConstraints: MediaTrackConstraints = {
      sampleRate: { ideal: sampleRate },
      channelCount: { ideal: channelCount },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }

    if (source === 'microphone') {
      return this.getMicrophoneStream(audioConstraints)
    }

    if (source === 'system') {
      return this.getSystemAudioStream()
    }

    // Both: merge microphone and system audio
    return this.getMergedStream(audioConstraints)
  }

  private async getMicrophoneStream(
    constraints: MediaTrackConstraints
  ): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: constraints,
        video: false,
      })
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error(
            'Microphone permission denied. Please allow microphone access and try again.'
          )
        }
        if (error.name === 'NotFoundError') {
          throw new Error(
            'No microphone found. Please connect a microphone and try again.'
          )
        }
      }
      throw error
    }
  }

  private async getSystemAudioStream(): Promise<MediaStream> {
    try {
      // getDisplayMedia captures screen/window/tab with optional audio
      // Setting video to true but we'll only use the audio track
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: true, // Required for getDisplayMedia
      })

      // Remove video track - we only want audio
      stream.getVideoTracks().forEach((track) => {
        track.stop()
        stream.removeTrack(track)
      })

      // Check if we got audio
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((t) => t.stop())
        throw new Error(
          'No audio track available. Make sure to select a tab or window with audio, and check "Share audio" option.'
        )
      }

      return stream
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error(
            'Screen sharing was cancelled. To capture system audio, please share a browser tab or window with audio.'
          )
        }
      }
      throw error
    }
  }

  private async getMergedStream(
    micConstraints: MediaTrackConstraints
  ): Promise<MediaStream> {
    // Get both streams
    const [micStream, systemStream] = await Promise.all([
      this.getMicrophoneStream(micConstraints),
      this.getSystemAudioStream(),
    ])

    // Use Web Audio API to merge streams
    const audioContext = new AudioContext()

    const micSource = audioContext.createMediaStreamSource(micStream)
    const systemSource = audioContext.createMediaStreamSource(systemStream)

    const destination = audioContext.createMediaStreamDestination()

    // Mix both sources
    micSource.connect(destination)
    systemSource.connect(destination)

    // Store original streams for cleanup
    const mergedStream = destination.stream

    // Add cleanup handler
    const originalStop = mergedStream.getTracks()[0]?.stop.bind(
      mergedStream.getTracks()[0]
    )
    if (originalStop) {
      mergedStream.getTracks()[0].stop = () => {
        micStream.getTracks().forEach((t) => t.stop())
        systemStream.getTracks().forEach((t) => t.stop())
        audioContext.close()
        originalStop()
      }
    }

    return mergedStream
  }

  private getSupportedMimeType(): string {
    // Check if custom mimeType is specified and supported
    if (this.options.mimeType && MediaRecorder.isTypeSupported(this.options.mimeType)) {
      return this.options.mimeType
    }

    // Find first supported MIME type
    for (const mimeType of PREFERRED_MIME_TYPES) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType
      }
    }

    // Fallback to default
    return 'audio/webm'
  }

  private setupEventHandlers(): void {
    if (!this.mediaRecorder) return

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data)
        this.options.onDataAvailable?.(event.data)
      }
    }

    this.mediaRecorder.onerror = (event) => {
      const error = new Error(`Recording error: ${(event as any).error?.message || 'Unknown error'}`)
      this.options.onError?.(error)
      this.cleanup()
    }

    // Handle track ended (e.g., user stops screen share)
    this.mediaStream?.getTracks().forEach((track) => {
      track.onended = () => {
        if (this._state !== 'inactive') {
          this.options.onError?.(new Error('Audio source was disconnected'))
          this.cancel()
        }
      }
    })
  }

  private setState(state: RecordingState): void {
    this._state = state
    this.options.onStateChange?.(state)
  }

  private startDurationTimer(): void {
    this.durationInterval = window.setInterval(() => {
      const elapsed = Date.now() - this.startTime - this.pausedDuration
      this._duration = elapsed / 1000
      this.options.onDurationUpdate?.(this._duration)
    }, 100)
  }

  private stopDurationTimer(): void {
    if (this.durationInterval !== null) {
      clearInterval(this.durationInterval)
      this.durationInterval = null
    }
  }

  private cleanup(): void {
    this.stopDurationTimer()

    // Stop all tracks
    this.mediaStream?.getTracks().forEach((track) => track.stop())

    this.mediaRecorder = null
    this.mediaStream = null
    this.audioChunks = []
    this.setState('inactive')
  }
}

// ============================================
// Factory Function
// ============================================

export function createAudioRecorder(options: AudioRecorderOptions): AudioRecorder {
  return new AudioRecorder(options)
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if audio recording is supported in this browser
 */
export function isRecordingSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  )
}

/**
 * Check if system audio capture is supported
 */
export function isSystemAudioSupported(): boolean {
  return (
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  )
}

/**
 * Get the best supported audio MIME type
 */
export function getBestMimeType(): string {
  for (const mimeType of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType
    }
  }
  return 'audio/webm'
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<PermissionState> {
  try {
    // Try the Permissions API first
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      return result.state
    }

    // Fallback: try to get a stream to trigger permission prompt
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return 'granted'
  } catch {
    return 'denied'
  }
}
