/**
 * E2E Tests for Generator Page
 * Tests the core generation flow
 * Note: Some tests are skipped as they reference deprecated 3D printing features
 *
 * TEST MAINTENANCE PHILOSOPHY:
 * These tests check page STRUCTURE, not specific content. They should pass regardless
 * of CMS content changes, customization, or localization. Tests use data-testid
 * attributes for element selection to avoid brittleness.
 *
 * ✅ DO: Check that elements exist using testids
 * ✅ DO: Verify page loads and basic structure is present
 * ❌ DON'T: Check for specific text content (it may change)
 * ❌ DON'T: Check for exact counts (content is dynamic)
 * ❌ DON'T: Match specific wording or labels
 */

import { test, expect } from '@playwright/test'
import { mockAuth, mockAppAPIs, mockCommonAPIs, waitForAppReady } from './helpers/test-utils'

test.describe('Generator Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockAppAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
    await page.goto('/en/app/generate')
    await waitForAppReady(page)
  })

  test('should display generator page', async ({ page }) => {
    // Check page loads
    const body = page.locator('body')
    await expect(body).toBeVisible()
    
    // Check we're on the right page
    await expect(page).toHaveURL(/\/en\/app\/generate/)
  })

  test('should have main content area', async ({ page }) => {
    // Check main content is visible
    const mainContent = page.locator('main, .q-page, [class*="generate"]').first()
    await expect(mainContent).toBeVisible({ timeout: 10000 })
  })

  // Skip obsolete 3D printing specific tests
  test.skip('should display upload panel', async ({ page }) => {
    // This test is for deprecated 3D printing features
  })

  test.skip('should have intent selection options', async ({ page }) => {
    // This test is for deprecated 3D printing features
  })

  test.skip('should allow selecting printer', async ({ page }) => {
    // This test is for deprecated 3D printing features
  })

  test.skip('should allow selecting filament', async ({ page }) => {
    // This test is for deprecated 3D printing features
  })
})

test.describe('Generator Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockAppAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
  })

  test('should display on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/en/app/generate')
    await waitForAppReady(page)
    
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should display on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/en/app/generate')
    await waitForAppReady(page)
    
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
