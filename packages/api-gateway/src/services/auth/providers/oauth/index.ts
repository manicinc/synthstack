/**
 * @file providers/oauth/index.ts
 * @description OAuth providers barrel export
 */

export * from './types.js';
export { GoogleOAuthProvider } from './google.js';
export { GitHubOAuthProvider } from './github.js';
export { DiscordOAuthProvider } from './discord.js';
export { AppleOAuthProvider } from './apple.js';

import type { IOAuthProvider, OAuthProviderConfig } from './types.js';
import { GoogleOAuthProvider } from './google.js';
import { GitHubOAuthProvider } from './github.js';
import { DiscordOAuthProvider } from './discord.js';
import { AppleOAuthProvider } from './apple.js';

export type OAuthProviderName = 'google' | 'github' | 'discord' | 'apple';

export interface OAuthProvidersConfig {
  google?: OAuthProviderConfig;
  github?: OAuthProviderConfig;
  discord?: OAuthProviderConfig;
  apple?: OAuthProviderConfig & {
    options?: {
      teamId?: string;
      keyId?: string;
      privateKey?: string;
    };
  };
}

/**
 * Create OAuth providers from configuration
 */
export function createOAuthProviders(config: OAuthProvidersConfig): Map<OAuthProviderName, IOAuthProvider> {
  const providers = new Map<OAuthProviderName, IOAuthProvider>();

  if (config.google?.clientId && config.google?.clientSecret) {
    providers.set('google', new GoogleOAuthProvider(config.google));
  }

  if (config.github?.clientId && config.github?.clientSecret) {
    providers.set('github', new GitHubOAuthProvider(config.github));
  }

  if (config.discord?.clientId && config.discord?.clientSecret) {
    providers.set('discord', new DiscordOAuthProvider(config.discord));
  }

  if (config.apple?.clientId && config.apple?.options?.teamId &&
      config.apple?.options?.keyId && config.apple?.options?.privateKey) {
    providers.set('apple', new AppleOAuthProvider(config.apple));
  }

  return providers;
}

/**
 * Get list of configured OAuth providers
 */
export function getConfiguredProviders(providers: Map<OAuthProviderName, IOAuthProvider>): OAuthProviderName[] {
  return Array.from(providers.entries())
    .filter(([_, provider]) => provider.isConfigured())
    .map(([name]) => name);
}
