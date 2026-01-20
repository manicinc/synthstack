import type { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { config } from '../config/index.js'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null

export default async function subscriptionRoutes(fastify: FastifyInstance) {
  // Get subscription plans
  fastify.get('/subscriptions/plans', async (request, reply) => {
    try {
      const result = await fastify.pg.query(`
        SELECT * FROM subscription_plans 
        WHERE is_active = TRUE 
        ORDER BY sort_order ASC
      `)
      return { plans: result.rows }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch plans' })
    }
  })

  // Get user's current subscription
  fastify.get('/subscriptions/current', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      
      const result = await fastify.pg.query(`
        SELECT 
          u.subscription_tier,
          u.subscription_status,
          u.subscription_started_at,
          u.subscription_ends_at,
          u.credits_remaining,
          u.credits_reset_at,
          sp.*
        FROM users u
        LEFT JOIN subscription_plans sp ON u.subscription_tier = sp.tier
        WHERE u.id = $1
      `, [userId])
      
      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'User not found' })
      }
      
      return { subscription: result.rows[0] }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch subscription' })
    }
  })

  // Create checkout session (Stripe)
  fastify.post('/subscriptions/checkout', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      const { planTier, isYearly } = request.body as { planTier: string; isYearly: boolean }
      
      // Get plan details
      const planResult = await fastify.pg.query(`
        SELECT * FROM subscription_plans WHERE tier = $1 AND is_active = TRUE
      `, [planTier])
      
      if (planResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Plan not found' })
      }
      
      const plan = planResult.rows[0]
      const priceId = isYearly ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly
      
      if (!priceId) {
        return reply.status(400).send({ error: 'Stripe price not configured for this plan' })
      }
      
      // Create Stripe checkout session
      if (!stripe) {
        return reply.status(500).send({ error: 'Stripe not configured' })
      }
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        success_url: `${config.frontendUrl}/app?subscription=success`,
        cancel_url: `${config.frontendUrl}/pricing?subscription=cancelled`,
        metadata: {
          userId,
          planTier,
          isYearly: isYearly ? 'true' : 'false'
        }
      })
      
      return { checkoutUrl: session.url }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to create checkout session' })
    }
  })

  // Cancel subscription
  fastify.post('/subscriptions/cancel', {
    preHandler: [fastify.authenticate]
  }, async (request: any, reply) => {
    try {
      const userId = request.user.id
      
      const userResult = await fastify.pg.query(
        'SELECT subscription_id FROM users WHERE id = $1',
        [userId]
      )
      
      if (!userResult.rows[0]?.subscription_id) {
        return reply.status(400).send({ error: 'No active subscription' })
      }
      
      // Cancel at period end
      if (!stripe) {
        return reply.status(500).send({ error: 'Stripe not configured' })
      }
      await stripe.subscriptions.update(userResult.rows[0].subscription_id, {
        cancel_at_period_end: true
      })
      
      await fastify.pg.query(`
        UPDATE users 
        SET subscription_status = 'canceled', updated_at = NOW()
        WHERE id = $1
      `, [userId])
      
      return { success: true, message: 'Subscription will cancel at end of billing period' }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to cancel subscription' })
    }
  })

  // Stripe webhook handler
  fastify.post('/subscriptions/webhook', {
    config: { rawBody: true }
  }, async (request: any, reply) => {
    const sig = request.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    
    if (!webhookSecret) {
      return reply.status(500).send({ error: 'Webhook secret not configured' })
    }
    
    let event: Stripe.Event
    
    try {
      if (!stripe) {
        return reply.status(500).send({ error: 'Stripe not configured' })
      }
      event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret)
    } catch (err: any) {
      fastify.log.error(`Webhook signature verification failed: ${err.message}`)
      return reply.status(400).send({ error: `Webhook Error: ${err.message}` })
    }
    
    // Log webhook
    await fastify.pg.query(`
      INSERT INTO payment_webhooks (provider, event_type, event_id, payload)
      VALUES ('stripe', $1, $2, $3)
      ON CONFLICT (provider, event_id) DO NOTHING
    `, [event.type, event.id, JSON.stringify(event.data)])
    
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const { userId, planTier } = session.metadata || {}
          
          if (userId && planTier) {
            await fastify.pg.query(`
              UPDATE users SET
                subscription_tier = $1,
                subscription_status = 'active',
                subscription_id = $2,
                subscription_started_at = NOW(),
                updated_at = NOW()
              WHERE id = $3
            `, [planTier, session.subscription, userId])
            
            // Add bonus credits
            const plan = await fastify.pg.query(
              'SELECT credits_per_day FROM subscription_plans WHERE tier = $1',
              [planTier]
            )
            if (plan.rows[0]) {
              await fastify.pg.query(`
                UPDATE users SET credits_remaining = $1 WHERE id = $2
              `, [plan.rows[0].credits_per_day, userId])
            }
          }
          break
        }
        
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription
          const status = subscription.status === 'active' ? 'active' : 
                        subscription.cancel_at_period_end ? 'canceled' : 'past_due'
          
          await fastify.pg.query(`
            UPDATE users SET
              subscription_status = $1,
              subscription_ends_at = $2,
              updated_at = NOW()
            WHERE subscription_id = $3
          `, [
            status,
            subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
            subscription.id
          ])
          break
        }
        
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          
          await fastify.pg.query(`
            UPDATE users SET
              subscription_tier = 'free',
              subscription_status = 'active',
              subscription_id = NULL,
              subscription_ends_at = NULL,
              credits_remaining = 3,
              updated_at = NOW()
            WHERE subscription_id = $1
          `, [subscription.id])
          break
        }
        
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          if (invoice.subscription) {
            await fastify.pg.query(`
              UPDATE users SET subscription_status = 'past_due', updated_at = NOW()
              WHERE subscription_id = $1
            `, [invoice.subscription])
          }
          break
        }
      }
      
      // Mark webhook as processed
      await fastify.pg.query(`
        UPDATE payment_webhooks SET processed = TRUE, processed_at = NOW()
        WHERE provider = 'stripe' AND event_id = $1
      `, [event.id])
      
    } catch (error) {
      fastify.log.error(error)
      await fastify.pg.query(`
        UPDATE payment_webhooks SET error = $1
        WHERE provider = 'stripe' AND event_id = $2
      `, [String(error), event.id])
    }
    
    return { received: true }
  })
}
