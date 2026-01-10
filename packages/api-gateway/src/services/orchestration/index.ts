/**
 * @file services/orchestration/index.ts
 * @description Autonomous orchestration service for AI agent batch processing
 * @module @synthstack/api-gateway/services/orchestration
 *
 * Features:
 * - Batch orchestration across multiple agents
 * - GitHub repository analysis for velocity metrics
 * - Intelligent task assignment based on agent capabilities
 * - "Do Nothing" intelligence - agents decide if action is needed
 * - Execution logging and tracking
 */

import type { FastifyInstance } from 'fastify';
import { featureFlagsService } from '../featureFlags.js';
import { directusClient } from '../directus.js';
import crypto from 'crypto';

// COMMUNITY: Types and stubs for removed services
type AgentSlug = string;
type AgentConfig = {
  id: string;
  slug: AgentSlug;
  name: string;
  capabilities: string[];
  autonomyLevel: string;
};

// Stub for agents service (PRO feature)
const agentService = {
  async getAgent(_slug: AgentSlug): Promise<AgentConfig | null> {
    return null; // Agents not available in Community Edition
  },
  async getAgents(): Promise<AgentConfig[]> {
    return []; // Agents not available in Community Edition
  },
};

// Stub for GitHub service (PRO feature)
class GitHubService {
  constructor(_server: FastifyInstance) {}
  async isConfigured(): Promise<boolean> { return false; }
  async getVelocityMetrics(_repo: string, _days?: number): Promise<unknown> { return null; }
}

// ============================================
// Types
// ============================================

/**
 * Job status enumeration
 */
export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

/**
 * Execution log status
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'do_nothing';

/**
 * Trigger source for jobs
 */
export type TriggerSource = 'cron' | 'webhook' | 'manual' | 'api' | 'system' | 'retry_scheduler';

/**
 * Risk level for actions
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Schedule type for agent orchestration
 */
export type ScheduleType = 'hourly' | 'every_4h' | 'every_8h' | 'daily' | 'weekly' | 'custom';

/**
 * Orchestration schedule configuration
 */
export interface OrchestrationSchedule {
  id: string;
  projectId: string;
  agentId: string;
  agentSlug: AgentSlug;
  isEnabled: boolean;
  scheduleType: ScheduleType;
  cronExpression: string | null;
  timezone: string;
  runAfterTime: string | null;
  runBeforeTime: string | null;
  runOnDays: number[];
  minIntervalMinutes: number;
  maxRunsPerDay: number;
  cooldownAfterErrorMinutes: number;
  priority: number;
  allowConcurrent: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  totalRuns: number;
  totalSuccesses: number;
}

/**
 * Orchestration job record
 */
export interface OrchestrationJob {
  id: string;
  projectId: string | null;
  jobType: string;
  triggeredBy: TriggerSource;
  triggeredByUserId: string | null;
  status: JobStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  timeoutAt: string | null;
  durationMs: number | null;
  agentsExecuted: number;
  agentsSucceeded: number;
  agentsFailed: number;
  tasksCreated: number;
  tasksAssigned: number;
  errorMessage: string | null;
  errorCode: string | null;
  attemptNumber: number;
  maxAttempts: number;
  inputParams: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
  dateCreated: string;
}

/**
 * Execution log entry
 */
export interface ExecutionLog {
  id: string;
  jobId: string;
  projectId: string | null;
  agentId: string | null;
  agentSlug: string;
  agentName: string | null;
  phase: string;
  status: ExecutionStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  shouldAct: boolean;
  doNothingReason: string | null;
  confidenceScore: number | null;
  contextSummary: Record<string, unknown>;
  githubDataUsed: Record<string, unknown>;
  actionsProposed: number;
  actionsExecuted: number;
  actionsApproved: number;
  actionsRejected: number;
  outputData: Record<string, unknown>;
  suggestionsCreated: string[];
  tasksCreated: string[];
  errorMessage: string | null;
  tokensUsed: number;
  estimatedCostCents: number;
}

/**
 * GitHub analysis result
 */
export interface GitHubAnalysis {
  projectId: string;
  periodType: 'hourly' | 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  commitsCount: number;
  commitsByAuthor: Record<string, number>;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  prsOpened: number;
  prsMerged: number;
  prsClosed: number;
  avgPrReviewHours: number | null;
  avgPrMergeHours: number | null;
  issuesOpened: number;
  issuesClosed: number;
  avgIssueResolutionHours: number | null;
  issuesByLabel: Record<string, number>;
  velocityScore: number | null;
  velocityTrend: 'increasing' | 'stable' | 'decreasing' | null;
  velocityChangePercent: number | null;
  activeContributors: number;
  hotSpots: Array<{ path: string; changes: number; riskScore: number }>;
  analyzedAt: string;
}

/**
 * Task assignment result
 */
export interface TaskAssignment {
  agentSlug: AgentSlug;
  taskType: string;
  priority: number;
  context: Record<string, unknown>;
  reason: string;
}

/**
 * Agent execution context
 */
export interface AgentExecutionContext {
  projectId: string;
  jobId: string;
  agent: AgentConfig;
  githubAnalysis: GitHubAnalysis | null;
  recentActivity: Record<string, unknown>;
  projectContext: Record<string, unknown>;
  actionConfigs: Array<{
    actionKey: string;
    isEnabled: boolean;
    requiresApproval: boolean;
    riskLevel: RiskLevel;
  }>;
}

/**
 * "Should act" decision result
 */
export interface ShouldActDecision {
  shouldAct: boolean;
  reason: string;
  confidence: number;
  suggestedActions: string[];
  context: Record<string, unknown>;
}

/**
 * Batch orchestration result
 */
export interface BatchOrchestrationResult {
  jobId: string;
  projectId: string;
  status: JobStatus;
  agentsExecuted: number;
  agentsSucceeded: number;
  agentsFailed: number;
  agentsSkipped: number;
  tasksCreated: number;
  suggestionsCreated: number;
  executionLogs: ExecutionLog[];
  durationMs: number;
  errors: Array<{ agentSlug: string; error: string }>;
}

// ============================================
// OrchestrationService Class
// ============================================

/**
 * Orchestration service for autonomous AI agent batch processing
 *
 * @example
 * ```typescript
 * const orchestrationService = new OrchestrationService(fastify);
 * const result = await orchestrationService.runBatchOrchestration(projectId, 'cron');
 * ```
 */
export class OrchestrationService {
  private server: FastifyInstance;
  private githubService: GitHubService;

  /**
   * Creates an instance of OrchestrationService
   * @param server - Fastify instance
   */
  constructor(server: FastifyInstance) {
    this.server = server;
    this.githubService = new GitHubService(server);
  }

  // ============================================
  // Batch Orchestration
  // ============================================

