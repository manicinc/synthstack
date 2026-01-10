import type { FastifyInstance } from 'fastify';

export async function computeCohort(fastify: FastifyInstance, cohortId: string): Promise<any> {
  const cohort = await fastify.pg.query('SELECT * FROM analytics_cohorts WHERE id = $1', [cohortId]);
  if (cohort.rows.length === 0) return null;

  const { cohort_type, granularity, metric, start_date, end_date } = cohort.rows[0];
  const cohortData: Record<string, any> = {};

  // Simple retention cohort example
  if (metric === 'retention') {
    const result = await fastify.pg.query(`
      WITH cohort_users AS (
        SELECT id, DATE_TRUNC($1, created_at) as cohort_period
        FROM app_users
        WHERE created_at >= $2 AND created_at <= $3
      )
      SELECT cohort_period, COUNT(*) as size
      FROM cohort_users
      GROUP BY cohort_period
      ORDER BY cohort_period
    `, [granularity, start_date, end_date]);

    for (const row of result.rows) {
      cohortData[row.cohort_period] = { size: row.size };
    }
  }

  await fastify.pg.query('UPDATE analytics_cohorts SET cohort_data = $1, last_computed_at = NOW() WHERE id = $2',
    [JSON.stringify(cohortData), cohortId]);

  return cohortData;
}
