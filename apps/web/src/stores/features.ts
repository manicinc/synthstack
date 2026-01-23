/**
 * @file features.ts
 * @description Pinia store for feature flags management.
 *
 * Provides reactive access to premium/community feature flags.
 * Fetches user's feature access from API and caches locally.
 *
 * Tiers:
 * - community: Free tier (Community edition)
 * - subscriber: $2-4/mo cheap tier with limited credits
 * - premium: $297 lifetime - all AI Cofounders
 *
 * Premium Features:
 * - ai_cofounders: All 6 AI agents
 * - ai_suggestions: Proactive recommendations
 * - github_integration: GitHub PRs, code review
 * - shared_agent_context: Cross-agent knowledge
 * - agent_chain_of_thought: Reasoning traces
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

// ============================================
// Types
// ============================================

export type UserTier = 'community' | 'subscriber' | 'premium' | 'lifetime'

export interface FeatureFlag {
  key: string
  name: string
  description: string | null
  category: string
  isPremium: boolean
  minTier: UserTier | null
}

export interface UserFeatureAccess {
  userId: string
  tier: UserTier
  features: Record<string, boolean>
  limits: {
    maxDocsIndexed: number
    maxCreditsPerMonth: number
    creditsUsedThisMonth: number
  }
  edition: 'community' | 'premium'
}

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'synthstack_features'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Default feature access for unauthenticated users
const DEFAULT_ACCESS: UserFeatureAccess = {
  userId: '',
  tier: 'community',
  features: {
    community_core: true,
    community_analytics: true,
    ai_cofounders: false,
    ai_suggestions: false,
    github_integration: false,
    shared_agent_context: false,
    agent_chain_of_thought: false,
    basic_chat: false,
    doc_upload: false,
    doc_chat: false,
    language_switching: true, // Available to all users by default
  },
  limits: {
    maxDocsIndexed: 0,
    maxCreditsPerMonth: 0,
    creditsUsedThisMonth: 0,
  },
  edition: 'community',
}

// ============================================
// Store
// ============================================

export const useFeatureStore = defineStore('features', () => {
  const authStore = useAuthStore()

  // ============================================
  // State
  // ============================================

  /** User's feature access */
  const access = ref<UserFeatureAccess>(DEFAULT_ACCESS)

  /** All available feature flags (public info) */
  const availableFlags = ref<FeatureFlag[]>([])

  /** Loading state */
  const loading = ref(false)

  /** Error state */
  const error = ref<string | null>(null)

  /** Last fetch time for cache validation */
  const lastFetched = ref<number>(0)

  // ============================================
  // Getters
  // ============================================

  /** Current user tier */
  const tier = computed(() => access.value.tier)

  /** Check if user has premium access */
  const isPremium = computed(() =>
    access.value.tier === 'premium' || access.value.tier === 'lifetime'
  )

  /** Check if user is subscriber or higher */
  const isSubscriber = computed(() =>
    access.value.tier !== 'community'
  )

  /** Check if running community edition */
  const isCommunityEdition = computed(() =>
    access.value.edition === 'community'
  )

  /** User's feature limits */
  const limits = computed(() => access.value.limits)

  /** Credits used percentage */
  const creditsUsedPercent = computed(() => {
    if (access.value.limits.maxCreditsPerMonth === Infinity) return 0
    if (access.value.limits.maxCreditsPerMonth === 0) return 100
    return Math.min(
      100,
      (access.value.limits.creditsUsedThisMonth / access.value.limits.maxCreditsPerMonth) * 100
    )
  })

  /** Documents indexed percentage */
  const docsUsedPercent = computed(() => {
    // This would need to be fetched from API if we want live tracking
    return 0
  })

  // ============================================
  // Feature Check Methods
  // ============================================

  /**
   * Check if user has access to a specific feature
   */
  function hasFeature(featureKey: string): boolean {
    return access.value.features[featureKey] ?? false
  }

  /**
   * Check if user has AI Cofounders access
   */
  const hasAICofounders = computed(() => hasFeature('ai_cofounders'))

  /**
   * Check if user has AI suggestions access
   */
  const hasAISuggestions = computed(() => hasFeature('ai_suggestions'))

  /**
   * Check if user has GitHub integration access
   */
  const hasGitHub = computed(() => hasFeature('github_integration'))

  /**
   * Check if user has basic chat access (subscriber+)
   */
  const hasBasicChat = computed(() => hasFeature('basic_chat'))

  /**
   * Check if user has document upload access
   */
  const hasDocUpload = computed(() => hasFeature('doc_upload'))

  /**
   * Check if user has language switching access
   */
  const hasLanguageSwitching = computed(() => hasFeature('language_switching'))

  // ============================================
  // Actions
  // ============================================

  /**
   * Fetch user's feature access from API
   */
  async function fetchFeatureAccess(force = false): Promise<void> {
    // Skip if not authenticated
    if (!authStore.isAuthenticated) {
      access.value = DEFAULT_ACCESS
      return
    }

    // Check cache validity
    const now = Date.now()
    if (!force && lastFetched.value > 0 && now - lastFetched.value < CACHE_TTL) {
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/api/v1/features', {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch feature access')
      }

      const data = await response.json()
      access.value = data
      lastFetched.value = now

      // Save to localStorage for faster hydration
      saveToStorage()
    } catch (err: any) {
      error.value = err.message
      logError('Error fetching feature access:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch available feature flags (public info)
   */
  async function fetchAvailableFlags(): Promise<void> {
    try {
      const response = await fetch('/api/v1/features/list')

      if (!response.ok) {
        throw new Error('Failed to fetch feature flags')
      }

      const data = await response.json()
      availableFlags.value = data.features
    } catch (err: any) {
      logError('Error fetching feature flags:', err)
    }
  }

  /**
   * Load from localStorage
   */
  function loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.access && parsed.timestamp) {
          // Only use if not too stale (1 hour max)
          if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
            access.value = parsed.access
            lastFetched.value = parsed.timestamp
          }
        }
      }
    } catch (err) {
      logError('Error loading features from storage:', err)
    }
  }

  /**
   * Save to localStorage
   */
  function saveToStorage(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          access: access.value,
          timestamp: lastFetched.value,
        })
      )
    } catch (err) {
      logError('Error saving features to storage:', err)
    }
  }

  /**
   * Clear cache and reset to defaults
   */
  function clearCache(): void {
    access.value = DEFAULT_ACCESS
    lastFetched.value = 0
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Initialize the store
   */
  async function initialize(): Promise<void> {
    // Try to load from localStorage first for faster hydration
    loadFromStorage()

    // Then fetch fresh data
    await fetchFeatureAccess()
    await fetchAvailableFlags()
  }

  // ============================================
  // Watchers
  // ============================================

  // Re-fetch when auth state changes
  watch(
    () => authStore.isAuthenticated,
    async (isAuth) => {
      if (isAuth) {
        await fetchFeatureAccess(true)
      } else {
        clearCache()
      }
    }
  )

  // ============================================
  // Return
  // ============================================

  return {
    // State
    access,
    availableFlags,
    loading,
    error,

    // Getters
    tier,
    isPremium,
    isSubscriber,
    isCommunityEdition,
    limits,
    creditsUsedPercent,
    docsUsedPercent,

    // Feature checks
    hasFeature,
    hasAICofounders,
    hasAISuggestions,
    hasGitHub,
    hasBasicChat,
    hasDocUpload,
    hasLanguageSwitching,

    // Actions
    fetchFeatureAccess,
    fetchAvailableFlags,
    initialize,
    clearCache,
  }
})
