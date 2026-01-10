/**
 * @file services/auth/providers/supabase.ts
 * @description Supabase authentication provider
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  AuthError,
  AuthErrorCode,
} from '../types.js';

export interface SupabaseProviderOptions {
  supabaseUrl: string;
  supabaseServiceKey: string;
  pool: Pool;
}

/**
 * Supabase authentication provider
 */
export class SupabaseAuthProvider implements IAuthProvider {
  readonly name: AuthProvider = 'supabase';
  private client: SupabaseClient;
  private pool: Pool;

  constructor(options: SupabaseProviderOptions) {
    if (!options.supabaseUrl || !options.supabaseServiceKey) {
      throw new Error('Supabase URL and service key are required');
    }

    this.client = createClient(options.supabaseUrl, options.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    this.pool = options.pool;
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<AuthSession> {
    const { data: authData, error } = await this.client.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          display_name: data.displayName,
          ...data.metadata,
        },
      },
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }

    if (!authData.user || !authData.session) {
      throw new AuthError(
        AuthErrorCode.PROVIDER_ERROR,
        'Failed to create user',
        500
      );
    }

    // Create user in app_users table
    await this.ensureAppUser(authData.user.id, data.email, data.displayName);

    return this.mapToAuthSession(authData.user, authData.session);
  }

  /**
   * Sign in with email/password
   */
  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    const { data: authData, error } = await this.client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }

    if (!authData.user || !authData.session) {
      throw new AuthError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        401
      );
    }

    // Ensure user exists in app_users table
    await this.ensureAppUser(authData.user.id, authData.user.email!);

    return this.mapToAuthSession(authData.user, authData.session);
  }

  /**
   * Sign out
   */
  async signOut(accessToken: string): Promise<void> {
    // Supabase admin API to sign out user
    const { error } = await this.client.auth.admin.signOut(accessToken);
    if (error) {
      // Log but don't throw - signout should succeed even if token is already invalid
      console.warn('Supabase signOut warning:', error.message);
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(refreshToken: string): Promise<AuthSession> {
    const { data: authData, error } = await this.client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }

    if (!authData.user || !authData.session) {
      throw new AuthError(
        AuthErrorCode.INVALID_REFRESH_TOKEN,
        'Invalid refresh token',
        401
      );
    }

    return this.mapToAuthSession(authData.user, authData.session);
  }

  /**
   * Verify access token
   */
  async verifyToken(accessToken: string): Promise<TokenVerificationResult> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser(accessToken);

      if (error || !user) {
        return { valid: false, error: 'Invalid token' };
      }

      return {
        valid: true,
        user: this.mapToAuthUser(user),
      };
    } catch (error) {
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await this.client.auth.admin.getUserById(userId);

      if (error || !user) {
        return null;
      }

      return this.mapToAuthUser(user);
    } catch {
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    // Query our app_users table since Supabase doesn't have direct email lookup
    try {
      const result = await this.pool.query(
        'SELECT id FROM app_users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.getUser(result.rows[0].id);
    } catch {
      return null;
    }
  }

  /**
   * Request password reset
   */
  async resetPasswordRequest(request: PasswordResetRequest): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(request.email, {
      redirectTo: request.redirectUrl,
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(update: PasswordUpdate, _userId?: string): Promise<void> {
    // For Supabase, password reset is handled via access token from reset link
    const { error } = await this.client.auth.updateUser({
      password: update.newPassword,
    });

    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  /**
   * Get OAuth URL
   */
  getOAuthUrl(provider: OAuthProvider, redirectUrl: string): string {
    // signInWithOAuth is synchronous when skipBrowserRedirect is true
    const result = this.client.auth.signInWithOAuth({
      provider: this.mapOAuthProvider(provider),
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    }) as any;

    return result.data?.url || '';
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(
    _provider: OAuthProvider,
    code: string,
    _redirectUrl: string
  ): Promise<AuthSession> {
    const { data: authData, error } = await this.client.auth.exchangeCodeForSession(code);

    if (error) {
      throw this.mapSupabaseError(error);
    }

    if (!authData.user || !authData.session) {
      throw new AuthError(
        AuthErrorCode.OAUTH_ERROR,
        'OAuth authentication failed',
        401
      );
    }

    // Ensure user exists in app_users
    await this.ensureAppUser(
      authData.user.id,
      authData.user.email!,
      authData.user.user_metadata?.full_name || authData.user.user_metadata?.name
    );

    return this.mapToAuthSession(authData.user, authData.session);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: Partial<AuthUser>): Promise<AuthUser> {
    const updateData: any = {};
    if (data.displayName) updateData.data = { display_name: data.displayName };

    const { data: { user }, error } = await this.client.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (error || !user) {
      throw this.mapSupabaseError(error || new Error('Failed to update user'));
    }

    // Update app_users table
    if (data.displayName) {
      await this.pool.query(
        'UPDATE app_users SET display_name = $1, updated_at = NOW() WHERE id = $2',
        [data.displayName, userId]
      );
    }

    return this.mapToAuthUser(user);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    // Delete from app_users first (foreign keys)
    await this.pool.query('DELETE FROM app_users WHERE id = $1', [userId]);

    // Delete from Supabase
    const { error } = await this.client.auth.admin.deleteUser(userId);
    if (error) {
      throw this.mapSupabaseError(error);
    }
  }

  /**
   * Ensure user exists in app_users table
   */
  private async ensureAppUser(userId: string, email: string, displayName?: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO app_users (id, email, display_name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         display_name = COALESCE(EXCLUDED.display_name, app_users.display_name),
         updated_at = NOW()`,
      [userId, email, displayName || email.split('@')[0]]
    );
  }

  /**
   * Map Supabase user to AuthUser
   */
  private mapToAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email!,
      emailVerified: user.email_confirmed_at !== null,
      displayName: user.user_metadata?.display_name || user.user_metadata?.full_name,
      avatarUrl: user.user_metadata?.avatar_url,
      metadata: user.user_metadata,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Map Supabase session to AuthSession
   */
  private mapToAuthSession(user: any, session: any): AuthSession {
    return {
      user: this.mapToAuthUser(user),
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000,
      tokenType: 'Bearer',
      provider: 'supabase',
    };
  }

  /**
   * Map OAuth provider name
   */
  private mapOAuthProvider(provider: OAuthProvider): 'google' | 'github' | 'discord' | 'apple' {
    return provider;
  }

  /**
   * Map Supabase error to AuthError
   */
  private mapSupabaseError(error: any): AuthError {
    const message = error.message || 'Authentication error';

    // Map common Supabase errors
    if (message.includes('Invalid login credentials')) {
      return new AuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }
    if (message.includes('User already registered')) {
      return new AuthError(AuthErrorCode.USER_ALREADY_EXISTS, 'User already exists', 409);
    }
    if (message.includes('Email not confirmed')) {
      return new AuthError(AuthErrorCode.EMAIL_NOT_VERIFIED, 'Email not verified', 403);
    }
    if (message.includes('Token expired')) {
      return new AuthError(AuthErrorCode.TOKEN_EXPIRED, 'Token expired', 401);
    }

    return new AuthError(AuthErrorCode.PROVIDER_ERROR, message, error.status || 500);
  }
}
