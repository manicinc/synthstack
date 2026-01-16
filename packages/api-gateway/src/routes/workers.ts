import type { FastifyInstance } from 'fastify';
import { TIER_CONFIG } from '../services/stripe.js';

export default async function workerRoutes(fastify: FastifyInstance) {
  const verifyWorkerAuth = async (request: any, reply: any) => {
    const authHeader = request.headers.authorization;
    const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET || 'dev-admin-secret';
    if (!authHeader || authHeader !== 'Bearer ' + cronSecret) {
      return reply.status(401).send({ success: false, error: 'Unauthorized' });
    }
  };

  fastify.post('/reset-credits', { preHandler: [verifyWorkerAuth], schema: { tags: ['Workers'] } }, async (request, reply) => {
    const results = { free: 0, maker: 0, pro: 0, agency: 0, total: 0, errors: 0 };
    for (const [tier, config] of Object.entries(TIER_CONFIG)) {
      const creditsToGrant = config.creditsPerDay === Infinity ? 999999 : config.creditsPerDay;
      const usersResult = await fastify.pg.query(
        `SELECT id, credits_remaining FROM app_users
         WHERE (subscription_tier = $1 OR ($1 = 'agency' AND subscription_tier = 'unlimited'))
           AND subscription_status = $2
           AND (credits_reset_at IS NULL OR credits_reset_at < DATE_TRUNC($3, NOW()))`,
        [tier, 'active', 'day']
      );
      for (const user of usersResult.rows) {
        try {
          await fastify.pg.query('UPDATE app_users SET credits_remaining = $1, credits_reset_at = NOW() WHERE id = $2', [creditsToGrant, user.id]);
          await fastify.pg.query('INSERT INTO credit_transactions (user_id, type, amount, balance_before, balance_after, reason) VALUES ($1, $2, $3, $4, $5, $6)', [user.id, 'daily_reset', creditsToGrant - user.credits_remaining, user.credits_remaining, creditsToGrant, 'Daily reset']);
          results[tier as keyof typeof results]++; results.total++;
        } catch { results.errors++; }
      }
    }
    return { success: true, data: results };
  });

  fastify.post('/check-expirations', { preHandler: [verifyWorkerAuth], schema: { tags: ['Workers'] } }, async (request, reply) => {
    const expired = await fastify.pg.query('SELECT id, subscription_tier FROM app_users WHERE subscription_status = $1 AND subscription_ends_at < NOW() AND subscription_tier != $2', ['canceled', 'free']);
    let downgraded = 0;
    for (const user of expired.rows) {
      await fastify.pg.query('UPDATE app_users SET subscription_tier = $1, subscription_status = $2, subscription_id = NULL, subscription_ends_at = NULL, credits_remaining = $3 WHERE id = $4', ['free', 'active', TIER_CONFIG.free.creditsPerDay, user.id]);
      await fastify.pg.query('INSERT INTO subscription_history (user_id, action, from_tier, to_tier, reason) VALUES ($1, $2, $3, $4, $5)', [user.id, 'expired', user.subscription_tier, 'free', 'Expired']);
      downgraded++;
    }
    return { success: true, data: { checked: expired.rows.length, downgraded } };
  });

  fastify.post('/aggregate-analytics', { preHandler: [verifyWorkerAuth], schema: { tags: ['Workers'] } }, async (request, reply) => {
    const { getAnalyticsService } = await import('../services/analytics/index.js');
    const analyticsService = getAnalyticsService();
    await analyticsService.aggregateDaily();
    return { success: true };
  });

  fastify.post('/sync-newsletter', { preHandler: [verifyWorkerAuth], schema: { tags: ['Workers'] } }, async (request, reply) => {
    const { getNewsletterService } = await import('../services/newsletter/index.js');
    const result = await getNewsletterService().syncToProviders();
    return { success: true, data: result };
  });

  fastify.post('/process-sequences', { preHandler: [verifyWorkerAuth], schema: { tags: ['Workers'] } }, async (request, reply) => {
    const { processSequenceEnrollments } = await import('../services/newsletter/sequences.js');
    const processed = await processSequenceEnrollments(fastify);
    return { success: true, data: { processed } };
  });

  fastify.post('/update-segments', { preHandler: [verifyWorkerAuth], schema: { tags: ['Workers'] } }, async (request, reply) => {
    const segments = await fastify.pg.query('SELECT id FROM newsletter_segments WHERE is_dynamic = TRUE');
    for (const seg of segments.rows) {
      const count = await fastify.pg.query('SELECT COUNT(*) FROM newsletter_segment_members WHERE segment_id = $1', [seg.id]);
      await fastify.pg.query('UPDATE newsletter_segments SET subscriber_count = $1, last_computed_at = NOW() WHERE id = $2', [count.rows[0].count, seg.id]);
    }
    return { success: true, data: { updated: segments.rows.length } };
  });

  fastify.post('/aggregate-hourly', { preHandler: [verifyWorkerAuth], schema: { tags: ['Workers'] } }, async (request, reply) => {
    const { getAnalyticsService } = await import('../services/analytics/index.js');
    await getAnalyticsService().aggregateHourly();
    return { success: true };
  });

  fastify.post('/compute-funnels', { preHandler: [verifyWorkerAuth], schema: { tags: ['Workers'] } }, async (request, reply) => {
    const { getAnalyticsService } = await import('../services/analytics/index.js');
    const funnels = await fastify.pg.query('SELECT id FROM analytics_funnels WHERE status = $1', ['published']);
    for (const f of funnels.rows) await getAnalyticsService().computeFunnel(f.id);
    return { success: true, data: { computed: funnels.rows.length } };
  });

  fastify.post('/refresh-cohorts', { preHandler: [verifyWorkerAuth], schema: { tags: ['Workers'] } }, async (request, reply) => {
    const { getAnalyticsService } = await import('../services/analytics/index.js');
    const cohorts = await fastify.pg.query('SELECT id FROM analytics_cohorts WHERE status = $1', ['published']);
    for (const c of cohorts.rows) await getAnalyticsService().computeCohort(c.id);
    return { success: true, data: { refreshed: cohorts.rows.length } };
  });

  fastify.post('/cleanup', { preHandler: [verifyWorkerAuth], schema: { tags: ['Workers'] } }, async (request, reply) => {
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() - 30);
    const ninetyDays = new Date(); ninetyDays.setDate(ninetyDays.getDate() - 90);
    const webhooks = await fastify.pg.query('DELETE FROM payment_webhooks WHERE processed = TRUE AND created_at < $1', [thirtyDays.toISOString()]);
    const events = await fastify.pg.query('DELETE FROM analytics_events WHERE timestamp < $1', [ninetyDays.toISOString()]);
    return { success: true, data: { webhooksDeleted: webhooks.rowCount, eventsDeleted: events.rowCount } };
  });

  fastify.get('/health', { schema: { tags: ['Workers'] } }, async () => ({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } }));
}
