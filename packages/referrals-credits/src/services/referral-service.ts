/**
 * Referral Service
 *
 * Handles all referral system logic including:
 * - Code generation and management
 * - Referral tracking and conversion
 * - Season and tier management
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseAdapter, ServiceDependencies } from '../types/database.js';
import type {
  ReferralSeason,
  ReferralTier,
  ReferralCode,
  Referral,
  ClickMetadata,
} from '../types/referral.js';
import { generateReferralCode as generateCode, normalizeCode } from '../utils/code-generator.js';

export class ReferralService {
  private db: DatabaseAdapter;
  private generateId: () => string;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.generateId = deps.generateId || uuidv4;
  }

  // =====================================================
  // SEASON MANAGEMENT
  // =====================================================

  async getActiveSeasons(): Promise<ReferralSeason[]> {
    const result = await this.db.query<ReferralSeason>(`
      SELECT * FROM referral_seasons
      WHERE is_active = true
      ORDER BY is_default DESC, start_date DESC
    `);
    return result.rows;
  }

  async getDefaultSeason(): Promise<ReferralSeason | null> {
    const result = await this.db.query<ReferralSeason>(`
      SELECT * FROM referral_seasons
      WHERE is_active = true AND is_default = true
      LIMIT 1
    `);
    return result.rows[0] || null;
  }

  async getSeasonById(seasonId: string): Promise<ReferralSeason | null> {
    const result = await this.db.query<ReferralSeason>(
      `SELECT * FROM referral_seasons WHERE id = $1`,
      [seasonId]
    );
    return result.rows[0] || null;
  }

  async createSeason(data: Partial<ReferralSeason>): Promise<ReferralSeason> {
    const id = this.generateId();
    const result = await this.db.query<ReferralSeason>(
      `
      INSERT INTO referral_seasons (id, name, slug, description, start_date, end_date, is_active, is_default, config)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        id,
        data.name,
        data.slug,
        data.description,
        data.start_date,
        data.end_date,
        data.is_active ?? true,
        data.is_default ?? false,
        JSON.stringify(data.config || {}),
      ]
    );
    return result.rows[0];
  }

  async updateSeason(seasonId: string, data: Partial<ReferralSeason>): Promise<ReferralSeason> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(data.end_date);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }
    if (data.is_default !== undefined) {
      updates.push(`is_default = $${paramIndex++}`);
      values.push(data.is_default);
    }
    if (data.config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(data.config));
    }

    values.push(seasonId);
    const result = await this.db.query<ReferralSeason>(
      `
      UPDATE referral_seasons SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values
    );
    return result.rows[0];
  }

  // =====================================================
  // TIER MANAGEMENT
  // =====================================================

  async getTiersBySeason(seasonId: string): Promise<ReferralTier[]> {
    const result = await this.db.query<ReferralTier>(
      `
      SELECT * FROM referral_tiers
      WHERE season_id = $1 AND is_active = true
      ORDER BY referrals_required ASC
    `,
      [seasonId]
    );
    return result.rows;
  }

  async getTierById(tierId: string): Promise<ReferralTier | null> {
    const result = await this.db.query<ReferralTier>(`SELECT * FROM referral_tiers WHERE id = $1`, [
      tierId,
    ]);
    return result.rows[0] || null;
  }

  async createTier(data: Partial<ReferralTier>): Promise<ReferralTier> {
    const id = this.generateId();
    const result = await this.db.query<ReferralTier>(
      `
      INSERT INTO referral_tiers (id, season_id, name, description, referrals_required, reward_type, reward_value, badge_icon, badge_color, is_stackable, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
      [
        id,
        data.season_id,
        data.name,
        data.description,
        data.referrals_required,
        data.reward_type,
        JSON.stringify(data.reward_value),
        data.badge_icon,
        data.badge_color,
        data.is_stackable ?? false,
        data.sort_order ?? 0,
      ]
    );
    return result.rows[0];
  }

  async updateTier(tierId: string, data: Partial<ReferralTier>): Promise<ReferralTier> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = [
      'name',
      'description',
      'referrals_required',
      'reward_type',
      'badge_icon',
      'badge_color',
      'is_stackable',
      'is_active',
      'sort_order',
    ];

    for (const field of fields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push((data as Record<string, unknown>)[field]);
      }
    }

    if (data.reward_value !== undefined) {
      updates.push(`reward_value = $${paramIndex++}`);
      values.push(JSON.stringify(data.reward_value));
    }

    values.push(tierId);
    const result = await this.db.query<ReferralTier>(
      `
      UPDATE referral_tiers SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values
    );
    return result.rows[0];
  }

  async deleteTier(tierId: string): Promise<void> {
    await this.db.query(`DELETE FROM referral_tiers WHERE id = $1`, [tierId]);
  }

  // =====================================================
  // REFERRAL CODE MANAGEMENT
  // =====================================================

  async getUserReferralCode(userId: string, seasonId?: string): Promise<ReferralCode | null> {
    let query = `SELECT * FROM referral_codes WHERE user_id = $1 AND is_active = true`;
    const params: unknown[] = [userId];

    if (seasonId) {
      query += ` AND season_id = $2`;
      params.push(seasonId);
    }

    query += ` ORDER BY created_at DESC LIMIT 1`;

    const result = await this.db.query<ReferralCode>(query, params);
    return result.rows[0] || null;
  }

  async generateReferralCode(userId: string, seasonId?: string): Promise<ReferralCode> {
    // Get season config for prefix
    let prefix = 'REF';
    let resolvedSeasonId = seasonId;

    if (seasonId) {
      const season = await this.getSeasonById(seasonId);
      if (season?.config?.referral_code_prefix) {
        prefix = season.config.referral_code_prefix;
      }
    } else {
      const defaultSeason = await this.getDefaultSeason();
      if (defaultSeason) {
        resolvedSeasonId = defaultSeason.id;
        prefix = defaultSeason.config?.referral_code_prefix || 'REF';
      }
    }

    // Check for existing code
    const existing = await this.getUserReferralCode(userId, resolvedSeasonId);
    if (existing) {
      return existing;
    }

    // Generate unique code with retry
    let code = generateCode(prefix);
    let attempts = 0;
    while (attempts < 10) {
      const exists = await this.db.query(`SELECT id FROM referral_codes WHERE code = $1`, [code]);
      if (exists.rows.length === 0) break;
      code = generateCode(prefix);
      attempts++;
    }

    const id = this.generateId();
    const result = await this.db.query<ReferralCode>(
      `
      INSERT INTO referral_codes (id, user_id, code, season_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [id, userId, code, resolvedSeasonId]
    );

    return result.rows[0];
  }

  async getReferralCodeByCode(code: string): Promise<ReferralCode | null> {
    const result = await this.db.query<ReferralCode>(
      `SELECT * FROM referral_codes WHERE code = $1 AND is_active = true`,
      [normalizeCode(code)]
    );
    return result.rows[0] || null;
  }

  // =====================================================
  // REFERRAL TRACKING
  // =====================================================

  async trackClick(code: string, metadata?: ClickMetadata): Promise<Referral | null> {
    const referralCode = await this.getReferralCodeByCode(code);
    if (!referralCode) {
      return null;
    }

    // Update click count
    await this.db.query(
      `UPDATE referral_codes SET clicks = clicks + 1, last_click_at = NOW() WHERE id = $1`,
      [referralCode.id]
    );

    // Create referral record
    const id = this.generateId();
    const result = await this.db.query<Referral>(
      `
      INSERT INTO referrals (id, referrer_id, referral_code_id, season_id, status, ip_address, user_agent, utm_source, utm_medium, utm_campaign)
      VALUES ($1, $2, $3, $4, 'clicked', $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        id,
        referralCode.user_id,
        referralCode.id,
        referralCode.season_id,
        metadata?.ip_address,
        metadata?.user_agent,
        metadata?.utm_source,
        metadata?.utm_medium,
        metadata?.utm_campaign,
      ]
    );

    return result.rows[0];
  }

  async registerReferral(
    code: string,
    referredUserId: string,
    referredEmail?: string
  ): Promise<Referral | null> {
    const referralCode = await this.getReferralCodeByCode(code);
    if (!referralCode) {
      return null;
    }

    // Check for self-referral
    if (referralCode.user_id === referredUserId) {
      const season = await this.getSeasonById(referralCode.season_id!);
      if (!season?.config?.allow_self_referral) {
        return null;
      }
    }

    // Check for existing referral
    const existing = await this.db.query<Referral>(
      `SELECT * FROM referrals WHERE referred_user_id = $1 AND season_id = $2`,
      [referredUserId, referralCode.season_id]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Find pending referral from click or create new
    const pendingResult = await this.db.query<Referral>(
      `
      SELECT * FROM referrals
      WHERE referral_code_id = $1 AND status = 'clicked' AND referred_user_id IS NULL
      ORDER BY click_date DESC LIMIT 1
    `,
      [referralCode.id]
    );

    if (pendingResult.rows.length > 0) {
      // Update existing click
      const result = await this.db.query<Referral>(
        `
        UPDATE referrals
        SET referred_user_id = $1, referred_email = $2, status = 'signed_up', signup_date = NOW()
        WHERE id = $3
        RETURNING *
      `,
        [referredUserId, referredEmail, pendingResult.rows[0].id]
      );
      return result.rows[0];
    }

    // Create new referral
    const id = this.generateId();
    const result = await this.db.query<Referral>(
      `
      INSERT INTO referrals (id, referrer_id, referred_user_id, referred_email, referral_code_id, season_id, status, signup_date)
      VALUES ($1, $2, $3, $4, $5, $6, 'signed_up', NOW())
      RETURNING *
    `,
      [id, referralCode.user_id, referredUserId, referredEmail, referralCode.id, referralCode.season_id]
    );

    return result.rows[0];
  }

  async convertReferral(
    referralId: string,
    conversionType: string,
    conversionValue: number,
    productId?: string
  ): Promise<Referral | null> {
    const result = await this.db.query<Referral>(
      `
      UPDATE referrals
      SET status = 'converted', conversion_date = NOW(), conversion_type = $1, conversion_value = $2, conversion_product = $3
      WHERE id = $4 AND status = 'signed_up'
      RETURNING *
    `,
      [conversionType, conversionValue, productId, referralId]
    );

    return result.rows[0] || null;
  }

  async getUserReferrals(userId: string, status?: string): Promise<Referral[]> {
    let query = `SELECT * FROM referrals WHERE referrer_id = $1`;
    const params: unknown[] = [userId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.db.query<Referral>(query, params);
    return result.rows;
  }

  // =====================================================
  // ADMIN FUNCTIONS
  // =====================================================

  async getAllReferralCodes(
    seasonId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ReferralCode[]> {
    let query = `SELECT * FROM referral_codes`;
    const params: unknown[] = [];

    if (seasonId) {
      query += ` WHERE season_id = $1`;
      params.push(seasonId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.db.query<ReferralCode>(query, params);
    return result.rows;
  }

  async getAllReferrals(status?: string, limit: number = 100, offset: number = 0): Promise<Referral[]> {
    let query = `SELECT * FROM referrals`;
    const params: unknown[] = [];

    if (status) {
      query += ` WHERE status = $1`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.db.query<Referral>(query, params);
    return result.rows;
  }

  async exportReferralData(seasonId?: string): Promise<Record<string, unknown>[]> {
    let query = `
      SELECT
        r.id,
        r.status,
        r.click_date,
        r.signup_date,
        r.conversion_date,
        r.conversion_type,
        r.conversion_value,
        rc.code as referral_code,
        rc.user_id as referrer_id
      FROM referrals r
      LEFT JOIN referral_codes rc ON r.referral_code_id = rc.id
    `;

    const params: unknown[] = [];
    if (seasonId) {
      query += ` WHERE r.season_id = $1`;
      params.push(seasonId);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await this.db.query<Record<string, unknown>>(query, params);
    return result.rows;
  }
}
