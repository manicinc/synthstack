import type { FastifyInstance } from 'fastify';

export async function executeReport(fastify: FastifyInstance, reportId: string): Promise<any> {
  const report = await fastify.pg.query('SELECT * FROM analytics_reports WHERE id = $1', [reportId]);
  if (report.rows.length === 0) return null;

  const { query_type, raw_sql, query_config } = report.rows[0];
  let results;

  if (query_type === 'sql' && raw_sql) {
    results = await fastify.pg.query(raw_sql);
  } else {
    const config = JSON.parse(query_config);
    results = await fastify.pg.query(`SELECT * FROM ${config.table} LIMIT 100`);
  }

  await fastify.pg.query('UPDATE analytics_reports SET cached_data = $1, cached_at = NOW(), last_run_at = NOW() WHERE id = $2',
    [JSON.stringify(results.rows), reportId]);

  return results.rows;
}
