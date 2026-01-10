/**
 * @file demoCredits.spec.ts
 * @description Unit tests for demoCredits Pinia store
 */

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useDemoCreditsStore } from './demoCredits'
import * as apiModule from 'src/services/api'

// Mock the API module
vi.mock('src/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

// Mock Quasar useQuasar to return proper dialog mock
vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    useQuasar: () => ({
      notify: vi.fn(),
      dialog: vi.fn(() => ({
        onOk: vi.fn((callback) => {
          // Optionally call the callback if needed
          return { onOk: vi.fn(), onCancel: vi.fn(), onDismiss: vi.fn() }
        })
      }))
    })
  }
})

describe('demoCredits Store', () => {
  // Mock localStorage properly to return null instead of undefined
  const localStorageMock = {
    getItem: vi.fn((_key: string): string | null => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(() => {
      localStorageMock.getItem.mockReturnValue(null)
    }),
  }
  const sessionStorageMock = {
    getItem: vi.fn((_key: string): string | null => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(() => {
      sessionStorageMock.getItem.mockReturnValue(null)
    }),
  }

  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true })

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorageMock.clear()
    sessionStorageMock.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useDemoCreditsStore()

      expect(store.sessionId).toBeNull()
      expect(store.creditsRemaining).toBe(5)
      expect(store.creditsUsed).toBe(0)
      expect(store.isBlocked).toBe(false)
      expect(store.blockedUntil).toBeNull()
      expect(store.lastUsedAt).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.lowCreditsDismissed).toBe(false)
    })

    it('should calculate hasCredits correctly', () => {
      const store = useDemoCreditsStore()

      store.creditsRemaining = 5
      expect(store.hasCredits).toBe(true)

      store.creditsRemaining = 1
      expect(store.hasCredits).toBe(true)

      store.creditsRemaining = 0
      expect(store.hasCredits).toBe(false)
    })

    it('should calculate isLowCredits correctly', () => {
      const store = useDemoCreditsStore()

      store.creditsRemaining = 2
      expect(store.isLowCredits).toBe(false)

      store.creditsRemaining = 1
      expect(store.isLowCredits).toBe(true)

      store.creditsRemaining = 0
      expect(store.isLowCredits).toBe(false)
    })

    it('should calculate showLowCreditsBanner correctly', () => {
      const store = useDemoCreditsStore()

      store.creditsRemaining = 1
      store.lowCreditsDismissed = false
      expect(store.showLowCreditsBanner).toBe(true)

      store.lowCreditsDismissed = true
      expect(store.showLowCreditsBanner).toBe(false)
    })
  })

  describe('initializeSession', () => {
    it('should create new session when none exists in localStorage', async () => {
      vi.mocked(apiModule.api.post).mockResolvedValue({
        data: {
          sessionId: 'test-session-123',
          copilot_credits_remaining: 5,
          copilot_credits_used: 0
        }
      })

      const store = useDemoCreditsStore()
      await store.initializeSession()

      expect(apiModule.api.post).toHaveBeenCalledWith('/api/v1/demo/session')
      expect(store.sessionId).toBe('test-session-123')
      expect(store.creditsRemaining).toBe(5)
      expect(store.creditsUsed).toBe(0)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('synthstack_copilot_session_id', 'test-session-123')
    })

    it('should restore existing session from localStorage', async () => {
      localStorageMock.getItem.mockReturnValueOnce('existing-session-456')

      vi.mocked(apiModule.api.get).mockResolvedValue({
        data: {
          sessionId: 'existing-session-456',
          copilot_credits_remaining: 3,
          copilot_credits_used: 2,
          copilot_last_used_at: '2024-01-06T10:00:00Z'
        }
      })

      const store = useDemoCreditsStore()
      await store.initializeSession()

      expect(apiModule.api.get).toHaveBeenCalledWith('/api/v1/demo/session/existing-session-456')
      expect(store.sessionId).toBe('existing-session-456')
      expect(store.creditsRemaining).toBe(3)
      expect(store.creditsUsed).toBe(2)
      expect(store.lastUsedAt).toBeInstanceOf(Date)
    })

    it('should handle blocked sessions correctly', async () => {
      localStorageMock.getItem.mockReturnValueOnce('blocked-session')
      const futureDate = new Date(Date.now() + 3600000).toISOString() // 1 hour in future

      vi.mocked(apiModule.api.get).mockResolvedValue({
        data: {
          sessionId: 'blocked-session',
          copilot_credits_remaining: 0,
          copilot_credits_used: 5,
          copilot_blocked_until: futureDate
        }
      })

      const store = useDemoCreditsStore()
      await store.initializeSession()

      expect(store.isBlocked).toBe(true)
      expect(store.blockedUntil).toBeInstanceOf(Date)
      expect(store.creditsRemaining).toBe(0)
    })

    it('should unblock session when block period has expired', async () => {
      localStorageMock.getItem.mockReturnValueOnce('expired-block-session')
      const pastDate = new Date(Date.now() - 3600000).toISOString() // 1 hour in past

      vi.mocked(apiModule.api.get).mockResolvedValue({
        data: {
          sessionId: 'expired-block-session',
          copilot_credits_remaining: 0,
          copilot_credits_used: 5,
          copilot_blocked_until: pastDate
        }
      })

      const store = useDemoCreditsStore()
      await store.initializeSession()

      expect(store.isBlocked).toBe(false)
      expect(store.blockedUntil).toBeNull()
    })

    it('should create fallback local session on API error', async () => {
      vi.mocked(apiModule.api.post).mockRejectedValue(new Error('Network error'))

      const store = useDemoCreditsStore()
      await store.initializeSession()

      expect(store.sessionId).toMatch(/^local_\d+$/)
      expect(store.creditsRemaining).toBe(5)
      expect(store.creditsUsed).toBe(0)
      expect(store.error).toBe('Network error')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('synthstack_copilot_session_id', expect.stringMatching(/^local_\d+$/))
    })
  })

  describe('deductCredit', () => {
    it('should successfully deduct credit', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = 'test-session'
      store.creditsRemaining = 5

      vi.mocked(apiModule.api.post).mockResolvedValue({
        data: {
          creditsRemaining: 4,
          creditsUsed: 1
        }
      })

      const success = await store.deductCredit()

      expect(success).toBe(true)
      expect(apiModule.api.post).toHaveBeenCalledWith('/api/v1/demo/deduct-credit', {
        sessionId: 'test-session',
        feature: 'copilot_messages'
      })
      expect(store.creditsRemaining).toBe(4)
      expect(store.creditsUsed).toBe(1)
    })

    it('should return false when no session initialized', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = null

      const success = await store.deductCredit()

      expect(success).toBe(false)
      expect(store.error).toBe('No session initialized')
      expect(apiModule.api.post).not.toHaveBeenCalled()
    })

    it('should show depleted modal when no credits remaining', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = 'test-session'
      store.creditsRemaining = 0

      const success = await store.deductCredit()

      expect(success).toBe(false)
      expect(store.creditsRemaining).toBe(0) // Should remain 0
    })

    it('should show depleted modal when session is blocked', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = 'test-session'
      store.creditsRemaining = 5
      store.isBlocked = true

      const success = await store.deductCredit()

      expect(success).toBe(false)
    })

    it('should handle 429 rate limit response', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = 'test-session'
      store.creditsRemaining = 5

      const futureDate = new Date(Date.now() + 86400000).toISOString() // 24 hours

      vi.mocked(apiModule.api.post).mockRejectedValue({
        response: {
          status: 429,
          data: {
            blockedUntil: futureDate
          }
        }
      })

      const success = await store.deductCredit()

      expect(success).toBe(false)
      expect(store.isBlocked).toBe(true)
      expect(store.blockedUntil).toBeInstanceOf(Date)
    })

    it('should handle 402 payment required response', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = 'test-session'
      store.creditsRemaining = 5

      vi.mocked(apiModule.api.post).mockRejectedValue({
        response: {
          status: 402,
          data: {
            error: 'Payment required'
          }
        }
      })

      const success = await store.deductCredit()

      expect(success).toBe(false)
      expect(store.creditsRemaining).toBe(0)
    })

    it('should handle 403 forbidden response', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = 'test-session'
      store.creditsRemaining = 5

      vi.mocked(apiModule.api.post).mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: 'Forbidden'
          }
        }
      })

      const success = await store.deductCredit()

      expect(success).toBe(false)
      expect(store.creditsRemaining).toBe(0)
    })
  })

  describe('dismissLowCreditsBanner', () => {
    it('should dismiss banner and store in sessionStorage', () => {
      const store = useDemoCreditsStore()
      store.lowCreditsDismissed = false

      store.dismissLowCreditsBanner()

      expect(store.lowCreditsDismissed).toBe(true)
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('synthstack_copilot_low_dismissed', 'true')
    })
  })

  describe('resetSession', () => {
    it('should reset all session data', () => {
      const store = useDemoCreditsStore()

      // Set up some state
      store.sessionId = 'test-session'
      store.creditsRemaining = 2
      store.creditsUsed = 3
      store.isBlocked = true
      store.blockedUntil = new Date()
      store.lastUsedAt = new Date()
      store.error = 'Some error'
      store.lowCreditsDismissed = true

      // Reset
      store.resetSession()

      // Verify reset
      expect(store.sessionId).toBeNull()
      expect(store.creditsRemaining).toBe(5)
      expect(store.creditsUsed).toBe(0)
      expect(store.isBlocked).toBe(false)
      expect(store.blockedUntil).toBeNull()
      expect(store.lastUsedAt).toBeNull()
      expect(store.error).toBeNull()
      expect(store.lowCreditsDismissed).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('synthstack_copilot_session_id')
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('synthstack_copilot_low_dismissed')
    })
  })

  describe('refreshSession', () => {
    it('should refresh session data from server', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = 'test-session'

      vi.mocked(apiModule.api.get).mockResolvedValue({
        data: {
          copilot_credits_remaining: 2,
          copilot_credits_used: 3,
          copilot_last_used_at: '2024-01-06T12:00:00Z'
        }
      })

      await store.refreshSession()

      expect(apiModule.api.get).toHaveBeenCalledWith('/api/v1/demo/session/test-session')
      expect(store.creditsRemaining).toBe(2)
      expect(store.creditsUsed).toBe(3)
      expect(store.lastUsedAt).toBeInstanceOf(Date)
    })

    it('should not refresh when no session exists', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = null

      await store.refreshSession()

      expect(apiModule.api.get).not.toHaveBeenCalled()
    })

    it('should update blocked status when refreshing', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = 'test-session'

      const futureDate = new Date(Date.now() + 3600000).toISOString()

      vi.mocked(apiModule.api.get).mockResolvedValue({
        data: {
          copilot_credits_remaining: 0,
          copilot_credits_used: 5,
          copilot_blocked_until: futureDate
        }
      })

      await store.refreshSession()

      expect(store.isBlocked).toBe(true)
      expect(store.blockedUntil).toBeInstanceOf(Date)
    })

    it('should clear blocked status when block expired', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = 'test-session'
      store.isBlocked = true

      const pastDate = new Date(Date.now() - 3600000).toISOString()

      vi.mocked(apiModule.api.get).mockResolvedValue({
        data: {
          copilot_credits_remaining: 0,
          copilot_credits_used: 5,
          copilot_blocked_until: pastDate
        }
      })

      await store.refreshSession()

      expect(store.isBlocked).toBe(false)
      expect(store.blockedUntil).toBeNull()
    })

    it('should handle refresh errors gracefully', async () => {
      const store = useDemoCreditsStore()
      store.sessionId = 'test-session'

      vi.mocked(apiModule.api.get).mockRejectedValue(new Error('Network error'))

      await store.refreshSession()

      // Should not throw error, just log
      expect(store.sessionId).toBe('test-session') // State unchanged
    })
  })

  describe('timeUntilUnblocked computed', () => {
    // Use fake timers to prevent timing-related flakiness
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return null when not blocked', () => {
      const store = useDemoCreditsStore()
      store.blockedUntil = null

      expect(store.timeUntilUnblocked).toBeNull()
    })

    it('should return "now" when block time has passed', () => {
      const store = useDemoCreditsStore()
      store.blockedUntil = new Date(Date.now() - 1000) // 1 second ago

      expect(store.timeUntilUnblocked).toBe('now')
    })

    it('should return formatted time for hours and minutes', () => {
      const store = useDemoCreditsStore()
      // 2 hours and 30 minutes from now
      store.blockedUntil = new Date(Date.now() + (2 * 60 * 60 * 1000) + (30 * 60 * 1000))

      expect(store.timeUntilUnblocked).toBe('2h 30m')
    })

    it('should return only minutes when less than 1 hour', () => {
      const store = useDemoCreditsStore()
      // 45 minutes from now
      store.blockedUntil = new Date(Date.now() + (45 * 60 * 1000))

      expect(store.timeUntilUnblocked).toBe('45m')
    })
  })
})
