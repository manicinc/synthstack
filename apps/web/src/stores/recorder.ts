import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logError } from '@/utils/devLogger'

// ============================================
// Types
// ============================================

export interface TranscriptSegment {
  id: string
  startTime: number // seconds
  endTime: number // seconds
  text: string
  speaker?: string
  confidence?: number
  isEdited?: boolean
}

export interface RecordingSummary {
  summary: string
  actionItems: string[]
  keyPoints: string[]
  decisions: string[]
  nextSteps: string[]
  generatedAt: number
  model: string
  tokensUsed?: number
}

export interface Recording {
  id: string
  title: string
  duration: number // seconds
  audioBlob: Blob | null
  audioUrl: string | null // Blob URL or remote URL
  transcript: TranscriptSegment[]
  summary: RecordingSummary | null
  status: RecordingStatus
  source: AudioSource
  transcriptionMethod: TranscriptionMethod | null
  language: string
  createdAt: number
  updatedAt: number
  syncedAt: number | null
  metadata: RecordingMetadata
}

export interface RecordingMetadata {
  fileSize: number
  format: string
  sampleRate: number
  channels: number
}

export type RecordingStatus =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'processing'
  | 'transcribing'
  | 'summarizing'
  | 'completed'
  | 'failed'

export type AudioSource = 'microphone' | 'system' | 'both'

export type TranscriptionMethod = 'whisper-api' | 'whisper-wasm' | 'web-speech'

export interface RecorderSettings {
  defaultSource: AudioSource
  transcriptionMethod: TranscriptionMethod | 'auto'
  autoTranscribe: boolean
  autoSummarize: boolean
  saveToHistory: boolean
  language: string
}

export interface RecorderError {
  code: string
  message: string
  details?: any
}

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'synthstack-recordings'
const SETTINGS_KEY = 'synthstack-recorder-settings'

const DEFAULT_SETTINGS: RecorderSettings = {
  defaultSource: 'microphone',
  transcriptionMethod: 'auto',
  autoTranscribe: true,
  autoSummarize: true,
  saveToHistory: true,
  language: 'en',
}

// ============================================
// Store
// ============================================

