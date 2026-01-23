/**
 * @file services/auth/providers/directus.ts
 * @description Directus authentication provider (token verification + optional login/refresh)
 *
 * Primary use-case: allow Directus admin UI extensions to call the API gateway using the
 * Directus access token. We verify the token via Directus `/users/me`, then map the Directus
 * user to an `app_users` record by email.
 */

import crypto from 'crypto';
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
  AuthError,
  AuthErrorCode,
} from '../types.js';

export interface DirectusProviderOptions {
  directusUrl: string;
  pool: Pool;
}

type DirectusLoginResponse = {
  data?: {
    access_token?: string;
    refresh_token?: string;
    expires?: number;
  };
  errors?: unknown;
};

type DirectusUserMeResponse = {
  data?: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar?: string | null;
    date_created?: string;
    date_updated?: string;
  };
  errors?: unknown;
};

/**
 * Directus authentication provider.
 *
 * Notes:
 * - We intentionally keep `signUp` unsupported to avoid exposing Directus CMS user creation.
 * - `verifyToken` is the key method used by the API gateway's auth decorator.
 */
export class DirectusAuthProvider implements IAuthProvider {
  readonly name: AuthProvider = 'directus';
  private directusUrl: string;
  private pool: Pool;

  constructor(options: DirectusProviderOptions) {
    if (!options.directusUrl) {
      throw new Error('Directus URL is required');
    }
    this.directusUrl = options.directusUrl.replace(/\/$/, '');
    this.pool = options.pool;
  }

  private buildUrl(path: string): string {
    const prefix = path.startsWith('/') ? '' : '/';
    return `${this.directusUrl}${prefix}${path}`;
  }

  private formatDisplayName(email: string, first?: string | null, last?: string | null): string {
    const full = [first, last].filter(Boolean).join(' ').trim();
    return full || email.split('@')[0];
  }

  private async ensureAppUserByEmail(params: {
    email: string;
    displayName?: string;
    avatarUrl?: string | null;
  }): Promise<{ id: string; email: string; display_name?: string; avatar_url?: string; created_at: string; updated_at?: string }> {
    const email = params.email.trim().toLowerCase();
    const displayName = params.displayName || email.split('@')[0];

    const existing = await this.pool.query(
      'SELECT id, email, display_name, avatar_url, created_at, updated_at FROM app_users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const newUserId = crypto.randomUUID();
    const insert = await this.pool.query(
      `INSERT INTO app_users (id, email, display_name, avatar_url, subscription_tier, credits_remaining, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'free', 10, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         display_name = COALESCE(EXCLUDED.display_name, app_users.display_name),
         avatar_url = COALESCE(EXCLUDED.avatar_url, app_users.avatar_url),
         updated_at = NOW()
       RETURNING id, email, display_name, avatar_url, created_at, updated_at`,
      [newUserId, email, displayName, params.avatarUrl ?? null]
    );

    return insert.rows[0];
  }

  private mapToAuthUser(row: any): AuthUser {
    const createdAt = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
    const updatedAt = row.updated_at ? new Date(row.updated_at).toISOString() : undefined;

    return {
      id: row.id,
      email: row.email,
      emailVerified: true,
      displayName: row.display_name || undefined,
      avatarUrl: row.avatar_url || undefined,
      createdAt,
      updatedAt,
    };
  }

  async signUp(_data: SignUpData): Promise<AuthSession> {
    throw new AuthError(
      AuthErrorCode.PROVIDER_ERROR,
      'Directus sign-up is not supported via the API gateway',
      501
    );
  }

  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    const response = await fetch(this.buildUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    });

    if (!response.ok) {
      throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    const json = (await response.json().catch(() => ({}))) as DirectusLoginResponse;
    const accessToken = json?.data?.access_token;
    const refreshToken = json?.data?.refresh_token;
    const expires = json?.data?.expires;

    if (!accessToken || !refreshToken || !expires) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Directus login response missing tokens', 502);
    }

    const verification = await this.verifyToken(accessToken);
    if (!verification.valid || !verification.user) {
      throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Failed to verify Directus token after login', 401);
    }

    return {
      user: verification.user,
      accessToken,
      refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + expires,
      tokenType: 'bearer',
      provider: this.name,
    };
  }

  async signOut(accessToken: string): Promise<void> {
    try {
      await fetch(this.buildUrl('/auth/logout'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      // Best-effort
    }
  }

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    const response = await fetch(this.buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken, mode: 'json' }),
    });

    if (!response.ok) {
      throw new AuthError(AuthErrorCode.INVALID_REFRESH_TOKEN, 'Invalid refresh token', 401);
    }

    const json = (await response.json().catch(() => ({}))) as DirectusLoginResponse;
    const accessToken = json?.data?.access_token;
    const newRefreshToken = json?.data?.refresh_token || refreshToken;
    const expires = json?.data?.expires;

    if (!accessToken || !expires) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Directus refresh response missing tokens', 502);
    }

    const verification = await this.verifyToken(accessToken);
    if (!verification.valid || !verification.user) {
      throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Failed to verify Directus token after refresh', 401);
    }

    return {
      user: verification.user,
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + expires,
      tokenType: 'bearer',
      provider: this.name,
    };
  }

  async verifyToken(accessToken: string): Promise<TokenVerificationResult> {
    try {
      const response = await fetch(this.buildUrl('/users/me'), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        return { valid: false, error: 'Invalid token' };
      }

      const json = (await response.json().catch(() => ({}))) as DirectusUserMeResponse;
      const directusUser = json?.data;
      if (!directusUser?.email) {
        return { valid: false, error: 'Invalid token' };
      }

      const appUserRow = await this.ensureAppUserByEmail({
        email: directusUser.email,
        displayName: this.formatDisplayName(directusUser.email, directusUser.first_name, directusUser.last_name),
        avatarUrl: directusUser.avatar,
      });

      return {
        valid: true,
        user: this.mapToAuthUser(appUserRow),
      };
    } catch {
      return { valid: false, error: 'Token verification failed' };
    }
  }

  async getUser(userId: string): Promise<AuthUser | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, email, display_name, avatar_url, created_at, updated_at FROM app_users WHERE id = $1',
        [userId]
      );
      if (result.rows.length === 0) return null;
      return this.mapToAuthUser(result.rows[0]);
    } catch {
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, email, display_name, avatar_url, created_at, updated_at FROM app_users WHERE email = $1',
        [email.trim().toLowerCase()]
      );
      if (result.rows.length === 0) return null;
      return this.mapToAuthUser(result.rows[0]);
    } catch {
      return null;
    }
  }

  async resetPasswordRequest(request: PasswordResetRequest): Promise<void> {
    // Best-effort: only supported when Directus has email configured.
    const response = await fetch(this.buildUrl('/auth/password/request'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: request.email,
        reset_url: request.redirectUrl,
      }),
    });

    if (!response.ok) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Failed to request password reset', 502);
    }
  }

  async resetPassword(update: PasswordUpdate, _userId?: string): Promise<void> {
    if (!update.token) {
      throw new AuthError(
        AuthErrorCode.PROVIDER_ERROR,
        'Directus password reset requires a reset token',
        400
      );
    }

    const response = await fetch(this.buildUrl('/auth/password/reset'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: update.token,
        password: update.newPassword,
      }),
    });

    if (!response.ok) {
      throw new AuthError(AuthErrorCode.PROVIDER_ERROR, 'Failed to reset password', 502);
    }
  }
}

