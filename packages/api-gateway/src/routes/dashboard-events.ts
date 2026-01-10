/**
 * Dashboard Events Routes (SSE)
 * Real-time updates for dashboard widgets using Server-Sent Events
 * 
 * Security:
 * - JWT token validation (via query param or Bearer header)
 * - Origin restrictions using CORS config
 * - User/organization scoping for event filtering
 * - Connection metrics and limits
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { EventEmitter } from 'events'
import { config } from '../config/index.js'

// Event types for dashboard updates
export type DashboardEventType = 
  | 'workflow_execution_started'
  | 'workflow_execution_completed'
  | 'workflow_execution_failed'
  | 'copilot_message'
  | 'credits_updated'
  | 'sync_completed'
  | 'memory_created'
  | 'stats_updated'

export interface DashboardEvent {
  type: DashboardEventType
  data: Record<string, unknown>
  timestamp: string
  userId?: string
  organizationId?: string
}

// Connection metrics for observability
interface ConnectionMetrics {
  totalConnectionsLifetime: number
  currentConnections: number
  connectionsByOrg: Map<string, number>
  lastConnectionTime: Date | null
  errorCount: number
}

const connectionMetrics: ConnectionMetrics = {
  totalConnectionsLifetime: 0,
  currentConnections: 0,
  connectionsByOrg: new Map(),
  lastConnectionTime: null,
  errorCount: 0,
}

// Maximum connections per organization (prevent abuse)
const MAX_CONNECTIONS_PER_ORG = 50

// Global event emitter for dashboard updates
class DashboardEventEmitter extends EventEmitter {
  private static instance: DashboardEventEmitter

  static getInstance(): DashboardEventEmitter {
    if (!DashboardEventEmitter.instance) {
      DashboardEventEmitter.instance = new DashboardEventEmitter()
      // Increase max listeners for many concurrent connections
      DashboardEventEmitter.instance.setMaxListeners(1000)
    }
    return DashboardEventEmitter.instance
  }

  emit(event: string, data: DashboardEvent): boolean {
    return super.emit(event, data)
  }
}

export const dashboardEvents = DashboardEventEmitter.getInstance()

// Helper to emit dashboard events from anywhere in the app
export function emitDashboardEvent(event: Omit<DashboardEvent, 'timestamp'>): void {
  dashboardEvents.emit('dashboard_update', {
    ...event,
    timestamp: new Date().toISOString(),
  })
}

// Track connected clients
interface ConnectedClient {
  userId: string
  organizationId?: string
  reply: FastifyReply
  connectedAt: Date
  userAgent?: string
}

const connectedClients = new Map<string, ConnectedClient>()

/**
 * Validate JWT token for SSE connection
 * Accepts token from query param (EventSource doesn't support headers easily)
 */
async function validateSSEToken(
  fastify: FastifyInstance,
  token: string
): Promise<{ userId: string; organizationId?: string; isAdmin?: boolean } | null> {
  try {
    // Development mode - decode without verification
    if (config.nodeEnv === 'development') {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      
      // Get user from database to get org
      const result = await fastify.pg.query<{
        organization_id: string | null
        is_admin: boolean
      }>(`
        SELECT om.organization_id, u.is_admin
        FROM app_users u
        LEFT JOIN organization_members om ON u.id = om.user_id
        WHERE u.id = $1
        LIMIT 1
      `, [decoded.sub])
      
      if (result.rows.length === 0) return null
      
      return {
        userId: decoded.sub,
        organizationId: result.rows[0].organization_id || undefined,
        isAdmin: result.rows[0].is_admin,
      }
    }

    // Production mode - verify with secret
    const jwt = await import('jsonwebtoken')
    const secret = config.jwtSecret
    
    if (!secret) {
      fastify.log.error('JWT_SECRET not configured')
      return null
    }

    const decoded = jwt.default.verify(token, secret) as { sub: string; exp: number }
    
    // Get user organization from database
    const result = await fastify.pg.query<{
      organization_id: string | null
      is_admin: boolean
    }>(`
      SELECT om.organization_id, u.is_admin
      FROM app_users u
      LEFT JOIN organization_members om ON u.id = om.user_id
      WHERE u.id = $1
      LIMIT 1
    `, [decoded.sub])
    
    if (result.rows.length === 0) return null
    
    return {
      userId: decoded.sub,
      organizationId: result.rows[0].organization_id || undefined,
      isAdmin: result.rows[0].is_admin,
    }
  } catch (error) {
    fastify.log.warn({ error }, 'SSE token validation failed')
    return null
  }
}

/**
 * Get allowed origins for CORS
 */
function getAllowedOrigin(requestOrigin: string | undefined): string | null {
  if (!requestOrigin) return null
  
  // Check against configured CORS origins
  const allowedOrigins = config.corsOrigins
  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin
  }
  
  // In development, also allow localhost variants
  if (config.isDev && requestOrigin.includes('localhost')) {
    return requestOrigin
  }
  
  return null
}

