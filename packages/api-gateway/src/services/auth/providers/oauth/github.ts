/**
 * @file providers/oauth/github.ts
 * @description GitHub OAuth provider implementation
 */

import type { IOAuthProvider, OAuthProviderConfig, OAuthTokens, OAuthUserInfo } from './types.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

const DEFAULT_SCOPES = [
  'read:user',
  'user:email',
];

/**
 * GitHub OAuth provider
 */
export class GitHubOAuthProvider implements IOAuthProvider {
  readonly name = 'github';
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
   * Get GitHub OAuth authorization URL
   */
  getAuthorizationUrl(state: string, redirectUri: string, scopes?: string[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: (scopes || DEFAULT_SCOPES).join(' '),
      state,
      allow_signup: 'true',
    });

    return `${GITHUB_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub token exchange failed: ${error}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      scope: data.scope,
    };
  }

  /**
   * Get user info from GitHub
   */
  async getUserInfo(accessToken: string, _idToken?: string): Promise<OAuthUserInfo> {
    // Get user profile
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      const error = await userResponse.text();
      throw new Error(`GitHub user request failed: ${error}`);
    }

    const userData = await userResponse.json();

    // Get user emails (email might not be public)
    let email = userData.email;
    let emailVerified = false;

    if (!email) {
      const emailsResponse = await fetch(GITHUB_EMAILS_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        // Find primary verified email
        const primaryEmail = emails.find((e: any) => e.primary && e.verified);
        if (primaryEmail) {
          email = primaryEmail.email;
          emailVerified = primaryEmail.verified;
        } else {
          // Fall back to any verified email
          const verifiedEmail = emails.find((e: any) => e.verified);
          if (verifiedEmail) {
            email = verifiedEmail.email;
            emailVerified = verifiedEmail.verified;
          }
        }
      }
    }

    // Parse name parts
    let firstName: string | undefined;
    let lastName: string | undefined;
    if (userData.name) {
      const nameParts = userData.name.split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ') || undefined;
    }

    return {
      id: String(userData.id),
      email: email || '',
      emailVerified,
      name: userData.name || userData.login,
      firstName,
      lastName,
      avatarUrl: userData.avatar_url,
      raw: userData,
    };
  }
}
