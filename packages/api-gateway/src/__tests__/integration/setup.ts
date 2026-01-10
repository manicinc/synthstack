/**
 * Integration Test Setup
 *
 * Sets up database and Redis for integration testing
 */

import { beforeAll, afterAll } from 'vitest';
import {
  getTestPool,
  closeTestPool,
  waitForDatabase,
  resetTestDatabase,
} from '../../test/db-helpers';

// Global setup - runs once before all integration tests
beforeAll(async () => {
  console.log('\n🚀 Integration Test Setup\n');

  // Wait for database to be ready
  await waitForDatabase();

  // Reset and seed database
  await resetTestDatabase();

  console.log('✅ Integration test environment ready\n');
}, 60000); // 60 second timeout for setup

// Global teardown - runs once after all integration tests
afterAll(async () => {
  console.log('\n🧹 Integration Test Teardown\n');

  // Close database connections
  await closeTestPool();

  console.log('✅ Integration test cleanup complete\n');
});
