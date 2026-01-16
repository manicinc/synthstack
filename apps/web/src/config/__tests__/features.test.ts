/**
 * @file config/__tests__/features.test.ts
 * @description Tests for feature flag configuration (COMMUNITY EDITION)
 *
 * In Community Edition, all PRO features are hardcoded to false.
 */

import { describe, it, expect } from 'vitest';
import { FEATURES, isPro, isCommunity, versionName } from '../features';

describe('Feature Configuration (Community Edition)', () => {
  describe('FEATURES object', () => {
    it('should have COPILOT disabled', () => {
      expect(FEATURES.COPILOT).toBe(false);
    });

    it('should have REFERRALS disabled', () => {
      expect(FEATURES.REFERRALS).toBe(false);
    });

    it('should have WORKFLOWS disabled', () => {
      expect(FEATURES.WORKFLOWS).toBe(false);
    });
  });

  describe('Version flags', () => {
    it('isPro should be false', () => {
      expect(isPro).toBe(false);
    });

    it('isCommunity should be true', () => {
      expect(isCommunity).toBe(true);
    });

    it('versionName should be COMMUNITY', () => {
      expect(versionName).toBe('COMMUNITY');
    });
  });
});
