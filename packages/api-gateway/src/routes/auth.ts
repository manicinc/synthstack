/**
 * @file routes/auth.ts
 * @description Authentication routes with provider abstraction
 * Supports Supabase, Local PostgreSQL, and Directus auth providers
 * @module @synthstack/api-gateway/routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getAuthService, AuthError, AuthErrorCode } from '../services/auth/index.js';
import type { AuthProvider, OAuthProvider } from '../services/auth/types.js';
import { config as envConfig } from '../config/index.js';

// Import centralized types (FastifyRequest augmentation is in types/request.ts)
import '../types/request.js';

// Request body types
interface SignUpBody {
  email: string;
  password: string;
  displayName?: string;
  provider?: AuthProvider;
}

interface SignInBody {
  email: string;
  password: string;
  provider?: AuthProvider;
}

interface RefreshBody {
  refreshToken: string;
  provider?: AuthProvider;
}

interface ResetPasswordRequestBody {
  email: string;
  redirectUrl?: string;
  provider?: AuthProvider;
}

interface ResetPasswordBody {
  token?: string;
  currentPassword?: string;
  newPassword: string;
  provider?: AuthProvider;
}

interface OAuthCallbackQuery {
  code: string;
  provider: OAuthProvider;
  redirect_url?: string;
}

export default async function authRoutes(fastify: FastifyInstance) {
  const authService = getAuthService();

  /**
   * GET /api/v1/auth/me
   * Get current user profile
   */
  fastify.get('/me', {
    preHandler: authService.createAuthMiddleware(),
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const { user } = request;

    const profileResult = await fastify.pg.query<{
      id: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      subscription_tier: string | null;
      credits_remaining: number | null;
      created_at: string;
    }>(
      `SELECT id, email, display_name, avatar_url, subscription_tier, credits_remaining, created_at
       FROM app_users
       WHERE id = $1
       LIMIT 1`,
      [user!.id]
    );

    const profile = profileResult.rows[0];

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const usageResult = await fastify.pg.query<{ used_today: string }>(
      `
      SELECT COALESCE(SUM(ABS(amount)), 0)::text as used_today
      FROM credit_transactions
      WHERE user_id = $1 AND amount < 0 AND created_at >= $2
    `,
      [user!.id, todayStart.toISOString()]
    );

    return {
      success: true,
      data: {
        user: {
          id: user!.id,
          email: user!.email,
          displayName: profile?.display_name,
          avatarUrl: profile?.avatar_url,
          subscriptionTier: profile?.subscription_tier || 'free',
          createdAt: profile?.created_at,
        },
        credits: {
          remaining: profile?.credits_remaining ?? 5,
          usedToday: parseInt(usageResult.rows[0]?.used_today || '0', 10),
        },
      },
    };
  });

  /**
   * POST /api/v1/auth/signup
   * Register a new user
   */
  fastify.post<{ Body: SignUpBody }>('/signup', async (request, reply) => {
    const { email, password, displayName, provider } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Email and password are required' },
      });
    }

    try {
      const session = await authService.signUp(
        { email, password, displayName },
        provider
      );

      return {
        success: true,
        data: {
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
          provider: session.provider,
        },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/auth/signin
   * Sign in with email/password
   */
  fastify.post<{ Body: SignInBody }>('/signin', async (request, reply) => {
    const { email, password, provider } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Email and password are required' },
      });
    }

    try {
      const session = await authService.signIn({ email, password }, provider);

      return {
        success: true,
        data: {
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
          provider: session.provider,
        },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/auth/signout
   * Sign out and invalidate session
   */
  fastify.post('/signout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Authorization header required' },
      });
    }

    const token = authHeader.substring(7);

    try {
      await authService.signOut(token);
      return { success: true, data: { message: 'Signed out successfully' } };
    } catch (error) {
      // Still return success - user wanted to sign out
      return { success: true, data: { message: 'Signed out' } };
    }
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  fastify.post<{ Body: RefreshBody }>('/refresh', async (request, reply) => {
    const { refreshToken, provider } = request.body;

    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Refresh token is required' },
      });
    }

    try {
      const session = await authService.refreshSession(refreshToken, provider);

      return {
        success: true,
        data: {
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
          provider: session.provider,
        },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/auth/reset-password-request
   * Request password reset email
   */
  fastify.post<{ Body: ResetPasswordRequestBody }>('/reset-password-request', async (request, reply) => {
    const { email, redirectUrl, provider } = request.body;

    if (!email) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Email is required' },
      });
    }

    try {
      await authService.resetPasswordRequest({ email, redirectUrl }, provider);

      // Always return success to prevent email enumeration
      return {
        success: true,
        data: { message: 'If an account exists, a password reset email has been sent' },
      };
    } catch (error) {
      // Still return success to prevent email enumeration
      return {
        success: true,
        data: { message: 'If an account exists, a password reset email has been sent' },
      };
    }
  });

  /**
   * POST /api/v1/auth/reset-password
   * Reset password with token or change password
   */
  fastify.post<{ Body: ResetPasswordBody }>('/reset-password', async (request, reply) => {
    const { token, currentPassword, newPassword, provider } = request.body;

    if (!newPassword) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'New password is required' },
      });
    }

    if (!token && !currentPassword) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Reset token or current password is required' },
      });
    }

    try {
      // If using current password, need to be authenticated
      let userId: string | undefined;
      if (currentPassword) {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required for password change' },
          });
        }

        const accessToken = authHeader.substring(7);
        const verification = await authService.verifyToken(accessToken);
        if (!verification.valid || !verification.user) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
          });
        }
        userId = verification.user.id;
      }

      await authService.resetPassword({ token, currentPassword, newPassword }, userId, provider);

      return {
        success: true,
        data: { message: 'Password updated successfully' },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/auth/oauth/:provider
   * Get OAuth URL for social login
   */
  fastify.get<{
    Params: { provider: OAuthProvider };
    Querystring: { redirect_url?: string; auth_provider?: AuthProvider };
  }>('/oauth/:provider', async (request, reply) => {
    const { provider } = request.params;
    const { redirect_url, auth_provider } = request.query;

    const validProviders: OAuthProvider[] = ['google', 'github', 'discord', 'apple'];
    if (!validProviders.includes(provider)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PROVIDER', message: 'Invalid OAuth provider' },
      });
    }

    try {
      const redirectUrl = redirect_url || `${request.protocol}://${request.hostname}/auth/callback`;
      const url = authService.getOAuthUrl(provider, redirectUrl, auth_provider);

      return {
        success: true,
        data: { url },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/auth/oauth/callback
   * Handle OAuth callback
   */
  fastify.get<{ Querystring: OAuthCallbackQuery }>('/oauth/callback', async (request, reply) => {
    const { code, provider, redirect_url } = request.query;

    if (!code || !provider) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Code and provider are required' },
      });
    }

    try {
      const redirectUrl = redirect_url || `${request.protocol}://${request.hostname}/auth/callback`;
      const session = await authService.handleOAuthCallback(provider, code, redirectUrl);

      return {
        success: true,
        data: {
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
          provider: session.provider,
        },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: { code: error.code, message: error.message },
        });
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/auth/verify-token
   * Verify an access token
   */
  fastify.post<{ Body: { token: string; provider?: AuthProvider } }>('/verify-token', async (request, reply) => {
    const { token, provider } = request.body;

    if (!token) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Token is required' },
      });
    }

    try {
      const result = await authService.verifyToken(token, provider);

      if (!result.valid) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: result.error || 'Invalid token' },
        });
      }

      return {
        success: true,
        data: {
          valid: true,
          user: result.user,
          expiresAt: result.expiresAt,
        },
      };
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Token verification failed' },
      });
    }
  });

  /**
   * GET /api/v1/auth/providers
   * Get available auth providers
   */
  fastify.get('/providers', async (_request, _reply) => {
    const providerConfig = authService.getConfig();
    const supabaseConfigured = Boolean(envConfig.supabaseUrl && envConfig.supabaseServiceRoleKey);
    const defaultProvider: AuthProvider = supabaseConfigured ? 'supabase' : 'local';

    return {
      success: true,
      data: {
        activeProvider: providerConfig?.activeProvider || defaultProvider,
        providers: {
          supabase: providerConfig?.supabaseEnabled ?? supabaseConfigured,
          local: providerConfig?.localEnabled ?? !supabaseConfigured,
          directus: providerConfig?.directusEnabled ?? false,
        },
        features: {
          guestMode: providerConfig?.allowGuestMode ?? true,
          emailVerification: providerConfig?.requireEmailVerification ?? false,
        },
      },
    };
  });

  /**
   * POST /api/v1/auth/register-callback
   * Legacy endpoint - Called after Supabase auth to set up user in our system
   * @deprecated Use /signup instead
   */
  fastify.post<{
    Body: { user_id: string; email: string; display_name?: string };
  }>('/register-callback', async (request, _reply) => {
    const { user_id, email, display_name } = request.body;

    // Check if user already exists
    const { rows: existing } = await fastify.pg.query(
      'SELECT id FROM app_users WHERE id = $1',
      [user_id]
    );

    if (existing.length > 0) {
      return { success: true, data: { message: 'User already registered' } };
    }

    // Create user profile
    await fastify.pg.query(
      `INSERT INTO app_users (id, email, display_name, subscription_tier, created_at, updated_at)
       VALUES ($1, $2, $3, 'free', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [user_id, email, display_name || email.split('@')[0]]
    );

    // Create credits entry
    await fastify.pg.query(
      `INSERT INTO user_credits (user_id, credits_remaining, credits_used_today, subscription_tier, last_reset)
       VALUES ($1, 5, 0, 'free', NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user_id]
    );

    return {
      success: true,
      data: { message: 'User registered successfully' },
    };
  });
}
