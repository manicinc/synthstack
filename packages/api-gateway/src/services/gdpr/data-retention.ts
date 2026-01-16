/**
 * Data Retention Service
 * 
 * Manages data retention policies and automated cleanup of old data.
 */

import { Pool } from 'pg';

export interface RetentionPolicy {
  id: string;
  name: string;
  table_name: string;
  timestamp_column: string;
  retention_days: number;
  organization_column?: string; // If per-org retention
  soft_delete?: boolean;
  enabled: boolean;
}

export interface RetentionResult {
  policy: string;
  table: string;
  deleted_count: number;
  execution_time_ms: number;
  error?: string;
}

// Default retention policies
const DEFAULT_RETENTION_POLICIES: Omit<RetentionPolicy, 'id'>[] = [
  {
    name: 'Workflow Execution Logs',
    table_name: 'nodered_execution_logs',
    timestamp_column: 'started_at',
    retention_days: 90,
    organization_column: 'organization_id',
    enabled: true
  },
  {
    name: 'Webhook Events',
    table_name: 'webhook_events',
    timestamp_column: 'received_at',
    retention_days: 30,
    organization_column: 'organization_id',
    enabled: true
  },
  {
    name: 'Webhook Deliveries (Delivered)',
    table_name: 'webhook_deliveries',
    timestamp_column: 'delivered_at',
    retention_days: 30,
    organization_column: 'organization_id',
    enabled: true
  },
  {
    name: 'OAuth States',
    table_name: 'oauth_states',
    timestamp_column: 'expires_at',
    retention_days: 1,
    enabled: true
  },
  {
    name: 'Audit Logs',
    table_name: 'audit_logs',
    timestamp_column: 'created_at',
    retention_days: 365,
    organization_column: 'organization_id',
    enabled: true
  },
  {
    name: 'KB Ingestion Logs',
    table_name: 'kb_ingestion_logs',
    timestamp_column: 'created_at',
    retention_days: 180,
    organization_column: 'organization_id',
    enabled: true
  },
  {
    name: 'Session Tokens',
    table_name: 'user_sessions',
    timestamp_column: 'expires_at',
    retention_days: 7,
    enabled: true
  }
];

export class DataRetentionService {
  private pg: Pool;
  private policies: Map<string, RetentionPolicy> = new Map();

  constructor(pg: Pool) {
    this.pg = pg;
  }

  /**
   * Initialize retention policies from database or defaults
   */
  async initialize(): Promise<void> {
    // Try to load from database
    try {
      const result = await this.pg.query(`
        SELECT * FROM data_retention_policies WHERE enabled = true
      `);

      if (result.rows.length > 0) {
        for (const row of result.rows) {
          this.policies.set(row.id, row);
        }
      } else {
        // Use defaults
        for (const policy of DEFAULT_RETENTION_POLICIES) {
          const id = policy.table_name;
          this.policies.set(id, { id, ...policy });
        }
      }
    } catch (error) {
      // Table might not exist, use defaults
      for (const policy of DEFAULT_RETENTION_POLICIES) {
        const id = policy.table_name;
        this.policies.set(id, { id, ...policy });
      }
    }
  }

  /**
   * Execute all retention policies
   */
  async executeAllPolicies(): Promise<RetentionResult[]> {
    const results: RetentionResult[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      const result = await this.executePolicy(policy);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute a single retention policy
   */
  async executePolicy(policy: RetentionPolicy): Promise<RetentionResult> {
    const startTime = Date.now();

    try {
      let query: string;
      
      if (policy.soft_delete) {
        // Soft delete - set deleted_at timestamp
        query = `
          UPDATE ${policy.table_name}
          SET deleted_at = NOW()
          WHERE ${policy.timestamp_column} < NOW() - INTERVAL '${policy.retention_days} days'
            AND deleted_at IS NULL
        `;
      } else {
        // Hard delete
        query = `
          DELETE FROM ${policy.table_name}
          WHERE ${policy.timestamp_column} < NOW() - INTERVAL '${policy.retention_days} days'
        `;
      }

      const result = await this.pg.query(query);

      return {
        policy: policy.name,
        table: policy.table_name,
        deleted_count: result.rowCount || 0,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        policy: policy.name,
        table: policy.table_name,
        deleted_count: 0,
        execution_time_ms: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Execute retention for a specific organization
   */
  async executeForOrganization(organizationId: string): Promise<RetentionResult[]> {
    const results: RetentionResult[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.enabled || !policy.organization_column) continue;

      const startTime = Date.now();

      try {
        let query: string;
        
        if (policy.soft_delete) {
          query = `
            UPDATE ${policy.table_name}
            SET deleted_at = NOW()
            WHERE ${policy.organization_column} = $1
              AND ${policy.timestamp_column} < NOW() - INTERVAL '${policy.retention_days} days'
              AND deleted_at IS NULL
          `;
        } else {
          query = `
            DELETE FROM ${policy.table_name}
            WHERE ${policy.organization_column} = $1
              AND ${policy.timestamp_column} < NOW() - INTERVAL '${policy.retention_days} days'
          `;
        }

        const result = await this.pg.query(query, [organizationId]);

        results.push({
          policy: policy.name,
          table: policy.table_name,
          deleted_count: result.rowCount || 0,
          execution_time_ms: Date.now() - startTime
        });
      } catch (error: any) {
        results.push({
          policy: policy.name,
          table: policy.table_name,
          deleted_count: 0,
          execution_time_ms: Date.now() - startTime,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats(): Promise<Array<{
    policy: string;
    table: string;
    retention_days: number;
    records_subject_to_deletion: number;
    oldest_record: Date | null;
  }>> {
    const stats = [];

    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      try {
        const countResult = await this.pg.query(`
          SELECT COUNT(*) as count
          FROM ${policy.table_name}
          WHERE ${policy.timestamp_column} < NOW() - INTERVAL '${policy.retention_days} days'
        `);

        const oldestResult = await this.pg.query(`
          SELECT MIN(${policy.timestamp_column}) as oldest
          FROM ${policy.table_name}
        `);

        stats.push({
          policy: policy.name,
          table: policy.table_name,
          retention_days: policy.retention_days,
          records_subject_to_deletion: parseInt(countResult.rows[0].count, 10),
          oldest_record: oldestResult.rows[0].oldest
        });
      } catch (error) {
        // Skip tables that don't exist
      }
    }

    return stats;
  }

  /**
   * Update a retention policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<Pick<RetentionPolicy, 'retention_days' | 'enabled'>>
  ): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    // Update in memory
    Object.assign(policy, updates);

    // Update in database
    await this.pg.query(`
      UPDATE data_retention_policies
      SET retention_days = $1, enabled = $2, updated_at = NOW()
      WHERE id = $3
    `, [policy.retention_days, policy.enabled, policyId]);
  }

  /**
   * Get all policies
   */
  getPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }
}

// Singleton instance
let instance: DataRetentionService | null = null;

export function initDataRetentionService(pg: Pool): DataRetentionService {
  instance = new DataRetentionService(pg);
  return instance;
}

export function getDataRetentionService(): DataRetentionService {
  if (!instance) {
    throw new Error('DataRetentionService not initialized');
  }
  return instance;
}


