/**
 * Orchestration types for SynthStack
 */

export type ScheduleType = 'hourly' | 'every_4h' | 'every_8h' | 'daily' | 'weekly' | 'custom';
export type OrchestrationJobType = 'batch' | 'single_agent';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TriggerType = 'scheduled' | 'manual' | 'webhook' | 'event';

export interface OrchestrationSchedule {
  id: string;
  projectId: string;
  agentId: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  scheduleType: ScheduleType;
  cronExpression?: string;
  timezone: string;
  runOnDays: number[];
  priority: number;
  lastRunAt?: string;
  nextRunAt?: string;
  totalRuns: number;
  totalSuccesses: number;
  totalFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestrationJob {
  id: string;
  projectId: string;
  scheduleId?: string;
  jobType: OrchestrationJobType;
  triggeredBy: TriggerType;
  status: JobStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  agentsExecuted: number;
  agentsSucceeded: number;
  agentsFailed: number;
  tasksCreated: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface OrchestrationAction {
  id: string;
  jobId: string;
  agentSlug: string;
  category: ActionCategory;
  actionType: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: JobStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export type ActionCategory =
  | 'code'
  | 'communication'
  | 'documentation'
  | 'analysis'
  | 'deployment'
  | 'integration';

export interface OrchestrationTrigger {
  id: string;
  scheduleId: string;
  triggerType: TriggerType;
  config: TriggerConfig;
  isActive: boolean;
}

export interface TriggerConfig {
  webhookUrl?: string;
  webhookSecret?: string;
  eventType?: string;
  conditions?: Record<string, unknown>;
}
