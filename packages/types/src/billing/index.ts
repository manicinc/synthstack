/**
 * Billing and subscription types for SynthStack
 */

export type SubscriptionTier = 'free' | 'maker' | 'pro' | 'agency' | 'unlimited';

export interface TierConfig {
  name: string;
  displayName: string;
  creditsPerDay: number;
  rateLimitPerMinute: number;
  rateLimitGeneration: number;
  maxFileSize: number;
  features: string[];
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  workflowCreditMultiplier: number;
  freeWorkflowExecutionsPerDay: number;
  workflowsEnabled: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid';

export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type CreditTransactionType =
  | 'debit'
  | 'credit'
  | 'purchase'
  | 'refund'
  | 'adjustment'
  | 'bonus'
  | 'referral';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  stripePriceId: string;
  isFeatured: boolean;
  sortOrder: number;
}

export interface Invoice {
  id: string;
  userId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paidAt?: string;
  createdAt: string;
}

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
