/**
 * @file services/auth.ts
 * @description Auth service abstraction supporting multiple providers
 * Provides a unified interface for Supabase, Local PostgreSQL, and Directus auth
 */

import { supabase } from 'src/boot/supabase'
import { apiClient } from './api'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

// ============================================
// Types
// ============================================

/** Auth provider types */
export type AuthProvider = 'supabase' | 'local' | 'directus'

/** OAuth provider types */
export type OAuthProvider = 'google' | 'github' | 'discord' | 'apple'

/** Authenticated user */
export interface AuthUser {
  id: string
  email: string
  emailVerified?: boolean
  displayName?: string
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

/** Auth session */
export interface AuthSession {
  user: AuthUser
  accessToken: string
  refreshToken: string
  expiresAt: number
  provider: AuthProvider
}

/** Auth config from server */
export interface AuthConfig {
  activeProvider: AuthProvider
  providers: {
    supabase: boolean
    local: boolean
    directus: boolean
  }
  features: {
    guestMode: boolean
    emailVerification: boolean
  }
}

/** Sign up data */
export interface SignUpData {
  email: string
  password: string
  displayName?: string
}

/** Sign in credentials */
export interface SignInCredentials {
  email: string
  password: string
}

// ============================================
// Auth Service
// ============================================

class AuthService {
  private config: AuthConfig | null = null
  private activeProvider: AuthProvider = 'supabase'
  private session: AuthSession | null = null

  /**
   * Initialize auth service - fetch config from server
   */
  async initialize(): Promise<void> {
    try {
      const response = await apiClient.get<{ success: boolean; data: AuthConfig }>('/api/v1/auth/providers')
      if (response.data.success) {
        this.config = response.data.data
        this.activeProvider = this.config.activeProvider
      }
    } catch (error) {
      // Default to Supabase if can't reach server
      devWarn('[AuthService] Could not fetch auth config, using defaults')
      this.config = {
        activeProvider: 'supabase',
        providers: { supabase: true, local: false, directus: false },
        features: { guestMode: true, emailVerification: false }
      }
      this.activeProvider = 'supabase'
    }
  }

  /**
   * Get current auth config
   */
  getConfig(): AuthConfig | null {
    return this.config
  }