export const useRecorderStore = defineStore('recorder', () => {
  // ============================================
  // State
  // ============================================

  // Current recording state
  const status = ref<RecordingStatus>('idle')
  const audioSource = ref<AudioSource>('microphone')
  const duration = ref(0) // seconds
  const audioBlob = ref<Blob | null>(null)
  const audioUrl = ref<string | null>(null)

  // Transcript and summary for current recording
  const transcript = ref<TranscriptSegment[]>([])
  const summary = ref<RecordingSummary | null>(null)

  // Progress tracking
  const isTranscribing = ref(false)
  const isSummarizing = ref(false)
  const transcriptionProgress = ref(0) // 0-100
  const processingStage = ref<string>('')

  // Recording history
  const recordings = ref<Recording[]>([])
  const activeRecordingId = ref<string | null>(null)

  // UI state
  const isExpanded = ref(false)
  const showHistory = ref(false)

  // Settings
  const settings = ref<RecorderSettings>({ ...DEFAULT_SETTINGS })

  // Errors
  const error = ref<RecorderError | null>(null)

  // ============================================
  // Getters
  // ============================================

  const isRecording = computed(() => status.value === 'recording')
  const isPaused = computed(() => status.value === 'paused')
  const isProcessing = computed(
    () =>
      status.value === 'processing' ||
      status.value === 'transcribing' ||
      status.value === 'summarizing'
  )
  const isCompleted = computed(() => status.value === 'completed')
  const hasError = computed(() => status.value === 'failed' || error.value !== null)

  const activeRecording = computed(() => {
    if (!activeRecordingId.value) return null
    return recordings.value.find((r) => r.id === activeRecordingId.value) || null
  })

  const sortedRecordings = computed(() => {
    return [...recordings.value].sort((a, b) => b.createdAt - a.createdAt)
  })

  const recentRecordings = computed(() => {
    return sortedRecordings.value.slice(0, 10)
  })

  const formattedDuration = computed(() => {
    const hours = Math.floor(duration.value / 3600)
    const minutes = Math.floor((duration.value % 3600) / 60)
    const seconds = Math.floor(duration.value % 60)

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  const fullTranscriptText = computed(() => {
    return transcript.value.map((seg) => seg.text).join(' ')
  })

  // ============================================
  // Actions
  // ============================================

  function generateId(): string {
    return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  function startRecording(source?: AudioSource) {
    if (status.value === 'recording') return

    // Reset state for new recording
    audioSource.value = source || settings.value.defaultSource
    status.value = 'recording'
    duration.value = 0
    audioBlob.value = null
    audioUrl.value = null
    transcript.value = []
    summary.value = null
    error.value = null
    transcriptionProgress.value = 0
    processingStage.value = ''

    // Create new recording entry
    const newRecording: Recording = {
      id: generateId(),
      title: 'New Recording',
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      transcript: [],
      summary: null,
      status: 'recording',
      source: audioSource.value,
      transcriptionMethod: null,
      language: settings.value.language,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncedAt: null,
      metadata: {
        fileSize: 0,
        format: 'webm',
        sampleRate: 48000,
        channels: 1,
      },
    }

    recordings.value.push(newRecording)
    activeRecordingId.value = newRecording.id
    saveToStorage()
  }

  function pauseRecording() {
    if (status.value !== 'recording') return
    status.value = 'paused'
    updateActiveRecording({ status: 'paused' })
  }

  function resumeRecording() {
    if (status.value !== 'paused') return
    status.value = 'recording'
    updateActiveRecording({ status: 'recording' })
  }

  function stopRecording(blob: Blob) {
    if (status.value !== 'recording' && status.value !== 'paused') return

    audioBlob.value = blob
    audioUrl.value = URL.createObjectURL(blob)
    status.value = 'processing'

    updateActiveRecording({
      audioBlob: blob,
      audioUrl: audioUrl.value,
      duration: duration.value,
      status: 'processing',
      metadata: {
        fileSize: blob.size,
        format: blob.type.split('/')[1] || 'webm',
        sampleRate: 48000,
        channels: 1,
      },
    })

    saveToStorage()
  }

  function updateDuration(seconds: number) {
    duration.value = seconds
  }

  function setTranscript(segments: TranscriptSegment[]) {
    transcript.value = segments
    updateActiveRecording({ transcript: segments })
    saveToStorage()
  }

  function updateTranscriptSegment(segmentId: string, text: string) {
    const segment = transcript.value.find((s) => s.id === segmentId)
    if (segment) {
      segment.text = text
      segment.isEdited = true
      updateActiveRecording({ transcript: [...transcript.value] })
      saveToStorage()
    }
  }

  function setSummary(newSummary: RecordingSummary) {
    summary.value = newSummary
    updateActiveRecording({ summary: newSummary })
    saveToStorage()
  }

  function setStatus(newStatus: RecordingStatus) {
    status.value = newStatus
    updateActiveRecording({ status: newStatus })
    saveToStorage()
  }

  function setProcessingStage(stage: string) {
    processingStage.value = stage
  }

  function setTranscriptionProgress(progress: number) {
    transcriptionProgress.value = progress
  }

  function setError(err: RecorderError | null) {
    error.value = err
    if (err) {
      status.value = 'failed'
      updateActiveRecording({ status: 'failed' })
    }
  }

  function clearError() {
    error.value = null
  }

  function updateActiveRecording(updates: Partial<Recording>) {
    if (!activeRecordingId.value) return

    const index = recordings.value.findIndex((r) => r.id === activeRecordingId.value)
    if (index !== -1) {
      recordings.value[index] = {
        ...recordings.value[index],
        ...updates,
        updatedAt: Date.now(),
      }
    }
  }

  function setRecordingTitle(id: string, title: string) {
    const recording = recordings.value.find((r) => r.id === id)
    if (recording) {
      recording.title = title
      recording.updatedAt = Date.now()
      saveToStorage()
    }
  }

  function deleteRecording(id: string) {
    const index = recordings.value.findIndex((r) => r.id === id)
    if (index !== -1) {
      const recording = recordings.value[index]

      // Revoke blob URL if exists
      if (recording.audioUrl && recording.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recording.audioUrl)
      }

      recordings.value.splice(index, 1)

      // If deleting active recording, clear state
      if (activeRecordingId.value === id) {
        activeRecordingId.value = null
        resetCurrentRecording()
      }

      saveToStorage()
    }
  }

  function selectRecording(id: string) {
    const recording = recordings.value.find((r) => r.id === id)
    if (recording) {
      activeRecordingId.value = id
      status.value = recording.status
      duration.value = recording.duration
      audioBlob.value = recording.audioBlob
      audioUrl.value = recording.audioUrl
      transcript.value = recording.transcript
      summary.value = recording.summary
      audioSource.value = recording.source
    }
  }

  function resetCurrentRecording() {
    status.value = 'idle'
    duration.value = 0
    audioBlob.value = null
    audioUrl.value = null
    transcript.value = []
    summary.value = null
    error.value = null
    transcriptionProgress.value = 0
    processingStage.value = ''
    isTranscribing.value = false
    isSummarizing.value = false
  }

  function newRecording() {
    activeRecordingId.value = null
    resetCurrentRecording()
  }

  function toggleExpanded() {
    isExpanded.value = !isExpanded.value
  }

  function toggleHistory() {
    showHistory.value = !showHistory.value
  }

  function updateSettings(newSettings: Partial<RecorderSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    saveSettings()
  }

  // ============================================
  // Persistence
  // ============================================

  function saveToStorage() {
    try {
      // Save recordings without blob data (too large for localStorage)
      const recordingsToSave = recordings.value.map((r) => ({
        ...r,
        audioBlob: null, // Don't save blob to localStorage
        // Keep audioUrl only if it's a remote URL, not blob URL
        audioUrl: r.audioUrl?.startsWith('blob:') ? null : r.audioUrl,
      }))

      const data = {
        recordings: recordingsToSave,
        activeRecordingId: activeRecordingId.value,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (err) {
      logError('Failed to save recordings to localStorage:', err)
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
    } catch (err) {
      logError('Failed to save recorder settings:', err)
    }
  }

  function loadFromStorage() {
    try {
      // Load recordings
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const parsed = JSON.parse(data)
        recordings.value = parsed.recordings || []
        // Don't auto-select recording on load
      }

      // Load settings
      const settingsData = localStorage.getItem(SETTINGS_KEY)
      if (settingsData) {
        const parsed = JSON.parse(settingsData)
        settings.value = { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (err) {
      logError('Failed to load recordings from localStorage:', err)
    }
  }

  function reset() {
    // Revoke all blob URLs
    recordings.value.forEach((r) => {
      if (r.audioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(r.audioUrl)
      }
    })

    recordings.value = []
    activeRecordingId.value = null
    resetCurrentRecording()
    settings.value = { ...DEFAULT_SETTINGS }

    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SETTINGS_KEY)
  }

  // Initialize from storage
  loadFromStorage()

  // ============================================
  // Return
  // ============================================

  return {
    // State
    status,
    audioSource,
    duration,
    audioBlob,
    audioUrl,
    transcript,
    summary,
    isTranscribing,
    isSummarizing,
    transcriptionProgress,
    processingStage,
    recordings,
    activeRecordingId,
    isExpanded,
    showHistory,
    settings,
    error,

    // Getters
    isRecording,
    isPaused,
    isProcessing,
    isCompleted,
    hasError,
    activeRecording,
    sortedRecordings,
    recentRecordings,
    formattedDuration,
    fullTranscriptText,

    // Actions
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    updateDuration,
    setTranscript,
    updateTranscriptSegment,
    setSummary,
    setStatus,
    setProcessingStage,
    setTranscriptionProgress,
    setError,
    clearError,
    setRecordingTitle,
    deleteRecording,
    selectRecording,
    resetCurrentRecording,
    newRecording,
    toggleExpanded,
    toggleHistory,
    updateSettings,
    saveToStorage,
    reset,
  }
})
