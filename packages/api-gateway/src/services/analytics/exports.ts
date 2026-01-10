import type { FastifyInstance } from 'fastify';

export async function createExport(fastify: FastifyInstance, config: {
  name: string;
  sourceType: string;
  query: string;
  format: 'csv' | 'json';
  requestedBy: string;
}): Promise<string> {
  const result = await fastify.pg.query(`
    INSERT INTO analytics_exports (name, export_type, source_type, query_config, status, requested_by, expires_at)
    VALUES ($1, $2, $3, $4, 'pending', $5, NOW() + INTERVAL '7 days')
    RETURNING id
  `, [config.name, config.format, config.sourceType, JSON.stringify({ query: config.query }), config.requestedBy]);

  return result.rows[0].id;
}

export async function processExport(fastify: FastifyInstance, exportId: string): Promise<void> {
  await fastify.pg.query('UPDATE analytics_exports SET status = $1, started_at = NOW() WHERE id = $2', ['processing', exportId]);
  const exportRecord = await fastify.pg.query('SELECT * FROM analytics_exports WHERE id = $1', [exportId]);
  const { query_config } = exportRecord.rows[0];
  const config = JSON.parse(query_config);
  const data = await fastify.pg.query(config.query);
  await fastify.pg.query('UPDATE analytics_exports SET status = $1, row_count = $2, completed_at = NOW() WHERE id = $3',
    ['completed', data.rows.length, exportId]);
}
