/**
 * @file queue/index.ts
 * @description Shared queue types for BullMQ job processing
 * @module @synthstack/types/queue
 */

// ============================================
// EMAIL QUEUE TYPES
// ============================================

/**
 * Email job data structure
 */
export interface EmailJobData {
  /** Email queue database ID */
  queueId: string;
  /** Priority (0-10) */
  priority?: number;
  /** User ID for tracking */
  userId?: string;
}

/**
 * Email job result
 */
export interface EmailJobResult {
  /** Whether email was sent successfully */
  success: boolean;
  /** SMTP message ID */
  messageId?: string;
  /** Error if failed */
  error?: string;
}

// ============================================
// ORCHESTRATION QUEUE TYPES
// ============================================

/**
 * Job types for orchestration
 */
export type JobType = 'batch' | 'single_agent' | 'github_analysis' | 'retry';

/**
 * Trigger source for jobs
 */
export type TriggerSource = 'cron' | 'webhook' | 'manual' | 'api' | 'system' | 'retry_scheduler';

/**
 * Orchestration job data structure
 */
export interface OrchestrationJobData {
  /** Project ID to run orchestration for */
  projectId: string;
  /** Source that triggered the orchestration */
  triggeredBy: TriggerSource;
  /** Optional user ID if manually triggered */
  userId?: string;
  /** Priority (1-10, higher = more important) */
  priority?: number;
  /** Job type for tracking */
  jobType: JobType;
  /** Agent slug if single agent job */
  agentSlug?: string;
  /** Additional context/parameters */
  context?: Record<string, unknown>;
}

/**
 * Orchestration job result
 */
export interface OrchestrationJobResult {
  /** Whether the job was successful */
  success: boolean;
  /** Job ID from the orchestration system */
  jobId?: string;
  /** Number of agents executed */
  agentsExecuted?: number;
  /** Number of agents that succeeded */
  agentsSucceeded?: number;
  /** Number of agents that failed */
  agentsFailed?: number;
  /** Tasks created during execution */
  tasksCreated?: number;
  /** Suggestions created during execution */
  suggestionsCreated?: number;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * Queue event data for monitoring
 */
export interface QueueEventData {
  jobId: string;
  projectId: string;
  status: 'queued' | 'active' | 'completed' | 'failed' | 'stalled';
  timestamp: Date;
  data?: Record<string, unknown>;
}

// ============================================
// BASE QUEUE CONFIGURATION
// ============================================

/**
 * Base queue configuration for BullMQ workers
 */
export interface QueueConfiguration {
  /** Queue name */
  name: string;
  /** Number of concurrent workers */
  concurrency: number;
  /** Number of retry attempts */
  retryAttempts: number;
  /** Backoff delay in milliseconds */
  backoffDelay: number;
  /** Optional rate limiting */
  rateLimit?: {
    /** Maximum jobs per duration */
    max: number;
    /** Duration in milliseconds */
    duration: number;
  };
  /** Optional job timeout in milliseconds */
  timeout?: number;
}
