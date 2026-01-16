import type { FastifyInstance } from 'fastify';

export async function computeFunnel(fastify: FastifyInstance, funnelId: string): Promise<any> {
  const funnel = await fastify.pg.query('SELECT * FROM analytics_funnels WHERE id = $1', [funnelId]);
  if (funnel.rows.length === 0) return null;

  const { steps, window_days } = funnel.rows[0];
  const parsedSteps = JSON.parse(steps);
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - window_days);

  const metrics: any[] = [];
  for (let i = 0; i < parsedSteps.length; i++) {
    const step = parsedSteps[i];
    const count = await fastify.pg.query(
      'SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE event_type = $1 AND timestamp >= $2',
      [step.event, windowStart.toISOString()]
    );
    metrics.push({ step: step.name, count: parseInt(count.rows[0].count), dropoff: i > 0 ? metrics[i-1].count - parseInt(count.rows[0].count) : 0 });
  }

  const conversionRate = metrics[0].count > 0 ? (metrics[metrics.length - 1].count / metrics[0].count) * 100 : 0;
  await fastify.pg.query('UPDATE analytics_funnels SET step_metrics = $1, conversion_rate = $2, total_entered = $3, total_completed = $4, last_computed_at = NOW() WHERE id = $5',
    [JSON.stringify(metrics), conversionRate, metrics[0].count, metrics[metrics.length - 1].count, funnelId]);

  return { metrics, conversionRate };
}
