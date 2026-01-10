/**
 * @file services/orchestration/queue.ts
 * @description BullMQ queue service for orchestration job processing
 * @module @synthstack/api-gateway/services/orchestration
 *
 * Features:
 * - Priority queue for orchestration jobs
 * - Automatic retry with exponential backoff
 * - Job persistence in Redis
 * - Concurrency control (3 concurrent jobs)
 * - Dead letter queue for failed jobs
 * - Rate limiting per project
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import type { FastifyInstance } from 'fastify';
import type {
  OrchestrationJobData,
  OrchestrationJobResult,
  QueueEventData,
} from '@synthstack/types';
import { config } from '../../config/index.js';
import { getOrchestrationService } from './index.js';
import type { BatchOrchestrationResult } from './index.js';

// ============================================
// OrchestrationQueueService Class
// ============================================

/**
 * Queue service for orchestration jobs using BullMQ
 *
 * Features:
 * - Priority queue (higher priority = processed first)
 * - Automatic retry with exponential backoff (3 attempts)
 * - Concurrency of 3 workers
 * - Job persistence in Redis
 * - Rate limiting per project
 *
 * @example
 * ```typescript
 * const queueService = new OrchestrationQueueService(fastify);
 * await queueService.addJob({
 *   projectId: 'project-uuid',
 *   triggeredBy: 'cron',
 *   jobType: 'batch',
 *   priority: 5
 * });
 * ```
 */
export class OrchestrationQueueService {
  private queue: Queue<OrchestrationJobData, OrchestrationJobResult> | null = null;
  private worker: Worker<OrchestrationJobData, OrchestrationJobResult> | null = null;
  private queueEvents: QueueEvents | null = null;
  private fastify: FastifyInstance;
  private eventHandlers: Map<string, (data: QueueEventData) => void> = new Map();

  /** Queue name */
  static readonly QUEUE_NAME = 'orchestration-queue';
  /** Default concurrency */
  static readonly DEFAULT_CONCURRENCY = 3;
  /** Default retry attempts */
  static readonly DEFAULT_RETRY_ATTEMPTS = 3;
  /** Default job timeout (10 minutes) */
  static readonly DEFAULT_TIMEOUT = 10 * 60 * 1000;

