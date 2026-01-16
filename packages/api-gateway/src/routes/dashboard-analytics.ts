/**
 * Dashboard Analytics Routes
 * Comprehensive analytics endpoints for dashboard widgets
 * 
 * Observability features:
 * - Structured logging with timing information
 * - Request/response metrics
 * - Error tracking with context
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
// COMMUNITY: Node-RED and LangGraph services removed - workflows not available in Community Edition

// Metrics tracking for dashboard analytics
interface AnalyticsMetrics {
  requestCount: number
  errorCount: number
  avgResponseTimeMs: number
  responseTimeSamples: number[]
  lastRequestTime: Date | null
  cacheHits: number
  cacheMisses: number
}

const analyticsMetrics: AnalyticsMetrics = {
  requestCount: 0,
  errorCount: 0,
  avgResponseTimeMs: 0,
  responseTimeSamples: [],
  lastRequestTime: null,
  cacheHits: 0,
  cacheMisses: 0,
}

// Update average response time with sliding window
function updateResponseTime(durationMs: number) {
  analyticsMetrics.responseTimeSamples.push(durationMs)
  // Keep last 100 samples
  if (analyticsMetrics.responseTimeSamples.length > 100) {
    analyticsMetrics.responseTimeSamples.shift()
  }
  analyticsMetrics.avgResponseTimeMs = 
    analyticsMetrics.responseTimeSamples.reduce((a, b) => a + b, 0) / 
    analyticsMetrics.responseTimeSamples.length
}

// Export metrics for monitoring endpoint
export function getAnalyticsMetrics() {
  return { ...analyticsMetrics }
}

// Types
interface WorkflowStats {
  total: number
  active: number
  changePercent: number
  executions: {
    today: number
    thisWeek: number
    thisMonth: number
    successRate: number
    avgDuration: number
  }
}

interface AIUsageStats {
  tokensToday: number
  tokensThisWeek: number
  conversationsToday: number
  conversationsThisWeek: number
  changePercent: number
  trend: number[]
  topAgents: Array<{
    slug: string
    name: string
    invocations: number
    tokens: number
  }>
}

interface CreditsStats {
  balance: number
  usedThisMonth: number
  projectedUsage: number
  projectedChange: number
}

interface DashboardOverview {
  workflows: WorkflowStats
  aiUsage: AIUsageStats
  credits: CreditsStats
  recentActivity: ActivityItem[]
}

interface TimelinePoint {
  date: string
  executions: number
  successful: number
  failed: number
}

interface TopWorkflow {
  id: string
  name: string
  executions: number
  successRate: number
  avgDuration: number
  lastRun: string
  status: 'active' | 'paused' | 'error'
}

interface ActivityItem {
  id: string
  type: 'workflow_execution' | 'copilot_message' | 'approval' | 'credit_usage' | 'sync'
  title: string
  description?: string
  timestamp: string
  status?: 'success' | 'error' | 'warning' | 'info' | 'pending'
  link?: string
  metadata?: Record<string, unknown>
}

export default async function dashboardAnalyticsRoutes(fastify: FastifyInstance) {
  // COMMUNITY: Node-RED service removed - workflows not available in Community Edition

  // Add rate limiting hook for all routes in this plugin
  // Dashboard analytics uses the 'general' rate limit tier
  fastify.addHook('preHandler', async (request, reply) => {
    if (fastify.rateLimitGeneral) {
      await fastify.rateLimitGeneral(request, reply)
    }
  })

  // Add timing and logging hook for all analytics routes
  fastify.addHook('onRequest', async (request) => {
    (request as any).analyticsStartTime = Date.now()
    analyticsMetrics.requestCount++
    analyticsMetrics.lastRequestTime = new Date()
  })

  fastify.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).analyticsStartTime
    if (startTime) {
      const durationMs = Date.now() - startTime
      updateResponseTime(durationMs)
      
      fastify.log.info({
        route: request.routerPath,
        method: request.method,
        statusCode: reply.statusCode,
        durationMs,
        userId: (request as any).user?.id,
        query: request.query,
      }, 'Dashboard analytics request completed')
    }
  })

  fastify.addHook('onError', async (request, _reply, error) => {
    analyticsMetrics.errorCount++
    fastify.log.error({
      route: request.routerPath,
      method: request.method,
      userId: (request as any).user?.id,
      error: error.message,
      stack: error.stack,
    }, 'Dashboard analytics request failed')
  })

  /**
   * GET /api/v1/dashboard/analytics/overview
   * Returns aggregated metrics for dashboard widgets
   */
  fastify.get('/overview', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Get dashboard overview',
      description: 'Returns aggregated metrics for all dashboard widgets',
      response: {
        200: {
          type: 'object',
          properties: {
            workflows: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                active: { type: 'number' },
                changePercent: { type: 'number' },
                executions: {
                  type: 'object',
                  properties: {
                    today: { type: 'number' },
                    thisWeek: { type: 'number' },
                    thisMonth: { type: 'number' },
                    successRate: { type: 'number' },
                    avgDuration: { type: 'number' },
                  },
                },
              },
            },
            aiUsage: { type: 'object' },
            credits: { type: 'object' },
            recentActivity: { type: 'array' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id
    const orgId = (request as any).user?.organizationId

    if (!userId || !orgId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      // Get workflow stats
      const workflowStats = await getWorkflowStats(fastify, orgId)
      
      // Get AI usage stats
      const aiUsageStats = await getAIUsageStats(fastify, userId)
      
      // Get credits stats
      const creditsStats = await getCreditsStats(fastify, userId)
      
      // Get recent activity
      const recentActivity = await getRecentActivity(fastify, orgId, userId, 5)

      const overview: DashboardOverview = {
        workflows: workflowStats,
        aiUsage: aiUsageStats,
        credits: creditsStats,
        recentActivity,
      }

      return reply.send(overview)
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch dashboard overview')
      return reply.code(500).send({ error: 'Failed to fetch dashboard data' })
    }
  })

  /**
   * GET /api/v1/dashboard/analytics/timeline
   * Returns execution timeline for charts
   */
  fastify.get('/timeline', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Get execution timeline',
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', default: 7 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { days?: number } }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id
    const orgId = (request as any).user?.organizationId
    const { days = 7 } = request.query

    if (!userId || !orgId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const timeline = await getExecutionTimeline(fastify, orgId, days)
      return reply.send(timeline)
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch execution timeline')
      return reply.code(500).send({ error: 'Failed to fetch timeline' })
    }
  })

  /**
   * GET /api/v1/dashboard/analytics/top-workflows
   * Returns top performing workflows
   */
  fastify.get('/top-workflows', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Get top workflows',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 5 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id
    const orgId = (request as any).user?.organizationId
    const { limit = 5 } = request.query

    if (!userId || !orgId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const topWorkflows = await getTopWorkflows(fastify, orgId, limit)
      return reply.send(topWorkflows)
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch top workflows')
      return reply.code(500).send({ error: 'Failed to fetch top workflows' })
    }
  })

  /**
   * GET /api/v1/dashboard/analytics/activity
   * Returns recent activity log
   */
  fastify.get('/activity', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Get recent activity',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id
    const orgId = (request as any).user?.organizationId
    const { limit = 10 } = request.query

    if (!userId || !orgId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const activity = await getRecentActivity(fastify, orgId, userId, limit)
      return reply.send(activity)
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch recent activity')
      return reply.code(500).send({ error: 'Failed to fetch activity' })
    }
  })

  /**
   * GET /api/v1/dashboard/analytics/ai-usage
   * Returns AI/Copilot usage statistics
   */
  fastify.get('/ai-usage', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Get AI usage statistics',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const aiUsage = await getAIUsageStats(fastify, userId)
      return reply.send(aiUsage)
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch AI usage stats')
      return reply.code(500).send({ error: 'Failed to fetch AI usage' })
    }
  })

  /**
   * GET /api/v1/dashboard/analytics/by-agent
   * Returns execution statistics by agent
   */
  fastify.get('/by-agent', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Get executions by agent',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const stats = await getExecutionsByAgent(fastify, userId)
      return reply.send(stats)
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch executions by agent')
      return reply.code(500).send({ error: 'Failed to fetch agent stats' })
    }
  })

  /**
   * GET /api/v1/dashboard/analytics/conversations
   * Returns conversation metrics
   */
  fastify.get('/conversations', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Get conversation metrics',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const metrics = await getConversationMetrics(fastify, userId)
      return reply.send(metrics)
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch conversation metrics')
      return reply.code(500).send({ error: 'Failed to fetch metrics' })
    }
  })

  /**
   * GET /api/v1/dashboard/analytics/memory-growth
   * Returns memory growth trend
   */
  fastify.get('/memory-growth', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Get memory growth trend',
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', default: 30 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { days?: number } }>, reply: FastifyReply) => {
    const userId = (request as any).user?.id
    const { days = 30 } = request.query

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      const trend = await getMemoryGrowthTrend(fastify, userId, days)
      return reply.send(trend)
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch memory growth')
      return reply.code(500).send({ error: 'Failed to fetch growth trend' })
    }
  })

  /**
   * GET /api/v1/dashboard/analytics/export
   * Export dashboard data in various formats
   */
  fastify.get<{
    Querystring: {
      dataType: 'workflow-analytics' | 'copilot-usage' | 'dashboard-overview'
      format: 'csv' | 'json' | 'pdf'
      range: 'day' | 'week' | 'month'
    }
  }>('/export', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Export dashboard data',
      description: 'Export analytics data in CSV, JSON, or PDF format',
      querystring: {
        type: 'object',
        required: ['dataType', 'format', 'range'],
        properties: {
          dataType: { 
            type: 'string', 
            enum: ['workflow-analytics', 'copilot-usage', 'dashboard-overview'],
          },
          format: { 
            type: 'string', 
            enum: ['csv', 'json', 'pdf'],
          },
          range: { 
            type: 'string', 
            enum: ['day', 'week', 'month'],
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request as any).user?.id
    const orgId = (request as any).user?.organizationId
    const { dataType, format, range } = request.query

    if (!userId || !orgId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const days = range === 'day' ? 1 : range === 'week' ? 7 : 30

    try {
      let data: unknown

      switch (dataType) {
        case 'workflow-analytics':
          data = {
            timeline: await getExecutionTimeline(fastify, orgId, days),
            topWorkflows: await getTopWorkflows(fastify, orgId, 20),
            stats: await getWorkflowStats(fastify, orgId),
            exportedAt: new Date().toISOString(),
            range,
          }
          break

        case 'copilot-usage':
          data = {
            usage: await getAIUsageStats(fastify, userId),
            byAgent: await getExecutionsByAgent(fastify, userId),
            conversations: await getConversationMetrics(fastify, userId),
            memoryGrowth: await getMemoryGrowthTrend(fastify, userId, days),
            exportedAt: new Date().toISOString(),
            range,
          }
          break

        case 'dashboard-overview':
        default:
          data = {
            workflows: await getWorkflowStats(fastify, orgId),
            aiUsage: await getAIUsageStats(fastify, userId),
            credits: await getCreditsStats(fastify, userId),
            recentActivity: await getRecentActivity(fastify, orgId, userId, 50),
            exportedAt: new Date().toISOString(),
            range,
          }
          break
      }

      if (format === 'json') {
        reply.header('Content-Type', 'application/json')
        reply.header('Content-Disposition', `attachment; filename="${dataType}-${range}.json"`)
        return reply.send(data)
      }

      if (format === 'csv') {
        const csv = convertToCSV(data, dataType)
        reply.header('Content-Type', 'text/csv')
        reply.header('Content-Disposition', `attachment; filename="${dataType}-${range}.csv"`)
        return reply.send(csv)
      }

      // PDF not implemented yet
      return reply.code(501).send({ error: 'PDF export not yet implemented' })

    } catch (error) {
      fastify.log.error(error, 'Failed to export dashboard data')
      return reply.code(500).send({ error: 'Export failed' })
    }
  })

  /**
   * GET /api/v1/dashboard/analytics/metrics
   * Returns internal metrics about the analytics routes (admin only)
   */
  fastify.get('/metrics', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['Dashboard'],
      summary: 'Get analytics route metrics',
      description: 'Admin endpoint to get metrics about analytics route performance',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            requestCount: { type: 'number' },
            errorCount: { type: 'number' },
            avgResponseTimeMs: { type: 'number' },
            lastRequestTime: { type: 'string', nullable: true },
            cacheHits: { type: 'number' },
            cacheMisses: { type: 'number' },
            sampleCount: { type: 'number' },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      requestCount: analyticsMetrics.requestCount,
      errorCount: analyticsMetrics.errorCount,
      avgResponseTimeMs: Math.round(analyticsMetrics.avgResponseTimeMs * 100) / 100,
      lastRequestTime: analyticsMetrics.lastRequestTime?.toISOString() || null,
      cacheHits: analyticsMetrics.cacheHits,
      cacheMisses: analyticsMetrics.cacheMisses,
      sampleCount: analyticsMetrics.responseTimeSamples.length,
    })
  })
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: unknown, dataType: string): string {
  const lines: string[] = []
  
  if (dataType === 'workflow-analytics') {
    const d = data as { timeline: TimelinePoint[]; topWorkflows: TopWorkflow[] }
    
    // Timeline section
    lines.push('# Execution Timeline')
    lines.push('Date,Executions,Successful,Failed')
    for (const point of d.timeline) {
      lines.push(`${point.date},${point.executions},${point.successful},${point.failed}`)
    }
    
    lines.push('')
    lines.push('# Top Workflows')
    lines.push('Name,Executions,Success Rate,Avg Duration (ms),Last Run')
    for (const wf of d.topWorkflows) {
      lines.push(`"${wf.name}",${wf.executions},${wf.successRate.toFixed(1)}%,${wf.avgDuration.toFixed(0)},${wf.lastRun}`)
    }
  } else if (dataType === 'copilot-usage') {
    const d = data as { usage: AIUsageStats; byAgent: Array<{ agentSlug: string; agentName: string; invocations: number; tokens: number }> }
    
    lines.push('# AI Usage Summary')
    lines.push('Metric,Value')
    lines.push(`Tokens Today,${d.usage.tokensToday}`)
    lines.push(`Tokens This Week,${d.usage.tokensThisWeek}`)
    lines.push(`Conversations Today,${d.usage.conversationsToday}`)
    lines.push(`Conversations This Week,${d.usage.conversationsThisWeek}`)
    
    lines.push('')
    lines.push('# Usage by Agent')
    lines.push('Agent,Invocations,Tokens')
    for (const agent of d.byAgent) {
      lines.push(`"${agent.agentName}",${agent.invocations},${agent.tokens}`)
    }
  } else {
    // Dashboard overview - generic JSON to CSV
    lines.push('# Dashboard Overview Export')
    lines.push(`Exported At,${(data as { exportedAt: string }).exportedAt}`)
    lines.push('')
    lines.push('# Raw Data (JSON)')
    lines.push(JSON.stringify(data, null, 2))
  }
  
  return lines.join('\n')
}

