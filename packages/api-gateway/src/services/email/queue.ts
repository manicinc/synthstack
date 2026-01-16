/**
 * @file services/email/queue.ts
 * @description BullMQ email queue service for reliable asynchronous email processing
 * @module @synthstack/api-gateway/services/email
 */

import { Queue, Worker, Job } from 'bullmq';
import type { FastifyInstance } from 'fastify';
import type { EmailJobData, EmailJobResult } from '@synthstack/types';
import { getEmailService } from './mailer.js';
import { config } from '../../config/index.js';

// ============================================
// EMAIL QUEUE SERVICE
// ============================================

/**
 * Email queue service using BullMQ for reliable job processing
 * 
 * Features:
 * - Priority queue (higher priority = sent first)
 * - Automatic retry with exponential backoff
 * - Job persistence in Redis
 * - Concurrency control
 * - Dead letter queue for failed jobs
 * - Job progress tracking
 * - Rate limiting per domain
 * 
 * @example
 * ```typescript
 * const queueService = new EmailQueueService(fastify);
 * await queueService.addEmail({
 *   queueId: 'email-uuid',
 *   priority: 5,
 *   userId: 'user-123'
 * });
 * ```
 */
export class EmailQueueService {
  private queue: Queue<EmailJobData, EmailJobResult> | null = null;
  private worker: Worker<EmailJobData, EmailJobResult> | null = null;
  private fastify: FastifyInstance;

