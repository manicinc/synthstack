/**
 * LLM Cost Tracking Service
 * 
 * Provides centralized logging and querying of LLM API usage
 * and costs for the admin dashboard.
 */

import type { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface LLMUsageLogInput {
  organizationId?: string;
  userId?: string;
  projectId?: string;
  provider: string;
  model: string;
  tier?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostCents?: number;
  requestType?: string;
  agentSlug?: string;
  endpoint?: string;
  latencyMs?: number;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface GlobalStats {
  totalRequests: number;
  totalTokens: number;
  totalCostCents: number;
  avgLatencyMs: number;
  successRate: number;
  byProvider: Record<string, ProviderStats>;
  mtdCostCents: number;
  todayCostCents: number;
}

export interface ProviderStats {
  requests: number;
  tokens: number;
  costCents: number;
  avgLatencyMs: number;
}

export interface OrgUsageSummary {
  organizationId: string;
  organizationName: string;
  totalRequests: number;
  totalTokens: number;
  totalCostCents: number;
  uniqueUsers: number;
  modelsUsed: number;
  lastRequestAt: string | null;
  mtdRequests: number;
  mtdCostCents: number;
  todayRequests: number;
  todayCostCents: number;
}

export interface ModelUsageStats {
  provider: string;
  model: string;
  tier: string | null;
  totalRequests: number;
  totalTokens: number;
  totalCostCents: number;
  avgCostCents: number;
  avgLatencyMs: number;
  costPer1kTokens: number;
}

export interface CostTrendPoint {
  date: string;
  provider: string;
  requests: number;
  tokens: number;
  costCents: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ============================================
// LLM Cost Service Class
// ============================================

export class LLMCostService {
  private server: FastifyInstance | null = null;

  /**
   * Set the Fastify server instance
   */
  setServer(server: FastifyInstance): void {
    this.server = server;
  }

  /**
   * Log an LLM usage event
   */
  async logUsage(input: LLMUsageLogInput): Promise<string | null> {
    if (!this.server) {
      logger.warn('LLM Cost Service: Server not initialized, skipping log');
      return null;
    }

    try {
      const result = await this.server.pg.query(
        `
        INSERT INTO llm_usage_log (
          organization_id, user_id, project_id,
          provider, model, tier,
          prompt_tokens, completion_tokens, total_tokens,
          estimated_cost_cents, request_type, agent_slug,
          endpoint, latency_ms, success,
          error_code, error_message, session_id,
          request_id, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
        RETURNING id
        `,
        [
          input.organizationId || null,
          input.userId || null,
          input.projectId || null,
          input.provider,
          input.model,
          input.tier || null,
          input.promptTokens || 0,
          input.completionTokens || 0,
          input.totalTokens || 0,
          input.estimatedCostCents || 0,
          input.requestType || null,
          input.agentSlug || null,
          input.endpoint || null,
          input.latencyMs || null,
          input.success ?? true,
          input.errorCode || null,
          input.errorMessage || null,
          input.sessionId || null,
          input.requestId || null,
          JSON.stringify(input.metadata || {}),
        ]
      );

      return result.rows[0]?.id || null;
    } catch (error) {
      logger.error('Failed to log LLM usage', { error, input });
      return null;
    }
  }

  /**
   * Get global LLM usage statistics
   */
  async getGlobalStats(range?: DateRange): Promise<GlobalStats> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const startDate = range?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = range?.endDate || new Date();

    // Get overall stats
    const overallResult = await this.server.pg.query(
      `
      SELECT
        COUNT(*) as total_requests,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(estimated_cost_cents), 0) as total_cost_cents,
        COALESCE(AVG(latency_ms), 0)::INTEGER as avg_latency_ms,
        COUNT(*) FILTER (WHERE success = true)::FLOAT / NULLIF(COUNT(*), 0) * 100 as success_rate
      FROM llm_usage_log
      WHERE created_at >= $1 AND created_at <= $2
      `,
      [startDate, endDate]
    );

    // Get stats by provider
    const providerResult = await this.server.pg.query(
      `
      SELECT
        provider,
        COUNT(*) as requests,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COALESCE(SUM(estimated_cost_cents), 0) as cost_cents,
        COALESCE(AVG(latency_ms), 0)::INTEGER as avg_latency_ms
      FROM llm_usage_log
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY provider
      ORDER BY cost_cents DESC
      `,
      [startDate, endDate]
    );

    // Get MTD cost
    const mtdResult = await this.server.pg.query(
      `
      SELECT COALESCE(SUM(estimated_cost_cents), 0) as mtd_cost_cents
      FROM llm_usage_log
      WHERE created_at >= DATE_TRUNC('month', NOW())
      `
    );

    // Get today's cost
    const todayResult = await this.server.pg.query(
      `
      SELECT COALESCE(SUM(estimated_cost_cents), 0) as today_cost_cents
      FROM llm_usage_log
      WHERE created_at >= DATE_TRUNC('day', NOW())
      `
    );

    const overall = overallResult.rows[0];
    const byProvider: Record<string, ProviderStats> = {};

    for (const row of providerResult.rows) {
      byProvider[row.provider] = {
        requests: parseInt(row.requests, 10),
        tokens: parseInt(row.tokens, 10),
        costCents: parseInt(row.cost_cents, 10),
        avgLatencyMs: parseInt(row.avg_latency_ms, 10),
      };
    }

    return {
      totalRequests: parseInt(overall.total_requests, 10),
      totalTokens: parseInt(overall.total_tokens, 10),
      totalCostCents: parseInt(overall.total_cost_cents, 10),
      avgLatencyMs: parseInt(overall.avg_latency_ms, 10),
      successRate: parseFloat(overall.success_rate) || 100,
      byProvider,
      mtdCostCents: parseInt(mtdResult.rows[0].mtd_cost_cents, 10),
      todayCostCents: parseInt(todayResult.rows[0].today_cost_cents, 10),
    };
  }

  /**
   * Get usage summary by organization
   */
  async getOrgUsageSummary(
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'cost' | 'requests' | 'name';
      sortOrder?: 'asc' | 'desc';
      minCostCents?: number;
    } = {}
  ): Promise<OrgUsageSummary[]> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const { 
      limit = 50, 
      offset = 0, 
      sortBy = 'cost', 
      sortOrder = 'desc',
      minCostCents = 0 
    } = options;

    const sortColumn = {
      cost: 'total_cost_cents',
      requests: 'total_requests',
      name: 'organization_name',
    }[sortBy];

    const result = await this.server.pg.query(
      `
      SELECT * FROM llm_org_usage_summary
      WHERE total_cost_cents >= $1
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $2 OFFSET $3
      `,
      [minCostCents, limit, offset]
    );

    return result.rows.map((row) => ({
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      totalRequests: parseInt(row.total_requests, 10),
      totalTokens: parseInt(row.total_tokens, 10),
      totalCostCents: parseInt(row.total_cost_cents, 10),
      uniqueUsers: parseInt(row.unique_users, 10),
      modelsUsed: parseInt(row.models_used, 10),
      lastRequestAt: row.last_request_at,
      mtdRequests: parseInt(row.mtd_requests, 10),
      mtdCostCents: parseInt(row.mtd_cost_cents, 10),
      todayRequests: parseInt(row.today_requests, 10),
      todayCostCents: parseInt(row.today_cost_cents, 10),
    }));
  }

  /**
   * Get model usage breakdown
   */
  async getModelUsage(range?: DateRange): Promise<ModelUsageStats[]> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const startDate = range?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = range?.endDate || new Date();

    const result = await this.server.pg.query(
      `
      SELECT
        provider,
        model,
        tier,
        COUNT(*) AS total_requests,
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        COALESCE(SUM(estimated_cost_cents), 0) AS total_cost_cents,
        COALESCE(AVG(estimated_cost_cents), 0)::INTEGER AS avg_cost_cents,
        COALESCE(AVG(latency_ms), 0)::INTEGER AS avg_latency_ms,
        CASE 
          WHEN SUM(total_tokens) > 0 
          THEN (SUM(estimated_cost_cents)::FLOAT / SUM(total_tokens) * 1000)
          ELSE 0 
        END AS cost_per_1k_tokens
      FROM llm_usage_log
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY provider, model, tier
      ORDER BY total_cost_cents DESC
      `,
      [startDate, endDate]
    );

    return result.rows.map((row) => ({
      provider: row.provider,
      model: row.model,
      tier: row.tier,
      totalRequests: parseInt(row.total_requests, 10),
      totalTokens: parseInt(row.total_tokens, 10),
      totalCostCents: parseInt(row.total_cost_cents, 10),
      avgCostCents: parseInt(row.avg_cost_cents, 10),
      avgLatencyMs: parseInt(row.avg_latency_ms, 10),
      costPer1kTokens: parseFloat(row.cost_per_1k_tokens),
    }));
  }

  /**
   * Get cost trends over time
   */
  async getCostTrends(
    options: {
      days?: number;
      groupBy?: 'day' | 'hour';
      provider?: string;
      organizationId?: string;
    } = {}
  ): Promise<CostTrendPoint[]> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const { days = 30, groupBy = 'day', provider, organizationId } = options;

    const truncFunc = groupBy === 'hour' ? 'hour' : 'day';
    const interval = `${days} days`;

    let query = `
      SELECT
        DATE_TRUNC('${truncFunc}', created_at) AS date,
        provider,
        COUNT(*) AS requests,
        COALESCE(SUM(total_tokens), 0) AS tokens,
        COALESCE(SUM(estimated_cost_cents), 0) AS cost_cents
      FROM llm_usage_log
      WHERE created_at >= NOW() - INTERVAL '${interval}'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (provider) {
      query += ` AND provider = $${paramIndex++}`;
      params.push(provider);
    }

    if (organizationId) {
      query += ` AND organization_id = $${paramIndex++}`;
      params.push(organizationId);
    }

    query += `
      GROUP BY DATE_TRUNC('${truncFunc}', created_at), provider
      ORDER BY date ASC, provider
    `;

    const result = await this.server.pg.query(query, params);

    return result.rows.map((row) => ({
      date: row.date.toISOString(),
      provider: row.provider,
      requests: parseInt(row.requests, 10),
      tokens: parseInt(row.tokens, 10),
      costCents: parseInt(row.cost_cents, 10),
    }));
  }

  /**
   * Get detailed usage for a specific organization
   */
  async getOrgDetailedUsage(
    organizationId: string,
    range?: DateRange
  ): Promise<{
    summary: OrgUsageSummary | null;
    byModel: ModelUsageStats[];
    trends: CostTrendPoint[];
    recentRequests: any[];
  }> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const startDate = range?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = range?.endDate || new Date();

    // Get summary
    const summaryResult = await this.server.pg.query(
      `SELECT * FROM llm_org_usage_summary WHERE organization_id = $1`,
      [organizationId]
    );

    const summary = summaryResult.rows[0]
      ? {
          organizationId: summaryResult.rows[0].organization_id,
          organizationName: summaryResult.rows[0].organization_name,
          totalRequests: parseInt(summaryResult.rows[0].total_requests, 10),
          totalTokens: parseInt(summaryResult.rows[0].total_tokens, 10),
          totalCostCents: parseInt(summaryResult.rows[0].total_cost_cents, 10),
          uniqueUsers: parseInt(summaryResult.rows[0].unique_users, 10),
          modelsUsed: parseInt(summaryResult.rows[0].models_used, 10),
          lastRequestAt: summaryResult.rows[0].last_request_at,
          mtdRequests: parseInt(summaryResult.rows[0].mtd_requests, 10),
          mtdCostCents: parseInt(summaryResult.rows[0].mtd_cost_cents, 10),
          todayRequests: parseInt(summaryResult.rows[0].today_requests, 10),
          todayCostCents: parseInt(summaryResult.rows[0].today_cost_cents, 10),
        }
      : null;

    // Get model breakdown
    const modelResult = await this.server.pg.query(
      `
      SELECT
        provider, model, tier,
        COUNT(*) AS total_requests,
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        COALESCE(SUM(estimated_cost_cents), 0) AS total_cost_cents,
        COALESCE(AVG(estimated_cost_cents), 0)::INTEGER AS avg_cost_cents,
        COALESCE(AVG(latency_ms), 0)::INTEGER AS avg_latency_ms,
        CASE 
          WHEN SUM(total_tokens) > 0 
          THEN (SUM(estimated_cost_cents)::FLOAT / SUM(total_tokens) * 1000)
          ELSE 0 
        END AS cost_per_1k_tokens
      FROM llm_usage_log
      WHERE organization_id = $1
        AND created_at >= $2 AND created_at <= $3
      GROUP BY provider, model, tier
      ORDER BY total_cost_cents DESC
      `,
      [organizationId, startDate, endDate]
    );

    const byModel = modelResult.rows.map((row) => ({
      provider: row.provider,
      model: row.model,
      tier: row.tier,
      totalRequests: parseInt(row.total_requests, 10),
      totalTokens: parseInt(row.total_tokens, 10),
      totalCostCents: parseInt(row.total_cost_cents, 10),
      avgCostCents: parseInt(row.avg_cost_cents, 10),
      avgLatencyMs: parseInt(row.avg_latency_ms, 10),
      costPer1kTokens: parseFloat(row.cost_per_1k_tokens),
    }));

    // Get trends
    const trends = await this.getCostTrends({
      days: 30,
      organizationId,
    });

    // Get recent requests
    const recentResult = await this.server.pg.query(
      `
      SELECT
        id, provider, model, tier, request_type,
        total_tokens, estimated_cost_cents, latency_ms,
        success, created_at
      FROM llm_usage_log
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [organizationId]
    );

    return {
      summary,
      byModel,
      trends,
      recentRequests: recentResult.rows,
    };
  }

  /**
   * Export usage data to CSV format
   */
  async exportUsageCSV(
    options: {
      startDate?: Date;
      endDate?: Date;
      organizationId?: string;
    } = {}
  ): Promise<string> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate || new Date();

    let query = `
      SELECT
        l.created_at,
        o.name AS organization_name,
        u.email AS user_email,
        l.provider,
        l.model,
        l.tier,
        l.request_type,
        l.prompt_tokens,
        l.completion_tokens,
        l.total_tokens,
        l.estimated_cost_cents,
        l.latency_ms,
        l.success
      FROM llm_usage_log l
      LEFT JOIN organizations o ON l.organization_id = o.id
      LEFT JOIN app_users u ON l.user_id = u.id
      WHERE l.created_at >= $1 AND l.created_at <= $2
    `;

    const params: any[] = [startDate, endDate];

    if (options.organizationId) {
      query += ` AND l.organization_id = $3`;
      params.push(options.organizationId);
    }

    query += ` ORDER BY l.created_at DESC`;

    const result = await this.server.pg.query(query, params);

    // Generate CSV
    const headers = [
      'Date',
      'Organization',
      'User',
      'Provider',
      'Model',
      'Tier',
      'Request Type',
      'Prompt Tokens',
      'Completion Tokens',
      'Total Tokens',
      'Cost (cents)',
      'Latency (ms)',
      'Success',
    ];

    const rows = result.rows.map((row) =>
      [
        row.created_at?.toISOString() || '',
        row.organization_name || '',
        row.user_email || '',
        row.provider || '',
        row.model || '',
        row.tier || '',
        row.request_type || '',
        row.prompt_tokens || 0,
        row.completion_tokens || 0,
        row.total_tokens || 0,
        row.estimated_cost_cents || 0,
        row.latency_ms || '',
        row.success ? 'Yes' : 'No',
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Compute aggregates for a given period
   */
  async computeAggregates(periodType: 'hourly' | 'daily'): Promise<number> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const funcName = periodType === 'hourly' 
      ? 'compute_llm_hourly_aggregates' 
      : 'compute_llm_daily_aggregates';

    const result = await this.server.pg.query(
      `SELECT ${funcName}() as rows_inserted`
    );

    return parseInt(result.rows[0].rows_inserted, 10);
  }
}

// ============================================
// Singleton Instance
// ============================================

let serviceInstance: LLMCostService | null = null;

export function getLLMCostService(): LLMCostService {
  if (!serviceInstance) {
    serviceInstance = new LLMCostService();
  }
  return serviceInstance;
}

export const llmCostService = getLLMCostService();


