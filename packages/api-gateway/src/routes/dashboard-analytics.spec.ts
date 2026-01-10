/**
 * Dashboard Analytics Routes - Test Suite
 * Tests for dashboard analytics endpoints
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import dashboardAnalyticsRoutes from './dashboard-analytics.js'

// SKIPPED: Requires Node-RED service initialization which happens at app startup.
// These tests need the full application context to be initialized.
// TODO: Add proper service mocking or move to integration test suite.
describe.skip('Dashboard Analytics Routes', () => {
  let fastify: FastifyInstance
  let mockPgQuery: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    fastify = Fastify()

    // Mock postgres
    mockPgQuery = vi.fn()
    ;(fastify as any).decorate('pg', {
      query: mockPgQuery,
    })

    // Mock authentication
    ;(fastify as any).decorate('authenticate', async (request: any) => {
      request.user = {
        id: 'test-user-id',
        organizationId: 'test-org-id',
      }
    })

    ;(fastify as any).decorate('requireAdmin', async () => {})

    // Mock rate limiting
    ;(fastify as any).decorate('rateLimitGeneral', async () => {})

    await fastify.register(dashboardAnalyticsRoutes, { prefix: '/api/v1/dashboard/analytics' })
    await fastify.ready()
  })

  afterAll(async () => {
    await fastify.close()
  })

  describe('GET /overview', () => {
    it('should return 401 when not authenticated', async () => {
      // Override authenticate for this test
      const app = Fastify()
      ;(app as any).decorate('pg', { query: mockPgQuery })
      ;(app as any).decorate('authenticate', async (request: any) => {
        request.user = null
      })
      ;(app as any).decorate('requireAdmin', async () => {})
      ;(app as any).decorate('rateLimitGeneral', async () => {})
      
      await app.register(dashboardAnalyticsRoutes, { prefix: '/api/v1/dashboard/analytics' })
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics/overview',
      })

      expect(response.statusCode).toBe(401)
      await app.close()
    })

    it('should return dashboard overview when authenticated', async () => {
      // Mock workflow stats query
      mockPgQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // flow count
        .mockResolvedValueOnce({
          rows: [{
            today: '10',
            this_week: '50',
            this_month: '200',
            success_count: '180',
            total_count: '200',
            avg_duration: '1500.5',
          }],
        }) // execution stats
        .mockResolvedValueOnce({ rows: [{ count: '40' }] }) // last week count
        .mockResolvedValueOnce({
          rows: [{
            today_tokens: '5000',
            week_tokens: '25000',
            today_convos: '5',
            week_convos: '20',
          }],
        }) // AI usage stats
        .mockResolvedValueOnce({ rows: [] }) // trend
        .mockResolvedValueOnce({ rows: [] }) // top agents
        .mockResolvedValueOnce({
          rows: [{ credits_remaining: 1000, lifetime_credits_used: 500 }],
        }) // user credits
        .mockResolvedValueOnce({ rows: [{ used: '100' }] }) // this month usage
        .mockResolvedValueOnce({ rows: [{ used: '80' }] }) // last month usage
        .mockResolvedValueOnce({ rows: [] }) // workflow executions
        .mockResolvedValueOnce({ rows: [] }) // AI conversations

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics/overview',
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(data).toHaveProperty('workflows')
      expect(data).toHaveProperty('aiUsage')
      expect(data).toHaveProperty('credits')
      expect(data).toHaveProperty('recentActivity')
    })
  })

  describe('GET /timeline', () => {
    it('should return execution timeline', async () => {
      mockPgQuery.mockResolvedValueOnce({
        rows: [
          { date: '2026-01-01', executions: '10', successful: '8', failed: '2' },
          { date: '2026-01-02', executions: '15', successful: '14', failed: '1' },
        ],
      })

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics/timeline?days=7',
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
      expect(data[0]).toHaveProperty('date')
      expect(data[0]).toHaveProperty('executions')
      expect(data[0]).toHaveProperty('successful')
      expect(data[0]).toHaveProperty('failed')
    })
  })

  describe('GET /top-workflows', () => {
    it('should return top workflows', async () => {
      mockPgQuery.mockResolvedValueOnce({
        rows: [
          {
            flow_id: 'flow-1',
            flow_name: 'My Workflow',
            executions: '50',
            success_count: '45',
            avg_duration: '2000',
            last_run: '2026-01-07T10:00:00Z',
          },
        ],
      })

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics/top-workflows?limit=5',
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('name')
      expect(data[0]).toHaveProperty('executions')
      expect(data[0]).toHaveProperty('successRate')
    })
  })

  describe('GET /activity', () => {
    it('should return recent activity', async () => {
      mockPgQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'exec-1',
            flow_name: 'Test Flow',
            status: 'completed',
            started_at: '2026-01-07T10:00:00Z',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'ai-1',
            thread_id: 'thread-1',
            agent_slug: 'general',
            created_at: '2026-01-07T10:30:00Z',
          }],
        })

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics/activity?limit=10',
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('GET /ai-usage', () => {
    it('should return AI usage statistics', async () => {
      mockPgQuery
        .mockResolvedValueOnce({
          rows: [{
            today_tokens: '5000',
            week_tokens: '25000',
            today_convos: '5',
            week_convos: '20',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ date: '2026-01-07', tokens: '5000' }] })
        .mockResolvedValueOnce({
          rows: [{
            agent_slug: 'general',
            invocations: '10',
            tokens: '5000',
          }],
        })

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics/ai-usage',
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(data).toHaveProperty('tokensToday')
      expect(data).toHaveProperty('tokensThisWeek')
      expect(data).toHaveProperty('topAgents')
    })
  })

  describe('GET /export', () => {
    it('should export workflow analytics as JSON', async () => {
      mockPgQuery
        .mockResolvedValueOnce({ rows: [] }) // timeline
        .mockResolvedValueOnce({ rows: [] }) // top workflows
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // flow count
        .mockResolvedValueOnce({
          rows: [{
            today: '10', this_week: '50', this_month: '200',
            success_count: '180', total_count: '200', avg_duration: '1500',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '40' }] })

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics/export?dataType=workflow-analytics&format=json&range=week',
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('application/json')
      expect(response.headers['content-disposition']).toContain('attachment')
    })

    it('should export as CSV', async () => {
      mockPgQuery
        .mockResolvedValueOnce({
          rows: [{ date: '2026-01-07', executions: '10', successful: '9', failed: '1' }],
        })
        .mockResolvedValueOnce({
          rows: [{
            flow_id: 'f1', flow_name: 'Test', executions: '10',
            success_count: '9', avg_duration: '1000', last_run: '2026-01-07',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [{
            today: '10', this_week: '50', this_month: '200',
            success_count: '180', total_count: '200', avg_duration: '1500',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '40' }] })

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics/export?dataType=workflow-analytics&format=csv&range=week',
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('text/csv')
    })

    it('should return 501 for PDF export', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics/export?dataType=workflow-analytics&format=pdf&range=week',
      })

      expect(response.statusCode).toBe(501)
    })
  })

  describe('GET /metrics (admin)', () => {
    it('should return analytics metrics', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics/metrics',
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(data).toHaveProperty('requestCount')
      expect(data).toHaveProperty('errorCount')
      expect(data).toHaveProperty('avgResponseTimeMs')
    })
  })
})