// Helper functions

async function getWorkflowStats(fastify: FastifyInstance, orgId: string): Promise<WorkflowStats> {
  // COMMUNITY: Workflows not available in Community Edition - return empty stats
  return {
    total: 0,
    active: 0,
    changePercent: 0,
    executions: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      successRate: 0,
      avgDuration: 0,
    },
  }
}

async function getAIUsageStats(fastify: FastifyInstance, userId: string): Promise<AIUsageStats> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)

  // Get token usage from audit logs
  const usageResult = await fastify.pg.query<{
    today_tokens: string
    week_tokens: string
    today_convos: string
    week_convos: string
  }>(
    `SELECT 
      COALESCE(SUM(CASE WHEN created_at >= $2 THEN (output->>'totalTokens')::int ELSE 0 END), 0) as today_tokens,
      COALESCE(SUM(CASE WHEN created_at >= $3 THEN (output->>'totalTokens')::int ELSE 0 END), 0) as week_tokens,
      COUNT(DISTINCT CASE WHEN created_at >= $2 THEN thread_id END) as today_convos,
      COUNT(DISTINCT CASE WHEN created_at >= $3 THEN thread_id END) as week_convos
     FROM ai_audit_logs 
     WHERE user_id = $1`,
    [userId, todayStart.toISOString(), weekStart.toISOString()]
  )

  const stats = usageResult.rows[0]
  
  // Get daily trend for last 7 days
  const trendResult = await fastify.pg.query<{ date: string; tokens: string }>(
    `SELECT 
      DATE(created_at) as date,
      COALESCE(SUM((output->>'totalTokens')::int), 0) as tokens
     FROM ai_audit_logs 
     WHERE user_id = $1 AND created_at >= $2
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [userId, weekStart.toISOString()]
  )

  const trend = trendResult.rows.map(r => parseInt(r.tokens, 10) || 0)

  // Get top agents
  const agentsResult = await fastify.pg.query<{
    agent_slug: string
    invocations: string
    tokens: string
  }>(
    `SELECT 
      agent_slug,
      COUNT(*) as invocations,
      COALESCE(SUM((output->>'totalTokens')::int), 0) as tokens
     FROM ai_audit_logs 
     WHERE user_id = $1 AND created_at >= $2
     GROUP BY agent_slug
     ORDER BY invocations DESC
     LIMIT 5`,
    [userId, weekStart.toISOString()]
  )

  const agentNames: Record<string, string> = {
    general: 'General Assistant',
    researcher: 'Researcher',
    developer: 'Developer',
    marketer: 'Marketer',
    seo_writer: 'SEO Writer',
    designer: 'Designer',
  }

  const topAgents = agentsResult.rows.map(r => ({
    slug: r.agent_slug,
    name: agentNames[r.agent_slug] || r.agent_slug,
    invocations: parseInt(r.invocations, 10),
    tokens: parseInt(r.tokens, 10),
  }))

  // Calculate change percent (today vs yesterday)
  const yesterdayTokens = trend.length >= 2 ? trend[trend.length - 2] : 0
  const todayTokens = parseInt(stats.today_tokens, 10) || 0
  const changePercent = yesterdayTokens > 0 
    ? Math.round(((todayTokens - yesterdayTokens) / yesterdayTokens) * 100)
    : 0

  return {
    tokensToday: todayTokens,
    tokensThisWeek: parseInt(stats.week_tokens, 10) || 0,
    conversationsToday: parseInt(stats.today_convos, 10) || 0,
    conversationsThisWeek: parseInt(stats.week_convos, 10) || 0,
    changePercent,
    trend,
    topAgents,
  }
}

async function getCreditsStats(fastify: FastifyInstance, userId: string): Promise<CreditsStats> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const result = await fastify.pg.query<{
    credits_remaining: number
    lifetime_credits_used: number
  }>(
    `SELECT credits_remaining, lifetime_credits_used FROM app_users WHERE id = $1`,
    [userId]
  )

  const user = result.rows[0]

  // Get this month's usage
  const usageResult = await fastify.pg.query<{ used: string }>(
    `SELECT COALESCE(SUM(ABS(amount)), 0) as used 
     FROM credit_transactions 
     WHERE user_id = $1 AND created_at >= $2 AND amount < 0`,
    [userId, monthStart.toISOString()]
  )

  const usedThisMonth = parseInt(usageResult.rows[0]?.used || '0', 10)
  
  // Project usage based on current pace
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
  const daysPassed = new Date().getDate()
  const projectedUsage = daysPassed > 0 
    ? Math.round((usedThisMonth / daysPassed) * daysInMonth)
    : 0

  // Get last month's usage for comparison
  const lastMonthStart = new Date(monthStart)
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
  
  const lastMonthResult = await fastify.pg.query<{ used: string }>(
    `SELECT COALESCE(SUM(ABS(amount)), 0) as used 
     FROM credit_transactions 
     WHERE user_id = $1 AND created_at >= $2 AND created_at < $3 AND amount < 0`,
    [userId, lastMonthStart.toISOString(), monthStart.toISOString()]
  )
  
  const lastMonthUsed = parseInt(lastMonthResult.rows[0]?.used || '0', 10)
  const projectedChange = lastMonthUsed > 0 
    ? Math.round(((projectedUsage - lastMonthUsed) / lastMonthUsed) * 100)
    : 0

  return {
    balance: user?.credits_remaining || 0,
    usedThisMonth,
    projectedUsage,
    projectedChange,
  }
}

async function getRecentActivity(
  fastify: FastifyInstance,
  orgId: string,
  userId: string,
  limit: number
): Promise<ActivityItem[]> {
  // COMMUNITY: Workflows and AI copilot not available - return empty activity list
  return []
}

async function getExecutionTimeline(
  fastify: FastifyInstance,
  orgId: string,
  days: number
): Promise<TimelinePoint[]> {
  // COMMUNITY: Workflows not available - return empty timeline
  return []
}

async function getTopWorkflows(
  fastify: FastifyInstance,
  orgId: string,
  limit: number
): Promise<TopWorkflow[]> {
  // COMMUNITY: Workflows not available - return empty list
  return []
}

async function getExecutionsByAgent(
  fastify: FastifyInstance,
  userId: string
): Promise<Array<{ agentSlug: string; agentName: string; invocations: number; tokens: number; avgResponseTime: number }>> {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)

  const result = await fastify.pg.query<{
    agent_slug: string
    invocations: string
    tokens: string
    avg_latency: string
  }>(
    `SELECT 
      agent_slug,
      COUNT(*) as invocations,
      COALESCE(SUM((output->>'totalTokens')::int), 0) as tokens,
      AVG(latency_ms) as avg_latency
     FROM ai_audit_logs 
     WHERE user_id = $1 AND created_at >= $2
     GROUP BY agent_slug
     ORDER BY invocations DESC`,
    [userId, weekStart.toISOString()]
  )

  const agentNames: Record<string, string> = {
    general: 'General Assistant',
    researcher: 'Researcher',
    developer: 'Developer',
    marketer: 'Marketer',
    seo_writer: 'SEO Writer',
    designer: 'Designer',
  }

  return result.rows.map(r => ({
    agentSlug: r.agent_slug,
    agentName: agentNames[r.agent_slug] || r.agent_slug,
    invocations: parseInt(r.invocations, 10),
    tokens: parseInt(r.tokens, 10),
    avgResponseTime: parseFloat(r.avg_latency) || 0,
  }))
}

async function getConversationMetrics(
  fastify: FastifyInstance,
  userId: string
): Promise<{ totalConversations: number; avgMessagesPerConversation: number; avgResponseTime: number; satisfactionRate: number }> {
  const result = await fastify.pg.query<{
    total_threads: string
    total_messages: string
    avg_latency: string
  }>(
    `SELECT 
      COUNT(DISTINCT thread_id) as total_threads,
      COUNT(*) as total_messages,
      AVG(latency_ms) as avg_latency
     FROM ai_audit_logs 
     WHERE user_id = $1`,
    [userId]
  )

  const stats = result.rows[0]
  const totalThreads = parseInt(stats.total_threads, 10) || 0
  const totalMessages = parseInt(stats.total_messages, 10) || 0

  return {
    totalConversations: totalThreads,
    avgMessagesPerConversation: totalThreads > 0 ? totalMessages / totalThreads : 0,
    avgResponseTime: parseFloat(stats.avg_latency) || 0,
    satisfactionRate: 95, // Placeholder - would need feedback system
  }
}

async function getMemoryGrowthTrend(
  fastify: FastifyInstance,
  userId: string,
  days: number
): Promise<Array<{ date: string; totalMemories: number; newMemories: number }>> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const result = await fastify.pg.query<{
    date: string
    new_memories: string
    cumulative: string
  }>(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as new_memories,
      SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative
     FROM langgraph_memories 
     WHERE user_id = $1 AND created_at >= $2
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [userId, startDate.toISOString()]
  )

  return result.rows.map(r => ({
    date: r.date,
    totalMemories: parseInt(r.cumulative, 10),
    newMemories: parseInt(r.new_memories, 10),
  }))
}

