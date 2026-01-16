/**
 * @file routes/orchestration-workers.ts
 * @description Worker endpoints for orchestration batch processing
 * @module @synthstack/api-gateway/routes
 *
 * These endpoints are protected by CRON_SECRET and are meant to be called by:
 * - Scheduled cron jobs
 * - Internal systems
 * - Admin operations
 *
 * Endpoints:
 * - POST /orchestration/batch - Process all eligible projects
 * - POST /orchestration/project/:projectId - Process specific project
 * - POST /orchestration/retry-failed - Retry all failed jobs
 * - POST /orchestration/cleanup - Clean up old jobs and cache
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getOrchestrationService } from '../services/orchestration/index.js';
import { getOrchestrationQueueService } from '../services/orchestration/queue.js';

// ============================================
// Types
// ============================================

interface ProjectParams {
  projectId: string;
}

interface BatchQuerystring {
  /** Whether to use queue or process directly */
  useQueue?: boolean;
  /** Priority for queued jobs (1-10) */
  priority?: number;
}

interface CleanupQuerystring {
  /** Age in days for cleanup */
  olderThanDays?: number;
}

// ============================================
// Route Handler
// ============================================

/**
 * Orchestration worker routes
 * Protected by CRON_SECRET authentication
 *
 * @param fastify - Fastify instance
 */
