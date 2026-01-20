/**
 * @file routes/billing.ts
 * @description Comprehensive billing routes for subscription and payment management
 * @module @synthstack/api-gateway/routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getStripeService, TIER_CONFIG, getTierConfigForUser, type SubscriptionTier } from '../services/stripe.js';

// ============================================
// TYPES
// ============================================

interface CheckoutBody {
  tier: SubscriptionTier;
  isYearly?: boolean;
  promoCode?: string;
}

interface ChangeTierBody {
  newTier: SubscriptionTier;
  isYearly?: boolean;
}

interface CancelBody {
  immediately?: boolean;
  reason?: string;
  comment?: string;
}

interface CreditPurchaseBody {
  credits: number;
  packageId?: string;
}

interface CreditPackageRow {
  id: string;
  status: string;
  name: string;
  description: string | null;
  credits: number;
  price_cents: number;
  stripe_price_id: string | null;
  is_active: boolean;
  is_featured: boolean;
  badge_text: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// BILLING ROUTES
// ============================================

export default async function billingRoutes(fastify: FastifyInstance) {
  const stripeService = getStripeService();

  // ============================================
  // LIFETIME LICENSE CHECKOUT (Public)
  // ============================================

  /**
   * POST /api/v1/billing/lifetime-checkout
   * Create a Stripe Checkout session for lifetime license (public endpoint)
   */
  fastify.post<{ Body: { email?: string; promoCode?: string } }>('/lifetime-checkout', {
    schema: {
      tags: ['Billing'],
      summary: 'Create lifetime license checkout',
      description: 'Creates a Stripe Checkout session for one-time lifetime license purchase',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          promoCode: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { email, promoCode } = request.body;

      if (!stripeService.isConfigured()) {
        return reply.status(500).send({ success: false, error: 'Stripe not configured' });
      }

      const session = await stripeService.createLifetimeLicenseCheckout(email, promoCode);

      if (!session) {
        return reply.status(500).send({ success: false, error: 'Failed to create checkout' });
      }

      return {
        success: true,
        data: {
          checkoutUrl: session.url,
          sessionId: session.sessionId,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message || 'Checkout failed' });
    }
  });

  /**
   * GET /api/v1/billing/promo-stats
   * Get promotion code statistics (public endpoint)
   */
  fastify.get<{ Querystring: { code: string } }>('/promo-stats', {
    schema: {
      tags: ['Billing'],
      summary: 'Get promo code statistics',
      description: 'Returns statistics for a promotion code including redemption count',
      querystring: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', description: 'Promotion code (e.g., EARLYSYNTH)' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { code } = request.query;

      if (!code) {
        return reply.status(400).send({ success: false, error: 'Promo code is required' });
      }

      if (!stripeService.isConfigured()) {
        // Promo stats are informational (landing pages). Avoid hard failures / noisy 5xx.
        return reply.send({ success: false, data: null, error: 'Stripe not configured' });
      }

      const stats = await stripeService.getPromoCodeStats(code);

      if (!stats) {
        // Avoid noisy 404s on the marketing site if the code isn't provisioned yet.
        return reply.send({ success: false, data: null, error: 'Promo code not found' });
      }

      return {
        success: true,
        data: stats,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message || 'Failed to fetch promo stats' });
    }
  });

  // ============================================
  // SUBSCRIPTION PLANS
  // ============================================

  /**
   * GET /api/v1/billing/plans
   * Get all available subscription plans
   */
  fastify.get('/plans', {
    schema: {
      tags: ['Billing'],
      summary: 'Get subscription plans',
      description: 'Returns all active subscription plans with pricing and features',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                plans: { type: 'array' },
                tiers: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const result = await fastify.pg.query(`
        SELECT * FROM subscription_plans 
        WHERE is_active = TRUE 
        ORDER BY sort_order ASC
      `);

      return {
        success: true,
        data: {
          plans: result.rows,
          tiers: TIER_CONFIG,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch plans' });
    }
  });

  // ============================================
  // CURRENT SUBSCRIPTION
  // ============================================

  /**
   * GET /api/v1/billing/subscription
   * Get current user's subscription status
   */
  fastify.get('/subscription', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Get current subscription',
      description: 'Returns the current user subscription status and details',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;

      const result = await fastify.pg.query(`
        SELECT 
          u.subscription_tier,
          u.subscription_status,
          u.subscription_id,
          u.stripe_customer_id,
          u.subscription_started_at,
          u.subscription_ends_at,
          u.credits_remaining,
          u.lifetime_credits_used,
          u.credits_reset_at,
          sp.*
        FROM app_users u
        LEFT JOIN subscription_plans sp ON u.subscription_tier = sp.tier
        WHERE u.id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const user = result.rows[0];
      const tierConfig = getTierConfigForUser(user.subscription_tier);

      // Get subscription details from Stripe if available
      let stripeSubscription = null;
      if (user.subscription_id && stripeService.isConfigured()) {
        stripeSubscription = await stripeService.getSubscription(user.subscription_id);
      }

      return {
        success: true,
        data: {
          tier: user.subscription_tier,
          status: user.subscription_status,
          plan: {
            id: user.id,
            name: user.name,
            description: user.description,
            priceMonthly: user.price_monthly_cents / 100,
            priceYearly: user.price_yearly_cents / 100,
            features: user.features,
          },
          limits: {
            creditsPerDay: tierConfig.creditsPerDay,
            rateLimitPerMinute: tierConfig.rateLimitPerMinute,
            maxFileSize: tierConfig.maxFileSize,
          },
          credits: {
            remaining: user.credits_remaining,
            lifetimeUsed: user.lifetime_credits_used,
            resetsAt: user.credits_reset_at,
          },
          billing: {
            stripeCustomerId: user.stripe_customer_id,
            subscriptionId: user.subscription_id,
            startedAt: user.subscription_started_at,
            endsAt: user.subscription_ends_at,
            cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
          },
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch subscription' });
    }
  });

  // ============================================
  // CHECKOUT
  // ============================================

  /**
   * POST /api/v1/billing/checkout
   * Create a Stripe Checkout session for subscription
   */
  fastify.post<{ Body: CheckoutBody }>('/checkout', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Create checkout session',
      description: 'Creates a Stripe Checkout session for subscription',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['tier'],
        properties: {
          tier: { type: 'string', enum: ['maker', 'pro', 'agency', 'unlimited'] },
          isYearly: { type: 'boolean', default: false },
          promoCode: { type: 'string' },
        },
      },
    },
  }, async (request: any, reply) => {
    try {
      const { tier, isYearly, promoCode } = request.body;
      const userId = request.user.id;
      const email = request.user.email;

      if (tier === 'free') {
        return reply.status(400).send({ success: false, error: 'Cannot checkout free tier' });
      }

      if (!stripeService.isConfigured()) {
        return reply.status(500).send({ success: false, error: 'Stripe not configured' });
      }

      // DB schema may store the top tier as `unlimited`; Stripe config/env may call it `agency`.
      const checkoutTier = tier === 'unlimited' ? 'agency' : tier;

      const session = await stripeService.createCheckoutSession({
        userId,
        email,
        tier: checkoutTier as SubscriptionTier,
        isYearly,
        promoCode,
        trialDays: 3,
      });

      if (!session) {
        return reply.status(500).send({ success: false, error: 'Failed to create checkout' });
      }

      return {
        success: true,
        data: {
          checkoutUrl: session.url,
          sessionId: session.sessionId,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message || 'Checkout failed' });
    }
  });

  // ============================================
  // CUSTOMER PORTAL
  // ============================================

  /**
   * POST /api/v1/billing/portal
   * Create a Stripe Customer Portal session
   */
  fastify.post('/portal', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Create billing portal session',
      description: 'Creates a Stripe Customer Portal session for self-service billing management',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;

      const result = await fastify.pg.query(
        'SELECT stripe_customer_id FROM app_users WHERE id = $1',
        [userId]
      );

      const customerId = result.rows[0]?.stripe_customer_id;
      if (!customerId) {
        return reply.status(400).send({ success: false, error: 'No billing account found' });
      }

      if (!stripeService.isConfigured()) {
        return reply.status(500).send({ success: false, error: 'Stripe not configured' });
      }

      const session = await stripeService.createPortalSession({ customerId });
      if (!session) {
        return reply.status(500).send({ success: false, error: 'Failed to create portal' });
      }

      return {
        success: true,
        data: { portalUrl: session.url },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Portal creation failed' });
    }
  });

  // ============================================
  // CHANGE PLAN
  // ============================================

  /**
   * POST /api/v1/billing/change-plan
   * Change subscription tier (upgrade/downgrade)
   */
  fastify.post<{ Body: ChangeTierBody }>('/change-plan', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Change subscription plan',
      description: 'Upgrades or downgrades the current subscription with proration',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['newTier'],
        properties: {
          newTier: { type: 'string', enum: ['free', 'maker', 'pro', 'agency', 'unlimited'] },
          isYearly: { type: 'boolean' },
        },
      },
    },
  }, async (request: any, reply) => {
    try {
      const { newTier, isYearly } = request.body;
      const userId = request.user.id;

      const result = await fastify.pg.query(
        'SELECT subscription_id, subscription_tier FROM app_users WHERE id = $1',
        [userId]
      );

      const currentSubscriptionId = result.rows[0]?.subscription_id;
      const currentTier = result.rows[0]?.subscription_tier;

      if (!currentSubscriptionId) {
        // No active subscription, redirect to checkout
        return reply.status(400).send({
          success: false,
          error: 'No active subscription. Please create a new subscription.',
          action: 'checkout',
        });
      }

      if (newTier === currentTier) {
        return reply.status(400).send({ success: false, error: 'Already on this plan' });
      }

      if (newTier === 'free') {
        // Downgrade to free = cancel
        return reply.status(400).send({
          success: false,
          error: 'To downgrade to free, please cancel your subscription.',
          action: 'cancel',
        });
      }

      const stripeTier = newTier === 'unlimited' ? 'agency' : newTier;
      const storedTier = newTier === 'agency' ? 'unlimited' : newTier;

      const changeResult = await stripeService.changeSubscriptionTier(
        currentSubscriptionId,
        stripeTier as SubscriptionTier,
        isYearly
      );

      if (!changeResult.success) {
        return reply.status(400).send({ success: false, error: changeResult.error });
      }

      const tierRank = (raw: string | null | undefined): number => {
        const t = (raw || 'free').toLowerCase();
        if (t === 'maker') return 1;
        if (t === 'pro') return 2;
        if (t === 'agency' || t === 'unlimited') return 3;
        return 0;
      };

      // Log the change
      await fastify.pg.query(`
        INSERT INTO subscription_history (user_id, action, from_tier, to_tier, stripe_subscription_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        tierRank(storedTier) > tierRank(currentTier) ? 'upgraded' : 'downgraded',
        currentTier,
        storedTier,
        currentSubscriptionId,
        JSON.stringify({ prorationAmount: changeResult.prorationAmount }),
      ]);

      // Update user's tier
      await fastify.pg.query(`
        UPDATE app_users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2
      `, [storedTier, userId]);

      return {
        success: true,
        data: {
          message: 'Plan changed successfully',
          newTier: storedTier,
          prorationAmount: changeResult.prorationAmount ? changeResult.prorationAmount / 100 : 0,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Plan change failed' });
    }
  });

  // ============================================
  // CANCEL SUBSCRIPTION
  // ============================================

  /**
   * POST /api/v1/billing/cancel
   * Cancel subscription
   */
  fastify.post<{ Body: CancelBody }>('/cancel', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Cancel subscription',
      description: 'Cancels the current subscription (at period end by default)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          immediately: { type: 'boolean', default: false },
          reason: { type: 'string' },
          comment: { type: 'string' },
        },
      },
    },
  }, async (request: any, reply) => {
    try {
      const { immediately, reason, comment } = request.body;
      const userId = request.user.id;

      const result = await fastify.pg.query(
        'SELECT subscription_id, subscription_tier FROM app_users WHERE id = $1',
        [userId]
      );

      const subscriptionId = result.rows[0]?.subscription_id;
      if (!subscriptionId) {
        return reply.status(400).send({ success: false, error: 'No active subscription' });
      }

      const canceled = await stripeService.cancelSubscription(
        subscriptionId,
        immediately,
        reason ? { reason, comment } : undefined
      );

      if (!canceled) {
        return reply.status(500).send({ success: false, error: 'Cancellation failed' });
      }

      // Log the cancellation
      await fastify.pg.query(`
        INSERT INTO subscription_history (user_id, action, from_tier, stripe_subscription_id, reason, metadata)
        VALUES ($1, 'canceled', $2, $3, $4, $5)
      `, [
        userId,
        result.rows[0].subscription_tier,
        subscriptionId,
        reason,
        JSON.stringify({ immediately, comment }),
      ]);

      // Update user status
      await fastify.pg.query(`
        UPDATE app_users SET 
          subscription_status = 'canceled',
          subscription_ends_at = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [
        immediately ? new Date() : new Date(canceled.current_period_end * 1000),
        userId,
      ]);

      return {
        success: true,
        data: {
          message: immediately
            ? 'Subscription cancelled immediately'
            : 'Subscription will cancel at end of billing period',
          endsAt: new Date(canceled.current_period_end * 1000),
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Cancellation failed' });
    }
  });

  // ============================================
  // REACTIVATE SUBSCRIPTION
  // ============================================

  /**
   * POST /api/v1/billing/reactivate
   * Reactivate a cancelled subscription
   */
  fastify.post('/reactivate', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Reactivate subscription',
      description: 'Reactivates a subscription scheduled for cancellation',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;

      const result = await fastify.pg.query(
        'SELECT subscription_id, subscription_status FROM app_users WHERE id = $1',
        [userId]
      );

      const subscriptionId = result.rows[0]?.subscription_id;
      if (!subscriptionId) {
        return reply.status(400).send({ success: false, error: 'No subscription to reactivate' });
      }

      const reactivated = await stripeService.reactivateSubscription(subscriptionId);
      if (!reactivated) {
        return reply.status(500).send({ success: false, error: 'Reactivation failed' });
      }

      // Log reactivation
      await fastify.pg.query(`
        INSERT INTO subscription_history (user_id, action, stripe_subscription_id)
        VALUES ($1, 'reactivated', $2)
      `, [userId, subscriptionId]);

      // Update status
      await fastify.pg.query(`
        UPDATE app_users SET 
          subscription_status = 'active',
          subscription_ends_at = NULL,
          updated_at = NOW()
        WHERE id = $1
      `, [userId]);

      return {
        success: true,
        data: { message: 'Subscription reactivated' },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Reactivation failed' });
    }
  });

  // ============================================
  // INVOICES
  // ============================================

  /**
   * GET /api/v1/billing/invoices
   * Get user's invoice history
   */
  fastify.get('/invoices', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Get invoices',
      description: 'Returns the user billing/invoice history',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;

      const result = await fastify.pg.query(
        'SELECT stripe_customer_id FROM app_users WHERE id = $1',
        [userId]
      );

      const customerId = result.rows[0]?.stripe_customer_id;
      if (!customerId) {
        return { success: true, data: { invoices: [] } };
      }

      // Try to get from Stripe
      if (stripeService.isConfigured()) {
        const invoices = await stripeService.getInvoices(customerId, 20);
        
        const formatted = invoices.map(inv => ({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          amount: inv.amount_due / 100,
          currency: inv.currency,
          description: inv.description,
          pdfUrl: inv.invoice_pdf,
          hostedUrl: inv.hosted_invoice_url,
          periodStart: inv.period_start ? new Date(inv.period_start * 1000) : null,
          periodEnd: inv.period_end ? new Date(inv.period_end * 1000) : null,
          createdAt: new Date(inv.created * 1000),
          paidAt: inv.status_transitions?.paid_at 
            ? new Date(inv.status_transitions.paid_at * 1000) 
            : null,
        }));

        return { success: true, data: { invoices: formatted } };
      }

      // Fallback to cached invoices
      const cachedResult = await fastify.pg.query(`
        SELECT * FROM invoice_cache 
        WHERE user_id = $1 
        ORDER BY invoice_date DESC 
        LIMIT 20
      `, [userId]);

      return { success: true, data: { invoices: cachedResult.rows } };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch invoices' });
    }
  });

  // ============================================
  // UPCOMING INVOICE / PRORATION PREVIEW
  // ============================================

  /**
   * GET /api/v1/billing/preview-change
   * Preview cost of plan change
   */
  fastify.get<{ Querystring: { newTier: string; isYearly?: string } }>('/preview-change', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Preview plan change',
      description: 'Preview the cost impact of changing subscription plans',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['newTier'],
        properties: {
          newTier: { type: 'string' },
          isYearly: { type: 'string' },
        },
      },
    },
  }, async (request: any, reply) => {
    try {
      const { newTier, isYearly } = request.query;
      const userId = request.user.id;

      const result = await fastify.pg.query(
        'SELECT stripe_customer_id, subscription_id FROM app_users WHERE id = $1',
        [userId]
      );

      const { stripe_customer_id: customerId, subscription_id: subscriptionId } = result.rows[0] || {};

      if (!customerId || !subscriptionId) {
        return reply.status(400).send({ success: false, error: 'No active subscription' });
      }

      const tierConfig = TIER_CONFIG[newTier as SubscriptionTier];
      if (!tierConfig) {
        return reply.status(400).send({ success: false, error: 'Invalid tier' });
      }

      const priceId = isYearly === 'true'
        ? tierConfig.stripePriceIdYearly
        : tierConfig.stripePriceIdMonthly;

      if (!priceId) {
        return reply.status(400).send({ success: false, error: 'No price for tier' });
      }

      const upcomingInvoice = await stripeService.getUpcomingInvoice(
        customerId,
        subscriptionId,
        priceId
      );

      if (!upcomingInvoice) {
        return reply.status(500).send({ success: false, error: 'Preview unavailable' });
      }

      return {
        success: true,
        data: {
          amountDue: upcomingInvoice.amount_due / 100,
          prorationAmount: (upcomingInvoice.amount_due - upcomingInvoice.subtotal) / 100,
          nextBillingDate: upcomingInvoice.next_payment_attempt
            ? new Date(upcomingInvoice.next_payment_attempt * 1000)
            : null,
          lineItems: upcomingInvoice.lines.data.map(line => ({
            description: line.description,
            amount: line.amount / 100,
            proration: line.proration,
          })),
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Preview failed' });
    }
  });

  // ============================================
  // PAYMENT METHODS
  // ============================================

  /**
   * GET /api/v1/billing/payment-methods
   * Get user's payment methods
   */
  fastify.get('/payment-methods', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Get payment methods',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;

      const result = await fastify.pg.query(
        'SELECT stripe_customer_id FROM app_users WHERE id = $1',
        [userId]
      );

      const customerId = result.rows[0]?.stripe_customer_id;
      if (!customerId) {
        return { success: true, data: { paymentMethods: [] } };
      }

      const methods = await stripeService.getPaymentMethods(customerId);

      return {
        success: true,
        data: {
          paymentMethods: methods.map(m => ({
            id: m.id,
            brand: m.card?.brand,
            last4: m.card?.last4,
            expMonth: m.card?.exp_month,
            expYear: m.card?.exp_year,
          })),
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch payment methods' });
    }
  });

  /**
   * POST /api/v1/billing/setup-intent
   * Create a SetupIntent for adding a new payment method
   */
  fastify.post('/setup-intent', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Create setup intent',
      description: 'Creates a SetupIntent for securely adding a new payment method',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const email = request.user.email;

      const customerId = await stripeService.getOrCreateCustomer(userId, email);
      if (!customerId) {
        return reply.status(500).send({ success: false, error: 'Failed to create customer' });
      }

      const intent = await stripeService.createSetupIntent(customerId);
      if (!intent) {
        return reply.status(500).send({ success: false, error: 'Failed to create setup intent' });
      }

      return {
        success: true,
        data: { clientSecret: intent.clientSecret },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Setup intent failed' });
    }
  });

  // ============================================
  // CREDIT PACKAGES
  // ============================================

  /**
   * GET /api/v1/billing/credit-packages
   * Get available credit packages
   */
  fastify.get('/credit-packages', {
    schema: {
      tags: ['Billing'],
      summary: 'Get credit packages',
      description: 'Returns available one-time credit purchase packages',
    },
  }, async (request, reply) => {
    try {
      const result = await fastify.pg.query(`
        SELECT * FROM credit_packages 
        WHERE is_active = TRUE 
        ORDER BY sort_order ASC
      `);

      return {
        success: true,
        data: {
          packages: result.rows.map((p: CreditPackageRow) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            credits: p.credits,
            price: p.price_cents / 100,
            isFeatured: p.is_featured,
            badge: p.badge_text,
          })),
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch packages' });
    }
  });

  /**
   * POST /api/v1/billing/purchase-credits
   * Purchase additional credits
   */
  fastify.post<{ Body: CreditPurchaseBody }>('/purchase-credits', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Purchase credits',
      description: 'Creates a checkout session for one-time credit purchase',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['credits'],
        properties: {
          credits: { type: 'number', minimum: 10 },
          packageId: { type: 'string' },
        },
      },
    },
  }, async (request: any, reply) => {
    try {
      const { credits, packageId } = request.body;
      const userId = request.user.id;
      const email = request.user.email;

      let priceInCents: number;

      if (packageId) {
        const result = await fastify.pg.query(
          'SELECT credits, price_cents FROM credit_packages WHERE id = $1 AND is_active = TRUE',
          [packageId]
        );
        if (result.rows.length === 0) {
          return reply.status(404).send({ success: false, error: 'Package not found' });
        }
        priceInCents = result.rows[0].price_cents;
      } else {
        // Calculate price based on credits (e.g., $0.50 per credit)
        priceInCents = credits * 50;
      }

      const session = await stripeService.createCreditPurchaseSession(
        userId,
        email,
        credits,
        priceInCents
      );

      if (!session) {
        return reply.status(500).send({ success: false, error: 'Failed to create checkout' });
      }

      // Log pending purchase
      await fastify.pg.query(`
        INSERT INTO credit_purchases (user_id, package_id, credits, price_cents, stripe_session_id, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
      `, [userId, packageId || null, credits, priceInCents, session.sessionId]);

      return {
        success: true,
        data: {
          checkoutUrl: session.url,
          sessionId: session.sessionId,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Credit purchase failed' });
    }
  });

  // ============================================
  // SUBSCRIPTION HISTORY
  // ============================================

  /**
   * GET /api/v1/billing/history
   * Get subscription change history
   */
  fastify.get('/history', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Get billing history',
      description: 'Returns subscription change history',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id;

      const result = await fastify.pg.query(`
        SELECT * FROM subscription_history 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 50
      `, [userId]);

      return {
        success: true,
        data: { history: result.rows },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch history' });
    }
  });

  // ============================================
  // RATE LIMITS INFO
  // ============================================

  /**
   * GET /api/v1/billing/limits
   * Get current rate limit status
   */
  fastify.get('/limits', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Billing'],
      summary: 'Get rate limits',
      description: 'Returns current rate limit status for the user',
      security: [{ bearerAuth: [] }],
    },
  }, async (request: any, reply) => {
    try {
      const tier = request.user.subscription_tier || 'free';
      const tierConfig = TIER_CONFIG[tier as SubscriptionTier];

      // Get current rate limit status
      const generalLimit = await (fastify as any).checkRateLimit(request, 'general');
      const generationLimit = await (fastify as any).checkRateLimit(request, 'generation');

      return {
        success: true,
        data: {
          tier,
          limits: {
            general: {
              limit: tierConfig.rateLimitPerMinute,
              remaining: generalLimit.remaining,
              resetsAt: new Date(generalLimit.resetAt),
            },
            generation: {
              limit: tierConfig.rateLimitGeneration,
              remaining: generationLimit.remaining,
              resetsAt: new Date(generationLimit.resetAt),
            },
          },
          features: {
            creditsPerDay: tierConfig.creditsPerDay,
            maxFileSize: tierConfig.maxFileSize,
          },
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to get limits' });
    }
  });
}