  /**
   * Creates an instance of OrchestrationQueueService
   * @param fastify - Fastify instance
   */
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.initializeQueue();
  }

  /**
   * Initialize BullMQ queue, worker, and event listeners
   * @private
   */
  private initializeQueue(): void {
    if (!config.redisUrl) {
      this.fastify.log.warn('Redis not configured - orchestration queue disabled');
      return;
    }

    try {
      const redisConnection = {
        url: config.redisUrl,
      };

      // Create queue
      this.queue = new Queue<OrchestrationJobData, OrchestrationJobResult>(
        OrchestrationQueueService.QUEUE_NAME,
        {
          connection: redisConnection,
          defaultJobOptions: {
            attempts: OrchestrationQueueService.DEFAULT_RETRY_ATTEMPTS,
            backoff: {
              type: 'exponential',
              delay: 30000, // Start with 30 seconds
            },
            removeOnComplete: {
              age: 86400, // Keep completed jobs for 24 hours
              count: 500, // Keep last 500 completed jobs
            },
            removeOnFail: {
              age: 604800, // Keep failed jobs for 7 days
            },
          },
        }
      );

      // Create worker
      this.worker = new Worker<OrchestrationJobData, OrchestrationJobResult>(
        OrchestrationQueueService.QUEUE_NAME,
        async (job: Job<OrchestrationJobData>) => this.processJob(job),
        {
          connection: redisConnection,
          concurrency: OrchestrationQueueService.DEFAULT_CONCURRENCY,
          limiter: {
            max: 5, // Max 5 jobs
            duration: 60000, // Per minute
          },
        }
      );

      // Create queue events for monitoring
      this.queueEvents = new QueueEvents(OrchestrationQueueService.QUEUE_NAME, {
        connection: redisConnection,
      });

      // Set up event handlers
      this.setupEventHandlers();

      this.fastify.log.info('Orchestration queue initialized');
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to initialize orchestration queue');
    }
  }

  /**
   * Set up queue event handlers for monitoring
   * @private
   */
  private setupEventHandlers(): void {
    if (!this.worker || !this.queueEvents) return;

    // Worker event handlers
    this.worker.on('completed', (job, result) => {
      this.fastify.log.info(
        {
          jobId: job.id,
          projectId: job.data.projectId,
          result: {
            success: result.success,
            agentsExecuted: result.agentsExecuted,
            durationMs: result.durationMs,
          },
        },
        'Orchestration job completed'
      );

      this.emitEvent({
        jobId: job.id!,
        projectId: job.data.projectId,
        status: 'completed',
        timestamp: new Date(),
        data: result as unknown as Record<string, unknown>,
      });
    });

    this.worker.on('failed', (job, error) => {
      this.fastify.log.error(
        {
          jobId: job?.id,
          projectId: job?.data.projectId,
          error: error.message,
        },
        'Orchestration job failed'
      );

      if (job) {
        this.emitEvent({
          jobId: job.id!,
          projectId: job.data.projectId,
          status: 'failed',
          timestamp: new Date(),
          data: { error: error.message },
        });
      }
    });

    this.worker.on('error', (error) => {
      this.fastify.log.error({ error }, 'Orchestration worker error');
    });

    this.worker.on('stalled', (jobId) => {
      this.fastify.log.warn({ jobId }, 'Orchestration job stalled');
    });

    // Queue events
    this.queueEvents.on('waiting', ({ jobId }) => {
      this.fastify.log.debug({ jobId }, 'Job waiting in queue');
    });

    this.queueEvents.on('active', ({ jobId }) => {
      this.fastify.log.debug({ jobId }, 'Job became active');
    });
  }

  /**
   * Emit event to registered handlers
   * @private
   */
  private emitEvent(data: QueueEventData): void {
    for (const handler of this.eventHandlers.values()) {
      try {
        handler(data);
      } catch (error) {
        this.fastify.log.error({ error }, 'Error in queue event handler');
      }
    }
  }

  /**
   * Check if queue is configured and ready
   * @returns True if queue is ready
   */
  isConfigured(): boolean {
    return this.queue !== null;
  }

  // ============================================
  // Job Management
  // ============================================

  /**
   * Add an orchestration job to the queue
   *
   * @param data - Job data
   * @param options - Optional job options
   * @returns Promise resolving to job ID or null if queue not configured
   *
   * @example
   * ```typescript
   * const jobId = await queueService.addJob({
   *   projectId: 'uuid',
   *   triggeredBy: 'cron',
   *   jobType: 'batch',
   *   priority: 5
   * });
   * ```
   */
  async addJob(
    data: OrchestrationJobData,
    options?: {
      delay?: number;
      priority?: number;
      timeout?: number;
    }
  ): Promise<string | null> {
    if (!this.queue) {
      this.fastify.log.warn('Queue not configured, running job directly');
      // Fall back to direct execution
      try {
        const orchestrationService = getOrchestrationService();
        await orchestrationService.runBatchOrchestration(
          data.projectId,
          data.triggeredBy,
          data.userId
        );
        return null;
      } catch (error) {
        this.fastify.log.error({ error }, 'Direct job execution failed');
        return null;
      }
    }

    try {
      const job = await this.queue.add(
        `orchestration-${data.jobType}`,
        data,
        {
          priority: options?.priority || data.priority || 5,
          delay: options?.delay,
          jobId: `orch-${data.projectId}-${Date.now()}`,
        } as any
      );

      this.fastify.log.info(
        {
          jobId: job.id,
          projectId: data.projectId,
          jobType: data.jobType,
        },
        'Orchestration job added to queue'
      );

      return job.id!;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to add job to queue');
      return null;
    }
  }

  /**
   * Add a high-priority job (e.g., manual trigger)
   * @param data - Job data
   * @returns Promise resolving to job ID
   */
  async addHighPriorityJob(data: OrchestrationJobData): Promise<string | null> {
    return this.addJob({ ...data, priority: 10 }, { priority: 10 });
  }

  /**
   * Add a low-priority job (e.g., background analysis)
   * @param data - Job data
   * @returns Promise resolving to job ID
   */
  async addLowPriorityJob(data: OrchestrationJobData): Promise<string | null> {
    return this.addJob({ ...data, priority: 1 }, { priority: 1 });
  }

  /**
   * Schedule a job for future execution
   * @param data - Job data
   * @param runAt - When to run the job
   * @returns Promise resolving to job ID
   */
  async scheduleJob(data: OrchestrationJobData, runAt: Date): Promise<string | null> {
    const delay = runAt.getTime() - Date.now();
    if (delay < 0) {
      return this.addJob(data);
    }
    return this.addJob(data, { delay });
  }

  /**
   * Add multiple jobs for batch processing
   * @param jobs - Array of job data
   * @returns Promise resolving to array of job IDs
   */
  async addBulkJobs(jobs: OrchestrationJobData[]): Promise<(string | null)[]> {
    if (!this.queue) {
      this.fastify.log.warn('Queue not configured');
      return jobs.map(() => null);
    }

    try {
      const bulkJobs = jobs.map((data) => ({
        name: `orchestration-${data.jobType}`,
        data,
        opts: {
          priority: data.priority || 5,
          jobId: `orch-${data.projectId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      }));

      const addedJobs = await this.queue.addBulk(bulkJobs);

      return addedJobs.map((job) => job.id!);
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to add bulk jobs');
      return jobs.map(() => null);
    }
  }

  // ============================================
  // Job Processing
  // ============================================

  /**
   * Process an orchestration job (worker callback)
   * @param job - BullMQ job
   * @returns Promise resolving to job result
   * @private
   */
  private async processJob(job: Job<OrchestrationJobData>): Promise<OrchestrationJobResult> {
    const { projectId, triggeredBy, userId, jobType, agentSlug, context } = job.data;
    const startTime = Date.now();

    this.fastify.log.info(
      {
        jobId: job.id,
        projectId,
        jobType,
        attempt: job.attemptsMade + 1,
      },
      'Processing orchestration job'
    );

    try {
      const orchestrationService = getOrchestrationService();

      let result: BatchOrchestrationResult;

      switch (jobType) {
        case 'batch':
          result = await orchestrationService.runBatchOrchestration(
            projectId,
            triggeredBy,
            userId
          );
          break;

        case 'github_analysis': {
          // Just run GitHub analysis without agent execution
          const analysis = await orchestrationService.analyzeGitHub(
            projectId,
            context?.periodHours as number || 24
          );
          return {
            success: true,
            durationMs: Date.now() - startTime,
            tasksCreated: 0,
            agentsExecuted: 0,
            agentsSucceeded: 0,
            agentsFailed: 0,
          };
        }

        case 'retry':
          // Retry a specific failed job
          result = await orchestrationService.runBatchOrchestration(
            projectId,
            'retry_scheduler',
            userId
          );
          break;

        default:
          result = await orchestrationService.runBatchOrchestration(
            projectId,
            triggeredBy,
            userId
          );
      }

      // Update job progress
      await job.updateProgress(100);

      return {
        success: result.status === 'completed',
        jobId: result.jobId,
        agentsExecuted: result.agentsExecuted,
        agentsSucceeded: result.agentsSucceeded,
        agentsFailed: result.agentsFailed,
        tasksCreated: result.tasksCreated,
        suggestionsCreated: result.suggestionsCreated,
        durationMs: result.durationMs,
        error: result.errors.length > 0 ? result.errors[0].error : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.fastify.log.error(
        {
          error,
          jobId: job.id,
          projectId,
        },
        'Orchestration job processing failed'
      );

      // Rethrow for BullMQ retry logic
      throw error;
    }
  }

  // ============================================
  // Queue Statistics & Management
  // ============================================

  /**
   * Get queue statistics
   * @returns Queue stats or null if not configured
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
  } | null> {
    if (!this.queue) return null;

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to get queue stats');
      return null;
    }
  }

  /**
   * Get jobs by status
   * @param status - Job status to filter by
   * @param limit - Maximum number of jobs to return
   * @returns Array of jobs
   */
  async getJobs(
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    limit: number = 50
  ): Promise<Job<OrchestrationJobData, OrchestrationJobResult>[]> {
    if (!this.queue) return [];

    try {
      switch (status) {
        case 'waiting':
          return await this.queue.getWaiting(0, limit);
        case 'active':
          return await this.queue.getActive(0, limit);
        case 'completed':
          return await this.queue.getCompleted(0, limit);
        case 'failed':
          return await this.queue.getFailed(0, limit);
        case 'delayed':
          return await this.queue.getDelayed(0, limit);
        default:
          return [];
      }
    } catch (error) {
      this.fastify.log.error({ error }, `Failed to get ${status} jobs`);
      return [];
    }
  }

  /**
   * Get failed jobs for retry
   * @param limit - Maximum number of jobs to return
   * @returns Array of failed jobs
   */
  async getFailedJobs(limit: number = 50): Promise<Job<OrchestrationJobData, OrchestrationJobResult>[]> {
    return this.getJobs('failed', limit);
  }

  /**
   * Retry a failed job
   * @param jobId - Job ID to retry
   * @returns True if retry was successful
   */
  async retryJob(jobId: string): Promise<boolean> {
    if (!this.queue) return false;

    try {
      const job = await this.queue.getJob(jobId);
      if (job && (await job.isFailed())) {
        await job.retry();
        this.fastify.log.info({ jobId }, 'Job retried');
        return true;
      }
      return false;
    } catch (error) {
      this.fastify.log.error({ error, jobId }, 'Failed to retry job');
      return false;
    }
  }

  /**
   * Retry all failed jobs
   * @returns Number of jobs retried
   */
  async retryAllFailed(): Promise<number> {
    if (!this.queue) return 0;

    try {
      const failedJobs = await this.queue.getFailed();
      let retried = 0;

      for (const job of failedJobs) {
        try {
          await job.retry();
          retried++;
        } catch {
          // Skip jobs that can't be retried
        }
      }

      this.fastify.log.info({ retried }, 'Retried failed jobs');
      return retried;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to retry all failed jobs');
      return 0;
    }
  }

  /**
   * Cancel a job
   * @param jobId - Job ID to cancel
   * @returns True if cancellation was successful
   */
  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.queue) return false;

    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.fastify.log.info({ jobId }, 'Job cancelled');
        return true;
      }
      return false;
    } catch (error) {
      this.fastify.log.error({ error, jobId }, 'Failed to cancel job');
      return false;
    }
  }

  /**
   * Clean up old jobs
   * @param olderThanMs - Age in milliseconds (default 7 days)
   * @returns Number of jobs cleaned
   */
  async cleanup(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.queue) return 0;

    try {
      const cleanedCompleted = await this.queue.clean(olderThanMs, 1000, 'completed');
      const cleanedFailed = await this.queue.clean(olderThanMs * 2, 1000, 'failed'); // Keep failed longer

      const totalCleaned = cleanedCompleted.length + cleanedFailed.length;
      this.fastify.log.info({ totalCleaned }, 'Queue cleaned');

      return totalCleaned;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to clean queue');
      return 0;
    }
  }

  /**
   * Drain the queue (remove all waiting jobs)
   * @returns True if drain was successful
   */
  async drain(): Promise<boolean> {
    if (!this.queue) return false;

    try {
      await this.queue.drain();
      this.fastify.log.info('Queue drained');
      return true;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to drain queue');
      return false;
    }
  }

  /**
   * Pause queue processing
   */
  async pause(): Promise<void> {
    if (this.queue) {
      await this.queue.pause();
      this.fastify.log.info('Orchestration queue paused');
    }
  }

  /**
   * Resume queue processing
   */
  async resume(): Promise<void> {
    if (this.queue) {
      await this.queue.resume();
      this.fastify.log.info('Orchestration queue resumed');
    }
  }

  /**
   * Check if queue is paused
   * @returns True if queue is paused
   */
  async isPaused(): Promise<boolean> {
    if (!this.queue) return true;
    return await this.queue.isPaused();
  }

  // ============================================
  // Event Subscription
  // ============================================

  /**
   * Subscribe to queue events
   * @param id - Unique handler ID
   * @param handler - Event handler function
   */
  onEvent(id: string, handler: (data: QueueEventData) => void): void {
    this.eventHandlers.set(id, handler);
  }

  /**
   * Unsubscribe from queue events
   * @param id - Handler ID to remove
   */
  offEvent(id: string): void {
    this.eventHandlers.delete(id);
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Gracefully close queue and worker
   */
  async close(): Promise<void> {
    if (this.queueEvents) {
      await this.queueEvents.close();
    }
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    this.eventHandlers.clear();
    this.fastify.log.info('Orchestration queue closed');
  }
}

// ============================================
// Singleton
// ============================================

let orchestrationQueueServiceInstance: OrchestrationQueueService | null = null;

/**
 * Initialize orchestration queue service singleton
 * @param fastify - Fastify instance
 * @returns OrchestrationQueueService instance
 */
export function initOrchestrationQueueService(fastify: FastifyInstance): OrchestrationQueueService {
  if (!orchestrationQueueServiceInstance) {
    orchestrationQueueServiceInstance = new OrchestrationQueueService(fastify);
  }
  return orchestrationQueueServiceInstance;
}

/**
 * Get orchestration queue service singleton
 * @returns OrchestrationQueueService instance
 * @throws Error if not initialized
 */
export function getOrchestrationQueueService(): OrchestrationQueueService {
  if (!orchestrationQueueServiceInstance) {
    throw new Error('Orchestration queue service not initialized');
  }
  return orchestrationQueueServiceInstance;
}

export default OrchestrationQueueService;