export default async function orchestrationWorkerRoutes(fastify: FastifyInstance) {
  /**
   * Verify worker authentication using CRON_SECRET
   */
  const verifyWorkerAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET || 'dev-admin-secret';

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized - Invalid or missing CRON_SECRET',
      });
    }
  };

  // ============================================
  // POST /orchestration/batch
  // Process all eligible projects
  // ============================================

  fastify.post<{
    Querystring: BatchQuerystring;
  }>(
    '/batch',
    {
      preHandler: [verifyWorkerAuth],
      schema: {
        tags: ['Workers', 'Orchestration'],
        summary: 'Process all eligible projects for orchestration',
        description:
          'Finds all projects with enabled orchestration schedules and runs batch orchestration. Can use queue or process directly.',
        querystring: {
          type: 'object',
          properties: {
            useQueue: {
              type: 'boolean',
              description: 'Whether to queue jobs or process directly',
              default: true,
            },
            priority: {
              type: 'number',
              description: 'Priority for queued jobs (1-10)',
              minimum: 1,
              maximum: 10,
              default: 5,
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
                  projectsProcessed: { type: 'number' },
                  projectsQueued: { type: 'number' },
                  projectsSkipped: { type: 'number' },
                  errors: { type: 'number' },
                  jobIds: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { useQueue = true, priority = 5 } = request.query;
      const startTime = Date.now();

      try {
        // Get all projects with enabled orchestration schedules
        const projectsResult = await fastify.pg.query(
          `SELECT DISTINCT p.id, p.name
           FROM projects p
           INNER JOIN agent_orchestration_schedules aos ON aos.project_id = p.id
           WHERE aos.is_enabled = true
           AND p.status != 'archived'`
        );

        const projects = projectsResult.rows;
        const results = {
          projectsProcessed: 0,
          projectsQueued: 0,
          projectsSkipped: 0,
          errors: 0,
          jobIds: [] as string[],
        };

        if (projects.length === 0) {
          return reply.send({
            success: true,
            data: {
              ...results,
              message: 'No projects with enabled orchestration schedules found',
            },
          });
        }

        if (useQueue) {
          // Queue jobs for processing
          const queueService = getOrchestrationQueueService();

          if (!queueService.isConfigured()) {
            return reply.status(503).send({
              success: false,
              error: 'Queue service not available',
            });
          }

          for (const project of projects) {
            try {
              const jobId = await queueService.addJob({
                projectId: project.id,
                triggeredBy: 'cron',
                jobType: 'batch',
                priority,
              });

              if (jobId) {
                results.jobIds.push(jobId);
                results.projectsQueued++;
              } else {
                results.projectsSkipped++;
              }
            } catch (error) {
              fastify.log.error({ error, projectId: project.id }, 'Failed to queue project');
              results.errors++;
            }
          }
        } else {
          // Process directly
          const orchestrationService = getOrchestrationService();

          for (const project of projects) {
            try {
              const result = await orchestrationService.runBatchOrchestration(
                project.id,
                'cron'
              );
              results.projectsProcessed++;
              results.jobIds.push(result.jobId);
            } catch (error) {
              fastify.log.error({ error, projectId: project.id }, 'Failed to process project');
              results.errors++;
            }
          }
        }

        fastify.log.info(
          {
            duration: Date.now() - startTime,
            ...results,
          },
          'Batch orchestration completed'
        );

        return reply.send({
          success: true,
          data: results,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Batch orchestration failed');
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // ============================================
  // POST /orchestration/project/:projectId
  // Process specific project
  // ============================================

  fastify.post<{
    Params: ProjectParams;
    Querystring: BatchQuerystring;
  }>(
    '/project/:projectId',
    {
      preHandler: [verifyWorkerAuth],
      schema: {
        tags: ['Workers', 'Orchestration'],
        summary: 'Run orchestration for a specific project',
        description: 'Triggers batch orchestration for a single project. Can use queue or process directly.',
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
            useQueue: {
              type: 'boolean',
              description: 'Whether to queue job or process directly',
              default: false,
            },
            priority: {
              type: 'number',
              description: 'Priority for queued job (1-10)',
              minimum: 1,
              maximum: 10,
              default: 8,
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
                  jobId: { type: 'string' },
                  status: { type: 'string' },
                  agentsExecuted: { type: 'number' },
                  agentsSucceeded: { type: 'number' },
                  agentsFailed: { type: 'number' },
                  tasksCreated: { type: 'number' },
                  durationMs: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { useQueue = false, priority = 8 } = request.query;

      try {
        // Verify project exists
        const projectResult = await fastify.pg.query(
          'SELECT id, name FROM projects WHERE id = $1',
          [projectId]
        );

        if (projectResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'Project not found',
          });
        }

        if (useQueue) {
          const queueService = getOrchestrationQueueService();

          if (!queueService.isConfigured()) {
            return reply.status(503).send({
              success: false,
              error: 'Queue service not available',
            });
          }

          const jobId = await queueService.addJob({
            projectId,
            triggeredBy: 'cron',
            jobType: 'batch',
            priority,
          });

          return reply.send({
            success: true,
            data: {
              jobId,
              status: 'queued',
              message: 'Job queued for processing',
            },
          });
        }

        // Process directly
        const orchestrationService = getOrchestrationService();
        const result = await orchestrationService.runBatchOrchestration(projectId, 'cron');

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
        fastify.log.error({ error, projectId }, 'Project orchestration failed');
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // ============================================
  // POST /orchestration/retry-failed
  // Retry all failed jobs
  // ============================================

  fastify.post(
    '/retry-failed',
    {
      preHandler: [verifyWorkerAuth],
      schema: {
        tags: ['Workers', 'Orchestration'],
        summary: 'Retry all failed orchestration jobs',
        description: 'Finds all failed jobs in the queue and retries them.',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  retriedCount: { type: 'number' },
                  failedJobs: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const queueService = getOrchestrationQueueService();

        if (!queueService.isConfigured()) {
          // Fall back to database-based retry
          const failedJobsResult = await fastify.pg.query(
            `SELECT id, project_id FROM orchestration_jobs
             WHERE status = 'failed'
             AND attempt_number < max_attempts
             AND date_created > NOW() - INTERVAL '24 hours'
             LIMIT 50`
          );

          let retriedCount = 0;
          const orchestrationService = getOrchestrationService();

          for (const job of failedJobsResult.rows) {
            try {
              await orchestrationService.runBatchOrchestration(
                job.project_id,
                'retry_scheduler'
              );
              retriedCount++;

              // Update the original job
              await fastify.pg.query(
                `UPDATE orchestration_jobs
                 SET attempt_number = attempt_number + 1,
                     status = 'queued',
                     date_updated = NOW()
                 WHERE id = $1`,
                [job.id]
              );
            } catch (error) {
              fastify.log.error({ error, jobId: job.id }, 'Failed to retry job');
            }
          }

          return reply.send({
            success: true,
            data: {
              retriedCount,
              failedJobs: failedJobsResult.rows.length,
              message: 'Queue not available, used database-based retry',
            },
          });
        }

        const failedJobs = await queueService.getFailedJobs(100);
        const retriedCount = await queueService.retryAllFailed();

        return reply.send({
          success: true,
          data: {
            retriedCount,
            failedJobs: failedJobs.length,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Retry failed jobs operation failed');
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // ============================================
  // POST /orchestration/cleanup
  // Clean up old jobs and cache
  // ============================================

  fastify.post<{
    Querystring: CleanupQuerystring;
  }>(
    '/cleanup',
    {
      preHandler: [verifyWorkerAuth],
      schema: {
        tags: ['Workers', 'Orchestration'],
        summary: 'Clean up old orchestration jobs and cache',
        description: 'Removes old completed/failed jobs and stale cache entries.',
        querystring: {
          type: 'object',
          properties: {
            olderThanDays: {
              type: 'number',
              description: 'Age in days for cleanup',
              default: 7,
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
                  queueJobsCleaned: { type: 'number' },
                  dbJobsCleaned: { type: 'number' },
                  logsCleaned: { type: 'number' },
                  cacheCleaned: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { olderThanDays = 7 } = request.query;
      const olderThanMs = olderThanDays * 24 * 60 * 60 * 1000;
      const olderThanDate = new Date(Date.now() - olderThanMs);

      try {
        // Clean queue
        let queueJobsCleaned = 0;
        const queueService = getOrchestrationQueueService();
        if (queueService.isConfigured()) {
          queueJobsCleaned = await queueService.cleanup(olderThanMs);
        }

        // Clean database jobs
        const dbJobsResult = await fastify.pg.query(
          `DELETE FROM orchestration_jobs
           WHERE status IN ('completed', 'failed', 'cancelled')
           AND date_created < $1`,
          [olderThanDate.toISOString()]
        );
        const dbJobsCleaned = dbJobsResult.rowCount || 0;

        // Clean execution logs (kept longer - 30 days)
        const logsCleanDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const logsResult = await fastify.pg.query(
          `DELETE FROM orchestration_execution_logs
           WHERE date_created < $1`,
          [logsCleanDate.toISOString()]
        );
        const logsCleaned = logsResult.rowCount || 0;

        // Clean stale GitHub analysis cache
        const cacheResult = await fastify.pg.query(
          `DELETE FROM github_analysis_cache
           WHERE (expires_at IS NOT NULL AND expires_at < NOW())
           OR is_stale = true`
        );
        const cacheCleaned = cacheResult.rowCount || 0;

        // Reset action config daily counters if needed
        await fastify.pg.query(
          `UPDATE autonomous_action_config
           SET times_used_today = 0, last_reset_at = NOW()
           WHERE last_reset_at < DATE_TRUNC('day', NOW())`
        );

        fastify.log.info(
          {
            queueJobsCleaned,
            dbJobsCleaned,
            logsCleaned,
            cacheCleaned,
          },
          'Orchestration cleanup completed'
        );

        return reply.send({
          success: true,
          data: {
            queueJobsCleaned,
            dbJobsCleaned,
            logsCleaned,
            cacheCleaned,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Orchestration cleanup failed');
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // ============================================
  // GET /orchestration/health
  // Health check for orchestration system
  // ============================================

  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Workers', 'Orchestration'],
        summary: 'Health check for orchestration system',
        description: 'Returns health status of the orchestration queue and services.',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  queueConfigured: { type: 'boolean' },
                  queueStats: {
                    type: 'object',
                    nullable: true,
                  },
                  timestamp: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const queueService = getOrchestrationQueueService();
        const isConfigured = queueService.isConfigured();
        const stats = isConfigured ? await queueService.getStats() : null;

        return reply.send({
          success: true,
          data: {
            status: 'healthy',
            queueConfigured: isConfigured,
            queueStats: stats,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        return reply.send({
          success: true,
          data: {
            status: 'degraded',
            queueConfigured: false,
            queueStats: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  );

  // ============================================
  // POST /orchestration/github-sync
  // Sync GitHub data for all projects
  // ============================================

  fastify.post(
    '/github-sync',
    {
      preHandler: [verifyWorkerAuth],
      schema: {
        tags: ['Workers', 'Orchestration'],
        summary: 'Sync GitHub data for all connected projects',
        description: 'Refreshes GitHub analysis cache for all projects with GitHub integration.',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  projectsSynced: { type: 'number' },
                  projectsFailed: { type: 'number' },
                  errors: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Get all projects with GitHub integration
        const projectsResult = await fastify.pg.query(
          `SELECT id, github_repo FROM projects
           WHERE github_repo IS NOT NULL
           AND github_pat_encrypted IS NOT NULL
           AND status != 'archived'`
        );

        let projectsSynced = 0;
        let projectsFailed = 0;
        const errors: string[] = [];
        const orchestrationService = getOrchestrationService();

        for (const project of projectsResult.rows) {
          try {
            await orchestrationService.analyzeGitHub(project.id, 24);
            projectsSynced++;
          } catch (error) {
            projectsFailed++;
            errors.push(`${project.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        fastify.log.info({ projectsSynced, projectsFailed }, 'GitHub sync completed');

        return reply.send({
          success: true,
          data: {
            projectsSynced,
            projectsFailed,
            errors: errors.slice(0, 10), // Limit error messages
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'GitHub sync failed');
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
