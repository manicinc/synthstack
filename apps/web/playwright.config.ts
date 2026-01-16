/**
 * Playwright E2E Test Configuration
 */

import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
const baseOrigin = new URL(baseURL).origin
const cookieConsent = JSON.stringify({
  version: '1.0',
  consents: {
    essential: true,
    functional: true,
    analytics: false,
    marketing: false,
  },
  timestamp: new Date().toISOString(),
})

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  timeout: 60000, // 60s per test
  expect: {
    timeout: 10000, // 10s for assertions
  },
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    isCI ? ['github'] : ['list']
  ],
  
  use: {
    baseURL,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseOrigin,
          localStorage: [{ name: 'synthstack_cookie_consent', value: cookieConsent }],
        },
      ],
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15000, // 15s per action
    navigationTimeout: 30000, // 30s for navigation
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Start dev server before running tests
  // Environment variables (including VITE_*) are inherited from parent process
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180 * 1000, // 3 minutes to start
    stdout: 'inherit', // Show dev server output for debugging in CI
    stderr: 'inherit',
  },
})
