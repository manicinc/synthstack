/**
 * @file demo.ts
 * @description Pinia store for demo mode management.
 *
 * Provides session-based demo functionality for unauthenticated users:
 * - 5 initial credits for AI features
 * - Severe rate limiting (2/min, 10/hr, 20/day)
 * - Referral code generation for earning more credits
 * - Credits auto-update via polling
 *
 * Data is primarily stored in sessionStorage for privacy,
 * with optional backend sync for referral tracking.
 */

import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'
import { Notify } from 'quasar'
import { useAuthStore } from './auth'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

// ============================================
// Types
// ============================================

export interface DemoTransaction {
  action: string
  amount: number
  timestamp: string
}

export interface DemoSession {
  sessionId: string
  credits: number
  creditsUsed: number
  referralCode: string | null
  referralCreditsEarned: number
  requestsToday: number
  lastReset: string
  expiresAt: string
  transactions?: DemoTransaction[]
}

export interface DemoLimits {
  features: Record<string, { max: number; description: string }>
  rateLimits: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
    maxTokensPerRequest: number
    tokensPerDay: number
  }
  initialCredits: number
  sessionDurationDays: number
}

export interface RateLimitStatus {
  isLimited: boolean
  limitType: string | null
  current: number
  max: number
  resetsAt: string | null
  limits: {
    perMinute: number
    perHour: number
    perDay: number
  }
}

// ============================================
// Constants
// ============================================

const SESSION_STORAGE_KEY = 'synthstack_demo_session'
const BANNER_DISMISSED_KEY = 'synthstack_demo_banner_dismissed'
const BANNER_NEVER_SHOW_KEY = 'synthstack_demo_banner_never_show'
const POLL_INTERVAL = 30000 // 30 seconds for referral updates
const API_BASE = '/api/v1/demo'

// Default demo limits (fallback if API unavailable)
const DEFAULT_LIMITS: DemoLimits = {
  features: {
    chat_messages: { max: 5, description: 'AI chat messages per session' },
    projects: { max: 1, description: 'Projects in demo mode' },
    todos: { max: 5, description: 'Todos per project' },
    milestones: { max: 2, description: 'Milestones per project' },
    ai_suggestions: { max: 3, description: 'AI suggestion requests' },
    marketing_plans: { max: 0, description: 'Marketing plans (locked)' },
    ai_agents: { max: 0, description: 'AI agents (locked)' },
  },
  rateLimits: {
    requestsPerMinute: 2,
    requestsPerHour: 10,
    requestsPerDay: 20,
    maxTokensPerRequest: 1000,
    tokensPerDay: 5000,
  },
  initialCredits: 5,
  sessionDurationDays: 7,
}

// ============================================
// Store
// ============================================

