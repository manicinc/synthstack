/**
 * SynthStack License Verification for Directus Extensions
 * 
 * This module provides license checking functionality to gate premium features
 * in the Directus extension. Free features work without a license, while
 * premium features require a valid SynthStack Pro or Agency license.
 */

export type LicenseTier = 'community' | 'pro' | 'agency';

export interface LicenseConfig {
  key?: string;
  tier: LicenseTier;
  features: string[];
  expiresAt?: Date;
  organizationId?: string;
  valid: boolean;
  message?: string;
}

// Features available in each tier
export const TIER_FEATURES: Record<LicenseTier, string[]> = {
  community: [
    'dashboard',
    'content_management',
    'translations',
    'audit_log',
    'webhooks',
    'basic_analytics'
  ],
  pro: [
    'dashboard',
    'content_management',
    'translations',
    'audit_log',
    'webhooks',
    'basic_analytics',
    'workflows',
    'ai_agents',
    'advanced_analytics',
    'custom_widgets',
    'api_integrations',
    'priority_support'
  ],
  agency: [
    'dashboard',
    'content_management',
    'translations',
    'audit_log',
    'webhooks',
    'basic_analytics',
    'workflows',
    'ai_agents',
    'advanced_analytics',
    'custom_widgets',
    'api_integrations',
    'priority_support',
    'white_label',
    'multi_tenant',
    'custom_nodes',
    'dedicated_support',
    'sla'
  ]
};

const SYNTHSTACK_LICENSE_API = 'https://api.synthstack.app/api/v1/licenses';
const DEMO_MODE = import.meta.env?.VITE_SYNTHSTACK_DEMO_MODE === 'true';

/**
 * Verify a SynthStack license key
 */
export async function verifyLicense(licenseKey?: string): Promise<LicenseConfig> {
  // Demo mode - return pro features for testing
  if (DEMO_MODE) {
    console.warn('[SynthStack] Running in DEMO MODE - all features enabled');
    return {
      tier: 'pro',
      features: TIER_FEATURES.pro,
      valid: true,
      message: 'Demo mode active'
    };
  }

  // No license key - community tier
  if (!licenseKey) {
    return {
      tier: 'community',
      features: TIER_FEATURES.community,
      valid: true,
      message: 'Community edition - upgrade for premium features'
    };
  }

  try {
    const response = await fetch(`${SYNTHSTACK_LICENSE_API}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-License-Key': licenseKey
      },
      body: JSON.stringify({ product: 'directus-extension' })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        tier: 'community',
        features: TIER_FEATURES.community,
        valid: false,
        message: error.message || 'License verification failed'
      };
    }

    const data = await response.json();
    
    return {
      key: licenseKey,
      tier: data.tier || 'community',
      features: data.features || TIER_FEATURES[data.tier as LicenseTier] || TIER_FEATURES.community,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      organizationId: data.organizationId,
      valid: data.valid !== false,
      message: data.message
    };
  } catch (error) {
    console.error('[SynthStack] License verification error:', error);
    return {
      tier: 'community',
      features: TIER_FEATURES.community,
      valid: false,
      message: 'Unable to verify license - using community features'
    };
  }
}

/**
 * Check if a specific feature is available for the given license
 */
export function hasFeature(license: LicenseConfig, feature: string): boolean {
  return license.features.includes(feature);
}

/**
 * Check if the license tier meets the minimum required tier
 */
export function meetsTierRequirement(license: LicenseConfig, requiredTier: LicenseTier): boolean {
  const tierOrder: LicenseTier[] = ['community', 'pro', 'agency'];
  const currentIndex = tierOrder.indexOf(license.tier);
  const requiredIndex = tierOrder.indexOf(requiredTier);
  return currentIndex >= requiredIndex;
}

/**
 * Get upgrade URL for a specific feature
 */
export function getUpgradeUrl(feature?: string): string {
  const baseUrl = 'https://synthstack.app/pricing';
  if (feature) {
    return `${baseUrl}?feature=${encodeURIComponent(feature)}`;
  }
  return baseUrl;
}

/**
 * Create a license-gated wrapper for async functions
 */
export function requireFeature<T extends (...args: any[]) => Promise<any>>(
  feature: string,
  fn: T,
  license: LicenseConfig
): T {
  return (async (...args: Parameters<T>) => {
    if (!hasFeature(license, feature)) {
      throw new Error(
        `Feature "${feature}" requires a Pro or Agency license. ` +
        `Upgrade at ${getUpgradeUrl(feature)}`
      );
    }
    return fn(...args);
  }) as T;
}

/**
 * License state management for Vue components
 */
export interface LicenseState {
  license: LicenseConfig;
  loading: boolean;
  error: string | null;
}

export function createInitialLicenseState(): LicenseState {
  return {
    license: {
      tier: 'community',
      features: TIER_FEATURES.community,
      valid: true
    },
    loading: true,
    error: null
  };
}


