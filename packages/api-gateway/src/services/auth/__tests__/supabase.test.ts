/**
 * Supabase Auth Provider Tests
 *
 * Tests for SupabaseAuthProvider including signup, signin, OAuth,
 * token management, and user management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SupabaseAuthProvider } from '../providers/supabase.js';
import { AuthError, AuthErrorCode } from '../types.js';

// Mock @supabase/supabase-js
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockRefreshSession = vi.fn();
const mockGetUser = vi.fn();
const mockGetUserById = vi.fn();
const mockUpdateUserById = vi.fn();
const mockDeleteUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockExchangeCodeForSession = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      refreshSession: mockRefreshSession,
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
      resetPasswordForEmail: mockResetPasswordForEmail,
      exchangeCodeForSession: mockExchangeCodeForSession,
      admin: {
        signOut: mockSignOut,
        getUserById: mockGetUserById,
        updateUserById: mockUpdateUserById,
        deleteUser: mockDeleteUser,
      },
    },
  })),
}));

describe('SupabaseAuthProvider', () => {
  let provider: SupabaseAuthProvider;
  let mockPool: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPool = {
      query: vi.fn(),
    };

    provider = new SupabaseAuthProvider({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-service-key',
      pool: mockPool,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Constructor Tests
  // ============================================

  describe('Constructor', () => {
    it('should create provider with valid options', () => {
      expect(provider.name).toBe('supabase');
    });

    it('should throw error if URL is missing', () => {
      expect(() => {
        new SupabaseAuthProvider({
          supabaseUrl: '',
          supabaseServiceKey: 'key',
          pool: mockPool,
        });
      }).toThrow('Supabase URL and service key are required');
    });

    it('should throw error if service key is missing', () => {
      expect(() => {
        new SupabaseAuthProvider({
          supabaseUrl: 'https://test.supabase.co',
          supabaseServiceKey: '',
          pool: mockPool,
        });
      }).toThrow('Supabase URL and service key are required');
    });
  });

  // ============================================
  // Sign Up Tests
  // ============================================

  describe('signUp', () => {
    it('should create new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: null,
        user_metadata: { display_name: 'Test User' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_at: 1704067200,
      };

      mockSignUp.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockPool.query.mockResolvedValueOnce({}); // ensureAppUser

      const result = await provider.signUp({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('access-token-123');
      expect(result.refreshToken).toBe('refresh-token-123');
      expect(result.provider).toBe('supabase');
    });

    it('should throw error if signup fails', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      await expect(
        provider.signUp({
          email: 'existing@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('User already exists');
    });

    it('should throw error if no user returned', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });

      await expect(
        provider.signUp({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Failed to create user');
    });

    it('should include metadata in signup', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: null,
        user_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: 1704067200,
      };

      mockSignUp.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockPool.query.mockResolvedValueOnce({});

      await provider.signUp({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test',
        metadata: { custom: 'value' },
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            display_name: 'Test',
            custom: 'value',
          },
        },
      });
    });
  });

  // ============================================
  // Sign In Tests
  // ============================================

  describe('signIn', () => {
    it('should sign in user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: { display_name: 'Test User' },
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'access-token-456',
        refresh_token: 'refresh-token-456',
        expires_at: 1704067200,
      };

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockPool.query.mockResolvedValueOnce({}); // ensureAppUser

      const result = await provider.signIn({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.emailVerified).toBe(true);
      expect(result.accessToken).toBe('access-token-456');
    });

    it('should throw error for invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        provider.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for unverified email', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      });

      try {
        await provider.signIn({
          email: 'test@example.com',
          password: 'password',
        });
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.EMAIL_NOT_VERIFIED);
      }
    });

    it('should throw error if no session returned', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'user-123' }, session: null },
        error: null,
      });

      await expect(
        provider.signIn({
          email: 'test@example.com',
          password: 'password',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  // ============================================
  // Sign Out Tests
  // ============================================

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSignOut.mockResolvedValueOnce({ error: null });

      await provider.signOut('valid-token');

      expect(mockSignOut).toHaveBeenCalledWith('valid-token');
    });

    it('should not throw error if signout fails', async () => {
      mockSignOut.mockResolvedValueOnce({
        error: { message: 'Token not found' },
      });

      // Should not throw
      await expect(provider.signOut('invalid-token')).resolves.toBeUndefined();
    });
  });

  // ============================================
  // Token Verification Tests
  // ============================================

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: { display_name: 'Test' },
        created_at: '2024-01-01T00:00:00Z',
      };

      mockGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const result = await provider.verifyToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
    });

    it('should return invalid for invalid token', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const result = await provider.verifyToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should handle verification errors', async () => {
      mockGetUser.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.verifyToken('token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token verification failed');
    });
  });

  // ============================================
  // Refresh Session Tests
  // ============================================

  describe('refreshSession', () => {
    it('should refresh session with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: 1704067200,
      };

      mockRefreshSession.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await provider.refreshSession('old-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw error for invalid refresh token', async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Token expired' },
      });

      try {
        await provider.refreshSession('expired-token');
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.TOKEN_EXPIRED);
      }
    });

    it('should throw error if no session returned', async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: { user: { id: 'user-123' }, session: null },
        error: null,
      });

      try {
        await provider.refreshSession('token');
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.INVALID_REFRESH_TOKEN);
      }
    });
  });

  // ============================================
  // User Management Tests
  // ============================================

  describe('getUser', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: { display_name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockGetUserById.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const user = await provider.getUser('user-123');

      expect(user?.email).toBe('test@example.com');
      expect(user?.displayName).toBe('Test User');
      expect(user?.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should return null for non-existent user', async () => {
      mockGetUserById.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'User not found' },
      });

      const user = await provider.getUser('nonexistent');

      expect(user).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockGetUserById.mockRejectedValueOnce(new Error('Network error'));

      const user = await provider.getUser('user-123');

      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email via app_users lookup', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'user-123' }],
      });

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
      };

      mockGetUserById.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const user = await provider.getUserByEmail('test@example.com');

      expect(user?.id).toBe('user-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id FROM app_users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return null if email not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const user = await provider.getUserByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB error'));

      const user = await provider.getUserByEmail('test@example.com');

      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: { display_name: 'New Name' },
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUpdateUserById.mockResolvedValueOnce({
        data: { user: updatedUser },
        error: null,
      });

      mockPool.query.mockResolvedValueOnce({});

      const user = await provider.updateUser('user-123', {
        displayName: 'New Name',
      });

      expect(user.displayName).toBe('New Name');
    });

    it('should throw error if update fails', async () => {
      mockUpdateUserById.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Update failed' },
      });

      await expect(
        provider.updateUser('user-123', { displayName: 'New Name' })
      ).rejects.toThrow();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockPool.query.mockResolvedValueOnce({}); // Delete from app_users
      mockDeleteUser.mockResolvedValueOnce({ error: null });

      await provider.deleteUser('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM app_users WHERE id = $1',
        ['user-123']
      );
      expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should throw error if Supabase delete fails', async () => {
      mockPool.query.mockResolvedValueOnce({});
      mockDeleteUser.mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      });

      await expect(provider.deleteUser('user-123')).rejects.toThrow();
    });
  });

  // ============================================
  // Password Reset Tests
  // ============================================

  describe('resetPasswordRequest', () => {
    it('should send password reset email', async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

      await provider.resetPasswordRequest({
        email: 'test@example.com',
        redirectUrl: 'https://example.com/reset',
      });

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: 'https://example.com/reset' }
      );
    });

    it('should throw error if request fails', async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({
        error: { message: 'Rate limited' },
      });

      await expect(
        provider.resetPasswordRequest({ email: 'test@example.com' })
      ).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should update password', async () => {
      mockUpdateUser.mockResolvedValueOnce({ error: null });

      await provider.resetPassword({
        newPassword: 'newpassword123',
      });

      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      });
    });

    it('should throw error if update fails', async () => {
      mockUpdateUser.mockResolvedValueOnce({
        error: { message: 'Password too weak' },
      });

      await expect(
        provider.resetPassword({ newPassword: 'weak' })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // OAuth Tests
  // ============================================

  describe('OAuth', () => {
    describe('getOAuthUrl', () => {
      it('should return OAuth URL for Google', () => {
        mockSignInWithOAuth.mockReturnValueOnce({
          data: { url: 'https://accounts.google.com/oauth?...' },
        });

        const url = provider.getOAuthUrl(
          'google',
          'https://example.com/callback'
        );

        expect(url).toBe('https://accounts.google.com/oauth?...');
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'https://example.com/callback',
            skipBrowserRedirect: true,
          },
        });
      });

      it('should return OAuth URL for GitHub', () => {
        mockSignInWithOAuth.mockReturnValueOnce({
          data: { url: 'https://github.com/login/oauth?...' },
        });

        const url = provider.getOAuthUrl(
          'github',
          'https://example.com/callback'
        );

        expect(url).toBe('https://github.com/login/oauth?...');
      });

      it('should handle missing URL', () => {
        mockSignInWithOAuth.mockReturnValueOnce({
          data: { url: null },
        });

        const url = provider.getOAuthUrl(
          'google',
          'https://example.com/callback'
        );

        expect(url).toBe('');
      });
    });

    describe('handleOAuthCallback', () => {
      it('should exchange code for session', async () => {
        const mockUser = {
          id: 'oauth-user-123',
          email: 'oauth@example.com',
          email_confirmed_at: '2024-01-01T00:00:00Z',
          user_metadata: { full_name: 'OAuth User' },
          created_at: '2024-01-01T00:00:00Z',
        };

        const mockSession = {
          access_token: 'oauth-access-token',
          refresh_token: 'oauth-refresh-token',
          expires_at: 1704067200,
        };

        mockExchangeCodeForSession.mockResolvedValueOnce({
          data: { user: mockUser, session: mockSession },
          error: null,
        });

        mockPool.query.mockResolvedValueOnce({}); // ensureAppUser

        const result = await provider.handleOAuthCallback(
          'google',
          'auth-code-123',
          'https://example.com/callback'
        );

        expect(result.user.email).toBe('oauth@example.com');
        expect(result.user.displayName).toBe('OAuth User');
        expect(result.accessToken).toBe('oauth-access-token');
      });

      it('should throw error if code exchange fails', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'Invalid code' },
        });

        await expect(
          provider.handleOAuthCallback(
            'google',
            'invalid-code',
            'https://example.com/callback'
          )
        ).rejects.toThrow();
      });

      it('should throw error if no session returned', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
          data: { user: { id: 'user-123' }, session: null },
          error: null,
        });

        try {
          await provider.handleOAuthCallback(
            'google',
            'code',
            'https://example.com/callback'
          );
        } catch (error: any) {
          expect(error.code).toBe(AuthErrorCode.OAUTH_ERROR);
        }
      });
    });
  });

  // ============================================
  // Error Mapping Tests
  // ============================================

  describe('Error Mapping', () => {
    it('should map "Invalid login credentials" error', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      try {
        await provider.signIn({
          email: 'test@example.com',
          password: 'wrong',
        });
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
        expect(error.statusCode).toBe(401);
      }
    });

    it('should map "User already registered" error', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      try {
        await provider.signUp({
          email: 'existing@example.com',
          password: 'password',
        });
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.USER_ALREADY_EXISTS);
        expect(error.statusCode).toBe(409);
      }
    });

    it('should map "Email not confirmed" error', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      });

      try {
        await provider.signIn({
          email: 'test@example.com',
          password: 'password',
        });
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.EMAIL_NOT_VERIFIED);
        expect(error.statusCode).toBe(403);
      }
    });

    it('should map "Token expired" error', async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Token expired' },
      });

      try {
        await provider.refreshSession('expired-token');
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.TOKEN_EXPIRED);
        expect(error.statusCode).toBe(401);
      }
    });

    it('should map unknown errors to PROVIDER_ERROR', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Unknown error', status: 500 },
      });

      try {
        await provider.signIn({
          email: 'test@example.com',
          password: 'password',
        });
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.PROVIDER_ERROR);
      }
    });
  });

  // ============================================
  // App User Sync Tests
  // ============================================

  describe('App User Sync', () => {
    it('should create app_user on signup', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: null,
        user_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: 1704067200,
      };

      mockSignUp.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockPool.query.mockResolvedValueOnce({});

      await provider.signUp({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO app_users'),
        ['user-123', 'test@example.com', 'Test User']
      );
    });

    it('should update app_user on signin', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: 1704067200,
      };

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      mockPool.query.mockResolvedValueOnce({});

      await provider.signIn({
        email: 'test@example.com',
        password: 'password',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array)
      );
    });
  });
});
