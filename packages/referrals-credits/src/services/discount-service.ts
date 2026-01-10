/**
 * Discount Code Service
 *
 * Handles discount code validation, creation, and application
 */

import { v4 as uuidv4 } from 'uuid';
import type { DatabaseAdapter, ServiceDependencies } from '../types/database.js';
import type {
  DiscountCode,
  DiscountValidation,
  DiscountApplication,
  CreateDiscountCodeInput,
} from '../types/discount.js';
import { generateDiscountCode as generateCode, normalizeCode } from '../utils/code-generator.js';
import { isExpired } from '../utils/validators.js';

export class DiscountService {
  private db: DatabaseAdapter;
  private generateId: () => string;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.generateId = deps.generateId || uuidv4;
  }

  /**
   * Generate a discount code from a referral reward
   */
  async generateDiscountCodeFromReward(
    rewardValue: Record<string, unknown>,
    rewardId: string
  ): Promise<DiscountCode | null> {
    const prefix = (rewardValue.code_prefix as string) || 'SAVE';
    let code = generateCode(prefix);

    // Ensure unique
    let attempts = 0;
    while (attempts < 10) {
      const exists = await this.db.query(`SELECT id FROM discount_codes WHERE code = $1`, [code]);
      if (exists.rows.length === 0) break;
      code = generateCode(prefix);
      attempts++;
    }

    const expiresDays = rewardValue.expires_days as number | undefined;
    const expiresAt = expiresDays
      ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const id = this.generateId();
    const result = await this.db.query<DiscountCode>(
      `
      INSERT INTO discount_codes (id, code, type, value, applies_to, max_uses, referral_reward_id, expires_at, source)
      VALUES ($1, $2, 'percent', $3, 'all', $4, $5, $6, 'referral')
      RETURNING *
    `,
      [
        id,
        code,
        (rewardValue.percent as number) || 0,
        (rewardValue.max_uses as number) || 1,
        rewardId,
        expiresAt,
      ]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new discount code
   */
  async createDiscountCode(data: CreateDiscountCodeInput): Promise<DiscountCode> {
    const code = data.code || generateCode('PROMO');

    const id = this.generateId();
    const result = await this.db.query<DiscountCode>(
      `
      INSERT INTO discount_codes (id, code, name, description, type, value, applies_to, max_uses, max_uses_per_user, min_purchase, max_discount, source, is_active, is_public, starts_at, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `,
      [
        id,
        normalizeCode(code),
        data.name,
        data.description,
        data.type || 'percent',
        data.value || 0,
        data.applies_to || 'all',
        data.max_uses,
        data.max_uses_per_user || 1,
        data.min_purchase,
        data.max_discount,
        'admin',
        data.is_active ?? true,
        data.is_public ?? false,
        new Date().toISOString(),
        data.expires_at,
        data.created_by,
      ]
    );

    return result.rows[0];
  }

  /**
   * Validate a discount code for a user and purchase
   */
  async validateDiscountCode(
    code: string,
    userId: string,
    purchaseType?: string,
    purchaseAmount?: number
  ): Promise<DiscountValidation> {
    const result = await this.db.query<DiscountCode>(
      `SELECT * FROM discount_codes WHERE code = $1 AND is_active = true`,
      [normalizeCode(code)]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid discount code' };
    }

    const discount = result.rows[0];

    // Check expiration
    if (isExpired(discount.expires_at)) {
      return { valid: false, error: 'Discount code has expired' };
    }

    // Check max uses
    if (discount.max_uses && discount.current_uses >= discount.max_uses) {
      return { valid: false, error: 'Discount code has reached maximum uses' };
    }

    // Check per-user limit
    const userUsage = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM discount_code_usage WHERE discount_code_id = $1 AND user_id = $2`,
      [discount.id, userId]
    );

    if (parseInt(userUsage.rows[0].count) >= discount.max_uses_per_user) {
      return { valid: false, error: 'You have already used this discount code' };
    }

    // Check purchase type
    if (discount.applies_to !== 'all' && purchaseType && discount.applies_to !== purchaseType) {
      return { valid: false, error: `This discount only applies to ${discount.applies_to} purchases` };
    }

    // Check minimum purchase
    if (
      discount.min_purchase &&
      purchaseAmount &&
      purchaseAmount < parseFloat(discount.min_purchase.toString())
    ) {
      return { valid: false, error: `Minimum purchase of $${discount.min_purchase} required` };
    }

    return { valid: true, discount };
  }

  /**
   * Apply a discount code to a purchase
   */
  async applyDiscountCode(
    code: string,
    userId: string,
    originalAmount: number,
    productType: string,
    productId: string,
    orderId: string
  ): Promise<DiscountApplication> {
    const validation = await this.validateDiscountCode(code, userId, productType, originalAmount);

    if (!validation.valid || !validation.discount) {
      return {
        success: false,
        finalAmount: originalAmount,
        discountAmount: 0,
        error: validation.error,
      };
    }

    const discount = validation.discount;
    let discountAmount = 0;

    if (discount.type === 'percent') {
      discountAmount = (originalAmount * discount.value) / 100;
    } else if (discount.type === 'fixed') {
      discountAmount = discount.value;
    } else if (discount.type === 'free_month' || discount.type === 'free_trial') {
      // Handle separately in subscription logic
      discountAmount = 0;
    }

    // Apply max discount cap
    if (discount.max_discount && discountAmount > parseFloat(discount.max_discount.toString())) {
      discountAmount = parseFloat(discount.max_discount.toString());
    }

    const finalAmount = Math.max(0, originalAmount - discountAmount);

    // Record usage
    await this.db.query(
      `
      INSERT INTO discount_code_usage (id, discount_code_id, user_id, order_id, original_amount, discount_amount, final_amount, product_type, product_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        this.generateId(),
        discount.id,
        userId,
        orderId,
        originalAmount,
        discountAmount,
        finalAmount,
        productType,
        productId,
      ]
    );

    // Increment usage count
    await this.db.query(`UPDATE discount_codes SET current_uses = current_uses + 1 WHERE id = $1`, [
      discount.id,
    ]);

    return { success: true, finalAmount, discountAmount };
  }

  /**
   * Get a discount code by code string
   */
  async getDiscountCodeByCode(code: string): Promise<DiscountCode | null> {
    const result = await this.db.query<DiscountCode>(
      `SELECT * FROM discount_codes WHERE code = $1`,
      [normalizeCode(code)]
    );
    return result.rows[0] || null;
  }

  /**
   * Update a discount code
   */
  async updateDiscountCode(
    id: string,
    data: Partial<CreateDiscountCodeInput>
  ): Promise<DiscountCode | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = [
      'name',
      'description',
      'type',
      'value',
      'applies_to',
      'max_uses',
      'max_uses_per_user',
      'min_purchase',
      'max_discount',
      'is_active',
      'is_public',
      'expires_at',
    ];

    for (const field of fields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push((data as Record<string, unknown>)[field]);
      }
    }

    if (updates.length === 0) {
      return this.getDiscountCodeById(id);
    }

    values.push(id);
    const result = await this.db.query<DiscountCode>(
      `UPDATE discount_codes SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Get a discount code by ID
   */
  async getDiscountCodeById(id: string): Promise<DiscountCode | null> {
    const result = await this.db.query<DiscountCode>(
      `SELECT * FROM discount_codes WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Deactivate a discount code
   */
  async deactivateDiscountCode(id: string): Promise<void> {
    await this.db.query(`UPDATE discount_codes SET is_active = false, updated_at = NOW() WHERE id = $1`, [
      id,
    ]);
  }
}
