/**
 * Database abstraction types for dependency injection
 */

export interface QueryResult<T> {
  rows: T[];
  rowCount: number | null;
}

export interface DatabaseAdapter {
  /**
   * Execute a SQL query with optional parameters
   */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;

  /**
   * Execute a function within a transaction
   */
  transaction<T>(fn: (adapter: DatabaseAdapter) => Promise<T>): Promise<T>;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export interface ServiceDependencies {
  db: DatabaseAdapter;
  logger?: Logger;
  generateId?: () => string;
}