  /**
   * Get active provider
   */
  getActiveProvider(): AuthProvider {
    return this.activeProvider
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(provider: AuthProvider): boolean {
    return this.config?.providers[provider] ?? false
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData, provider?: AuthProvider): Promise<AuthSession> {
    const useProvider = provider || this.activeProvider

    if (useProvider === 'supabase') {
      return this.signUpWithSupabase(data)
    } else {
      return this.signUpWithLocal(data, useProvider)
    }
  }

  /**
   * Sign in with email/password
   */
  async signIn(credentials: SignInCredentials, provider?: AuthProvider): Promise<AuthSession> {
    const useProvider = provider || this.activeProvider

    if (useProvider === 'supabase') {
      return this.signInWithSupabase(credentials)
    } else {
      return this.signInWithLocal(credentials, useProvider)
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(oauthProvider: OAuthProvider, authProvider?: AuthProvider): Promise<void> {
    const useProvider = authProvider || this.activeProvider

    if (useProvider === 'supabase') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: oauthProvider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw new Error(error.message)
    } else {
      // For local provider, get OAuth URL from server and redirect
      const response = await apiClient.get<{ success: boolean; data: { url: string } }>(
        `/api/v1/auth/oauth/${oauthProvider}`,
        { params: { auth_provider: useProvider } }
      )
      if (response.data.success) {
        window.location.href = response.data.data.url
      }
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    const provider = this.session?.provider || this.activeProvider

    if (provider === 'supabase') {
      await supabase.auth.signOut()
    } else {
      // Sign out from local/directus provider
      const token = this.session?.accessToken
      if (token) {
        try {
          await apiClient.post('/api/v1/auth/signout', {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
        } catch {
          // Ignore errors - user wants to sign out
        }
      }
    }

    this.session = null
    // Clear stored tokens
    localStorage.removeItem('auth_session')
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<AuthSession | null> {
    const provider = this.session?.provider || this.activeProvider

    if (provider === 'supabase') {
      const { data, error } = await supabase.auth.refreshSession()
      if (error || !data.session || !data.user) {
        this.session = null
        return null
      }
      this.session = this.mapSupabaseSession(data.user, data.session)
      return this.session
    } else {
      // Refresh with local/directus provider
      const refreshToken = this.session?.refreshToken
      if (!refreshToken) {
        this.session = null
        return null
      }

      try {
        const response = await apiClient.post<{
          success: boolean
          data: AuthSession
        }>('/api/v1/auth/refresh', {
          refreshToken,
          provider
        })

        if (response.data.success) {
          this.session = response.data.data
          this.saveSession()
          return this.session
        }
      } catch {
        // Refresh failed
      }

      this.session = null
      return null
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<AuthSession | null> {
    // Try to restore from localStorage first
    const stored = localStorage.getItem('auth_session')
    if (stored) {
      try {
        const session = JSON.parse(stored) as AuthSession
        // Check if expired
        if (session.expiresAt > Date.now()) {
          this.session = session
          return session
        }
        // Try to refresh
        return this.refreshSession()
      } catch {
        localStorage.removeItem('auth_session')
      }
    }

    // For Supabase, check Supabase session
    if (this.activeProvider === 'supabase') {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        return null
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return null
      }
      this.session = this.mapSupabaseSession(user, session)
      return this.session
    }

    return null
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.session?.accessToken || null
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.session?.refreshToken || null
  }

  /**
   * Request password reset
   */
  async resetPasswordRequest(email: string): Promise<void> {
    if (this.activeProvider === 'supabase') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      if (error) throw new Error(error.message)
    } else {
      await apiClient.post('/api/v1/auth/reset-password-request', {
        email,
        redirectUrl: `${window.location.origin}/auth/reset-password`,
        provider: this.activeProvider
      })
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (this.activeProvider === 'supabase') {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message)
    } else {
      await apiClient.post('/api/v1/auth/reset-password', {
        token,
        newPassword,
        provider: this.activeProvider
      })
    }
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (this.activeProvider === 'supabase') {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message)
    } else {
      await apiClient.post('/api/v1/auth/reset-password', {
        currentPassword,
        newPassword,
        provider: this.activeProvider
      }, {
        headers: { Authorization: `Bearer ${this.session?.accessToken}` }
      })
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<AuthUser> {
    const response = await apiClient.post<{
      success: boolean
      data: { user: AuthUser }
    }>('/api/v1/auth/verify-email', { token })

    if (!response.data.success) {
      throw new Error('Email verification failed')
    }

    return response.data.data.user
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    if (this.activeProvider === 'supabase') {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          this.session = this.mapSupabaseSession(session.user, session)
          callback(this.session)
        } else {
          this.session = null
          callback(null)
        }
      })
      return () => subscription.unsubscribe()
    } else {
      // For local provider, check session periodically
      const interval = setInterval(async () => {
        const session = await this.getSession()
        callback(session)
      }, 60000) // Check every minute

      return () => clearInterval(interval)
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Sign up with Supabase
   */
  private async signUpWithSupabase(data: SignUpData): Promise<AuthSession> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.displayName }
      }
    })

    if (error) throw new Error(error.message)
    if (!authData.user || !authData.session) {
      throw new Error('Sign up failed')
    }

    this.session = this.mapSupabaseSession(authData.user, authData.session)
    this.saveSession()
    return this.session
  }

  /**
   * Sign up with local/directus provider
   */
  private async signUpWithLocal(data: SignUpData, provider: AuthProvider): Promise<AuthSession> {
    const response = await apiClient.post<{
      success: boolean
      data: AuthSession
      error?: { message: string }
    }>('/api/v1/auth/signup', {
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      provider
    })

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Sign up failed')
    }

    this.session = response.data.data
    this.saveSession()
    return this.session
  }

  /**
   * Sign in with Supabase
   */
  private async signInWithSupabase(credentials: SignInCredentials): Promise<AuthSession> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    })

    if (error) throw new Error(error.message)
    if (!authData.user || !authData.session) {
      throw new Error('Sign in failed')
    }

    this.session = this.mapSupabaseSession(authData.user, authData.session)
    this.saveSession()
    return this.session
  }

  /**
   * Sign in with local/directus provider
   */
  private async signInWithLocal(credentials: SignInCredentials, provider: AuthProvider): Promise<AuthSession> {
    const response = await apiClient.post<{
      success: boolean
      data: AuthSession
      error?: { message: string }
    }>('/api/v1/auth/signin', {
      email: credentials.email,
      password: credentials.password,
      provider
    })

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Sign in failed')
    }

    this.session = response.data.data
    this.saveSession()
    return this.session
  }

  /**
   * Map Supabase session to AuthSession
   */
  private mapSupabaseSession(user: any, session: any): AuthSession {
    return {
      user: {
        id: user.id,
        email: user.email!,
        emailVerified: user.email_confirmed_at !== null,
        displayName: user.user_metadata?.display_name || user.user_metadata?.full_name,
        avatarUrl: user.user_metadata?.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000,
      provider: 'supabase'
    }
  }

  /**
   * Save session to localStorage
   */
  private saveSession(): void {
    if (this.session && this.session.provider !== 'supabase') {
      // Only save non-Supabase sessions (Supabase handles its own persistence)
      localStorage.setItem('auth_session', JSON.stringify(this.session))
    }
  }
}

// Export singleton instance
export const authService = new AuthService()

// Export class for testing
export { AuthService }
