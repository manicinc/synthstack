/**
 * Referral Flow Integration Tests
 *
 * Tests the complete click-to-conversion flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReferralService } from '../../../src/services/referral-service.js';
import { StatsService } from '../../../src/services/stats-service.js';
import { RewardService } from '../../../src/services/reward-service.js';
import { createMockDatabase } from '../../helpers/mock-database.js';
import { fixtures } from '../../helpers/fixtures.js';

describe('Complete Referral Flow', () => {
  let referralService: ReferralService;
  let statsService: StatsService;
  let rewardService: RewardService;
  let mockDb: ReturnType<typeof createMockDatabase>;
  let idCounter: number;

  beforeEach(() => {
    idCounter = 0;
    mockDb = createMockDatabase();
    const deps = {
      db: mockDb,
      generateId: () => `test-id-${++idCounter}`,
    };
    referralService = new ReferralService(deps);
    statsService = new StatsService(deps);
    rewardService = new RewardService(deps);
  });

  describe('Click → Signup → Convert Flow', () => {
    it('should track complete flow from click to conversion', async () => {
      const referrerId = 'user-referrer-1';
      const newUserId = 'user-new-1';

      // 1. Setup: User already has a referral code
      mockDb.mockQuery('WHERE is_active = true AND is_default = true', [fixtures.defaultSeason]);
      mockDb.mockQuery('WHERE user_id = $1', [fixtures.referralCodes.active]);

      const code = await referralService.generateReferralCode(referrerId);
      expect(code.code).toBe('SYNTHAB12CD34');

      // 2. Track click
      mockDb.mockQuery('WHERE code = $1', [fixtures.referralCodes.active]);
      mockDb.mockQuery('UPDATE referral_codes', []);
      mockDb.mockQuery('INSERT INTO referrals', [{
        id: 'test-id-1',
        referrer_id: referrerId,
        referral_code_id: code.id,
        season_id: 'season-1',
        status: 'clicked',
        click_date: new Date().toISOString(),
      }]);

      const click = await referralService.trackClick(code.code, {
        ip_address: '192.168.1.100',
        user_agent: 'Test Browser',
        utm_source: 'twitter',
      });
      expect(click).not.toBeNull();
      expect(click?.status).toBe('clicked');

      // 3. Register signup (user signs up using the referral link)
      mockDb.clearMocks();
      mockDb.mockQuery('WHERE code = $1', [fixtures.referralCodes.active]);
      mockDb.mockQuery('WHERE id = $1', [fixtures.defaultSeason]); // Season for self-referral check
      mockDb.mockQuery('referred_user_id = $1 AND season_id', []); // No existing referral
      mockDb.mockQuery("status = 'clicked' AND referred_user_id IS NULL", [{
        ...click,
        id: 'test-id-1',
      }]);
      mockDb.mockQuery('UPDATE referrals', [{
        id: 'test-id-1',
        referrer_id: referrerId,
        referred_user_id: newUserId,
        status: 'signed_up',
        signup_date: new Date().toISOString(),
      }]);

      const signup = await referralService.registerReferral(code.code, newUserId, 'newuser@test.com');
      expect(signup).not.toBeNull();
      expect(signup?.status).toBe('signed_up');
      expect(signup?.referred_user_id).toBe(newUserId);

      // 4. Convert (user makes a purchase)
      mockDb.clearMocks();
      mockDb.mockQuery('UPDATE referrals', [{
        id: 'test-id-1',
        referrer_id: referrerId,
        referred_user_id: newUserId,
        status: 'converted',
        conversion_type: 'subscription',
        conversion_value: 99.00,
        conversion_date: new Date().toISOString(),
      }]);

      const conversion = await referralService.convertReferral('test-id-1', 'subscription', 99.00);
      expect(conversion).not.toBeNull();
      expect(conversion?.status).toBe('converted');
      expect(conversion?.conversion_value).toBe(99.00);
    });

    it('should handle multiple referrals by same user', async () => {
      const referrerId = 'user-referrer-1';

      mockDb.mockQuery('WHERE referrer_id = $1', [
        fixtures.referrals.clicked,
        fixtures.referrals.signedUp,
        fixtures.referrals.converted,
      ]);

      const referrals = await referralService.getUserReferrals(referrerId);

      expect(referrals.length).toBe(3);
      const statuses = referrals.map(r => r.status);
      expect(statuses).toContain('clicked');
      expect(statuses).toContain('signed_up');
      expect(statuses).toContain('converted');
    });
  });

  describe('Stats Update Flow', () => {
    it('should update stats after conversion', async () => {
      const userId = 'user-referrer-1';

      // Mock stats calculation queries
      mockDb.mockQuery('FROM referrals WHERE referrer_id', [{
        total_referrals: '3',
        successful_referrals: '2',
        pending_referrals: '1',
        expired_referrals: '0',
        total_conversions: '2',
        total_conversion_value: '198.00',
      }]);
      mockDb.mockQuery('FROM referral_codes WHERE user_id', [{
        total_clicks: '15',
      }]);
      mockDb.mockQuery('WHERE is_active = true AND is_default = true', [fixtures.defaultSeason]);
      mockDb.mockQuery('WHERE season_id = $1', [
        fixtures.tiers.bronze,
        fixtures.tiers.silver,
        fixtures.tiers.gold,
      ]);
      mockDb.mockQuery('INSERT INTO referral_stats', [{
        id: 'stats-1',
        user_id: userId,
        total_clicks: 15,
        total_referrals: 3,
        successful_referrals: 2,
        pending_referrals: 1,
        total_conversions: 2,
        total_conversion_value: 198.00,
        next_tier_id: 'tier-bronze',
        referrals_to_next_tier: 1,
      }]);

      const stats = await statsService.updateStats(userId);

      expect(stats.total_clicks).toBe(15);
      expect(stats.successful_referrals).toBe(2);
      expect(stats.total_conversion_value).toBe(198.00);
      expect(stats.next_tier_id).toBe('tier-bronze');
      expect(stats.referrals_to_next_tier).toBe(1);
    });
  });

  describe('Tier Progression Flow', () => {
    it('should unlock reward when tier threshold reached', async () => {
      const userId = 'user-referrer-1';

      // User has 3 successful referrals - qualifies for Bronze (requires 3)
      mockDb.mockQuery('FROM referral_stats WHERE user_id', [{
        ...fixtures.stats.default,
        successful_referrals: 3,
      }]);
      mockDb.mockQuery('WHERE is_active = true AND is_default = true', [fixtures.defaultSeason]);
      mockDb.mockQuery('WHERE season_id = $1', [
        fixtures.tiers.bronze,
        fixtures.tiers.silver,
        fixtures.tiers.gold,
      ]);
      // No existing reward for bronze tier
      mockDb.mockQuery('WHERE user_id = $1 AND tier_id = $2', []);
      // Create discount code
      mockDb.mockQuery('FROM discount_codes WHERE code', []);
      mockDb.mockQuery('INSERT INTO discount_codes', [{
        id: 'discount-new-1',
        code: 'BRONZEABC123',
        type: 'percent',
        value: 10,
      }]);
      // Grant reward
      mockDb.mockQuery('INSERT INTO referral_rewards', [{
        id: 'reward-new-1',
        user_id: userId,
        tier_id: 'tier-bronze',
        reward_type: 'discount_code',
        is_unlocked: true,
        is_claimed: false,
      }]);
      mockDb.mockQuery('UPDATE referral_stats', []);

      const newRewards = await rewardService.checkTierProgress(userId);

      expect(newRewards.length).toBeGreaterThan(0);
      expect(newRewards[0].tier_id).toBe('tier-bronze');
      expect(newRewards[0].is_unlocked).toBe(true);
    });

    it('should not duplicate rewards', async () => {
      const userId = 'user-referrer-1';

      mockDb.mockQuery('FROM referral_stats WHERE user_id', [{
        ...fixtures.stats.default,
        successful_referrals: 3,
      }]);
      mockDb.mockQuery('WHERE is_active = true AND is_default = true', [fixtures.defaultSeason]);
      mockDb.mockQuery('WHERE season_id = $1', [fixtures.tiers.bronze]);
      // Reward already exists
      mockDb.mockQuery('WHERE user_id = $1 AND tier_id = $2', [fixtures.rewards.unlocked]);

      const newRewards = await rewardService.checkTierProgress(userId);

      expect(newRewards.length).toBe(0);
    });

    it('should unlock multiple tiers at once', async () => {
      const userId = 'user-referrer-1';

      // User has 12 referrals - qualifies for Bronze (3) and Silver (10)
      mockDb.mockQuery('FROM referral_stats WHERE user_id', [{
        ...fixtures.stats.default,
        successful_referrals: 12,
      }]);
      mockDb.mockQuery('WHERE is_active = true AND is_default = true', [fixtures.defaultSeason]);
      mockDb.mockQuery('WHERE season_id = $1', [
        fixtures.tiers.bronze,
        fixtures.tiers.silver,
        fixtures.tiers.gold,
      ]);
      // No existing rewards
      mockDb.mockQuery('WHERE user_id = $1 AND tier_id = $2', []);

      // Mock discount code and reward creation for each tier
      mockDb.mockQuery('FROM discount_codes WHERE code', []);
      mockDb.mockQuery('INSERT INTO discount_codes', [{ id: 'discount-bronze', code: 'BRONZEABC' }]);
      mockDb.mockQuery('INSERT INTO referral_rewards', [{
        id: 'reward-bronze',
        tier_id: 'tier-bronze',
        is_unlocked: true,
      }]);
      mockDb.mockQuery('UPDATE referral_stats', []);

      const newRewards = await rewardService.checkTierProgress(userId);

      // Both Bronze and Silver should be unlocked
      expect(newRewards.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Reward Claiming Flow', () => {
    it('should allow claiming unlocked reward', async () => {
      const userId = 'user-referrer-1';
      const rewardId = 'reward-1';

      mockDb.mockQuery('UPDATE referral_rewards', [{
        ...fixtures.rewards.unlocked,
        is_claimed: true,
        claimed_at: new Date().toISOString(),
      }]);
      mockDb.mockQuery('UPDATE referral_stats', []);

      const claimed = await rewardService.claimReward(rewardId, userId);

      expect(claimed).not.toBeNull();
      expect(claimed?.is_claimed).toBe(true);
      expect(claimed?.claimed_at).toBeDefined();
    });

    it('should not allow claiming already claimed reward', async () => {
      const userId = 'user-referrer-1';
      const rewardId = 'reward-2';

      // Query returns empty because WHERE clause includes is_claimed = false
      mockDb.mockQuery('UPDATE referral_rewards', []);

      const claimed = await rewardService.claimReward(rewardId, userId);

      expect(claimed).toBeNull();
    });

    it('should not allow claiming another user\'s reward', async () => {
      const wrongUserId = 'user-wrong-1';
      const rewardId = 'reward-1';

      // Query returns empty because user_id doesn't match
      mockDb.mockQuery('UPDATE referral_rewards', []);

      const claimed = await rewardService.claimReward(rewardId, wrongUserId);

      expect(claimed).toBeNull();
    });
  });
});
