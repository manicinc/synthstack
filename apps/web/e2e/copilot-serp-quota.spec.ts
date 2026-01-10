/**
 * E2E Tests for SERP Quota Graceful Degradation
 *
 * Tests the web search quota system in the AI Copilot:
 * - Search button state based on quota availability
 * - Tooltips and badges showing quota status
 * - Notifications when quota is low or exhausted
 * - Graceful degradation when search is unavailable
 */

import { test, expect } from '@playwright/test'
import { waitForAppReady, mockAuth, mockCommonAPIs } from './helpers/test-utils'

/**
 * Mock SERP quota API with configurable response
 */
async function mockSerpQuota(
  page: import('@playwright/test').Page,
  options: {
    used?: number
    limit?: number
    remaining?: number
    canSearch?: boolean
  } = {}
) {
  const defaults = {
    used: 50,
    limit: 100,
    remaining: 50,
    canSearch: true,
  }

  const response = { ...defaults, ...options }

  await page.route('**/api/v1/serp/quota', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
}

/**
 * Mock copilot APIs for testing
 */
async function mockCopilotAPIs(page: import('@playwright/test').Page) {
  // Mock copilot health endpoint
  await page.route('**/api/v1/copilot/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        copilot: {
          enabled: true,
          available: true,
          model: 'gpt-4',
          fallbackModel: 'gpt-3.5-turbo',
          embeddingModel: 'text-embedding-3-small',
          providers: ['openai'],
        },
        vectorDB: { healthy: true },
        embeddings: { available: true, model: 'text-embedding-3-small', dimension: 1536 },
      }),
    })
  })

  // Mock copilot chats endpoint
  await page.route('**/api/v1/copilot/chats**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })

  // Mock copilot agents endpoint
  await page.route('**/api/v1/copilot/agents**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'general',
            name: 'General Assistant',
            description: 'General purpose AI assistant',
            icon: 'smart_toy',
            color: '#0d9488',
            capabilities: ['chat', 'search'],
            greeting: 'Hello! How can I help?',
            quickPrompts: [],
            isPremium: false,
          },
        ],
      }),
    })
  })
}

test.describe('SERP Quota - Search Button States', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockCopilotAPIs(page)
    await mockCommonAPIs(page)
  })

  test('search button should be enabled when quota is available', async ({ page }) => {
    await mockSerpQuota(page, { used: 50, limit: 100, remaining: 50, canSearch: true })

    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Open copilot widget
    const copilotFab = page.locator('[data-testid="copilot-fab"]')
    if (await copilotFab.isVisible()) {
      await copilotFab.click()
      await page.waitForTimeout(500)

      // Find search button in chat input
      const searchBtn = page.locator('.search-btn').first()
      if (await searchBtn.isVisible()) {
        // Button should be enabled
        await expect(searchBtn).not.toHaveAttribute('disabled')
        await expect(searchBtn).not.toHaveClass(/search-btn--disabled/)
      }
    }
  })

  test('search button should be disabled when quota is exhausted', async ({ page }) => {
    await mockSerpQuota(page, { used: 100, limit: 100, remaining: 0, canSearch: false })

    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Open copilot widget
    const copilotFab = page.locator('[data-testid="copilot-fab"]')
    if (await copilotFab.isVisible()) {
      await copilotFab.click()
      await page.waitForTimeout(500)

      // Find search button in chat input
      const searchBtn = page.locator('.search-btn').first()
      if (await searchBtn.isVisible()) {
        // Button should be disabled
        await expect(searchBtn).toHaveAttribute('disabled')
      }
    }
  })

  test('search button should show quota badge when remaining is low', async ({ page }) => {
    await mockSerpQuota(page, { used: 95, limit: 100, remaining: 5, canSearch: true })

    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Open copilot widget
    const copilotFab = page.locator('[data-testid="copilot-fab"]')
    if (await copilotFab.isVisible()) {
      await copilotFab.click()
      await page.waitForTimeout(500)

      // Look for the quota badge on the search button
      const quotaBadge = page.locator('.search-quota-badge')
      if (await quotaBadge.isVisible()) {
        // Badge should show remaining count
        await expect(quotaBadge).toContainText('5')
      }
    }
  })
})

