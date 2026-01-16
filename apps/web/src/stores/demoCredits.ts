/**
 * @file demoCredits.ts
 * @description Pinia store for demo AI copilot credit management.
 *
 * Tracks copilot-specific credits (5 messages per session) for demo/guest users:
 * - Session-based credit tracking (copilot_credits_remaining in demo_sessions)
 * - In-app banner when 1 credit remaining
 * - Email notification if user has account
 * - Translucent modal when credits depleted
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/services/api'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

// ============================================
// Types
// ============================================

/**
 * Copilot session data structure from API
 * @interface
 * @property {string} sessionId - Unique session identifier
 * @property {number} copilotCreditsRemaining - Number of AI messages remaining (max 5)
 * @property {number} copilotCreditsUsed - Number of AI messages already used
 * @property {string | null} copilotLastUsedAt - ISO timestamp of last credit use
 * @property {string | null} copilotBlockedUntil - ISO timestamp when block expires (null if not blocked)
 */
export interface CopilotSession {
  sessionId: string
  copilotCreditsRemaining: number
  copilotCreditsUsed: number
  copilotLastUsedAt: string | null
  copilotBlockedUntil: string | null
}

// ============================================
// Constants
// ============================================

const SESSION_STORAGE_KEY = 'synthstack_copilot_session_id'
const LOW_CREDITS_DISMISSED_KEY = 'synthstack_copilot_low_dismissed'
const REFERRAL_CODE_KEY = 'synthstack_referral_code'
const LAST_REFERRAL_CREDITS_KEY = 'synthstack_last_referral_credits'
const API_BASE = '/api/v1/demo'

// ============================================
// Store
// ============================================

