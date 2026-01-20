/**
 * @file routes/stripe-webhooks.ts
 * @description Enhanced Stripe webhook handlers with comprehensive event processing
 * @module @synthstack/api-gateway/routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { getStripeService, TIER_CONFIG, SubscriptionTier } from '../services/stripe.js';
import { getEmailService, EMAIL_TEMPLATES } from '../services/email/index.js';
import { config } from '../config/index.js';

function normalizeTierForDatabase(rawTier: unknown): SubscriptionTier | null {
  const tier = (typeof rawTier === 'string' ? rawTier : '').trim().toLowerCase();
  if (!tier) return null;
  if (tier === 'agency') return 'unlimited';
  if (tier === 'free' || tier === 'maker' || tier === 'pro' || tier === 'unlimited') return tier;
  return null;
}

// ============================================
// STRIPE WEBHOOKS ROUTES
// ============================================

export default async function stripeWebhookRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/webhooks/stripe
   * Handle all Stripe webhook events
   */
  fastify.post('/stripe', {
    config: { rawBody: true } as any,
    schema: {
      tags: ['Webhooks'],
      summary: 'Stripe webhook endpoint',
      description: 'Receives and processes Stripe webhook events',
    },
  }, async (request: any, reply: FastifyReply) => {
    let stripeService;
    try {
      stripeService = getStripeService();
    } catch {
      return reply.status(503).send({ success: false, error: 'Stripe service not initialized' });
    }

    if (!stripeService.isConfigured() || !config.stripe.webhookSecret) {
      return reply.status(500).send({ success: false, error: 'Stripe not configured' });
    }

    const sig = request.headers['stripe-signature'] as string;
    const rawBody = request.rawBody;

    if (!sig || !rawBody) {
      return reply.status(400).send({ success: false, error: 'Missing signature or body' });
    }

    // Verify webhook signature
    const event = stripeService.verifyWebhook(rawBody, sig);
    if (!event) {
      return reply.status(400).send({ success: false, error: 'Invalid signature' });
    }

    // Log webhook
    try {
      await fastify.pg.query(`
        INSERT INTO payment_webhooks (provider, event_type, event_id, payload)
        VALUES ('stripe', $1, $2, $3)
        ON CONFLICT (provider, event_id) DO NOTHING
      `, [event.type, event.id, JSON.stringify(event.data)]);
    } catch (error) {
      fastify.log.warn({ error }, 'Failed to log webhook');
    }

    // Process event
    try {
      await processStripeEvent(fastify, event);

      // Mark as processed
      await fastify.pg.query(`
        UPDATE payment_webhooks 
        SET processed = TRUE, processed_at = NOW()
        WHERE provider = 'stripe' AND event_id = $1
      `, [event.id]);

    } catch (error: any) {
      fastify.log.error({ error, eventType: event.type }, 'Webhook processing failed');
      
      // Log error
      await fastify.pg.query(`
        UPDATE payment_webhooks 
        SET error = $1, retry_count = retry_count + 1
        WHERE provider = 'stripe' AND event_id = $2
      `, [error.message, event.id]);

      // Return 200 to prevent retries for non-recoverable errors
      // Stripe will retry on 4xx/5xx responses
    }

    return { received: true };
  });
}

// ============================================
// EVENT PROCESSORS
// ============================================

