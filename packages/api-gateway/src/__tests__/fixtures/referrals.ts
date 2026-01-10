/**
 * Test Referral Fixtures
 *
 * Pre-defined referral data for testing the referral system
 */

export const TEST_REFERRAL_SEASON = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Test Season 2024',
  slug: 'test-2024',
  description: 'Test referral season for automated testing',
  isActive: true,
  isDefault: true,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2025-12-31'),
  config: {
    allowSelfReferral: false,
    requireConversion: true,
    conversionWindowDays: 30,
    minPurchaseForConversion: 0,
    maxReferralsPerUser: null,
    referralCodePrefix: 'TEST',
  },
};

export const TEST_REFERRAL_TIERS = [
  {
    id: '00000000-0000-0000-0000-000000000011',
    seasonId: TEST_REFERRAL_SEASON.id,
    name: 'Starter',
    description: 'First referral',
    referralsRequired: 1,
    rewardType: 'credits',
    rewardValue: { amount: 50 },
    badgeIcon: 'star',
    badgeColor: 'bronze',
    isStackable: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    seasonId: TEST_REFERRAL_SEASON.id,
    name: 'Bronze',
    description: 'Three referrals',
    referralsRequired: 3,
    rewardType: 'discount_code',
    rewardValue: { percent: 10 },
    badgeIcon: 'award',
    badgeColor: 'bronze',
    isStackable: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    seasonId: TEST_REFERRAL_SEASON.id,
    name: 'Silver',
    description: 'Five referrals',
    referralsRequired: 5,
    rewardType: 'credits',
    rewardValue: { amount: 100 },
    badgeIcon: 'medal',
    badgeColor: 'silver',
    isStackable: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: '00000000-0000-0000-0000-000000000014',
    seasonId: TEST_REFERRAL_SEASON.id,
    name: 'Gold',
    description: 'Ten referrals',
    referralsRequired: 10,
    rewardType: 'discount_code',
    rewardValue: { percent: 25 },
    badgeIcon: 'trophy',
    badgeColor: 'gold',
    isStackable: false,
    isActive: true,
    sortOrder: 4,
  },
];

export const TEST_REFERRAL_CODE = {
  id: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000006', // referrer@test.com
  code: 'TESTREF123',
  seasonId: TEST_REFERRAL_SEASON.id,
  clicks: 0,
  lastClickAt: null,
  isActive: true,
  expiresAt: null,
};

export interface CreateReferralParams {
  referrerId: string;
  referredEmail: string;
  referralCodeId: string;
  seasonId: string;
  status?: 'clicked' | 'signed_up' | 'converted' | 'expired' | 'rejected';
  conversionType?: string;
  conversionValue?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export function createTestReferral(params: CreateReferralParams) {
  return {
    id: crypto.randomUUID(),
    referrerId: params.referrerId,
    referredUserId: null,
    referredEmail: params.referredEmail,
    referralCodeId: params.referralCodeId,
    seasonId: params.seasonId,
    status: params.status || 'clicked',
    clickDate: new Date(),
    signupDate: params.status === 'signed_up' || params.status === 'converted' ? new Date() : null,
    conversionDate: params.status === 'converted' ? new Date() : null,
    conversionType: params.conversionType || null,
    conversionValue: params.conversionValue || null,
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    utmSource: params.utmSource || null,
    utmMedium: params.utmMedium || null,
    utmCampaign: params.utmCampaign || null,
  };
}

export const TEST_DISCOUNT_CODE = {
  id: '00000000-0000-0000-0000-000000000021',
  code: 'TEST10OFF',
  name: 'Test 10% Off',
  description: 'Test discount code',
  type: 'percent',
  value: 10,
  appliesTo: 'all',
  maxUses: 100,
  maxUsesPerUser: 1,
  currentUses: 0,
  minPurchase: null,
  maxDiscount: null,
  source: 'admin',
  isActive: true,
  isPublic: true,
  startsAt: new Date('2024-01-01'),
  expiresAt: new Date('2025-12-31'),
  createdBy: '00000000-0000-0000-0000-000000000001', // admin
  referralRewardId: null,
};
