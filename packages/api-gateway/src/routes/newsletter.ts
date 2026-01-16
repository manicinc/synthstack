import type { FastifyInstance } from 'fastify';
import { getNewsletterService } from '../services/newsletter/index.js';

export default async function newsletterRoutes(fastify: FastifyInstance) {
  const newsletterService = getNewsletterService();

  fastify.post<{ Body: { email: string; firstName?: string; lastName?: string; subscriptionTier?: string } }>('/subscribe', {
    schema: { tags: ['Newsletter'], summary: 'Subscribe to newsletter' },
  }, async (request, reply) => {
    try {
      const result = await newsletterService.subscribe(request.body);
      return { success: result.success, message: result.success ? 'Subscribed' : 'Failed', details: result.results };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post<{ Body: { email: string; reason?: string } }>('/unsubscribe', {
    schema: { tags: ['Newsletter'], summary: 'Unsubscribe from newsletter' },
  }, async (request, reply) => {
    try {
      const { email, reason } = request.body;
      if (reason) await fastify.pg.query('UPDATE newsletter_subscribers SET admin_notes = $1 WHERE email = $2', [`Reason: ${reason}`, email]);
      const result = await newsletterService.unsubscribe(email);
      return { success: result.success, message: result.success ? 'Unsubscribed' : 'Failed' };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.get<{ Querystring: { email?: string } }>('/status', {
    schema: { tags: ['Newsletter'], summary: 'Get subscription status' },
  }, async (request: any, reply) => {
    try {
      const email = request.query.email || request.user?.email;
      if (!email) return reply.status(400).send({ success: false, error: 'Email required' });
      const status = await newsletterService.getSubscriberStatus(email);
      return { success: true, data: status };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/webhooks/mailerlite', { config: { rawBody: true }, schema: { tags: ['Newsletter'] } }, async (request: any, reply) => {
    try {
      const event = await newsletterService.processWebhook('mailerlite', request.body, request.headers as Record<string, string>);
      if (!event) return reply.status(400).send({ received: false });
      return { received: true };
    } catch (error) { return reply.status(500).send({ received: false }); }
  });

  fastify.post('/webhooks/mailchimp', { schema: { tags: ['Newsletter'] } }, async (request: any, reply) => {
    try {
      const event = await newsletterService.processWebhook('mailchimp', request.body, request.headers as Record<string, string>);
      if (!event) return reply.status(400).send({ received: false });
      return { received: true };
    } catch (error) { return reply.status(500).send({ received: false }); }
  });

  fastify.post('/webhooks/brevo', { schema: { tags: ['Newsletter'] } }, async (request: any, reply) => {
    try {
      const event = await newsletterService.processWebhook('brevo', request.body, request.headers as Record<string, string>);
      if (!event) return reply.status(400).send({ received: false });
      return { received: true };
    } catch (error) { return reply.status(500).send({ received: false }); }
  });

  fastify.get<{ Querystring: { limit?: number; offset?: number; status?: string } }>('/admin/subscribers', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Newsletter', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request: any, reply) => {
    try {
      const { limit = 50, offset = 0, status } = request.query;
      let query = 'SELECT * FROM newsletter_subscribers WHERE 1=1';
      const params: any[] = [];
      if (status) { query += ' AND status = $1'; params.push(status); }
      query += ` ORDER BY subscribed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      const result = await fastify.pg.query(query, params);
      const count = await fastify.pg.query('SELECT COUNT(*) FROM newsletter_subscribers');
      return { success: true, data: { subscribers: result.rows, pagination: { total: parseInt(count.rows[0].count), limit, offset } } };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  fastify.get('/admin/segments', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Newsletter', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    try {
      const result = await fastify.pg.query('SELECT * FROM newsletter_segments ORDER BY name ASC');
      return { success: true, data: { segments: result.rows } };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  fastify.post<{ Body: { name: string; slug: string; description?: string; criteria: any } }>('/admin/segments', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Newsletter', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request: any, reply) => {
    try {
      const { name, slug, description, criteria } = request.body;
      const result = await fastify.pg.query('INSERT INTO newsletter_segments (name, slug, description, criteria, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, slug, description, JSON.stringify(criteria), request.user.id]);
      return { success: true, data: result.rows[0] };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  fastify.post<{ Body: { name: string; subject: string; contentHtml: string; segmentId?: string; scheduledAt?: string } }>('/admin/campaigns', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Newsletter', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request: any, reply) => {
    try {
      const { name, subject, contentHtml, segmentId, scheduledAt } = request.body;
      const result = await fastify.pg.query('INSERT INTO newsletter_campaigns (name, subject, content_html, segment_id, scheduled_at, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, subject, contentHtml, segmentId, scheduledAt, scheduledAt ? 'scheduled' : 'draft', request.user.id]);
      return { success: true, data: result.rows[0] };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  fastify.post<{ Body: { direction?: string } }>('/admin/sync', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Newsletter', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    try {
      const result = await newsletterService.syncToProviders();
      return { success: true, data: result };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  fastify.get('/admin/stats', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Newsletter', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    try {
      const stats = await fastify.pg.query('SELECT * FROM newsletter_dashboard');
      return { success: true, data: stats.rows[0] };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });
}
