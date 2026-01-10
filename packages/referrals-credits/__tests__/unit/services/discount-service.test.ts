/**
 * Discount Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DiscountService } from '../../../src/services/discount-service.js';
import { createMockDatabase } from '../../helpers/mock-database.js';
import { fixtures } from '../../helpers/fixtures.js';

describe('DiscountService', () => {
  let service: DiscountService;
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = new DiscountService({
      db: mockDb,
      generateId: () => 'test-id-123',
    });
  });

  describe('validateDiscountCode', () => {
    it('should reject non-existent codes', async () => {
      mockDb.mockQuery('SELECT * FROM discount_codes', []);

      const result = await service.validateDiscountCode('INVALID', 'user-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid discount code');
    });

    it('should reject inactive codes', async () => {
      // SQL query filters for is_active = true, so inactive codes return empty result
      mockDb.mockQuery('SELECT * FROM discount_codes', []);

      const result = await service.validateDiscountCode('SAVE20', 'user-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid discount code');
    });

    it('should reject expired codes', async () => {
      mockDb.mockQuery('SELECT * FROM discount_codes', [fixtures.discountCodes.expired]);

      const result = await service.validateDiscountCode('EXPIRED10', 'user-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Discount code has expired');
    });

    it('should reject when max_uses reached', async () => {
      mockDb.mockQuery('SELECT * FROM discount_codes', [fixtures.discountCodes.maxedOut]);

      const result = await service.validateDiscountCode('MAXED', 'user-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Discount code has reached maximum uses');
    });

    it('should reject when user max_uses_per_user reached', async () => {
      mockDb.mockQuery('SELECT * FROM discount_codes', [fixtures.discountCodes.valid]);
      mockDb.mockQuery('discount_code_usage', [{ count: '1' }]); // User already used once

      const result = await service.validateDiscountCode('SAVE20', 'user-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('You have already used this discount code');
    });

    it('should reject mismatched purchase types', async () => {
      mockDb.mockQuery('SELECT * FROM discount_codes', [fixtures.discountCodes.subscriptionOnly]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const result = await service.validateDiscountCode('SUBONLY', 'user-1', 'credits');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('only applies to subscription');
    });

    it('should reject under minimum purchase', async () => {
      mockDb.mockQuery('SELECT * FROM discount_codes', [fixtures.discountCodes.minPurchase]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const result = await service.validateDiscountCode('MIN50', 'user-1', 'all', 30);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum purchase of $50');
    });

    it('should accept valid codes with all checks passing', async () => {
      mockDb.mockQuery('SELECT * FROM discount_codes', [fixtures.discountCodes.valid]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const result = await service.validateDiscountCode('SAVE20', 'user-1', 'all', 100);

      expect(result.valid).toBe(true);
      expect(result.discount).toBeDefined();
      expect(result.discount?.code).toBe('SAVE20');
    });
  });

  describe('applyDiscountCode', () => {
    it('should apply percent discount correctly', async () => {
      mockDb.mockQuery('SELECT * FROM discount_codes', [fixtures.discountCodes.valid]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const result = await service.applyDiscountCode(
        'SAVE20',
        'user-1',
        100,
        'all',
        'product-1',
        'order-1'
      );

      expect(result.success).toBe(true);
      expect(result.discountAmount).toBe(20); // 20% of 100
      expect(result.finalAmount).toBe(80);
    });

    it('should return error for invalid code', async () => {
      mockDb.mockQuery('SELECT * FROM discount_codes', []);

      const result = await service.applyDiscountCode(
        'INVALID',
        'user-1',
        100,
        'all',
        'product-1',
        'order-1'
      );

      expect(result.success).toBe(false);
      expect(result.finalAmount).toBe(100); // Original amount
      expect(result.discountAmount).toBe(0);
      expect(result.error).toBeDefined();
    });

    it('should not allow negative final amount', async () => {
      const hugeDiscount = {
        ...fixtures.discountCodes.valid,
        type: 'fixed',
        value: 500, // Fixed $500 discount on $100 purchase
      };
      mockDb.mockQuery('SELECT * FROM discount_codes', [hugeDiscount]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const result = await service.applyDiscountCode(
        'SAVE20',
        'user-1',
        100,
        'all',
        'product-1',
        'order-1'
      );

      expect(result.success).toBe(true);
      expect(result.finalAmount).toBe(0); // Capped at 0
    });

    it('should respect max_discount cap', async () => {
      const cappedDiscount = {
        ...fixtures.discountCodes.valid,
        value: 50, // 50%
        max_discount: 10, // But max $10
      };
      mockDb.mockQuery('SELECT * FROM discount_codes', [cappedDiscount]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const result = await service.applyDiscountCode(
        'SAVE20',
        'user-1',
        100,
        'all',
        'product-1',
        'order-1'
      );

      expect(result.success).toBe(true);
      expect(result.discountAmount).toBe(10); // Capped at max_discount
      expect(result.finalAmount).toBe(90);
    });
  });

  describe('createDiscountCode', () => {
    it('should create discount code with provided data', async () => {
      mockDb.mockQuery('INSERT INTO discount_codes', [{
        id: 'test-id-123',
        code: 'NEWCODE',
        type: 'percent',
        value: 15,
        applies_to: 'all',
        max_uses_per_user: 1,
        current_uses: 0,
        is_active: true,
      }]);

      const result = await service.createDiscountCode({
        code: 'newcode',
        type: 'percent',
        value: 15,
        applies_to: 'all',
      });

      expect(result.code).toBe('NEWCODE'); // Normalized to uppercase
    });

    it('should generate code if not provided', async () => {
      mockDb.mockQuery('INSERT INTO discount_codes', [{
        id: 'test-id-123',
        code: 'PROMOABC123',
        type: 'percent',
        value: 10,
      }]);

      const result = await service.createDiscountCode({
        value: 10,
      });

      expect(result.code).toContain('PROMO');
    });
  });
});
