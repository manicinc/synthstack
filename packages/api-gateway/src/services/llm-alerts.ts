/**
 * LLM Budget Alerts Service
 * 
 * Manages budget alerts for LLM costs, including
 * threshold checking and notifications.
 */

import type { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface BudgetAlert {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  alertType: 'daily_limit' | 'weekly_limit' | 'monthly_limit' | 'spike' | 'threshold';
  thresholdCents: number;
  thresholdRequests: number | null;
  spikePercent: number | null;
  notificationEmails: string[];
  notificationSlackWebhook: string | null;
  notificationFrequency: 'once' | 'hourly' | 'daily';
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastValueCents: number | null;
  triggerCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertInput {
  organizationId?: string;
  name: string;
  description?: string;
  alertType: BudgetAlert['alertType'];
  thresholdCents: number;
  thresholdRequests?: number;
  spikePercent?: number;
  notificationEmails?: string[];
  notificationSlackWebhook?: string;
  notificationFrequency?: BudgetAlert['notificationFrequency'];
  createdBy?: string;
}

export interface UpdateAlertInput {
  name?: string;
  description?: string;
  thresholdCents?: number;
  thresholdRequests?: number;
  spikePercent?: number;
  notificationEmails?: string[];
  notificationSlackWebhook?: string;
  notificationFrequency?: BudgetAlert['notificationFrequency'];
  isActive?: boolean;
}

export interface AlertHistory {
  id: string;
  alertId: string;
  triggeredAt: string;
  triggerValueCents: number;
  thresholdCents: number;
  periodStart: string | null;
  periodEnd: string | null;
  notificationSent: boolean;
  notificationError: string | null;
  metadata: Record<string, unknown>;
}

export interface AlertCheckResult {
  triggered: boolean;
  currentValue: number;
  threshold: number;
  message: string;
}

// ============================================
// LLM Alerts Service Class
// ============================================

export class LLMAlertService {
  private server: FastifyInstance | null = null;

  /**
   * Set the Fastify server instance
   */
  setServer(server: FastifyInstance): void {
    this.server = server;
  }

  /**
   * Create a new budget alert
   */
  async createAlert(input: CreateAlertInput): Promise<BudgetAlert> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const result = await this.server.pg.query(
      `
      INSERT INTO llm_budget_alerts (
        organization_id, name, description, alert_type,
        threshold_cents, threshold_requests, spike_percent,
        notification_emails, notification_slack_webhook,
        notification_frequency, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
      `,
      [
        input.organizationId || null,
        input.name,
        input.description || null,
        input.alertType,
        input.thresholdCents,
        input.thresholdRequests || null,
        input.spikePercent || null,
        input.notificationEmails || [],
        input.notificationSlackWebhook || null,
        input.notificationFrequency || 'once',
        input.createdBy || null,
      ]
    );

    return this.mapAlertRow(result.rows[0]);
  }

  /**
   * Update an existing budget alert
   */
  async updateAlert(alertId: string, input: UpdateAlertInput): Promise<BudgetAlert | null> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.thresholdCents !== undefined) {
      updates.push(`threshold_cents = $${paramIndex++}`);
      values.push(input.thresholdCents);
    }
    if (input.thresholdRequests !== undefined) {
      updates.push(`threshold_requests = $${paramIndex++}`);
      values.push(input.thresholdRequests);
    }
    if (input.spikePercent !== undefined) {
      updates.push(`spike_percent = $${paramIndex++}`);
      values.push(input.spikePercent);
    }
    if (input.notificationEmails !== undefined) {
      updates.push(`notification_emails = $${paramIndex++}`);
      values.push(input.notificationEmails);
    }
    if (input.notificationSlackWebhook !== undefined) {
      updates.push(`notification_slack_webhook = $${paramIndex++}`);
      values.push(input.notificationSlackWebhook);
    }
    if (input.notificationFrequency !== undefined) {
      updates.push(`notification_frequency = $${paramIndex++}`);
      values.push(input.notificationFrequency);
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }

    if (updates.length === 0) {
      return this.getAlertById(alertId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(alertId);

    const result = await this.server.pg.query(
      `
      UPDATE llm_budget_alerts
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
      `,
      values
    );

    return result.rows[0] ? this.mapAlertRow(result.rows[0]) : null;
  }

  /**
   * Delete a budget alert
   */
  async deleteAlert(alertId: string): Promise<boolean> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const result = await this.server.pg.query(
      `DELETE FROM llm_budget_alerts WHERE id = $1`,
      [alertId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get alert by ID
   */
  async getAlertById(alertId: string): Promise<BudgetAlert | null> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const result = await this.server.pg.query(
      `SELECT * FROM llm_budget_alerts WHERE id = $1`,
      [alertId]
    );

    return result.rows[0] ? this.mapAlertRow(result.rows[0]) : null;
  }

  /**
   * List all alerts
   */
  async listAlerts(options: {
    organizationId?: string;
    activeOnly?: boolean;
    alertType?: BudgetAlert['alertType'];
    limit?: number;
    offset?: number;
  } = {}): Promise<BudgetAlert[]> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const { limit = 50, offset = 0, activeOnly = false, organizationId, alertType } = options;

    let query = `SELECT * FROM llm_budget_alerts WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (activeOnly) {
      query += ` AND is_active = true`;
    }

    if (organizationId !== undefined) {
      if (organizationId === null) {
        query += ` AND organization_id IS NULL`;
      } else {
        query += ` AND organization_id = $${paramIndex++}`;
        params.push(organizationId);
      }
    }

    if (alertType) {
      query += ` AND alert_type = $${paramIndex++}`;
      params.push(alertType);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.server.pg.query(query, params);
    return result.rows.map((row) => this.mapAlertRow(row));
  }

  /**
   * Check all active alerts and trigger if thresholds exceeded
   */
  async checkAlerts(): Promise<{ checked: number; triggered: number }> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const alerts = await this.listAlerts({ activeOnly: true });
    let triggered = 0;

    for (const alert of alerts) {
      const result = await this.checkAlert(alert);
      if (result.triggered) {
        triggered++;
        await this.triggerAlert(alert, result);
      }
    }

    return { checked: alerts.length, triggered };
  }

  /**
   * Check a specific alert
   */
  async checkAlert(alert: BudgetAlert): Promise<AlertCheckResult> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    let currentValue = 0;
    let periodStart: Date;
    const periodEnd = new Date();

    // Determine period based on alert type
    switch (alert.alertType) {
      case 'daily_limit':
        periodStart = new Date();
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'weekly_limit':
        periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - periodStart.getDay());
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'monthly_limit':
        periodStart = new Date();
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'spike':
        periodStart = new Date(Date.now() - 60 * 60 * 1000); // Last hour
        break;
      default:
        periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24h
    }

    // Query current cost
    let query = `
      SELECT COALESCE(SUM(estimated_cost_cents), 0) as total_cost
      FROM llm_usage_log
      WHERE created_at >= $1 AND created_at <= $2
    `;
    const params: any[] = [periodStart, periodEnd];

    if (alert.organizationId) {
      query += ` AND organization_id = $3`;
      params.push(alert.organizationId);
    }

    const result = await this.server.pg.query(query, params);
    currentValue = parseInt(result.rows[0].total_cost, 10);

    // For spike alerts, compare to historical average
    if (alert.alertType === 'spike' && alert.spikePercent) {
      const avgQuery = `
        SELECT COALESCE(AVG(hourly_cost), 0) as avg_cost
        FROM (
          SELECT DATE_TRUNC('hour', created_at) as hour,
                 SUM(estimated_cost_cents) as hourly_cost
          FROM llm_usage_log
          WHERE created_at >= NOW() - INTERVAL '7 days'
            AND created_at < NOW() - INTERVAL '1 hour'
            ${alert.organizationId ? 'AND organization_id = $1' : ''}
          GROUP BY DATE_TRUNC('hour', created_at)
        ) hourly
      `;
      const avgResult = await this.server.pg.query(
        avgQuery,
        alert.organizationId ? [alert.organizationId] : []
      );
      const avgCost = parseFloat(avgResult.rows[0].avg_cost) || 0;
      const spikeThreshold = avgCost * (1 + alert.spikePercent / 100);
      
      return {
        triggered: currentValue > spikeThreshold && avgCost > 0,
        currentValue,
        threshold: Math.round(spikeThreshold),
        message: `Hourly cost ${currentValue} cents exceeds ${alert.spikePercent}% spike threshold (avg: ${Math.round(avgCost)} cents)`,
      };
    }

    // Standard threshold check
    const triggered = currentValue >= alert.thresholdCents;

    return {
      triggered,
      currentValue,
      threshold: alert.thresholdCents,
      message: triggered
        ? `${alert.alertType}: ${currentValue} cents exceeds threshold of ${alert.thresholdCents} cents`
        : `${alert.alertType}: ${currentValue} cents is below threshold of ${alert.thresholdCents} cents`,
    };
  }

  /**
   * Trigger an alert and send notifications
   */
  async triggerAlert(alert: BudgetAlert, result: AlertCheckResult): Promise<void> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    // Check notification frequency
    if (alert.lastTriggeredAt) {
      const lastTrigger = new Date(alert.lastTriggeredAt);
      const now = new Date();
      const hoursSinceLastTrigger = (now.getTime() - lastTrigger.getTime()) / (1000 * 60 * 60);

      if (alert.notificationFrequency === 'once' && hoursSinceLastTrigger < 24) {
        logger.info('Alert already triggered today, skipping notification', { alertId: alert.id });
        return;
      }
      if (alert.notificationFrequency === 'hourly' && hoursSinceLastTrigger < 1) {
        logger.info('Alert triggered within the hour, skipping notification', { alertId: alert.id });
        return;
      }
    }

    // Record alert trigger
    let notificationSent = false;
    let notificationError: string | null = null;

    try {
      // Send email notifications
      if (alert.notificationEmails.length > 0) {
        await this.sendEmailNotification(alert, result);
        notificationSent = true;
      }

      // Send Slack notification
      if (alert.notificationSlackWebhook) {
        await this.sendSlackNotification(alert, result);
        notificationSent = true;
      }
    } catch (error) {
      notificationError = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send alert notification', { error, alertId: alert.id });
    }

    // Record in history
    await this.server.pg.query(
      `
      INSERT INTO llm_alert_history (
        alert_id, trigger_value_cents, threshold_cents,
        notification_sent, notification_error, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        alert.id,
        result.currentValue,
        result.threshold,
        notificationSent,
        notificationError,
        JSON.stringify({ message: result.message }),
      ]
    );

    // Update alert record
    await this.server.pg.query(
      `
      UPDATE llm_budget_alerts
      SET last_triggered_at = NOW(),
          last_value_cents = $1,
          trigger_count = trigger_count + 1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [result.currentValue, alert.id]
    );

    logger.info('Budget alert triggered', {
      alertId: alert.id,
      currentValue: result.currentValue,
      threshold: result.threshold,
    });
  }

  /**
   * Send email notification for an alert
   */
  private async sendEmailNotification(alert: BudgetAlert, result: AlertCheckResult): Promise<void> {
    // In production, this would use an email service like SendGrid, SES, etc.
    // For now, we'll just log it
    logger.info('Sending email notification', {
      alertId: alert.id,
      emails: alert.notificationEmails,
      message: result.message,
    });

    // TODO: Implement actual email sending
    // Example with SendGrid:
    // await sgMail.send({
    //   to: alert.notificationEmails,
    //   from: 'alerts@synthstack.com',
    //   subject: `LLM Budget Alert: ${alert.name}`,
    //   text: result.message,
    //   html: `<h2>${alert.name}</h2><p>${result.message}</p>`,
    // });
  }

  /**
   * Send Slack notification for an alert
   */
  private async sendSlackNotification(alert: BudgetAlert, result: AlertCheckResult): Promise<void> {
    if (!alert.notificationSlackWebhook) return;

    try {
      const response = await fetch(alert.notificationSlackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 *LLM Budget Alert: ${alert.name}*`,
          attachments: [
            {
              color: 'danger',
              fields: [
                {
                  title: 'Alert Type',
                  value: alert.alertType,
                  short: true,
                },
                {
                  title: 'Current Value',
                  value: `$${(result.currentValue / 100).toFixed(2)}`,
                  short: true,
                },
                {
                  title: 'Threshold',
                  value: `$${(result.threshold / 100).toFixed(2)}`,
                  short: true,
                },
                {
                  title: 'Message',
                  value: result.message,
                  short: false,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to send Slack notification', { error, alertId: alert.id });
      throw error;
    }
  }

  /**
   * Get alert history
   */
  async getAlertHistory(options: {
    alertId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AlertHistory[]> {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    const { alertId, limit = 50, offset = 0 } = options;

    let query = `
      SELECT * FROM llm_alert_history
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (alertId) {
      query += ` AND alert_id = $${paramIndex++}`;
      params.push(alertId);
    }

    query += ` ORDER BY triggered_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.server.pg.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      alertId: row.alert_id,
      triggeredAt: row.triggered_at,
      triggerValueCents: parseInt(row.trigger_value_cents, 10),
      thresholdCents: parseInt(row.threshold_cents, 10),
      periodStart: row.period_start,
      periodEnd: row.period_end,
      notificationSent: row.notification_sent,
      notificationError: row.notification_error,
      metadata: row.metadata || {},
    }));
  }

  /**
   * Test an alert (check without triggering)
   */
  async testAlert(alertId: string): Promise<AlertCheckResult> {
    const alert = await this.getAlertById(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }
    return this.checkAlert(alert);
  }

  /**
   * Map database row to BudgetAlert interface
   */
  private mapAlertRow(row: any): BudgetAlert {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      alertType: row.alert_type,
      thresholdCents: parseInt(row.threshold_cents, 10),
      thresholdRequests: row.threshold_requests ? parseInt(row.threshold_requests, 10) : null,
      spikePercent: row.spike_percent ? parseInt(row.spike_percent, 10) : null,
      notificationEmails: row.notification_emails || [],
      notificationSlackWebhook: row.notification_slack_webhook,
      notificationFrequency: row.notification_frequency,
      isActive: row.is_active,
      lastTriggeredAt: row.last_triggered_at,
      lastValueCents: row.last_value_cents ? parseInt(row.last_value_cents, 10) : null,
      triggerCount: parseInt(row.trigger_count, 10),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// ============================================
// Singleton Instance
// ============================================

let serviceInstance: LLMAlertService | null = null;

export function getLLMAlertService(): LLMAlertService {
  if (!serviceInstance) {
    serviceInstance = new LLMAlertService();
  }
  return serviceInstance;
}

export const llmAlertService = getLLMAlertService();


