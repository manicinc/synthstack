/**
 * @file routes/orchestration.ts
 * @description User-facing API endpoints for autonomous orchestration
 * @module @synthstack/api-gateway/routes
 *
 * Endpoints for managing orchestration schedules, action configs,
 * job history, and manual triggers. All endpoints require authentication
 * and the `autonomous_orchestration` feature flag.
 *
 * Endpoints:
 * - Schedule CRUD: GET/POST/PUT/DELETE /schedules
 * - Action Config CRUD: GET/POST/PUT/DELETE /action-configs
 * - Manual Trigger: POST /trigger
 * - Job History: GET /jobs, GET /jobs/:jobId
 * - GitHub Analysis: GET /analysis/:projectId
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getOrchestrationService } from '../services/orchestration/index.js';
import type {
  OrchestrationSchedule,
  OrchestrationJob,
  ExecutionLog,
  GitHubAnalysis,
} from '../services/orchestration/index.js';
import { getOrchestrationQueueService } from '../services/orchestration/queue.js';
import { featureFlagsService } from '../services/featureFlags.js';

// ============================================
// Types
// ============================================

interface ScheduleParams {
  scheduleId: string;
}

interface ProjectParams {
  projectId: string;
}

interface JobParams {
  jobId: string;
}

interface ActionConfigParams {
  configId: string;
}

interface ScheduleBody {
  projectId: string;
  agentId: string;
  isEnabled?: boolean;
  scheduleType?: 'hourly' | 'every_4h' | 'every_8h' | 'daily' | 'weekly' | 'custom';
  cronExpression?: string;
  timezone?: string;
  runAfterTime?: string;
  runBeforeTime?: string;
  runOnDays?: number[];
  minIntervalMinutes?: number;
  maxRunsPerDay?: number;
  priority?: number;
}

interface ActionConfigBody {
  projectId: string;
  actionKey: string;
  actionName: string;
  actionCategory: 'github' | 'content' | 'analysis' | 'notification' | 'task' | 'communication';
  agentSlug?: string;
  isEnabled?: boolean;
  requiresApproval?: boolean;
  autoApproveLowRisk?: boolean;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  maxPerDay?: number;
  maxPerHour?: number;
}

interface TriggerBody {
  projectId: string;
  agentSlug?: string;
}

interface JobsQuerystring {
  projectId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// Middleware
// ============================================

/**
 * Check if user has access to orchestration feature
 */
async function checkOrchestrationAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  fastify: FastifyInstance
): Promise<boolean> {
  const user = (request as any).user;
  if (!user) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
    return false;
  }

  const hasAccess = await featureFlagsService.hasFeature(user.id, 'autonomous_orchestration');
  if (!hasAccess) {
    reply.status(403).send({
      success: false,
      error: 'Autonomous orchestration requires a premium subscription',
      upgradeRequired: true,
    });
    return false;
  }

  return true;
}

/**
 * Check if user has access to a project
 */
async function checkProjectAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  fastify: FastifyInstance,
  projectId: string
): Promise<boolean> {
  const user = (request as any).user;

  const result = await fastify.pg.query(
    `SELECT 1 FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
     WHERE p.id = $1
     AND (p.owner_id = $2 OR pm.user_id IS NOT NULL)`,
    [projectId, user.id]
  );

  if (result.rows.length === 0) {
    reply.status(403).send({
      success: false,
      error: 'Access denied to this project',
    });
    return false;
  }

  return true;
}

// ============================================
// Route Handler
// ============================================

/**
 * User-facing orchestration routes
 * Requires authentication and autonomous_orchestration feature flag
 *
 * @param fastify - Fastify instance
 */
