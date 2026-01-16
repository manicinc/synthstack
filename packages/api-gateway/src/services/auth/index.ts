/**
 * @file services/auth/index.ts
 * @description Auth service factory and manager
 * Provides unified auth interface with configurable providers
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import crypto from 'crypto';
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
import {
  createOAuthProviders,
  getConfiguredProviders,
  type OAuthProviderName,
  type IOAuthProvider,
} from './providers/oauth/index.js';
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
  private oauthProviders: Map<OAuthProviderName, IOAuthProvider> = new Map();
  private oauthStates: Map<string, { redirectUrl: string; expiresAt: number }> = new Map();
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
        // Import and initialize auth email service if email is configured
        let authEmailService;
        try {
          const { getEmailService } = await import('../email/mailer.js');
          const { AuthEmailService } = await import('./auth-email.service.js');
          const emailService = getEmailService();
          if (emailService.isConfigured()) {
            authEmailService = new AuthEmailService({ emailService });
            this.fastify.log.info('✅ Auth email service initialized');
          }
        } catch {
          this.fastify.log.warn('⚠️ Email service not available for auth emails');
        }

        const localProvider = new LocalAuthProvider({
          jwtSecret: config.jwtSecret,
          pool: this.pool,
          baseUrl: config.frontendUrl,
          authEmailService,
          requireEmailVerification: this.providerConfig?.requireEmailVerification ?? false,
          maxFailedAttempts: this.providerConfig?.maxFailedAttempts ?? 5,
          lockoutDurationMinutes: this.providerConfig?.lockoutDurationMinutes ?? 30,
        });
        this.providers.set('local', localProvider);
        this.fastify.log.info('✅ Local PostgreSQL auth provider initialized');

        // Initialize OAuth providers for use with local auth
        this.oauthProviders = createOAuthProviders({
          google: config.oauth.google,
          github: config.oauth.github,
          discord: config.oauth.discord,
        });

        const configuredOAuth = getConfiguredProviders(this.oauthProviders);
        if (configuredOAuth.length > 0) {
          this.fastify.log.info(`✅ OAuth providers initialized: ${configuredOAuth.join(', ')}`);
        }
      } catch (error) {
        this.fastify.log.warn({ error }, '⚠️ Failed to initialize Local provider');
      }
    }

    // Set active provider
    if (this.providerConfig?.activeProvider) {
      this.activeProvider = this.providerConfig.activeProvider;
    }

    // Ensure the configured active provider is actually available.
    if (this.providers.size > 0 && !this.providers.has(this.activeProvider)) {
      const fallbackProvider: AuthProvider | undefined = this.providers.has('local')
        ? 'local'
        : Array.from(this.providers.keys())[0];

      if (fallbackProvider) {
        this.fastify.log.warn(
          `⚠️ Active auth provider '${this.activeProvider}' unavailable, falling back to '${fallbackProvider}'`
        );
        this.activeProvider = fallbackProvider;
        if (this.providerConfig) {
          this.providerConfig.activeProvider = fallbackProvider;
        }
      }
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
        const supabaseConfigured = Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);

        if (!supabaseConfigured && row.supabase_enabled) {
          this.fastify.log.warn('⚠️ Supabase is enabled in DB config but not configured in environment; disabling Supabase');
        }

        const supabaseEnabled = Boolean(row.supabase_enabled) && supabaseConfigured;
        const localEnabled = Boolean(row.local_enabled) || !supabaseConfigured;
        const directusEnabled = Boolean(row.directus_enabled);

        const activeProvider: AuthProvider =
          row.active_provider === 'supabase' && !supabaseConfigured
            ? 'local'
            : row.active_provider;

        this.providerConfig = {
          activeProvider,
          supabaseEnabled,
          localEnabled,
          directusEnabled,
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
   * Verify email with token
   */
  async verifyEmail(token: string, provider?: AuthProvider): Promise<AuthUser> {
    const authProvider = provider ? this.getProvider(provider) : this.getActiveProvider();
    if (!authProvider) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Auth provider not available', 503);
    }

    if (!authProvider.verifyEmail) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Email verification not supported by this provider', 400);
    }

    const user = await authProvider.verifyEmail(token);
    await this.logEvent('email_verified', user.id, user.email, authProvider.name);
    return user;
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string, provider?: AuthProvider): Promise<void> {
    const authProvider = provider ? this.getProvider(provider) : this.getActiveProvider();
    if (!authProvider) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Auth provider not available', 503);
    }

    if (!authProvider.resendVerificationEmail) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Email verification not supported by this provider', 400);
    }

    await authProvider.resendVerificationEmail(email);
    await this.logEvent('verification_email_resent', undefined, email, authProvider.name);
  }

  /**
   * Get OAuth URL
   */
  getOAuthUrl(oauthProvider: OAuthProvider, redirectUrl: string, authProvider?: AuthProvider): string {
    // If using local auth with OAuth providers configured, use them directly
    if (this.activeProvider === 'local' && this.oauthProviders.size > 0) {
      const provider = this.oauthProviders.get(oauthProvider as OAuthProviderName);
      if (!provider || !provider.isConfigured()) {
        throw new AuthError(
          AuthErrorCode.OAUTH_ERROR,
          `${oauthProvider} OAuth provider is not configured. Set ${oauthProvider.toUpperCase()}_CLIENT_ID and ${oauthProvider.toUpperCase()}_CLIENT_SECRET environment variables.`,
          400
        );
      }

      // Generate state for CSRF protection
      const state = crypto.randomUUID();
      this.oauthStates.set(state, {
        redirectUrl,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      // Clean up old states
      for (const [key, value] of this.oauthStates) {
        if (value.expiresAt < Date.now()) {
          this.oauthStates.delete(key);
        }
      }

      return provider.getAuthorizationUrl(state, redirectUrl);
    }

    // Fallback to auth provider's OAuth (Supabase)
    const provider = authProvider ? this.getProvider(authProvider) : this.getActiveProvider();
    if (!provider?.getOAuthUrl) {
      throw new AuthError(AuthErrorCode.OAUTH_ERROR, 'OAuth not supported by this provider', 400);
    }

    return provider.getOAuthUrl(oauthProvider, redirectUrl);
  }

  /**
   * Get available OAuth providers
   */
  getAvailableOAuthProviders(): OAuthProviderName[] {
    return getConfiguredProviders(this.oauthProviders);
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(
    oauthProvider: OAuthProvider,
    code: string,
    redirectUrl: string,
    authProvider?: AuthProvider,
    state?: string
  ): Promise<AuthSession> {
    // If using local auth with OAuth providers configured, handle it ourselves
    if (this.activeProvider === 'local' && this.oauthProviders.size > 0) {
      const provider = this.oauthProviders.get(oauthProvider as OAuthProviderName);
      if (!provider || !provider.isConfigured()) {
        throw new AuthError(AuthErrorCode.OAUTH_ERROR, `${oauthProvider} OAuth not configured`, 400);
      }

      // Verify state for CSRF protection (if state was provided)
      if (state) {
        const storedState = this.oauthStates.get(state);
        if (!storedState || storedState.expiresAt < Date.now()) {
          this.oauthStates.delete(state || '');
          throw new AuthError(AuthErrorCode.OAUTH_ERROR, 'Invalid or expired OAuth state', 400);
        }
        this.oauthStates.delete(state);
      }

      // Exchange code for tokens
      const tokens = await provider.exchangeCodeForTokens(code, redirectUrl);

      // Get user info from OAuth provider
      const userInfo = await provider.getUserInfo(tokens.access_token, tokens.id_token);

      if (!userInfo.email) {
        throw new AuthError(AuthErrorCode.OAUTH_ERROR, 'Email not provided by OAuth provider', 400);
      }

      // Find or create user in local database
      const localProvider = this.getProvider('local') as LocalAuthProvider;
      const session = await this.createOrLinkOAuthUser(
        userInfo,
        oauthProvider as OAuthProviderName,
        tokens
      );

      await this.logEvent('sign_in', session.user.id, session.user.email, 'local', {
        oauth_provider: oauthProvider,
      });

      return session;
    }

    // Fallback to auth provider's OAuth (Supabase)
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
   * Create or link OAuth user in local database
   */
  private async createOrLinkOAuthUser(
    userInfo: { id: string; email: string; emailVerified?: boolean; name?: string; avatarUrl?: string },
    oauthProvider: OAuthProviderName,
    tokens: { access_token: string; refresh_token?: string }
  ): Promise<AuthSession> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user exists by email
      const existingUser = await client.query(
        'SELECT id, email, display_name, avatar_url, created_at, updated_at FROM app_users WHERE email = $1',
        [userInfo.email]
      );

      let userId: string;
      let user: any;

      if (existingUser.rows.length > 0) {
        // User exists - link OAuth identity if not already linked
        user = existingUser.rows[0];
        userId = user.id;

        // Update avatar if not set
        if (!user.avatar_url && userInfo.avatarUrl) {
          await client.query(
            'UPDATE app_users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
            [userInfo.avatarUrl, userId]
          );
          user.avatar_url = userInfo.avatarUrl;
        }
      } else {
        // Create new user from OAuth profile
        const result = await client.query(
          `INSERT INTO app_users (email, display_name, avatar_url, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           RETURNING id, email, display_name, avatar_url, created_at, updated_at`,
          [userInfo.email, userInfo.name || userInfo.email.split('@')[0], userInfo.avatarUrl]
        );
        user = result.rows[0];
        userId = user.id;

        // Create local auth credentials entry (no password, OAuth only)
        await client.query(
          `INSERT INTO local_auth_credentials (user_id, password_hash, email_verified, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (user_id) DO UPDATE SET email_verified = $3, updated_at = NOW()`,
          [userId, '', userInfo.emailVerified ?? true] // OAuth users are considered verified
        );
      }

      // Store/update OAuth identity
      await client.query(
        `INSERT INTO oauth_identities (user_id, provider, provider_user_id, access_token, refresh_token, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (user_id, provider) DO UPDATE SET
           provider_user_id = $3,
           access_token = $4,
           refresh_token = $5,
           updated_at = NOW()`,
        [userId, oauthProvider, userInfo.id, tokens.access_token, tokens.refresh_token]
      );

      await client.query('COMMIT');

      // Create session using local provider's method
      const localProvider = this.getProvider('local') as LocalAuthProvider;

      // Generate JWT and session
      const session = await this.createLocalSession(user);
      return session;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create local auth session for OAuth user
   */
  private async createLocalSession(user: any): Promise<AuthSession> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    // Import jwt
    const jwt = await import('jsonwebtoken');

    // Generate access token (1 hour)
    const accessToken = jwt.default.sign(
      {
        sub: user.id,
        email: user.email,
        provider: 'local',
        iat: now,
        exp: now + 3600,
        jti,
      },
      config.jwtSecret
    );

    // Generate refresh token
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Store session
    await this.pool.query(
      `INSERT INTO local_auth_sessions
       (user_id, token_hash, refresh_token_hash, expires_at, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
      [
        user.id,
        crypto.createHash('sha256').update(accessToken).digest('hex'),
        refreshTokenHash,
        new Date((now + 7 * 24 * 3600) * 1000), // 7 days
      ]
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true, // OAuth users are verified
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      accessToken,
      refreshToken,
      expiresAt: (now + 3600) * 1000,
      tokenType: 'Bearer',
      provider: 'local',
    };
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
