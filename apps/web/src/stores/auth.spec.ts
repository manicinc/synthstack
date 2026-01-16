/**
 * @file stores/auth.spec.ts
 * @description Tests for auth Pinia store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'

// Mock the auth service
vi.mock('src/services/auth', () => ({
  authService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getActiveProvider: vi.fn().mockReturnValue('supabase'),
    getSession: vi.fn().mockResolvedValue(null),
    getConfig: vi.fn().mockReturnValue({
      providers: { supabase: true, local: false, directus: false }
    }),
    onAuthStateChange: vi.fn(),
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    resetPasswordRequest: vi.fn(),
  },
}))

// Mock the users API
vi.mock('src/services/api', () => ({
  users: {
    me: vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      plan: 'pro',
      credits: 100,
      createdAt: '2024-01-01T00:00:00Z',
    }),
    stats: vi.fn().mockResolvedValue({
      totalProjects: 5,
      totalTodos: 50,
      completedTodos: 25,
    }),
  },
}))

// Mock Sentry
vi.mock('src/boot/sentry', () => ({
  setSentryUser: vi.fn(),
}))

import { authService } from 'src/services/auth'
import { users as usersApi } from 'src/services/api'
import { setSentryUser } from 'src/boot/sentry'

describe('Auth Store', () => {
  let store: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAuthStore()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.user).toBeNull()
      expect(store.authUser).toBeNull()
      expect(store.session).toBeNull()
      expect(store.stats).toBeNull()
      expect(store.loading).toBe(true)
      expect(store.error).toBeNull()
    })

    it('should default to supabase provider', () => {
      // After first render, activeProvider is not directly exposed but we can check via computed
      expect(store.isLocalAuth).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('isAuthenticated should be false when no session', () => {
      expect(store.isAuthenticated).toBe(false)
    })

    it('accessToken should be null when no session', () => {
      expect(store.accessToken).toBeNull()
    })

    it('refreshToken should be null when no session', () => {
      expect(store.refreshToken).toBeNull()
    })

    it('plan should default to free', () => {
      expect(store.plan).toBe('free')
    })

    it('credits should default to 0', () => {
      expect(store.credits).toBe(0)
    })

    it('hasSubscription should be false for free plan', () => {
      expect(store.hasSubscription).toBe(false)
    })

    it('availableProviders should reflect config', () => {
      expect(store.availableProviders.supabase).toBe(true)
      expect(store.availableProviders.local).toBe(false)
    })
  })

  describe('initialize', () => {
    it('should initialize auth service', async () => {
      ;(authService.getSession as any).mockResolvedValueOnce(null)

      await store.initialize()

      expect(authService.initialize).toHaveBeenCalled()
      expect(authService.getActiveProvider).toHaveBeenCalled()
      expect(authService.getSession).toHaveBeenCalled()
      expect(store.loading).toBe(false)
    })

    it('should set session and fetch user when session exists', async () => {
      const mockSession = {
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          displayName: 'Test User',
          createdAt: '2024-01-01',
        },
      }

      ;(authService.getSession as any).mockResolvedValueOnce(mockSession)

      await store.initialize()

      expect(store.session).toEqual(mockSession)
      expect(store.authUser).toEqual(mockSession.user)
      expect(usersApi.me).toHaveBeenCalled()
    })

    it('should subscribe to auth state changes', async () => {
      await store.initialize()
      expect(authService.onAuthStateChange).toHaveBeenCalled()
    })

    it('should handle initialization errors', async () => {
      ;(authService.initialize as any).mockRejectedValueOnce(new Error('Init failed'))

      await store.initialize()

      expect(store.error).toBe('Init failed')
      expect(store.loading).toBe(false)
    })
  })

  describe('signUp', () => {
    it('should sign up and set session', async () => {
      const mockSession = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        user: {
          id: 'new-user',
          email: 'new@example.com',
          displayName: 'New User',
        },
      }

      ;(authService.signUp as any).mockResolvedValueOnce(mockSession)

      await store.signUp('new@example.com', 'password123', 'New User')

      expect(authService.signUp).toHaveBeenCalledWith(
        { email: 'new@example.com', password: 'password123', displayName: 'New User' },
        undefined
      )
      expect(store.session).toEqual(mockSession)
      expect(store.loading).toBe(false)
    })

    it('should handle sign up errors', async () => {
      ;(authService.signUp as any).mockRejectedValueOnce(new Error('Email already exists'))

      await expect(store.signUp('existing@example.com', 'password'))
        .rejects.toThrow('Email already exists')

      expect(store.error).toBe('Email already exists')
      expect(store.loading).toBe(false)
    })
  })

  describe('signIn', () => {
    it('should sign in and set session', async () => {
      const mockSession = {
        accessToken: 'token',
        refreshToken: 'refresh',
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
      }

      ;(authService.signIn as any).mockResolvedValueOnce(mockSession)

      await store.signIn('test@example.com', 'password')

      expect(authService.signIn).toHaveBeenCalledWith(
        { email: 'test@example.com', password: 'password' },
        undefined
      )
      expect(store.session).toEqual(mockSession)
    })

    it('should handle sign in errors', async () => {
      ;(authService.signIn as any).mockRejectedValueOnce(new Error('Invalid credentials'))

      await expect(store.signIn('wrong@example.com', 'wrong'))
        .rejects.toThrow('Invalid credentials')

      expect(store.error).toBe('Invalid credentials')
    })
  })

  describe('signInWithProvider', () => {
    it('should call OAuth sign in', async () => {
      await store.signInWithProvider('google')

      expect(authService.signInWithOAuth).toHaveBeenCalledWith('google', undefined)
    })

    it('should handle OAuth errors', async () => {
      ;(authService.signInWithOAuth as any).mockRejectedValueOnce(new Error('OAuth failed'))

      await expect(store.signInWithProvider('google'))
        .rejects.toThrow('OAuth failed')

      expect(store.error).toBe('OAuth failed')
    })
  })

  describe('logout', () => {
    it('should clear all state on logout', async () => {
      // Set some state first
      store.user = { id: '1', email: 'test@example.com' } as any
      store.session = { accessToken: 'token' } as any
      store.authUser = { id: '1' } as any

      await store.logout()

      expect(authService.signOut).toHaveBeenCalled()
      expect(store.session).toBeNull()
      expect(store.authUser).toBeNull()
      expect(store.user).toBeNull()
      expect(store.stats).toBeNull()
      expect(setSentryUser).toHaveBeenCalledWith(null)
    })

    it('should handle logout errors gracefully', async () => {
      ;(authService.signOut as any).mockRejectedValueOnce(new Error('Logout failed'))

      await store.logout()

      expect(store.error).toBe('Logout failed')
    })
  })

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const newSession = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        user: { id: '1', email: 'test@example.com' },
      }

      ;(authService.refreshSession as any).mockResolvedValueOnce(newSession)

      const result = await store.refreshSession()

      expect(result).toEqual(newSession)
      expect(store.session).toEqual(newSession)
    })

    it('should clear state when refresh fails', async () => {
      store.session = { accessToken: 'old' } as any
      store.user = { id: '1' } as any

      ;(authService.refreshSession as any).mockResolvedValueOnce(null)

      await expect(store.refreshSession()).rejects.toThrow('Session refresh failed')

      expect(store.session).toBeNull()
      expect(store.user).toBeNull()
    })
  })

  describe('resetPassword', () => {
    it('should send password reset request', async () => {
      await store.resetPassword('test@example.com')

      expect(authService.resetPasswordRequest).toHaveBeenCalledWith('test@example.com')
    })

    it('should handle reset password errors', async () => {
      ;(authService.resetPasswordRequest as any).mockRejectedValueOnce(new Error('User not found'))

      await expect(store.resetPassword('unknown@example.com'))
        .rejects.toThrow('User not found')

      expect(store.error).toBe('User not found')
    })
  })

  describe('User data integration', () => {
    it('should set Sentry user on fetch', async () => {
      const mockSession = {
        accessToken: 'token',
        user: { id: '1', email: 'test@example.com' },
      }

      ;(authService.getSession as any).mockResolvedValueOnce(mockSession)

      await store.initialize()

      expect(setSentryUser).toHaveBeenCalledWith({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
      })
    })

    it('should update computed properties when user is set', async () => {
      const mockSession = {
        accessToken: 'token',
        user: { id: '1', email: 'test@example.com' },
      }

      ;(authService.getSession as any).mockResolvedValueOnce(mockSession)

      await store.initialize()

      expect(store.plan).toBe('pro')
      expect(store.credits).toBe(100)
      expect(store.hasSubscription).toBe(true)
    })
  })
})
