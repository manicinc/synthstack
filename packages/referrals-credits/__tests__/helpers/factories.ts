/**
 * Test entity factories
 */

import type { ReferralSeason, ReferralTier, ReferralCode, Referral, ReferralStats, ReferralReward } from '../../src/types/referral.js';
import type { DiscountCode } from '../../src/types/discount.js';

let idCounter = 0;

function generateId(prefix: string = 'test'): string {
  return `${prefix}-${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export function createSeason(overrides: Partial<ReferralSeason> = {}): ReferralSeason {
  return {
    id: generateId('season'),
    name: 'Test Season',
    slug: 'test-season',
    description: 'Test season description',
    start_date: '2024-01-01T00:00:00Z',
    end_date: undefined,
    is_active: true,
    is_default: true,
    config: {
      allow_self_referral: false,
      require_conversion: true,
      conversion_window_days: 30,
      min_purchase_for_conversion: 10,
      max_referrals_per_user: null,
      referral_code_prefix: 'REF',
    },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createTier(overrides: Partial<ReferralTier> = {}): ReferralTier {
  return {
    id: generateId('tier'),
    season_id: 'season-1',
    name: 'Test Tier',
    description: 'Test tier description',
    referrals_required: 5,
    reward_type: 'discount_code',
    reward_value: { percent: 10 },
    badge_icon: 'medal',
    badge_color: '#FFD700',
    is_stackable: false,
    is_active: true,
    sort_order: 1,
    ...overrides,
  };
}

export function createReferralCode(overrides: Partial<ReferralCode> = {}): ReferralCode {
  return {
    id: generateId('code'),
    user_id: 'user-1',
    code: `REF${generateId()}`.toUpperCase(),
    season_id: 'season-1',
    custom_code: undefined,
    clicks: 0,
    last_click_at: undefined,
    is_active: true,
    created_at: new Date().toISOString(),
    expires_at: undefined,
    ...overrides,
  };
}

export function createReferral(overrides: Partial<Referral> = {}): Referral {
  return {
    id: generateId('referral'),
    referrer_id: 'user-1',
    referred_user_id: undefined,
    referred_email: undefined,
    referral_code_id: 'code-1',
    season_id: 'season-1',
    status: 'clicked',
    click_date: new Date().toISOString(),
    signup_date: undefined,
    conversion_date: undefined,
    conversion_type: undefined,
    conversion_value: undefined,
    conversion_product: undefined,
    ip_address: '127.0.0.1',
    user_agent: 'Test Agent',
    utm_source: undefined,
    utm_medium: undefined,
    utm_campaign: undefined,
    ...overrides,
  };
}

export function createStats(overrides: Partial<ReferralStats> = {}): ReferralStats {
  return {
    id: generateId('stats'),
    user_id: 'user-1',
    season_id: 'season-1',
    total_clicks: 0,
    total_referrals: 0,
    successful_referrals: 0,
    pending_referrals: 0,
    expired_referrals: 0,
    total_conversions: 0,
    total_conversion_value: 0,
    total_rewards_earned: 0,
    total_rewards_claimed: 0,
    current_tier_id: undefined,
    next_tier_id: undefined,
    referrals_to_next_tier: undefined,
    leaderboard_rank: undefined,
    ...overrides,
  };
}

export function createDiscountCode(overrides: Partial<DiscountCode> = {}): DiscountCode {
  return {
    id: generateId('discount'),
    code: `SAVE${generateId()}`.toUpperCase(),
    name: 'Test Discount',
    description: 'Test discount description',
    type: 'percent',
    value: 10,
    applies_to: 'all',
    source: 'admin',
    max_uses: 100,
    max_uses_per_user: 1,
    current_uses: 0,
    min_purchase: undefined,
    max_discount: undefined,
    is_active: true,
    is_public: false,
    referral_reward_id: undefined,
    starts_at: undefined,
    expires_at: undefined,
    created_by: undefined,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createReward(overrides: Partial<ReferralReward> = {}): ReferralReward {
  return {
    id: generateId('reward'),
    user_id: 'user-1',
    tier_id: 'tier-1',
    season_id: 'season-1',
    reward_type: 'discount_code',
    reward_data: { percent: 10 },
    discount_code_id: undefined,
    is_unlocked: true,
    is_claimed: false,
    claimed_at: undefined,
    expires_at: undefined,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