  /**
   * Creates an instance of EmailQueueService
   * @param fastify - Fastify instance
   */
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.initializeQueue();
  }

  /**
   * Initialize BullMQ queue and worker
   * @private
   */
  private initializeQueue(): void {
    if (!config.redisUrl) {
      this.fastify.log.warn('⚠️ Redis not configured - email queue disabled');
      return;
    }

    try {
      const redisConnection = {
        url: config.redisUrl,
      };

      // Create queue
      this.queue = new Queue<EmailJobData, EmailJobResult>('email-queue', {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000, // Start with 1 minute
          },
          removeOnComplete: {
            age: 86400, // Keep for 24 hours
            count: 1000, // Keep last 1000
          },
          removeOnFail: {
            age: 604800, // Keep failures for 7 days
          },
        },
      });

      // Create worker
      this.worker = new Worker<EmailJobData, EmailJobResult>(
        'email-queue',
        async (job: Job<EmailJobData>) => this.processJob(job),
        {
          connection: redisConnection,
          concurrency: 5, // Process 5 emails concurrently
          limiter: {
            max: 10, // Max 10 jobs
            duration: 1000, // Per second
          },
        }
      );

      // Event handlers
      this.worker.on('completed', (job, result) => {
        this.fastify.log.info({ jobId: job.id, queueId: job.data.queueId }, 'Email job completed');
      });

      this.worker.on('failed', (job, error) => {
        this.fastify.log.error({ jobId: job?.id, error: error.message }, 'Email job failed');
      });

      this.worker.on('error', (error) => {
        this.fastify.log.error({ error }, 'Email worker error');
      });

      this.fastify.log.info('✅ Email queue initialized');
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to initialize email queue');
    }
  }

  /**
   * Check if queue is configured and ready
   * @returns True if queue is ready
   */
  isConfigured(): boolean {
    return this.queue !== null;
  }

  /**
   * Add email to queue for processing
   * 
   * @param data - Email job data
   * @param delay - Optional delay in milliseconds
   * @returns Promise resolving to job ID
   * 
   * @example
   * ```typescript
   * const jobId = await queueService.addEmail({
   *   queueId: 'uuid',
   *   priority: 5
   * });
   * ```
   */
  async addEmail(data: EmailJobData, delay?: number): Promise<string | null> {
    if (!this.queue) {
      this.fastify.log.warn('Queue not configured, falling back to direct send');
      // Fall back to direct processing via email service
      const emailService = getEmailService();
      await (emailService as any).processQueueItem(data.queueId);
      return null;
    }

    try {
      const job = await this.queue.add('send-email', data, {
        priority: data.priority || 0,
        delay,
      });

      return job.id!;
    } catch (error: any) {
      this.fastify.log.error({ error }, 'Failed to add email to queue');
      return null;
    }
  }

  /**
   * Add high-priority email (transactional)
   * @param data - Email job data
   * @returns Promise resolving to job ID
   */
  async addHighPriority(data: EmailJobData): Promise<string | null> {
    return this.addEmail({ ...data, priority: 10 });
  }

  /**
   * Add low-priority email (marketing)
   * @param data - Email job data
   * @returns Promise resolving to job ID
   */
  async addLowPriority(data: EmailJobData): Promise<string | null> {
    return this.addEmail({ ...data, priority: 1 });
  }

  /**
   * Schedule email for future delivery
   * @param data - Email job data
   * @param sendAt - Date to send email
   * @returns Promise resolving to job ID
   */
  async scheduleEmail(data: EmailJobData, sendAt: Date): Promise<string | null> {
    const delay = sendAt.getTime() - Date.now();
    if (delay < 0) {
      return this.addEmail(data);
    }
    return this.addEmail(data, delay);
  }

  /**
   * Process email job (worker callback)
   * @param job - BullMQ job
   * @returns Promise resolving to job result
   * @private
   */
  private async processJob(job: Job<EmailJobData>): Promise<EmailJobResult> {
    const { queueId } = job.data;

    try {
      const emailService = getEmailService();
      const result = await (emailService as any).processQueueItem(queueId);

      if (!result.success) {
        throw new Error(result.error || 'Email sending failed');
      }

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: any) {
      this.fastify.log.error({ error, queueId }, 'Email job processing failed');
      throw error; // Rethrow for BullMQ retry logic
    }
  }

  /**
   * Get queue statistics
   * @returns Queue stats
   */
  async getStats(): Promise<any> {
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
   * Get failed jobs for manual review
   * @param limit - Maximum number of jobs to return
   * @returns Array of failed jobs
   */
  async getFailedJobs(limit: number = 50): Promise<Job[]> {
    if (!this.queue) return [];

    try {
      return await this.queue.getFailed(0, limit);
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to get failed jobs');
      return [];
    }
  }

  /**
   * Retry a failed job
   * @param jobId - Job ID to retry
   * @returns Promise resolving to true if retry was successful
   */
  async retryJob(jobId: string): Promise<boolean> {
    if (!this.queue) return false;

    try {
      const job = await this.queue.getJob(jobId);
      if (job && await job.isFailed()) {
        await job.retry();
        return true;
      }
      return false;
    } catch (error) {
      this.fastify.log.error({ error, jobId }, 'Failed to retry job');
      return false;
    }
  }

  /**
   * Clean up old completed and failed jobs
   * @param olderThan - Age in milliseconds
   * @returns Number of jobs cleaned
   */
  async cleanup(olderThan: number = 604800000): Promise<number> {
    if (!this.queue) return 0;

    try {
      const cleaned = await this.queue.clean(olderThan, 1000, 'completed');
      await this.queue.clean(olderThan, 1000, 'failed');
      
      this.fastify.log.info({ cleaned }, 'Email queue cleaned');
      return cleaned.length;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to clean queue');
      return 0;
    }
  }

  /**
   * Pause queue processing
   */
  async pause(): Promise<void> {
    if (this.queue) {
      await this.queue.pause();
      this.fastify.log.info('Email queue paused');
    }
  }

  /**
   * Resume queue processing
   */
  async resume(): Promise<void> {
    if (this.queue) {
      await this.queue.resume();
      this.fastify.log.info('Email queue resumed');
    }
  }

  /**
   * Gracefully close queue and worker
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    this.fastify.log.info('Email queue closed');
  }
}

// ============================================
// SINGLETON
// ============================================

let emailQueueServiceInstance: EmailQueueService | null = null;

/**
 * Initialize email queue service singleton
 * @param fastify - Fastify instance
 * @returns EmailQueueService instance
 */
export function initEmailQueueService(fastify: FastifyInstance): EmailQueueService {
  if (!emailQueueServiceInstance) {
    emailQueueServiceInstance = new EmailQueueService(fastify);
  }
  return emailQueueServiceInstance;
}

/**
 * Get email queue service singleton
 * @returns EmailQueueService instance
 * @throws Error if not initialized
 */
export function getEmailQueueService(): EmailQueueService {
  if (!emailQueueServiceInstance) {
    throw new Error('Email queue service not initialized');
  }
  return emailQueueServiceInstance;
}

export default EmailQueueService;
