/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

// Mail tests: every mail through the real sender into a capturing client,
// against the Postgres named by TEST_DATABASE_URL (the test wipes it).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/services/email/__tests__/unsubscribe-every-mail.test.ts',
      'src/services/auth/__tests__/auth-email.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      FRONTEND_URL: 'https://app.example.test',
      MAIL_PUBLIC_URL: 'https://api.example.test',
      CONTACT_TO_EMAIL: 'team@example.test',
      SMTP_FROM_EMAIL: 'team@example.test',
    },
  },
})
