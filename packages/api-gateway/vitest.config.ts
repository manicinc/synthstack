/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    // The mail suite needs a Postgres it may wipe: run it with vitest.mail.config.ts.
    exclude: ['**/e2e/**', '**/node_modules/**', 'src/services/email/__tests__/unsubscribe-every-mail.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})


