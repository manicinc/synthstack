/**
 * Local Auth Provider Tests
 *
 * Tests for LocalAuthProvider including signup, signin, token management,
 * password reset, and account lockout functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import * as argon2 from 'argon2';
import { LocalAuthProvider } from '../providers/local.js';
import { AuthError, AuthErrorCode } from '../types.js';

// Mock argon2
vi.mock('argon2', () => ({
  hash: vi.fn(),
  verify: vi.fn(),
  argon2id: 2,
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

describe('LocalAuthProvider', () => {
  let provider: LocalAuthProvider;
  let mockPool: any;
  let mockClient: any;

  const JWT_SECRET = 'test-secret-key-123';

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(mockClient),
    };

    provider = new LocalAuthProvider({
      jwtSecret: JWT_SECRET,
      pool: mockPool,
      baseUrl: 'http://localhost:3000',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Constructor Tests
  // ============================================

  describe('Constructor', () => {
    it('should create provider with required options', () => {
      expect(provider.name).toBe('local');
    });

    it('should throw error if JWT secret is missing', () => {
      expect(() => {
        new LocalAuthProvider({
          jwtSecret: '',
          pool: mockPool,
        });
      }).toThrow('JWT secret is required');
    });

    it('should use default values for optional options', () => {
      const p = new LocalAuthProvider({
        jwtSecret: JWT_SECRET,
        pool: mockPool,
      });
      expect(p.name).toBe('local');
    });
  });

  // ============================================
  // Sign Up Tests
  // ============================================

  describe('signUp', () => {
    it('should create a new user successfully', async () => {
      const newUser = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // No existing user
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Transaction queries
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [newUser] }) // INSERT user
        .mockResolvedValueOnce({}) // INSERT credentials
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce({}); // INSERT session

      (argon2.hash as any).mockResolvedValue('hashed-password');
      (jwt.sign as any).mockReturnValue('access-token-123');

      const result = await provider.signUp({
        email: 'test@example.com',
        password: 'SecurePass123',
        displayName: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('access-token-123');
      expect(result.provider).toBe('local');
      expect(argon2.hash).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }],
      });

      try {
        await provider.signUp({
          email: 'existing@example.com',
          password: 'password123',
        });
        // Should not reach here
        expect.fail('Expected signUp to throw');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AuthError);
        expect(error.code).toBe(AuthErrorCode.USER_ALREADY_EXISTS);
        expect(error.statusCode).toBe(409);
      }
    });

    it('should throw error for weak password (too short)', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        provider.signUp({
          email: 'test@example.com',
          password: 'short',
        })
      ).rejects.toThrow('at least 8 characters');
    });

    it('should throw error for password without number', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        provider.signUp({
          email: 'test@example.com',
          password: 'passwordonly',
        })
      ).rejects.toThrow('letter and one number');
    });

    it('should throw error for password without letter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        provider.signUp({
          email: 'test@example.com',
          password: '12345678',
        })
      ).rejects.toThrow('letter and one number');
    });

    it('should use email prefix as display name if not provided', async () => {
      const newUser = {
        id: 'user-123',
        email: 'john.doe@example.com',
        display_name: 'john.doe',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [newUser] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      (argon2.hash as any).mockResolvedValue('hashed-password');
      (jwt.sign as any).mockReturnValue('access-token');

      const result = await provider.signUp({
        email: 'john.doe@example.com',
        password: 'SecurePass123',
      });

      expect(result.user.displayName).toBe('john.doe');
    });

    it('should rollback transaction on error', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // INSERT fails

      (argon2.hash as any).mockResolvedValue('hashed-password');

      await expect(
        provider.signUp({
          email: 'test@example.com',
          password: 'SecurePass123',
        })
      ).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
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
        display_name: 'Test User',
        avatar_url: null,
        is_banned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        password_hash: 'hashed-password',
        email_verified: true,
        failed_login_attempts: 0,
        locked_until: null,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({}) // Reset failed attempts
        .mockResolvedValueOnce({}); // Create session

      (argon2.verify as any).mockResolvedValue(true);
      (jwt.sign as any).mockReturnValue('access-token-456');

      const result = await provider.signIn({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('access-token-456');
      expect(result.provider).toBe('local');
    });

    it('should throw error for non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        provider.signIn({
          email: 'nonexistent@example.com',
          password: 'password',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for wrong password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_banned: false,
        password_hash: 'hashed-password',
        failed_login_attempts: 0,
        locked_until: null,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({}); // Increment failed attempts

      (argon2.verify as any).mockResolvedValue(false);

      await expect(
        provider.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for locked account', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_banned: false,
        password_hash: 'hashed-password',
        failed_login_attempts: 5,
        locked_until: futureDate.toISOString(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      try {
        await provider.signIn({
          email: 'test@example.com',
          password: 'password',
        });
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.ACCOUNT_LOCKED);
        expect(error.message).toContain('locked');
      }
    });

    it('should throw error for banned account', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_banned: true,
        password_hash: 'hashed-password',
        failed_login_attempts: 0,
        locked_until: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      try {
        await provider.signIn({
          email: 'test@example.com',
          password: 'password',
        });
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.ACCOUNT_DISABLED);
      }
    });

    it('should throw error for unverified email when verification is required', async () => {
      // Create provider with email verification required
      const providerWithVerification = new LocalAuthProvider({
        jwtSecret: JWT_SECRET,
        pool: mockPool,
        baseUrl: 'http://localhost:3000',
        requireEmailVerification: true,
      });

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        is_banned: false,
        password_hash: 'hashed-password',
        email_verified: false, // Not verified
        failed_login_attempts: 0,
        locked_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      (argon2.verify as any).mockResolvedValue(true);

      try {
        await providerWithVerification.signIn({
          email: 'test@example.com',
          password: 'correctpassword',
        });
        expect.fail('Expected signIn to throw');
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.EMAIL_NOT_VERIFIED);
        expect(error.message).toContain('verify your email');
        expect(error.statusCode).toBe(403);
      }
    });

    it('should allow sign in with unverified email when verification is not required', async () => {
      // Provider without email verification requirement (default)
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: null,
        is_banned: false,
        password_hash: 'hashed-password',
        email_verified: false, // Not verified but should still work
        failed_login_attempts: 0,
        locked_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({}) // Reset failed attempts
        .mockResolvedValueOnce({}); // Create session

      (argon2.verify as any).mockResolvedValue(true);
      (jwt.sign as any).mockReturnValue('access-token');

      const result = await provider.signIn({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('access-token');
    });

    it('should reset failed attempts on successful login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test',
        is_banned: false,
        password_hash: 'hashed-password',
        email_verified: true,
        failed_login_attempts: 3,
        locked_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({}) // Reset attempts
        .mockResolvedValueOnce({}); // Create session

      (argon2.verify as any).mockResolvedValue(true);
      (jwt.sign as any).mockReturnValue('token');

      await provider.signIn({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      // Check that failed attempts reset was called
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('failed_login_attempts = 0'),
        ['user-123']
      );
    });
  });

  // ============================================
  // Sign Out Tests
  // ============================================

  describe('signOut', () => {
    it('should invalidate session on sign out', async () => {
      (jwt.verify as any).mockReturnValue({
        sub: 'user-123',
        email: 'test@example.com',
        provider: 'local',
      });

      mockPool.query.mockResolvedValueOnce({});

      await provider.signOut('valid-token');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        ['user-123']
      );
    });

    it('should not throw error for invalid token on signout', async () => {
      (jwt.verify as any).mockImplementation(() => {
        throw new Error('Invalid token');
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
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        provider: 'local',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (jwt.verify as any).mockReturnValue(mockPayload);

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'test@example.com',
            display_name: 'Test User',
            avatar_url: null,
            email_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });

      const result = await provider.verifyToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
    });

    it('should return invalid for wrong provider', async () => {
      (jwt.verify as any).mockReturnValue({
        sub: 'user-123',
        email: 'test@example.com',
        provider: 'supabase', // Wrong provider
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const result = await provider.verifyToken('other-provider-token');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not from local provider');
    });

    it('should return invalid for expired token', async () => {
      (jwt.verify as any).mockImplementation(() => {
        const error = new Error('jwt expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      const result = await provider.verifyToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    it('should return invalid for malformed token', async () => {
      (jwt.verify as any).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const result = await provider.verifyToken('malformed-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should return invalid if user not found', async () => {
      (jwt.verify as any).mockReturnValue({
        sub: 'deleted-user',
        email: 'deleted@example.com',
        provider: 'local',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await provider.verifyToken('valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  // ============================================
  // Refresh Session Tests
  // ============================================

  describe('refreshSession', () => {
    it('should refresh session with valid refresh token', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: null,
        is_banned: false,
        email_verified: true,
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSession] }) // Find session
        .mockResolvedValueOnce({}) // Invalidate old session
        .mockResolvedValueOnce({}); // Create new session

      (jwt.sign as any).mockReturnValue('new-access-token');

      const result = await provider.refreshSession('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for invalid refresh token', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      try {
        await provider.refreshSession('invalid-refresh-token');
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.INVALID_REFRESH_TOKEN);
      }
    });

    it('should throw error for expired refresh token', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSession] })
        .mockResolvedValueOnce({}); // Mark as inactive

      try {
        await provider.refreshSession('expired-refresh-token');
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.TOKEN_EXPIRED);
      }
    });

    it('should throw error if user is banned', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        email: 'test@example.com',
        is_banned: true,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockSession] });

      try {
        await provider.refreshSession('valid-refresh-token');
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.ACCOUNT_DISABLED);
      }
    });
  });

  // ============================================
  // Password Reset Tests
  // ============================================

  describe('resetPasswordRequest', () => {
    it('should create password reset token for existing user', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-123',
              email: 'test@example.com',
              email_verified: true,
            },
          ],
        }) // Get user
        .mockResolvedValueOnce({}); // Store reset token

      await provider.resetPasswordRequest({
        email: 'test@example.com',
        redirectUrl: 'https://example.com/reset',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('password_reset_token'),
        expect.any(Array)
      );
    });

    it('should not reveal if user exists', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No user

      // Should not throw error
      await expect(
        provider.resetPasswordRequest({ email: 'nonexistent@example.com' })
      ).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ user_id: 'user-123' }] }) // Verify token
        .mockResolvedValueOnce({}) // Update password
        .mockResolvedValueOnce({}); // Invalidate sessions

      (argon2.hash as any).mockResolvedValue('new-hashed-password');

      await provider.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewSecurePass123',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('password_hash'),
        expect.arrayContaining(['new-hashed-password'])
      );
    });

    it('should throw error for invalid reset token', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      (argon2.hash as any).mockResolvedValue('hashed');

      try {
        await provider.resetPassword({
          token: 'invalid-token',
          newPassword: 'NewSecurePass123',
        });
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.INVALID_TOKEN);
      }
    });

    it('should change password with current password', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ password_hash: 'current-hash' }] })
        .mockResolvedValueOnce({}); // Update password

      (argon2.verify as any).mockResolvedValue(true);
      (argon2.hash as any).mockResolvedValue('new-hash');

      await provider.resetPassword(
        {
          currentPassword: 'oldpassword',
          newPassword: 'NewSecurePass123',
        },
        'user-123'
      );

      expect(argon2.verify).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('password_hash'),
        ['new-hash', 'user-123']
      );
    });

    it('should throw error for wrong current password', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ password_hash: 'current-hash' }],
      });

      (argon2.verify as any).mockResolvedValue(false);
      (argon2.hash as any).mockResolvedValue('new-hash');

      try {
        await provider.resetPassword(
          {
            currentPassword: 'wrongpassword',
            newPassword: 'NewSecurePass123',
          },
          'user-123'
        );
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      }
    });

    it('should throw error if neither token nor current password provided', async () => {
      (argon2.hash as any).mockResolvedValue('hashed');

      try {
        await provider.resetPassword({
          newPassword: 'NewSecurePass123',
        });
      } catch (error: any) {
        expect(error.message).toContain('Token or current password required');
      }
    });
  });

  // ============================================
  // User Management Tests
  // ============================================

  describe('getUser', () => {
    it('should return user by ID', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'test@example.com',
            display_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
            email_verified: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ],
      });

      const user = await provider.getUser('user-123');

      expect(user?.email).toBe('test@example.com');
      expect(user?.displayName).toBe('Test User');
      expect(user?.emailVerified).toBe(true);
    });

    it('should return null for non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const user = await provider.getUser('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'test@example.com',
            display_name: 'Test User',
            email_verified: true,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const user = await provider.getUserByEmail('test@example.com');

      expect(user?.id).toBe('user-123');
    });

    it('should return null for non-existent email', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const user = await provider.getUserByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user display name', async () => {
      mockPool.query
        .mockResolvedValueOnce({}) // Update
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-123',
              email: 'test@example.com',
              display_name: 'New Name',
              email_verified: true,
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        });

      const user = await provider.updateUser('user-123', {
        displayName: 'New Name',
      });

      expect(user.displayName).toBe('New Name');
    });

    it('should return existing user if no updates', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'test@example.com',
            display_name: 'Test',
            email_verified: true,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const user = await provider.updateUser('user-123', {});

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('deleteUser', () => {
    it('should delete user and related data', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // Delete sessions
        .mockResolvedValueOnce({}) // Delete credentials
        .mockResolvedValueOnce({}) // Delete user
        .mockResolvedValueOnce({}); // COMMIT

      await provider.deleteUser('user-123');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Delete failed')); // Error

      await expect(provider.deleteUser('user-123')).rejects.toThrow(
        'Delete failed'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // ============================================
  // OAuth Tests
  // ============================================

  describe('OAuth', () => {
    it('should throw error for OAuth when called on LocalAuthProvider directly', () => {
      // Note: OAuth is now supported through dedicated OAuth providers
      // (GoogleOAuthProvider, GitHubOAuthProvider, etc.)
      // The LocalAuthProvider.getOAuthUrl() is kept for backwards compatibility
      // but delegates to the OAuth providers when configured
      expect(() =>
        provider.getOAuthUrl('google', 'https://example.com/callback')
      ).toThrow('OAuth not supported by local provider');
    });
  });

  // ============================================
  // Email Verification Tests
  // ============================================

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ user_id: 'user-123' }],
        }) // 1. Find token
        .mockResolvedValueOnce({}) // 2. Update email_verified = true
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-123',
              email: 'test@example.com',
              display_name: 'Test User',
              email_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        }); // 3. getUser call (SELECT from app_users JOIN local_auth_credentials)

      await provider.verifyEmail('valid-verification-token');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('email_verified = true'),
        ['user-123']
      );
    });

    it('should throw error for invalid verification token', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      try {
        await provider.verifyEmail('invalid-token');
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.INVALID_TOKEN);
      }
    });
  });

  describe('resendVerificationEmail', () => {
    it('should create new verification token for unverified user', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-123',
              email: 'test@example.com',
              email_verified: false,
            },
          ],
        }) // Find user
        .mockResolvedValueOnce({}); // Store new token

      await provider.resendVerificationEmail('test@example.com');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('email_verification_token'),
        expect.any(Array)
      );
    });

    it('should throw error if user is already verified', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'test@example.com',
            email_verified: true,
          },
        ],
      });

      // Implementation throws error for already verified users
      try {
        await provider.resendVerificationEmail('test@example.com');
        expect.fail('Expected resendVerificationEmail to throw');
      } catch (error: any) {
        expect(error.message).toContain('already verified');
      }
    });

    it('should not reveal if user does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Should not throw error to avoid user enumeration
      await expect(
        provider.resendVerificationEmail('nonexistent@example.com')
      ).resolves.toBeUndefined();
    });
  });
});
