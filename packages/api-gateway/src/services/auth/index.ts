/**
 * @file services/auth/index.ts
 * @description Auth service factory and manager
 * Provides unified auth interface with configurable providers
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import {
  IAuthProvider,
  AuthProvider,
  AuthSession,
  AuthUser,
  AuthCredentials,
  SignUpData,
  TokenVerificationResult,
  PasswordResetRequest,
  PasswordUpdate,
  OAuthProvider,
  AuthProviderConfig,
  AuthError,
  AuthErrorCode,
  AuthEvent,
  AuthEventType,
} from './types.js';
import { SupabaseAuthProvider } from './providers/supabase.js';
import { LocalAuthProvider } from './providers/local.js';
import { config } from '../../config/index.js';

/**
 * Auth service singleton
 */
let authService: AuthService | null = null;

/**
 * Auth service class
 * Manages auth providers and provides unified interface
 */
export class AuthService {
  private providers: Map<AuthProvider, IAuthProvider> = new Map();
  private activeProvider: AuthProvider = 'supabase';
  private providerConfig: AuthProviderConfig | null = null;
  private pool: Pool;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.pool = fastify.pg.pool;
  }

  /**
   * Initialize auth service with configured providers
   */
  async initialize(): Promise<void> {
    // Load provider config from database
    await this.loadProviderConfig();

    // Initialize enabled providers
    if (this.providerConfig?.supabaseEnabled) {
      try {
        const supabaseProvider = new SupabaseAuthProvider({
          supabaseUrl: config.supabaseUrl || '',
          supabaseServiceKey: config.supabaseServiceRoleKey || '',
          pool: this.pool,
        });
        this.providers.set('supabase', supabaseProvider);
        this.fastify.log.info('✅ Supabase auth provider initialized');
      } catch (error) {
        this.fastify.log.warn({ error }, '⚠️ Failed to initialize Supabase provider');
      }
    }

    if (this.providerConfig?.localEnabled) {
      try {
        const localProvider = new LocalAuthProvider({
          jwtSecret: config.jwtSecret,
          pool: this.pool,
          baseUrl: config.frontendUrl,
        });
        this.providers.set('local', localProvider);
        this.fastify.log.info('✅ Local PostgreSQL auth provider initialized');
      } catch (error) {
        this.fastify.log.warn({ error }, '⚠️ Failed to initialize Local provider');
      }
    }

    // Set active provider
    if (this.providerConfig?.activeProvider) {
      this.activeProvider = this.providerConfig.activeProvider;
    }

    // Fallback: If no providers configured, use mock/dev mode
    if (this.providers.size === 0) {
      this.fastify.log.warn('⚠️ No auth providers configured - using development mode');
    }

    this.fastify.log.info(`🔐 Active auth provider: ${this.activeProvider}`);
  }

  /**
   * Load provider configuration from database
   */
  private async loadProviderConfig(): Promise<void> {
    try {
      const result = await this.pool.query(`
        SELECT
          active_provider,
          supabase_enabled,
          local_enabled,
          directus_enabled,
          local_require_email_verification,
          local_session_duration_hours,
          local_max_failed_login_attempts,
          local_lockout_duration_minutes
        FROM auth_provider_config
        LIMIT 1
      `);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        this.providerConfig = {
          activeProvider: row.active_provider,
          supabaseEnabled: row.supabase_enabled,
          localEnabled: row.local_enabled,
          directusEnabled: row.directus_enabled,
          // Guest mode is currently treated as always-on (no DB column in default migrations yet)
          allowGuestMode: true,
          requireEmailVerification: row.local_require_email_verification,
          sessionDurationHours: row.local_session_duration_hours,
          maxFailedAttempts: row.local_max_failed_login_attempts,
          lockoutDurationMinutes: row.local_lockout_duration_minutes,
        };
      } else {
        // Default config - auto-detect based on environment
        // If Supabase is not configured, automatically use local PostgreSQL auth
        const supabaseConfigured = Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);

        if (!supabaseConfigured) {
          this.fastify.log.info('📦 Supabase not configured - using local PostgreSQL auth');
        }

        this.providerConfig = {
          activeProvider: supabaseConfigured ? 'supabase' : 'local',
          supabaseEnabled: supabaseConfigured,
          localEnabled: true, // Always enable local as fallback
          directusEnabled: false,
          allowGuestMode: true,
          requireEmailVerification: false,
          sessionDurationHours: 168, // 7 days
          maxFailedAttempts: 5,
          lockoutDurationMinutes: 30,
        };
      }
    } catch (error) {
      // Table might not exist yet, use env-based defaults
      const supabaseConfigured = Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
      this.fastify.log.warn(`Auth config table not found, using ${supabaseConfigured ? 'Supabase' : 'local PostgreSQL'} auth`);
      this.providerConfig = {
        activeProvider: supabaseConfigured ? 'supabase' : 'local',
        supabaseEnabled: supabaseConfigured,
        localEnabled: true,
        directusEnabled: false,
        allowGuestMode: true,
        requireEmailVerification: false,
        sessionDurationHours: 168,
        maxFailedAttempts: 5,
        lockoutDurationMinutes: 30,
      };
    }
  }

  /**
   * Get the currently active provider
   */
  getActiveProvider(): IAuthProvider {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new AuthError(
        AuthErrorCode.PROVIDER_ERROR,
        `Auth provider '${this.activeProvider}' is not available`,
        503
      );
    }
    return provider;
  }

  /**
   * Get a specific provider
   */
  getProvider(name: AuthProvider): IAuthProvider | null {
    return this.providers.get(name) || null;
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(name: AuthProvider): boolean {
    return this.providers.has(name);
  }

  /**
   * Get provider configuration
   */
  getConfig(): AuthProviderConfig | null {
    return this.providerConfig;
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData, provider?: AuthProvider): Promise<AuthSession> {
    const authProvider = provider ? this.getProvider(provider) : this.getActiveProvider();
    if (!authProvider) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Auth provider not available', 503);
    }

    const session = await authProvider.signUp(data);
    await this.logEvent('sign_up', session.user.id, data.email, authProvider.name);
    return session;
  }

  /**
   * Sign in with credentials
   */
  async signIn(credentials: AuthCredentials, provider?: AuthProvider): Promise<AuthSession> {
    const authProvider = provider ? this.getProvider(provider) : this.getActiveProvider();
    if (!authProvider) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Auth provider not available', 503);
    }

    const session = await authProvider.signIn(credentials);
    await this.logEvent('sign_in', session.user.id, credentials.email, authProvider.name);
    return session;
  }

  /**
   * Sign out
   */
  async signOut(accessToken: string, provider?: AuthProvider): Promise<void> {
    const authProvider = provider ? this.getProvider(provider) : this.getActiveProvider();
    if (!authProvider) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Auth provider not available', 503);
    }

    // Get user before signing out for logging
    const verification = await authProvider.verifyToken(accessToken);

    await authProvider.signOut(accessToken);

    if (verification.user) {
      await this.logEvent('sign_out', verification.user.id, verification.user.email, authProvider.name);
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(refreshToken: string, provider?: AuthProvider): Promise<AuthSession> {
    const authProvider = provider ? this.getProvider(provider) : this.getActiveProvider();
    if (!authProvider) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Auth provider not available', 503);
    }

    const session = await authProvider.refreshSession(refreshToken);
    await this.logEvent('token_refresh', session.user.id, session.user.email, authProvider.name);
    return session;
  }

  /**
   * Verify token
   */
  async verifyToken(accessToken: string, provider?: AuthProvider): Promise<TokenVerificationResult> {
    // Try specified provider first
    if (provider) {
      const authProvider = this.getProvider(provider);
      if (authProvider) {
        return authProvider.verifyToken(accessToken);
      }
    }

    // Try all providers to find the matching one
    for (const [, authProvider] of this.providers) {
      try {
        const result = await authProvider.verifyToken(accessToken);
        if (result.valid) {
          return result;
        }
      } catch {
        // Continue to next provider
      }
    }

    return { valid: false, error: 'Invalid token' };
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    // Try all providers
    for (const [, provider] of this.providers) {
      const user = await provider.getUser(userId);
      if (user) {
        return user;
      }
    }
    return null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    // Try all providers
    for (const [, provider] of this.providers) {
      const user = await provider.getUserByEmail(email);
      if (user) {
        return user;
      }
    }
    return null;
  }

  /**
   * Request password reset
   */
  async resetPasswordRequest(request: PasswordResetRequest, provider?: AuthProvider): Promise<void> {
    const authProvider = provider ? this.getProvider(provider) : this.getActiveProvider();
    if (!authProvider) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Auth provider not available', 503);
    }

    await authProvider.resetPasswordRequest(request);
    await this.logEvent('password_reset_request', undefined, request.email, authProvider.name);
  }

  /**
   * Complete password reset
   */
  async resetPassword(update: PasswordUpdate, userId?: string, provider?: AuthProvider): Promise<void> {
    const authProvider = provider ? this.getProvider(provider) : this.getActiveProvider();
    if (!authProvider) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Auth provider not available', 503);
    }

    await authProvider.resetPassword(update, userId);
    await this.logEvent('password_reset_complete', userId, undefined, authProvider.name);
  }

  /**
   * Get OAuth URL
   */
  getOAuthUrl(oauthProvider: OAuthProvider, redirectUrl: string, authProvider?: AuthProvider): string {
    const provider = authProvider ? this.getProvider(authProvider) : this.getActiveProvider();
    if (!provider?.getOAuthUrl) {
      throw new AuthError(AuthErrorCode.OAUTH_ERROR, 'OAuth not supported by this provider', 400);
    }

    return provider.getOAuthUrl(oauthProvider, redirectUrl);
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(
    oauthProvider: OAuthProvider,
    code: string,
    redirectUrl: string,
    authProvider?: AuthProvider
  ): Promise<AuthSession> {
    const provider = authProvider ? this.getProvider(authProvider) : this.getActiveProvider();
    if (!provider?.handleOAuthCallback) {
      throw new AuthError(AuthErrorCode.OAUTH_ERROR, 'OAuth not supported by this provider', 400);
    }

    const session = await provider.handleOAuthCallback(oauthProvider, code, redirectUrl);
    await this.logEvent('sign_in', session.user.id, session.user.email, provider.name, {
      oauth_provider: oauthProvider,
    });
    return session;
  }

  /**
   * Log auth event
   */
  private async logEvent(
    type: AuthEventType,
    userId?: string,
    email?: string,
    provider?: AuthProvider,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO auth_events (type, user_id, email, provider, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [type, userId, email, provider || this.activeProvider, metadata ? JSON.stringify(metadata) : null]
      );
    } catch (error) {
      // Don't fail auth operations if logging fails
      this.fastify.log.warn({ error }, 'Failed to log auth event');
    }
  }

  /**
   * Create Fastify preHandler for authentication
   */
  createAuthMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
        });
      }

      const token = authHeader.substring(7);

      try {
        const result = await this.verifyToken(token);

        if (!result.valid || !result.user) {
          return reply.status(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: result.error || 'Invalid token' },
          });
        }

        // Get full user data from database
        const userResult = await this.pool.query(
          `SELECT id, email, display_name, subscription_tier, is_banned, is_moderator, is_admin
           FROM app_users WHERE id = $1`,
          [result.user.id]
        );

        if (userResult.rows.length === 0) {
          return reply.status(401).send({
            success: false,
            error: { code: 'USER_NOT_FOUND', message: 'User not found' },
          });
        }

        if (userResult.rows[0].is_banned) {
          return reply.status(403).send({
            success: false,
            error: { code: 'ACCOUNT_SUSPENDED', message: 'Account suspended' },
          });
        }

        (request as any).user = userResult.rows[0];
      } catch (error) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication failed' },
        });
      }
    };
  }
}

/**
 * Initialize auth service
 */
export async function initAuthService(fastify: FastifyInstance): Promise<AuthService> {
  if (!authService) {
    authService = new AuthService(fastify);
    await authService.initialize();
  }
  return authService;
}

/**
 * Get auth service instance
 */
export function getAuthService(): AuthService {
  if (!authService) {
    throw new Error('Auth service not initialized. Call initAuthService first.');
  }
  return authService;
}

// Re-export types
export * from './types.js';
