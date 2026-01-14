/**
 * Auth Routes Unit Tests
 *
 * Comprehensive tests for all 12 authentication endpoints
 * - User management (me, signup, signin, signout)
 * - Session management (refresh, verify-token)
 * - Password management (reset-password-request, reset-password)
 * - OAuth (oauth/:provider, oauth/callback)
 * - Configuration (providers)
 * - Legacy (register-callback)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authRoutes from '../auth.js';
import { AuthError, AuthErrorCode } from '../../services/auth/index.js';
import { TEST_USERS } from '../../__tests__/fixtures/users.js';

// Mock the auth service
const mockAuthService = {
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  refreshSession: vi.fn(),
  resetPasswordRequest: vi.fn(),
  resetPassword: vi.fn(),
  getOAuthUrl: vi.fn(),
  handleOAuthCallback: vi.fn(),
  verifyToken: vi.fn(),
  getConfig: vi.fn(),
  createAuthMiddleware: vi.fn(),
};

vi.mock('../../services/auth/index.js', () => ({
  getAuthService: vi.fn(() => mockAuthService),
  AuthError: class AuthError extends Error {
    constructor(
      public code: any,
      public message: string,
      public statusCode: number = 400
    ) {
      super(message);
      this.name = 'AuthError';
    }
  },
  AuthErrorCode: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
    PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
    RATE_LIMITED: 'RATE_LIMITED',
    PROVIDER_ERROR: 'PROVIDER_ERROR',
    OAUTH_ERROR: 'OAUTH_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}));

// Mock the config module for deterministic tests
vi.mock('../../config/index.js', () => ({
  config: {
    supabaseUrl: '',
    supabaseServiceRoleKey: '',
  },
}));

describe('Auth Routes', () => {
  let server: FastifyInstance;
  let mockPgQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    server = Fastify();
    mockPgQuery = vi.fn();

    // Mock pg plugin
    server.decorate('pg', { query: mockPgQuery } as any);

    // Mock auth middleware
    mockAuthService.createAuthMiddleware.mockReturnValue(async (request: any, reply: any) => {
      if (!request.headers.authorization) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
      // Set user from test headers
      request.user = {
        id: request.headers['x-test-user-id'] || TEST_USERS.pro.id,
        email: request.headers['x-test-user-email'] || TEST_USERS.pro.email,
      };
    });

    await server.register(authRoutes);
    await server.ready();
  });

  afterEach(async () => {
    await server.close();
    vi.clearAllMocks();
  });

  // =====================================================
  // USER MANAGEMENT ENDPOINTS
  // =====================================================

  describe('GET /me - Get current user', () => {
    it('should return authenticated user profile', async () => {
      const mockUser = {
        id: TEST_USERS.pro.id,
        email: TEST_USERS.pro.email,
        display_name: TEST_USERS.pro.displayName,
        avatar_url: 'https://example.com/avatar.jpg',
        subscription_tier: 'pro',
        created_at: '2024-01-01T00:00:00Z',
        credits_remaining: 150,
        credits_used_today: 25,
      };

      mockPgQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await server.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: 'Bearer valid-token',
          'x-test-user-id': TEST_USERS.pro.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.user).toEqual({
        id: TEST_USERS.pro.id,
        email: TEST_USERS.pro.email,
        displayName: TEST_USERS.pro.displayName,
        avatarUrl: 'https://example.com/avatar.jpg',
        subscriptionTier: 'pro',
        createdAt: '2024-01-01T00:00:00Z',
      });
      expect(result.data.credits).toEqual({
        remaining: 150,
        usedToday: 25,
      });
    });

    it('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle missing user data gracefully', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [] });

      const response = await server.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.data.credits.remaining).toBe(5); // Default value
    });
  });

  describe('POST /signup - Register new user', () => {
    it('should register a new user successfully', async () => {
      const mockSession = {
        user: {
          id: 'new-user-id',
          email: 'newuser@example.com',
        },
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: '2024-06-01T12:00:00Z',
        provider: 'supabase',
      };

      mockAuthService.signUp.mockResolvedValueOnce(mockSession);

      const response = await server.inject({
        method: 'POST',
        url: '/signup',
        payload: {
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          displayName: 'New User',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe('newuser@example.com');
      expect(result.data.accessToken).toBe('access-token-123');
      expect(result.data.refreshToken).toBe('refresh-token-123');
      expect(mockAuthService.signUp).toHaveBeenCalledWith(
        {
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          displayName: 'New User',
        },
        undefined
      );
    });

    it('should return 400 for missing email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/signup',
        payload: {
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(400);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 for missing password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/signup',
        payload: {
          email: 'user@example.com',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_INPUT');
    });

    it('should handle user already exists error', async () => {
      mockAuthService.signUp.mockRejectedValueOnce(
        new AuthError(AuthErrorCode.USER_ALREADY_EXISTS, 'User already exists', 409)
      );

      const response = await server.inject({
        method: 'POST',
        url: '/signup',
        payload: {
          email: 'existing@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(409);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('USER_ALREADY_EXISTS');
    });

    it('should support provider selection', async () => {
      mockAuthService.signUp.mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: '2024-06-01T00:00:00Z',
        provider: 'local',
      });

      await server.inject({
        method: 'POST',
        url: '/signup',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          provider: 'local',
        },
      });

      expect(mockAuthService.signUp).toHaveBeenCalledWith(
        expect.any(Object),
        'local'
      );
    });
  });

  describe('POST /signin - Sign in user', () => {
    it('should sign in user with valid credentials', async () => {
      const mockSession = {
        user: {
          id: TEST_USERS.pro.id,
          email: TEST_USERS.pro.email,
        },
        accessToken: 'access-token-456',
        refreshToken: 'refresh-token-456',
        expiresAt: '2024-06-01T12:00:00Z',
        provider: 'supabase',
      };

      mockAuthService.signIn.mockResolvedValueOnce(mockSession);

      const response = await server.inject({
        method: 'POST',
        url: '/signin',
        payload: {
          email: TEST_USERS.pro.email,
          password: 'correct-password',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(TEST_USERS.pro.email);
      expect(result.data.accessToken).toBe('access-token-456');
    });

    it('should return 400 for invalid credentials', async () => {
      mockAuthService.signIn.mockRejectedValueOnce(
        new AuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401)
      );

      const response = await server.inject({
        method: 'POST',
        url: '/signin',
        payload: {
          email: 'user@example.com',
          password: 'wrong-password',
        },
      });

      expect(response.statusCode).toBe(401);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should require email and password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/signin',
        payload: {
          email: 'user@example.com',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /signout - Sign out user', () => {
    it('should sign out user successfully', async () => {
      mockAuthService.signOut.mockResolvedValueOnce(undefined);

      const response = await server.inject({
        method: 'POST',
        url: '/signout',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.message).toContain('Signed out');
      expect(mockAuthService.signOut).toHaveBeenCalledWith('valid-token');
    });

    it('should return success even if signout fails', async () => {
      mockAuthService.signOut.mockRejectedValueOnce(new Error('Token not found'));

      const response = await server.inject({
        method: 'POST',
        url: '/signout',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });

    it('should return 400 without authorization header', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/signout',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_INPUT');
    });
  });

  // =====================================================
  // SESSION MANAGEMENT ENDPOINTS
  // =====================================================

  describe('POST /refresh - Refresh token', () => {
    it('should refresh access token successfully', async () => {
      const mockSession = {
        user: {
          id: TEST_USERS.pro.id,
          email: TEST_USERS.pro.email,
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: '2024-06-01T13:00:00Z',
        provider: 'supabase',
      };

      mockAuthService.refreshSession.mockResolvedValueOnce(mockSession);

      const response = await server.inject({
        method: 'POST',
        url: '/refresh',
        payload: {
          refreshToken: 'old-refresh-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('new-access-token');
      expect(result.data.refreshToken).toBe('new-refresh-token');
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_INPUT');
    });

    it('should handle expired refresh token', async () => {
      mockAuthService.refreshSession.mockRejectedValueOnce(
        new AuthError(AuthErrorCode.TOKEN_EXPIRED, 'Refresh token expired', 401)
      );

      const response = await server.inject({
        method: 'POST',
        url: '/refresh',
        payload: {
          refreshToken: 'expired-token',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('POST /verify-token - Verify access token', () => {
    it('should verify valid token', async () => {
      mockAuthService.verifyToken.mockResolvedValueOnce({
        valid: true,
        user: {
          id: TEST_USERS.pro.id,
          email: TEST_USERS.pro.email,
        },
        expiresAt: '2024-06-01T12:00:00Z',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/verify-token',
        payload: {
          token: 'valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
      expect(result.data.user.id).toBe(TEST_USERS.pro.id);
    });

    it('should return 401 for invalid token', async () => {
      mockAuthService.verifyToken.mockResolvedValueOnce({
        valid: false,
        error: 'Token expired',
      });

      const response = await server.inject({
        method: 'POST',
        url: '/verify-token',
        payload: {
          token: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 400 for missing token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/verify-token',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_INPUT');
    });

    it('should handle verification errors', async () => {
      mockAuthService.verifyToken.mockRejectedValueOnce(new Error('Verification failed'));

      const response = await server.inject({
        method: 'POST',
        url: '/verify-token',
        payload: {
          token: 'malformed-token',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('INVALID_TOKEN');
    });
  });

  // =====================================================
  // PASSWORD MANAGEMENT ENDPOINTS
  // =====================================================

  describe('POST /reset-password-request - Request password reset', () => {
    it('should send reset password email', async () => {
      mockAuthService.resetPasswordRequest.mockResolvedValueOnce(undefined);

      const response = await server.inject({
        method: 'POST',
        url: '/reset-password-request',
        payload: {
          email: 'user@example.com',
          redirectUrl: 'https://example.com/reset',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.message).toContain('password reset email');
      expect(mockAuthService.resetPasswordRequest).toHaveBeenCalledWith(
        {
          email: 'user@example.com',
          redirectUrl: 'https://example.com/reset',
        },
        undefined
      );
    });

    it('should return success even if email does not exist (anti-enumeration)', async () => {
      mockAuthService.resetPasswordRequest.mockRejectedValueOnce(
        new Error('User not found')
      );

      const response = await server.inject({
        method: 'POST',
        url: '/reset-password-request',
        payload: {
          email: 'nonexistent@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });

    it('should return 400 for missing email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/reset-password-request',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_INPUT');
    });
  });

  describe('POST /reset-password - Reset password', () => {
    it('should reset password with token', async () => {
      mockAuthService.resetPassword.mockResolvedValueOnce(undefined);

      const response = await server.inject({
        method: 'POST',
        url: '/reset-password',
        payload: {
          token: 'reset-token-123',
          newPassword: 'NewSecurePass123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.message).toContain('Password updated');
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        {
          token: 'reset-token-123',
          currentPassword: undefined,
          newPassword: 'NewSecurePass123!',
        },
        undefined,
        undefined
      );
    });

    it('should change password with current password (authenticated)', async () => {
      mockAuthService.verifyToken.mockResolvedValueOnce({
        valid: true,
        user: {
          id: TEST_USERS.pro.id,
          email: TEST_USERS.pro.email,
        },
      });
      mockAuthService.resetPassword.mockResolvedValueOnce(undefined);

      const response = await server.inject({
        method: 'POST',
        url: '/reset-password',
        headers: {
          authorization: 'Bearer valid-token',
        },
        payload: {
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        {
          token: undefined,
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!',
        },
        TEST_USERS.pro.id,
        undefined
      );
    });

    it('should return 400 for missing new password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/reset-password',
        payload: {
          token: 'reset-token',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 for missing both token and current password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/reset-password',
        payload: {
          newPassword: 'NewPass123!',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.message).toContain('Reset token or current password');
    });

    it('should return 401 for password change without authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/reset-password',
        payload: {
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('UNAUTHORIZED');
    });

    it('should handle invalid reset token', async () => {
      mockAuthService.resetPassword.mockRejectedValueOnce(
        new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid or expired reset token', 400)
      );

      const response = await server.inject({
        method: 'POST',
        url: '/reset-password',
        payload: {
          token: 'invalid-token',
          newPassword: 'NewPass123!',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_TOKEN');
    });
  });

  // =====================================================
  // OAUTH ENDPOINTS
  // =====================================================

  describe('GET /oauth/:provider - Get OAuth URL', () => {
    it('should return OAuth URL for valid provider', async () => {
      mockAuthService.getOAuthUrl.mockReturnValueOnce('https://accounts.google.com/oauth/...');

      const response = await server.inject({
        method: 'GET',
        url: '/oauth/google?redirect_url=https://example.com/callback',
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.url).toBe('https://accounts.google.com/oauth/...');
      expect(mockAuthService.getOAuthUrl).toHaveBeenCalledWith(
        'google',
        'https://example.com/callback',
        undefined
      );
    });

    it('should support all valid OAuth providers', async () => {
      const providers = ['google', 'github', 'discord', 'apple'];

      for (const provider of providers) {
        mockAuthService.getOAuthUrl.mockReturnValueOnce(`https://${provider}.com/oauth`);

        const response = await server.inject({
          method: 'GET',
          url: `/oauth/${provider}`,
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it('should return 400 for invalid provider', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/oauth/invalid-provider',
      });

      expect(response.statusCode).toBe(400);
      const result = response.json();
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_PROVIDER');
    });

    it('should use default redirect URL if not provided', async () => {
      mockAuthService.getOAuthUrl.mockReturnValueOnce('https://oauth-url.com');

      await server.inject({
        method: 'GET',
        url: '/oauth/google',
      });

      expect(mockAuthService.getOAuthUrl).toHaveBeenCalledWith(
        'google',
        expect.stringContaining('/auth/callback'),
        undefined
      );
    });
  });

  describe('GET /oauth/callback - Handle OAuth callback', () => {
    it('should handle OAuth callback successfully', async () => {
      const mockSession = {
        user: {
          id: 'oauth-user-id',
          email: 'oauth@example.com',
        },
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
        expiresAt: '2024-06-01T12:00:00Z',
        provider: 'supabase',
      };

      mockAuthService.handleOAuthCallback.mockResolvedValueOnce(mockSession);

      const response = await server.inject({
        method: 'GET',
        url: '/oauth/callback?code=auth-code-123&provider=google',
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe('oauth@example.com');
      expect(result.data.accessToken).toBe('oauth-access-token');
      expect(mockAuthService.handleOAuthCallback).toHaveBeenCalledWith(
        'google',
        'auth-code-123',
        expect.any(String)
      );
    });

    it('should return 400 for missing code', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/oauth/callback?provider=google',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 for missing provider', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/oauth/callback?code=auth-code',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_INPUT');
    });

    it('should handle OAuth errors', async () => {
      mockAuthService.handleOAuthCallback.mockRejectedValueOnce(
        new AuthError(AuthErrorCode.PROVIDER_ERROR, 'OAuth authentication failed', 400)
      );

      const response = await server.inject({
        method: 'GET',
        url: '/oauth/callback?code=invalid-code&provider=google',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('PROVIDER_ERROR');
    });
  });

  // =====================================================
  // CONFIGURATION ENDPOINTS
  // =====================================================

  describe('GET /providers - Get auth providers', () => {
    it('should return available auth providers', async () => {
      mockAuthService.getConfig.mockReturnValueOnce({
        activeProvider: 'supabase',
        supabaseEnabled: true,
        localEnabled: false,
        directusEnabled: false,
        allowGuestMode: true,
        requireEmailVerification: false,
      });

      const response = await server.inject({
        method: 'GET',
        url: '/providers',
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.activeProvider).toBe('supabase');
      expect(result.data.providers).toEqual({
        supabase: true,
        local: false,
        directus: false,
      });
      expect(result.data.features).toEqual({
        guestMode: true,
        emailVerification: false,
      });
    });

    it('should return defaults if config is null', async () => {
      mockAuthService.getConfig.mockReturnValueOnce(null);

      const response = await server.inject({
        method: 'GET',
        url: '/providers',
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      // When config is null and Supabase isn't configured, defaults to 'local'
      expect(result.data.activeProvider).toBe('local');
      expect(result.data.providers.local).toBe(true);
    });
  });

  // =====================================================
  // LEGACY ENDPOINTS
  // =====================================================

  describe('POST /register-callback - Legacy registration', () => {
    it('should register new user in database', async () => {
      mockPgQuery
        .mockResolvedValueOnce({ rows: [] }) // User doesn't exist
        .mockResolvedValueOnce({ rows: [] }) // Insert user
        .mockResolvedValueOnce({ rows: [] }); // Insert credits

      const response = await server.inject({
        method: 'POST',
        url: '/register-callback',
        payload: {
          user_id: 'new-user-123',
          email: 'newuser@example.com',
          display_name: 'New User',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.success).toBe(true);
      expect(result.data.message).toContain('registered successfully');
    });

    it('should handle existing user', async () => {
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-user-123' }],
      });

      const response = await server.inject({
        method: 'POST',
        url: '/register-callback',
        payload: {
          user_id: 'existing-user-123',
          email: 'existing@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.message).toContain('already registered');
    });

    it('should use email prefix as display name if not provided', async () => {
      mockPgQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await server.inject({
        method: 'POST',
        url: '/register-callback',
        payload: {
          user_id: 'user-123',
          email: 'testuser@example.com',
        },
      });

      const insertUserCall = mockPgQuery.mock.calls[1];
      expect(insertUserCall[1]).toContain('testuser'); // Email prefix
    });
  });
});
