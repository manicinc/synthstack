/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // Integration tests don't need strict coverage enforcement
      enabled: false,
    },

    // Integration tests run with real services (slower)
    testTimeout: 60000,  // 60 seconds
    hookTimeout: 120000, // 2 minutes for setup/teardown

    // Run serially to avoid port conflicts
    maxConcurrency: 1,

    // Setup file for database initialization
    setupFiles: ['./src/__tests__/integration/setup.ts'],
  },
})
