import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifyLicense,
  hasFeature,
  meetsTierRequirement,
  getUpgradeUrl,
  requireFeature,
  createInitialLicenseState,
  TIER_FEATURES,
  type LicenseConfig,
  type LicenseTier
} from '../license';

describe('license module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TIER_FEATURES', () => {
    it('defines community tier with basic features', () => {
      expect(TIER_FEATURES.community).toContain('dashboard');
      expect(TIER_FEATURES.community).toContain('content_management');
      expect(TIER_FEATURES.community).toContain('translations');
      expect(TIER_FEATURES.community).toContain('audit_log');
      expect(TIER_FEATURES.community).toContain('webhooks');
      expect(TIER_FEATURES.community).toContain('basic_analytics');
    });

    it('defines pro tier with additional features', () => {
      expect(TIER_FEATURES.pro).toContain('workflows');
      expect(TIER_FEATURES.pro).toContain('ai_agents');
      expect(TIER_FEATURES.pro).toContain('advanced_analytics');
      expect(TIER_FEATURES.pro).toContain('custom_widgets');
      expect(TIER_FEATURES.pro).toContain('api_integrations');
      expect(TIER_FEATURES.pro).toContain('priority_support');
    });

    it('defines agency tier with premium features', () => {
      expect(TIER_FEATURES.agency).toContain('white_label');
      expect(TIER_FEATURES.agency).toContain('multi_tenant');
      expect(TIER_FEATURES.agency).toContain('custom_nodes');
      expect(TIER_FEATURES.agency).toContain('dedicated_support');
      expect(TIER_FEATURES.agency).toContain('sla');
    });

    it('includes all pro features in agency tier', () => {
      const proFeatures = TIER_FEATURES.pro;
      proFeatures.forEach((feature) => {
        expect(TIER_FEATURES.agency).toContain(feature);
      });
    });
  });

  describe('verifyLicense', () => {
    it('returns community tier when no license key provided', async () => {
      const result = await verifyLicense();

      expect(result.tier).toBe('community');
      expect(result.features).toEqual(TIER_FEATURES.community);
      expect(result.valid).toBe(true);
      expect(result.message).toContain('Community edition');
    });

    it('returns community tier when license key is empty string', async () => {
      const result = await verifyLicense('');

      expect(result.tier).toBe('community');
      expect(result.valid).toBe(true);
    });

    it('calls API with correct headers and body for valid key', async () => {
      const mockResponse = {
        tier: 'pro',
        features: TIER_FEATURES.pro,
        valid: true,
        message: 'License valid'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await verifyLicense('test-license-key');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.synthstack.app/api/v1/licenses/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-License-Key': 'test-license-key'
          },
          body: JSON.stringify({ product: 'directus-extension' })
        }
      );
    });

    it('returns pro tier on successful API response', async () => {
      const mockResponse = {
        tier: 'pro',
        features: TIER_FEATURES.pro,
        valid: true,
        expiresAt: '2025-12-31T23:59:59Z',
        organizationId: 'org-123'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await verifyLicense('valid-key');

      expect(result.tier).toBe('pro');
      expect(result.features).toEqual(TIER_FEATURES.pro);
      expect(result.valid).toBe(true);
      expect(result.key).toBe('valid-key');
      expect(result.organizationId).toBe('org-123');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('returns agency tier on successful API response', async () => {
      const mockResponse = {
        tier: 'agency',
        features: TIER_FEATURES.agency,
        valid: true
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await verifyLicense('agency-key');

      expect(result.tier).toBe('agency');
      expect(result.features).toEqual(TIER_FEATURES.agency);
    });

    it('returns community tier on 401 response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Unauthorized' })
      });

      const result = await verifyLicense('invalid-key');

      expect(result.tier).toBe('community');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Unauthorized');
    });

    it('returns community tier on 403 response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Forbidden' })
      });

      const result = await verifyLicense('forbidden-key');

      expect(result.tier).toBe('community');
      expect(result.valid).toBe(false);
    });

    it('returns community tier on network error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await verifyLicense('any-key');

      expect(result.tier).toBe('community');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Unable to verify license');
    });

    it('handles JSON parse error gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await verifyLicense('bad-response-key');

      expect(result.tier).toBe('community');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('License verification failed');
    });

    it('parses expiresAt date correctly', async () => {
      const expiresAt = '2025-06-15T12:00:00Z';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          tier: 'pro',
          valid: true,
          expiresAt
        })
      });

      const result = await verifyLicense('valid-key');

      expect(result.expiresAt).toBeInstanceOf(Date);
      // Compare timestamps instead of ISO strings to handle format differences
      expect(result.expiresAt?.getTime()).toBe(new Date(expiresAt).getTime());
    });

    it('handles missing expiresAt gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          tier: 'pro',
          valid: true
        })
      });

      const result = await verifyLicense('valid-key');

      expect(result.expiresAt).toBeUndefined();
    });

    it('falls back to tier features when features not in response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          tier: 'pro',
          valid: true
        })
      });

      const result = await verifyLicense('valid-key');

      expect(result.features).toEqual(TIER_FEATURES.pro);
    });

    it('handles valid: false in response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          tier: 'pro',
          valid: false,
          message: 'License expired'
        })
      });

      const result = await verifyLicense('expired-key');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('License expired');
    });
  });

  describe('hasFeature', () => {
    it('returns true for feature in license.features array', () => {
      const license: LicenseConfig = {
        tier: 'pro',
        features: ['dashboard', 'workflows', 'ai_agents'],
        valid: true
      };

      expect(hasFeature(license, 'workflows')).toBe(true);
      expect(hasFeature(license, 'ai_agents')).toBe(true);
    });

    it('returns false for feature not in array', () => {
      const license: LicenseConfig = {
        tier: 'community',
        features: TIER_FEATURES.community,
        valid: true
      };

      expect(hasFeature(license, 'workflows')).toBe(false);
      expect(hasFeature(license, 'ai_agents')).toBe(false);
      expect(hasFeature(license, 'white_label')).toBe(false);
    });

    it('works for community tier', () => {
      const license: LicenseConfig = {
        tier: 'community',
        features: TIER_FEATURES.community,
        valid: true
      };

      expect(hasFeature(license, 'dashboard')).toBe(true);
      expect(hasFeature(license, 'content_management')).toBe(true);
    });

    it('works for pro tier', () => {
      const license: LicenseConfig = {
        tier: 'pro',
        features: TIER_FEATURES.pro,
        valid: true
      };

      expect(hasFeature(license, 'workflows')).toBe(true);
      expect(hasFeature(license, 'ai_agents')).toBe(true);
      expect(hasFeature(license, 'white_label')).toBe(false);
    });

    it('works for agency tier', () => {
      const license: LicenseConfig = {
        tier: 'agency',
        features: TIER_FEATURES.agency,
        valid: true
      };

      expect(hasFeature(license, 'workflows')).toBe(true);
      expect(hasFeature(license, 'white_label')).toBe(true);
      expect(hasFeature(license, 'sla')).toBe(true);
    });

    it('returns false for empty features array', () => {
      const license: LicenseConfig = {
        tier: 'community',
        features: [],
        valid: true
      };

      expect(hasFeature(license, 'dashboard')).toBe(false);
    });
  });

  describe('meetsTierRequirement', () => {
    it('community meets community requirement', () => {
      const license: LicenseConfig = {
        tier: 'community',
        features: TIER_FEATURES.community,
        valid: true
      };

      expect(meetsTierRequirement(license, 'community')).toBe(true);
    });

    it('pro meets community requirement', () => {
      const license: LicenseConfig = {
        tier: 'pro',
        features: TIER_FEATURES.pro,
        valid: true
      };

      expect(meetsTierRequirement(license, 'community')).toBe(true);
    });

    it('pro meets pro requirement', () => {
      const license: LicenseConfig = {
        tier: 'pro',
        features: TIER_FEATURES.pro,
        valid: true
      };

      expect(meetsTierRequirement(license, 'pro')).toBe(true);
    });

    it('agency meets all requirements', () => {
      const license: LicenseConfig = {
        tier: 'agency',
        features: TIER_FEATURES.agency,
        valid: true
      };

      expect(meetsTierRequirement(license, 'community')).toBe(true);
      expect(meetsTierRequirement(license, 'pro')).toBe(true);
      expect(meetsTierRequirement(license, 'agency')).toBe(true);
    });

    it('community does not meet pro requirement', () => {
      const license: LicenseConfig = {
        tier: 'community',
        features: TIER_FEATURES.community,
        valid: true
      };

      expect(meetsTierRequirement(license, 'pro')).toBe(false);
    });

    it('community does not meet agency requirement', () => {
      const license: LicenseConfig = {
        tier: 'community',
        features: TIER_FEATURES.community,
        valid: true
      };

      expect(meetsTierRequirement(license, 'agency')).toBe(false);
    });

    it('pro does not meet agency requirement', () => {
      const license: LicenseConfig = {
        tier: 'pro',
        features: TIER_FEATURES.pro,
        valid: true
      };

      expect(meetsTierRequirement(license, 'agency')).toBe(false);
    });
  });

  describe('getUpgradeUrl', () => {
    it('returns base URL without feature', () => {
      const url = getUpgradeUrl();

      expect(url).toBe('https://synthstack.app/pricing');
    });

    it('returns URL with feature parameter', () => {
      const url = getUpgradeUrl('workflows');

      expect(url).toBe('https://synthstack.app/pricing?feature=workflows');
    });

    it('encodes feature parameter correctly', () => {
      const url = getUpgradeUrl('ai_agents');

      expect(url).toBe('https://synthstack.app/pricing?feature=ai_agents');
    });

    it('handles special characters in feature', () => {
      const url = getUpgradeUrl('feature with spaces');

      expect(url).toBe('https://synthstack.app/pricing?feature=feature%20with%20spaces');
    });

    it('returns base URL for empty string feature', () => {
      const url = getUpgradeUrl('');

      expect(url).toBe('https://synthstack.app/pricing');
    });
  });

  describe('requireFeature', () => {
    it('throws error when feature not available', async () => {
      const license: LicenseConfig = {
        tier: 'community',
        features: TIER_FEATURES.community,
        valid: true
      };

      const mockFn = vi.fn().mockResolvedValue('result');
      const wrappedFn = requireFeature('workflows', mockFn, license);

      await expect(wrappedFn()).rejects.toThrow('Feature "workflows" requires a Pro or Agency license');
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('executes function when feature available', async () => {
      const license: LicenseConfig = {
        tier: 'pro',
        features: TIER_FEATURES.pro,
        valid: true
      };

      const mockFn = vi.fn().mockResolvedValue('result');
      const wrappedFn = requireFeature('workflows', mockFn, license);

      const result = await wrappedFn();

      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('passes arguments to wrapped function', async () => {
      const license: LicenseConfig = {
        tier: 'pro',
        features: TIER_FEATURES.pro,
        valid: true
      };

      const mockFn = vi.fn().mockImplementation((a: number, b: number) => Promise.resolve(a + b));
      const wrappedFn = requireFeature('workflows', mockFn, license);

      const result = await wrappedFn(2, 3);

      expect(mockFn).toHaveBeenCalledWith(2, 3);
      expect(result).toBe(5);
    });

    it('error message includes upgrade URL', async () => {
      const license: LicenseConfig = {
        tier: 'community',
        features: TIER_FEATURES.community,
        valid: true
      };

      const mockFn = vi.fn().mockResolvedValue('result');
      const wrappedFn = requireFeature('ai_agents', mockFn, license);

      await expect(wrappedFn()).rejects.toThrow(
        'https://synthstack.app/pricing?feature=ai_agents'
      );
    });

    it('propagates errors from wrapped function', async () => {
      const license: LicenseConfig = {
        tier: 'pro',
        features: TIER_FEATURES.pro,
        valid: true
      };

      const mockFn = vi.fn().mockRejectedValue(new Error('Internal error'));
      const wrappedFn = requireFeature('workflows', mockFn, license);

      await expect(wrappedFn()).rejects.toThrow('Internal error');
    });
  });

  describe('createInitialLicenseState', () => {
    it('returns community tier', () => {
      const state = createInitialLicenseState();

      expect(state.license.tier).toBe('community');
    });

    it('sets features to community features', () => {
      const state = createInitialLicenseState();

      expect(state.license.features).toEqual(TIER_FEATURES.community);
    });

    it('sets valid to true', () => {
      const state = createInitialLicenseState();

      expect(state.license.valid).toBe(true);
    });

    it('sets loading to true', () => {
      const state = createInitialLicenseState();

      expect(state.loading).toBe(true);
    });

    it('sets error to null', () => {
      const state = createInitialLicenseState();

      expect(state.error).toBeNull();
    });
  });
});
