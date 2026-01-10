/**
 * Admin LLM Costs Routes
 * 
 * API endpoints for the internal admin dashboard to track
 * global LLM API costs, usage, and budget alerts.
 * 
 * Restricted to team@manic.agency users only.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { llmCostService, type DateRange } from '../services/llm-cost.js';
import { llmAlertService, type CreateAlertInput, type UpdateAlertInput } from '../services/llm-alerts.js';
import { logger } from '../utils/logger.js';

// ============================================
// Request Types
// ============================================

interface GlobalStatsQuery {
  startDate?: string;
  endDate?: string;
}

interface OrgUsageQuery {
  limit?: number;
  offset?: number;
  sortBy?: 'cost' | 'requests' | 'name';
  sortOrder?: 'asc' | 'desc';
  minCostCents?: number;
}

interface ModelUsageQuery {
  startDate?: string;
  endDate?: string;
}

interface TrendsQuery {
  days?: number;
  groupBy?: 'day' | 'hour';
  provider?: string;
  organizationId?: string;
}

interface ExportQuery {
  startDate?: string;
  endDate?: string;
  organizationId?: string;
}

interface AlertListQuery {
  organizationId?: string;
  activeOnly?: boolean;
  alertType?: string;
  limit?: number;
  offset?: number;
}

interface AlertHistoryQuery {
  alertId?: string;
  limit?: number;
  offset?: number;
}

interface OrgDetailParams {
  organizationId: string;
}

interface AlertIdParams {
  id: string;
}

// ============================================
// Route Handler
// ============================================

export default async function adminLLMCostsRoutes(fastify: FastifyInstance) {
  // Initialize services with server instance
  llmCostService.setServer(fastify);
  llmAlertService.setServer(fastify);

  // ============================================
  // Global Cost Stats
  // ============================================

  /**
   * GET /global
   * Get global LLM usage statistics
   */
  fastify.get<{ Querystring: GlobalStatsQuery }>(
    '/global',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs'],
        summary: 'Get global LLM usage statistics',
        description: 'Returns total requests, tokens, costs, and breakdown by provider',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              totalRequests: { type: 'number' },
              totalTokens: { type: 'number' },
              totalCostCents: { type: 'number' },
              avgLatencyMs: { type: 'number' },
              successRate: { type: 'number' },
              mtdCostCents: { type: 'number' },
              todayCostCents: { type: 'number' },
              byProvider: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { startDate, endDate } = request.query;

      const range: DateRange | undefined =
        startDate || endDate
          ? {
              startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              endDate: endDate ? new Date(endDate) : new Date(),
            }
          : undefined;

      const stats = await llmCostService.getGlobalStats(range);

      logger.info('Admin fetched global LLM stats', {
        userId: request.user?.id,
        action: 'admin_llm_global_stats',
      });

      return stats;
    }
  );

  // ============================================
  // Organization Breakdown
  // ============================================

  /**
   * GET /by-org
   * Get LLM usage breakdown by organization
   */
  fastify.get<{ Querystring: OrgUsageQuery }>(
    '/by-org',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs'],
        summary: 'Get LLM usage by organization',
        description: 'Returns usage summary for all organizations',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
            sortBy: { type: 'string', enum: ['cost', 'requests', 'name'] },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
            minCostCents: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const orgs = await llmCostService.getOrgUsageSummary({
        limit: request.query.limit,
        offset: request.query.offset,
        sortBy: request.query.sortBy,
        sortOrder: request.query.sortOrder,
        minCostCents: request.query.minCostCents,
      });

      return orgs;
    }
  );

  /**
   * GET /by-org/:organizationId
   * Get detailed LLM usage for a specific organization
   */
  fastify.get<{ Params: OrgDetailParams; Querystring: GlobalStatsQuery }>(
    '/by-org/:organizationId',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs'],
        summary: 'Get detailed LLM usage for an organization',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            organizationId: { type: 'string', format: 'uuid' },
          },
          required: ['organizationId'],
        },
      },
    },
    async (request, reply) => {
      const { organizationId } = request.params;
      const { startDate, endDate } = request.query;

      const range: DateRange | undefined =
        startDate || endDate
          ? {
              startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              endDate: endDate ? new Date(endDate) : new Date(),
            }
          : undefined;

      const details = await llmCostService.getOrgDetailedUsage(organizationId, range);

      if (!details.summary) {
        return reply.status(404).send({ error: 'Organization not found or no usage data' });
      }

      return details;
    }
  );

  // ============================================
  // Model Breakdown
  // ============================================

  /**
   * GET /by-model
   * Get LLM usage breakdown by model
   */
  fastify.get<{ Querystring: ModelUsageQuery }>(
    '/by-model',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs'],
        summary: 'Get LLM usage by model',
        description: 'Returns usage statistics grouped by provider and model',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      const { startDate, endDate } = request.query;

      const range: DateRange | undefined =
        startDate || endDate
          ? {
              startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              endDate: endDate ? new Date(endDate) : new Date(),
            }
          : undefined;

      const models = await llmCostService.getModelUsage(range);
      return models;
    }
  );

  // ============================================
  // Cost Trends
  // ============================================

  /**
   * GET /trends
   * Get cost trends over time
   */
  fastify.get<{ Querystring: TrendsQuery }>(
    '/trends',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs'],
        summary: 'Get LLM cost trends',
        description: 'Returns time-series cost data for charts',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'number', default: 30 },
            groupBy: { type: 'string', enum: ['day', 'hour'] },
            provider: { type: 'string' },
            organizationId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const trends = await llmCostService.getCostTrends({
        days: request.query.days,
        groupBy: request.query.groupBy,
        provider: request.query.provider,
        organizationId: request.query.organizationId,
      });

      return trends;
    }
  );

  // ============================================
  // Export
  // ============================================

  /**
   * GET /export
   * Export usage data as CSV
   */
  fastify.get<{ Querystring: ExportQuery }>(
    '/export',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs'],
        summary: 'Export LLM usage data as CSV',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            organizationId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { startDate, endDate, organizationId } = request.query;

      const csv = await llmCostService.exportUsageCSV({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        organizationId,
      });

      logger.info('Admin exported LLM usage data', {
        userId: request.user?.id,
        organizationId,
        action: 'admin_llm_export',
      });

      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="llm-usage-${new Date().toISOString().split('T')[0]}.csv"`)
        .send(csv);
    }
  );

  // ============================================
  // Aggregation (manual trigger)
  // ============================================

  /**
   * POST /aggregate
   * Manually trigger cost aggregation
   */
  fastify.post<{ Body: { periodType: 'hourly' | 'daily' } }>(
    '/aggregate',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs'],
        summary: 'Manually trigger cost aggregation',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            periodType: { type: 'string', enum: ['hourly', 'daily'] },
          },
          required: ['periodType'],
        },
      },
    },
    async (request, reply) => {
      const { periodType } = request.body;

      const rowsInserted = await llmCostService.computeAggregates(periodType);

      logger.info('Admin triggered LLM cost aggregation', {
        userId: request.user?.id,
        periodType,
        rowsInserted,
        action: 'admin_llm_aggregate',
      });

      return { success: true, rowsInserted };
    }
  );

  // ============================================
  // Budget Alerts
  // ============================================

  /**
   * GET /alerts
   * List all budget alerts
   */
  fastify.get<{ Querystring: AlertListQuery }>(
    '/alerts',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs', 'Alerts'],
        summary: 'List budget alerts',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: 'string', format: 'uuid' },
            activeOnly: { type: 'boolean' },
            alertType: { type: 'string' },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const alerts = await llmAlertService.listAlerts({
        organizationId: request.query.organizationId,
        activeOnly: request.query.activeOnly,
        alertType: request.query.alertType as any,
        limit: request.query.limit,
        offset: request.query.offset,
      });

      return alerts;
    }
  );

  /**
   * POST /alerts
   * Create a new budget alert
   */
  fastify.post<{ Body: CreateAlertInput }>(
    '/alerts',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs', 'Alerts'],
        summary: 'Create a budget alert',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            organizationId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            alertType: { type: 'string', enum: ['daily_limit', 'weekly_limit', 'monthly_limit', 'spike', 'threshold'] },
            thresholdCents: { type: 'number' },
            thresholdRequests: { type: 'number' },
            spikePercent: { type: 'number' },
            notificationEmails: { type: 'array', items: { type: 'string' } },
            notificationSlackWebhook: { type: 'string' },
            notificationFrequency: { type: 'string', enum: ['once', 'hourly', 'daily'] },
          },
          required: ['name', 'alertType', 'thresholdCents'],
        },
      },
    },
    async (request, reply) => {
      const alert = await llmAlertService.createAlert({
        ...request.body,
        createdBy: request.user?.id,
      });

      logger.info('Admin created LLM budget alert', {
        userId: request.user?.id,
        alertId: alert.id,
        action: 'admin_llm_alert_create',
      });

      return reply.status(201).send(alert);
    }
  );

  /**
   * GET /alerts/:id
   * Get a specific alert
   */
  fastify.get<{ Params: AlertIdParams }>(
    '/alerts/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs', 'Alerts'],
        summary: 'Get a specific budget alert',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const alert = await llmAlertService.getAlertById(request.params.id);

      if (!alert) {
        return reply.status(404).send({ error: 'Alert not found' });
      }

      return alert;
    }
  );

  /**
   * PUT /alerts/:id
   * Update a budget alert
   */
  fastify.put<{ Params: AlertIdParams; Body: UpdateAlertInput }>(
    '/alerts/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs', 'Alerts'],
        summary: 'Update a budget alert',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            thresholdCents: { type: 'number' },
            thresholdRequests: { type: 'number' },
            spikePercent: { type: 'number' },
            notificationEmails: { type: 'array', items: { type: 'string' } },
            notificationSlackWebhook: { type: 'string' },
            notificationFrequency: { type: 'string', enum: ['once', 'hourly', 'daily'] },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const alert = await llmAlertService.updateAlert(request.params.id, request.body);

      if (!alert) {
        return reply.status(404).send({ error: 'Alert not found' });
      }

      logger.info('Admin updated LLM budget alert', {
        userId: request.user?.id,
        alertId: alert.id,
        action: 'admin_llm_alert_update',
      });

      return alert;
    }
  );

  /**
   * DELETE /alerts/:id
   * Delete a budget alert
   */
  fastify.delete<{ Params: AlertIdParams }>(
    '/alerts/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs', 'Alerts'],
        summary: 'Delete a budget alert',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const deleted = await llmAlertService.deleteAlert(request.params.id);

      if (!deleted) {
        return reply.status(404).send({ error: 'Alert not found' });
      }

      logger.info('Admin deleted LLM budget alert', {
        userId: request.user?.id,
        alertId: request.params.id,
        action: 'admin_llm_alert_delete',
      });

      return { success: true };
    }
  );

  /**
   * POST /alerts/:id/test
   * Test an alert (check without triggering notifications)
   */
  fastify.post<{ Params: AlertIdParams }>(
    '/alerts/:id/test',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs', 'Alerts'],
        summary: 'Test a budget alert',
        description: 'Checks the alert condition without sending notifications',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await llmAlertService.testAlert(request.params.id);

        logger.info('Admin tested LLM budget alert', {
          userId: request.user?.id,
          alertId: request.params.id,
          result,
          action: 'admin_llm_alert_test',
        });

        return result;
      } catch (error) {
        if (error instanceof Error && error.message === 'Alert not found') {
          return reply.status(404).send({ error: 'Alert not found' });
        }
        throw error;
      }
    }
  );

  /**
   * POST /alerts/check-all
   * Check all active alerts
   */
  fastify.post(
    '/alerts/check-all',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs', 'Alerts'],
        summary: 'Check all active alerts',
        description: 'Manually triggers a check of all active budget alerts',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const result = await llmAlertService.checkAlerts();

      logger.info('Admin triggered LLM budget alerts check', {
        userId: request.user?.id,
        ...result,
        action: 'admin_llm_alerts_check',
      });

      return result;
    }
  );

  /**
   * GET /alerts/history
   * Get alert trigger history
   */
  fastify.get<{ Querystring: AlertHistoryQuery }>(
    '/alerts/history',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        tags: ['Admin', 'LLM Costs', 'Alerts'],
        summary: 'Get alert trigger history',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            alertId: { type: 'string', format: 'uuid' },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const history = await llmAlertService.getAlertHistory({
        alertId: request.query.alertId,
        limit: request.query.limit,
        offset: request.query.offset,
      });

      return history;
    }
  );
}

