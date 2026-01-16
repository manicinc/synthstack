/**
 * @file services/auth/__tests__/oauth-providers.test.ts
 * @description Unit tests for OAuth provider implementations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleOAuthProvider } from '../providers/oauth/google.js';
import { GitHubOAuthProvider } from '../providers/oauth/github.js';
import { DiscordOAuthProvider } from '../providers/oauth/discord.js';
import { AppleOAuthProvider } from '../providers/oauth/apple.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock jsonwebtoken for Apple provider tests
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mocked-jwt-client-secret'),
    decode: vi.fn(),
  },
}));

describe('OAuth Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Google OAuth Provider Tests
  // ============================================

  describe('GoogleOAuthProvider', () => {
    let provider: GoogleOAuthProvider;

    beforeEach(() => {
      provider = new GoogleOAuthProvider({
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
      });
    });

    describe('isConfigured', () => {
      it('should return true when credentials are set', () => {
        expect(provider.isConfigured()).toBe(true);
      });

      it('should return false when client ID is missing', () => {
        const unconfigured = new GoogleOAuthProvider({
          clientId: '',
          clientSecret: 'secret',
        });
        expect(unconfigured.isConfigured()).toBe(false);
      });

      it('should return false when client secret is missing', () => {
        const unconfigured = new GoogleOAuthProvider({
          clientId: 'id',
          clientSecret: '',
        });
        expect(unconfigured.isConfigured()).toBe(false);
      });
    });

    describe('getAuthorizationUrl', () => {
      it('should generate valid authorization URL', () => {
        const url = provider.getAuthorizationUrl(
          'state-123',
          'https://app.test.com/callback'
        );

        expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
        expect(url).toContain('client_id=google-client-id');
        expect(url).toContain('redirect_uri=');
        expect(url).toContain('response_type=code');
        expect(url).toContain('state=state-123');
        expect(url).toContain('scope=');
      });

      it('should include default scopes', () => {
        const url = provider.getAuthorizationUrl('state', 'https://app.test.com/callback');
        expect(url).toContain('openid');
        expect(url).toContain('email');
        expect(url).toContain('profile');
      });

      it('should use custom scopes when provided', () => {
        const url = provider.getAuthorizationUrl(
          'state',
          'https://app.test.com/callback',
          ['openid', 'email']
        );
        expect(url).toContain('scope=openid+email');
        expect(url).not.toContain('profile');
      });

      it('should include access_type=offline for refresh tokens', () => {
        const url = provider.getAuthorizationUrl('state', 'https://app.test.com/callback');
        expect(url).toContain('access_type=offline');
      });
    });

    describe('exchangeCodeForTokens', () => {
      it('should exchange code for tokens successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'google-access-token',
              refresh_token: 'google-refresh-token',
              token_type: 'Bearer',
              expires_in: 3600,
              scope: 'openid email profile',
              id_token: 'google-id-token',
            }),
        });

        const tokens = await provider.exchangeCodeForTokens(
          'auth-code-123',
          'https://app.test.com/callback'
        );

        expect(tokens.access_token).toBe('google-access-token');
        expect(tokens.refresh_token).toBe('google-refresh-token');
        expect(tokens.token_type).toBe('Bearer');
        expect(tokens.expires_in).toBe(3600);
        expect(tokens.id_token).toBe('google-id-token');
      });

      it('should throw error on failed token exchange', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('invalid_grant'),
        });

        await expect(
          provider.exchangeCodeForTokens('invalid-code', 'https://app.test.com/callback')
        ).rejects.toThrow('Google token exchange failed');
      });
    });

    describe('getUserInfo', () => {
      it('should fetch user info successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'google-user-123',
              email: 'user@gmail.com',
              verified_email: true,
              name: 'John Doe',
              given_name: 'John',
              family_name: 'Doe',
              picture: 'https://lh3.googleusercontent.com/photo.jpg',
            }),
        });

        const userInfo = await provider.getUserInfo('access-token');

        expect(userInfo.id).toBe('google-user-123');
        expect(userInfo.email).toBe('user@gmail.com');
        expect(userInfo.emailVerified).toBe(true);
        expect(userInfo.name).toBe('John Doe');
        expect(userInfo.firstName).toBe('John');
        expect(userInfo.lastName).toBe('Doe');
        expect(userInfo.avatarUrl).toBe('https://lh3.googleusercontent.com/photo.jpg');
      });

      it('should throw error on failed user info request', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('Unauthorized'),
        });

        await expect(provider.getUserInfo('invalid-token')).rejects.toThrow(
          'Google userinfo request failed'
        );
      });
    });
  });

  // ============================================
  // GitHub OAuth Provider Tests
  // ============================================

  describe('GitHubOAuthProvider', () => {
    let provider: GitHubOAuthProvider;

    beforeEach(() => {
      provider = new GitHubOAuthProvider({
        clientId: 'github-client-id',
        clientSecret: 'github-client-secret',
      });
    });

    describe('isConfigured', () => {
      it('should return true when credentials are set', () => {
        expect(provider.isConfigured()).toBe(true);
      });

      it('should return false when credentials are missing', () => {
        const unconfigured = new GitHubOAuthProvider({
          clientId: '',
          clientSecret: '',
        });
        expect(unconfigured.isConfigured()).toBe(false);
      });
    });

    describe('getAuthorizationUrl', () => {
      it('should generate valid authorization URL', () => {
        const url = provider.getAuthorizationUrl(
          'state-456',
          'https://app.test.com/callback'
        );

        expect(url).toContain('https://github.com/login/oauth/authorize');
        expect(url).toContain('client_id=github-client-id');
        expect(url).toContain('state=state-456');
      });

      it('should include user:email scope by default', () => {
        const url = provider.getAuthorizationUrl('state', 'https://app.test.com/callback');
        expect(url).toContain('user');
      });
    });

    describe('exchangeCodeForTokens', () => {
      it('should exchange code for tokens successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'github-access-token',
              token_type: 'bearer',
              scope: 'user:email',
            }),
        });

        const tokens = await provider.exchangeCodeForTokens(
          'auth-code',
          'https://app.test.com/callback'
        );

        expect(tokens.access_token).toBe('github-access-token');
        expect(tokens.token_type).toBe('bearer');
      });

      it('should throw error on failed token exchange', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('bad_verification_code'),
        });

        await expect(
          provider.exchangeCodeForTokens('invalid-code', 'https://app.test.com/callback')
        ).rejects.toThrow('GitHub token exchange failed');
      });
    });

    describe('getUserInfo', () => {
      it('should fetch user info and email from GitHub', async () => {
        // First call: user info
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 12345,
              login: 'octocat',
              name: 'The Octocat',
              avatar_url: 'https://github.com/images/octocat.png',
              email: null, // GitHub often returns null for public email
            }),
        });

        // Second call: user emails
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve([
              { email: 'octocat@github.com', primary: true, verified: true },
              { email: 'secondary@example.com', primary: false, verified: true },
            ]),
        });

        const userInfo = await provider.getUserInfo('access-token');

        expect(userInfo.id).toBe('12345');
        expect(userInfo.email).toBe('octocat@github.com');
        expect(userInfo.emailVerified).toBe(true);
        expect(userInfo.name).toBe('The Octocat');
        expect(userInfo.avatarUrl).toBe('https://github.com/images/octocat.png');
      });

      it('should use public email if available', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 12345,
              login: 'octocat',
              name: 'The Octocat',
              avatar_url: 'https://github.com/images/octocat.png',
              email: 'public@example.com', // Public email is set
            }),
        });

        const userInfo = await provider.getUserInfo('access-token');

        expect(userInfo.email).toBe('public@example.com');
        // Should not make second request for emails
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ============================================
  // Discord OAuth Provider Tests
  // ============================================

  describe('DiscordOAuthProvider', () => {
    let provider: DiscordOAuthProvider;

    beforeEach(() => {
      provider = new DiscordOAuthProvider({
        clientId: 'discord-client-id',
        clientSecret: 'discord-client-secret',
      });
    });

    describe('isConfigured', () => {
      it('should return true when credentials are set', () => {
        expect(provider.isConfigured()).toBe(true);
      });
    });

    describe('getAuthorizationUrl', () => {
      it('should generate valid authorization URL', () => {
        const url = provider.getAuthorizationUrl(
          'state-789',
          'https://app.test.com/callback'
        );

        expect(url).toContain('https://discord.com/api/oauth2/authorize');
        expect(url).toContain('client_id=discord-client-id');
        expect(url).toContain('state=state-789');
        expect(url).toContain('response_type=code');
      });

      it('should include identify and email scopes', () => {
        const url = provider.getAuthorizationUrl('state', 'https://app.test.com/callback');
        expect(url).toContain('identify');
        expect(url).toContain('email');
      });
    });

    describe('exchangeCodeForTokens', () => {
      it('should exchange code for tokens successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'discord-access-token',
              refresh_token: 'discord-refresh-token',
              token_type: 'Bearer',
              expires_in: 604800,
              scope: 'identify email',
            }),
        });

        const tokens = await provider.exchangeCodeForTokens(
          'auth-code',
          'https://app.test.com/callback'
        );

        expect(tokens.access_token).toBe('discord-access-token');
        expect(tokens.refresh_token).toBe('discord-refresh-token');
      });
    });

    describe('getUserInfo', () => {
      it('should fetch user info from Discord', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: '123456789012345678',
              username: 'DiscordUser',
              discriminator: '1234',
              global_name: 'Discord Display Name',
              avatar: 'abc123def456',
              email: 'user@discord.com',
              verified: true,
            }),
        });

        const userInfo = await provider.getUserInfo('access-token');

        expect(userInfo.id).toBe('123456789012345678');
        expect(userInfo.email).toBe('user@discord.com');
        expect(userInfo.emailVerified).toBe(true);
        expect(userInfo.name).toBe('Discord Display Name');
        expect(userInfo.avatarUrl).toContain('cdn.discordapp.com');
        expect(userInfo.avatarUrl).toContain('abc123def456');
      });

      it('should generate default avatar URL when user has no custom avatar', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: '123456789012345678',
              username: 'DiscordUser',
              discriminator: '1234',
              avatar: null,
              email: 'user@discord.com',
              verified: true,
            }),
        });

        const userInfo = await provider.getUserInfo('access-token');

        expect(userInfo.avatarUrl).toContain('embed/avatars');
      });
    });
  });

  // ============================================
  // Apple OAuth Provider Tests
  // ============================================

  describe('AppleOAuthProvider', () => {
    let provider: AppleOAuthProvider;

    beforeEach(() => {
      provider = new AppleOAuthProvider({
        clientId: 'com.test.app',
        clientSecret: '', // Apple uses JWT-based client secret
        options: {
          teamId: 'TEAM123456',
          keyId: 'KEY123456',
          privateKey: `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgtest-private-key
-----END PRIVATE KEY-----`,
        },
      });
    });

    describe('isConfigured', () => {
      it('should return true when all required options are set', () => {
        expect(provider.isConfigured()).toBe(true);
      });

      it('should return false when team ID is missing', () => {
        const unconfigured = new AppleOAuthProvider({
          clientId: 'com.test.app',
          clientSecret: '',
          options: {
            keyId: 'KEY123',
            privateKey: 'key',
          },
        });
        expect(unconfigured.isConfigured()).toBe(false);
      });
    });

    describe('getAuthorizationUrl', () => {
      it('should generate valid authorization URL', () => {
        const url = provider.getAuthorizationUrl(
          'state-apple',
          'https://app.test.com/callback'
        );

        expect(url).toContain('https://appleid.apple.com/auth/authorize');
        expect(url).toContain('client_id=com.test.app');
        expect(url).toContain('state=state-apple');
        expect(url).toContain('response_type=code');
        expect(url).toContain('response_mode=form_post');
      });

      it('should include name and email scopes', () => {
        const url = provider.getAuthorizationUrl('state', 'https://app.test.com/callback');
        expect(url).toContain('name');
        expect(url).toContain('email');
      });
    });

    describe('exchangeCodeForTokens', () => {
      it('should exchange code for tokens successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'apple-access-token',
              refresh_token: 'apple-refresh-token',
              token_type: 'Bearer',
              expires_in: 3600,
              id_token: 'apple-id-token.payload.signature',
            }),
        });

        const tokens = await provider.exchangeCodeForTokens(
          'auth-code',
          'https://app.test.com/callback'
        );

        expect(tokens.access_token).toBe('apple-access-token');
        expect(tokens.id_token).toBe('apple-id-token.payload.signature');
      });

      it('should throw error on failed token exchange', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('invalid_client'),
        });

        await expect(
          provider.exchangeCodeForTokens('invalid-code', 'https://app.test.com/callback')
        ).rejects.toThrow('Apple token exchange failed');
      });
    });

    describe('getUserInfo', () => {
      it('should decode user info from id_token', async () => {
        // Import the mocked jwt
        const jwt = await import('jsonwebtoken');

        // Mock jwt.decode to return parsed id_token payload
        (jwt.default.decode as any).mockReturnValue({
          sub: 'apple-user-123',
          email: 'user@icloud.com',
          email_verified: 'true',
          is_private_email: false,
        });

        // Apple requires both access_token and id_token
        // The actual user info comes from decoding the id_token
        const mockIdToken = 'header.payload.signature';
        const userInfo = await provider.getUserInfo('access-token', mockIdToken);

        expect(userInfo.id).toBe('apple-user-123');
        expect(userInfo.email).toBe('user@icloud.com');
        expect(userInfo.emailVerified).toBe(true);
      });

      it('should throw error when id_token is not provided', async () => {
        await expect(provider.getUserInfo('access-token')).rejects.toThrow(
          'Apple requires id_token'
        );
      });
    });
  });

  // ============================================
  // Provider Name Tests
  // ============================================

  describe('Provider Names', () => {
    it('should have correct provider names', () => {
      expect(
        new GoogleOAuthProvider({ clientId: 'id', clientSecret: 'secret' }).name
      ).toBe('google');
      expect(
        new GitHubOAuthProvider({ clientId: 'id', clientSecret: 'secret' }).name
      ).toBe('github');
      expect(
        new DiscordOAuthProvider({ clientId: 'id', clientSecret: 'secret' }).name
      ).toBe('discord');
      expect(
        new AppleOAuthProvider({
          clientId: 'id',
          clientSecret: '',
          options: { teamId: 't', keyId: 'k', privateKey: 'p' },
        }).name
      ).toBe('apple');
    });
  });
});
