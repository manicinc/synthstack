/**
 * E2E Test Setup
 *
 * Sets up Docker Compose environment for end-to-end testing
 */

import { beforeAll, afterAll } from 'vitest';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  verifyDockerPrerequisites,
} from '../../test/docker-helpers';
import {
  waitForDatabase,
  resetTestDatabase,
  closeTestPool,
} from '../../test/db-helpers';

// Global setup - runs once before all E2E tests
beforeAll(async () => {
  console.log('\n🚀 E2E Test Setup\n');

  // Verify Docker is available
  await verifyDockerPrerequisites();

  // Start Docker Compose services
  await setupTestEnvironment();

  // Wait for database to be ready
  await waitForDatabase(30, 2000); // 30 retries, 2 seconds each

  // Reset and seed database
  await resetTestDatabase();

  console.log('✅ E2E test environment ready\n');
}, 180000); // 3 minute timeout for Docker setup

// Global teardown - runs once after all E2E tests
afterAll(async () => {
  console.log('\n🧹 E2E Test Teardown\n');

  // Close database connections
  await closeTestPool();

  // Stop Docker Compose services
  await teardownTestEnvironment();

  console.log('✅ E2E test cleanup complete\n');
}, 60000); // 1 minute timeout for teardown
