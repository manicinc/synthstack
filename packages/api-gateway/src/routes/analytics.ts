import type { FastifyInstance } from 'fastify';
import { getAnalyticsService } from '../services/analytics/index.js';

export default async function analyticsRoutes(fastify: FastifyInstance) {
  const analyticsService = getAnalyticsService();

  // Public: User overview
  fastify.get('/overview', { preHandler: [fastify.authenticate], schema: { tags: ['Analytics'], security: [{ bearerAuth: [] }] } }, async (request: any, reply) => {
    try {
      const userId = request.user.id;
      const result = await fastify.pg.query('SELECT COUNT(*) as generations, COALESCE(SUM(ABS(amount)), 0) as credits_used FROM credit_transactions WHERE user_id = $1 AND type = $2', [userId, 'generation']);
      return { success: true, data: { totalGenerations: parseInt(result.rows[0].generations), totalCreditsUsed: parseInt(result.rows[0].credits_used) } };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  // Admin: Full dashboard
  fastify.get('/admin/dashboard', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    try {
      const kpis = await fastify.pg.query('SELECT * FROM analytics_kpis');
      const recent = await fastify.pg.query('SELECT * FROM analytics_daily ORDER BY date DESC LIMIT 30');
      const hourly = await fastify.pg.query('SELECT * FROM analytics_hourly ORDER BY hour DESC LIMIT 24');
      return { success: true, data: { kpis: kpis.rows[0], daily: recent.rows, hourly: hourly.rows } };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  // Admin: Daily metrics
  fastify.get<{ Querystring: { startDate?: string; endDate?: string } }>('/admin/daily', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request: any, reply) => {
    try {
      const { startDate, endDate } = request.query;
      let query = 'SELECT * FROM analytics_daily WHERE 1=1';
      const params: any[] = [];
      if (startDate) { query += ' AND date >= $1'; params.push(startDate); }
      if (endDate) { query += ` AND date <= $${params.length + 1}`; params.push(endDate); }
      query += ' ORDER BY date DESC';
      const result = await fastify.pg.query(query, params);
      return { success: true, data: { metrics: result.rows } };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  // Admin: Event stream
  fastify.get<{ Querystring: { category?: string; type?: string; userId?: string; limit?: number } }>('/admin/events', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request: any, reply) => {
    try {
      const { category, type, userId, limit = 100 } = request.query;
      let query = 'SELECT * FROM analytics_events WHERE 1=1';
      const params: any[] = [];
      if (category) { query += ' AND event_category = $1'; params.push(category); }
      if (type) { query += ` AND event_type = $${params.length + 1}`; params.push(type); }
      if (userId) { query += ` AND user_id = $${params.length + 1}`; params.push(userId); }
      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      const result = await fastify.pg.query(query, params);
      return { success: true, data: { events: result.rows } };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  // Admin: Funnels
  fastify.get('/admin/funnels', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    try {
      const result = await fastify.pg.query('SELECT * FROM analytics_funnels ORDER BY name ASC');
      return { success: true, data: { funnels: result.rows } };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  fastify.get<{ Params: { id: string } }>('/admin/funnels/:id', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request: any, reply) => {
    try {
      const metrics = await analyticsService.computeFunnel(request.params.id);
      return { success: true, data: metrics };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  fastify.post<{ Body: { name: string; slug: string; steps: any[]; windowDays: number } }>('/admin/funnels', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request: any, reply) => {
    try {
      const { name, slug, steps, windowDays } = request.body;
      const result = await fastify.pg.query('INSERT INTO analytics_funnels (name, slug, steps, window_days, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, slug, JSON.stringify(steps), windowDays, request.user.id]);
      return { success: true, data: result.rows[0] };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  // Admin: Cohorts
  fastify.get('/admin/cohorts', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    try {
      const result = await fastify.pg.query('SELECT * FROM analytics_cohorts ORDER BY name ASC');
      return { success: true, data: { cohorts: result.rows } };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  fastify.get<{ Params: { id: string } }>('/admin/cohorts/:id', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request: any, reply) => {
    try {
      const data = await analyticsService.computeCohort(request.params.id);
      return { success: true, data };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  // Admin: Reports
  fastify.get('/admin/reports', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    try {
      const result = await fastify.pg.query('SELECT * FROM analytics_reports ORDER BY name ASC');
      return { success: true, data: { reports: result.rows } };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  fastify.post<{ Params: { id: string } }>('/admin/reports/:id/execute', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request: any, reply) => {
    try {
      const data = await analyticsService.executeReport(request.params.id);
      return { success: true, data };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });

  // Admin: Export
  fastify.post<{ Body: { name: string; sourceType: string; query: string; format: string } }>('/admin/export', { preHandler: [fastify.authenticate, fastify.requireAdmin], schema: { tags: ['Analytics', 'Admin'], security: [{ bearerAuth: [] }] } }, async (request: any, reply) => {
    try {
      const exportId = await analyticsService.createExport({ ...request.body, requestedBy: request.user.id });
      await analyticsService.processExport(exportId);
      return { success: true, data: { exportId } };
    } catch (error: any) { return reply.status(500).send({ success: false, error: error.message }); }
  });
}
