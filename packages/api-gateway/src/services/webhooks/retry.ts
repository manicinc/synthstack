/**
 * Webhook Retry Service
 * 
 * Handles automatic retry of failed webhook deliveries with
 * exponential backoff and dead letter queue.
 */

import { Pool } from 'pg';

export interface WebhookDelivery {
  id: string;
  organization_id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  target_url: string;
  status: 'pending' | 'delivered' | 'failed' | 'dead_letter';
  attempt_count: number;
  max_attempts: number;
  next_retry_at?: Date;
  last_response_code?: number;
  last_response_body?: string;
  last_error?: string;
  created_at: Date;
  delivered_at?: Date;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,      // 1 second
  maxDelayMs: 3600000,    // 1 hour
  backoffMultiplier: 2
};

export class WebhookRetryService {
  private pg: Pool;
  private config: RetryConfig;
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(pg: Pool, config: Partial<RetryConfig> = {}) {
    this.pg = pg;
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Queue a webhook delivery for retry
   */
  async queueDelivery(delivery: Omit<WebhookDelivery, 'id' | 'status' | 'attempt_count' | 'created_at'>): Promise<string> {
    const result = await this.pg.query(`
      INSERT INTO webhook_deliveries 
        (organization_id, webhook_id, event_type, payload, target_url, max_attempts, status, attempt_count, next_retry_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0, NOW())
      RETURNING id
    `, [
      delivery.organization_id,
      delivery.webhook_id,
      delivery.event_type,
      JSON.stringify(delivery.payload),
      delivery.target_url,
      delivery.max_attempts || this.config.maxAttempts
    ]);

    return result.rows[0].id;
  }

  /**
   * Process pending webhook deliveries
   */
  async processPendingDeliveries(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      // Get pending deliveries ready for retry
      const result = await this.pg.query(`
        SELECT * FROM webhook_deliveries
        WHERE status = 'pending'
          AND next_retry_at <= NOW()
          AND attempt_count < max_attempts
        ORDER BY next_retry_at ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED
      `);

      let processedCount = 0;

      for (const delivery of result.rows) {
        await this.attemptDelivery(delivery);
        processedCount++;
      }

      return processedCount;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Attempt to deliver a webhook
   */
  private async attemptDelivery(delivery: WebhookDelivery): Promise<void> {
    const attemptNumber = delivery.attempt_count + 1;

    try {
      // Make the HTTP request
      const response = await fetch(delivery.target_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Delivery-Id': delivery.id,
          'X-Webhook-Attempt': attemptNumber.toString(),
          'X-Webhook-Event': delivery.event_type,
          'User-Agent': 'SynthStack-Webhooks/1.0'
        },
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const responseBody = await response.text().catch(() => '');

      if (response.ok) {
        // Success!
        await this.markDelivered(delivery.id, response.status, responseBody);
      } else if (response.status >= 500 || response.status === 429) {
        // Server error or rate limit - retry
        await this.scheduleRetry(delivery, attemptNumber, response.status, responseBody);
      } else {
        // Client error (4xx) - don't retry, mark as failed
        await this.markFailed(delivery.id, response.status, responseBody, 'Client error - not retrying');
      }
    } catch (error: any) {
      // Network error - retry
      await this.scheduleRetry(delivery, attemptNumber, undefined, undefined, error.message);
    }
  }

  /**
   * Mark a delivery as successfully delivered
   */
  private async markDelivered(deliveryId: string, statusCode: number, responseBody: string): Promise<void> {
    await this.pg.query(`
      UPDATE webhook_deliveries
      SET status = 'delivered',
          delivered_at = NOW(),
          attempt_count = attempt_count + 1,
          last_response_code = $2,
          last_response_body = $3,
          last_error = NULL
      WHERE id = $1
    `, [deliveryId, statusCode, responseBody.substring(0, 10000)]);
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private async scheduleRetry(
    delivery: WebhookDelivery,
    attemptNumber: number,
    statusCode?: number,
    responseBody?: string,
    errorMessage?: string
  ): Promise<void> {
    const nextAttempt = attemptNumber + 1;

    if (nextAttempt > delivery.max_attempts) {
      // Max attempts reached - move to dead letter
      await this.moveToDeadLetter(delivery.id, statusCode, responseBody, errorMessage);
      return;
    }

    // Calculate exponential backoff delay
    const delayMs = Math.min(
      this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attemptNumber - 1),
      this.config.maxDelayMs
    );

    // Add jitter (±10%)
    const jitter = delayMs * 0.1 * (Math.random() * 2 - 1);
    const finalDelayMs = Math.round(delayMs + jitter);

    await this.pg.query(`
      UPDATE webhook_deliveries
      SET attempt_count = $2,
          next_retry_at = NOW() + INTERVAL '${finalDelayMs} milliseconds',
          last_response_code = $3,
          last_response_body = $4,
          last_error = $5
      WHERE id = $1
    `, [
      delivery.id,
      attemptNumber,
      statusCode,
      responseBody?.substring(0, 10000),
      errorMessage
    ]);
  }

  /**
   * Mark a delivery as permanently failed
   */
  private async markFailed(
    deliveryId: string,
    statusCode?: number,
    responseBody?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.pg.query(`
      UPDATE webhook_deliveries
      SET status = 'failed',
          attempt_count = attempt_count + 1,
          last_response_code = $2,
          last_response_body = $3,
          last_error = $4
      WHERE id = $1
    `, [deliveryId, statusCode, responseBody?.substring(0, 10000), errorMessage]);
  }

  /**
   * Move a delivery to the dead letter queue
   */
  private async moveToDeadLetter(
    deliveryId: string,
    statusCode?: number,
    responseBody?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.pg.query(`
      UPDATE webhook_deliveries
      SET status = 'dead_letter',
          attempt_count = attempt_count + 1,
          last_response_code = $2,
          last_response_body = $3,
          last_error = $4
      WHERE id = $1
    `, [deliveryId, statusCode, responseBody?.substring(0, 10000), errorMessage || 'Max attempts exceeded']);
  }

  /**
   * Manually retry a failed or dead letter delivery
   */
  async manualRetry(deliveryId: string): Promise<void> {
    await this.pg.query(`
      UPDATE webhook_deliveries
      SET status = 'pending',
          next_retry_at = NOW(),
          attempt_count = GREATEST(attempt_count - 1, 0)
      WHERE id = $1 AND status IN ('failed', 'dead_letter')
    `, [deliveryId]);
  }

  /**
   * Get delivery statistics for an organization
   */
  async getDeliveryStats(organizationId: string, since?: Date): Promise<{
    total: number;
    delivered: number;
    pending: number;
    failed: number;
    dead_letter: number;
    avg_attempts: number;
  }> {
    const sinceClause = since ? `AND created_at >= $2` : '';
    const params = since ? [organizationId, since] : [organizationId];

    const result = await this.pg.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'dead_letter') as dead_letter,
        COALESCE(AVG(attempt_count), 0) as avg_attempts
      FROM webhook_deliveries
      WHERE organization_id = $1 ${sinceClause}
    `, params);

    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      delivered: parseInt(row.delivered, 10),
      pending: parseInt(row.pending, 10),
      failed: parseInt(row.failed, 10),
      dead_letter: parseInt(row.dead_letter, 10),
      avg_attempts: parseFloat(row.avg_attempts)
    };
  }

  /**
   * Get recent deliveries for an organization
   */
  async getRecentDeliveries(
    organizationId: string,
    options: { limit?: number; status?: string; webhookId?: string } = {}
  ): Promise<WebhookDelivery[]> {
    const { limit = 50, status, webhookId } = options;
    
    let query = `
      SELECT * FROM webhook_deliveries
      WHERE organization_id = $1
    `;
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (webhookId) {
      query += ` AND webhook_id = $${paramIndex++}`;
      params.push(webhookId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.pg.query(query, params);
    return result.rows;
  }

  /**
   * Clean up old delivered webhooks
   */
  async cleanupOldDeliveries(retentionDays: number = 30): Promise<number> {
    const result = await this.pg.query(`
      DELETE FROM webhook_deliveries
      WHERE status = 'delivered'
        AND delivered_at < NOW() - INTERVAL '${retentionDays} days'
    `);

    return result.rowCount || 0;
  }

  /**
   * Start the background processing loop
   */
  startProcessing(intervalMs: number = 5000): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      try {
        await this.processPendingDeliveries();
      } catch (error) {
        console.error('Error processing webhook deliveries:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop the background processing loop
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }
}

// Export singleton factory
let instance: WebhookRetryService | null = null;

export function initWebhookRetryService(pg: Pool, config?: Partial<RetryConfig>): WebhookRetryService {
  instance = new WebhookRetryService(pg, config);
  return instance;
}

export function getWebhookRetryService(): WebhookRetryService {
  if (!instance) {
    throw new Error('WebhookRetryService not initialized');
  }
  return instance;
}


