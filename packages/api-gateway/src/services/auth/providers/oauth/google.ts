/**
 * @file providers/oauth/google.ts
 * @description Google OAuth provider implementation
 */

import type { IOAuthProvider, OAuthProviderConfig, OAuthTokens, OAuthUserInfo } from './types.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const DEFAULT_SCOPES = [
  'openid',
  'email',
  'profile',
];

/**
 * Google OAuth provider
 */
export class GoogleOAuthProvider implements IOAuthProvider {
  readonly name = 'google';
  private clientId: string;
  private clientSecret: string;

  constructor(config: OAuthProviderConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Get Google OAuth authorization URL
   */
  getAuthorizationUrl(state: string, redirectUri: string, scopes?: string[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: (scopes || DEFAULT_SCOPES).join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      scope: data.scope,
      id_token: data.id_token,
    };
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string, _idToken?: string): Promise<OAuthUserInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google userinfo request failed: ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      emailVerified: data.verified_email,
      name: data.name,
      firstName: data.given_name,
      lastName: data.family_name,
      avatarUrl: data.picture,
      raw: data,
    };
  }
}
