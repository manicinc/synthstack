/**
 * Database adapter interface for dependency injection
 */

import type { DatabaseAdapter, QueryResult } from '../types/database.js';

export type { DatabaseAdapter, QueryResult };

/**
 * Create a no-op adapter for testing pure functions
 */
export function createNoOpAdapter(): DatabaseAdapter {
  return {
    query: async <T>(): Promise<QueryResult<T>> => ({ rows: [], rowCount: 0 }),
    transaction: async <T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T> => {
      return fn(createNoOpAdapter());
    },
  };
}
