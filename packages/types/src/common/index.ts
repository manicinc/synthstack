/**
 * Common utility types for SynthStack
 */

// Pagination
export interface PaginationQuery {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// Sort
export interface SortQuery {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Date range
export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

// Generic ID types
export type UUID = string;
export type Timestamp = string;

// Nullable helper
export type Nullable<T> = T | null;

// Make all properties optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