  /**
   * Run batch orchestration for a project
   * Executes all enabled agents for the project based on their schedules
   *
   * @param projectId - Project ID to run orchestration for
   * @param triggeredBy - Source that triggered the orchestration
   * @param userId - Optional user ID if manually triggered
   * @returns Batch orchestration result
   */
  async runBatchOrchestration(
    projectId: string,
    triggeredBy: TriggerSource,
    userId?: string
  ): Promise<BatchOrchestrationResult> {
    const startTime = Date.now();
    const errors: Array<{ agentSlug: string; error: string }> = [];
    const executionLogs: ExecutionLog[] = [];

    // Create job record
    const job = await this.createJob({
      projectId,
      jobType: 'batch',
      triggeredBy,
      triggeredByUserId: userId || null,
      status: 'running',
      startedAt: new Date().toISOString(),
    });

    try {
      // Get enabled schedules for the project
      const schedules = await this.getEnabledSchedules(projectId);

      if (schedules.length === 0) {
        await this.updateJob(job.id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          outputSummary: { message: 'No enabled schedules found' },
        });

        return {
          jobId: job.id,
          projectId,
          status: 'completed',
          agentsExecuted: 0,
          agentsSucceeded: 0,
          agentsFailed: 0,
          agentsSkipped: 0,
          tasksCreated: 0,
          suggestionsCreated: 0,
          executionLogs: [],
          durationMs: Date.now() - startTime,
          errors: [],
        };
      }

      // Analyze GitHub if project has GitHub integration
      let githubAnalysis: GitHubAnalysis | null = null;
      try {
        githubAnalysis = await this.analyzeGitHub(projectId, 24);
      } catch (error) {
        this.server.log.warn({ error, projectId }, 'GitHub analysis failed, continuing without');
      }

      // Execute each agent
      let agentsExecuted = 0;
      let agentsSucceeded = 0;
      let agentsFailed = 0;
      let agentsSkipped = 0;
      let tasksCreated = 0;
      let suggestionsCreated = 0;

      for (const schedule of schedules) {
        // Check if agent should run based on schedule
        if (!this.shouldRunNow(schedule)) {
          agentsSkipped++;
          continue;
        }

        const agent = await agentService.getAgent(schedule.agentSlug);
        if (!agent) {
          this.server.log.warn({ agentSlug: schedule.agentSlug }, 'Agent not found');
          continue;
        }

        // Get action configs for this agent
        const actionConfigs = await this.getActionConfigs(projectId, schedule.agentSlug);

        // Build execution context
        const context: AgentExecutionContext = {
          projectId,
          jobId: job.id,
          agent,
          githubAnalysis,
          recentActivity: await this.getRecentProjectActivity(projectId),
          projectContext: await this.getProjectContext(projectId),
          actionConfigs,
        };

        // Execute agent
        agentsExecuted++;
        try {
          const execLog = await this.executeAgentTask({
            jobId: job.id,
            scheduleId: schedule.id,
            context,
          });

          executionLogs.push(execLog);

          if (execLog.status === 'completed') {
            agentsSucceeded++;
            tasksCreated += execLog.tasksCreated.length;
            suggestionsCreated += execLog.suggestionsCreated.length;

            // Update schedule success
            await this.updateScheduleSuccess(schedule.id);
          } else if (execLog.status === 'failed') {
            agentsFailed++;
            errors.push({
              agentSlug: schedule.agentSlug,
              error: execLog.errorMessage || 'Unknown error',
            });

            // Update schedule failure
            await this.updateScheduleFailure(schedule.id);
          } else if (execLog.status === 'do_nothing') {
            agentsSucceeded++; // "Do nothing" is still a success
            await this.updateScheduleSuccess(schedule.id);
          }
        } catch (error) {
          agentsFailed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ agentSlug: schedule.agentSlug, error: errorMessage });

          // Create error log
          executionLogs.push({
            id: crypto.randomUUID(),
            jobId: job.id,
            projectId,
            agentId: agent.id,
            agentSlug: schedule.agentSlug,
            agentName: agent.name,
            phase: 'execute',
            status: 'failed',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: 0,
            shouldAct: false,
            doNothingReason: null,
            confidenceScore: null,
            contextSummary: {},
            githubDataUsed: {},
            actionsProposed: 0,
            actionsExecuted: 0,
            actionsApproved: 0,
            actionsRejected: 0,
            outputData: {},
            suggestionsCreated: [],
            tasksCreated: [],
            errorMessage,
            tokensUsed: 0,
            estimatedCostCents: 0,
          });

          await this.updateScheduleFailure(schedule.id);
        }
      }

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Update job with results
      const finalStatus: JobStatus = agentsFailed > 0 && agentsSucceeded === 0 ? 'failed' : 'completed';
      await this.updateJob(job.id, {
        status: finalStatus,
        completedAt: new Date().toISOString(),
        durationMs,
        agentsExecuted,
        agentsSucceeded,
        agentsFailed,
        tasksCreated,
        outputSummary: {
          agentsSkipped,
          suggestionsCreated,
          errors: errors.length,
        },
      });

      return {
        jobId: job.id,
        projectId,
        status: finalStatus,
        agentsExecuted,
        agentsSucceeded,
        agentsFailed,
        agentsSkipped,
        tasksCreated,
        suggestionsCreated,
        executionLogs,
        durationMs,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const durationMs = Date.now() - startTime;

      await this.updateJob(job.id, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        durationMs,
        errorMessage,
        errorCode: 'BATCH_ORCHESTRATION_FAILED',
      });

      throw error;
    }
  }

  // ============================================
  // GitHub Analysis
  // ============================================

  /**
   * Analyze GitHub repository for velocity metrics
   *
   * @param projectId - Project ID
   * @param periodHours - Hours to analyze (default 24)
   * @returns GitHub analysis results
   */
  async analyzeGitHub(projectId: string, periodHours: number = 24): Promise<GitHubAnalysis> {
    // Get project's GitHub config
    const projectResult = await this.server.pg.query(
      `SELECT github_repo, github_pat_encrypted FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }

    const { github_repo, github_pat_encrypted } = projectResult.rows[0];

    if (!github_repo || !github_pat_encrypted) {
      throw new Error('Project does not have GitHub integration configured');
    }

    // Calculate period
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - periodHours * 60 * 60 * 1000);
    const periodType = periodHours <= 1 ? 'hourly' : periodHours <= 24 ? 'daily' : periodHours <= 168 ? 'weekly' : 'monthly';

    // Check cache first
    const cachedResult = await this.server.pg.query(
      `SELECT * FROM github_analysis_cache
       WHERE project_id = $1
       AND period_type = $2
       AND period_start >= $3
       AND is_stale = false
       ORDER BY analyzed_at DESC
       LIMIT 1`,
      [projectId, periodType, periodStart.toISOString()]
    );

    if (cachedResult.rows.length > 0) {
      return this.mapGitHubAnalysisFromDb(cachedResult.rows[0]);
    }

    // Fetch fresh data from GitHub
    const analysis = await this.fetchGitHubMetrics(projectId, github_repo, periodStart, periodEnd);

    // Cache the results
    await this.cacheGitHubAnalysis(projectId, periodType, analysis);

    return analysis;
  }

  /**
   * Fetch GitHub metrics from the API
   * @private
   */
  private async fetchGitHubMetrics(
    projectId: string,
    repo: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<GitHubAnalysis> {
    // Get cached issues and PRs from database
    const [issuesResult, prsResult, commitsResult] = await Promise.all([
      this.server.pg.query(
        `SELECT * FROM project_github_issues
         WHERE project_id = $1
         AND github_created_at >= $2
         AND github_created_at <= $3`,
        [projectId, periodStart.toISOString(), periodEnd.toISOString()]
      ),
      this.server.pg.query(
        `SELECT * FROM project_github_prs
         WHERE project_id = $1
         AND github_created_at >= $2
         AND github_created_at <= $3`,
        [projectId, periodStart.toISOString(), periodEnd.toISOString()]
      ),
      // Note: Commits are not stored in DB, this is a placeholder
      Promise.resolve({ rows: [] }),
    ]);

    const issues = issuesResult.rows;
    const prs = prsResult.rows;

    // Calculate metrics
    const issuesOpened = issues.filter((i) => new Date(i.github_created_at) >= periodStart).length;
    const issuesClosed = issues.filter(
      (i) => i.github_closed_at && new Date(i.github_closed_at) >= periodStart
    ).length;

    const prsOpened = prs.filter((p) => new Date(p.github_created_at) >= periodStart).length;
    const prsMerged = prs.filter(
      (p) => p.github_merged_at && new Date(p.github_merged_at) >= periodStart
    ).length;
    const prsClosed = prs.filter(
      (p) => p.github_closed_at && new Date(p.github_closed_at) >= periodStart && !p.merged
    ).length;

    // Calculate PR review time
    const avgPrReviewHours: number | null = null;
    let avgPrMergeHours: number | null = null;
    const mergedPrs = prs.filter((p) => p.github_merged_at);
    if (mergedPrs.length > 0) {
      const totalMergeHours = mergedPrs.reduce((sum, p) => {
        const created = new Date(p.github_created_at);
        const merged = new Date(p.github_merged_at);
        return sum + (merged.getTime() - created.getTime()) / (1000 * 60 * 60);
      }, 0);
      avgPrMergeHours = totalMergeHours / mergedPrs.length;
    }

    // Calculate issue resolution time
    let avgIssueResolutionHours: number | null = null;
    const closedIssues = issues.filter((i) => i.github_closed_at);
    if (closedIssues.length > 0) {
      const totalResolutionHours = closedIssues.reduce((sum, i) => {
        const created = new Date(i.github_created_at);
        const closed = new Date(i.github_closed_at);
        return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60);
      }, 0);
      avgIssueResolutionHours = totalResolutionHours / closedIssues.length;
    }

    // Calculate issues by label
    const issuesByLabel: Record<string, number> = {};
    for (const issue of issues) {
      const labels = issue.labels || [];
      for (const label of labels) {
        const labelName = typeof label === 'string' ? label : label;
        issuesByLabel[labelName] = (issuesByLabel[labelName] || 0) + 1;
      }
    }

    // Calculate commits by author (from PRs since we have author data)
    const commitsByAuthor: Record<string, number> = {};
    for (const pr of prs) {
      if (pr.created_by_github_user) {
        commitsByAuthor[pr.created_by_github_user] = (commitsByAuthor[pr.created_by_github_user] || 0) + 1;
      }
    }

    // Calculate lines changed from PRs
    let linesAdded = 0;
    let linesRemoved = 0;
    let filesChanged = 0;
    for (const pr of prs) {
      linesAdded += pr.additions || 0;
      linesRemoved += pr.deletions || 0;
      filesChanged += pr.changed_files || 0;
    }

    // Calculate velocity score (0-100)
    // Based on: PRs merged, issues closed, commit activity
    const baseVelocity = (prsMerged * 10 + issuesClosed * 5 + prsOpened * 3);
    const velocityScore = Math.min(100, baseVelocity);

    // Get unique contributors
    const contributors = new Set<string>();
    for (const pr of prs) {
      if (pr.created_by_github_user) contributors.add(pr.created_by_github_user);
    }
    for (const issue of issues) {
      if (issue.created_by_github_user) contributors.add(issue.created_by_github_user);
    }

    // Determine period type
    const durationHours = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);
    const periodType =
      durationHours <= 1 ? 'hourly' : durationHours <= 24 ? 'daily' : durationHours <= 168 ? 'weekly' : 'monthly';

    return {
      projectId,
      periodType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      commitsCount: Object.values(commitsByAuthor).reduce((a, b) => a + b, 0),
      commitsByAuthor,
      filesChanged,
      linesAdded,
      linesRemoved,
      prsOpened,
      prsMerged,
      prsClosed,
      avgPrReviewHours,
      avgPrMergeHours,
      issuesOpened,
      issuesClosed,
      avgIssueResolutionHours,
      issuesByLabel,
      velocityScore,
      velocityTrend: null, // Would need historical data to calculate
      velocityChangePercent: null,
      activeContributors: contributors.size,
      hotSpots: [], // Would need file-level analysis
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Cache GitHub analysis results
   * @private
   */
  private async cacheGitHubAnalysis(
    projectId: string,
    periodType: string,
    analysis: GitHubAnalysis
  ): Promise<void> {
    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(analysis))
      .digest('hex');

    // Expire after 1 hour for hourly, 4 hours for daily, 24 hours for weekly/monthly
    const expiresInHours = periodType === 'hourly' ? 1 : periodType === 'daily' ? 4 : 24;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.server.pg.query(
      `INSERT INTO github_analysis_cache (
        project_id, period_type, period_start, period_end,
        commits_count, commits_by_author, files_changed, lines_added, lines_removed,
        prs_opened, prs_merged, prs_closed, avg_pr_review_hours, avg_pr_merge_hours,
        issues_opened, issues_closed, avg_issue_resolution_hours, issues_by_label,
        velocity_score, velocity_trend, velocity_change_percent,
        active_contributors, hot_spots, data_hash, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25
      )
      ON CONFLICT (project_id, period_type, period_start)
      DO UPDATE SET
        commits_count = EXCLUDED.commits_count,
        commits_by_author = EXCLUDED.commits_by_author,
        files_changed = EXCLUDED.files_changed,
        lines_added = EXCLUDED.lines_added,
        lines_removed = EXCLUDED.lines_removed,
        prs_opened = EXCLUDED.prs_opened,
        prs_merged = EXCLUDED.prs_merged,
        prs_closed = EXCLUDED.prs_closed,
        avg_pr_review_hours = EXCLUDED.avg_pr_review_hours,
        avg_pr_merge_hours = EXCLUDED.avg_pr_merge_hours,
        issues_opened = EXCLUDED.issues_opened,
        issues_closed = EXCLUDED.issues_closed,
        avg_issue_resolution_hours = EXCLUDED.avg_issue_resolution_hours,
        issues_by_label = EXCLUDED.issues_by_label,
        velocity_score = EXCLUDED.velocity_score,
        velocity_trend = EXCLUDED.velocity_trend,
        velocity_change_percent = EXCLUDED.velocity_change_percent,
        active_contributors = EXCLUDED.active_contributors,
        hot_spots = EXCLUDED.hot_spots,
        data_hash = EXCLUDED.data_hash,
        expires_at = EXCLUDED.expires_at,
        analyzed_at = NOW(),
        is_stale = false`,
      [
        projectId,
        periodType,
        analysis.periodStart,
        analysis.periodEnd,
        analysis.commitsCount,
        JSON.stringify(analysis.commitsByAuthor),
        analysis.filesChanged,
        analysis.linesAdded,
        analysis.linesRemoved,
        analysis.prsOpened,
        analysis.prsMerged,
        analysis.prsClosed,
        analysis.avgPrReviewHours,
        analysis.avgPrMergeHours,
        analysis.issuesOpened,
        analysis.issuesClosed,
        analysis.avgIssueResolutionHours,
        JSON.stringify(analysis.issuesByLabel),
        analysis.velocityScore,
        analysis.velocityTrend,
        analysis.velocityChangePercent,
        analysis.activeContributors,
        JSON.stringify(analysis.hotSpots),
        dataHash,
        expiresAt.toISOString(),
      ]
    );
  }

  // ============================================
  // Task Assignment
  // ============================================

  /**
   * Analyze context and assign tasks to appropriate agents
   *
   * @param analysis - GitHub analysis data
   * @param projectId - Project ID
   * @returns Array of task assignments
   */
  async assignTasksToAgents(
    analysis: GitHubAnalysis,
    projectId: string
  ): Promise<TaskAssignment[]> {
    const assignments: TaskAssignment[] = [];

    // Get available agents
    const agents = await agentService.getAgents();
    const enabledAgentSlugs = new Set(
      (await this.getEnabledSchedules(projectId)).map((s) => s.agentSlug)
    );

    // Analyze conditions and assign tasks

    // Developer agent: High PR activity or code quality issues
    if (enabledAgentSlugs.has('developer')) {
      if (analysis.prsOpened > 5 || analysis.prsMerged > 3) {
        assignments.push({
          agentSlug: 'developer',
          taskType: 'code_review',
          priority: 7,
          context: {
            prsOpened: analysis.prsOpened,
            prsMerged: analysis.prsMerged,
            avgMergeHours: analysis.avgPrMergeHours,
          },
          reason: 'High PR activity detected - review queue may need attention',
        });
      }

      if (analysis.hotSpots.length > 0) {
        assignments.push({
          agentSlug: 'developer',
          taskType: 'hotspot_analysis',
          priority: 6,
          context: { hotSpots: analysis.hotSpots },
          reason: 'Frequently changed files detected - may need refactoring',
        });
      }
    }

    // Researcher agent: New issues with research labels
    if (enabledAgentSlugs.has('researcher')) {
      const researchLabels = ['research', 'investigation', 'spike', 'exploration'];
      const hasResearchIssues = Object.keys(analysis.issuesByLabel).some((label) =>
        researchLabels.some((rl) => label.toLowerCase().includes(rl))
      );

      if (hasResearchIssues) {
        assignments.push({
          agentSlug: 'researcher',
          taskType: 'issue_research',
          priority: 5,
          context: { issuesByLabel: analysis.issuesByLabel },
          reason: 'Research-related issues detected',
        });
      }
    }

    // Marketer agent: Milestone completions or significant releases
    if (enabledAgentSlugs.has('marketer')) {
      if (analysis.prsMerged >= 10) {
        assignments.push({
          agentSlug: 'marketer',
          taskType: 'release_notes',
          priority: 4,
          context: {
            prsMerged: analysis.prsMerged,
            period: analysis.periodType,
          },
          reason: 'Significant merge activity - may warrant release communication',
        });
      }
    }

    // SEO Writer: Content updates detected
    if (enabledAgentSlugs.has('seo_writer')) {
      const docLabels = ['docs', 'documentation', 'content'];
      const hasDocUpdates = Object.keys(analysis.issuesByLabel).some((label) =>
        docLabels.some((dl) => label.toLowerCase().includes(dl))
      );

      if (hasDocUpdates) {
        assignments.push({
          agentSlug: 'seo_writer',
          taskType: 'doc_optimization',
          priority: 3,
          context: { issuesByLabel: analysis.issuesByLabel },
          reason: 'Documentation changes detected - SEO review recommended',
        });
      }
    }

    // Sort by priority (highest first)
    assignments.sort((a, b) => b.priority - a.priority);

    return assignments;
  }

  // ============================================
  // Agent Execution
  // ============================================

  /**
   * Execute a single agent task
   *
   * @param options - Execution options
   * @returns Execution log
   */
  async executeAgentTask(options: {
    jobId: string;
    scheduleId: string;
    context: AgentExecutionContext;
  }): Promise<ExecutionLog> {
    const { jobId, scheduleId, context } = options;
    const startTime = Date.now();

    // Create execution log
    const logId = crypto.randomUUID();
    const log: ExecutionLog = {
      id: logId,
      jobId,
      projectId: context.projectId,
      agentId: context.agent.id,
      agentSlug: context.agent.slug,
      agentName: context.agent.name,
      phase: 'analyze',
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: null,
      shouldAct: true,
      doNothingReason: null,
      confidenceScore: null,
      contextSummary: {},
      githubDataUsed: {},
      actionsProposed: 0,
      actionsExecuted: 0,
      actionsApproved: 0,
      actionsRejected: 0,
      outputData: {},
      suggestionsCreated: [],
      tasksCreated: [],
      errorMessage: null,
      tokensUsed: 0,
      estimatedCostCents: 0,
    };

    try {
      // Phase 1: Analyze - Should the agent act?
      log.phase = 'analyze';
      log.contextSummary = {
        projectId: context.projectId,
        agentSlug: context.agent.slug,
        hasGithubData: !!context.githubAnalysis,
        actionConfigCount: context.actionConfigs.length,
      };

      if (context.githubAnalysis) {
        log.githubDataUsed = {
          periodType: context.githubAnalysis.periodType,
          velocityScore: context.githubAnalysis.velocityScore,
          prsOpened: context.githubAnalysis.prsOpened,
          issuesOpened: context.githubAnalysis.issuesOpened,
        };
      }

      // Check if agent should act
      const decision = await this.shouldAgentAct(context.agent.slug, context);
      log.shouldAct = decision.shouldAct;
      log.doNothingReason = decision.reason;
      log.confidenceScore = decision.confidence;

      if (!decision.shouldAct) {
        log.phase = 'complete';
        log.status = 'do_nothing';
        log.completedAt = new Date().toISOString();
        log.durationMs = Date.now() - startTime;

        // Save log to database
        await this.saveExecutionLog(log);

        return log;
      }

      // Phase 2: Decide - What actions to take?
      log.phase = 'decide';
      log.actionsProposed = decision.suggestedActions.length;

      // Phase 3: Execute - Perform the actions
      log.phase = 'execute';

      // For now, we create suggestions/drafts for human review
      // Real execution would happen here based on action configs
      const suggestionsCreated: string[] = [];
      const tasksCreated: string[] = [];

      for (const action of decision.suggestedActions) {
        // Check if action is enabled
        const actionConfig = context.actionConfigs.find((ac) => ac.actionKey === action);

        if (!actionConfig || !actionConfig.isEnabled) {
          continue;
        }

        // Create a suggestion for human review
        try {
          const suggestionId = await this.createAgentSuggestion(
            context.projectId,
            context.agent.slug,
            action,
            decision.context,
            actionConfig.requiresApproval
          );

          if (suggestionId) {
            suggestionsCreated.push(suggestionId);
            log.actionsExecuted++;
          }
        } catch (error) {
          this.server.log.error({ error, action }, 'Failed to create suggestion');
        }
      }

      log.suggestionsCreated = suggestionsCreated;
      log.tasksCreated = tasksCreated;

      // Phase 4: Verify - Record results
      log.phase = 'verify';
      log.outputData = {
        suggestionsCreated: suggestionsCreated.length,
        tasksCreated: tasksCreated.length,
        actionsExecuted: log.actionsExecuted,
      };

      // Phase 5: Complete
      log.phase = 'complete';
      log.status = 'completed';
      log.completedAt = new Date().toISOString();
      log.durationMs = Date.now() - startTime;

      // Save log to database
      await this.saveExecutionLog(log);

      return log;
    } catch (error) {
      log.status = 'failed';
      log.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.completedAt = new Date().toISOString();
      log.durationMs = Date.now() - startTime;

      // Save log to database
      await this.saveExecutionLog(log);

      return log;
    }
  }

  // ============================================
  // "Do Nothing" Intelligence
  // ============================================

  /**
   * Determine if an agent should take action based on context
   * This is the core "Do Nothing" intelligence
   *
   * @param agentSlug - Agent identifier
   * @param context - Execution context
   * @returns Decision with reasoning
   */
  async shouldAgentAct(
    agentSlug: AgentSlug,
    context: AgentExecutionContext
  ): Promise<ShouldActDecision> {
    const decision: ShouldActDecision = {
      shouldAct: false,
      reason: '',
      confidence: 0,
      suggestedActions: [],
      context: {},
    };

    // Check if there are any enabled actions for this agent
    const enabledActions = context.actionConfigs.filter((ac) => ac.isEnabled);
    if (enabledActions.length === 0) {
      decision.reason = 'No actions are enabled for this agent';
      decision.confidence = 1.0;
      return decision;
    }

    // Get recent activity to check for duplicates/recent work
    const recentActivity = context.recentActivity || {};

    // Agent-specific logic
    switch (agentSlug) {
      case 'developer':
        return this.shouldDeveloperAct(context, enabledActions);

      case 'researcher':
        return this.shouldResearcherAct(context, enabledActions);

      case 'marketer':
        return this.shouldMarketerAct(context, enabledActions);

      case 'seo_writer':
        return this.shouldSeoWriterAct(context, enabledActions);

      case 'designer':
        return this.shouldDesignerAct(context, enabledActions);

      case 'general':
        return this.shouldGeneralAct(context, enabledActions);

      default:
        decision.reason = `Unknown agent type: ${agentSlug}`;
        decision.confidence = 1.0;
        return decision;
    }
  }

  /**
   * Developer agent decision logic
   * @private
   */
  private async shouldDeveloperAct(
    context: AgentExecutionContext,
    enabledActions: Array<{ actionKey: string; isEnabled: boolean; riskLevel: RiskLevel }>
  ): Promise<ShouldActDecision> {
    const github = context.githubAnalysis;
    const suggestedActions: string[] = [];
    let confidence = 0.5;

    if (!github) {
      return {
        shouldAct: false,
        reason: 'No GitHub data available for analysis',
        confidence: 0.9,
        suggestedActions: [],
        context: {},
      };
    }

    // Check for actionable conditions
    if (github.prsOpened > 3 && enabledActions.some((a) => a.actionKey === 'analyze_code')) {
      suggestedActions.push('analyze_code');
      confidence += 0.2;
    }

    if (github.issuesOpened > 5 && enabledActions.some((a) => a.actionKey === 'create_issue')) {
      suggestedActions.push('create_issue');
      confidence += 0.1;
    }

    if (github.hotSpots.length > 0 && enabledActions.some((a) => a.actionKey === 'analyze_code')) {
      if (!suggestedActions.includes('analyze_code')) {
        suggestedActions.push('analyze_code');
      }
      confidence += 0.15;
    }

    return {
      shouldAct: suggestedActions.length > 0,
      reason:
        suggestedActions.length > 0
          ? `Found ${suggestedActions.length} actionable items based on GitHub activity`
          : 'No significant activity requiring developer attention',
      confidence: Math.min(1.0, confidence),
      suggestedActions,
      context: {
        prsOpened: github.prsOpened,
        issuesOpened: github.issuesOpened,
        hotSpots: github.hotSpots.length,
      },
    };
  }

  /**
   * Researcher agent decision logic
   * @private
   */
  private async shouldResearcherAct(
    context: AgentExecutionContext,
    enabledActions: Array<{ actionKey: string; isEnabled: boolean; riskLevel: RiskLevel }>
  ): Promise<ShouldActDecision> {
    const github = context.githubAnalysis;
    const suggestedActions: string[] = [];
    let confidence = 0.5;

    // Check for research-related issues
    if (github) {
      const researchLabels = ['research', 'spike', 'investigation', 'exploration'];
      const hasResearchIssues = Object.keys(github.issuesByLabel).some((label) =>
        researchLabels.some((rl) => label.toLowerCase().includes(rl))
      );

      if (hasResearchIssues && enabledActions.some((a) => a.actionKey === 'market_research')) {
        suggestedActions.push('market_research');
        confidence += 0.3;
      }
    }

    // Check for competitor analysis opportunities
    if (enabledActions.some((a) => a.actionKey === 'competitor_analysis')) {
      // This would be triggered by other signals in real implementation
      // For now, we'll add it based on weekly cadence
      const lastAnalysis = context.recentActivity['last_competitor_analysis'];
      if (!lastAnalysis || Date.now() - new Date(lastAnalysis as string).getTime() > 7 * 24 * 60 * 60 * 1000) {
        suggestedActions.push('competitor_analysis');
        confidence += 0.2;
      }
    }

    return {
      shouldAct: suggestedActions.length > 0,
      reason:
        suggestedActions.length > 0
          ? `Found ${suggestedActions.length} research opportunities`
          : 'No research tasks identified at this time',
      confidence: Math.min(1.0, confidence),
      suggestedActions,
      context: {
        hasResearchIssues: github ? Object.keys(github.issuesByLabel).length : 0,
      },
    };
  }

  /**
   * Marketer agent decision logic
   * @private
   */
  private async shouldMarketerAct(
    context: AgentExecutionContext,
    enabledActions: Array<{ actionKey: string; isEnabled: boolean; riskLevel: RiskLevel }>
  ): Promise<ShouldActDecision> {
    const github = context.githubAnalysis;
    const suggestedActions: string[] = [];
    let confidence = 0.5;

    if (github) {
      // Significant release activity
      if (github.prsMerged >= 5 && enabledActions.some((a) => a.actionKey === 'draft_blog_post')) {
        suggestedActions.push('draft_blog_post');
        confidence += 0.3;
      }

      // Regular social updates
      if (github.prsMerged >= 2 && enabledActions.some((a) => a.actionKey === 'draft_social_post')) {
        suggestedActions.push('draft_social_post');
        confidence += 0.2;
      }
    }

    return {
      shouldAct: suggestedActions.length > 0,
      reason:
        suggestedActions.length > 0
          ? `Found ${suggestedActions.length} marketing opportunities based on development activity`
          : 'No significant activity warranting marketing content',
      confidence: Math.min(1.0, confidence),
      suggestedActions,
      context: {
        prsMerged: github?.prsMerged || 0,
      },
    };
  }

  /**
   * SEO Writer agent decision logic
   * @private
   */
  private async shouldSeoWriterAct(
    context: AgentExecutionContext,
    enabledActions: Array<{ actionKey: string; isEnabled: boolean; riskLevel: RiskLevel }>
  ): Promise<ShouldActDecision> {
    const github = context.githubAnalysis;
    const suggestedActions: string[] = [];
    let confidence = 0.5;

    if (github) {
      // Documentation changes
      const docLabels = ['docs', 'documentation', 'readme'];
      const hasDocChanges = Object.keys(github.issuesByLabel).some((label) =>
        docLabels.some((dl) => label.toLowerCase().includes(dl))
      );

      if (hasDocChanges) {
        if (enabledActions.some((a) => a.actionKey === 'meta_suggestions')) {
          suggestedActions.push('meta_suggestions');
          confidence += 0.25;
        }
        if (enabledActions.some((a) => a.actionKey === 'keyword_research')) {
          suggestedActions.push('keyword_research');
          confidence += 0.2;
        }
      }
    }

    return {
      shouldAct: suggestedActions.length > 0,
      reason:
        suggestedActions.length > 0
          ? `Found ${suggestedActions.length} SEO optimization opportunities`
          : 'No content changes requiring SEO attention',
      confidence: Math.min(1.0, confidence),
      suggestedActions,
      context: {},
    };
  }

  /**
   * Designer agent decision logic
   * @private
   */
  private async shouldDesignerAct(
    context: AgentExecutionContext,
    enabledActions: Array<{ actionKey: string; isEnabled: boolean; riskLevel: RiskLevel }>
  ): Promise<ShouldActDecision> {
    const github = context.githubAnalysis;
    const suggestedActions: string[] = [];
    let confidence = 0.5;

    if (github) {
      // UI-related changes
      const uiLabels = ['ui', 'ux', 'design', 'frontend', 'css', 'styling'];
      const hasUiChanges = Object.keys(github.issuesByLabel).some((label) =>
        uiLabels.some((ul) => label.toLowerCase().includes(ul))
      );

      if (hasUiChanges) {
        if (enabledActions.some((a) => a.actionKey === 'analyze_visual')) {
          suggestedActions.push('analyze_visual');
          confidence += 0.3;
        }
        if (enabledActions.some((a) => a.actionKey === 'responsive_audit')) {
          suggestedActions.push('responsive_audit');
          confidence += 0.2;
        }
      }
    }

    return {
      shouldAct: suggestedActions.length > 0,
      reason:
        suggestedActions.length > 0
          ? `Found ${suggestedActions.length} design review opportunities`
          : 'No UI/UX changes requiring design review',
      confidence: Math.min(1.0, confidence),
      suggestedActions,
      context: {},
    };
  }

  /**
   * General agent decision logic
   * @private
   */
  private async shouldGeneralAct(
    context: AgentExecutionContext,
    enabledActions: Array<{ actionKey: string; isEnabled: boolean; riskLevel: RiskLevel }>
  ): Promise<ShouldActDecision> {
    const suggestedActions: string[] = [];
    let confidence = 0.5;

    // General agent handles cross-cutting tasks
    if (enabledActions.some((a) => a.actionKey === 'update_status')) {
      suggestedActions.push('update_status');
      confidence += 0.1;
    }

    return {
      shouldAct: suggestedActions.length > 0,
      reason:
        suggestedActions.length > 0
          ? `Found ${suggestedActions.length} general tasks to process`
          : 'No general tasks requiring attention',
      confidence: Math.min(1.0, confidence),
      suggestedActions,
      context: {},
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Create an orchestration job record
   * @private
   */
  private async createJob(data: Partial<OrchestrationJob>): Promise<OrchestrationJob> {
    const result = await this.server.pg.query(
      `INSERT INTO orchestration_jobs (
        project_id, job_type, triggered_by, triggered_by_user_id, status,
        scheduled_at, started_at, input_params
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.projectId,
        data.jobType || 'batch',
        data.triggeredBy || 'system',
        data.triggeredByUserId,
        data.status || 'pending',
        data.scheduledAt,
        data.startedAt,
        JSON.stringify(data.inputParams || {}),
      ]
    );

    return this.mapJobFromDb(result.rows[0]);
  }

  /**
   * Update an orchestration job
   * @private
   */
  private async updateJob(jobId: string, data: Partial<OrchestrationJob>): Promise<void> {
    const updates: string[] = ['date_updated = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.completedAt !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`);
      values.push(data.completedAt);
    }
    if (data.durationMs !== undefined) {
      updates.push(`duration_ms = $${paramIndex++}`);
      values.push(data.durationMs);
    }
    if (data.agentsExecuted !== undefined) {
      updates.push(`agents_executed = $${paramIndex++}`);
      values.push(data.agentsExecuted);
    }
    if (data.agentsSucceeded !== undefined) {
      updates.push(`agents_succeeded = $${paramIndex++}`);
      values.push(data.agentsSucceeded);
    }
    if (data.agentsFailed !== undefined) {
      updates.push(`agents_failed = $${paramIndex++}`);
      values.push(data.agentsFailed);
    }
    if (data.tasksCreated !== undefined) {
      updates.push(`tasks_created = $${paramIndex++}`);
      values.push(data.tasksCreated);
    }
    if (data.errorMessage !== undefined) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(data.errorMessage);
    }
    if (data.errorCode !== undefined) {
      updates.push(`error_code = $${paramIndex++}`);
      values.push(data.errorCode);
    }
    if (data.outputSummary !== undefined) {
      updates.push(`output_summary = $${paramIndex++}`);
      values.push(JSON.stringify(data.outputSummary));
    }

    values.push(jobId);

    await this.server.pg.query(
      `UPDATE orchestration_jobs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }

  /**
   * Save execution log to database
   * @private
   */
  private async saveExecutionLog(log: ExecutionLog): Promise<void> {
    await this.server.pg.query(
      `INSERT INTO orchestration_execution_logs (
        id, job_id, project_id, agent_id, agent_slug, agent_name, phase, status,
        started_at, completed_at, duration_ms, should_act, do_nothing_reason,
        confidence_score, context_summary, github_data_used, actions_proposed,
        actions_executed, actions_approved, actions_rejected, output_data,
        suggestions_created, tasks_created, error_message, tokens_used, estimated_cost_cents
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      ON CONFLICT (id) DO UPDATE SET
        phase = EXCLUDED.phase,
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        duration_ms = EXCLUDED.duration_ms,
        should_act = EXCLUDED.should_act,
        do_nothing_reason = EXCLUDED.do_nothing_reason,
        confidence_score = EXCLUDED.confidence_score,
        output_data = EXCLUDED.output_data,
        suggestions_created = EXCLUDED.suggestions_created,
        tasks_created = EXCLUDED.tasks_created,
        error_message = EXCLUDED.error_message`,
      [
        log.id,
        log.jobId,
        log.projectId,
        log.agentId,
        log.agentSlug,
        log.agentName,
        log.phase,
        log.status,
        log.startedAt,
        log.completedAt,
        log.durationMs,
        log.shouldAct,
        log.doNothingReason,
        log.confidenceScore,
        JSON.stringify(log.contextSummary),
        JSON.stringify(log.githubDataUsed),
        log.actionsProposed,
        log.actionsExecuted,
        log.actionsApproved,
        log.actionsRejected,
        JSON.stringify(log.outputData),
        log.suggestionsCreated,
        log.tasksCreated,
        log.errorMessage,
        log.tokensUsed,
        log.estimatedCostCents,
      ]
    );
  }

  /**
   * Get enabled schedules for a project
   * @private
   */
  private async getEnabledSchedules(projectId: string): Promise<OrchestrationSchedule[]> {
    const result = await this.server.pg.query(
      `SELECT s.*, a.slug as agent_slug
       FROM agent_orchestration_schedules s
       JOIN ai_agents a ON s.agent_id = a.id
       WHERE s.project_id = $1 AND s.is_enabled = true
       ORDER BY s.priority DESC`,
      [projectId]
    );

    return result.rows.map(this.mapScheduleFromDb);
  }

  /**
   * Check if schedule should run now
   * @private
   */
  private shouldRunNow(schedule: OrchestrationSchedule): boolean {
    const now = new Date();

    // Check day of week
    const dayOfWeek = now.getUTCDay();
    if (!schedule.runOnDays.includes(dayOfWeek)) {
      return false;
    }

    // Check time window
    if (schedule.runAfterTime && schedule.runBeforeTime) {
      const currentTime = now.toISOString().slice(11, 19);
      if (currentTime < schedule.runAfterTime || currentTime > schedule.runBeforeTime) {
        return false;
      }
    }

    // Check minimum interval
    if (schedule.lastRunAt) {
      const lastRun = new Date(schedule.lastRunAt);
      const minInterval = schedule.minIntervalMinutes * 60 * 1000;
      if (now.getTime() - lastRun.getTime() < minInterval) {
        return false;
      }
    }

    // Check cooldown after error
    if (schedule.lastFailureAt && schedule.consecutiveFailures > 0) {
      const lastFailure = new Date(schedule.lastFailureAt);
      const cooldown = schedule.cooldownAfterErrorMinutes * 60 * 1000;
      if (now.getTime() - lastFailure.getTime() < cooldown) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update schedule on success
   * @private
   */
  private async updateScheduleSuccess(scheduleId: string): Promise<void> {
    await this.server.pg.query(
      `UPDATE agent_orchestration_schedules
       SET last_run_at = NOW(),
           last_success_at = NOW(),
           consecutive_failures = 0,
           total_runs = total_runs + 1,
           total_successes = total_successes + 1,
           date_updated = NOW()
       WHERE id = $1`,
      [scheduleId]
    );
  }

  /**
   * Update schedule on failure
   * @private
   */
  private async updateScheduleFailure(scheduleId: string): Promise<void> {
    await this.server.pg.query(
      `UPDATE agent_orchestration_schedules
       SET last_run_at = NOW(),
           last_failure_at = NOW(),
           consecutive_failures = consecutive_failures + 1,
           total_runs = total_runs + 1,
           date_updated = NOW()
       WHERE id = $1`,
      [scheduleId]
    );
  }

  /**
   * Get action configs for a project and agent
   * @private
   */
  private async getActionConfigs(
    projectId: string,
    agentSlug: AgentSlug
  ): Promise<Array<{ actionKey: string; isEnabled: boolean; requiresApproval: boolean; riskLevel: RiskLevel }>> {
    const result = await this.server.pg.query(
      `SELECT action_key, is_enabled, requires_approval, risk_level
       FROM autonomous_action_config
       WHERE project_id = $1
       AND (agent_slug = $2 OR agent_slug IS NULL)`,
      [projectId, agentSlug]
    );

    return result.rows.map((row) => ({
      actionKey: row.action_key,
      isEnabled: row.is_enabled,
      requiresApproval: row.requires_approval,
      riskLevel: row.risk_level as RiskLevel,
    }));
  }

  /**
   * Get recent project activity
   * @private
   */
  private async getRecentProjectActivity(projectId: string): Promise<Record<string, unknown>> {
    // Get recent suggestions, tasks, and activity
    const [suggestionsResult, tasksResult] = await Promise.all([
      this.server.pg.query(
        `SELECT COUNT(*) as count, MAX(date_created) as last_created
         FROM ai_suggestions
         WHERE project_id = $1
         AND date_created > NOW() - INTERVAL '24 hours'`,
        [projectId]
      ),
      this.server.pg.query(
        `SELECT COUNT(*) as count, MAX(date_created) as last_created
         FROM todos
         WHERE project_id = $1
         AND date_created > NOW() - INTERVAL '24 hours'`,
        [projectId]
      ),
    ]);

    return {
      suggestionsLast24h: parseInt(suggestionsResult.rows[0]?.count || '0'),
      tasksLast24h: parseInt(tasksResult.rows[0]?.count || '0'),
      lastSuggestionAt: suggestionsResult.rows[0]?.last_created,
      lastTaskAt: tasksResult.rows[0]?.last_created,
    };
  }

  /**
   * Get project context
   * @private
   */
  private async getProjectContext(projectId: string): Promise<Record<string, unknown>> {
    const result = await this.server.pg.query(
      `SELECT name, description, status, github_repo
       FROM projects WHERE id = $1`,
      [projectId]
    );

    if (result.rows.length === 0) {
      return {};
    }

    return {
      name: result.rows[0].name,
      description: result.rows[0].description,
      status: result.rows[0].status,
      hasGithub: !!result.rows[0].github_repo,
    };
  }

  /**
   * Create an agent suggestion for human review
   * @private
   */
  private async createAgentSuggestion(
    projectId: string,
    agentSlug: string,
    actionKey: string,
    context: Record<string, unknown>,
    requiresApproval: boolean
  ): Promise<string | null> {
    try {
      // Get agent ID
      const agentResult = await this.server.pg.query(
        `SELECT id FROM ai_agents WHERE slug = $1`,
        [agentSlug]
      );

      if (agentResult.rows.length === 0) {
        return null;
      }

      const result = await this.server.pg.query(
        `INSERT INTO ai_suggestions (
          project_id, agent_id, suggestion_type, title, content,
          status, context, requires_approval
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          projectId,
          agentResult.rows[0].id,
          actionKey,
          `${agentSlug} suggestion: ${actionKey}`,
          JSON.stringify(context),
          requiresApproval ? 'pending' : 'auto_approved',
          JSON.stringify(context),
          requiresApproval,
        ]
      );

      return result.rows[0].id;
    } catch (error) {
      this.server.log.error({ error }, 'Failed to create agent suggestion');
      return null;
    }
  }

  // ============================================
  // Mapping Functions
  // ============================================

  /**
   * Map database row to OrchestrationJob
   * @private
   */
  private mapJobFromDb(row: Record<string, unknown>): OrchestrationJob {
    return {
      id: row.id as string,
      projectId: row.project_id as string | null,
      jobType: row.job_type as string,
      triggeredBy: row.triggered_by as TriggerSource,
      triggeredByUserId: row.triggered_by_user_id as string | null,
      status: row.status as JobStatus,
      scheduledAt: row.scheduled_at as string | null,
      startedAt: row.started_at as string | null,
      completedAt: row.completed_at as string | null,
      timeoutAt: row.timeout_at as string | null,
      durationMs: row.duration_ms as number | null,
      agentsExecuted: row.agents_executed as number,
      agentsSucceeded: row.agents_succeeded as number,
      agentsFailed: row.agents_failed as number,
      tasksCreated: row.tasks_created as number,
      tasksAssigned: row.tasks_assigned as number,
      errorMessage: row.error_message as string | null,
      errorCode: row.error_code as string | null,
      attemptNumber: row.attempt_number as number,
      maxAttempts: row.max_attempts as number,
      inputParams: (row.input_params as Record<string, unknown>) || {},
      outputSummary: (row.output_summary as Record<string, unknown>) || {},
      dateCreated: row.date_created as string,
    };
  }

  /**
   * Map database row to OrchestrationSchedule
   * @private
   */
  private mapScheduleFromDb(row: Record<string, unknown>): OrchestrationSchedule {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      agentId: row.agent_id as string,
      agentSlug: row.agent_slug as AgentSlug,
      isEnabled: row.is_enabled as boolean,
      scheduleType: row.schedule_type as ScheduleType,
      cronExpression: row.cron_expression as string | null,
      timezone: row.timezone as string,
      runAfterTime: row.run_after_time as string | null,
      runBeforeTime: row.run_before_time as string | null,
      runOnDays: (row.run_on_days as number[]) || [0, 1, 2, 3, 4, 5, 6],
      minIntervalMinutes: row.min_interval_minutes as number,
      maxRunsPerDay: row.max_runs_per_day as number,
      cooldownAfterErrorMinutes: row.cooldown_after_error_minutes as number,
      priority: row.priority as number,
      allowConcurrent: row.allow_concurrent as boolean,
      lastRunAt: row.last_run_at as string | null,
      lastSuccessAt: row.last_success_at as string | null,
      lastFailureAt: row.last_failure_at as string | null,
      consecutiveFailures: row.consecutive_failures as number,
      totalRuns: row.total_runs as number,
      totalSuccesses: row.total_successes as number,
    };
  }

  /**
   * Map database row to GitHubAnalysis
   * @private
   */
  private mapGitHubAnalysisFromDb(row: Record<string, unknown>): GitHubAnalysis {
    return {
      projectId: row.project_id as string,
      periodType: row.period_type as 'hourly' | 'daily' | 'weekly' | 'monthly',
      periodStart: row.period_start as string,
      periodEnd: row.period_end as string,
      commitsCount: row.commits_count as number,
      commitsByAuthor: (row.commits_by_author as Record<string, number>) || {},
      filesChanged: row.files_changed as number,
      linesAdded: row.lines_added as number,
      linesRemoved: row.lines_removed as number,
      prsOpened: row.prs_opened as number,
      prsMerged: row.prs_merged as number,
      prsClosed: row.prs_closed as number,
      avgPrReviewHours: row.avg_pr_review_hours as number | null,
      avgPrMergeHours: row.avg_pr_merge_hours as number | null,
      issuesOpened: row.issues_opened as number,
      issuesClosed: row.issues_closed as number,
      avgIssueResolutionHours: row.avg_issue_resolution_hours as number | null,
      issuesByLabel: (row.issues_by_label as Record<string, number>) || {},
      velocityScore: row.velocity_score as number | null,
      velocityTrend: row.velocity_trend as 'increasing' | 'stable' | 'decreasing' | null,
      velocityChangePercent: row.velocity_change_percent as number | null,
      activeContributors: row.active_contributors as number,
      hotSpots: (row.hot_spots as Array<{ path: string; changes: number; riskScore: number }>) || [],
      analyzedAt: row.analyzed_at as string,
    };
  }
}

// ============================================
// Singleton
// ============================================

let orchestrationServiceInstance: OrchestrationService | null = null;

/**
 * Initialize orchestration service singleton
 * @param server - Fastify instance
 * @returns OrchestrationService instance
 */
export function initOrchestrationService(server: FastifyInstance): OrchestrationService {
  if (!orchestrationServiceInstance) {
    orchestrationServiceInstance = new OrchestrationService(server);
  }
  return orchestrationServiceInstance;
}

/**
 * Get orchestration service singleton
 * @returns OrchestrationService instance
 * @throws Error if not initialized
 */
export function getOrchestrationService(): OrchestrationService {
  if (!orchestrationServiceInstance) {
    throw new Error('Orchestration service not initialized');
  }
  return orchestrationServiceInstance;
}

export default OrchestrationService;
