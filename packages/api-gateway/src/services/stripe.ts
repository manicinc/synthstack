/**
 * @file services/stripe.ts
 * @description Comprehensive Stripe service for subscription lifecycle management
 * @module @synthstack/api-gateway/services
 */

import Stripe from 'stripe';
import type { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';

// ============================================
// TYPES & INTERFACES
// ============================================

// Note: Subscription tiers for Stripe subscriptions (customer-facing).
// Agency is the top plan; there is no "unlimited" subscription tier.
export type SubscriptionTier = 'free' | 'maker' | 'pro' | 'agency';

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
  // Workflow credit settings
  workflowCreditMultiplier: number;      // Multiplier for workflow credit costs (1.0 = base)
  freeWorkflowExecutionsPerDay: number;  // Free executions before credits are charged
  workflowsEnabled: boolean;             // Whether workflows are available for this tier
}

export interface CreateCheckoutOptions {
  userId: string;
  email: string;
  tier: SubscriptionTier;
  isYearly?: boolean;
  trialDays?: number;
  promoCode?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CustomerPortalOptions {
  customerId: string;
  returnUrl?: string;
  flowType?: 'subscription_cancel' | 'subscription_update' | 'payment_method_update';
}

export interface SubscriptionChangeResult {
  success: boolean;
  subscription?: Stripe.Subscription;
  prorationAmount?: number;
  error?: string;
}

// ============================================
// TIER CONFIGURATION
// ============================================

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: 'free',
    displayName: 'Free',
    creditsPerDay: 10,
    rateLimitPerMinute: 10,
    rateLimitGeneration: 3,
    maxFileSize: 10 * 1024 * 1024,
    features: ['AI content generator', 'Starter templates', '10 credits per day'],
    // Workflows disabled for free tier
    workflowCreditMultiplier: 2.0,
    freeWorkflowExecutionsPerDay: 0,
    workflowsEnabled: false,
  },
  maker: {
    name: 'maker',
    displayName: 'Maker',
    creditsPerDay: 30,
    rateLimitPerMinute: 30,
    rateLimitGeneration: 15,
    maxFileSize: 50 * 1024 * 1024,
    features: [
      'Projects + private workspace',
      'Workflows (basic automation)',
      '30 credits per day',
      'API access',
      'Email support',
      '5 free workflow executions/day',
    ],
    stripePriceIdMonthly: config.stripe.prices.maker,
    stripePriceIdYearly: process.env.STRIPE_PRICE_MAKER_YEARLY,
    // Basic workflow access
    workflowCreditMultiplier: 1.5,
    freeWorkflowExecutionsPerDay: 5,
    workflowsEnabled: true,
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    creditsPerDay: 100,
    rateLimitPerMinute: 60,
    rateLimitGeneration: 30,
    maxFileSize: 200 * 1024 * 1024,
    features: [
      'Everything in Maker',
      'AI agents + Strategy Debates',
      'RAG Copilot (knowledge base)',
      '100 credits per day',
      'Priority processing',
      'API access',
      'Priority support',
      '20 free workflow executions/day',
    ],
    stripePriceIdMonthly: config.stripe.prices.pro,
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    // Full workflow access at base cost
    workflowCreditMultiplier: 1.0,
    freeWorkflowExecutionsPerDay: 20,
    workflowsEnabled: true,
  },
  agency: {
    name: 'agency',
    displayName: 'Agency',
    creditsPerDay: 500,
    rateLimitPerMinute: 100,
    rateLimitGeneration: 60,
    maxFileSize: 500 * 1024 * 1024,
    features: [
      'Everything in Pro',
      '500 credits/day',
      'Team collaboration',
      'White-labeling + custom branding',
      'Dedicated support',
      '100 free workflow executions/day',
      '25% workflow discount',
    ],
    stripePriceIdMonthly: config.stripe.prices.agency,
    stripePriceIdYearly: process.env.STRIPE_PRICE_AGENCY_YEARLY,
    // Premium workflow access with discount
    workflowCreditMultiplier: 0.75,
    freeWorkflowExecutionsPerDay: 100,
    workflowsEnabled: true,
  },
};

