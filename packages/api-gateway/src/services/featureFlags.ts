/**
 * Feature Flags Service
 *
 * Provides runtime feature flag checking for premium vs community edition.
 *
 * Tier Hierarchy:
 * - community: Free tier (Community edition)
 * - subscriber: $2-4/mo cheap tier with limited credits, doc upload, basic chat
 * - premium: $297 lifetime - all AI Cofounders, GitHub integration, suggestions
 *
 * Premium Features (require lifetime purchase):
 * - ai_cofounders: All 6 AI agents
 * - ai_suggestions: Proactive AI recommendations
 * - github_integration: GitHub PRs, code review
 * - shared_agent_context: Cross-agent knowledge
 * - agent_chain_of_thought: Reasoning traces
 *
 * Subscriber Features ($2-4/mo):
 * - basic_chat: Simple AI chat with limited credits
 * - doc_upload: Upload documents for RAG
 * - doc_chat: Chat with uploaded documents
 */

import { config } from '../config/index.js';
import { directusClient } from './directus.js';

// ============================================
// Types
// ============================================

export type UserTier = 'community' | 'subscriber' | 'premium' | 'lifetime';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string | null;
  category: string;
  isEnabled: boolean;
  isPremium: boolean;
  minTier: UserTier | null;
  rolloutPercentage: number;
  enabledFrom: string | null;
  enabledUntil: string | null;
}

export interface UserFeatureAccess {
  userId: string;
  tier: UserTier;
  features: Record<string, boolean>;
  limits: {
    maxDocsIndexed: number;
    maxCreditsPerMonth: number;
    creditsUsedThisMonth: number;
  };
}

export interface EditionConfig {
  edition: 'community' | 'premium';
  licenseKey: string | null;
  licenseEmail: string | null;
  licenseType: string | null;
  licenseValidUntil: string | null;
  maxDocsIndexed: number;
  maxCreditsPerMonth: number;
  isActive: boolean;
}

// ============================================
// Feature Flags Service
// ============================================

class FeatureFlagsService {
  private flagsCache: Map<string, FeatureFlag> = new Map();
  private flagsCacheTime: number = 0;
  private editionCache: EditionConfig | null = null;
  private editionCacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Tier hierarchy for comparison
  private readonly TIER_ORDER: Record<UserTier, number> = {
    community: 0,
    subscriber: 1,
    premium: 2,
    lifetime: 3, // Lifetime is highest tier
  };

  // ============================================
  // Edition Configuration
  // ============================================

  /**
   * Get current edition configuration
   */
  async getEditionConfig(): Promise<EditionConfig> {
    const now = Date.now();
    if (this.editionCache && now - this.editionCacheTime < this.CACHE_TTL) {
      return this.editionCache;
    }

    try {
      const response = await directusClient.items('edition_config').readByQuery({
        filter: { is_active: { _eq: true } },
        limit: 1,
      });

      if (response.data && response.data.length > 0) {
        const config = response.data[0];
        this.editionCache = {
          edition: config.edition || 'community',
          licenseKey: config.license_key,
          licenseEmail: config.license_email,
          licenseType: config.license_type,
          licenseValidUntil: config.license_valid_until,
          maxDocsIndexed: config.max_docs_indexed || 10,
          maxCreditsPerMonth: config.max_credits_per_month || 50,
          isActive: config.is_active ?? true,
        };
      } else {
        // Default to community edition
        this.editionCache = {
          edition: 'community',
          licenseKey: null,
          licenseEmail: null,
          licenseType: null,
          licenseValidUntil: null,
          maxDocsIndexed: 10,
          maxCreditsPerMonth: 50,
          isActive: true,
        };
      }

      this.editionCacheTime = now;
      return this.editionCache;
    } catch (error) {
      console.error('Error loading edition config:', error);
      // Return community defaults on error
      return {
        edition: 'community',
        licenseKey: null,
        licenseEmail: null,
        licenseType: null,
        licenseValidUntil: null,
        maxDocsIndexed: 10,
        maxCreditsPerMonth: 50,
        isActive: true,
      };
    }
  }

  /**
   * Check if running premium edition
   */
  async isPremiumEdition(): Promise<boolean> {
    const edition = await this.getEditionConfig();
    return edition.edition === 'premium' && edition.isActive;
  }

