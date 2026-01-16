/**
 * Referral and discount types for SynthStack
 */

export interface ReferralSeason {
  id: string;
  name: string;
  slug: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  config: ReferralSeasonConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralSeasonConfig {
  allowSelfReferral: boolean;
  requireConversion: boolean;
  conversionWindowDays: number;
  maxReferralsPerUser?: number;
  referralCodePrefix: string;
  minimumPurchaseAmount?: number;
}

export interface ReferralTier {
  id: string;
  seasonId: string;
  name: string;
  description?: string;
  requiredReferrals: number;
  rewardType: RewardType;
  rewardValue: number;
  badgeIcon?: string;
  badgeColor?: string;
  sortOrder: number;
}

export type RewardType =
  | 'discount_code'
  | 'credits'
  | 'free_month'
  | 'tier_upgrade'
  | 'custom';

export interface ReferralCode {
  id: string;
  userId: string;
  seasonId: string;
  code: string;
  customCode?: string;
  clicks: number;
  lastClickAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Referral {
  id: string;
  referralCodeId: string;
  referrerId: string;
  referredUserId?: string;
  status: ReferralStatus;
  clickDate: string;
  signupDate?: string;
  conversionDate?: string;
  conversionType?: string;
  conversionValue?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type ReferralStatus =
  | 'clicked'
  | 'signed_up'
  | 'converted'
  | 'expired'
  | 'rejected';

export interface ReferralStats {
  totalClicks: number;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalConversionValue: number;
  currentTier?: string;
  nextTier?: string;
  referralsToNextTier?: number;
  leaderboardRank?: number;
}

export interface ReferralReward {
  id: string;
  userId: string;
  tierId: string;
  seasonId: string;
  isUnlocked: boolean;
  isClaimed: boolean;
  claimedAt?: string;
  expiresAt?: string;
  discountCodeId?: string;
  createdAt: string;
}

// Discount codes
export type DiscountType = 'percent' | 'fixed' | 'free_month' | 'free_trial';
export type DiscountAppliesTo = 'lifetime' | 'subscription' | 'credits' | 'all';
export type DiscountSource = 'referral' | 'admin' | 'campaign' | 'partner';

export interface DiscountCode {
  id: string;
  code: string;
  name?: string;
  description?: string;
  type: DiscountType;
  value: number;
  appliesTo: DiscountAppliesTo;
  source: DiscountSource;
  maxUses?: number;
  maxUsesPerUser?: number;
  currentUses: number;
  minimumPurchase?: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface DiscountValidation {
  isValid: boolean;
  discountCode?: DiscountCode;
  discountAmount?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface DiscountUsage {
  id: string;
  discountCodeId: string;
  userId: string;
  orderId?: string;
  productId?: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  appliedAt: string;
}
