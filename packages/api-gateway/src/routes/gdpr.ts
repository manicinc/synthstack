/**
 * GDPR Compliance Routes
 * 
 * Handles Data Subject Requests (DSR) and data retention management
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { AuthenticatedRequest } from '../middleware/auth';
import { initDSRService, getDSRService } from '../services/gdpr/dsr.js';
import { initDataRetentionService, getDataRetentionService } from '../services/gdpr/data-retention.js';
import { redactPII, detectPIITypes } from '../services/gdpr/pii-redaction.js';
import { getPool } from '../utils/database.js';

export default async function gdprRoutes(fastify: FastifyInstance) {
  const pg = fastify.pg;
  const pool = getPool(fastify);

  // Initialize services
  const dsrService = initDSRService(pool);
  const retentionService = initDataRetentionService(pool);
  await retentionService.initialize();

  // ============================================
  // Data Subject Requests (DSR)
  // ============================================

  /**
   * Request data export (Right to Access)
   */
  fastify.post('/dsr/export', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Request a copy of your personal data',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                request_id: { type: 'string' },
                status: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as AuthenticatedRequest).user!;

    try {
      const dsrRequest = await dsrService.createRequest(
        user.id,
        user.organizationId ?? '',
        'export'
      );

      // Queue processing (in production, use a job queue)
      setImmediate(async () => {
        try {
          await dsrService.processExportRequest(dsrRequest.id);
        } catch (error) {
          fastify.log.error({ error, requestId: dsrRequest.id }, 'Failed to process export request');
        }
      });

      return {
        success: true,
        data: {
          request_id: dsrRequest.id,
          status: 'pending',
          message: 'Your data export request has been submitted. You will receive an email when it is ready.'
        }
      };
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'DSR_ERROR', message: error.message }
      });
    }
  });

  /**
   * Request data deletion (Right to Erasure)
   */
  fastify.post('/dsr/delete', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Request deletion of your personal data',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          confirm: { type: 'boolean' }
        },
        required: ['confirm']
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as AuthenticatedRequest).user!;
    const { confirm } = request.body as { confirm: boolean };

    if (!confirm) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CONFIRMATION_REQUIRED', message: 'Please confirm the deletion request' }
      });
    }

    try {
      const dsrRequest = await dsrService.createRequest(
        user.id,
        user.organizationId ?? '',
        'delete'
      );

      return {
        success: true,
        data: {
          request_id: dsrRequest.id,
          status: 'pending',
          message: 'Your data deletion request has been submitted. This process may take up to 30 days.'
        }
      };
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'DSR_ERROR', message: error.message }
      });
    }
  });

  /**
   * Get DSR request status
   */
  fastify.get('/dsr/requests', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get your data subject requests',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as AuthenticatedRequest).user!;
    const requests = await dsrService.getUserRequests(user.id);

    return {
      success: true,
      data: { requests }
    };
  });

  /**
   * Get specific DSR request
   */
  fastify.get('/dsr/requests/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get a specific data subject request',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as AuthenticatedRequest).user!;
    const { id } = request.params as { id: string };

    const dsrRequest = await dsrService.getRequest(id);

    if (!dsrRequest || dsrRequest.user_id !== user.id) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Request not found' }
      });
    }

    return {
      success: true,
      data: { request: dsrRequest }
    };
  });

  /**
   * Download export data
   */
  fastify.get('/exports/:id/download', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Download your data export',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as AuthenticatedRequest).user!;
    const { id } = request.params as { id: string };

    const dsrRequest = await dsrService.getRequest(id);

    if (!dsrRequest || dsrRequest.user_id !== user.id) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Export not found' }
      });
    }

    if (dsrRequest.status !== 'completed') {
      return reply.status(400).send({
        success: false,
        error: { code: 'NOT_READY', message: 'Export is not ready yet' }
      });
    }

    if (dsrRequest.expires_at && new Date(dsrRequest.expires_at) < new Date()) {
      return reply.status(410).send({
        success: false,
        error: { code: 'EXPIRED', message: 'Export has expired' }
      });
    }

    const data = await dsrService.getExportData(id);
    if (!data) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Export data not found' }
      });
    }

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="synthstack-data-export-${id}.json"`);
    return data;
  });

  /**
   * Cancel a pending DSR request
   */
  fastify.delete('/dsr/requests/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Cancel a pending data subject request',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as AuthenticatedRequest).user!;
    const { id } = request.params as { id: string };

    const dsrRequest = await dsrService.getRequest(id);

    if (!dsrRequest || dsrRequest.user_id !== user.id) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Request not found' }
      });
    }

    await dsrService.cancelRequest(id);

    return { success: true };
  });

  // ============================================
  // Consent Management
  // ============================================

  /**
   * Get user consents
   */
  fastify.get('/consent', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get your consent preferences',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as AuthenticatedRequest).user!;

    const result = await pg.query(`
      SELECT consent_type, granted, granted_at, revoked_at
      FROM consent_records
      WHERE user_id = $1
    `, [user.id]);

    return {
      success: true,
      data: { consents: result.rows }
    };
  });

  /**
   * Update consent
   */
  fastify.put('/consent/:type', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Update a consent preference',
      tags: ['GDPR'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          type: { type: 'string' }
        },
        required: ['type']
      },
      body: {
        type: 'object',
        properties: {
          granted: { type: 'boolean' }
        },
        required: ['granted']
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const user = (request as AuthenticatedRequest).user!;
    const { type } = request.params as { type: string };
    const { granted } = request.body as { granted: boolean };

    if (granted) {
      await pg.query(`
        INSERT INTO consent_records (user_id, consent_type, granted, ip_address, user_agent, granted_at)
        VALUES ($1, $2, true, $3, $4, NOW())
        ON CONFLICT (user_id, consent_type) DO UPDATE SET
          granted = true,
          ip_address = $3,
          user_agent = $4,
          granted_at = NOW(),
          revoked_at = NULL
      `, [user.id, type, request.ip, request.headers['user-agent']]);
    } else {
      await pg.query(`
        UPDATE consent_records
        SET granted = false, revoked_at = NOW()
        WHERE user_id = $1 AND consent_type = $2
      `, [user.id, type]);
    }

    return { success: true };
  });

  // ============================================
  // Data Retention (Admin only)
  // ============================================

  /**
   * Get retention policies (admin)
   */
  fastify.get('/admin/retention/policies', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      description: 'Get data retention policies',
      tags: ['GDPR Admin'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request: FastifyRequest, reply) => {
    const policies = retentionService.getPolicies();

    return {
      success: true,
      data: { policies }
    };
  });

  /**
   * Get retention statistics (admin)
   */
  fastify.get('/admin/retention/stats', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      description: 'Get data retention statistics',
      tags: ['GDPR Admin'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request: FastifyRequest, reply) => {
    const stats = await retentionService.getRetentionStats();

    return {
      success: true,
      data: { stats }
    };
  });

  /**
   * Execute retention policies (admin)
   */
  fastify.post('/admin/retention/execute', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      description: 'Execute data retention policies',
      tags: ['GDPR Admin'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request: FastifyRequest, reply) => {
    const results = await retentionService.executeAllPolicies();

    return {
      success: true,
      data: { results }
    };
  });

  /**
   * Update retention policy (admin)
   */
  fastify.put('/admin/retention/policies/:id', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      description: 'Update a retention policy',
      tags: ['GDPR Admin'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          retention_days: { type: 'number' },
          enabled: { type: 'boolean' }
        }
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as { retention_days?: number; enabled?: boolean };

    await retentionService.updatePolicy(id, updates);

    return { success: true };
  });

  /**
   * Get DSR statistics (admin)
   */
  fastify.get('/admin/dsr/stats', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      description: 'Get DSR statistics',
      tags: ['GDPR Admin'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request: FastifyRequest, reply) => {
    const result = await pg.query('SELECT * FROM get_dsr_statistics()');

    return {
      success: true,
      data: result.rows[0]
    };
  });

  /**
   * Process pending deletion requests (admin)
   */
  fastify.post('/admin/dsr/process-deletions', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      description: 'Process pending deletion requests',
      tags: ['GDPR Admin'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request: FastifyRequest, reply) => {
    // Get pending deletion requests
    const result = await pg.query(`
      SELECT * FROM dsr_requests
      WHERE request_type = 'delete' AND status = 'pending'
      ORDER BY requested_at ASC
      LIMIT 10
    `);

    const processed = [];
    for (const req of result.rows) {
      try {
        await dsrService.processDeleteRequest(req.id);
        processed.push({ id: req.id, status: 'completed' });
      } catch (error: any) {
        processed.push({ id: req.id, status: 'failed', error: error.message });
      }
    }

    return {
      success: true,
      data: { processed }
    };
  });

  // ============================================
  // PII Detection (Admin/Debug)
  // ============================================

  /**
   * Detect PII in text (admin)
   */
  fastify.post('/admin/pii/detect', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      description: 'Detect PII in text',
      tags: ['GDPR Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          text: { type: 'string' }
        },
        required: ['text']
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const { text } = request.body as { text: string };
    const detected = detectPIITypes(text);

    return {
      success: true,
      data: { detected }
    };
  });

  /**
   * Redact PII from text (admin)
   */
  fastify.post('/admin/pii/redact', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      description: 'Redact PII from text',
      tags: ['GDPR Admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          categories: { type: 'array', items: { type: 'string' } }
        },
        required: ['text']
      }
    }
  }, async (request: FastifyRequest, reply) => {
    const { text, categories } = request.body as { text: string; categories?: string[] };
    const result = redactPII(text, { categories: categories as any });

    return {
      success: true,
      data: result
    };
  });
}