  // ============================================
  // Feature Flags
  // ============================================

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    await this.refreshFlagsCache();
    return Array.from(this.flagsCache.values());
  }

  /**
   * Get a specific feature flag
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    await this.refreshFlagsCache();
    return this.flagsCache.get(key) || null;
  }

  /**
   * Refresh flags cache from database
   */
  private async refreshFlagsCache(): Promise<void> {
    const now = Date.now();
    if (now - this.flagsCacheTime < this.CACHE_TTL && this.flagsCache.size > 0) {
      return;
    }

    try {
      const response = await directusClient.items('feature_flags').readByQuery({
        filter: { is_enabled: { _eq: true } },
        sort: ['sort_order'],
      });

      this.flagsCache.clear();

      for (const flag of response.data || []) {
        const featureFlag: FeatureFlag = {
          key: flag.key,
          name: flag.name,
          description: flag.description,
          category: flag.category || 'general',
          isEnabled: flag.is_enabled ?? true,
          isPremium: flag.is_premium ?? false,
          minTier: flag.min_tier as UserTier | null,
          rolloutPercentage: flag.rollout_percentage || 100,
          enabledFrom: flag.enabled_from,
          enabledUntil: flag.enabled_until,
        };
        this.flagsCache.set(flag.key, featureFlag);
      }

      this.flagsCacheTime = now;
    } catch (error) {
      console.error('Error loading feature flags:', error);
      // Keep existing cache if refresh fails
    }
  }

  // ============================================
  // User Tier & Access
  // ============================================

  /**
   * Get user's current tier
   */
  async getUserTier(userId: string): Promise<UserTier> {
    try {
      // Check for lifetime purchase first
      const subscriptionResponse = await directusClient.items('user_subscriptions').readByQuery({
        filter: {
          user_id: { _eq: userId },
          status: { _in: ['active', 'lifetime'] },
        },
        limit: 1,
      });

      if (subscriptionResponse.data && subscriptionResponse.data.length > 0) {
        const subscription = subscriptionResponse.data[0];

        // Lifetime purchase = premium tier
        if (subscription.is_lifetime || subscription.status === 'lifetime') {
          return 'lifetime';
        }

        // Map subscription tier to feature tier
        const tier = subscription.tier?.toLowerCase();
        if (tier === 'pro' || tier === 'unlimited') {
          return 'premium';
        }
        if (tier === 'maker' || tier === 'subscriber') {
          return 'subscriber';
        }
      }

      return 'community';
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'community';
    }
  }

  /**
   * Check if user has access to a specific feature
   */
  async hasFeature(userId: string, featureKey: string): Promise<boolean> {
    const flag = await this.getFlag(featureKey);
    if (!flag) {
      return false; // Unknown feature = no access
    }

    if (!flag.isEnabled) {
      return false; // Feature globally disabled
    }

    // Check date restrictions
    const now = new Date();
    if (flag.enabledFrom && new Date(flag.enabledFrom) > now) {
      return false;
    }
    if (flag.enabledUntil && new Date(flag.enabledUntil) < now) {
      return false;
    }

    // Check for user-specific override
    const override = await this.getUserOverride(userId, featureKey);
    if (override !== null) {
      return override;
    }

    // Check tier requirements
    if (flag.minTier) {
      const userTier = await this.getUserTier(userId);
      if (!this.tierMeetsRequirement(userTier, flag.minTier)) {
        return false;
      }
    }

    // Check rollout percentage (using user ID hash for consistency)
    if (flag.rolloutPercentage < 100) {
      const userHash = this.hashUserId(userId);
      if (userHash > flag.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if user tier meets minimum requirement
   */
  private tierMeetsRequirement(userTier: UserTier, requiredTier: UserTier): boolean {
    return this.TIER_ORDER[userTier] >= this.TIER_ORDER[requiredTier];
  }

  /**
   * Get user-specific override for a feature
   */
  private async getUserOverride(userId: string, featureKey: string): Promise<boolean | null> {
    try {
      const response = await directusClient.items('user_feature_overrides').readByQuery({
        filter: {
          user_id: { _eq: userId },
          feature_key: { _eq: featureKey },
          _or: [
            { expires_at: { _null: true } },
            { expires_at: { _gt: new Date().toISOString() } },
          ],
        },
        limit: 1,
      });

      if (response.data && response.data.length > 0) {
        return response.data[0].is_enabled;
      }

      return null; // No override
    } catch {
      return null;
    }
  }

  /**
   * Generate consistent hash from user ID (0-100)
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash % 100);
  }

  // ============================================
  // User Feature Access (Full Profile)
  // ============================================

  /**
   * Get complete feature access for a user
   * Used by frontend to show/hide features
   */
  async getUserFeatureAccess(userId: string): Promise<UserFeatureAccess> {
    const tier = await this.getUserTier(userId);
    const flags = await this.getAllFlags();
    const edition = await this.getEditionConfig();

    const features: Record<string, boolean> = {};

    for (const flag of flags) {
      features[flag.key] = await this.hasFeature(userId, flag.key);
    }

    // Get user's document and credit usage
    const limits = await this.getUserLimits(userId, tier, edition);

    return {
      userId,
      tier,
      features,
      limits,
    };
  }

  /**
   * Get user's current limits and usage
   */
  private async getUserLimits(
    userId: string,
    tier: UserTier,
    edition: EditionConfig
  ): Promise<UserFeatureAccess['limits']> {
    let maxDocsIndexed = edition.maxDocsIndexed;
    let maxCreditsPerMonth = edition.maxCreditsPerMonth;

    // Premium/lifetime users get unlimited
    if (tier === 'premium' || tier === 'lifetime') {
      maxDocsIndexed = Infinity;
      maxCreditsPerMonth = Infinity;
    } else if (tier === 'subscriber') {
      // Subscribers get slightly more than community
      maxDocsIndexed = 25;
      maxCreditsPerMonth = 100;
    }

    // Get actual usage
    let creditsUsedThisMonth = 0;
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usageResponse = await directusClient.items('credit_transactions').readByQuery({
        filter: {
          user_id: { _eq: userId },
          created_at: { _gte: startOfMonth.toISOString() },
          type: { _eq: 'usage' },
        },
        aggregate: { sum: ['amount'] },
      });

      if (usageResponse.data && usageResponse.data[0]) {
        creditsUsedThisMonth = Math.abs(usageResponse.data[0].sum?.amount || 0);
      }
    } catch {
      // Ignore errors - just report 0 usage
    }

    return {
      maxDocsIndexed,
      maxCreditsPerMonth,
      creditsUsedThisMonth,
    };
  }

  // ============================================
  // Premium Feature Checks (Convenience Methods)
  // ============================================

  /**
   * Check if user has access to AI Cofounders
   */
  async hasAICofounders(userId: string): Promise<boolean> {
    return this.hasFeature(userId, 'ai_cofounders');
  }

  /**
   * Check if user has access to GitHub integration
   */
  async hasGitHubIntegration(userId: string): Promise<boolean> {
    return this.hasFeature(userId, 'github_integration');
  }

  /**
   * Check if user has access to AI suggestions
   */
  async hasAISuggestions(userId: string): Promise<boolean> {
    return this.hasFeature(userId, 'ai_suggestions');
  }

  /**
   * Check if user has access to basic chat (subscriber+)
   */
  async hasBasicChat(userId: string): Promise<boolean> {
    return this.hasFeature(userId, 'basic_chat');
  }

  /**
   * Check if user has access to document upload
   */
  async hasDocUpload(userId: string): Promise<boolean> {
    return this.hasFeature(userId, 'doc_upload');
  }

  // ============================================
  // Admin Methods
  // ============================================

  /**
   * Grant feature override to user (for beta testers, trials, etc.)
   */
  async grantFeatureOverride(
    userId: string,
    featureKey: string,
    isEnabled: boolean,
    reason: string,
    grantedBy: string,
    expiresInDays?: number
  ): Promise<void> {
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await directusClient.items('user_feature_overrides').createOne({
      user_id: userId,
      feature_key: featureKey,
      is_enabled: isEnabled,
      reason,
      granted_by: grantedBy,
      expires_at: expiresAt,
    });

    console.log(`Feature override granted: ${featureKey} -> ${isEnabled} for user ${userId}`);
  }

  /**
   * Revoke feature override
   */
  async revokeFeatureOverride(userId: string, featureKey: string): Promise<void> {
    try {
      const response = await directusClient.items('user_feature_overrides').readByQuery({
        filter: {
          user_id: { _eq: userId },
          feature_key: { _eq: featureKey },
        },
        limit: 1,
      });

      if (response.data && response.data.length > 0) {
        await directusClient.items('user_feature_overrides').deleteOne(response.data[0].id);
      }
    } catch (error) {
      console.error('Error revoking feature override:', error);
    }
  }

  /**
   * Clear all caches (for testing or after config changes)
   */
  clearCache(): void {
    this.flagsCache.clear();
    this.flagsCacheTime = 0;
    this.editionCache = null;
    this.editionCacheTime = 0;
  }
}

// Singleton instance
export const featureFlagsService = new FeatureFlagsService();
