import type { Pool, PoolClient } from 'pg';
import type { DatabaseAdapter, DatabaseClient } from '../types/index.js';

/**
 * Create a PostgreSQL database adapter from a pg Pool
 */
export function createPostgresAdapter(pool: Pool): DatabaseAdapter {
  return {
    async query<T = any>(sql: string, params?: any[]) {
      const result = await pool.query(sql, params);
      return { rows: result.rows as T[] };
    },

    async getClient(): Promise<DatabaseClient> {
      const client: PoolClient = await pool.connect();

      return {
        async query<T = any>(sql: string, params?: any[]) {
          const result = await client.query(sql, params);
          return { rows: result.rows as T[] };
        },
        release() {
          client.release();
        },
      };
    },
  };
}
