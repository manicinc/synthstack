/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/e2e/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      // E2E tests don't contribute to coverage
      enabled: false,
    },

    // E2E tests with Docker Compose (very slow)
    testTimeout: 120000,  // 2 minutes per test
    hookTimeout: 180000,  // 3 minutes for Docker startup/teardown

    // Run one at a time to avoid conflicts
    maxConcurrency: 1,

    // Setup file for Docker orchestration
    setupFiles: ['./src/__tests__/e2e/setup.ts'],
  },
})
