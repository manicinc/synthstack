import type { FastifyInstance } from 'fastify';

export class AnalyticsAggregator {
  constructor(private fastify: FastifyInstance) {}

  async aggregateDaily(date?: Date): Promise<void> {
    const targetDate = date || new Date();
    targetDate.setDate(targetDate.getDate() - 1);
    const dateStr = targetDate.toISOString().split('T')[0];

    const metrics = await this.fastify.pg.query(`
      WITH daily_stats AS (
        SELECT 
          (SELECT COUNT(*) FROM app_users WHERE DATE(created_at) = $1) as new_users,
          (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE DATE(timestamp) = $1) as active_users,
          (SELECT COUNT(*) FROM credit_transactions WHERE type = 'generation' AND DATE(created_at) = $1) as generations,
          (SELECT COALESCE(SUM(ABS(amount)), 0) FROM credit_transactions WHERE amount < 0 AND DATE(created_at) = $1) as credits_used,
          (SELECT COUNT(*) FROM subscription_history WHERE action = 'created' AND DATE(created_at) = $1) as new_subscriptions,
          (SELECT COUNT(*) FROM subscription_history WHERE action IN ('canceled', 'expired') AND DATE(created_at) = $1) as churned,
          (SELECT COALESCE(SUM(amount_cents), 0) FROM invoice_cache WHERE status = 'paid' AND DATE(paid_at) = $1) as revenue_cents
      )
      SELECT * FROM daily_stats
    `, [dateStr]);

    const stats = metrics.rows[0];
    await this.fastify.pg.query(`
      INSERT INTO analytics_daily (date, new_users, active_users, generations, credits_used, new_subscriptions, churned_subscriptions, revenue_cents, computed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (date) DO UPDATE SET
        new_users = EXCLUDED.new_users, active_users = EXCLUDED.active_users,
        generations = EXCLUDED.generations, credits_used = EXCLUDED.credits_used,
        new_subscriptions = EXCLUDED.new_subscriptions, churned_subscriptions = EXCLUDED.churned_subscriptions,
        revenue_cents = EXCLUDED.revenue_cents, computed_at = NOW()
    `, [dateStr, stats.new_users, stats.active_users, stats.generations, stats.credits_used, stats.new_subscriptions, stats.churned, stats.revenue_cents]);
  }

  async aggregateHourly(): Promise<void> {
    const hour = new Date();
    hour.setMinutes(0, 0, 0);
    hour.setHours(hour.getHours() - 1);

    const metrics = await this.fastify.pg.query(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) FILTER (WHERE event_category = 'user' AND event_type = 'page_view') as page_views,
        COUNT(*) as api_requests,
        COUNT(*) FILTER (WHERE event_type LIKE '%generation%') as generations,
        COUNT(*) FILTER (WHERE event_category = 'user' AND event_type = 'signup') as signups
      FROM analytics_events
      WHERE timestamp >= $1 AND timestamp < $2
    `, [hour.toISOString(), new Date(hour.getTime() + 3600000).toISOString()]);

    const stats = metrics.rows[0];
    await this.fastify.pg.query(`
      INSERT INTO analytics_hourly (hour, active_users, page_views, api_requests, generations, signups, computed_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (hour) DO UPDATE SET
        active_users = EXCLUDED.active_users, page_views = EXCLUDED.page_views,
        api_requests = EXCLUDED.api_requests, generations = EXCLUDED.generations,
        signups = EXCLUDED.signups, computed_at = NOW()
    `, [hour.toISOString(), stats.active_users, stats.page_views, stats.api_requests, stats.generations, stats.signups]);
  }
}
