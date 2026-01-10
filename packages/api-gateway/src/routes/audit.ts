/**
 * Audit Routes
 *
 * API endpoints for the Agent Audit System.
 * Provides access to:
 * - Activity logs with filtering and pagination
 * - Single audit entry details
 * - Communication graph data for visualization
 * - Knowledge accumulation statistics
 * - Cross-project consent management
 *
 * @module routes/audit
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from '../services/audit.js';
import type { AuditActionType, AuditStatus } from '../services/audit.js';

// COMMUNITY: AgentSlug type defined locally (agents service removed)
type AgentSlug = string;

// ============================================
// Types
// ============================================

interface ActivityLogQuery {
  agentSlug?: AgentSlug;
  projectId?: string;
  actionType?: AuditActionType;
  status?: AuditStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface CommunicationGraphQuery {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}

interface CrossProjectConsentBody {
  enabled: boolean;
  projectId?: string;
}

// ============================================
// Routes
// ============================================

/**
 * Register audit routes
 * @param server - Fastify instance
 */
export default async function auditRoutes(server: FastifyInstance): Promise<void> {
  const auditService = new AuditService(server);

  // =========================================
  // Activity Log Endpoints
  // =========================================

  /**
   * GET /audit/activity - Get activity log with filters
   * Returns paginated list of agent actions for the authenticated user
   */
  server.get('/activity', {
    preHandler: [server.authenticate],
    schema: {
      tags: ['Audit'],
      summary: 'Get activity log',
      description: 'Returns paginated list of agent actions with filtering options',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          agentSlug: {
            type: 'string',
            enum: ['general', 'researcher', 'marketer', 'developer', 'seo_writer', 'designer'],
            description: 'Filter by agent slug',
          },
          projectId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter by project ID',
          },
          actionType: {
            type: 'string',
            enum: ['chat', 'suggestion', 'action', 'context_share', 'knowledge_extract'],
            description: 'Filter by action type',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
            description: 'Filter by status',
          },
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Filter by start date (ISO 8601)',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            description: 'Filter by end date (ISO 8601)',
          },
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Page number (1-indexed)',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Items per page',
          },
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
                entries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      agentSlug: { type: 'string' },
                      agentName: { type: 'string' },
                      actionType: { type: 'string' },
                      actionCategory: { type: 'string' },
                      actionDescription: { type: 'string' },
                      inputSummary: { type: 'string' },
                      outputSummary: { type: 'string' },
                      tokensUsed: { type: 'integer' },
                      modelUsed: { type: 'string' },
                      status: { type: 'string' },
                      latencyMs: { type: 'integer' },
                      createdAt: { type: 'string' },
                    },
                  },
                },
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: ActivityLogQuery }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const result = await auditService.getActivityLog(userId, {
        agentSlug: request.query.agentSlug,
        projectId: request.query.projectId,
        actionType: request.query.actionType,
        status: request.query.status,
        startDate: request.query.startDate,
        endDate: request.query.endDate,
        page: request.query.page,
        limit: request.query.limit,
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      server.log.error({ error, userId }, 'Error fetching activity log');
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch activity log' },
      });
    }
  });

  /**
   * GET /audit/activity/:auditId - Get single audit entry details
   * Returns full details of an audit log entry including context sources
   */
  server.get('/activity/:auditId', {
    preHandler: [server.authenticate],
    schema: {
      tags: ['Audit'],
      summary: 'Get audit entry details',
      description: 'Returns full details of a single audit log entry including context sources and reasoning trace',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          auditId: {
            type: 'string',
            format: 'uuid',
            description: 'Audit log entry ID',
          },
        },
        required: ['auditId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                agentId: { type: 'string' },
                agentSlug: { type: 'string' },
                agentName: { type: 'string' },
                projectId: { type: 'string' },
                sessionId: { type: 'string' },
                actionType: { type: 'string' },
                actionCategory: { type: 'string' },
                actionDescription: { type: 'string' },
                contextSources: { type: 'array' },
                inputSummary: { type: 'string' },
                outputSummary: { type: 'string' },
                tokensUsed: { type: 'integer' },
                modelUsed: { type: 'string' },
                status: { type: 'string' },
                errorMessage: { type: 'string' },
                reasoningTrace: { type: 'array' },
                derivedInsights: { type: 'array' },
                crossProjectConsent: { type: 'boolean' },
                latencyMs: { type: 'integer' },
                createdAt: { type: 'string' },
                completedAt: { type: 'string' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { auditId: string } }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const entry = await auditService.getAuditEntry(request.params.auditId, userId);

      if (!entry) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Audit entry not found' },
        });
      }

      return reply.send({
        success: true,
        data: entry,
      });
    } catch (error) {
      server.log.error({ error, auditId: request.params.auditId }, 'Error fetching audit entry');
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit entry' },
      });
    }
  });

  // =========================================
  // Communication Graph Endpoint
  // =========================================

  /**
   * GET /audit/communication-graph - Get communication graph data
   * Returns graph nodes and edges for visualizing agent interactions
   */
  server.get('/communication-graph', {
    preHandler: [server.authenticate],
    schema: {
      tags: ['Audit'],
      summary: 'Get communication graph data',
      description: 'Returns graph data for visualizing agent-to-agent and agent-to-project communications',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Filter by start date (ISO 8601)',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            description: 'Filter by end date (ISO 8601)',
          },
          projectId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter by project ID',
          },
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
                nodes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      type: { type: 'string', enum: ['agent', 'user', 'project'] },
                      label: { type: 'string' },
                      metadata: { type: 'object' },
                    },
                  },
                },
                edges: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      source: { type: 'string' },
                      target: { type: 'string' },
                      weight: { type: 'number' },
                      type: { type: 'string' },
                      metadata: { type: 'object' },
                    },
                  },
                },
                stats: {
                  type: 'object',
                  properties: {
                    totalInteractions: { type: 'integer' },
                    uniqueAgents: { type: 'integer' },
                    uniqueProjects: { type: 'integer' },
                    dateRange: {
                      type: 'object',
                      properties: {
                        start: { type: 'string' },
                        end: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: CommunicationGraphQuery }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const graph = await auditService.getCommunicationGraph(userId, {
        startDate: request.query.startDate,
        endDate: request.query.endDate,
        projectId: request.query.projectId,
      });

      return reply.send({
        success: true,
        data: graph,
      });
    } catch (error) {
      server.log.error({ error, userId }, 'Error fetching communication graph');
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch communication graph' },
      });
    }
  });

  // =========================================
  // Knowledge Stats Endpoint
  // =========================================

  /**
   * GET /audit/knowledge-stats - Get knowledge accumulation statistics
   * Returns statistics about accumulated knowledge entries
   */
  server.get('/knowledge-stats', {
    preHandler: [server.authenticate],
    schema: {
      tags: ['Audit'],
      summary: 'Get knowledge accumulation stats',
      description: 'Returns statistics about knowledge entries extracted from agent interactions',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalEntries: { type: 'integer' },
                byContentType: { type: 'object' },
                byDomain: { type: 'object' },
                byAgent: { type: 'object' },
                topTags: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tag: { type: 'string' },
                      count: { type: 'integer' },
                    },
                  },
                },
                recentlyUsed: { type: 'integer' },
                crossProjectShared: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const stats = await auditService.getKnowledgeStats(userId);

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      server.log.error({ error, userId }, 'Error fetching knowledge stats');
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch knowledge stats' },
      });
    }
  });

  // =========================================
  // Cross-Project Consent Endpoint
  // =========================================

  /**
   * PUT /audit/cross-project-consent - Update cross-project consent
   * Enables or disables sharing of knowledge across projects
   */
  server.put('/cross-project-consent', {
    preHandler: [server.authenticate],
    schema: {
      tags: ['Audit'],
      summary: 'Update cross-project consent',
      description: 'Enable or disable sharing of knowledge entries across projects',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'Whether to enable cross-project knowledge sharing',
          },
          projectId: {
            type: 'string',
            format: 'uuid',
            description: 'Optional project ID for project-specific consent (omit for global)',
          },
        },
        required: ['enabled'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CrossProjectConsentBody }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      await auditService.updateCrossProjectConsent(
        userId,
        request.body.enabled,
        request.body.projectId
      );

      const scope = request.body.projectId ? 'project' : 'global';
      const action = request.body.enabled ? 'enabled' : 'disabled';

      return reply.send({
        success: true,
        message: `Cross-project knowledge sharing ${action} (${scope})`,
      });
    } catch (error) {
      server.log.error({ error, userId }, 'Error updating cross-project consent');
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update consent' },
      });
    }
  });

  /**
   * GET /audit/cross-project-consent - Get current consent status
   * Returns the current cross-project consent settings
   */
  server.get('/cross-project-consent', {
    preHandler: [server.authenticate],
    schema: {
      tags: ['Audit'],
      summary: 'Get cross-project consent status',
      description: 'Returns current cross-project consent settings for global and per-project',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            format: 'uuid',
            description: 'Optional project ID to check specific project consent',
          },
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
                hasConsent: { type: 'boolean' },
                globalConsent: { type: 'boolean' },
                projectConsent: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { projectId?: string } }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const hasConsent = await auditService.hasCrossProjectConsent(userId, request.query.projectId);

      // Get global consent status
      const globalResult = await server.pg.query(`
        SELECT global_consent FROM user_cross_project_consent
        WHERE user_id = $1 AND project_id IS NULL
      `, [userId]);
      const globalConsent = globalResult.rows[0]?.global_consent || false;

      // Get project-specific consent if projectId provided
      let projectConsent: boolean | null = null;
      if (request.query.projectId) {
        const projectResult = await server.pg.query(`
          SELECT project_consent FROM user_cross_project_consent
          WHERE user_id = $1 AND project_id = $2
        `, [userId, request.query.projectId]);
        projectConsent = projectResult.rows[0]?.project_consent ?? null;
      }

      return reply.send({
        success: true,
        data: {
          hasConsent,
          globalConsent,
          projectConsent,
        },
      });
    } catch (error) {
      server.log.error({ error, userId }, 'Error fetching consent status');
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch consent status' },
      });
    }
  });
}