export default async function orchestrationRoutes(fastify: FastifyInstance) {
  // ============================================
  // SCHEDULES
  // ============================================

  /**
   * GET /schedules
   * List orchestration schedules for user's projects
   */
  fastify.get<{
    Querystring: { projectId?: string };
  }>(
    '/schedules',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'List orchestration schedules',
        description: 'Returns all orchestration schedules for projects the user has access to.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    projectId: { type: 'string' },
                    agentId: { type: 'string' },
                    agentSlug: { type: 'string' },
                    agentName: { type: 'string' },
                    isEnabled: { type: 'boolean' },
                    scheduleType: { type: 'string' },
                    lastRunAt: { type: 'string', nullable: true },
                    totalRuns: { type: 'number' },
                    totalSuccesses: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const user = (request as any).user;
      const { projectId } = request.query;

      try {
        let query = `
          SELECT s.*, a.slug as agent_slug, a.name as agent_name, p.name as project_name
          FROM agent_orchestration_schedules s
          JOIN ai_agents a ON s.agent_id = a.id
          JOIN projects p ON s.project_id = p.id
          LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
          WHERE (p.owner_id = $1 OR pm.user_id IS NOT NULL)
        `;
        const params: unknown[] = [user.id];

        if (projectId) {
          query += ` AND s.project_id = $2`;
          params.push(projectId);
        }

        query += ` ORDER BY p.name, a.slug`;

        const result = await fastify.pg.query(query, params);

        const schedules = result.rows.map((row) => ({
          id: row.id,
          projectId: row.project_id,
          projectName: row.project_name,
          agentId: row.agent_id,
          agentSlug: row.agent_slug,
          agentName: row.agent_name,
          isEnabled: row.is_enabled,
          scheduleType: row.schedule_type,
          cronExpression: row.cron_expression,
          timezone: row.timezone,
          runOnDays: row.run_on_days,
          priority: row.priority,
          lastRunAt: row.last_run_at,
          lastSuccessAt: row.last_success_at,
          consecutiveFailures: row.consecutive_failures,
          totalRuns: row.total_runs,
          totalSuccesses: row.total_successes,
        }));

        return reply.send({ success: true, data: schedules });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get schedules');
        return reply.status(500).send({
          success: false,
          error: 'Failed to retrieve schedules',
        });
      }
    }
  );

  /**
   * POST /schedules
   * Create a new orchestration schedule
   */
  fastify.post<{
    Body: ScheduleBody;
  }>(
    '/schedules',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'Create orchestration schedule',
        description: 'Creates a new orchestration schedule for an agent on a project.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['projectId', 'agentId'],
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            agentId: { type: 'string', format: 'uuid' },
            isEnabled: { type: 'boolean', default: true },
            scheduleType: {
              type: 'string',
              enum: ['hourly', 'every_4h', 'every_8h', 'daily', 'weekly', 'custom'],
              default: 'daily',
            },
            cronExpression: { type: 'string' },
            timezone: { type: 'string', default: 'UTC' },
            runAfterTime: { type: 'string' },
            runBeforeTime: { type: 'string' },
            runOnDays: { type: 'array', items: { type: 'number' } },
            minIntervalMinutes: { type: 'number', default: 60 },
            maxRunsPerDay: { type: 'number', default: 24 },
            priority: { type: 'number', minimum: 1, maximum: 10, default: 5 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const user = (request as any).user;
      const body = request.body;

      if (!(await checkProjectAccess(request, reply, fastify, body.projectId))) return;

      try {
        // Check if schedule already exists
        const existing = await fastify.pg.query(
          `SELECT id FROM agent_orchestration_schedules
           WHERE project_id = $1 AND agent_id = $2`,
          [body.projectId, body.agentId]
        );

        if (existing.rows.length > 0) {
          return reply.status(409).send({
            success: false,
            error: 'Schedule already exists for this agent on this project',
          });
        }

        const result = await fastify.pg.query(
          `INSERT INTO agent_orchestration_schedules (
            project_id, agent_id, is_enabled, schedule_type, cron_expression,
            timezone, run_after_time, run_before_time, run_on_days,
            min_interval_minutes, max_runs_per_day, priority, user_created
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            body.projectId,
            body.agentId,
            body.isEnabled ?? true,
            body.scheduleType || 'daily',
            body.cronExpression,
            body.timezone || 'UTC',
            body.runAfterTime,
            body.runBeforeTime,
            body.runOnDays || [0, 1, 2, 3, 4, 5, 6],
            body.minIntervalMinutes || 60,
            body.maxRunsPerDay || 24,
            body.priority || 5,
            user.id,
          ]
        );

        return reply.status(201).send({
          success: true,
          data: result.rows[0],
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to create schedule');
        return reply.status(500).send({
          success: false,
          error: 'Failed to create schedule',
        });
      }
    }
  );

  /**
   * PUT /schedules/:scheduleId
   * Update an orchestration schedule
   */
  fastify.put<{
    Params: ScheduleParams;
    Body: Partial<ScheduleBody>;
  }>(
    '/schedules/:scheduleId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'Update orchestration schedule',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['scheduleId'],
          properties: {
            scheduleId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            isEnabled: { type: 'boolean' },
            scheduleType: { type: 'string' },
            cronExpression: { type: 'string' },
            timezone: { type: 'string' },
            runAfterTime: { type: 'string' },
            runBeforeTime: { type: 'string' },
            runOnDays: { type: 'array', items: { type: 'number' } },
            minIntervalMinutes: { type: 'number' },
            maxRunsPerDay: { type: 'number' },
            priority: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const user = (request as any).user;
      const { scheduleId } = request.params;
      const body = request.body;

      try {
        // Get schedule and verify access
        const scheduleResult = await fastify.pg.query(
          `SELECT s.*, p.owner_id FROM agent_orchestration_schedules s
           JOIN projects p ON s.project_id = p.id
           LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
           WHERE s.id = $1 AND (p.owner_id = $2 OR pm.user_id IS NOT NULL)`,
          [scheduleId, user.id]
        );

        if (scheduleResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Schedule not found or access denied',
          });
        }

        // Build update query
        const updates: string[] = ['date_updated = NOW()', 'user_updated = $2'];
        const values: unknown[] = [scheduleId, user.id];
        let paramIndex = 3;

        if (body.isEnabled !== undefined) {
          updates.push(`is_enabled = $${paramIndex++}`);
          values.push(body.isEnabled);
        }
        if (body.scheduleType) {
          updates.push(`schedule_type = $${paramIndex++}`);
          values.push(body.scheduleType);
        }
        if (body.cronExpression !== undefined) {
          updates.push(`cron_expression = $${paramIndex++}`);
          values.push(body.cronExpression);
        }
        if (body.timezone) {
          updates.push(`timezone = $${paramIndex++}`);
          values.push(body.timezone);
        }
        if (body.runOnDays) {
          updates.push(`run_on_days = $${paramIndex++}`);
          values.push(body.runOnDays);
        }
        if (body.minIntervalMinutes !== undefined) {
          updates.push(`min_interval_minutes = $${paramIndex++}`);
          values.push(body.minIntervalMinutes);
        }
        if (body.maxRunsPerDay !== undefined) {
          updates.push(`max_runs_per_day = $${paramIndex++}`);
          values.push(body.maxRunsPerDay);
        }
        if (body.priority !== undefined) {
          updates.push(`priority = $${paramIndex++}`);
          values.push(body.priority);
        }

        const result = await fastify.pg.query(
          `UPDATE agent_orchestration_schedules
           SET ${updates.join(', ')}
           WHERE id = $1
           RETURNING *`,
          values
        );

        return reply.send({
          success: true,
          data: result.rows[0],
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to update schedule');
        return reply.status(500).send({
          success: false,
          error: 'Failed to update schedule',
        });
      }
    }
  );

  /**
   * DELETE /schedules/:scheduleId
   * Delete an orchestration schedule
   */
  fastify.delete<{
    Params: ScheduleParams;
  }>(
    '/schedules/:scheduleId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'Delete orchestration schedule',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['scheduleId'],
          properties: {
            scheduleId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const user = (request as any).user;
      const { scheduleId } = request.params;

      try {
        const result = await fastify.pg.query(
          `DELETE FROM agent_orchestration_schedules s
           USING projects p
           LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
           WHERE s.id = $1
           AND s.project_id = p.id
           AND (p.owner_id = $2 OR pm.user_id IS NOT NULL)
           RETURNING s.id`,
          [scheduleId, user.id]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Schedule not found or access denied',
          });
        }

        return reply.send({ success: true, data: { deleted: true } });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to delete schedule');
        return reply.status(500).send({
          success: false,
          error: 'Failed to delete schedule',
        });
      }
    }
  );

  // ============================================
  // ACTION CONFIGS
  // ============================================

  /**
   * GET /action-configs
   * List action configurations for a project
   */
  fastify.get<{
    Querystring: { projectId: string };
  }>(
    '/action-configs',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'List action configurations',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const { projectId } = request.query;
      if (!(await checkProjectAccess(request, reply, fastify, projectId))) return;

      try {
        const result = await fastify.pg.query(
          `SELECT * FROM autonomous_action_config
           WHERE project_id = $1
           ORDER BY action_category, action_name`,
          [projectId]
        );

        const configs = result.rows.map((row) => ({
          id: row.id,
          projectId: row.project_id,
          actionKey: row.action_key,
          actionName: row.action_name,
          actionCategory: row.action_category,
          agentSlug: row.agent_slug,
          isEnabled: row.is_enabled,
          requiresApproval: row.requires_approval,
          autoApproveLowRisk: row.auto_approve_low_risk,
          riskLevel: row.risk_level,
          maxPerDay: row.max_per_day,
          maxPerHour: row.max_per_hour,
          timesUsedToday: row.times_used_today,
          timesUsedTotal: row.times_used_total,
        }));

        return reply.send({ success: true, data: configs });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get action configs');
        return reply.status(500).send({
          success: false,
          error: 'Failed to retrieve action configs',
        });
      }
    }
  );

  /**
   * PUT /action-configs/:configId
   * Update an action configuration
   */
  fastify.put<{
    Params: ActionConfigParams;
    Body: Partial<ActionConfigBody>;
  }>(
    '/action-configs/:configId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'Update action configuration',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['configId'],
          properties: {
            configId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            isEnabled: { type: 'boolean' },
            requiresApproval: { type: 'boolean' },
            autoApproveLowRisk: { type: 'boolean' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            maxPerDay: { type: 'number' },
            maxPerHour: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const user = (request as any).user;
      const { configId } = request.params;
      const body = request.body;

      try {
        // Get config and verify access
        const configResult = await fastify.pg.query(
          `SELECT ac.*, p.owner_id FROM autonomous_action_config ac
           JOIN projects p ON ac.project_id = p.id
           LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
           WHERE ac.id = $1 AND (p.owner_id = $2 OR pm.user_id IS NOT NULL)`,
          [configId, user.id]
        );

        if (configResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Action config not found or access denied',
          });
        }

        // Build update query
        const updates: string[] = ['date_updated = NOW()', 'user_updated = $2'];
        const values: unknown[] = [configId, user.id];
        let paramIndex = 3;

        if (body.isEnabled !== undefined) {
          updates.push(`is_enabled = $${paramIndex++}`);
          values.push(body.isEnabled);
        }
        if (body.requiresApproval !== undefined) {
          updates.push(`requires_approval = $${paramIndex++}`);
          values.push(body.requiresApproval);
        }
        if (body.autoApproveLowRisk !== undefined) {
          updates.push(`auto_approve_low_risk = $${paramIndex++}`);
          values.push(body.autoApproveLowRisk);
        }
        if (body.riskLevel) {
          updates.push(`risk_level = $${paramIndex++}`);
          values.push(body.riskLevel);
        }
        if (body.maxPerDay !== undefined) {
          updates.push(`max_per_day = $${paramIndex++}`);
          values.push(body.maxPerDay);
        }
        if (body.maxPerHour !== undefined) {
          updates.push(`max_per_hour = $${paramIndex++}`);
          values.push(body.maxPerHour);
        }

        const result = await fastify.pg.query(
          `UPDATE autonomous_action_config
           SET ${updates.join(', ')}
           WHERE id = $1
           RETURNING *`,
          values
        );

        return reply.send({
          success: true,
          data: result.rows[0],
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to update action config');
        return reply.status(500).send({
          success: false,
          error: 'Failed to update action config',
        });
      }
    }
  );

  // ============================================
  // MANUAL TRIGGER
  // ============================================

  /**
   * POST /trigger
   * Manually trigger orchestration for a project
   */
  fastify.post<{
    Body: TriggerBody;
  }>(
    '/trigger',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'Manually trigger orchestration',
        description: 'Triggers batch orchestration for a project. Can optionally specify a single agent.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            agentSlug: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const user = (request as any).user;
      const { projectId, agentSlug } = request.body;

      if (!(await checkProjectAccess(request, reply, fastify, projectId))) return;

      try {
        const queueService = getOrchestrationQueueService();

        if (queueService.isConfigured()) {
          // Queue the job with high priority
          const jobId = await queueService.addHighPriorityJob({
            projectId,
            triggeredBy: 'manual',
            userId: user.id,
            jobType: agentSlug ? 'single_agent' : 'batch',
            agentSlug,
            priority: 10,
          });

          return reply.send({
            success: true,
            data: {
              jobId,
              status: 'queued',
              message: 'Orchestration job queued for processing',
            },
          });
        }

        // Process directly if queue not available
        const orchestrationService = getOrchestrationService();
        const result = await orchestrationService.runBatchOrchestration(
          projectId,
          'manual',
          user.id
        );

        return reply.send({
          success: true,
          data: {
            jobId: result.jobId,
            status: result.status,
            agentsExecuted: result.agentsExecuted,
            agentsSucceeded: result.agentsSucceeded,
            agentsFailed: result.agentsFailed,
            tasksCreated: result.tasksCreated,
            durationMs: result.durationMs,
          },
        });
      } catch (error) {
        fastify.log.error({ error, projectId }, 'Failed to trigger orchestration');
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to trigger orchestration',
        });
      }
    }
  );

  // ============================================
  // JOB HISTORY
  // ============================================

  /**
   * GET /jobs
   * List orchestration jobs
   */
  fastify.get<{
    Querystring: JobsQuerystring;
  }>(
    '/jobs',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'List orchestration jobs',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const user = (request as any).user;
      const { projectId, status, limit = 50, offset = 0 } = request.query;

      try {
        let query = `
          SELECT j.*, p.name as project_name
          FROM orchestration_jobs j
          LEFT JOIN projects p ON j.project_id = p.id
          LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
          WHERE (p.owner_id = $1 OR pm.user_id IS NOT NULL OR j.triggered_by_user_id = $1)
        `;
        const params: unknown[] = [user.id];
        let paramIndex = 2;

        if (projectId) {
          query += ` AND j.project_id = $${paramIndex++}`;
          params.push(projectId);
        }
        if (status) {
          query += ` AND j.status = $${paramIndex++}`;
          params.push(status);
        }

        query += ` ORDER BY j.date_created DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await fastify.pg.query(query, params);

        const jobs = result.rows.map((row) => ({
          id: row.id,
          projectId: row.project_id,
          projectName: row.project_name,
          jobType: row.job_type,
          triggeredBy: row.triggered_by,
          status: row.status,
          scheduledAt: row.scheduled_at,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          durationMs: row.duration_ms,
          agentsExecuted: row.agents_executed,
          agentsSucceeded: row.agents_succeeded,
          agentsFailed: row.agents_failed,
          tasksCreated: row.tasks_created,
          errorMessage: row.error_message,
          dateCreated: row.date_created,
        }));

        return reply.send({ success: true, data: jobs });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get jobs');
        return reply.status(500).send({
          success: false,
          error: 'Failed to retrieve jobs',
        });
      }
    }
  );

  /**
   * GET /jobs/:jobId
   * Get job details with execution logs
   */
  fastify.get<{
    Params: JobParams;
  }>(
    '/jobs/:jobId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'Get job details',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const user = (request as any).user;
      const { jobId } = request.params;

      try {
        // Get job with access check
        const jobResult = await fastify.pg.query(
          `SELECT j.*, p.name as project_name
           FROM orchestration_jobs j
           LEFT JOIN projects p ON j.project_id = p.id
           LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
           WHERE j.id = $1
           AND (p.owner_id = $2 OR pm.user_id IS NOT NULL OR j.triggered_by_user_id = $2)`,
          [jobId, user.id]
        );

        if (jobResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Job not found or access denied',
          });
        }

        const job = jobResult.rows[0];

        // Get execution logs
        const logsResult = await fastify.pg.query(
          `SELECT * FROM orchestration_execution_logs
           WHERE job_id = $1
           ORDER BY started_at`,
          [jobId]
        );

        const logs = logsResult.rows.map((row) => ({
          id: row.id,
          agentSlug: row.agent_slug,
          agentName: row.agent_name,
          phase: row.phase,
          status: row.status,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          durationMs: row.duration_ms,
          shouldAct: row.should_act,
          doNothingReason: row.do_nothing_reason,
          confidenceScore: row.confidence_score,
          actionsProposed: row.actions_proposed,
          actionsExecuted: row.actions_executed,
          suggestionsCreated: row.suggestions_created,
          tasksCreated: row.tasks_created,
          errorMessage: row.error_message,
          tokensUsed: row.tokens_used,
        }));

        return reply.send({
          success: true,
          data: {
            job: {
              id: job.id,
              projectId: job.project_id,
              projectName: job.project_name,
              jobType: job.job_type,
              triggeredBy: job.triggered_by,
              status: job.status,
              scheduledAt: job.scheduled_at,
              startedAt: job.started_at,
              completedAt: job.completed_at,
              durationMs: job.duration_ms,
              agentsExecuted: job.agents_executed,
              agentsSucceeded: job.agents_succeeded,
              agentsFailed: job.agents_failed,
              tasksCreated: job.tasks_created,
              errorMessage: job.error_message,
              outputSummary: job.output_summary,
            },
            executionLogs: logs,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get job details');
        return reply.status(500).send({
          success: false,
          error: 'Failed to retrieve job details',
        });
      }
    }
  );

  // ============================================
  // GITHUB ANALYSIS
  // ============================================

  /**
   * GET /analysis/:projectId
   * Get GitHub analysis for a project
   */
  fastify.get<{
    Params: ProjectParams;
    Querystring: { periodHours?: number; refresh?: boolean };
  }>(
    '/analysis/:projectId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'Get GitHub analysis for project',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            periodHours: { type: 'number', default: 24 },
            refresh: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const { projectId } = request.params;
      const { periodHours = 24, refresh = false } = request.query;

      if (!(await checkProjectAccess(request, reply, fastify, projectId))) return;

      try {
        // Check if project has GitHub integration
        const projectResult = await fastify.pg.query(
          `SELECT github_repo, github_pat_encrypted FROM projects WHERE id = $1`,
          [projectId]
        );

        if (projectResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Project not found',
          });
        }

        const { github_repo, github_pat_encrypted } = projectResult.rows[0];

        if (!github_repo || !github_pat_encrypted) {
          return reply.status(400).send({
            success: false,
            error: 'Project does not have GitHub integration configured',
          });
        }

        // Get or refresh analysis
        if (refresh) {
          // Mark existing cache as stale
          await fastify.pg.query(
            `UPDATE github_analysis_cache SET is_stale = true WHERE project_id = $1`,
            [projectId]
          );
        }

        const orchestrationService = getOrchestrationService();
        const analysis = await orchestrationService.analyzeGitHub(projectId, periodHours);

        return reply.send({
          success: true,
          data: analysis,
        });
      } catch (error) {
        fastify.log.error({ error, projectId }, 'Failed to get GitHub analysis');
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get GitHub analysis',
        });
      }
    }
  );

  // ============================================
  // QUEUE STATUS (for debugging)
  // ============================================

  /**
   * GET /queue/stats
   * Get queue statistics (admin only)
   */
  fastify.get(
    '/queue/stats',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Orchestration'],
        summary: 'Get queue statistics',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      if (!(await checkOrchestrationAccess(request, reply, fastify))) return;

      const user = (request as any).user;

      // Only admins can see queue stats
      if (!user.is_admin) {
        return reply.status(403).send({
          success: false,
          error: 'Admin access required',
        });
      }

      try {
        const queueService = getOrchestrationQueueService();

        if (!queueService.isConfigured()) {
          return reply.send({
            success: true,
            data: {
              configured: false,
              message: 'Queue not configured',
            },
          });
        }

        const stats = await queueService.getStats();
        const isPaused = await queueService.isPaused();

        return reply.send({
          success: true,
          data: {
            configured: true,
            isPaused,
            stats,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get queue stats');
        return reply.status(500).send({
          success: false,
          error: 'Failed to get queue stats',
        });
      }
    }
  );
}