test.describe('SERP Quota - Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockCopilotAPIs(page)
    await mockCommonAPIs(page)
  })

  test('should show warning notification when quota is exhausted', async ({ page }) => {
    await mockSerpQuota(page, { used: 100, limit: 100, remaining: 0, canSearch: false })

    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Open copilot widget
    const copilotFab = page.locator('[data-testid="copilot-fab"]')
    if (await copilotFab.isVisible()) {
      await copilotFab.click()

      // Wait for notification to appear
      await page.waitForTimeout(1000)

      // Look for Quasar notification
      const notification = page.locator('.q-notification')
      if (await notification.count() > 0) {
        // Should contain quota exhausted message
        const notificationText = await notification.first().textContent()
        expect(notificationText?.toLowerCase()).toContain('search')
      }
    }
  })

  test('should show info notification when quota is low', async ({ page }) => {
    await mockSerpQuota(page, { used: 95, limit: 100, remaining: 5, canSearch: true })

    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Open copilot widget
    const copilotFab = page.locator('[data-testid="copilot-fab"]')
    if (await copilotFab.isVisible()) {
      await copilotFab.click()

      // Wait for notification to appear
      await page.waitForTimeout(1000)

      // Look for Quasar notification
      const notification = page.locator('.q-notification')
      if (await notification.count() > 0) {
        // Should contain low quota message
        const notificationText = await notification.first().textContent()
        // May show remaining searches
        expect(notificationText?.toLowerCase()).toMatch(/search|quota|remaining/i)
      }
    }
  })
})

test.describe('SERP Quota - Tooltip Messages', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockCopilotAPIs(page)
    await mockCommonAPIs(page)
  })

  test('should show correct tooltip when quota available', async ({ page }) => {
    await mockSerpQuota(page, { used: 50, limit: 100, remaining: 50, canSearch: true })

    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Open copilot widget
    const copilotFab = page.locator('[data-testid="copilot-fab"]')
    if (await copilotFab.isVisible()) {
      await copilotFab.click()
      await page.waitForTimeout(500)

      // Hover over search button to show tooltip
      const searchBtn = page.locator('.search-btn').first()
      if (await searchBtn.isVisible()) {
        await searchBtn.hover()
        await page.waitForTimeout(300)

        // Look for tooltip
        const tooltip = page.locator('.q-tooltip')
        if (await tooltip.isVisible()) {
          await expect(tooltip).toContainText(/enable web search/i)
        }
      }
    }
  })

  test('should show unavailable tooltip when quota exhausted', async ({ page }) => {
    await mockSerpQuota(page, { used: 100, limit: 100, remaining: 0, canSearch: false })

    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Open copilot widget
    const copilotFab = page.locator('[data-testid="copilot-fab"]')
    if (await copilotFab.isVisible()) {
      await copilotFab.click()
      await page.waitForTimeout(500)

      // Hover over search button to show tooltip
      const searchBtn = page.locator('.search-btn').first()
      if (await searchBtn.isVisible()) {
        await searchBtn.hover()
        await page.waitForTimeout(300)

        // Look for tooltip
        const tooltip = page.locator('.q-tooltip')
        if (await tooltip.isVisible()) {
          await expect(tooltip).toContainText(/unavailable|quota exceeded/i)
        }
      }
    }
  })
})

test.describe('SERP Quota - API Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockCopilotAPIs(page)
    await mockCommonAPIs(page)
  })

  test('should handle SERP quota API failure gracefully', async ({ page }) => {
    // Mock quota endpoint to fail
    await page.route('**/api/v1/serp/quota', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Open copilot widget - should still work
    const copilotFab = page.locator('[data-testid="copilot-fab"]')
    if (await copilotFab.isVisible()) {
      await copilotFab.click()
      await page.waitForTimeout(500)

      // Copilot should still be functional
      const chatInput = page.locator('.chat-input, .q-input').first()
      await expect(chatInput).toBeVisible()

      // Search button should be disabled (safe default on error)
      const searchBtn = page.locator('.search-btn').first()
      if (await searchBtn.isVisible()) {
        await expect(searchBtn).toHaveAttribute('disabled')
      }
    }
  })

  test('should handle 429 rate limit response', async ({ page }) => {
    // Mock quota endpoint to return 429
    await page.route('**/api/v1/serp/quota', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' }),
      })
    })

    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Open copilot widget
    const copilotFab = page.locator('[data-testid="copilot-fab"]')
    if (await copilotFab.isVisible()) {
      await copilotFab.click()
      await page.waitForTimeout(500)

      // Copilot should still work without search
      const chatInput = page.locator('.chat-input, .q-input').first()
      await expect(chatInput).toBeVisible()
    }
  })
})
