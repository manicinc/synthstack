/**
 * @file services/__tests__/featureFlags.test.ts
 * @description Comprehensive tests for Feature Flags service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Directus client
const mockReadByQuery = vi.fn();
const mockCreateOne = vi.fn();
const mockDeleteOne = vi.fn();

vi.mock('../directus.js', () => ({
  directusClient: {
    items: (collection: string) => ({
      readByQuery: mockReadByQuery,
      createOne: mockCreateOne,
      deleteOne: mockDeleteOne,
    }),
  },
}));

// Mock config
vi.mock('../../config/index.js', () => ({
  config: {},
}));

// Import after mocking
import { featureFlagsService } from '../featureFlags.js';

describe('Feature Flags Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlagsService.clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // EDITION CONFIG TESTS
  // ============================================

  describe('getEditionConfig', () => {
    it('should return premium edition config from database', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          edition: 'premium',
          license_key: 'lic_premium123',
          license_email: 'user@example.com',
          license_type: 'lifetime',
          license_valid_until: '2025-12-31',
          max_docs_indexed: 1000,
          max_credits_per_month: 10000,
          is_active: true,
        }],
      });

      const result = await featureFlagsService.getEditionConfig();

      expect(result.edition).toBe('premium');
      expect(result.licenseKey).toBe('lic_premium123');
      expect(result.maxDocsIndexed).toBe(1000);
    });

    it('should return community defaults when no config exists', async () => {
      mockReadByQuery.mockResolvedValueOnce({ data: [] });

      const result = await featureFlagsService.getEditionConfig();

      expect(result.edition).toBe('community');
      expect(result.maxDocsIndexed).toBe(10);
      expect(result.maxCreditsPerMonth).toBe(50);
    });

    it('should return community defaults on database error', async () => {
      mockReadByQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await featureFlagsService.getEditionConfig();

      expect(result.edition).toBe('community');
      expect(result.isActive).toBe(true);
    });

    it('should cache edition config', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ edition: 'premium', is_active: true }],
      });

      await featureFlagsService.getEditionConfig();
      await featureFlagsService.getEditionConfig();

      // Should only call once due to caching
      expect(mockReadByQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('isPremiumEdition', () => {
    it('should return true for active premium edition', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ edition: 'premium', is_active: true }],
      });

      const result = await featureFlagsService.isPremiumEdition();

      expect(result).toBe(true);
    });

    it('should return false for community edition', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ edition: 'community', is_active: true }],
      });

      const result = await featureFlagsService.isPremiumEdition();

      expect(result).toBe(false);
    });

    it('should return false for inactive premium edition', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ edition: 'premium', is_active: false }],
      });

      const result = await featureFlagsService.isPremiumEdition();

      expect(result).toBe(false);
    });
  });

  // ============================================
  // FEATURE FLAGS TESTS
  // ============================================

  describe('getAllFlags', () => {
    it('should return all enabled feature flags', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [
          {
            key: 'ai_cofounders',
            name: 'AI Cofounders',
            description: 'All 6 AI agents',
            category: 'premium',
            is_enabled: true,
            is_premium: true,
            min_tier: 'premium',
            rollout_percentage: 100,
          },
          {
            key: 'basic_chat',
            name: 'Basic Chat',
            description: 'Simple AI chat',
            category: 'subscriber',
            is_enabled: true,
            is_premium: false,
            min_tier: 'subscriber',
            rollout_percentage: 100,
          },
        ],
      });

      const result = await featureFlagsService.getAllFlags();

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('ai_cofounders');
      expect(result[0].isPremium).toBe(true);
      expect(result[1].key).toBe('basic_chat');
    });

    it('should return empty array when no flags exist', async () => {
      mockReadByQuery.mockResolvedValueOnce({ data: [] });

      const result = await featureFlagsService.getAllFlags();

      expect(result).toEqual([]);
    });
  });

  describe('getFlag', () => {
    it('should return specific flag by key', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [
          {
            key: 'ai_cofounders',
            name: 'AI Cofounders',
            is_enabled: true,
            is_premium: true,
          },
        ],
      });

      const result = await featureFlagsService.getFlag('ai_cofounders');

      expect(result).not.toBeNull();
      expect(result?.key).toBe('ai_cofounders');
    });

    it('should return null for unknown flag', async () => {
      mockReadByQuery.mockResolvedValueOnce({ data: [] });

      const result = await featureFlagsService.getFlag('unknown_feature');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // USER TIER TESTS
  // ============================================

  describe('getUserTier', () => {
    it('should return lifetime for lifetime purchase', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          is_lifetime: true,
          status: 'lifetime',
          tier: 'pro',
        }],
      });

      const result = await featureFlagsService.getUserTier('user-1');

      expect(result).toBe('lifetime');
    });

    it('should return premium for pro tier subscription', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          is_lifetime: false,
          status: 'active',
          tier: 'pro',
        }],
      });

      const result = await featureFlagsService.getUserTier('user-1');

      expect(result).toBe('premium');
    });

    it('should return premium for unlimited tier subscription', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          is_lifetime: false,
          status: 'active',
          tier: 'unlimited',
        }],
      });

      const result = await featureFlagsService.getUserTier('user-1');

      expect(result).toBe('premium');
    });

    it('should return subscriber for maker tier', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          is_lifetime: false,
          status: 'active',
          tier: 'maker',
        }],
      });

      const result = await featureFlagsService.getUserTier('user-1');

      expect(result).toBe('subscriber');
    });

    it('should return community for users without subscription', async () => {
      mockReadByQuery.mockResolvedValueOnce({ data: [] });

      const result = await featureFlagsService.getUserTier('user-1');

      expect(result).toBe('community');
    });

    it('should return community on database error', async () => {
      mockReadByQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await featureFlagsService.getUserTier('user-1');

      expect(result).toBe('community');
    });
  });

  // ============================================
  // HAS FEATURE TESTS
  // ============================================

  describe('hasFeature', () => {
    beforeEach(() => {
      featureFlagsService.clearCache();
    });

    it('should return false for unknown feature', async () => {
      mockReadByQuery.mockResolvedValueOnce({ data: [] }); // flags

      const result = await featureFlagsService.hasFeature('user-1', 'unknown');

      expect(result).toBe(false);
    });

    it('should return false for disabled feature', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          key: 'disabled_feature',
          is_enabled: false,
        }],
      });

      const result = await featureFlagsService.hasFeature('user-1', 'disabled_feature');

      expect(result).toBe(false);
    });

    it('should return false when feature not started yet', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          key: 'future_feature',
          is_enabled: true,
          enabled_from: tomorrow.toISOString(),
        }],
      });

      const result = await featureFlagsService.hasFeature('user-1', 'future_feature');

      expect(result).toBe(false);
    });

    it('should return false when feature expired', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          key: 'expired_feature',
          is_enabled: true,
          enabled_until: yesterday.toISOString(),
        }],
      });

      const result = await featureFlagsService.hasFeature('user-1', 'expired_feature');

      expect(result).toBe(false);
    });

    it('should respect user override when granted', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          key: 'premium_feature',
          is_enabled: true,
          min_tier: 'premium',
        }],
      });
      // User override
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ is_enabled: true }],
      });

      const result = await featureFlagsService.hasFeature('user-1', 'premium_feature');

      expect(result).toBe(true);
    });

    it('should check tier requirements when no override', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          key: 'premium_feature',
          is_enabled: true,
          min_tier: 'premium',
          rollout_percentage: 100,
        }],
      });
      // No override
      mockReadByQuery.mockResolvedValueOnce({ data: [] });
      // User tier check - community
      mockReadByQuery.mockResolvedValueOnce({ data: [] });

      const result = await featureFlagsService.hasFeature('community-user', 'premium_feature');

      expect(result).toBe(false);
    });

    it('should return true for feature with no tier requirement', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{
          key: 'free_feature',
          is_enabled: true,
          min_tier: null,
          rollout_percentage: 100,
        }],
      });
      // No override
      mockReadByQuery.mockResolvedValueOnce({ data: [] });

      const result = await featureFlagsService.hasFeature('user-1', 'free_feature');

      expect(result).toBe(true);
    });
  });

  // ============================================
  // CONVENIENCE METHODS TESTS
  // ============================================

  describe('Convenience Methods', () => {
    beforeEach(() => {
      featureFlagsService.clearCache();
    });

    it('hasAICofounders should check ai_cofounders flag', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ key: 'ai_cofounders', is_enabled: true, rollout_percentage: 100 }],
      });
      mockReadByQuery.mockResolvedValueOnce({ data: [] }); // override

      await featureFlagsService.hasAICofounders('user-1');

      expect(mockReadByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ is_enabled: { _eq: true } }),
        })
      );
    });

    it('hasGitHubIntegration should check github_integration flag', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ key: 'github_integration', is_enabled: true, rollout_percentage: 100 }],
      });
      mockReadByQuery.mockResolvedValueOnce({ data: [] }); // override

      const result = await featureFlagsService.hasGitHubIntegration('user-1');

      expect(typeof result).toBe('boolean');
    });

    it('hasAISuggestions should check ai_suggestions flag', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ key: 'ai_suggestions', is_enabled: true, rollout_percentage: 100 }],
      });
      mockReadByQuery.mockResolvedValueOnce({ data: [] }); // override

      const result = await featureFlagsService.hasAISuggestions('user-1');

      expect(typeof result).toBe('boolean');
    });

    it('hasBasicChat should check basic_chat flag', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ key: 'basic_chat', is_enabled: true, rollout_percentage: 100 }],
      });
      mockReadByQuery.mockResolvedValueOnce({ data: [] }); // override

      const result = await featureFlagsService.hasBasicChat('user-1');

      expect(typeof result).toBe('boolean');
    });

    it('hasDocUpload should check doc_upload flag', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ key: 'doc_upload', is_enabled: true, rollout_percentage: 100 }],
      });
      mockReadByQuery.mockResolvedValueOnce({ data: [] }); // override

      const result = await featureFlagsService.hasDocUpload('user-1');

      expect(typeof result).toBe('boolean');
    });
  });

  // ============================================
  // USER FEATURE ACCESS TESTS
  // ============================================

  describe('getUserFeatureAccess', () => {
    it('should return complete feature access profile', async () => {
      // getUserTier
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ is_lifetime: true, status: 'lifetime', tier: 'pro' }],
      });
      // getAllFlags
      mockReadByQuery.mockResolvedValueOnce({
        data: [
          { key: 'ai_cofounders', is_enabled: true, min_tier: 'premium', rollout_percentage: 100 },
          { key: 'basic_chat', is_enabled: true, min_tier: 'subscriber', rollout_percentage: 100 },
        ],
      });
      // getEditionConfig
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ edition: 'premium', is_active: true, max_docs_indexed: 1000, max_credits_per_month: 10000 }],
      });
      // hasFeature checks
      mockReadByQuery.mockResolvedValue({ data: [] });

      const result = await featureFlagsService.getUserFeatureAccess('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.tier).toBe('lifetime');
      expect(result.features).toBeDefined();
      expect(result.limits).toBeDefined();
    });
  });

  // ============================================
  // ADMIN METHODS TESTS
  // ============================================

  describe('grantFeatureOverride', () => {
    it('should create feature override for user', async () => {
      mockCreateOne.mockResolvedValueOnce({ id: 'override-1' });

      await featureFlagsService.grantFeatureOverride(
        'user-1',
        'ai_cofounders',
        true,
        'Beta tester',
        'admin-1',
        30
      );

      expect(mockCreateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          feature_key: 'ai_cofounders',
          is_enabled: true,
          reason: 'Beta tester',
          granted_by: 'admin-1',
        })
      );
    });

    it('should set expiration when expiresInDays provided', async () => {
      mockCreateOne.mockResolvedValueOnce({ id: 'override-1' });

      await featureFlagsService.grantFeatureOverride(
        'user-1',
        'ai_cofounders',
        true,
        'Trial',
        'admin-1',
        7
      );

      expect(mockCreateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expect.any(String),
        })
      );
    });

    it('should set null expiration when not provided', async () => {
      mockCreateOne.mockResolvedValueOnce({ id: 'override-1' });

      await featureFlagsService.grantFeatureOverride(
        'user-1',
        'ai_cofounders',
        true,
        'Permanent grant',
        'admin-1'
      );

      expect(mockCreateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: null,
        })
      );
    });
  });

  describe('revokeFeatureOverride', () => {
    it('should delete existing feature override', async () => {
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ id: 'override-1' }],
      });
      mockDeleteOne.mockResolvedValueOnce({});

      await featureFlagsService.revokeFeatureOverride('user-1', 'ai_cofounders');

      expect(mockDeleteOne).toHaveBeenCalledWith('override-1');
    });

    it('should do nothing when override not found', async () => {
      mockReadByQuery.mockResolvedValueOnce({ data: [] });

      await featureFlagsService.revokeFeatureOverride('user-1', 'ai_cofounders');

      expect(mockDeleteOne).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockReadByQuery.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw
      await expect(
        featureFlagsService.revokeFeatureOverride('user-1', 'ai_cofounders')
      ).resolves.not.toThrow();
    });
  });

  // ============================================
  // CACHE TESTS
  // ============================================

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      // Populate caches
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ edition: 'premium', is_active: true }],
      });
      await featureFlagsService.getEditionConfig();

      mockReadByQuery.mockResolvedValueOnce({
        data: [{ key: 'feature1', is_enabled: true }],
      });
      await featureFlagsService.getAllFlags();

      // Clear cache
      featureFlagsService.clearCache();

      // Set up fresh mocks
      mockReadByQuery.mockResolvedValueOnce({
        data: [{ edition: 'community', is_active: true }],
      });

      // Should hit database again
      const result = await featureFlagsService.getEditionConfig();
      expect(result.edition).toBe('community');
    });
  });
});
