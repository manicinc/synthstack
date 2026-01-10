/**
 * Referral Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReferralService } from '../../../src/services/referral-service.js';
import { createMockDatabase } from '../../helpers/mock-database.js';
import { fixtures } from '../../helpers/fixtures.js';

describe('ReferralService', () => {
  let service: ReferralService;
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = new ReferralService({
      db: mockDb,
      generateId: () => 'test-id-123',
    });
  });

  describe('Season Management', () => {
    describe('getActiveSeasons', () => {
      it('should return active seasons', async () => {
        mockDb.mockQuery('FROM referral_seasons', [fixtures.defaultSeason]);

        const result = await service.getActiveSeasons();

        expect(result).toHaveLength(1);
        expect(result[0].is_active).toBe(true);
      });

      it('should return empty array when no active seasons', async () => {
        mockDb.mockQuery('FROM referral_seasons', []);

        const result = await service.getActiveSeasons();

        expect(result).toHaveLength(0);
      });
    });

    describe('getDefaultSeason', () => {
      it('should return default season', async () => {
        mockDb.mockQuery('is_default = true', [fixtures.defaultSeason]);

        const result = await service.getDefaultSeason();

        expect(result).not.toBeNull();
        expect(result?.is_default).toBe(true);
      });

      it('should return null when no default season', async () => {
        mockDb.mockQuery('is_default = true', []);

        const result = await service.getDefaultSeason();

        expect(result).toBeNull();
      });
    });

    describe('getSeasonById', () => {
      it('should return season by id', async () => {
        mockDb.mockQuery('WHERE id = $1', [fixtures.defaultSeason]);

        const result = await service.getSeasonById('season-1');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('season-1');
      });
    });
  });

  describe('Tier Management', () => {
    describe('getTiersBySeason', () => {
      it('should return tiers for season ordered by referrals_required', async () => {
        mockDb.mockQuery('WHERE season_id = $1', [
          fixtures.tiers.bronze,
          fixtures.tiers.silver,
          fixtures.tiers.gold,
        ]);

        const result = await service.getTiersBySeason('season-1');

        expect(result).toHaveLength(3);
        expect(result[0].referrals_required).toBeLessThan(result[1].referrals_required);
      });
    });

    describe('createTier', () => {
      it('should create new tier', async () => {
        mockDb.mockQuery('INSERT INTO referral_tiers', [fixtures.tiers.bronze]);

        const result = await service.createTier({
          season_id: 'season-1',
          name: 'Bronze',
          referrals_required: 3,
          reward_type: 'discount_code',
          reward_value: { percent: 10 },
        });

        expect(result.name).toBe('Bronze');
      });
    });

    describe('deleteTier', () => {
      it('should delete tier by id', async () => {
        await service.deleteTier('tier-1');

        expect(mockDb.queries).toContainEqual(
          expect.objectContaining({
            sql: expect.stringContaining('DELETE FROM referral_tiers'),
          })
        );
      });
    });
  });

  describe('Referral Code Management', () => {
    describe('getUserReferralCode', () => {
      it('should return existing code for user', async () => {
        mockDb.mockQuery('WHERE user_id = $1', [fixtures.referralCodes.active]);

        const result = await service.getUserReferralCode('user-referrer-1');

        expect(result).not.toBeNull();
        expect(result?.user_id).toBe('user-referrer-1');
      });

      it('should filter by season when provided', async () => {
        mockDb.mockQuery('AND season_id = $2', [fixtures.referralCodes.active]);

        const result = await service.getUserReferralCode('user-referrer-1', 'season-1');

        expect(result).not.toBeNull();
      });
    });

    describe('generateReferralCode', () => {
      it('should return existing code if user has one', async () => {
        mockDb.mockQuery('WHERE is_active = true AND is_default = true', [fixtures.defaultSeason]);
        mockDb.mockQuery('WHERE user_id = $1', [fixtures.referralCodes.active]);

        const result = await service.generateReferralCode('user-referrer-1');

        expect(result.id).toBe('code-1');
      });

      it('should generate new code with season prefix', async () => {
        mockDb.mockQuery('WHERE is_active = true AND is_default = true', [fixtures.defaultSeason]);
        mockDb.mockQuery('WHERE user_id = $1', []);
        mockDb.mockQuery('FROM referral_codes WHERE code', []);
        mockDb.mockQuery('INSERT INTO referral_codes', [{
          id: 'test-id-123',
          user_id: 'new-user-1',
          code: 'SYNTHABC123',
          season_id: 'season-1',
        }]);

        const result = await service.generateReferralCode('new-user-1');

        expect(result.code).toContain('SYNTH'); // Uses season prefix
      });
    });

    describe('getReferralCodeByCode', () => {
      it('should normalize code to uppercase', async () => {
        mockDb.mockQuery('WHERE code = $1', [fixtures.referralCodes.active]);

        await service.getReferralCodeByCode('synthab12cd34');

        expect(mockDb.queries[0].params?.[0]).toBe('SYNTHAB12CD34');
      });
    });
  });

  describe('Referral Tracking', () => {
    describe('trackClick', () => {
      it('should create referral record on click', async () => {
        mockDb.mockQuery('WHERE code = $1', [fixtures.referralCodes.active]);
        mockDb.mockQuery('UPDATE referral_codes', []);
        mockDb.mockQuery('INSERT INTO referrals', [fixtures.referrals.clicked]);

        const result = await service.trackClick('SYNTHAB12CD34', {
          ip_address: '192.168.1.1',
          user_agent: 'Test Agent',
        });

        expect(result).not.toBeNull();
        expect(result?.status).toBe('clicked');
      });

      it('should return null for invalid code', async () => {
        mockDb.mockQuery('WHERE code = $1', []);

        const result = await service.trackClick('INVALID');

        expect(result).toBeNull();
      });

      it('should increment click count', async () => {
        mockDb.mockQuery('WHERE code = $1', [fixtures.referralCodes.active]);
        mockDb.mockQuery('UPDATE referral_codes', []);
        mockDb.mockQuery('INSERT INTO referrals', [fixtures.referrals.clicked]);

        await service.trackClick('SYNTHAB12CD34');

        expect(mockDb.queries).toContainEqual(
          expect.objectContaining({
            sql: expect.stringContaining('clicks = clicks + 1'),
          })
        );
      });
    });

    describe('registerReferral', () => {
      it('should return null for self-referral when not allowed', async () => {
        mockDb.mockQuery('WHERE code = $1', [fixtures.referralCodes.active]);
        mockDb.mockQuery('WHERE id = $1', [fixtures.defaultSeason]); // Season config

        const result = await service.registerReferral('SYNTHAB12CD34', 'user-referrer-1');

        expect(result).toBeNull();
      });

      it('should return existing referral if user already referred', async () => {
        mockDb.mockQuery('WHERE code = $1', [fixtures.referralCodes.active]);
        mockDb.mockQuery('referred_user_id = $1 AND season_id', [fixtures.referrals.signedUp]);

        const result = await service.registerReferral('SYNTHAB12CD34', 'user-referred-1');

        expect(result?.id).toBe('referral-2');
      });
    });

    describe('convertReferral', () => {
      it('should convert signed_up referral', async () => {
        mockDb.mockQuery('UPDATE referrals', [{
          ...fixtures.referrals.signedUp,
          status: 'converted',
          conversion_type: 'subscription',
          conversion_value: 99.00,
        }]);

        const result = await service.convertReferral(
          'referral-2',
          'subscription',
          99.00,
          'pro-monthly'
        );

        expect(result).not.toBeNull();
        expect(result?.status).toBe('converted');
      });

      it('should return null if referral not in signed_up status', async () => {
        mockDb.mockQuery('UPDATE referrals', []);

        const result = await service.convertReferral('referral-1', 'subscription', 99.00);

        expect(result).toBeNull();
      });
    });

    describe('getUserReferrals', () => {
      it('should return all referrals for user', async () => {
        mockDb.mockQuery('WHERE referrer_id = $1', [
          fixtures.referrals.clicked,
          fixtures.referrals.signedUp,
          fixtures.referrals.converted,
        ]);

        const result = await service.getUserReferrals('user-referrer-1');

        expect(result).toHaveLength(3);
      });

      it('should filter by status when provided', async () => {
        mockDb.mockQuery('AND status = $2', [fixtures.referrals.converted]);

        const result = await service.getUserReferrals('user-referrer-1', 'converted');

        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('converted');
      });
    });
  });

  describe('Admin Functions', () => {
    describe('getAllReferralCodes', () => {
      it('should support pagination', async () => {
        mockDb.mockQuery('ORDER BY created_at DESC LIMIT', [fixtures.referralCodes.active]);

        await service.getAllReferralCodes(undefined, 10, 5);

        const query = mockDb.queries[0];
        expect(query.params).toContain(10);
        expect(query.params).toContain(5);
      });
    });

    describe('exportReferralData', () => {
      it('should export referral data with code info', async () => {
        mockDb.mockQuery('LEFT JOIN referral_codes', [{
          id: 'referral-3',
          status: 'converted',
          referral_code: 'SYNTHAB12CD34',
          referrer_id: 'user-referrer-1',
        }]);

        const result = await service.exportReferralData();

        expect(result[0]).toHaveProperty('referral_code');
        expect(result[0]).toHaveProperty('referrer_id');
      });
    });
  });
});