// Extended tier config for additional tiers (non-subscription tiers)
export const EXTENDED_TIER_CONFIG: Record<string, Partial<TierConfig>> = {
  lifetime: {
    workflowCreditMultiplier: 0.8,
    freeWorkflowExecutionsPerDay: 30,
    workflowsEnabled: true,
  },
  enterprise: {
    workflowCreditMultiplier: 0.5,
    freeWorkflowExecutionsPerDay: 500,
    workflowsEnabled: true,
  },
  // Backwards-compatibility alias: old installs may still have `unlimited` stored.
  // Treat it as `agency` (high limits, not actually unlimited).
  unlimited: {
    workflowCreditMultiplier: 0.75,
    freeWorkflowExecutionsPerDay: 100,
    workflowsEnabled: true,
  },
};

/**
 * Normalize a raw stored tier to a supported subscription tier.
 *
 * - `unlimited` (legacy) → `agency`
 * - `enterprise` (non-subscription) → `agency` for feature/rate-limit config lookups
 * - `lifetime` (non-subscription) → `pro` for feature/rate-limit config lookups
 */
export function normalizeSubscriptionTier(tier: string | null | undefined): SubscriptionTier {
  const raw = (tier || 'free').toLowerCase();
  if (raw === 'unlimited') return 'agency';
  if (raw === 'enterprise') return 'agency';
  if (raw === 'lifetime') return 'pro';
  if (raw === 'free' || raw === 'maker' || raw === 'pro' || raw === 'agency') return raw;
  return 'free';
}

/**
 * Get the TierConfig for a raw stored tier (handles legacy/extended tiers).
 */
export function getTierConfigForUser(tier: string | null | undefined): TierConfig {
  return TIER_CONFIG[normalizeSubscriptionTier(tier)];
}

/**
 * Get the daily AI credits limit for a raw stored tier.
 * Enterprise is treated as unlimited (Infinity).
 */
export function getAICreditsPerDayForTier(tier: string | null | undefined): number {
  const raw = (tier || 'free').toLowerCase();
  if (raw === 'enterprise') return Infinity;
  return getTierConfigForUser(raw).creditsPerDay;
}

/**
 * Get workflow config for any tier (including extended tiers)
 */
export function getWorkflowConfigForTier(tier: string): {
  workflowCreditMultiplier: number;
  freeWorkflowExecutionsPerDay: number;
  workflowsEnabled: boolean;
} {
  // Check standard tiers first
  if (tier in TIER_CONFIG) {
    const config = TIER_CONFIG[tier as SubscriptionTier];
    return {
      workflowCreditMultiplier: config.workflowCreditMultiplier,
      freeWorkflowExecutionsPerDay: config.freeWorkflowExecutionsPerDay,
      workflowsEnabled: config.workflowsEnabled,
    };
  }
  
  // Check extended tiers
  if (tier in EXTENDED_TIER_CONFIG) {
    const config = EXTENDED_TIER_CONFIG[tier];
    return {
      workflowCreditMultiplier: config.workflowCreditMultiplier ?? 1.0,
      freeWorkflowExecutionsPerDay: config.freeWorkflowExecutionsPerDay ?? 0,
      workflowsEnabled: config.workflowsEnabled ?? false,
    };
  }
  
  // Default to free tier settings
  return {
    workflowCreditMultiplier: 2.0,
    freeWorkflowExecutionsPerDay: 0,
    workflowsEnabled: false,
  };
}

// ============================================
// STRIPE SERVICE CLASS
// ============================================

