/**
 * @file providers/oauth/types.ts
 * @description OAuth provider types and interfaces
 */

/**
 * OAuth tokens returned from provider
 */
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
}

/**
 * User info retrieved from OAuth provider
 */
export interface OAuthUserInfo {
  /** Provider-specific user ID */
  id: string;
  /** User's email address */
  email: string;
  /** Whether email is verified by the provider */
  emailVerified?: boolean;
  /** User's display name */
  name?: string;
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** User's avatar/profile picture URL */
  avatarUrl?: string;
  /** Raw provider response */
  raw?: Record<string, any>;
}

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
  /** OAuth client ID */
  clientId: string;
  /** OAuth client secret */
  clientSecret: string;
  /** Additional provider-specific options */
  options?: Record<string, any>;
}

/**
 * OAuth state for CSRF protection
 */
export interface OAuthState {
  /** Random state value */
  state: string;
  /** Redirect URI after OAuth */
  redirectUri: string;
  /** Original referrer */
  referrer?: string;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * OAuth provider interface
 */
export interface IOAuthProvider {
  /** Provider name (google, github, discord, apple) */
  readonly name: string;

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean;

  /**
   * Get OAuth authorization URL
   * @param state - State parameter for CSRF protection
   * @param redirectUri - Callback URI after OAuth
   * @param scopes - Optional additional scopes
   */
  getAuthorizationUrl(state: string, redirectUri: string, scopes?: string[]): string;

  /**
   * Exchange authorization code for tokens
   * @param code - Authorization code from callback
   * @param redirectUri - Same redirect URI used in authorization
   */
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens>;

  /**
   * Get user info from access token
   * @param accessToken - OAuth access token
   * @param idToken - Optional ID token (Apple)
   */
  getUserInfo(accessToken: string, idToken?: string): Promise<OAuthUserInfo>;
}

/**
 * OAuth callback request
 */
export interface OAuthCallbackRequest {
  /** Authorization code from provider */
  code: string;
  /** State parameter for verification */
  state: string;
  /** Provider name */
  provider: string;
  /** Redirect URI used */
  redirectUri: string;
}

/**
 * OAuth link request (link OAuth to existing account)
 */
export interface OAuthLinkRequest {
  /** User ID to link to */
  userId: string;
  /** OAuth provider name */
  provider: string;
  /** Authorization code */
  code: string;
  /** State parameter */
  state: string;
  /** Redirect URI */
  redirectUri: string;
}
