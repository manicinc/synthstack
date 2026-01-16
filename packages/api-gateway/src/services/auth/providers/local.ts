/**
 * @file services/auth/providers/local.ts
 * @description Local PostgreSQL authentication provider
 * Uses Argon2id for password hashing and JWT for tokens
 */

import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
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
  OAuthProvider,
  AuthError,
  AuthErrorCode,
  JWTPayload,
} from '../types.js';
import type { AuthEmailService } from '../auth-email.service.js';

export interface LocalProviderOptions {
  jwtSecret: string;
  jwtExpiresIn?: string;
  refreshTokenExpiresIn?: string;
  pool: Pool;
  baseUrl?: string;
  maxFailedAttempts?: number;
  lockoutDurationMinutes?: number;
  /** Optional email service for sending auth emails */
  authEmailService?: AuthEmailService;
  /** URL for email verification page */
  verifyEmailUrl?: string;
  /** URL for password reset page */
  resetPasswordUrl?: string;
  /** Require email verification before sign in (default: false) */
  requireEmailVerification?: boolean;
}

/**
 * Local PostgreSQL authentication provider
 */
export class LocalAuthProvider implements IAuthProvider {
  readonly name: AuthProvider = 'local';
  private pool: Pool;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: string;
  private baseUrl: string;
  private maxFailedAttempts: number;
  private lockoutDurationMinutes: number;
  private authEmailService?: AuthEmailService;
  private verifyEmailUrl: string;
  private resetPasswordUrl: string;
  private requireEmailVerification: boolean;

