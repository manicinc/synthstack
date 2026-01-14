/**
 * @file providers/oauth/apple.ts
 * @description Apple Sign In OAuth provider implementation
 */

import jwt from 'jsonwebtoken';
import type { IOAuthProvider, OAuthProviderConfig, OAuthTokens, OAuthUserInfo } from './types.js';

const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

const DEFAULT_SCOPES = [
  'name',
  'email',
];

interface AppleConfig extends OAuthProviderConfig {
  options?: {
    /** Apple Team ID */
    teamId?: string;
    /** Apple Key ID */
    keyId?: string;
    /** Apple private key (PEM format) */
    privateKey?: string;
  };
}

/**
 * Apple Sign In OAuth provider
 */
export class AppleOAuthProvider implements IOAuthProvider {
  readonly name = 'apple';
  private clientId: string;
  private clientSecret: string;
  private teamId: string;
  private keyId: string;
  private privateKey: string;

  constructor(config: AppleConfig) {
    this.clientId = config.clientId;
    // For Apple, clientSecret is generated dynamically
    this.clientSecret = '';
    this.teamId = config.options?.teamId || '';
    this.keyId = config.options?.keyId || '';
    this.privateKey = config.options?.privateKey || '';
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return Boolean(this.clientId && this.teamId && this.keyId && this.privateKey);
  }

  /**
   * Generate Apple client secret (JWT)
   * Apple requires a JWT signed with your private key as the client secret
   */
  private generateClientSecret(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.teamId,
      iat: now,
      exp: now + 86400 * 180, // 180 days max
      aud: 'https://appleid.apple.com',
      sub: this.clientId,
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'ES256',
      keyid: this.keyId,
    });
  }

  /**
   * Get Apple Sign In authorization URL
   */
  getAuthorizationUrl(state: string, redirectUri: string, scopes?: string[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      response_mode: 'form_post', // Apple requires form_post for web
      scope: (scopes || DEFAULT_SCOPES).join(' '),
      state,
    });

    return `${APPLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const clientSecret = this.generateClientSecret();

    const response = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Apple token exchange failed: ${error}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Apple OAuth error: ${data.error_description || data.error}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      id_token: data.id_token,
    };
  }

  /**
   * Get user info from Apple
   * Apple provides user info in the id_token, not a separate API call
   */
  async getUserInfo(accessToken: string, idToken?: string): Promise<OAuthUserInfo> {
    if (!idToken) {
      throw new Error('Apple requires id_token for user info');
    }

    // Decode the id_token (Apple includes user info in the JWT)
    // In production, you should verify the JWT signature with Apple's public keys
    const decoded = jwt.decode(idToken) as any;

    if (!decoded) {
      throw new Error('Failed to decode Apple id_token');
    }

    return {
      id: decoded.sub,
      email: decoded.email || '',
      emailVerified: decoded.email_verified === 'true' || decoded.email_verified === true,
      // Note: Apple only provides name on first sign in
      // It's sent in the POST body, not in the id_token
      raw: decoded,
    };
  }

  /**
   * Parse Apple's user data from the authorization response
   * Apple sends user name only on first authorization in the POST body
   */
  static parseUserData(userData?: string): { firstName?: string; lastName?: string } {
    if (!userData) return {};

    try {
      const parsed = JSON.parse(userData);
      return {
        firstName: parsed.name?.firstName,
        lastName: parsed.name?.lastName,
      };
    } catch {
      return {};
    }
  }
}
