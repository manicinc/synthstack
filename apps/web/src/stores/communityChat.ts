/**
 * @file communityChat.ts
 * @description Community Edition chat store (no agents, no RAG).
 *
 * Goals:
 * - Pro-quality UX: streaming, multi-conversation, settings, persistence
 * - Community-safe scope: single assistant persona, no premium features
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'

const STORAGE_KEY = 'synthstack-community-chat-v1'
const SETTINGS_KEY = 'synthstack-community-chat-settings-v1'

export type ChatRole = 'user' | 'assistant'

export interface CommunityChatMessage {
  role: ChatRole
  content: string
  timestamp: number
  model?: string
}

export interface CommunityChatConversation {
  id: string
  title: string
  messages: CommunityChatMessage[]
  createdAt: number
  updatedAt: number
}

export type ModelTier = 'cheap' | 'standard' | 'premium'

export interface CommunityChatSettings {
  model: string
  modelTier: ModelTier
  temperature: number
  maxTokens: number
}

const MODEL_OPTIONS: Array<{ label: string; value: string; tier: ModelTier }> = [
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini', tier: 'cheap' },
  { label: 'GPT-4o', value: 'gpt-4o', tier: 'standard' },
  { label: 'GPT-5.2', value: 'gpt-5.2', tier: 'premium' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo', tier: 'standard' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', tier: 'cheap' },
]

function safeParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function buildDefaultSettings(): CommunityChatSettings {
  return {
    model: 'gpt-4o-mini',
    modelTier: 'cheap',
    temperature: 0.7,
    maxTokens: 1200,
  }
}

function deriveTierFromModel(model: string): ModelTier {
  const option = MODEL_OPTIONS.find((m) => m.value === model)
  if (option) return option.tier
  // Best-effort fallback
  if (model.startsWith('gpt-5')) return 'premium'
  if (model.startsWith('o1')) return 'premium'
  if (model.includes('4')) return 'standard'
  return 'cheap'
}

function makeConversationId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function inferTitleFromMessage(message: string) {
  const clean = message.trim().replace(/\s+/g, ' ')
  if (!clean) return 'New Chat'
  const firstLine = clean.split('\n')[0] || clean
  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}…` : firstLine
}

export const useCommunityChatStore = defineStore('communityChat', () => {
  const authStore = useAuthStore()
  const creditsStore = useCreditsStore()

  // ============================================
  // State
  // ============================================

  const conversations = ref<CommunityChatConversation[]>([])
  const activeConversationId = ref<string | null>(null)

  const isStreaming = ref(false)
  const abortController = ref<AbortController | null>(null)

  const settings = ref<CommunityChatSettings>(buildDefaultSettings())

  // ============================================
  // Getters
  // ============================================

  const activeConversation = computed<CommunityChatConversation | null>(() => {
    if (!activeConversationId.value) return null
    return conversations.value.find((c) => c.id === activeConversationId.value) || null
  })

  const sortedConversations = computed(() => {
    return [...conversations.value].sort((a, b) => b.updatedAt - a.updatedAt)
  })

  const creditsPerMessage = computed(() => {
    const tier = settings.value.modelTier
    if (tier === 'premium') return 5
    if (tier === 'standard') return 3
    return 1
  })

  // ============================================
  // Persistence
  // ============================================

  function saveToStorage() {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.value))
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
  }

  function loadFromStorage() {
    if (typeof window === 'undefined') return
    const storedConversations = safeParseJson<CommunityChatConversation[]>(
      window.localStorage.getItem(STORAGE_KEY) || ''
    )
    const storedSettings = safeParseJson<CommunityChatSettings>(
      window.localStorage.getItem(SETTINGS_KEY) || ''
    )

    if (storedConversations && Array.isArray(storedConversations)) {
      conversations.value = storedConversations
      if (conversations.value.length > 0) {
        activeConversationId.value = conversations.value[0].id
      }
    }

    if (storedSettings) {
      settings.value = {
        ...buildDefaultSettings(),
        ...storedSettings,
      }
      settings.value.modelTier = deriveTierFromModel(settings.value.model)
    }

    ensureConversation()
  }

  // ============================================
  // Conversation actions
  // ============================================

  function ensureConversation() {
    if (conversations.value.length === 0) {
      createConversation()
      return
    }
    if (!activeConversationId.value) {
      activeConversationId.value = conversations.value[0].id
    }
  }

  function createConversation(title?: string) {
    const now = Date.now()
    const conv: CommunityChatConversation = {
      id: makeConversationId(),
      title: title || 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    }
    conversations.value.unshift(conv)
    activeConversationId.value = conv.id
    saveToStorage()
    return conv
  }

  function setActiveConversation(id: string) {
    activeConversationId.value = id
    saveToStorage()
  }

  function renameConversation(id: string, title: string) {
    const conv = conversations.value.find((c) => c.id === id)
    if (!conv) return
    conv.title = title.trim() || 'New Chat'
    conv.updatedAt = Date.now()
    saveToStorage()
  }

  function deleteConversation(id: string) {
    const idx = conversations.value.findIndex((c) => c.id === id)
    if (idx === -1) return
    conversations.value.splice(idx, 1)
    if (activeConversationId.value === id) {
      activeConversationId.value = conversations.value[0]?.id || null
    }
    ensureConversation()
    saveToStorage()
  }

  function clearActiveConversation() {
    const conv = activeConversation.value
    if (!conv) return
    conv.messages = []
    conv.updatedAt = Date.now()
    saveToStorage()
  }

  // ============================================
  // Chat actions
  // ============================================

  function stopStreaming() {
    abortController.value?.abort()
    abortController.value = null
    isStreaming.value = false
  }

  function updateSettings(next: Partial<CommunityChatSettings>) {
    settings.value = { ...settings.value, ...next }
    if (next.model) {
      settings.value.modelTier = deriveTierFromModel(next.model)
    }
    saveToStorage()
  }

  async function sendStreamingMessage(content: string) {
    if (!authStore.accessToken) {
      throw new Error('You must be logged in to use chat.')
    }

    ensureConversation()
    const conv = activeConversation.value
    if (!conv) return

    const trimmed = content.trim()
    if (!trimmed) return

    // If already streaming, stop and continue as a new request
    if (isStreaming.value) {
      stopStreaming()
    }

    // Add user message
    conv.messages.push({ role: 'user', content: trimmed, timestamp: Date.now() })

    // Auto-title empty chats
    const userMessageCount = conv.messages.filter((m) => m.role === 'user').length
    if (conv.title === 'New Chat' && userMessageCount === 1) {
      conv.title = inferTitleFromMessage(trimmed)
    }

    // Add placeholder assistant message (filled during streaming)
    conv.messages.push({ role: 'assistant', content: '', timestamp: Date.now() })
    conv.updatedAt = Date.now()
    saveToStorage()

    isStreaming.value = true
    abortController.value = new AbortController()

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003'

    const systemPrompt =
      'You are SynthStack Community Edition Assistant. Be concise, practical, and helpful. ' +
      'Do not claim to have access to private systems. If you are unsure, ask a clarifying question.'

    const requestMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...conv.messages
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ]

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/completions/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: JSON.stringify({
          messages: requestMessages,
          model: settings.value.model,
          modelTier: settings.value.modelTier,
          temperature: settings.value.temperature,
          maxTokens: settings.value.maxTokens,
        }),
        signal: abortController.value.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(message)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Response body is not readable')
      const decoder = new TextDecoder()

      let buffer = ''
      const lastMessage = () => conv.messages[conv.messages.length - 1]

      let reading = true
      while (reading) {
        const { done, value } = await reader.read()
        if (done) {
          reading = false
          break
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '')

        // SSE events are separated by a blank line
        while (buffer.includes('\n\n')) {
          const idx = buffer.indexOf('\n\n')
          const rawEvent = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)

          for (const line of rawEvent.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const dataStr = line.slice(6).trim()
            if (!dataStr) continue

            const data = safeParseJson<any>(dataStr)
            if (!data) continue

            if (data.error) {
              throw new Error(data.message || 'Streaming error occurred')
            }

            if (typeof data.chunk === 'string') {
              const msg = lastMessage()
              if (msg && msg.role === 'assistant') {
                msg.content += data.chunk
              }
              conv.updatedAt = Date.now()
            }

            if (data.done) {
              // Refresh credits after completion
              await Promise.allSettled([
                authStore.fetchUser(),
                creditsStore.fetchUnifiedCredits(),
              ])
              saveToStorage()
              return
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User stopped generation; keep partial output without error noise.
        saveToStorage()
        return
      }
      throw err
    } finally {
      isStreaming.value = false
      abortController.value = null
      saveToStorage()
    }
  }

  return {
    // State
    conversations,
    activeConversationId,
    isStreaming,
    settings,

    // Getters
    activeConversation,
    sortedConversations,
    creditsPerMessage,
    MODEL_OPTIONS,

    // Persistence
    loadFromStorage,
    saveToStorage,

    // Conversation actions
    createConversation,
    setActiveConversation,
    renameConversation,
    deleteConversation,
    clearActiveConversation,

    // Chat actions
    updateSettings,
    sendStreamingMessage,
    stopStreaming,
  }
})