  constructor(options: LocalProviderOptions) {
    if (!options.jwtSecret) {
      throw new Error('JWT secret is required for local auth provider');
    }

    this.pool = options.pool;
    this.jwtSecret = options.jwtSecret;
    this.jwtExpiresIn = options.jwtExpiresIn || '1h';
    this.refreshTokenExpiresIn = options.refreshTokenExpiresIn || '7d';
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.maxFailedAttempts = options.maxFailedAttempts || 5;
    this.lockoutDurationMinutes = options.lockoutDurationMinutes || 30;
    this.authEmailService = options.authEmailService;
    this.verifyEmailUrl = options.verifyEmailUrl || `${this.baseUrl}/auth/verify-email`;
    this.resetPasswordUrl = options.resetPasswordUrl || `${this.baseUrl}/auth/reset-password`;
    this.requireEmailVerification = options.requireEmailVerification ?? false;
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<AuthSession> {
    // Check if user already exists
    const existingUser = await this.pool.query(
      'SELECT id FROM app_users WHERE email = $1',
      [data.email]
    );

    if (existingUser.rows.length > 0) {
      throw new AuthError(
        AuthErrorCode.USER_ALREADY_EXISTS,
        'User with this email already exists',
        409
      );
    }

    // Validate password strength
    this.validatePassword(data.password);

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = this.hashToken(verificationToken);
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create user in app_users
      const userResult = await client.query(
        `INSERT INTO app_users (email, display_name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id, email, display_name, created_at, updated_at`,
        [data.email, data.displayName || data.email.split('@')[0]]
      );

      const user = userResult.rows[0];

      // Create local auth credentials with verification token
      await client.query(
        `INSERT INTO local_auth_credentials (
          user_id, password_hash, email_verified,
          email_verification_token, email_verification_expires,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [user.id, passwordHash, false, verificationTokenHash, verificationExpiresAt]
      );

      await client.query('COMMIT');

      // Send verification email (async, don't block signup)
      if (this.authEmailService?.isConfigured()) {
        this.authEmailService.sendVerificationEmail(
          data.email,
          verificationToken,
          this.verifyEmailUrl
        ).catch(err => {
          console.error('Failed to send verification email:', err);
        });
      } else {
        // Fallback: log token for development
        console.log(`Email verification token for ${data.email}: ${verificationToken}`);
        console.log(`Verify URL: ${this.verifyEmailUrl}?token=${verificationToken}`);
      }

      // Generate tokens
      const session = await this.createSession(user);

      return session;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Sign in with email/password
   */
  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    // Get user and credentials
    const result = await this.pool.query(
      `SELECT
        u.id, u.email, u.display_name, u.avatar_url, u.is_banned,
        u.created_at, u.updated_at,
        c.password_hash, c.email_verified, c.failed_login_attempts, c.locked_until
       FROM app_users u
       JOIN local_auth_credentials c ON c.user_id = u.id
       WHERE u.email = $1`,
      [credentials.email]
    );

    if (result.rows.length === 0) {
      throw new AuthError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        401
      );
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AuthError(
        AuthErrorCode.ACCOUNT_LOCKED,
        `Account is locked. Try again after ${new Date(user.locked_until).toLocaleString()}`,
        403
      );
    }

    // Check if account is banned
    if (user.is_banned) {
      throw new AuthError(
        AuthErrorCode.ACCOUNT_DISABLED,
        'Account has been disabled',
        403
      );
    }

    // Verify password
    const validPassword = await argon2.verify(user.password_hash, credentials.password);

    if (!validPassword) {
      // Increment failed attempts
      await this.handleFailedLogin(user.id, user.failed_login_attempts);

      throw new AuthError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        401
      );
    }

    // Check email verification if required
    if (this.requireEmailVerification && !user.email_verified) {
      throw new AuthError(
        AuthErrorCode.EMAIL_NOT_VERIFIED,
        'Please verify your email address before signing in',
        403
      );
    }

    // Reset failed attempts on successful login
    await this.pool.query(
      `UPDATE local_auth_credentials
       SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
       WHERE user_id = $1`,
      [user.id]
    );

    // Generate session
    return this.createSession({
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  }

  /**
   * Sign out
   */
  async signOut(accessToken: string): Promise<void> {
    // Decode token to get JTI
    try {
      const decoded = jwt.verify(accessToken, this.jwtSecret) as JWTPayload;

      // Invalidate the session by marking it inactive
      await this.pool.query(
        `UPDATE local_auth_sessions
         SET is_active = false, updated_at = NOW()
         WHERE user_id = $1 AND is_active = true`,
        [decoded.sub]
      );
    } catch {
      // Token might already be invalid, that's fine for signout
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(refreshToken: string): Promise<AuthSession> {
    // Hash refresh token to find session
    const tokenHash = this.hashToken(refreshToken);

    const result = await this.pool.query(
      `SELECT s.*, u.email, u.display_name, u.avatar_url, u.is_banned,
              c.email_verified
       FROM local_auth_sessions s
       JOIN app_users u ON u.id = s.user_id
       JOIN local_auth_credentials c ON c.user_id = u.id
       WHERE s.refresh_token_hash = $1 AND s.is_active = true`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new AuthError(
        AuthErrorCode.INVALID_REFRESH_TOKEN,
        'Invalid refresh token',
        401
      );
    }

    const session = result.rows[0];

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      // Clean up expired session
      await this.pool.query(
        'UPDATE local_auth_sessions SET is_active = false WHERE id = $1',
        [session.id]
      );

      throw new AuthError(
        AuthErrorCode.TOKEN_EXPIRED,
        'Refresh token expired',
        401
      );
    }

    // Check if user is banned
    if (session.is_banned) {
      throw new AuthError(
        AuthErrorCode.ACCOUNT_DISABLED,
        'Account has been disabled',
        403
      );
    }

    // Invalidate old session
    await this.pool.query(
      'UPDATE local_auth_sessions SET is_active = false WHERE id = $1',
      [session.id]
    );

    // Create new session
    return this.createSession({
      id: session.user_id,
      email: session.email,
      display_name: session.display_name,
      avatar_url: session.avatar_url,
      email_verified: session.email_verified,
      created_at: session.created_at,
      updated_at: session.updated_at,
    });
  }

  /**
   * Verify access token
   */
  async verifyToken(accessToken: string): Promise<TokenVerificationResult> {
    try {
      const decoded = jwt.verify(accessToken, this.jwtSecret) as JWTPayload;

      // Verify this is a local provider token
      if (decoded.provider !== 'local') {
        return { valid: false, error: 'Token not from local provider' };
      }

      // Get user data
      const user = await this.getUser(decoded.sub);
      if (!user) {
        return { valid: false, error: 'User not found' };
      }

      return {
        valid: true,
        user,
        expiresAt: decoded.exp * 1000,
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired' };
      }
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at, u.updated_at,
              c.email_verified
       FROM app_users u
       LEFT JOIN local_auth_credentials c ON c.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified || false,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at, u.updated_at,
              c.email_verified
       FROM app_users u
       LEFT JOIN local_auth_credentials c ON c.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified || false,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Request password reset
   */
  async resetPasswordRequest(request: PasswordResetRequest): Promise<void> {
    // Check if user exists
    const user = await this.getUserByEmail(request.email);
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await this.pool.query(
      `UPDATE local_auth_credentials
       SET password_reset_token = $1, password_reset_expires = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [tokenHash, expiresAt, user.id]
    );

    // Send password reset email
    const resetUrl = request.redirectUrl || this.resetPasswordUrl;
    if (this.authEmailService?.isConfigured()) {
      await this.authEmailService.sendPasswordResetEmail(
        request.email,
        resetToken,
        resetUrl
      );
    } else {
      // Fallback: log token for development
      console.log(`Password reset token for ${request.email}: ${resetToken}`);
      console.log(`Reset URL: ${resetUrl}?token=${resetToken}`);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(update: PasswordUpdate, userId?: string): Promise<void> {
    // Validate new password
    this.validatePassword(update.newPassword);

    // Hash new password
    const passwordHash = await argon2.hash(update.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    if (update.token) {
      // Password reset flow - verify token
      const tokenHash = this.hashToken(update.token);

      const result = await this.pool.query(
        `SELECT user_id FROM local_auth_credentials
         WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
        [tokenHash]
      );

      if (result.rows.length === 0) {
        throw new AuthError(
          AuthErrorCode.INVALID_TOKEN,
          'Invalid or expired reset token',
          400
        );
      }

      // Update password and clear reset token
      await this.pool.query(
        `UPDATE local_auth_credentials
         SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL,
             failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
         WHERE user_id = $2`,
        [passwordHash, result.rows[0].user_id]
      );

      // Invalidate all sessions
      await this.pool.query(
        'UPDATE local_auth_sessions SET is_active = false WHERE user_id = $1',
        [result.rows[0].user_id]
      );
    } else if (update.currentPassword && userId) {
      // Password change flow - verify current password
      const result = await this.pool.query(
        'SELECT password_hash FROM local_auth_credentials WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new AuthError(
          AuthErrorCode.USER_NOT_FOUND,
          'User not found',
          404
        );
      }

      const validPassword = await argon2.verify(result.rows[0].password_hash, update.currentPassword);
      if (!validPassword) {
        throw new AuthError(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Current password is incorrect',
          401
        );
      }

      // Update password
      await this.pool.query(
        'UPDATE local_auth_credentials SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
        [passwordHash, userId]
      );
    } else {
      throw new AuthError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Token or current password required',
        400
      );
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<AuthUser> {
    const tokenHash = this.hashToken(token);

    const result = await this.pool.query(
      `SELECT user_id FROM local_auth_credentials
       WHERE email_verification_token = $1 AND email_verification_expires > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new AuthError(
        AuthErrorCode.INVALID_TOKEN,
        'Invalid or expired verification token',
        400
      );
    }

    const userId = result.rows[0].user_id;

    // Mark email as verified
    await this.pool.query(
      `UPDATE local_auth_credentials
       SET email_verified = true, email_verification_token = NULL,
           email_verification_expires = NULL, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    const user = await this.getUser(userId);
    if (!user) {
      throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    // Send welcome email (async, don't block verification)
    if (this.authEmailService?.isConfigured()) {
      this.authEmailService.sendWelcomeEmail(
        user.email,
        user.displayName || user.email.split('@')[0]
      ).catch(err => {
        console.error('Failed to send welcome email:', err);
      });
    }

    return user;
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    if (user.emailVerified) {
      throw new AuthError(
        AuthErrorCode.PROVIDER_ERROR,
        'Email is already verified',
        400
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.pool.query(
      `UPDATE local_auth_credentials
       SET email_verification_token = $1, email_verification_expires = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [tokenHash, expiresAt, user.id]
    );

    // Send verification email
    if (this.authEmailService?.isConfigured()) {
      await this.authEmailService.sendVerificationEmail(
        email,
        verificationToken,
        this.verifyEmailUrl
      );
    } else {
      // Fallback: log token for development
      console.log(`Email verification token for ${email}: ${verificationToken}`);
      console.log(`Verify URL: ${this.verifyEmailUrl}?token=${verificationToken}`);
    }
  }

  /**
   * OAuth not supported for local provider
   */
  getOAuthUrl(_provider: OAuthProvider, _redirectUrl: string): string {
    throw new AuthError(
      AuthErrorCode.OAUTH_ERROR,
      'OAuth not supported by local provider',
      400
    );
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: Partial<AuthUser>): Promise<AuthUser> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.displayName !== undefined) {
      updates.push(`display_name = $${paramCount++}`);
      values.push(data.displayName);
    }
    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(data.avatarUrl);
    }

    if (updates.length === 0) {
      const user = await this.getUser(userId);
      if (!user) {
        throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found', 404);
      }
      return user;
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    await this.pool.query(
      `UPDATE app_users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    const user = await this.getUser(userId);
    if (!user) {
      throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }
    return user;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete sessions
      await client.query('DELETE FROM local_auth_sessions WHERE user_id = $1', [userId]);

      // Delete credentials
      await client.query('DELETE FROM local_auth_credentials WHERE user_id = $1', [userId]);

      // Delete user
      await client.query('DELETE FROM app_users WHERE id = $1', [userId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new session with tokens
   */
  private async createSession(user: any): Promise<AuthSession> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    // Parse expiration times
    const accessExpiresIn = this.parseTimespan(this.jwtExpiresIn);
    const refreshExpiresIn = this.parseTimespan(this.refreshTokenExpiresIn);

    // Generate access token
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      provider: 'local',
      iat: now,
      exp: now + accessExpiresIn,
      jti,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret);

    // Generate refresh token
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);

    // Store session
    await this.pool.query(
      `INSERT INTO local_auth_sessions
       (user_id, token_hash, refresh_token_hash, expires_at, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
      [
        user.id,
        this.hashToken(accessToken),
        refreshTokenHash,
        new Date((now + refreshExpiresIn) * 1000),
      ]
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified || false,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      accessToken,
      refreshToken,
      expiresAt: (now + accessExpiresIn) * 1000,
      tokenType: 'Bearer',
      provider: 'local',
    };
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    const newAttempts = currentAttempts + 1;
    const lockUntil = newAttempts >= this.maxFailedAttempts
      ? new Date(Date.now() + this.lockoutDurationMinutes * 60 * 1000)
      : null;

    await this.pool.query(
      `UPDATE local_auth_credentials
       SET failed_login_attempts = $1, locked_until = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [newAttempts, lockUntil, userId]
    );
  }

  /**
   * Hash a token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new AuthError(
        AuthErrorCode.PASSWORD_TOO_WEAK,
        'Password must be at least 8 characters',
        400
      );
    }

    // Check for at least one number and one letter
    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      throw new AuthError(
        AuthErrorCode.PASSWORD_TOO_WEAK,
        'Password must contain at least one letter and one number',
        400
      );
    }
  }

  /**
   * Parse timespan string to seconds
   */
  private parseTimespan(timespan: string): number {
    const match = timespan.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }
}
