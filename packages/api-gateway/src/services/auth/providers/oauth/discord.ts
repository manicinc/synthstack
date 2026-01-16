/**
 * @file providers/oauth/discord.ts
 * @description Discord OAuth provider implementation
 */

import type { IOAuthProvider, OAuthProviderConfig, OAuthTokens, OAuthUserInfo } from './types.js';

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';

const DEFAULT_SCOPES = [
  'identify',
  'email',
];

/**
 * Discord OAuth provider
 */
export class DiscordOAuthProvider implements IOAuthProvider {
  readonly name = 'discord';
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
   * Get Discord OAuth authorization URL
   */
  getAuthorizationUrl(state: string, redirectUri: string, scopes?: string[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: (scopes || DEFAULT_SCOPES).join(' '),
      state,
    });

    return `${DISCORD_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord token exchange failed: ${error}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Discord OAuth error: ${data.error_description || data.error}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      scope: data.scope,
    };
  }

  /**
   * Get user info from Discord
   */
  async getUserInfo(accessToken: string, _idToken?: string): Promise<OAuthUserInfo> {
    const response = await fetch(DISCORD_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord user request failed: ${error}`);
    }

    const data = await response.json();

    // Build avatar URL
    let avatarUrl: string | undefined;
    if (data.avatar) {
      const ext = data.avatar.startsWith('a_') ? 'gif' : 'png';
      avatarUrl = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${ext}`;
    } else if (data.discriminator !== '0') {
      // Legacy discriminator-based default avatar
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(data.discriminator) % 5}.png`;
    } else {
      // New username-based default avatar
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${(BigInt(data.id) >> BigInt(22)) % BigInt(6)}.png`;
    }

    return {
      id: data.id,
      email: data.email || '',
      emailVerified: data.verified || false,
      name: data.global_name || data.username,
      avatarUrl,
      raw: data,
    };
  }
}