export const useDemoStore = defineStore('demo', () => {
  const authStore = useAuthStore()

  // ============================================
  // State
  // ============================================

  /** Demo session data */
  const session = ref<DemoSession | null>(null)

  /** Demo limits configuration */
  const limits = ref<DemoLimits>(DEFAULT_LIMITS)

  /** Rate limit status */
  const rateLimit = ref<RateLimitStatus | null>(null)

  /** Loading state */
  const loading = ref(false)

  /** Error state */
  const error = ref<string | null>(null)

  /** Banner dismissed state (temporary for session) */
  const bannerDismissed = ref(false)

  /** Banner never show again state (persistent) */
  const bannerNeverShow = ref(false)

  /** Polling interval ID */
  let pollIntervalId: number | null = null

  // ============================================
  // Getters
  // ============================================

  /** Check if in demo mode */
  const isDemo = computed(() => session.value !== null && !authStore.isAuthenticated)

  /** Show banner (demo mode active and not dismissed) */
  const showBanner = computed(() => isDemo.value && !bannerDismissed.value && !bannerNeverShow.value)

  /** Current credits remaining */
  const credits = computed(() => session.value?.credits ?? 0)

  /** Credits used so far */
  const creditsUsed = computed(() => session.value?.creditsUsed ?? 0)

  /** Referral code for sharing */
  const referralCode = computed(() => session.value?.referralCode ?? null)

  /** Credits earned from referrals */
  const referralCreditsEarned = computed(() => session.value?.referralCreditsEarned ?? 0)

  /** Has any credits remaining */
  const hasCredits = computed(() => credits.value > 0)

  /** Is rate limited */
  const isRateLimited = computed(() => rateLimit.value?.isLimited ?? false)

  /** Session expiration date */
  const expiresAt = computed(() =>
    session.value?.expiresAt ? new Date(session.value.expiresAt) : null
  )

  /** Time until reset (human readable) */
  const timeUntilReset = computed(() => {
    if (!rateLimit.value?.resetsAt) return null
    const resetTime = new Date(rateLimit.value.resetsAt)
    const now = new Date()
    const diff = resetTime.getTime() - now.getTime()
    if (diff <= 0) return 'now'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  })

  /** Share URL for referral */
  const shareUrl = computed(() => {
    if (!referralCode.value) return null
    const base = window.location.origin
    return `${base}?ref=${referralCode.value}`
  })

  /** Referral link (alias for shareUrl for consistency) */
  const referralLink = computed(() => shareUrl.value || '')

  // ============================================
  // Session Storage
  // ============================================

  /**
   * Save session to sessionStorage
   */
  function saveToStorage(): void {
    if (session.value) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session.value))
      } catch (err) {
        logError('Error saving demo session:', err)
      }
    }
  }

  /**
   * Load session from sessionStorage
   */
  function loadFromStorage(): DemoSession | null {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as DemoSession
        // Check if session is still valid (not expired)
        if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          return parsed
        }
        // Expired, clear it
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      }
    } catch (err) {
      logError('Error loading demo session:', err)
    }
    return null
  }

  /**
   * Clear session from storage
   */
  function clearStorage(): void {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }

  // ============================================
  // API Helpers
  // ============================================

  /**
   * Get headers for demo API requests
   */
  function getDemoHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (session.value?.sessionId) {
      headers['X-Demo-Session'] = session.value.sessionId
    }
    return headers
  }

  // ============================================
  // Actions
  // ============================================

  /**
   * Initialize demo session
   * Called on app start for unauthenticated users
   */
  async function initDemo(referredBy?: string): Promise<void> {
    // Don't init demo if user is authenticated
    if (authStore.isAuthenticated) {
      return
    }

    // Load banner visibility state
    loadBannerState()

    loading.value = true
    error.value = null

    try {
      // Try to restore from sessionStorage first
      const stored = loadFromStorage()
      if (stored) {
        session.value = stored
        // Sync with backend to get fresh data
        await syncSession()
        return
      }

      // Initialize new session via API
      const response = await fetch(`${API_BASE}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint: await getBrowserFingerprint(),
          referred_by: referredBy || getUrlReferralCode(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to initialize demo session')
      }

      const data = await response.json()

      session.value = {
        sessionId: data.data.session_id,
        credits: data.data.credits,
        creditsUsed: data.data.credits_used,
        referralCode: data.data.referral_code,
        referralCreditsEarned: data.data.referral_credits_earned,
        requestsToday: 0,
        lastReset: new Date().toISOString(),
        expiresAt: data.data.expires_at,
      }

      saveToStorage()

      // Start polling for referral updates
      startPolling()

      // Show welcome notification
      Notify.create({
        type: 'info',
        message: 'Demo mode activated!',
        caption: `You have ${session.value.credits} credits to try SynthStack.`,
        position: 'top-right',
        timeout: 8000,
        actions: [
          { icon: 'close', color: 'white', round: true, handler: () => { /* dismiss */ } }
        ]
      })
    } catch (err: any) {
      devWarn('Demo API unavailable, creating local session:', err.message)

      // Fallback: Create local-only demo session when API is unavailable
      const localSessionId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const localReferralCode = `DEMO${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      session.value = {
        sessionId: localSessionId,
        credits: DEFAULT_LIMITS.initialCredits,
        creditsUsed: 0,
        referralCode: localReferralCode,
        referralCreditsEarned: 0,
        requestsToday: 0,
        lastReset: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        transactions: [],
      }

      saveToStorage()

      Notify.create({
        type: 'info',
        message: 'Demo mode activated!',
        caption: `You have ${session.value.credits} credits to try SynthStack.`,
        position: 'top-right',
        timeout: 8000,
        actions: [
          { icon: 'close', color: 'white', round: true, handler: () => { /* dismiss */ } }
        ]
      })
    } finally {
      loading.value = false
    }
  }

  /**
   * Sync session with backend
   */
  async function syncSession(): Promise<void> {
    if (!session.value?.sessionId) return

    try {
      const response = await fetch(`${API_BASE}/status`, {
        headers: getDemoHeaders(),
      })

      if (!response.ok) {
        if (response.status === 404) {
          // Session expired or not found, clear and reinit
          clearStorage()
          session.value = null
          await initDemo()
          return
        }
        throw new Error('Failed to sync demo session')
      }

      const data = await response.json()

      // Update session with fresh data
      session.value = {
        ...session.value,
        credits: data.data.credits,
        creditsUsed: data.data.credits_used,
        referralCode: data.data.referral_code,
        referralCreditsEarned: data.data.referral_credits_earned,
        requestsToday: data.data.requests_today,
        expiresAt: data.data.expires_at,
      }

      // Update rate limit status (with defensive checks)
      const rateLimitData = data.data.rate_limit || {};
      const limitsData = rateLimitData.limits || {};
      rateLimit.value = {
        isLimited: rateLimitData.is_limited ?? false,
        limitType: rateLimitData.limit_type ?? null,
        current: rateLimitData.current ?? 0,
        max: rateLimitData.max ?? 100,
        resetsAt: rateLimitData.resets_at ?? null,
        limits: {
          perMinute: limitsData.per_minute ?? 10,
          perHour: limitsData.per_hour ?? 50,
          perDay: limitsData.per_day ?? 100,
        },
      }

      // Update limits
      if (data.data.limits) {
        limits.value.features = data.data.limits
      }

      saveToStorage()
    } catch (err: any) {
      logError('Error syncing demo session:', err)
    }
  }

  /**
   * Use a credit for an action
   * Returns true if credit was used successfully
   */
  async function useCredit(action: string, creditsToUse = 1): Promise<boolean> {
    if (!session.value?.sessionId) {
      error.value = 'No demo session'
      return false
    }

    if (credits.value < creditsToUse) {
      error.value = 'Not enough credits'
      Notify.create({
        type: 'warning',
        message: 'No credits remaining',
        caption: 'Sign up or earn more through referrals!',
        position: 'top-right',
        actions: [
          {
            label: 'Sign Up',
            color: 'white',
            handler: () => {
              window.location.href = '/pricing'
            },
          },
        ],
      })
      return false
    }

    try {
      const response = await fetch(`${API_BASE}/use-credit`, {
        method: 'POST',
        headers: getDemoHeaders(),
        body: JSON.stringify({ action, credits: creditsToUse }),
      })

      if (!response.ok) {
        const data = await response.json()

        if (response.status === 429) {
          // Rate limited
          rateLimit.value = {
            isLimited: true,
            limitType: data.limits?.type || 'requests',
            current: data.limits?.used || 0,
            max: data.limits?.max || 0,
            resetsAt: data.limits?.resets_at || null,
            limits: rateLimit.value?.limits || {
              perMinute: DEFAULT_LIMITS.rateLimits.requestsPerMinute,
              perHour: DEFAULT_LIMITS.rateLimits.requestsPerHour,
              perDay: DEFAULT_LIMITS.rateLimits.requestsPerDay,
            },
          }

          Notify.create({
            type: 'negative',
            message: 'Rate limit reached',
            caption: data.message || 'Please wait before trying again.',
            position: 'top-right',
          })
          return false
        }

        if (response.status === 402) {
          // Out of credits
          Notify.create({
            type: 'warning',
            message: 'Out of demo credits',
            caption: 'Sign up for more!',
            position: 'top-right',
          })
          return false
        }

        throw new Error(data.error || 'Failed to use credit')
      }

      const data = await response.json()

      // Update local session with transaction
      const newTransaction: DemoTransaction = {
        action,
        amount: -creditsToUse,
        timestamp: new Date().toISOString(),
      }

      session.value = {
        ...session.value,
        credits: data.data.credits_remaining,
        creditsUsed: data.data.credits_used,
        transactions: [
          ...(session.value.transactions || []),
          newTransaction,
        ].slice(-10), // Keep last 10 transactions
      }

      saveToStorage()
      return true
    } catch (err: any) {
      devWarn('Demo API unavailable, using local credits:', err.message)

      // Fallback: Use credits locally when API is unavailable
      const newTransaction: DemoTransaction = {
        action,
        amount: -creditsToUse,
        timestamp: new Date().toISOString(),
      }

      session.value = {
        ...session.value!,
        credits: session.value!.credits - creditsToUse,
        creditsUsed: session.value!.creditsUsed + creditsToUse,
        transactions: [
          ...(session.value!.transactions || []),
          newTransaction,
        ].slice(-10),
      }

      saveToStorage()
      return true
    }
  }

  /**
   * Get referral stats
   */
  async function getReferralStats(): Promise<{
    clicks: number
    conversions: number
    creditsEarned: number
  } | null> {
    if (!session.value?.sessionId) return null

    try {
      const response = await fetch(`${API_BASE}/referral/stats`, {
        headers: getDemoHeaders(),
      })

      if (!response.ok) {
        throw new Error('Failed to get referral stats')
      }

      const data = await response.json()
      return {
        clicks: data.data.clicks,
        conversions: data.data.conversions,
        creditsEarned: data.data.credits_earned,
      }
    } catch (err) {
      logError('Error getting referral stats:', err)
      return null
    }
  }

  /**
   * Track a referral click (called when someone uses our referral link)
   */
  async function trackReferralClick(code: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/referral/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referral_code: code,
          fingerprint: await getBrowserFingerprint(),
        }),
      })
    } catch (err) {
      logError('Error tracking referral:', err)
    }
  }

  /**
   * Check feature limit for demo mode
   */
  function getFeatureLimit(feature: string): { max: number; allowed: boolean } {
    const limit = limits.value.features[feature]
    if (!limit) {
      return { max: 0, allowed: false }
    }
    return { max: limit.max, allowed: limit.max > 0 }
  }

  /**
   * Start polling for referral credit updates
   */
  function startPolling(): void {
    if (pollIntervalId) return

    pollIntervalId = window.setInterval(async () => {
      if (!session.value?.sessionId) return

      const prevCredits = session.value.referralCreditsEarned
      await syncSession()

      // Notify if new referral credits earned
      if (
        session.value &&
        session.value.referralCreditsEarned > prevCredits
      ) {
        const earned = session.value.referralCreditsEarned - prevCredits
        Notify.create({
          type: 'positive',
          message: `+${earned} referral credit${earned > 1 ? 's' : ''}!`,
          caption: 'Someone used your referral link.',
          position: 'top-right',
          timeout: 5000,
        })
      }
    }, POLL_INTERVAL)
  }

  /**
   * Stop polling
   */
  function stopPolling(): void {
    if (pollIntervalId) {
      clearInterval(pollIntervalId)
      pollIntervalId = null
    }
  }

  /**
   * End demo session and clear data
   */
  function endDemo(): void {
    stopPolling()
    clearStorage()
    session.value = null
    rateLimit.value = null
    error.value = null
  }

  /**
   * Copy referral link to clipboard
   */
  async function copyReferralLink(): Promise<boolean> {
    if (!shareUrl.value) return false

    try {
      await navigator.clipboard.writeText(shareUrl.value)
      Notify.create({
        type: 'positive',
        message: 'Link copied!',
        position: 'top-right',
        timeout: 2000,
      })
      return true
    } catch (err) {
      logError('Failed to copy:', err)
      return false
    }
  }

  /**
   * Dismiss banner for current session
   */
  function dismissBanner(): void {
    bannerDismissed.value = true
    sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true')
  }

  /**
   * Never show banner again (persistent)
   */
  function neverShowBanner(): void {
    bannerNeverShow.value = true
    bannerDismissed.value = true
    localStorage.setItem(BANNER_NEVER_SHOW_KEY, 'true')
  }

  /**
   * Reset banner visibility (for testing)
   */
  function resetBannerVisibility(): void {
    bannerDismissed.value = false
    bannerNeverShow.value = false
    sessionStorage.removeItem(BANNER_DISMISSED_KEY)
    localStorage.removeItem(BANNER_NEVER_SHOW_KEY)
  }

  /**
   * Load banner visibility state from storage
   */
  function loadBannerState(): void {
    bannerDismissed.value = sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true'
    bannerNeverShow.value = localStorage.getItem(BANNER_NEVER_SHOW_KEY) === 'true'
  }

  // ============================================
  // Helpers
  // ============================================

  /**
   * Get browser fingerprint for abuse prevention
   * Simple implementation - could use a library like FingerprintJS for production
   */
  async function getBrowserFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('fingerprint', 2, 2)
    }

    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ]

    // Simple hash
    const str = components.join('|')
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Get referral code from URL if present
   */
  function getUrlReferralCode(): string | undefined {
    const params = new URLSearchParams(window.location.search)
    return params.get('ref') || undefined
  }

  // ============================================
  // Lifecycle
  // ============================================

  // Watch for auth changes
  watch(
    () => authStore.isAuthenticated,
    (isAuth) => {
      if (isAuth) {
        // User logged in, end demo mode
        endDemo()
      }
    }
  )

  // ============================================
  // Return
  // ============================================

  return {
    // State
    session,
    limits,
    rateLimit,
    loading,
    error,
    bannerDismissed,
    bannerNeverShow,

    // Getters
    isDemo,
    showBanner,
    credits,
    creditsUsed,
    referralCode,
    referralCreditsEarned,
    hasCredits,
    isRateLimited,
    expiresAt,
    timeUntilReset,
    shareUrl,
    referralLink,

    // Actions
    initDemo,
    syncSession,
    useCredit,
    getReferralStats,
    trackReferralClick,
    getFeatureLimit,
    endDemo,
    copyReferralLink,
    startPolling,
    stopPolling,
    dismissBanner,
    neverShowBanner,
    resetBannerVisibility,
    loadBannerState,
  }
})
