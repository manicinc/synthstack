/**
 * Discount Code Lifecycle Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DiscountService } from '../../../src/services/discount-service.js';
import { createMockDatabase } from '../../helpers/mock-database.js';
import { fixtures } from '../../helpers/fixtures.js';

describe('Discount Code Lifecycle', () => {
  let service: DiscountService;
  let mockDb: ReturnType<typeof createMockDatabase>;
  let idCounter: number;

  beforeEach(() => {
    idCounter = 0;
    mockDb = createMockDatabase();
    service = new DiscountService({
      db: mockDb,
      generateId: () => `test-id-${++idCounter}`,
    });
  });

  describe('Create → Validate → Apply → Track', () => {
    it('should handle complete lifecycle', async () => {
      const userId = 'user-1';
      const orderId = 'order-1';
      const originalAmount = 100;

      // 1. Create discount code
      mockDb.mockQuery('INSERT INTO discount_codes', [{
        id: 'test-id-1',
        code: 'LIFECYCLE20',
        type: 'percent',
        value: 20,
        applies_to: 'all',
        max_uses: 100,
        max_uses_per_user: 1,
        current_uses: 0,
        is_active: true,
      }]);

      const created = await service.createDiscountCode({
        code: 'LIFECYCLE20',
        type: 'percent',
        value: 20,
        max_uses: 100,
      });
      expect(created.code).toBe('LIFECYCLE20');

      // 2. Validate code
      mockDb.clearMocks();
      mockDb.mockQuery('SELECT * FROM discount_codes', [created]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const validation = await service.validateDiscountCode('LIFECYCLE20', userId, 'all', originalAmount);
      expect(validation.valid).toBe(true);
      expect(validation.discount?.code).toBe('LIFECYCLE20');

      // 3. Apply code
      mockDb.clearMocks();
      mockDb.mockQuery('SELECT * FROM discount_codes', [created]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const application = await service.applyDiscountCode(
        'LIFECYCLE20',
        userId,
        originalAmount,
        'subscription',
        'product-1',
        orderId
      );

      expect(application.success).toBe(true);
      expect(application.discountAmount).toBe(20); // 20% of 100
      expect(application.finalAmount).toBe(80);

      // Verify usage was recorded
      const insertUsageQuery = mockDb.queries.find(q =>
        q.sql.includes('INSERT INTO discount_code_usage')
      );
      expect(insertUsageQuery).toBeDefined();

      // Verify usage count was incremented
      const updateUsesQuery = mockDb.queries.find(q =>
        q.sql.includes('current_uses = current_uses + 1')
      );
      expect(updateUsesQuery).toBeDefined();
    });

    it('should enforce max_uses across multiple users', async () => {
      const discountAtLimit = {
        ...fixtures.discountCodes.valid,
        max_uses: 2,
        current_uses: 2,
      };

      mockDb.mockQuery('SELECT * FROM discount_codes', [discountAtLimit]);

      const validation = await service.validateDiscountCode('SAVE20', 'user-3');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Discount code has reached maximum uses');
    });

    it('should enforce max_uses_per_user', async () => {
      mockDb.mockQuery('SELECT * FROM discount_codes', [fixtures.discountCodes.valid]);
      // User has already used the code once
      mockDb.mockQuery('discount_code_usage', [{ count: '1' }]);

      const validation = await service.validateDiscountCode('SAVE20', 'repeat-user');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('You have already used this discount code');
    });
  });

  describe('Concurrent Usage Handling', () => {
    it('should track usage count correctly', async () => {
      const discountCode = {
        ...fixtures.discountCodes.valid,
        current_uses: 5,
      };

      mockDb.mockQuery('SELECT * FROM discount_codes', [discountCode]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      await service.applyDiscountCode(
        'SAVE20',
        'user-1',
        100,
        'all',
        'product-1',
        'order-1'
      );

      // Verify increment query was called
      const incrementQuery = mockDb.queries.find(q =>
        q.sql.includes('current_uses = current_uses + 1')
      );
      expect(incrementQuery).toBeDefined();
    });
  });

  describe('Different Discount Types', () => {
    it('should apply percent discount', async () => {
      const percentDiscount = {
        ...fixtures.discountCodes.valid,
        type: 'percent',
        value: 25,
      };

      mockDb.mockQuery('SELECT * FROM discount_codes', [percentDiscount]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const result = await service.applyDiscountCode(
        'SAVE20',
        'user-1',
        200,
        'all',
        'product-1',
        'order-1'
      );

      expect(result.discountAmount).toBe(50); // 25% of 200
      expect(result.finalAmount).toBe(150);
    });

    it('should apply fixed discount', async () => {
      const fixedDiscount = {
        ...fixtures.discountCodes.valid,
        type: 'fixed',
        value: 30,
      };

      mockDb.mockQuery('SELECT * FROM discount_codes', [fixedDiscount]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const result = await service.applyDiscountCode(
        'SAVE20',
        'user-1',
        100,
        'all',
        'product-1',
        'order-1'
      );

      expect(result.discountAmount).toBe(30);
      expect(result.finalAmount).toBe(70);
    });

    it('should handle free_month type (no immediate discount)', async () => {
      const freeMonthDiscount = {
        ...fixtures.discountCodes.valid,
        type: 'free_month',
        value: 1,
      };

      mockDb.mockQuery('SELECT * FROM discount_codes', [freeMonthDiscount]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const result = await service.applyDiscountCode(
        'SAVE20',
        'user-1',
        100,
        'subscription',
        'product-1',
        'order-1'
      );

      // free_month is handled in subscription logic, not immediate discount
      expect(result.discountAmount).toBe(0);
      expect(result.finalAmount).toBe(100);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle discount larger than purchase amount', async () => {
      const largeFixedDiscount = {
        ...fixtures.discountCodes.valid,
        type: 'fixed',
        value: 500,
      };

      mockDb.mockQuery('SELECT * FROM discount_codes', [largeFixedDiscount]);
      mockDb.mockQuery('discount_code_usage', [{ count: '0' }]);

      const result = await service.applyDiscountCode(
        'SAVE20',
        'user-1',
        100,
        'all',
        'product-1',
        'order-1'
      );

      expect(result.finalAmount).toBe(0); // Never negative
      expect(result.success).toBe(true);
    });

    it('should respect max_discount cap', async () => {
      const cappedDiscount = {
        ...fixtures.discountCodes.valid,
        type: 'percent',
        value: 50,
        max_discount: 25,
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

      // 50% of 100 = 50, but capped at 25
      expect(result.discountAmount).toBe(25);
      expect(result.finalAmount).toBe(75);
    });
  });
});
