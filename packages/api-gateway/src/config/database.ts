/**
 * @file database.ts
 * @description Database connection pool
 *
 * Note: For route handlers, prefer using fastify.pg from the @fastify/postgres plugin.
 * This standalone pool is for use in middleware and services that don't have
 * direct access to the Fastify instance.
 */

import pg from 'pg';

const { Pool } = pg;

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
  command: string;
  fields: pg.FieldDef[];
}

// Create pool from environment - lazy initialization
let poolInstance: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('DATABASE_URL or DB_CONNECTION_STRING environment variable not set');
    }
    poolInstance = new Pool({ connectionString });
  }
  return poolInstance;
}

/**
 * Database pool for direct queries
 * Prefer using fastify.pg in route handlers when possible
 */
export const pool = {
  query: async <T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> => {
    const result = await getPool().query(sql, params);
    return result as QueryResult<T>;
  },

  /**
   * Get the underlying pg Pool for advanced operations
   */
  getPool,

  /**
   * Close the pool (for graceful shutdown)
   */
  end: async (): Promise<void> => {
    if (poolInstance) {
      await poolInstance.end();
      poolInstance = null;
    }
  },
};