export class StripeService {
  private stripe: Stripe | null = null;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    if (config.stripe.secretKey) {
      this.stripe = new Stripe(config.stripe.secretKey, {
        apiVersion: '2025-02-24.acacia',
        typescript: true,
      });
    } else {
      fastify.log.warn('⚠️ Stripe not configured - payment features disabled');
    }
  }

  async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string | null> {
    if (!this.stripe) return null;

    const result = await this.fastify.pg.query(
      'SELECT stripe_customer_id FROM app_users WHERE id = $1',
      [userId]
    );

    if (result.rows[0]?.stripe_customer_id) {
      return result.rows[0].stripe_customer_id;
    }

    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: { user_id: userId, source: 'synthstack' },
      });

      await this.fastify.pg.query(
        'UPDATE app_users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
        [customer.id, userId]
      );

      return customer.id;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to create Stripe customer');
      return null;
    }
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    if (!this.stripe) return null;
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) return null;
      return customer as Stripe.Customer;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to retrieve Stripe customer');
      return null;
    }
  }

  async updateCustomer(customerId: string, updates: Stripe.CustomerUpdateParams): Promise<Stripe.Customer | null> {
    if (!this.stripe) return null;
    try {
      return await this.stripe.customers.update(customerId, updates);
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to update Stripe customer');
      return null;
    }
  }

  async createCheckoutSession(options: CreateCheckoutOptions): Promise<{ url: string; sessionId: string } | null> {
    if (!this.stripe) return null;

    const tierConfig = TIER_CONFIG[options.tier];
    if (!tierConfig) throw new Error('Invalid tier: ' + options.tier);

    const priceId = options.isYearly ? tierConfig.stripePriceIdYearly : tierConfig.stripePriceIdMonthly;
    if (!priceId) throw new Error('No price configured for tier: ' + options.tier);

    const customerId = await this.getOrCreateCustomer(options.userId, options.email);

    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        customer: customerId || undefined,
        customer_email: customerId ? undefined : options.email,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: options.successUrl || process.env.FRONTEND_URL + '/app?subscription=success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: options.cancelUrl || process.env.FRONTEND_URL + '/pricing?subscription=cancelled',
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        tax_id_collection: { enabled: true },
        customer_update: customerId ? { address: 'auto', name: 'auto' } : undefined,
        metadata: {
          user_id: options.userId,
          tier: options.tier,
          is_yearly: options.isYearly ? 'true' : 'false',
        },
        subscription_data: {
          metadata: { user_id: options.userId, tier: options.tier },
          trial_period_days: options.trialDays,
        },
      };

      if (options.promoCode) {
        const promos = await this.stripe.promotionCodes.list({ code: options.promoCode, active: true, limit: 1 });
        if (promos.data.length > 0) {
          sessionParams.discounts = [{ promotion_code: promos.data[0].id }];
          sessionParams.allow_promotion_codes = false;
        }
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);
      return { url: session.url!, sessionId: session.id };
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to create checkout session');
      throw error;
    }
  }

  async createPortalSession(options: CustomerPortalOptions): Promise<{ url: string } | null> {
    if (!this.stripe) return null;

    try {
      const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
        customer: options.customerId,
        return_url: options.returnUrl || process.env.FRONTEND_URL + '/app/settings/billing',
      };

      if (options.flowType) {
        sessionParams.flow_data = { type: options.flowType };
      }

      const session = await this.stripe.billingPortal.sessions.create(sessionParams);
      return { url: session.url };
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to create portal session');
      return null;
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    if (!this.stripe) return null;
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method', 'latest_invoice'],
      });
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to retrieve subscription');
      return null;
    }
  }

  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    if (!this.stripe) return [];
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method'],
      });
      return subscriptions.data;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to list subscriptions');
      return [];
    }
  }

  async changeSubscriptionTier(subscriptionId: string, newTier: SubscriptionTier, isYearly?: boolean): Promise<SubscriptionChangeResult> {
    if (!this.stripe) return { success: false, error: 'Stripe not configured' };

    const tierConfig = TIER_CONFIG[newTier];
    const priceId = isYearly ? tierConfig.stripePriceIdYearly : tierConfig.stripePriceIdMonthly;
    if (!priceId) return { success: false, error: 'No price for tier: ' + newTier };

    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const currentItemId = subscription.items.data[0]?.id;
      if (!currentItemId) return { success: false, error: 'No subscription items found' };

      const updated = await this.stripe.subscriptions.update(subscriptionId, {
        items: [{ id: currentItemId, price: priceId }],
        proration_behavior: 'create_prorations',
        metadata: { tier: newTier, changed_at: new Date().toISOString() },
      });

      let prorationAmount = 0;
      if (updated.latest_invoice && typeof updated.latest_invoice === 'object') {
        const invoice = updated.latest_invoice as Stripe.Invoice;
        prorationAmount = invoice.amount_due - invoice.amount_paid;
      }

      return { success: true, subscription: updated, prorationAmount };
    } catch (error: any) {
      this.fastify.log.error({ error }, 'Failed to change subscription tier');
      return { success: false, error: error.message };
    }
  }

  async cancelSubscription(subscriptionId: string, immediately?: boolean, feedback?: { reason: string; comment?: string }): Promise<Stripe.Subscription | null> {
    if (!this.stripe) return null;

    try {
      if (immediately) {
        return await this.stripe.subscriptions.cancel(subscriptionId, {
          cancellation_details: feedback ? {
            comment: feedback.comment,
            feedback: this.mapCancellationReason(feedback.reason),
          } : undefined,
        });
      }

      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        cancellation_details: feedback ? {
          comment: feedback.comment,
          feedback: this.mapCancellationReason(feedback.reason),
        } : undefined,
      });
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to cancel subscription');
      return null;
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    if (!this.stripe) return null;
    try {
      return await this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to reactivate subscription');
      return null;
    }
  }

  async pauseSubscription(subscriptionId: string, resumeAt?: Date): Promise<Stripe.Subscription | null> {
    if (!this.stripe) return null;
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'void',
          resumes_at: resumeAt ? Math.floor(resumeAt.getTime() / 1000) : undefined,
        },
      });
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to pause subscription');
      return null;
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    if (!this.stripe) return null;
    try {
      return await this.stripe.subscriptions.update(subscriptionId, { pause_collection: '' });
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to resume subscription');
      return null;
    }
  }

  async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    if (!this.stripe) return [];
    try {
      const methods = await this.stripe.paymentMethods.list({ customer: customerId, type: 'card' });
      return methods.data;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to list payment methods');
      return [];
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<boolean> {
    if (!this.stripe) return false;
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      return true;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to set default payment method');
      return false;
    }
  }

  async createSetupIntent(customerId: string): Promise<{ clientSecret: string } | null> {
    if (!this.stripe) return null;
    try {
      const intent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });
      return { clientSecret: intent.client_secret! };
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to create setup intent');
      return null;
    }
  }

  async getInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    if (!this.stripe) return [];
    try {
      const invoices = await this.stripe.invoices.list({ customer: customerId, limit });
      return invoices.data;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to list invoices');
      return [];
    }
  }

  async getUpcomingInvoice(customerId: string, subscriptionId?: string, newPriceId?: string): Promise<Stripe.UpcomingInvoice | null> {
    if (!this.stripe) return null;
    try {
      const params: Stripe.InvoiceRetrieveUpcomingParams = { customer: customerId };

      if (subscriptionId && newPriceId) {
        const subscription = await this.getSubscription(subscriptionId);
        if (subscription) {
          params.subscription = subscriptionId;
          params.subscription_items = [{ id: subscription.items.data[0]?.id, price: newPriceId }];
          params.subscription_proration_behavior = 'create_prorations';
        }
      }

      return await this.stripe.invoices.retrieveUpcoming(params);
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to retrieve upcoming invoice');
      return null;
    }
  }

  async createCreditPurchaseSession(userId: string, email: string, credits: number, priceInCents: number): Promise<{ url: string; sessionId: string } | null> {
    if (!this.stripe) return null;

    const customerId = await this.getOrCreateCustomer(userId, email);

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId || undefined,
        customer_email: customerId ? undefined : email,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: credits + ' Credits',
              description: 'One-time purchase of ' + credits + ' generation credits',
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        }],
        success_url: process.env.FRONTEND_URL + '/app?credits=success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: process.env.FRONTEND_URL + '/pricing?credits=cancelled',
        metadata: { user_id: userId, credits: credits.toString(), type: 'credit_purchase' },
      });

      return { url: session.url!, sessionId: session.id };
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to create credit purchase session');
      return null;
    }
  }

  async createLifetimeLicenseCheckout(email?: string, promoCode?: string): Promise<{ url: string; sessionId: string } | null> {
    if (!this.stripe) return null;

    // Use lifetime Pro price from config (preferred), fallback to env var for backwards compat
    const priceId = config.stripe.prices.lifetimePro || process.env.STRIPE_PRICE_LIFETIME;
    if (!priceId) {
      this.fastify.log.error('STRIPE_PRICE_LIFETIME_PRO not configured');
      return null;
    }

    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        customer_email: email,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: process.env.FRONTEND_URL + '/license-access?session={CHECKOUT_SESSION_ID}',
        cancel_url: process.env.FRONTEND_URL + '/?license=cancelled',
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        tax_id_collection: { enabled: true },
        metadata: { type: 'lifetime_license' },
      };

      if (promoCode) {
        const promos = await this.stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
        if (promos.data.length > 0) {
          sessionParams.discounts = [{ promotion_code: promos.data[0].id }];
          sessionParams.allow_promotion_codes = false;
        }
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);
      return { url: session.url!, sessionId: session.id };
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to create lifetime license checkout');
      return null;
    }
  }

  /**
   * Get promotion code statistics
   */
  async getPromoCodeStats(code: string): Promise<{
    code: string;
    discount: string;
    maxRedemptions: number | null;
    timesRedeemed: number;
    remaining: number | null;
    percentUsed: number;
    active: boolean;
  } | null> {
    if (!this.stripe) return null;

    try {
      const promos = await this.stripe.promotionCodes.list({ code, limit: 1 });
      if (promos.data.length === 0) return null;

      const promo = promos.data[0];
      const couponId = typeof promo.coupon === 'string' ? promo.coupon : promo.coupon.id;
      const coupon = await this.stripe.coupons.retrieve(couponId);

      const maxRedemptions = coupon.max_redemptions || null;
      const timesRedeemed = coupon.times_redeemed || 0;
      const remaining = maxRedemptions ? maxRedemptions - timesRedeemed : null;
      const percentUsed = maxRedemptions ? Math.round((timesRedeemed / maxRedemptions) * 100) : 0;

      let discount = '';
      if (coupon.amount_off) {
        discount = `$${(coupon.amount_off / 100).toFixed(0)} off`;
      } else if (coupon.percent_off) {
        discount = `${coupon.percent_off}% off`;
      }

      return {
        code,
        discount,
        maxRedemptions,
        timesRedeemed,
        remaining,
        percentUsed,
        active: promo.active,
      };
    } catch (error) {
      this.fastify.log.error({ error, code }, 'Failed to get promo code stats');
      return null;
    }
  }

  verifyWebhook(payload: Buffer | string, signature: string): Stripe.Event | null {
    if (!this.stripe || !config.stripe.webhookSecret) return null;
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
    } catch (error) {
      this.fastify.log.error({ error }, 'Webhook signature verification failed');
      return null;
    }
  }

  getTierFromPriceId(priceId: string): SubscriptionTier {
    for (const [tier, cfg] of Object.entries(TIER_CONFIG)) {
      if (cfg.stripePriceIdMonthly === priceId || cfg.stripePriceIdYearly === priceId) {
        return tier as SubscriptionTier;
      }
    }
    return 'free';
  }

  getTierConfig(tier: SubscriptionTier): TierConfig {
    return TIER_CONFIG[tier];
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  private mapCancellationReason(reason: string): Stripe.SubscriptionCancelParams.CancellationDetails.Feedback {
    const mapping: Record<string, Stripe.SubscriptionCancelParams.CancellationDetails.Feedback> = {
      too_expensive: 'too_expensive',
      missing_features: 'missing_features',
      switched_service: 'switched_service',
      unused: 'unused',
      customer_service: 'customer_service',
      too_complex: 'too_complex',
      low_quality: 'low_quality',
    };
    return mapping[reason] || 'other';
  }
}

// Singleton
let stripeServiceInstance: StripeService | null = null;

export function initStripeService(fastify: FastifyInstance): StripeService {
  if (!stripeServiceInstance) {
    stripeServiceInstance = new StripeService(fastify);
  }
  return stripeServiceInstance;
}

export function getStripeService(): StripeService {
  if (!stripeServiceInstance) {
    throw new Error('Stripe service not initialized');
  }
  return stripeServiceInstance;
}

export default StripeService;
