/**
 * Data Subject Request (DSR) Service
 * 
 * Handles GDPR/CCPA data subject requests:
 * - Data Export (Right to Access)
 * - Data Deletion (Right to Erasure)
 * - Data Portability
 */

import { Pool } from 'pg';

export type DSRType = 'export' | 'delete' | 'portability';
export type DSRStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface DSRRequest {
  id: string;
  organization_id: string;
  user_id: string;
  request_type: DSRType;
  status: DSRStatus;
  requested_at: Date;
  processed_at?: Date;
  expires_at?: Date;
  download_url?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface DataExportResult {
  user_profile: any;
  organizations: any[];
  projects: any[];
  workflows: any[];
  execution_logs: any[];
  api_keys: any[];
  integrations: any[];
  kb_collections: any[];
  audit_logs: any[];
}

export class DSRService {
  private pg: Pool;

  constructor(pg: Pool) {
    this.pg = pg;
  }

  /**
   * Create a new DSR request
   */
  async createRequest(
    userId: string,
    organizationId: string,
    requestType: DSRType
  ): Promise<DSRRequest> {
    // Check for existing pending request
    const existingResult = await this.pg.query(`
      SELECT * FROM dsr_requests
      WHERE user_id = $1 AND request_type = $2 AND status IN ('pending', 'processing')
    `, [userId, requestType]);

    if (existingResult.rows.length > 0) {
      throw new Error(`A ${requestType} request is already in progress`);
    }

    const result = await this.pg.query(`
      INSERT INTO dsr_requests (user_id, organization_id, request_type, status, requested_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING *
    `, [userId, organizationId, requestType]);

    return result.rows[0];
  }

  /**
   * Get DSR request status
   */
  async getRequest(requestId: string): Promise<DSRRequest | null> {
    const result = await this.pg.query(
      'SELECT * FROM dsr_requests WHERE id = $1',
      [requestId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all requests for a user
   */
  async getUserRequests(userId: string): Promise<DSRRequest[]> {
    const result = await this.pg.query(`
      SELECT * FROM dsr_requests
      WHERE user_id = $1
      ORDER BY requested_at DESC
    `, [userId]);
    return result.rows;
  }

  /**
   * Process a data export request
   */
  async processExportRequest(requestId: string): Promise<string> {
    const request = await this.getRequest(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Request is ${request.status}, cannot process`);
    }

    // Update status to processing
    await this.pg.query(
      'UPDATE dsr_requests SET status = $1 WHERE id = $2',
      ['processing', requestId]
    );

    try {
      // Collect all user data
      const exportData = await this.collectUserData(request.user_id, request.organization_id);

      // Generate export file (in production, upload to S3 or similar)
      const exportJson = JSON.stringify(exportData, null, 2);
      const downloadUrl = await this.storeExport(requestId, exportJson);

      // Update request with download URL
      await this.pg.query(`
        UPDATE dsr_requests
        SET status = 'completed', processed_at = NOW(), download_url = $1,
            expires_at = NOW() + INTERVAL '7 days'
        WHERE id = $2
      `, [downloadUrl, requestId]);

      return downloadUrl;
    } catch (error: any) {
      await this.pg.query(`
        UPDATE dsr_requests
        SET status = 'failed', error_message = $1
        WHERE id = $2
      `, [error.message, requestId]);
      throw error;
    }
  }

  /**
   * Process a data deletion request
   */
  async processDeleteRequest(requestId: string): Promise<void> {
    const request = await this.getRequest(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Request is ${request.status}, cannot process`);
    }

    // Update status to processing
    await this.pg.query(
      'UPDATE dsr_requests SET status = $1 WHERE id = $2',
      ['processing', requestId]
    );

    try {
      // Delete user data in order (respecting foreign keys)
      await this.deleteUserData(request.user_id, request.organization_id);

      // Update request status
      await this.pg.query(`
        UPDATE dsr_requests
        SET status = 'completed', processed_at = NOW()
        WHERE id = $1
      `, [requestId]);
    } catch (error: any) {
      await this.pg.query(`
        UPDATE dsr_requests
        SET status = 'failed', error_message = $1
        WHERE id = $2
      `, [error.message, requestId]);
      throw error;
    }
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string, organizationId: string): Promise<DataExportResult> {
    // User profile
    const userResult = await this.pg.query(`
      SELECT id, email, first_name, last_name, avatar_url, created_at, updated_at,
             preferences, onboarding_completed
      FROM directus_users WHERE id = $1
    `, [userId]);

    // Organizations
    const orgsResult = await this.pg.query(`
      SELECT o.* FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = $1
    `, [userId]);

    // Projects
    const projectsResult = await this.pg.query(`
      SELECT * FROM projects WHERE organization_id = $1
    `, [organizationId]);

    // Workflows (Node-RED flows metadata)
    const workflowsResult = await this.pg.query(`
      SELECT * FROM nodered_tenant_config WHERE organization_id = $1
    `, [organizationId]);

    // Execution logs (last 90 days)
    const executionLogsResult = await this.pg.query(`
      SELECT * FROM nodered_execution_logs
      WHERE organization_id = $1
        AND started_at > NOW() - INTERVAL '90 days'
      ORDER BY started_at DESC
      LIMIT 1000
    `, [organizationId]);

    // API Keys (redacted)
    const apiKeysResult = await this.pg.query(`
      SELECT id, name, prefix, scopes, last_used_at, created_at, expires_at
      FROM api_keys WHERE organization_id = $1
    `, [organizationId]);

    // Integrations (credentials redacted)
    const integrationsResult = await this.pg.query(`
      SELECT id, integration_type, credential_name, scopes, is_active, 
             last_used_at, created_at
      FROM integration_credentials WHERE organization_id = $1
    `, [organizationId]);

    // KB Collections
    const kbResult = await this.pg.query(`
      SELECT * FROM kb_collections WHERE organization_id = $1
    `, [organizationId]);

    // Audit logs (last 90 days)
    const auditResult = await this.pg.query(`
      SELECT * FROM audit_logs
      WHERE organization_id = $1
        AND created_at > NOW() - INTERVAL '90 days'
      ORDER BY created_at DESC
      LIMIT 1000
    `, [organizationId]);

    return {
      user_profile: userResult.rows[0] || null,
      organizations: orgsResult.rows,
      projects: projectsResult.rows,
      workflows: workflowsResult.rows,
      execution_logs: executionLogsResult.rows,
      api_keys: apiKeysResult.rows,
      integrations: integrationsResult.rows,
      kb_collections: kbResult.rows,
      audit_logs: auditResult.rows
    };
  }

  /**
   * Delete all user data
   */
  private async deleteUserData(userId: string, organizationId: string): Promise<void> {
    // Start transaction
    const client = await this.pg.connect();

    try {
      await client.query('BEGIN');

      // Delete in reverse dependency order
      
      // Execution logs
      await client.query(
        'DELETE FROM nodered_execution_logs WHERE organization_id = $1',
        [organizationId]
      );

      // Webhook data
      await client.query(
        'DELETE FROM webhook_deliveries WHERE organization_id = $1',
        [organizationId]
      );
      await client.query(
        'DELETE FROM webhook_events WHERE organization_id = $1',
        [organizationId]
      );

      // Integration credentials
      await client.query(
        'DELETE FROM integration_credentials WHERE organization_id = $1',
        [organizationId]
      );

      // KB data
      await client.query(
        'DELETE FROM kb_ingestion_logs WHERE organization_id = $1',
        [organizationId]
      );
      await client.query(
        'DELETE FROM kb_sources WHERE organization_id = $1',
        [organizationId]
      );
      await client.query(
        'DELETE FROM kb_collections WHERE organization_id = $1',
        [organizationId]
      );

      // API keys
      await client.query(
        'DELETE FROM api_keys WHERE organization_id = $1',
        [organizationId]
      );

      // Node-RED config
      await client.query(
        'DELETE FROM nodered_tenant_config WHERE organization_id = $1',
        [organizationId]
      );

      // Projects
      await client.query(
        'DELETE FROM projects WHERE organization_id = $1',
        [organizationId]
      );

      // Audit logs
      await client.query(
        'DELETE FROM audit_logs WHERE organization_id = $1',
        [organizationId]
      );

      // Organization membership
      await client.query(
        'DELETE FROM organization_members WHERE user_id = $1',
        [userId]
      );

      // Anonymize user (don't fully delete to maintain referential integrity)
      await client.query(`
        UPDATE directus_users
        SET email = 'deleted_' || id || '@deleted.synthstack.app',
            first_name = 'Deleted',
            last_name = 'User',
            password = NULL,
            avatar_url = NULL,
            preferences = '{}',
            status = 'suspended'
        WHERE id = $1
      `, [userId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Store export file and return download URL
   */
  private async storeExport(requestId: string, data: string): Promise<string> {
    // In production, upload to S3 or similar
    // For now, store in database
    await this.pg.query(`
      INSERT INTO dsr_exports (request_id, data, created_at)
      VALUES ($1, $2, NOW())
    `, [requestId, data]);

    // Return a download endpoint URL
    return `/api/v1/gdpr/exports/${requestId}/download`;
  }

  /**
   * Get export data for download
   */
  async getExportData(requestId: string): Promise<string | null> {
    const result = await this.pg.query(
      'SELECT data FROM dsr_exports WHERE request_id = $1',
      [requestId]
    );
    return result.rows[0]?.data || null;
  }

  /**
   * Cancel a pending request
   */
  async cancelRequest(requestId: string): Promise<void> {
    await this.pg.query(`
      UPDATE dsr_requests
      SET status = 'cancelled'
      WHERE id = $1 AND status = 'pending'
    `, [requestId]);
  }

  /**
   * Clean up expired exports
   */
  async cleanupExpiredExports(): Promise<number> {
    const result = await this.pg.query(`
      DELETE FROM dsr_exports
      WHERE request_id IN (
        SELECT id FROM dsr_requests WHERE expires_at < NOW()
      )
    `);
    return result.rowCount || 0;
  }
}

// Singleton instance
let instance: DSRService | null = null;

export function initDSRService(pg: Pool): DSRService {
  instance = new DSRService(pg);
  return instance;
}

export function getDSRService(): DSRService {
  if (!instance) {
    throw new Error('DSRService not initialized');
  }
  return instance;
}


