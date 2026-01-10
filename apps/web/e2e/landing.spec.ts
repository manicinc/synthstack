/**
 * E2E Tests for Landing Page
 * Uses Playwright to test core user flows
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
import { waitForAppReady, getByTestId, mockLandingAPIs, mockCommonAPIs, mockAuth, disableAnimations, setupErrorCapture } from './helpers/test-utils'

test.describe('Landing Page', () => {
  let getErrors: () => string[]

  test.beforeEach(async ({ page }) => {
    // Setup error capture first
    getErrors = setupErrorCapture(page)

    await mockAuth(page) // Mock auth for app initialization
    await mockLandingAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
    await page.goto('/en/')
    await waitForAppReady(page)
    // Disable CSS animations to prevent elements from being "hidden" during transitions
    await disableAnimations(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Log captured errors if test failed
    if (testInfo.status !== 'passed') {
      const errors = getErrors()
      if (errors.length > 0) {
        console.log('Captured errors during test:', errors)
      }
      // Log page content for debugging
      const html = await page.content()
      console.log('Page HTML length:', html.length)
      console.log('Page title:', await page.title())
    }
  })

  test('should display hero section with title', async ({ page }) => {
    // First ensure landing page container exists (use attached, not visible - CSS may affect visibility)
    const landingPage = getByTestId(page, 'landing-page')
    await expect(landingPage).toBeAttached({ timeout: 15000 })

    // Check hero section exists
    const heroSection = getByTestId(page, 'hero-section')
    await expect(heroSection).toBeAttached({ timeout: 10000 })

    // Check title exists - use flexible matching
    const heroTitle = page.locator('[data-testid="hero-title"], h1').first()
    await expect(heroTitle).toBeAttached()
  })

  test('should display CTA buttons', async ({ page }) => {
    // Check CTA section exists
    const ctaSection = getByTestId(page, 'hero-cta')
    await expect(ctaSection).toBeAttached({ timeout: 10000 })

    // Check at least one button exists
    const buttons = ctaSection.locator('button, a')
    await expect(buttons.first()).toBeAttached()
  })

  test('should display tech stack section', async ({ page }) => {
    const techStack = getByTestId(page, 'tech-stack-section')
    await expect(techStack).toBeAttached({ timeout: 10000 })
  })

  test('should have navigation header', async ({ page }) => {
    // Check navigation exists
    const nav = page.locator('nav, header, .q-header').first()
    await expect(nav).toBeAttached()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Page should still render
    const landingPage = getByTestId(page, 'landing-page')
    await expect(landingPage).toBeAttached({ timeout: 10000 })
  })
})

test.describe('Landing Page SEO', () => {
  let getErrors: () => string[]

  test.beforeEach(async ({ page }) => {
    getErrors = setupErrorCapture(page)
    await mockAuth(page)
    await mockLandingAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      console.log('Captured errors:', getErrors())
    }
  })

  test('should have correct meta title', async ({ page }) => {
    await page.goto('/en/')
    await waitForAppReady(page)
    await expect(page).toHaveTitle(/SynthStack/i)
  })

  test('should have meta description', async ({ page }) => {
    await page.goto('/en/')
    await waitForAppReady(page)
    const metaDescription = page.locator('meta[name="description"]')
    const content = await metaDescription.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content!.length).toBeGreaterThan(10)
  })
})

test.describe('Landing Page Accessibility', () => {
  let getErrors: () => string[]

  test.beforeEach(async ({ page }) => {
    getErrors = setupErrorCapture(page)
    await mockAuth(page)
    await mockLandingAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      console.log('Captured errors:', getErrors())
    }
  })

  test('should have at least one h1 heading', async ({ page }) => {
    await page.goto('/en/')
    await waitForAppReady(page)
    await disableAnimations(page)

    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)
  })

  test('should have images with alt text', async ({ page }) => {
    await page.goto('/en/')
    await waitForAppReady(page)
    await disableAnimations(page)

    const images = page.locator('img:visible')
    const count = await images.count()

    // Check first few visible images have alt or aria-hidden
    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const ariaHidden = await img.getAttribute('aria-hidden')
      const role = await img.getAttribute('role')

      // Image should have alt, aria-hidden, or decorative role
      const isAccessible = alt !== null || ariaHidden === 'true' || role === 'presentation'
      expect(isAccessible).toBe(true)
    }
  })
})
