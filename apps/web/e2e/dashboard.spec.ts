/**
 * @file dashboard.spec.ts
 * @description E2E tests for dashboard flows
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
import { mockAuth, mockDashboardAPIs, mockCommonAPIs, waitForAppReady, getByTestId } from './helpers/test-utils'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await mockAuth(page)
    // Mock dashboard API endpoints
    await mockDashboardAPIs(page)
    // Catch-all for unmocked APIs - must be last
    await mockCommonAPIs(page)
  })

  test('should display dashboard page', async ({ page }) => {
    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Check dashboard page is visible
    const dashboardPage = getByTestId(page, 'dashboard-page')
    await expect(dashboardPage).toBeVisible({ timeout: 15000 })
  })

  test('should display welcome card', async ({ page }) => {
    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    const welcomeCard = getByTestId(page, 'welcome-card')
    await expect(welcomeCard).toBeVisible({ timeout: 15000 })
  })

  test('should display stats cards', async ({ page }) => {
    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    const statsCards = getByTestId(page, 'stats-cards')
    await expect(statsCards).toBeVisible({ timeout: 15000 })
  })

  test('should display charts section', async ({ page }) => {
    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    const chartsRow = getByTestId(page, 'charts-row')
    await expect(chartsRow).toBeVisible({ timeout: 15000 })
  })

  test('should display tables section', async ({ page }) => {
    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    const tablesRow = getByTestId(page, 'tables-row')
    await expect(tablesRow).toBeVisible({ timeout: 15000 })
  })

  test('should display AI usage card', async ({ page }) => {
    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    const aiRow = getByTestId(page, 'ai-row')
    await expect(aiRow).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Dashboard Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockDashboardAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    // Dashboard should still be visible on mobile
    const dashboardPage = getByTestId(page, 'dashboard-page')
    await expect(dashboardPage).toBeVisible({ timeout: 15000 })
  })

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/en/app/dashboard')
    await waitForAppReady(page)

    const dashboardPage = getByTestId(page, 'dashboard-page')
    await expect(dashboardPage).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Dashboard Loading States', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    await mockAuth(page)

    // Mock API to return errors
    await page.route('**/api/v1/dashboard/analytics/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    // Add catch-all after the error mock
    await mockCommonAPIs(page)

    await page.goto('/en/app/dashboard')

    // Page should still load without crashing - check for dashboard structure
    await waitForAppReady(page)
    const dashboardPage = getByTestId(page, 'dashboard-page')
    await expect(dashboardPage).toBeVisible({ timeout: 15000 })
  })
})