export const useDemoCreditsStore = defineStore('demoCredits', () => {
  const $q = useQuasar()

  // ============================================
  // State
  // ============================================

  const sessionId = ref<string | null>(null)
  const creditsRemaining = ref<number>(5)
  const creditsUsed = ref<number>(0)
  const isBlocked = ref(false)
  const blockedUntil = ref<Date | null>(null)
  const lastUsedAt = ref<Date | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lowCreditsDismissed = ref(false)
  const referralCreditsEarned = ref<number>(0)

  // ============================================
  // Getters
  // ============================================

  /**
   * Whether the user has credits available to use
   *
   * Returns false if:
   * - Credits remaining is 0 or less
   * - Session is blocked due to depletion
   *
   * @type {ComputedRef<boolean>}
   */
  const hasCredits = computed(() => creditsRemaining.value > 0 && !isBlocked.value)

  /**
   * Whether the user is low on credits (exactly 1 remaining)
   *
   * Used to trigger the warning banner. Returns false if blocked.
   *
   * @type {ComputedRef<boolean>}
   */
  const isLowCredits = computed(() => creditsRemaining.value === 1 && !isBlocked.value)

  /**
   * Whether to show the low credits warning banner
   *
   * Shows when:
   * - User has exactly 1 credit remaining
   * - User has not dismissed the banner in this session
   * - Session is not blocked
   *
   * @type {ComputedRef<boolean>}
   * @see {@link dismissLowCreditsBanner}
   */
  const showLowCreditsBanner = computed(() => isLowCredits.value && !lowCreditsDismissed.value)

  /**
   * Human-readable time until the session is unblocked
   *
   * Returns:
   * - null if not blocked
   * - 'now' if block period has expired
   * - Formatted string like '2h 30m' or '45m' if still blocked
   *
   * @type {ComputedRef<string | null>}
   *
   * @example
   * ```typescript
   * const store = useDemoCreditsStore()
   * console.log(store.timeUntilUnblocked) // "1h 23m" or "45m" or "now" or null
   * ```
   */
  const timeUntilUnblocked = computed(() => {
    if (!blockedUntil.value) return null
    const now = new Date()
    const diff = blockedUntil.value.getTime() - now.getTime()
    if (diff <= 0) return 'now'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  })

  // ============================================
  // Actions
  // ============================================

  /**
   * Initialize or restore a demo copilot session
   *
   * Creates a new session with 5 credits or restores an existing session from localStorage.
   * Checks if the session is blocked due to credit depletion.
   *
   * @async
   * @returns {Promise<void>} Resolves when session is initialized
   * @throws {Error} If API call fails (falls back to local session)
   *
   * @example
   * ```typescript
   * const store = useDemoCreditsStore()
   * await store.initializeSession()
   * console.log(store.creditsRemaining) // 5 (for new session)
   * ```
   */
  async function initializeSession(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Check for existing session ID in localStorage
      const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY)

      if (storedSessionId) {
        // Verify existing session
        const response = await api.get(`${API_BASE}/session/${storedSessionId}`)

        if (response.data) {
          sessionId.value = response.data.sessionId || response.data.session_id
          creditsRemaining.value = response.data.copilot_credits_remaining ?? 5
          creditsUsed.value = response.data.copilot_credits_used ?? 0
          lastUsedAt.value = response.data.copilot_last_used_at
            ? new Date(response.data.copilot_last_used_at)
            : null

          // Check if blocked
          if (response.data.copilot_blocked_until) {
            const blockedUntilDate = new Date(response.data.copilot_blocked_until)
            if (blockedUntilDate > new Date()) {
              isBlocked.value = true
              blockedUntil.value = blockedUntilDate
            } else {
              // Block period expired
              isBlocked.value = false
              blockedUntil.value = null
            }
          }

          // Load dismissed state
          loadDismissedState()
          return
        }
      }

      // Create new session
      const response = await api.post(`${API_BASE}/session`)

      if (response.data) {
        sessionId.value = response.data.sessionId || response.data.session_id
        creditsRemaining.value = response.data.copilot_credits_remaining ?? 5
        creditsUsed.value = response.data.copilot_credits_used ?? 0
        if (sessionId.value) {
          localStorage.setItem(SESSION_STORAGE_KEY, sessionId.value)
        }

        // Show welcome notification
        $q.notify({
          type: 'info',
          message: 'Demo AI Copilot Activated',
          caption: `You have ${creditsRemaining.value} AI messages to try.`,
          position: 'top',
          timeout: 5000,
          actions: [{ icon: 'close', color: 'white', round: true }]
        })
      }
    } catch (err: any) {
      logError('Failed to initialize copilot session:', err)
      error.value = err.message || 'Failed to initialize session'

      // Fallback: Create local session
      sessionId.value = `local_${Date.now()}`
      creditsRemaining.value = 5
      creditsUsed.value = 0
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId.value)
    } finally {
      loading.value = false
    }
  }

  /**
   * Deduct one credit from the demo session
   *
   * Decrements the credit counter and shows appropriate notifications:
   * - Low credits warning when 1 credit remains
   * - Depleted modal when no credits remain
   * - Blocked modal if session is rate-limited
   *
   * @async
   * @returns {Promise<boolean>} True if credit was successfully deducted, false otherwise
   *
   * @example
   * ```typescript
   * const store = useDemoCreditsStore()
   * const success = await store.deductCredit()
   * if (!success) {
   *   console.log('No credits available')
   * }
   * ```
   *
   * @see {@link showDepletedModal} for the modal shown when depleted
   * @see {@link showLowCreditsWarning} for the warning notification
   */
  async function deductCredit(): Promise<boolean> {
    if (!sessionId.value) {
      error.value = 'No session initialized'
      return false
    }

    if (isBlocked.value) {
      showDepletedModal()
      return false
    }

    if (!hasCredits.value) {
      showDepletedModal()
      return false
    }

    loading.value = true
    error.value = null

    try {
      const response = await api.post(`${API_BASE}/deduct-credit`, {
        sessionId: sessionId.value,
        feature: 'copilot_messages'
      })

      if (response.data) {
        creditsRemaining.value = response.data.creditsRemaining
        creditsUsed.value = response.data.creditsUsed
        lastUsedAt.value = new Date()

        // Show low credits warning if 1 remaining
        if (isLowCredits.value && !lowCreditsDismissed.value) {
          showLowCreditsWarning()
        }

        // Show depleted modal if no credits left
        if (!hasCredits.value) {
          showDepletedModal()
        }

        return true
      }

      return false
    } catch (err: any) {
      logError('Failed to deduct credit:', err)

      if (err.response?.status === 429) {
        // Rate limited / blocked
        isBlocked.value = true
        blockedUntil.value = err.response.data.blockedUntil
          ? new Date(err.response.data.blockedUntil)
          : new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours default

        showDepletedModal()
        return false
      }

      if (err.response?.status === 402 || err.response?.status === 403) {
        // Out of credits
        creditsRemaining.value = 0
        showDepletedModal()
        return false
      }

      error.value = err.message || 'Failed to deduct credit'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Display a notification warning that only 1 credit remains
   *
   * Shows a Quasar notification with an "Upgrade" button that navigates to the pricing page.
   * The notification auto-dismisses after 8 seconds.
   *
   * @returns {void}
   * @see {@link navigateToPricing}
   */
  function showLowCreditsWarning(): void {
    $q.notify({
      type: 'warning',
      message: `Only ${creditsRemaining.value} AI message remaining`,
      caption: 'Upgrade for unlimited AI access',
      position: 'top',
      timeout: 8000,
      actions: [
        {
          label: 'Upgrade',
          color: 'white',
          noCaps: true,
          handler: () => navigateToPricing()
        },
        {
          icon: 'close',
          color: 'white',
          round: true
        }
      ]
    })
  }

  /**
   * Display a modal dialog when all credits are depleted
   *
   * Shows a translucent Quasar dialog with:
   * - Information about credit depletion
   * - Time until unblock (if blocked)
   * - "Upgrade to Premium" action button
   * - "Maybe Later" dismiss button
   *
   * The modal can be dismissed by clicking outside or the cancel button.
   *
   * @returns {void}
   * @see {@link timeUntilUnblocked}
   * @see {@link navigateToPricing}
   */
  function showDepletedModal(): void {
    const blockedMessage = isBlocked.value && timeUntilUnblocked.value
      ? ` You can try again in ${timeUntilUnblocked.value}.`
      : ''

    $q.dialog({
      title: '🎯 AI Credits Depleted',
      message: `You've used all 5 demo AI messages.${blockedMessage} Upgrade to continue using AI features.`,
      html: true,
      persistent: false, // Can be dismissed
      ok: {
        label: 'Upgrade to Premium',
        color: 'primary',
        unelevated: true,
        noCaps: true
      },
      cancel: {
        label: 'Maybe Later',
        flat: true,
        noCaps: true
      },
      class: 'demo-credits-modal translucent-modal'
    }).onOk(() => {
      navigateToPricing()
    })
  }

  /**
   * Dismiss the low credits banner
   *
   * Sets the dismissed flag and persists it to sessionStorage so the banner
   * doesn't reappear during the current browser session.
   *
   * @returns {void}
   */
  function dismissLowCreditsBanner(): void {
    lowCreditsDismissed.value = true
    sessionStorage.setItem(LOW_CREDITS_DISMISSED_KEY, 'true')
  }

  /**
   * Navigate to the pricing page
   *
   * Performs a full page navigation to /pricing. Used by upgrade buttons
   * in notifications and modals.
   *
   * @returns {void}
   */
  function navigateToPricing(): void {
    window.location.href = '/pricing'
  }

  /**
   * Load the low credits banner dismissed state from sessionStorage
   *
   * Called during session initialization to restore whether the user
   * has dismissed the banner in the current browser session.
   *
   * @returns {void}
   * @private
   */
  function loadDismissedState(): void {
    lowCreditsDismissed.value = sessionStorage.getItem(LOW_CREDITS_DISMISSED_KEY) === 'true'
  }

  /**
   * Reset the session state to initial values
   *
   * Clears all session data from state and storage. Used for:
   * - Testing/development
   * - User logout
   * - Manual session reset
   *
   * @returns {void}
   *
   * @example
   * ```typescript
   * const store = useDemoCreditsStore()
   * store.resetSession()
   * console.log(store.creditsRemaining) // 5 (default)
   * console.log(store.sessionId) // null
   * ```
   */
  function resetSession(): void {
    sessionId.value = null
    creditsRemaining.value = 5
    creditsUsed.value = 0
    isBlocked.value = false
    blockedUntil.value = null
    lastUsedAt.value = null
    error.value = null
    lowCreditsDismissed.value = false
    localStorage.removeItem(SESSION_STORAGE_KEY)
    sessionStorage.removeItem(LOW_CREDITS_DISMISSED_KEY)
  }

  /**
   * Refresh session data from the server
   *
   * Fetches the latest credit and block status from the API and updates local state.
   * Useful for syncing state after the user returns to the app or after network interruption.
   *
   * Does nothing if no session is initialized.
   *
   * @async
   * @returns {Promise<void>} Resolves when refresh is complete
   *
   * @example
   * ```typescript
   * const store = useDemoCreditsStore()
   * await store.refreshSession()
   * console.log('Credits updated:', store.creditsRemaining)
   * ```
   */
  async function refreshSession(): Promise<void> {
    if (!sessionId.value) return

    try {
      const response = await api.get(`${API_BASE}/session/${sessionId.value}`)

      if (response.data) {
        creditsRemaining.value = response.data.copilot_credits_remaining ?? 5
        creditsUsed.value = response.data.copilot_credits_used ?? 0
        lastUsedAt.value = response.data.copilot_last_used_at
          ? new Date(response.data.copilot_last_used_at)
          : null

        // Check if blocked
        if (response.data.copilot_blocked_until) {
          const blockedUntilDate = new Date(response.data.copilot_blocked_until)
          if (blockedUntilDate > new Date()) {
            isBlocked.value = true
            blockedUntil.value = blockedUntilDate
          } else {
            isBlocked.value = false
            blockedUntil.value = null
          }
        } else {
          isBlocked.value = false
          blockedUntil.value = null
        }
      }
    } catch (err: any) {
      logError('Failed to refresh session:', err)
    }
  }

  /**
   * Track referral click from URL parameter
   *
   * Checks for ?ref= parameter in URL and tracks the click via API.
   * Stores the referral code in localStorage for later signup tracking.
   *
   * @async
   * @returns {Promise<void>} Resolves when tracking is complete
   *
   * @example
   * ```typescript
   * // User visits: https://app.com?ref=ABC123
   * const store = useDemoCreditsStore()
   * await store.trackReferralInURL()
   * // Referral click is tracked, code stored for signup
   * ```
   */
  async function trackReferralInURL(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search)
    const refCode = urlParams.get('ref')

    if (refCode) {
      try {
        await api.post(`${API_BASE}/referral/track`, {
          referral_code: refCode
        })

        // Store in localStorage to track signup later
        localStorage.setItem(REFERRAL_CODE_KEY, refCode)
      } catch (err: any) {
        logError('Failed to track referral click:', err)
      }
    }
  }

  /**
   * Track referral signup when new session is created
   *
   * Checks localStorage for a stored referral code from a previous click.
   * If found, associates it with the new session and clears the stored code.
   *
   * @async
   * @param {string} newSessionId - The newly created session ID
   * @returns {Promise<void>} Resolves when tracking is complete
   *
   * @example
   * ```typescript
   * const store = useDemoCreditsStore()
   * await store.trackReferralSignup('session-123')
   * // Referrer earns 5 bonus credits
   * ```
   */
  async function trackReferralSignup(newSessionId: string): Promise<void> {
    const refCode = localStorage.getItem(REFERRAL_CODE_KEY)

    if (refCode) {
      try {
        await api.post(`${API_BASE}/referral/track`, {
          referral_code: refCode
        })

        // Clear after successful tracking
        localStorage.removeItem(REFERRAL_CODE_KEY)
      } catch (err: any) {
        logError('Failed to track referral signup:', err)
      }
    }
  }

  /**
   * Check for and notify about earned referral credits
   *
   * Compares current referral credits with last known value.
   * Shows a celebration notification when new credits are earned.
   *
   * @param {number} currentReferralCredits - Current referral credit count from API
   * @returns {void}
   *
   * @example
   * ```typescript
   * const store = useDemoCreditsStore()
   * store.checkReferralBonus(5) // Shows "You earned 5 bonus credits!" notification
   * ```
   */
  function checkReferralBonus(currentReferralCredits: number): void {
    const lastReferralCredits = parseInt(
      localStorage.getItem(LAST_REFERRAL_CREDITS_KEY) || '0'
    )

    if (currentReferralCredits > lastReferralCredits) {
      const bonusEarned = currentReferralCredits - lastReferralCredits

      $q.notify({
        type: 'positive',
        message: `🎉 You earned ${bonusEarned} bonus credit${bonusEarned > 1 ? 's' : ''}!`,
        caption: 'Someone signed up using your referral link',
        position: 'top',
        timeout: 5000,
        actions: [
          {
            label: 'View Referrals',
            color: 'white',
            noCaps: true,
            handler: () => {
              // Emit event to open referral tab in copilot
              window.dispatchEvent(new CustomEvent('openReferralTab'))
            }
          },
          {
            icon: 'close',
            color: 'white',
            round: true
          }
        ]
      })

      localStorage.setItem(LAST_REFERRAL_CREDITS_KEY, currentReferralCredits.toString())
    }

    referralCreditsEarned.value = currentReferralCredits
  }

  // ============================================
  // Return
  // ============================================

  return {
    // State
    sessionId,
    creditsRemaining,
    creditsUsed,
    isBlocked,
    blockedUntil,
    lastUsedAt,
    loading,
    error,
    lowCreditsDismissed,
    referralCreditsEarned,

    // Getters
    hasCredits,
    isLowCredits,
    showLowCreditsBanner,
    timeUntilUnblocked,

    // Actions
    initializeSession,
    deductCredit,
    showLowCreditsWarning,
    showDepletedModal,
    dismissLowCreditsBanner,
    navigateToPricing,
    resetSession,
    refreshSession,
    trackReferralInURL,
    trackReferralSignup,
    checkReferralBonus
  }
})
