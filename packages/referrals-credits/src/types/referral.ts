/**
 * Referral system types
 */

export interface ReferralSeason {
  id: string;
  name: string;
  slug: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  is_default: boolean;
  config: ReferralSeasonConfig;
  created_at: string;
  updated_at?: string;
}

export interface ReferralSeasonConfig {
  allow_self_referral: boolean;
  require_conversion: boolean;
  conversion_window_days: number;
  min_purchase_for_conversion: number;
  max_referrals_per_user: number | null;
  referral_code_prefix: string;
}

export interface ReferralTier {
  id: string;
  season_id: string;
  name: string;
  description?: string;
  referrals_required: number;
  reward_type: RewardType;
  reward_value: Record<string, unknown>;
  badge_icon?: string;
  badge_color?: string;
  is_stackable: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type RewardType = 'discount_code' | 'credits' | 'free_month' | 'tier_upgrade' | 'custom';

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  season_id?: string;
  custom_code?: string;
  clicks: number;
  last_click_at?: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id?: string;
  referred_email?: string;
  referral_code_id: string;
  season_id?: string;
  status: ReferralStatus;
  click_date?: string;
  signup_date?: string;
  conversion_date?: string;
  conversion_type?: string;
  conversion_value?: number;
  conversion_product?: string;
  ip_address?: string;
  user_agent?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at?: string;
}

export type ReferralStatus = 'clicked' | 'signed_up' | 'converted' | 'expired' | 'rejected';

export interface ReferralReward {
  id: string;
  user_id: string;
  tier_id: string;
  season_id?: string;
  reward_type: string;
  reward_data: Record<string, unknown>;
  discount_code_id?: string;
  is_unlocked: boolean;
  is_claimed: boolean;
  claimed_at?: string;
  expires_at?: string;
  created_at?: string;
  // Joined fields
  tier_name?: string;
  badge_icon?: string;
  badge_color?: string;
  discount_code?: string;
}

export interface ReferralStats {
  id?: string;
  user_id: string;
  season_id?: string;
  total_clicks: number;
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  expired_referrals?: number;
  total_conversions: number;
  total_conversion_value: number;
  total_rewards_earned: number;
  total_rewards_claimed: number;
  current_tier_id?: string;
  next_tier_id?: string;
  referrals_to_next_tier?: number;
  leaderboard_rank?: number;
  updated_at?: string;
}

export interface ClickMetadata {
  ip_address?: string;
  user_agent?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}
