/**
 * Global test setup
 */

import { vi } from 'vitest';

// Mock uuid to return predictable IDs in tests
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(36).substring(7),
}));
