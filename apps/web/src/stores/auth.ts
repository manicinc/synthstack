/**
 * @file auth.ts
 * @description Pinia store for authentication state management.
 * Uses auth service abstraction to support multiple providers.
 */

import { defineStore } from 'pinia'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import { ref, computed } from 'vue'
import {
  authService,
  type AuthSession,
  type AuthUser,
  type AuthProvider,
  type OAuthProvider,
  type SignUpData,
  type SignInCredentials
} from 'src/services/auth'
import { users as usersApi, type User, type UserStats } from 'src/services/api'
import { setSentryUser } from 'src/boot/sentry'
import { analyticsEvents, adConversions } from '@/boot/analytics'
import { useConsentStore } from '@/stores/consent'

export const useAuthStore = defineStore('auth', () => {
  // ============================================
  // State
  // ============================================

  /** Current user (from our API) */
  const user = ref<User | null>(null)

  /** Auth user (from auth provider) */
  const authUser = ref<AuthUser | null>(null)

  /** User stats */
  const stats = ref<UserStats | null>(null)

  /** Current session */
  const session = ref<AuthSession | null>(null)

  /** Loading state */
  const loading = ref(true)

  /** Error state */
  const error = ref<string | null>(null)

  /** Active auth provider */
  const activeProvider = ref<AuthProvider>('supabase')

  // ============================================
  // Getters
  // ============================================

  /** Check if user is authenticated */
  const isAuthenticated = computed(() => session.value !== null && authUser.value !== null)

  /** Get access token */
  const accessToken = computed(() => session.value?.accessToken || null)

  /** Get refresh token */
  const refreshToken = computed(() => session.value?.refreshToken || null)

  /** User's current plan */
  const plan = computed(() => user.value?.plan || 'free')

  /** User's remaining credits */
  const credits = computed(() => user.value?.credits || 0)

  /** Check if user has active subscription */
  const hasSubscription = computed(() =>
    user.value?.plan === 'maker' || user.value?.plan === 'pro'
  )

  /** Is using local auth (not Supabase) */
  const isLocalAuth = computed(() => activeProvider.value === 'local')

  /** Available auth providers */
  const availableProviders = computed(() => {
    const config = authService.getConfig()
    return {
      supabase: config?.providers.supabase ?? true,
      local: config?.providers.local ?? false,
      directus: config?.providers.directus ?? false
    }
  })

  // ============================================
  // Actions
  // ============================================

  /**
   * Initialize auth state
   */
  async function initialize() {
    loading.value = true

    try {
      // Initialize auth service
      await authService.initialize()
      activeProvider.value = authService.getActiveProvider()

      // Get current session
      const currentSession = await authService.getSession()

      if (currentSession) {
        session.value = currentSession
        authUser.value = currentSession.user
        await fetchUser()
      }

      // Subscribe to auth state changes
      authService.onAuthStateChange((newSession) => {
        session.value = newSession
        authUser.value = newSession?.user || null

        if (newSession) {
          fetchUser()
        } else {
          user.value = null
          stats.value = null
        }
      })
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch user profile from API
   */
  async function fetchUser() {
    if (!session.value) return

    try {
      const userData = await usersApi.me()
      user.value = userData

      // Set Sentry user context
      setSentryUser({
        id: userData.id,
        email: userData.email,
        username: userData.username
      })

      // Set Clarity user identification (if analytics consent granted)
      const consentStore = useConsentStore()
      if (consentStore.isAnalyticsAllowed) {
        consentStore.identifyUser(userData.id, undefined, undefined, userData.email)

        // Add segmentation tags
        if (userData.plan) {
          consentStore.setTag('subscription_plan', userData.plan)
        }
      }

      // Also fetch stats
      const userStats = await usersApi.stats()
      stats.value = userStats
    } catch (err: any) {
      // Fallback to auth user data
      if (authUser.value) {
        user.value = {
          id: authUser.value.id,
          email: authUser.value.email,
          username: authUser.value.displayName || authUser.value.email.split('@')[0],
          plan: 'free',
          credits: 5,
          createdAt: authUser.value.createdAt || new Date().toISOString()
        }

        // Set Sentry user context for fallback
        setSentryUser({
          id: authUser.value.id,
          email: authUser.value.email,
          username: authUser.value.displayName
        })

        // Set Clarity user identification for fallback
        const consentStore = useConsentStore()
        if (consentStore.isAnalyticsAllowed) {
          consentStore.identifyUser(authUser.value.id, undefined, undefined, authUser.value.email)
          consentStore.setTag('subscription_plan', 'free')
        }
      }
    }
  }

  /**
   * Sign up with email and password
   */
  async function signUp(email: string, password: string, displayName?: string, provider?: AuthProvider) {
    loading.value = true
    error.value = null

    try {
      const data: SignUpData = { email, password, displayName }
      const newSession = await authService.signUp(data, provider)

      session.value = newSession
      authUser.value = newSession.user

      await fetchUser()

      // Track sign-up event
      analyticsEvents.signUp(provider || 'email')

      // Track Google Ads conversion
      adConversions.signUpComplete()

      return newSession
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign in with email and password
   */
  async function signIn(email: string, password: string, provider?: AuthProvider) {
    loading.value = true
    error.value = null

    try {
      const credentials: SignInCredentials = { email, password }
      const newSession = await authService.signIn(credentials, provider)

      session.value = newSession
      authUser.value = newSession.user

      await fetchUser()

      // Track sign-in event
      analyticsEvents.signIn(provider || 'email')

      return newSession
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async function signInWithProvider(provider: OAuthProvider, authProvider?: AuthProvider) {
    loading.value = true
    error.value = null

    try {
      // Track OAuth sign-in initiation
      analyticsEvents.signIn(provider)

      await authService.signInWithOAuth(provider, authProvider)
      // OAuth will redirect, so we don't need to do anything else
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign out
   */
  async function logout() {
    loading.value = true

    try {
      await authService.signOut()
      session.value = null
      authUser.value = null
      user.value = null
      stats.value = null

      // Clear Sentry user context
      setSentryUser(null)
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh session
   */
  async function refreshSession() {
    try {
      const newSession = await authService.refreshSession()

      if (newSession) {
        session.value = newSession
        authUser.value = newSession.user
        return newSession
      }

      // Refresh failed, clear session
      session.value = null
      authUser.value = null
      user.value = null
      throw new Error('Session refresh failed')
    } catch (err: any) {
      session.value = null
      authUser.value = null
      user.value = null
      throw err
    }
  }

  /**
   * Send password reset email
   */
  async function resetPassword(email: string) {
    error.value = null

    try {
      await authService.resetPasswordRequest(email)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Update user password (with reset token)
   */
  async function updatePasswordWithToken(token: string, newPassword: string) {
    error.value = null

    try {
      await authService.resetPassword(token, newPassword)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Change password (authenticated)
   */
  async function changePassword(currentPassword: string, newPassword: string) {
    error.value = null

    try {
      await authService.changePassword(currentPassword, newPassword)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Update user password (legacy - for Supabase)
   * @deprecated Use changePassword instead
   */
  async function updatePassword(newPassword: string) {
    // For legacy Supabase flow where user is already authenticated via reset link
    await changePassword('', newPassword)
  }

  /**
   * Update user profile
   */
  async function updateProfile(data: Partial<User>) {
    error.value = null

    try {
      const updatedUser = await usersApi.update(data)
      user.value = updatedUser
      return updatedUser
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Decrement credits after generation
   */
  function useCredit() {
    if (user.value && user.value.credits > 0) {
      user.value.credits--
    }
    if (stats.value) {
      stats.value.generationsThisMonth++
    }
  }

  /**
   * Continue as guest (local-only mode)
   * Creates a temporary guest user with localStorage persistence
   */
  function continueAsGuest() {
    const guestId = localStorage.getItem('guest_id') || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('guest_id', guestId)

    // Create guest user with limited features
    user.value = {
      id: guestId,
      email: 'guest@local',
      username: 'Guest User',
      plan: 'free',
      credits: 3, // Limited credits for guests
      createdAt: new Date().toISOString(),
      isGuest: true
    }

    // Create mock auth user
    authUser.value = {
      id: guestId,
      email: 'guest@local',
      displayName: 'Guest User'
    }

    // No real session for guests
    session.value = null

    // Track guest sign-up event
    analyticsEvents.signUp('guest')

    return user.value
  }

  /**
   * Switch auth provider
   */
  function setProvider(provider: AuthProvider) {
    activeProvider.value = provider
  }

  return {
    // State
    user,
    authUser,
    stats,
    session,
    loading,
    error,
    activeProvider,

    // Getters
    isAuthenticated,
    accessToken,
    refreshToken,
    plan,
    credits,
    hasSubscription,
    isLocalAuth,
    availableProviders,

    // Actions
    initialize,
    fetchUser,
    signUp,
    signIn,
    signInWithProvider,
    logout,
    refreshSession,
    resetPassword,
    updatePasswordWithToken,
    changePassword,
    updatePassword,
    updateProfile,
    useCredit,
    continueAsGuest,
    setProvider
  }
})