async function processStripeEvent(fastify: FastifyInstance, event: Stripe.Event) {
  switch (event.type) {
    // ========== CHECKOUT EVENTS ==========
    case 'checkout.session.completed':
      await handleCheckoutCompleted(fastify, event.data.object as Stripe.Checkout.Session);
      break;

    case 'checkout.session.expired':
      await handleCheckoutExpired(fastify, event.data.object as Stripe.Checkout.Session);
      break;

    // ========== SUBSCRIPTION EVENTS ==========
    case 'customer.subscription.created':
      await handleSubscriptionCreated(fastify, event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(fastify, event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(fastify, event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.paused':
      await handleSubscriptionPaused(fastify, event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.resumed':
      await handleSubscriptionResumed(fastify, event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(fastify, event.data.object as Stripe.Subscription);
      break;

    // ========== INVOICE EVENTS ==========
    case 'invoice.paid':
      await handleInvoicePaid(fastify, event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(fastify, event.data.object as Stripe.Invoice);
      break;

    case 'invoice.upcoming':
      await handleInvoiceUpcoming(fastify, event.data.object as Stripe.Invoice);
      break;

    case 'invoice.finalized':
      await handleInvoiceFinalized(fastify, event.data.object as Stripe.Invoice);
      break;

    // ========== CUSTOMER EVENTS ==========
    case 'customer.created':
    case 'customer.updated':
      await handleCustomerUpdate(fastify, event.data.object as Stripe.Customer);
      break;

    // ========== PAYMENT METHOD EVENTS ==========
    case 'payment_method.attached':
    case 'payment_method.updated':
    case 'payment_method.detached':
      // Log for audit, no action needed
      fastify.log.info({ type: event.type }, 'Payment method event');
      break;

    default:
      fastify.log.info({ type: event.type }, 'Unhandled webhook event');
  }
}

// ============================================
// CHECKOUT HANDLERS
// ============================================

async function handleCheckoutCompleted(fastify: FastifyInstance, session: Stripe.Checkout.Session) {
  const { user_id, tier, type, credits, invoice_id, organization_id, contact_id } = session.metadata || {};

  // Handle invoice payment
  if (invoice_id) {
    fastify.log.info({ invoiceId: invoice_id, sessionId: session.id }, 'Processing invoice payment');

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      // Update payment_sessions table
      await client.query(
        `UPDATE payment_sessions
         SET status = 'completed', completed_at = NOW(), user_updated = NULL, date_updated = NOW()
         WHERE session_id = $1`,
        [session.id]
      );

      // Get invoice details
      const invoiceResult = await client.query(
        `SELECT i.*, o.billing_email, o.name as organization_name
         FROM invoices i
         JOIN organizations o ON o.id = i.organization_id
         WHERE i.id = $1`,
        [invoice_id]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error(`Invoice ${invoice_id} not found`);
      }

      const invoice = invoiceResult.rows[0];

      // Create payment record
      const paymentAmount = session.amount_total ? session.amount_total / 100 : 0;
      const transactionFee = 0; // Calculate Stripe fee if needed

      const paymentResult = await client.query(
        `INSERT INTO payments (
          invoice_id,
          amount,
          transaction_fee,
          payment_method,
          reference,
          status,
          payment_date,
          stripe_payment_intent_id,
          receipt_url,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id`,
        [
          invoice_id,
          paymentAmount,
          transactionFee,
          'stripe',
          session.id,
          'completed',
          new Date(),
          session.payment_intent,
          (session as any).receipt_url || null,
          JSON.stringify({
            session_id: session.id,
            customer_email: session.customer_email,
            payment_status: session.payment_status
          })
        ]
      );

      // Update invoice status to paid
      await client.query(
        `UPDATE invoices
         SET status = 'paid',
             paid_at = NOW(),
             amount_paid = total_amount,
             user_updated = NULL,
             date_updated = NOW()
         WHERE id = $1`,
        [invoice_id]
      );

      await client.query('COMMIT');

      fastify.log.info({
        invoiceNumber: invoice.invoice_number,
        paymentId: paymentResult.rows[0].id,
        amount: paymentAmount
      }, 'Invoice payment completed');

    } catch (error) {
      await client.query('ROLLBACK');
      fastify.log.error({ invoiceId: invoice_id, error }, 'Failed to process invoice payment');
      throw error;
    } finally {
      client.release();
    }

    return;
  }

  if (type === 'credit_purchase' && user_id && credits) {
    // Handle credit purchase
    const creditAmount = parseInt(credits);

    // Get current balance
    const userResult = await fastify.pg.query(
      'SELECT credits_remaining, email, display_name FROM app_users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length > 0) {
      const currentBalance = userResult.rows[0].credits_remaining;
      const newBalance = currentBalance + creditAmount;

      await fastify.pg.query(`
        UPDATE app_users SET credits_remaining = $1, updated_at = NOW() WHERE id = $2
      `, [newBalance, user_id]);

      await fastify.pg.query(`
        INSERT INTO credit_transactions (user_id, type, amount, balance_before, balance_after, reference_id, reason)
        VALUES ($1, 'purchase', $2, $3, $4, $5, 'Credit purchase')
      `, [user_id, creditAmount, currentBalance, newBalance, session.id]);

      // Update credit purchase record
      await fastify.pg.query(`
        UPDATE credit_purchases
        SET status = 'completed', stripe_payment_intent_id = $1, completed_at = NOW()
        WHERE stripe_session_id = $2
      `, [session.payment_intent, session.id]);

      // Email: credits purchased (best-effort)
      try {
        const userEmail: string | null =
          (userResult.rows[0] as any).email ||
          session.customer_email ||
          session.customer_details?.email ||
          null;

        if (userEmail) {
          const userName =
            (userResult.rows[0] as any).display_name ||
            userEmail.split('@')[0];

          const emailService = getEmailService();
          const result = await emailService.sendEmail({
            to: userEmail,
            toName: userName,
            templateSlug: EMAIL_TEMPLATES.CREDIT_PURCHASED,
            templateData: {
              userName,
              credits: creditAmount,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              packageName: `${creditAmount} Credits`,
              transactionId: session.id,
              newBalance,
              dashboardUrl: `${config.frontendUrl}/app`,
              purchaseUrl: `${config.frontendUrl}/pricing#credits`,
              upgradeUrl: `${config.frontendUrl}/pricing`,
            },
            userId: user_id,
            referenceType: 'purchase',
            referenceId: session.id,
            priority: 8,
          });

          if (!result.success) {
            fastify.log.warn({ userId: user_id, error: result.error, code: result.errorCode }, 'Credits purchased email not sent');
          }
        }
      } catch (error) {
        fastify.log.warn({ error, userId: user_id }, 'Failed to send credits purchased email');
      }
    }

    fastify.log.info({ userId: user_id, credits: creditAmount }, 'Credit purchase completed');
    return;
  }

  // Handle lifetime license purchase
  if (type === 'lifetime_license') {
    const customerEmail = session.customer_email || session.customer_details?.email;
    const amountPaid = session.amount_total || 0;

    if (!customerEmail) {
      fastify.log.error({ sessionId: session.id }, 'Lifetime license purchase missing email');
      return;
    }

    // Create lifetime license record
    await fastify.pg.query(`
      INSERT INTO lifetime_licenses (
        stripe_session_id,
        stripe_customer_id,
        email,
        amount_paid_cents,
        github_access_status
      ) VALUES ($1, $2, $3, $4, 'pending')
      ON CONFLICT (stripe_session_id) DO NOTHING
    `, [session.id, session.customer, customerEmail, amountPaid]);

    // Send welcome email with GitHub username submission link
    try {
      const licenseAccessUrl = `${config.frontendUrl}/license-access?session=${session.id}`;

      const emailService = getEmailService();
      await emailService.sendLifetimeWelcomeEmail({
        to: customerEmail,
        sessionId: session.id,
        licenseAccessUrl,
      });

      // Update email sent timestamp
      await fastify.pg.query(`
        UPDATE lifetime_licenses
        SET welcome_email_sent_at = NOW()
        WHERE stripe_session_id = $1
      `, [session.id]);

      fastify.log.info({ email: customerEmail, sessionId: session.id }, 'Lifetime license purchased, welcome email sent');
    } catch (error) {
      fastify.log.error({ error, email: customerEmail }, 'Failed to send lifetime welcome email');
      // Don't throw - license record is created, email can be resent manually
    }

    return;
  }

  if (!user_id || !tier) {
    fastify.log.warn({ session: session.id }, 'Checkout session missing metadata');
    return;
  }

  const storedTier = normalizeTierForDatabase(tier);
  if (!storedTier) {
    fastify.log.error({ tier }, 'Invalid tier in checkout metadata');
    return;
  }

  const tierConfig = TIER_CONFIG[storedTier];
  if (!tierConfig) {
    fastify.log.error({ tier: storedTier }, 'Invalid tier in checkout metadata');
    return;
  }

  // Update user subscription
  await fastify.pg.query(`
    UPDATE app_users SET
      subscription_tier = $1,
      subscription_status = 'active',
      subscription_id = $2,
      stripe_customer_id = $3,
      subscription_started_at = NOW(),
      credits_remaining = $4,
      updated_at = NOW()
    WHERE id = $5
  `, [
    storedTier,
    session.subscription,
    session.customer,
    tierConfig.creditsPerDay === Infinity ? 999999 : tierConfig.creditsPerDay,
    user_id,
  ]);

  // Log subscription history
  await fastify.pg.query(`
    INSERT INTO subscription_history (user_id, action, to_tier, stripe_subscription_id, metadata)
    VALUES ($1, 'created', $2, $3, $4)
  `, [user_id, storedTier, session.subscription, JSON.stringify({ session_id: session.id })]);

  // Log analytics event
  await fastify.pg.query(`
    INSERT INTO analytics_events (event_type, event_category, user_id, metadata)
    VALUES ('subscription_created', 'subscription', $1, $2)
  `, [user_id, JSON.stringify({ tier: storedTier, subscription_id: session.subscription })]);

  // Email: subscription confirmation (best-effort)
  try {
    const userResult = await fastify.pg.query<{ email: string; display_name: string | null }>(
      'SELECT email, display_name FROM app_users WHERE id = $1',
      [user_id]
    );

    const userEmail =
      userResult.rows[0]?.email ||
      session.customer_email ||
      session.customer_details?.email ||
      null;

    if (userEmail) {
      const userName = userResult.rows[0]?.display_name || userEmail.split('@')[0];
      const isYearly = session.metadata?.is_yearly === 'true';

      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + (isYearly ? 12 : 1));

      const emailService = getEmailService();
      const result = await emailService.sendEmail({
        to: userEmail,
        toName: userName,
        templateSlug: EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMED,
        templateData: {
          userName,
          planName: tierConfig.displayName,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          isYearly,
          creditsPerDay: tierConfig.creditsPerDay,
          nextBillingDate: nextBillingDate.toLocaleDateString(),
          dashboardUrl: `${config.frontendUrl}/app`,
          billingUrl: `${config.frontendUrl}/app/billing`,
        },
        userId: user_id,
        referenceType: 'subscription',
        referenceId: String(session.subscription || session.id),
        priority: 9,
      });

      if (!result.success) {
        fastify.log.warn({ userId: user_id, error: result.error, code: result.errorCode }, 'Subscription confirmation email not sent');
      }
    }
  } catch (error) {
    fastify.log.warn({ error, userId: user_id }, 'Failed to send subscription confirmation email');
  }

  fastify.log.info({ userId: user_id, tier: storedTier }, 'Subscription created via checkout');
}

async function handleCheckoutExpired(fastify: FastifyInstance, session: Stripe.Checkout.Session) {
  const { type } = session.metadata || {};
  
  if (type === 'credit_purchase') {
    await fastify.pg.query(`
      UPDATE credit_purchases SET status = 'failed' WHERE stripe_session_id = $1
    `, [session.id]);
  }

  fastify.log.info({ session: session.id }, 'Checkout session expired');
}

// ============================================
// SUBSCRIPTION HANDLERS
// ============================================

async function handleSubscriptionCreated(fastify: FastifyInstance, subscription: Stripe.Subscription) {
  const stripeService = getStripeService();
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const tier = normalizeTierForDatabase(stripeService.getTierFromPriceId(priceId)) || 'free';

  // Find user by customer ID
  const userResult = await fastify.pg.query(
    'SELECT id FROM app_users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length === 0) {
    fastify.log.warn({ customerId }, 'No user found for customer');
    return;
  }

  const userId = userResult.rows[0].id;
  const tierConfig = TIER_CONFIG[tier];

  await fastify.pg.query(`
    UPDATE app_users SET
      subscription_tier = $1,
      subscription_status = $2,
      subscription_id = $3,
      subscription_started_at = NOW(),
      credits_remaining = $4,
      updated_at = NOW()
    WHERE id = $5
  `, [
    tier,
    subscription.status === 'trialing' ? 'trialing' : 'active',
    subscription.id,
    tierConfig.creditsPerDay === Infinity ? 999999 : tierConfig.creditsPerDay,
    userId,
  ]);

  fastify.log.info({ userId, tier, status: subscription.status }, 'Subscription created');
}

async function handleSubscriptionUpdated(fastify: FastifyInstance, subscription: Stripe.Subscription) {
  const stripeService = getStripeService();
  const priceId = subscription.items.data[0]?.price.id;
  const newTier = normalizeTierForDatabase(stripeService.getTierFromPriceId(priceId)) || 'free';

  // Find user
  const userResult = await fastify.pg.query(
    'SELECT id, subscription_tier FROM app_users WHERE subscription_id = $1',
    [subscription.id]
  );

  if (userResult.rows.length === 0) {
    fastify.log.warn({ subscriptionId: subscription.id }, 'No user found for subscription');
    return;
  }

  const userId = userResult.rows[0].id;
  const previousTier = userResult.rows[0].subscription_tier;

  // Determine status
  let status = 'active';
  if (subscription.status === 'past_due') status = 'past_due';
  else if (subscription.status === 'canceled') status = 'canceled';
  else if (subscription.status === 'trialing') status = 'trialing';
  else if (subscription.cancel_at_period_end) status = 'canceled';

  // Update user
  await fastify.pg.query(`
    UPDATE app_users SET
      subscription_tier = $1,
      subscription_status = $2,
      subscription_ends_at = $3,
      updated_at = NOW()
    WHERE id = $4
  `, [
    newTier,
    status,
    subscription.cancel_at_period_end || subscription.status === 'canceled'
      ? new Date(subscription.current_period_end * 1000)
      : null,
    userId,
  ]);

  // Log tier change if applicable
  if (previousTier !== newTier) {
    const action = getTierRank(newTier) > getTierRank(previousTier) ? 'upgraded' : 'downgraded';
    
    await fastify.pg.query(`
      INSERT INTO subscription_history (user_id, action, from_tier, to_tier, stripe_subscription_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, action, previousTier, newTier, subscription.id]);

    // Update credits for new tier
    const tierConfig = TIER_CONFIG[newTier];
    await fastify.pg.query(`
      UPDATE app_users SET credits_remaining = $1 WHERE id = $2
    `, [tierConfig.creditsPerDay === Infinity ? 999999 : tierConfig.creditsPerDay, userId]);
  }

  fastify.log.info({ userId, newTier, status }, 'Subscription updated');
}

async function handleSubscriptionDeleted(fastify: FastifyInstance, subscription: Stripe.Subscription) {
  const userResult = await fastify.pg.query(
    'SELECT id, subscription_tier FROM app_users WHERE subscription_id = $1',
    [subscription.id]
  );

  if (userResult.rows.length === 0) return;

  const userId = userResult.rows[0].id;
  const previousTier = userResult.rows[0].subscription_tier;

  // Downgrade to free
  await fastify.pg.query(`
    UPDATE app_users SET
      subscription_tier = 'free',
      subscription_status = 'active',
      subscription_id = NULL,
      subscription_ends_at = NULL,
      credits_remaining = $1,
      updated_at = NOW()
    WHERE id = $2
  `, [TIER_CONFIG.free.creditsPerDay, userId]);

  await fastify.pg.query(`
    INSERT INTO subscription_history (user_id, action, from_tier, to_tier, stripe_subscription_id)
    VALUES ($1, 'expired', $2, 'free', $3)
  `, [userId, previousTier, subscription.id]);

  await fastify.pg.query(`
    INSERT INTO analytics_events (event_type, event_category, user_id, metadata)
    VALUES ('subscription_ended', 'subscription', $1, $2)
  `, [userId, JSON.stringify({ previous_tier: previousTier })]);

  fastify.log.info({ userId, previousTier }, 'Subscription deleted, downgraded to free');
}

async function handleSubscriptionPaused(fastify: FastifyInstance, subscription: Stripe.Subscription) {
  await fastify.pg.query(`
    UPDATE app_users SET subscription_status = 'paused', updated_at = NOW()
    WHERE subscription_id = $1
  `, [subscription.id]);

  fastify.log.info({ subscriptionId: subscription.id }, 'Subscription paused');
}

async function handleSubscriptionResumed(fastify: FastifyInstance, subscription: Stripe.Subscription) {
  await fastify.pg.query(`
    UPDATE app_users SET subscription_status = 'active', updated_at = NOW()
    WHERE subscription_id = $1
  `, [subscription.id]);

  fastify.log.info({ subscriptionId: subscription.id }, 'Subscription resumed');
}

async function handleTrialWillEnd(fastify: FastifyInstance, subscription: Stripe.Subscription) {
  // Could send email notification here
  fastify.log.info({ subscriptionId: subscription.id }, 'Trial ending soon');
}

// ============================================
// INVOICE HANDLERS
// ============================================

async function handleInvoicePaid(fastify: FastifyInstance, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user
  const userResult = await fastify.pg.query(
    'SELECT id, subscription_tier FROM app_users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length === 0) return;

  const userId = userResult.rows[0].id;
  const tier = userResult.rows[0].subscription_tier as SubscriptionTier;

  // Reset credits on successful payment (subscription renewal)
  if (invoice.subscription) {
    const tierConfig = TIER_CONFIG[tier];
    await fastify.pg.query(`
      UPDATE app_users SET 
        credits_remaining = $1,
        subscription_status = 'active',
        updated_at = NOW()
      WHERE id = $2
    `, [tierConfig.creditsPerDay === Infinity ? 999999 : tierConfig.creditsPerDay, userId]);
  }

  // Cache invoice
  await fastify.pg.query(`
    INSERT INTO invoice_cache (
      user_id, stripe_invoice_id, stripe_invoice_number, status, amount_cents,
      currency, description, pdf_url, hosted_invoice_url, 
      period_start, period_end, invoice_date, paid_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
    ON CONFLICT (stripe_invoice_id) DO UPDATE SET
      status = EXCLUDED.status,
      paid_at = NOW()
  `, [
    userId,
    invoice.id,
    invoice.number,
    'paid',
    invoice.amount_paid,
    invoice.currency,
    invoice.description,
    invoice.invoice_pdf,
    invoice.hosted_invoice_url,
    invoice.period_start ? new Date(invoice.period_start * 1000) : null,
    invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    new Date(invoice.created * 1000),
  ]);

  fastify.log.info({ userId, invoiceId: invoice.id }, 'Invoice paid');
}

async function handleInvoicePaymentFailed(fastify: FastifyInstance, invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  await fastify.pg.query(`
    UPDATE app_users SET subscription_status = 'past_due', updated_at = NOW()
    WHERE subscription_id = $1
  `, [invoice.subscription]);

  await fastify.pg.query(`
    INSERT INTO analytics_events (event_type, event_category, metadata)
    VALUES ('payment_failed', 'subscription', $1)
  `, [JSON.stringify({ invoice_id: invoice.id, subscription_id: invoice.subscription })]);

  fastify.log.warn({ invoiceId: invoice.id }, 'Invoice payment failed');
}

async function handleInvoiceUpcoming(fastify: FastifyInstance, invoice: Stripe.Invoice) {
  // Could send reminder email
  fastify.log.info({ invoiceId: invoice.id }, 'Upcoming invoice');
}

async function handleInvoiceFinalized(fastify: FastifyInstance, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const userResult = await fastify.pg.query(
    'SELECT id FROM app_users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length === 0) return;

  // Cache invoice
  await fastify.pg.query(`
    INSERT INTO invoice_cache (
      user_id, stripe_invoice_id, stripe_invoice_number, status, amount_cents,
      currency, description, pdf_url, hosted_invoice_url,
      period_start, period_end, invoice_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (stripe_invoice_id) DO UPDATE SET
      status = EXCLUDED.status,
      pdf_url = EXCLUDED.pdf_url
  `, [
    userResult.rows[0].id,
    invoice.id,
    invoice.number,
    invoice.status,
    invoice.amount_due,
    invoice.currency,
    invoice.description,
    invoice.invoice_pdf,
    invoice.hosted_invoice_url,
    invoice.period_start ? new Date(invoice.period_start * 1000) : null,
    invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    new Date(invoice.created * 1000),
  ]);
}

// ============================================
// CUSTOMER HANDLERS
// ============================================

async function handleCustomerUpdate(fastify: FastifyInstance, customer: Stripe.Customer) {
  if (customer.deleted) return;

  // Update user email if changed
  if (customer.email) {
    await fastify.pg.query(`
      UPDATE app_users SET email = $1, updated_at = NOW()
      WHERE stripe_customer_id = $2 AND email != $1
    `, [customer.email, customer.id]);
  }
}

// ============================================
// HELPERS
// ============================================

function getTierRank(tier: SubscriptionTier): number {
  const ranks: Record<SubscriptionTier, number> = { free: 0, maker: 1, pro: 2, agency: 3, unlimited: 3 };
  return ranks[tier] ?? 0;
}
