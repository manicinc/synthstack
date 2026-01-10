/**
 * PostgreSQL adapter implementation
 *
 * This adapter wraps a pg Pool instance and implements the DatabaseAdapter interface.
 * It's designed to be used with dependency injection so the package doesn't depend
 * directly on pg being installed.
 */

import type { DatabaseAdapter, QueryResult } from '../types/database.js';

/**
 * Interface for pg Pool-like objects
 */
export interface PgPoolLike {
  query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
  connect(): Promise<PgClientLike>;
}

export interface PgClientLike {
  query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
  release(): void;
}

/**
 * Create a PostgreSQL adapter from a pg Pool
 */
export function createPgAdapter(pool: PgPoolLike): DatabaseAdapter {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
      const result = await pool.query<T>(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
      };
    },

    async transaction<T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create a client-scoped adapter
        const clientAdapter: DatabaseAdapter = {
          async query<U>(sql: string, params?: unknown[]): Promise<QueryResult<U>> {
            const result = await client.query<U>(sql, params);
            return {
              rows: result.rows,
              rowCount: result.rowCount,
            };
          },
          transaction: async <U>(innerFn: (adapter: DatabaseAdapter) => Promise<U>): Promise<U> => {
            // Nested transactions use savepoints
            await client.query('SAVEPOINT nested_transaction');
            try {
              const result = await innerFn(clientAdapter);
              await client.query('RELEASE SAVEPOINT nested_transaction');
              return result;
            } catch (error) {
              await client.query('ROLLBACK TO SAVEPOINT nested_transaction');
              throw error;
            }
          },
        };

        const result = await fn(clientAdapter);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
