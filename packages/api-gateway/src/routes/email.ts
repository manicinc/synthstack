/**
 * @file routes/email.ts
 * @description Email management API routes
 * @module @synthstack/api-gateway/routes
 */

import type { FastifyInstance } from 'fastify';
import { getEmailService, getEmailQueueService, EMAIL_TEMPLATES } from '../services/email/index.js';
import { previewTemplate } from '../services/email/renderer.js';

export default async function emailRoutes(fastify: FastifyInstance) {
  const emailService = getEmailService();
  const queueService = getEmailQueueService();

  // Public tracking pixel
  fastify.get<{ Params: { messageId: string } }>('/track/open/:messageId.png', async (request, reply) => {
    const { messageId } = request.params;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];

    await emailService.trackOpen(messageId, ip, userAgent);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    reply.type('image/gif').send(pixel);
  });

  // Click tracking redirect
  fastify.get<{ Params: { messageId: string }; Querystring: { url: string } }>('/track/click/:messageId', async (request, reply) => {
    const { messageId } = request.params;
    const { url } = request.query;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];

    await emailService.trackClick(messageId, url, ip, userAgent);

    reply.redirect(302, url);
  });

  // Admin: Email stats
  fastify.get<{ Querystring: { days?: number } }>('/admin/stats', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request: any, reply) => {
    try {
      const { days = 7 } = request.query;
      const stats = await emailService.getStats(days);
      const queueStats = await queueService.getStats();
      
      return {
        success: true,
        data: {
          delivery: stats,
          queue: queueStats,
        },
      };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: List templates
  fastify.get('/admin/templates', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    try {
      const result = await fastify.pg.query('SELECT * FROM email_templates ORDER BY category, name');
      return { success: true, data: { templates: result.rows } };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: Get template
  fastify.get<{ Params: { slug: string } }>('/admin/templates/:slug', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    try {
      const { slug } = request.params;
      const result = await fastify.pg.query('SELECT * FROM email_templates WHERE slug = $1', [slug]);
      
      if (result.rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'Template not found' });
      }

      return { success: true, data: result.rows[0] };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: Preview template
  fastify.post<{ Params: { slug: string }; Body: { sampleData?: any } }>('/admin/templates/:slug/preview', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    try {
      const { slug } = request.params;
      const { sampleData } = request.body;
      
      const html = await previewTemplate(slug, sampleData);
      
      reply.type('text/html').send(html);
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: Send test email
  fastify.post<{ Body: { to: string; templateSlug: string; templateData?: any } }>('/admin/send-test', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request: any, reply) => {
    try {
      const { to, templateSlug, templateData } = request.body;
      
      const result = await emailService.sendEmail({
        to,
        subject: `Test Email: ${templateSlug}`,
        templateSlug,
        templateData: templateData || {},
        priority: 10,
        userId: request.user.id,
      });

      return { success: result.success, data: result };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: Email logs
  fastify.get<{ Querystring: { limit?: number; status?: string; userId?: string } }>('/admin/logs', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request: any, reply) => {
    try {
      const { limit = 100, status, userId } = request.query;
      
      let query = 'SELECT * FROM email_logs WHERE 1=1';
      const params: any[] = [];

      if (status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(status);
      }

      if (userId) {
        query += ` AND user_id = $${params.length + 1}`;
        params.push(userId);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await fastify.pg.query(query, params);
      
      return { success: true, data: { logs: result.rows } };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: Queue status
  fastify.get('/admin/queue', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    try {
      const stats = await queueService.getStats();
      const failed = await queueService.getFailedJobs(10);
      
      return {
        success: true,
        data: {
          stats,
          failedJobs: failed.map(j => ({
            id: j.id,
            data: j.data,
            failedReason: j.failedReason,
            attemptsMade: j.attemptsMade,
          })),
        },
      };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: Retry failed job
  fastify.post<{ Params: { jobId: string } }>('/admin/queue/retry/:jobId', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    try {
      const { jobId } = request.params;
      const retried = await queueService.retryJob(jobId);
      
      if (!retried) {
        return reply.status(404).send({ success: false, error: 'Job not found or not failed' });
      }

      return { success: true, message: 'Job queued for retry' };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: Queue dashboard
  fastify.get('/admin/dashboard', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    try {
      const dashboardData = await fastify.pg.query('SELECT * FROM email_dashboard');
      return { success: true, data: dashboardData.rows[0] };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: Template performance
  fastify.get('/admin/template-performance', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    try {
      const result = await fastify.pg.query('SELECT * FROM email_template_performance ORDER BY open_rate DESC');
      return { success: true, data: { templates: result.rows } };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: Bounce list
  fastify.get('/admin/bounce-list', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    try {
      const result = await fastify.pg.query('SELECT * FROM email_bounce_list WHERE is_suppressed = TRUE ORDER BY last_bounced_at DESC LIMIT 100');
      return { success: true, data: { bounces: result.rows } };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // Admin: Remove from bounce list
  fastify.delete<{ Params: { email: string } }>('/admin/bounce-list/:email', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: { tags: ['Email', 'Admin'], security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    try {
      const { email } = request.params;
      await fastify.pg.query('UPDATE email_bounce_list SET is_suppressed = FALSE WHERE email = $1', [email.toLowerCase()]);
      return { success: true, message: 'Email removed from bounce list' };
    } catch (error: any) {
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
}
