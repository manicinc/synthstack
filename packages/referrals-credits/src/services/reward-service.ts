/**
 * Reward Service
 *
 * Handles tier progression and reward claiming
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseAdapter, ServiceDependencies } from '../types/database.js';
import type { ReferralReward, ReferralTier } from '../types/referral.js';
import { ReferralService } from './referral-service.js';
import { StatsService } from './stats-service.js';
import { DiscountService } from './discount-service.js';

export class RewardService {
  private db: DatabaseAdapter;
  private generateId: () => string;
  private referralService: ReferralService;
  private statsService: StatsService;
  private discountService: DiscountService;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.generateId = deps.generateId || uuidv4;
    this.referralService = new ReferralService(deps);
    this.statsService = new StatsService(deps);
    this.discountService = new DiscountService(deps);
  }

  /**
   * Check tier progress and grant any newly qualified rewards
   */
  async checkTierProgress(userId: string): Promise<ReferralReward[]> {
    const stats = await this.statsService.getStats(userId);
    if (!stats) return [];

    const season = await this.referralService.getDefaultSeason();
    if (!season) return [];

    const tiers = await this.referralService.getTiersBySeason(season.id);
    const newRewards: ReferralReward[] = [];

    for (const tier of tiers) {
      if (stats.successful_referrals >= tier.referrals_required) {
        // Check if reward already granted
        const existing = await this.db.query<ReferralReward>(
          `SELECT * FROM referral_rewards WHERE user_id = $1 AND tier_id = $2`,
          [userId, tier.id]
        );

        if (existing.rows.length === 0) {
          const reward = await this.grantReward(userId, tier);
          if (reward) newRewards.push(reward);
        }
      }
    }

    return newRewards;
  }

  /**
   * Grant a reward to a user for achieving a tier
   */
  async grantReward(userId: string, tier: ReferralTier): Promise<ReferralReward | null> {
    const id = this.generateId();
    let discountCodeId: string | null = null;

    // Generate discount code if reward type is discount_code
    if (tier.reward_type === 'discount_code') {
      const discountCode = await this.discountService.generateDiscountCodeFromReward(
        tier.reward_value,
        id
      );
      discountCodeId = discountCode?.id || null;
    }

    const result = await this.db.query<ReferralReward>(
      `
      INSERT INTO referral_rewards (id, user_id, tier_id, season_id, reward_type, reward_data, discount_code_id, is_unlocked)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `,
      [
        id,
        userId,
        tier.id,
        tier.season_id,
        tier.reward_type,
        JSON.stringify(tier.reward_value),
        discountCodeId,
      ]
    );

    // Update stats
    await this.db.query(
      `
      UPDATE referral_stats SET total_rewards_earned = total_rewards_earned + 1, current_tier_id = $1
      WHERE user_id = $2
    `,
      [tier.id, userId]
    );

    return result.rows[0];
  }

  /**
   * Get all rewards for a user
   */
  async getUserRewards(userId: string): Promise<ReferralReward[]> {
    const result = await this.db.query<ReferralReward>(
      `
      SELECT r.*, t.name as tier_name, t.badge_icon, t.badge_color, d.code as discount_code
      FROM referral_rewards r
      LEFT JOIN referral_tiers t ON r.tier_id = t.id
      LEFT JOIN discount_codes d ON r.discount_code_id = d.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `,
      [userId]
    );
    return result.rows;
  }

  /**
   * Claim a reward
   */
  async claimReward(rewardId: string, userId: string): Promise<ReferralReward | null> {
    const result = await this.db.query<ReferralReward>(
      `
      UPDATE referral_rewards
      SET is_claimed = true, claimed_at = NOW()
      WHERE id = $1 AND user_id = $2 AND is_unlocked = true AND is_claimed = false
      RETURNING *
    `,
      [rewardId, userId]
    );

    if (result.rows.length > 0) {
      await this.db.query(
        `
        UPDATE referral_stats SET total_rewards_claimed = total_rewards_claimed + 1
        WHERE user_id = $1
      `,
        [userId]
      );
    }

    return result.rows[0] || null;
  }

  /**
   * Get a specific reward by ID
   */
  async getRewardById(rewardId: string): Promise<ReferralReward | null> {
    const result = await this.db.query<ReferralReward>(
      `SELECT * FROM referral_rewards WHERE id = $1`,
      [rewardId]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if user has a specific tier's reward
   */
  async hasRewardForTier(userId: string, tierId: string): Promise<boolean> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM referral_rewards WHERE user_id = $1 AND tier_id = $2`,
      [userId, tierId]
    );
    return parseInt(result.rows[0].count) > 0;
  }
}
