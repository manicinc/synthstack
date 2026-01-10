/**
 * Stats Service
 *
 * Handles referral statistics and leaderboard calculations
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseAdapter, ServiceDependencies } from '../types/database.js';
import type { ReferralStats } from '../types/referral.js';
import { ReferralService } from './referral-service.js';

interface StatsRow {
  total_referrals: string;
  successful_referrals: string;
  pending_referrals: string;
  expired_referrals: string;
  total_conversions: string;
  total_conversion_value: string;
}

interface ClicksRow {
  total_clicks: string;
}

export class StatsService {
  private db: DatabaseAdapter;
  private generateId: () => string;
  private referralService: ReferralService;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.generateId = deps.generateId || uuidv4;
    this.referralService = new ReferralService(deps);
  }

  /**
   * Get stats for a user
   */
  async getStats(userId: string): Promise<ReferralStats | null> {
    const result = await this.db.query<ReferralStats>(
      `SELECT * FROM referral_stats WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update stats for a user (recalculates from source data)
   */
  async updateStats(userId: string): Promise<ReferralStats> {
    // Calculate stats
    const statsResult = await this.db.query<StatsRow>(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('signed_up', 'converted')) as total_referrals,
        COUNT(*) FILTER (WHERE status = 'converted') as successful_referrals,
        COUNT(*) FILTER (WHERE status = 'signed_up') as pending_referrals,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_referrals,
        COUNT(*) FILTER (WHERE status = 'converted') as total_conversions,
        COALESCE(SUM(conversion_value) FILTER (WHERE status = 'converted'), 0) as total_conversion_value
      FROM referrals WHERE referrer_id = $1
    `, [userId]);

    const clicksResult = await this.db.query<ClicksRow>(`
      SELECT COALESCE(SUM(clicks), 0) as total_clicks FROM referral_codes WHERE user_id = $1
    `, [userId]);

    const stats = statsResult.rows[0];
    const clicks = clicksResult.rows[0];

    // Get next tier info
    const season = await this.referralService.getDefaultSeason();
    let nextTierId: string | null = null;
    let referralsToNextTier: number | null = null;

    if (season) {
      const tiers = await this.referralService.getTiersBySeason(season.id);
      for (const tier of tiers) {
        if (tier.referrals_required > parseInt(stats.successful_referrals)) {
          nextTierId = tier.id;
          referralsToNextTier = tier.referrals_required - parseInt(stats.successful_referrals);
          break;
        }
      }
    }

    // Upsert stats
    const result = await this.db.query<ReferralStats>(`
      INSERT INTO referral_stats (id, user_id, total_clicks, total_referrals, successful_referrals, pending_referrals, expired_referrals, total_conversions, total_conversion_value, next_tier_id, referrals_to_next_tier)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id) DO UPDATE SET
        total_clicks = $3,
        total_referrals = $4,
        successful_referrals = $5,
        pending_referrals = $6,
        expired_referrals = $7,
        total_conversions = $8,
        total_conversion_value = $9,
        next_tier_id = $10,
        referrals_to_next_tier = $11,
        updated_at = NOW()
      RETURNING *
    `, [
      this.generateId(),
      userId,
      parseInt(clicks.total_clicks),
      parseInt(stats.total_referrals),
      parseInt(stats.successful_referrals),
      parseInt(stats.pending_referrals),
      parseInt(stats.expired_referrals),
      parseInt(stats.total_conversions),
      parseFloat(stats.total_conversion_value),
      nextTierId,
      referralsToNextTier,
    ]);

    return result.rows[0];
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    seasonId?: string,
    limit: number = 10
  ): Promise<Array<ReferralStats & { rank: number }>> {
    let query = `
      SELECT rs.*, ROW_NUMBER() OVER (ORDER BY rs.successful_referrals DESC, rs.total_conversion_value DESC) as rank
      FROM referral_stats rs
    `;

    const params: unknown[] = [];
    if (seasonId) {
      query += ` WHERE rs.season_id = $1`;
      params.push(seasonId);
    }

    query += ` ORDER BY rs.successful_referrals DESC, rs.total_conversion_value DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.db.query<ReferralStats & { rank: number }>(query, params);
    return result.rows;
  }

  /**
   * Get admin-level aggregated stats
   */
  async getAdminStats(): Promise<Record<string, unknown>> {
    const result = await this.db.query<Record<string, unknown>>(`
      SELECT
        (SELECT COUNT(*) FROM referral_codes WHERE is_active = true) as total_codes,
        (SELECT SUM(clicks) FROM referral_codes) as total_clicks,
        (SELECT COUNT(*) FROM referrals) as total_referrals,
        (SELECT COUNT(*) FROM referrals WHERE status = 'signed_up') as pending_referrals,
        (SELECT COUNT(*) FROM referrals WHERE status = 'converted') as converted_referrals,
        (SELECT COALESCE(SUM(conversion_value), 0) FROM referrals WHERE status = 'converted') as total_revenue,
        (SELECT COUNT(*) FROM referral_rewards WHERE is_claimed = true) as claimed_rewards,
        (SELECT COUNT(*) FROM discount_codes WHERE is_active = true) as active_discount_codes,
        (SELECT COUNT(*) FROM discount_code_usage) as discount_codes_used
    `);
    return result.rows[0];
  }
}
