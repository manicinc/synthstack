/**
 * @file services/auth/types.ts
 * @description Auth provider types and interfaces
 * Supports multiple auth backends: Supabase, Local PostgreSQL, Directus
 */

/**
 * Authenticated user data
 */
export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Auth session data
 */
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  tokenType: string;
  provider: AuthProvider;
}

/**
 * Available auth providers
 */
export type AuthProvider = 'supabase' | 'local' | 'directus';

/**
 * OAuth providers for social login
 */
export type OAuthProvider = 'google' | 'github' | 'discord' | 'apple';

/**
 * Auth credentials for sign-in
 */
export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface SignUpData extends AuthCredentials {
  displayName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  valid: boolean;
  user?: AuthUser;
  error?: string;
  expiresAt?: number;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
  redirectUrl?: string;
}

/**
 * Password update
 */
export interface PasswordUpdate {
  token?: string; // Reset token for password reset flow
  currentPassword?: string; // For password change flow
  newPassword: string;
}

/**
 * Auth provider configuration
 */
export interface AuthProviderConfig {
  activeProvider: AuthProvider;
  supabaseEnabled: boolean;
  localEnabled: boolean;
  directusEnabled: boolean;
  allowGuestMode: boolean;
  requireEmailVerification: boolean;
  sessionDurationHours: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

/**
 * JWT payload for local auth
 */
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  provider: AuthProvider;
  iat: number;
  exp: number;
  jti?: string; // Token ID for revocation
}

/**
 * OAuth connection for linking accounts
 */
export interface OAuthConnection {
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt: string;
}

/**
 * Auth event types for logging/webhooks
 */
export type AuthEventType =
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  | 'token_refresh'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'password_change'
  | 'email_verified'
  | 'verification_email_resent'
  | 'account_locked'
  | 'account_unlocked'
  | 'oauth_connect'
  | 'oauth_disconnect';

/**
 * Auth event for logging
 */
export interface AuthEvent {
  type: AuthEventType;
  userId?: string;
  email?: string;
  provider: AuthProvider;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Auth provider interface
 * All auth providers must implement this interface
 */
export interface IAuthProvider {
  /**
   * Provider name
   */
  readonly name: AuthProvider;

  /**
   * Sign up a new user
   */
  signUp(data: SignUpData): Promise<AuthSession>;

  /**
   * Sign in with email/password
   */
  signIn(credentials: AuthCredentials): Promise<AuthSession>;

  /**
   * Sign out and invalidate session
   */
  signOut(accessToken: string): Promise<void>;

  /**
   * Refresh an existing session
   */
  refreshSession(refreshToken: string): Promise<AuthSession>;

  /**
   * Verify an access token
   */
  verifyToken(accessToken: string): Promise<TokenVerificationResult>;

  /**
   * Get user by ID
   */
  getUser(userId: string): Promise<AuthUser | null>;

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Promise<AuthUser | null>;

  /**
   * Request password reset
   */
  resetPasswordRequest(request: PasswordResetRequest): Promise<void>;

  /**
   * Complete password reset or change password
   */
  resetPassword(update: PasswordUpdate, userId?: string): Promise<void>;

  /**
   * Verify email address
   */
  verifyEmail?(token: string): Promise<AuthUser>;

  /**
   * Resend verification email
   */
  resendVerificationEmail?(email: string): Promise<void>;

  /**
   * Get OAuth URL for social login
   */
  getOAuthUrl?(provider: OAuthProvider, redirectUrl: string): string;

  /**
   * Handle OAuth callback
   */
  handleOAuthCallback?(
    provider: OAuthProvider,
    code: string,
    redirectUrl: string
  ): Promise<AuthSession>;

  /**
   * Update user profile
   */
  updateUser?(userId: string, data: Partial<AuthUser>): Promise<AuthUser>;

  /**
   * Delete user account
   */
  deleteUser?(userId: string): Promise<void>;
}

/**
 * Auth service options
 */
export interface AuthServiceOptions {
  jwtSecret: string;
  jwtExpiresIn?: string;
  refreshTokenExpiresIn?: string;
  bcryptRounds?: number;
  baseUrl?: string;
}

/**
 * Rate limit info for auth attempts
 */
export interface AuthRateLimit {
  attempts: number;
  maxAttempts: number;
  lockedUntil?: string;
  remainingAttempts: number;
}

/**
 * Auth error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  RATE_LIMITED = 'RATE_LIMITED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  OAUTH_ERROR = 'OAUTH_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Auth error
 */
export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
