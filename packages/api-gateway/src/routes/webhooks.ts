/**
 * @file routes/webhooks.ts
 * @description Webhook handlers for Stripe
 * @module @synthstack/api-gateway/routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const stripe = config.stripe.secretKey 
  ? new Stripe(config.stripe.secretKey, { apiVersion: '2025-02-24.acacia' })
  : null;

let supabase: SupabaseClient | null = null;
if (config.supabaseUrl && config.supabaseServiceRoleKey) {
  supabase = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey
  );
} else {
  console.warn('⚠️ Supabase not configured - webhooks will be skipped');
}

export default async function webhooksRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/webhooks/stripe
   * Handle Stripe webhook events
   */
  fastify.post('/stripe', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!supabase) {
      return reply.status(200).send({ received: true, note: 'Supabase not configured (mock mode)' });
    }
    if (!stripe || !config.stripe.webhookSecret) {
      return reply.status(500).send({
        success: false,
        error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured' },
      });
    }

    const sig = request.headers['stripe-signature'] as string;
    const rawBody = (request as any).rawBody;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, config.stripe.webhookSecret);
    } catch (err: any) {
      fastify.log.error({ err }, 'Webhook signature verification failed');
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' },
      });
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          fastify.log.info(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      fastify.log.error({ err: error }, 'Error handling webhook');
      return reply.status(500).send({
        success: false,
        error: { code: 'WEBHOOK_HANDLER_ERROR', message: 'Failed to process webhook' },
      });
    }

    return { received: true };
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const priceId = session.metadata?.price_id;

  if (!userId || !priceId) {
    console.error('Missing user_id or price_id in session metadata');
    return;
  }

  // Determine tier from price ID
  const tier = getTierFromPriceId(priceId);

  if (!supabase) return;

  // Update user subscription
  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      stripe_customer_id: session.customer as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // Reset credits for new tier
  const dailyLimit = config.creditsPerTier[tier as keyof typeof config.creditsPerTier];
  await supabase
    .from('user_credits')
    .update({
      credits_remaining: dailyLimit,
      credits_used_today: 0,
      subscription_tier: tier,
      last_reset: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  if (!supabase) return;

  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const tier = getTierFromPriceId(priceId);
  const status = subscription.status;

  // Only update if subscription is active
  if (status === 'active' || status === 'trialing') {
    await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Update credits
    const dailyLimit = config.creditsPerTier[tier as keyof typeof config.creditsPerTier];
    await supabase
      .from('user_credits')
      .update({
        subscription_tier: tier,
        credits_remaining: Math.max(dailyLimit, 0),
      })
      .eq('user_id', user.id);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  if (!supabase) return;
  
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // Downgrade to free tier
  await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  await supabase
    .from('user_credits')
    .update({
      subscription_tier: 'free',
      credits_remaining: config.creditsPerTier.free,
    })
    .eq('user_id', user.id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Credits are already set on subscription update
  console.log('Payment succeeded for invoice:', invoice.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed for invoice:', invoice.id);
  // Could send notification to user or limit features
}

function getTierFromPriceId(priceId: string): string {
  if (priceId === config.stripe.prices.maker) return 'maker';
  if (priceId === config.stripe.prices.pro) return 'pro';
  if (priceId === config.stripe.prices.agency) return 'agency';
  // Legacy: old installs may still have an "unlimited" Stripe price. Treat as Agency.
  if (priceId === process.env.STRIPE_PRICE_UNLIMITED || priceId === process.env.STRIPE_PRICE_UNLIMITED_YEARLY) return 'agency';
  return 'free';
}