export default async function dashboardEventsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/dashboard/events/stream
   * SSE endpoint for real-time dashboard updates
   * 
   * Authentication: Token passed via query param (?token=...) or Authorization header
   * EventSource API doesn't support custom headers, so query param is primary method
   */
  fastify.get<{
    Querystring: { token?: string }
  }>('/stream', {
    schema: {
      tags: ['Dashboard'],
      summary: 'Stream dashboard events',
      description: 'Server-Sent Events stream for real-time dashboard updates. Pass JWT token via query param.',
      querystring: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT access token' },
        },
      },
      response: {
        200: {
          type: 'string',
          description: 'SSE stream',
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { token?: string } }>, reply: FastifyReply) => {
    // Get token from query param or Authorization header
    let token: string | undefined = request.query.token
    
    const authHeader = request.headers.authorization
    if (!token && authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    if (!token) {
      connectionMetrics.errorCount++
      return reply.code(401).send({ 
        error: 'Authentication required',
        code: 'MISSING_TOKEN',
      })
    }

    // Validate token
    const auth = await validateSSEToken(fastify, token)
    if (!auth) {
      connectionMetrics.errorCount++
      return reply.code(401).send({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      })
    }

    const { userId, organizationId } = auth

    // Check connection limits per organization
    if (organizationId) {
      const currentOrgConnections = connectionMetrics.connectionsByOrg.get(organizationId) || 0
      if (currentOrgConnections >= MAX_CONNECTIONS_PER_ORG) {
        connectionMetrics.errorCount++
        return reply.code(429).send({
          error: 'Too many connections for this organization',
          code: 'CONNECTION_LIMIT_EXCEEDED',
        })
      }
    }

    // Get origin and validate
    const requestOrigin = request.headers.origin as string | undefined
    const allowedOrigin = getAllowedOrigin(requestOrigin)

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering
    
    // Set CORS with validated origin (not wildcard)
    if (allowedOrigin) {
      reply.raw.setHeader('Access-Control-Allow-Origin', allowedOrigin)
      reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')
    }

    // Generate client ID
    const clientId = `${userId}_${Date.now()}`

    // Update metrics
    connectionMetrics.totalConnectionsLifetime++
    connectionMetrics.currentConnections++
    connectionMetrics.lastConnectionTime = new Date()
    if (organizationId) {
      connectionMetrics.connectionsByOrg.set(
        organizationId,
        (connectionMetrics.connectionsByOrg.get(organizationId) || 0) + 1
      )
    }

    // Store client connection
    connectedClients.set(clientId, {
      userId,
      organizationId,
      reply,
      connectedAt: new Date(),
      userAgent: request.headers['user-agent'],
    })

    fastify.log.info({ clientId, userId, organizationId }, 'Dashboard SSE client connected')

    // Send initial connection event
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ 
      clientId, 
      timestamp: new Date().toISOString(),
      organizationId,
    })}\n\n`)

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        reply.raw.write(`:heartbeat ${Date.now()}\n\n`)
      } catch {
        // Connection closed, cleanup will happen below
      }
    }, 30000)

    // Listen for dashboard events
    const eventHandler = (event: DashboardEvent) => {
      // Filter events for this user/organization with proper scoping rules:
      // 1. Events with no userId/orgId are broadcast to all
      // 2. Events with userId only go to that user
      // 3. Events with organizationId go to all users in that org
      // 4. Events with both go only to that specific user in that org
      const shouldReceive = 
        // Broadcast event (no user or org specified)
        (!event.userId && !event.organizationId) ||
        // User-specific event
        (event.userId && event.userId === userId) ||
        // Organization-wide event (user must be in org)
        (event.organizationId && event.organizationId === organizationId && !event.userId) ||
        // User + org specific event
        (event.userId === userId && event.organizationId === organizationId)

      if (shouldReceive) {
        try {
          reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`)
        } catch {
          // Connection closed
        }
      }
    }

    dashboardEvents.on('dashboard_update', eventHandler)

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeatInterval)
      dashboardEvents.off('dashboard_update', eventHandler)
      connectedClients.delete(clientId)
      
      // Update metrics
      connectionMetrics.currentConnections--
      if (organizationId) {
        const current = connectionMetrics.connectionsByOrg.get(organizationId) || 1
        if (current <= 1) {
          connectionMetrics.connectionsByOrg.delete(organizationId)
        } else {
          connectionMetrics.connectionsByOrg.set(organizationId, current - 1)
        }
      }
      
      fastify.log.info({ clientId, userId, organizationId }, 'Dashboard SSE client disconnected')
    })

    // Keep connection open (don't end the response)
    // The client will close the connection when they're done
  })

  /**
   * GET /api/v1/dashboard/events/clients
   * Admin endpoint to see connected clients and metrics
   */
  fastify.get('/clients', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['Dashboard'],
      summary: 'Get connected SSE clients and metrics',
      description: 'Admin endpoint to see connected SSE clients and connection metrics',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            totalConnections: { type: 'number' },
            metrics: {
              type: 'object',
              properties: {
                totalConnectionsLifetime: { type: 'number' },
                currentConnections: { type: 'number' },
                errorCount: { type: 'number' },
                lastConnectionTime: { type: 'string', nullable: true },
              },
            },
            connectionsByOrg: { type: 'object' },
            clients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  clientId: { type: 'string' },
                  userId: { type: 'string' },
                  organizationId: { type: 'string', nullable: true },
                  connectedAt: { type: 'string' },
                  connectionDuration: { type: 'number' },
                  userAgent: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const clients = Array.from(connectedClients.entries()).map(([id, client]) => ({
      clientId: id,
      userId: client.userId,
      organizationId: client.organizationId,
      connectedAt: client.connectedAt.toISOString(),
      connectionDuration: Date.now() - client.connectedAt.getTime(),
      userAgent: client.userAgent,
    }))

    // Convert connectionsByOrg Map to object for JSON serialization
    const connectionsByOrgObj: Record<string, number> = {}
    connectionMetrics.connectionsByOrg.forEach((count, orgId) => {
      connectionsByOrgObj[orgId] = count
    })

    return reply.send({
      totalConnections: clients.length,
      metrics: {
        totalConnectionsLifetime: connectionMetrics.totalConnectionsLifetime,
        currentConnections: connectionMetrics.currentConnections,
        errorCount: connectionMetrics.errorCount,
        lastConnectionTime: connectionMetrics.lastConnectionTime?.toISOString() || null,
      },
      connectionsByOrg: connectionsByOrgObj,
      clients,
    })
  })

  /**
   * POST /api/v1/dashboard/events/emit
   * Internal endpoint to emit events (for testing/webhooks)
   * Requires admin or internal API key
   */
  fastify.post<{
    Body: {
      type: DashboardEventType
      data: Record<string, unknown>
      userId?: string
      organizationId?: string
    }
  }>('/emit', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['Dashboard'],
      summary: 'Emit dashboard event',
      description: 'Admin endpoint to emit dashboard events for testing or webhooks',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['type', 'data'],
        properties: {
          type: { 
            type: 'string',
            enum: [
              'workflow_execution_started',
              'workflow_execution_completed',
              'workflow_execution_failed',
              'copilot_message',
              'credits_updated',
              'sync_completed',
              'memory_created',
              'stats_updated',
            ],
          },
          data: { type: 'object' },
          userId: { type: 'string' },
          organizationId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            activeConnections: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { type, data, userId, organizationId } = request.body

    emitDashboardEvent({
      type,
      data,
      userId,
      organizationId,
    })

    return reply.send({ 
      success: true, 
      message: 'Event emitted',
      activeConnections: connectionMetrics.currentConnections,
    })
  })

  /**
   * GET /api/v1/dashboard/events/metrics
   * Get SSE connection metrics (admin)
   */
  fastify.get('/metrics', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['Dashboard'],
      summary: 'Get SSE connection metrics',
      description: 'Admin endpoint to get SSE connection statistics',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            totalConnectionsLifetime: { type: 'number' },
            currentConnections: { type: 'number' },
            errorCount: { type: 'number' },
            lastConnectionTime: { type: 'string', nullable: true },
            connectionsByOrg: { type: 'object' },
            maxConnectionsPerOrg: { type: 'number' },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const connectionsByOrgObj: Record<string, number> = {}
    connectionMetrics.connectionsByOrg.forEach((count, orgId) => {
      connectionsByOrgObj[orgId] = count
    })

    return reply.send({
      totalConnectionsLifetime: connectionMetrics.totalConnectionsLifetime,
      currentConnections: connectionMetrics.currentConnections,
      errorCount: connectionMetrics.errorCount,
      lastConnectionTime: connectionMetrics.lastConnectionTime?.toISOString() || null,
      connectionsByOrg: connectionsByOrgObj,
      maxConnectionsPerOrg: MAX_CONNECTIONS_PER_ORG,
    })
  })
}

// Export helper to get connection stats
export function getConnectionStats() {
  return {
    totalConnections: connectedClients.size,
    connections: Array.from(connectedClients.values()).map(c => ({
      userId: c.userId,
      connectedAt: c.connectedAt,
    })),
  }
}

// Export broadcast helper for use in other services
export function broadcastToUser(userId: string, eventType: DashboardEventType, data: Record<string, unknown>) {
  emitDashboardEvent({
    type: eventType,
    data,
    userId,
  })
}

export function broadcastToOrganization(organizationId: string, eventType: DashboardEventType, data: Record<string, unknown>) {
  emitDashboardEvent({
    type: eventType,
    data,
    organizationId,
  })
}

