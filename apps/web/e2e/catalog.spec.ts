/**
 * E2E Tests for Catalog Page
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
import { waitForAppReady, getByTestId, mockCatalogAPIs, mockCommonAPIs, mockAuth } from './helpers/test-utils'

test.describe('Catalog Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page) // Mock auth for AppLayout initialization
    await mockCatalogAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
    await page.goto('/en/catalog/')
    await waitForAppReady(page)
  })

  test('should display catalog page', async ({ page }) => {
    const catalogPage = getByTestId(page, 'catalog-page')
    await expect(catalogPage).toBeVisible({ timeout: 10000 })
  })

  test('should display hero section with title', async ({ page }) => {
    const heroSection = getByTestId(page, 'catalog-hero')
    await expect(heroSection).toBeVisible({ timeout: 10000 })
    
    const title = getByTestId(page, 'catalog-title')
    await expect(title).toBeVisible()
  })

  test('should display stats', async ({ page }) => {
    const stats = getByTestId(page, 'catalog-stats')
    await expect(stats).toBeVisible({ timeout: 10000 })
    
    // Should have at least one stat
    const statItems = page.locator('[data-testid="catalog-stat"]')
    const count = await statItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display tabs', async ({ page }) => {
    const tabs = getByTestId(page, 'catalog-tabs')
    await expect(tabs).toBeVisible({ timeout: 10000 })
  })

  test('should have search input', async ({ page }) => {
    const search = getByTestId(page, 'catalog-search')
    await expect(search).toBeVisible({ timeout: 10000 })
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/en/catalog/')
    await waitForAppReady(page)

    const catalogPage = getByTestId(page, 'catalog-page')
    await expect(catalogPage).toBeVisible({ timeout: 10000 })
  })
})
