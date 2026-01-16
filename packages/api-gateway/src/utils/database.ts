/**
 * @file utils/database.ts
 * @description Database utility functions for type-safe database access
 *
 * Provides wrappers around @fastify/postgres to ensure type compatibility
 * with services that expect the standard pg Pool type.
 */

import type { FastifyInstance } from 'fastify';
import type { Pool, QueryResult, QueryResultRow } from 'pg';

/**
 * Get the PostgreSQL pool from Fastify instance
 *
 * @fastify/postgres provides a PostgresDb type that is compatible with Pool
 * but TypeScript doesn't recognize this. This wrapper provides type safety.
 *
 * @param fastify - Fastify instance with postgres plugin registered
 * @returns Pool-compatible database client
 *
 * @example
 * ```typescript
 * const pool = getPool(fastify);
 * const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
 * ```
 */
export function getPool(fastify: FastifyInstance): Pool {
  // @fastify/postgres provides a Pool-compatible interface
  // The type assertion is safe because PostgresDb wraps a Pool
  return fastify.pg as unknown as Pool;
}

/**
 * Execute a typed query against the database
 *
 * @param fastify - Fastify instance
 * @param text - SQL query text
 * @param values - Query parameters
 * @returns Typed query result
 *
 * @example
 * ```typescript
 * interface UserRow { id: string; email: string; }
 * const result = await query<UserRow>(fastify, 'SELECT id, email FROM users WHERE id = $1', [userId]);
 * const user = result.rows[0];
 * ```
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  fastify: FastifyInstance,
  text: string,
  values?: unknown[]
): Promise<QueryResult<T>> {
  return fastify.pg.query<T>(text, values);
}

/**
 * Execute a query and return the first row or null
 *
 * @param fastify - Fastify instance
 * @param text - SQL query text
 * @param values - Query parameters
 * @returns First row or null if no results
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  fastify: FastifyInstance,
  text: string,
  values?: unknown[]
): Promise<T | null> {
  const result = await fastify.pg.query<T>(text, values);
  return result.rows[0] ?? null;
}

/**
 * Execute a query and return all rows
 *
 * @param fastify - Fastify instance
 * @param text - SQL query text
 * @param values - Query parameters
 * @returns Array of rows
 */
export async function queryAll<T extends QueryResultRow = QueryResultRow>(
  fastify: FastifyInstance,
  text: string,
  values?: unknown[]
): Promise<T[]> {
  const result = await fastify.pg.query<T>(text, values);
  return result.rows;
}

export default {
  getPool,
  query,
  queryOne,
  queryAll,
};
