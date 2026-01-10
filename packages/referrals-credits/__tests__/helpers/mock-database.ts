/**
 * Mock Database Adapter for testing
 */

import { vi } from 'vitest';
import type { DatabaseAdapter, QueryResult } from '../../src/types/database.js';

export interface MockQueryResponse {
  pattern: string | RegExp;
  response: unknown[] | unknown;
}

/**
 * Create a mock database adapter for testing
 */
export function createMockDatabase(responses: MockQueryResponse[] = []): DatabaseAdapter & {
  queries: Array<{ sql: string; params?: unknown[] }>;
  mockQuery: (pattern: string | RegExp, response: unknown[] | unknown) => void;
  clearMocks: () => void;
} {
  const queries: Array<{ sql: string; params?: unknown[] }> = [];
  const mockResponses = [...responses];

  const adapter: DatabaseAdapter = {
    query: vi.fn().mockImplementation(async <T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> => {
      queries.push({ sql, params });

      for (const { pattern, response } of mockResponses) {
        const matches = typeof pattern === 'string'
          ? sql.includes(pattern)
          : pattern.test(sql);

        if (matches) {
          const rows = Array.isArray(response) ? response : [response];
          return { rows: rows as T[], rowCount: rows.length };
        }
      }

      return { rows: [], rowCount: 0 };
    }),

    transaction: vi.fn().mockImplementation(async <T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T> => {
      return fn(adapter);
    }),
  };

  return {
    ...adapter,
    queries,
    mockQuery: (pattern: string | RegExp, response: unknown[] | unknown) => {
      mockResponses.push({ pattern, response });
    },
    clearMocks: () => {
      queries.length = 0;
      mockResponses.length = 0;
    },
  };
}

/**
 * Create a mock that throws an error
 */
export function createFailingDatabase(errorMessage: string = 'Database error'): DatabaseAdapter {
  return {
    query: vi.fn().mockRejectedValue(new Error(errorMessage)),
    transaction: vi.fn().mockRejectedValue(new Error(errorMessage)),
  };
}
