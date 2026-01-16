/**
 * @file demo-copilot-credits.spec.ts
 * @description End-to-end tests for demo copilot credit system
 *
 * Tests the complete user journey from session initialization through credit
 * depletion, including UI notifications and modal interactions.
 *
 * Prerequisites:
 * - App running at http://localhost:9000
 * - API Gateway running at http://localhost:3003
 * - User NOT logged in (demo/guest mode)
 */

import { test, expect } from '@playwright/test'

test.describe('Demo Copilot Credit System E2E', () => {
  // Reset localStorage before each test to ensure fresh session
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:9000')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('should initialize with 5 credits and store session ID', async ({ page }) => {
    await page.goto('http://localhost:9000')

    // Wait for session to initialize
    await page.waitForTimeout(1000)

    // Check localStorage for session ID
    const sessionId = await page.evaluate(() => localStorage.getItem('synthstack_copilot_session_id'))
    expect(sessionId).toBeTruthy()
    expect(sessionId).toMatch(/^[a-f0-9-]{16,}$/)

    // Open DevTools console and check credits (if exposed)
    const creditsRemaining = await page.evaluate(() => {
      const store = (window as any).__PINIA__?.state?.value?.demoCredits
      return store?.creditsRemaining
    })
    expect(creditsRemaining).toBe(5)
  })

  test('should open copilot widget via FAB button', async ({ page }) => {
    await page.goto('http://localhost:9000/app')

    // Wait for app to load
    await page.waitForLoadState('networkidle')

    // Find and click copilot FAB
    const copilotFab = page.locator('[data-test="copilot-fab"]').or(page.locator('.copilot-fab')).or(page.locator('button:has-text("AI Copilot")'))
    await copilotFab.click()

    // Verify copilot panel is visible
    const copilotPanel = page.locator('.copilot-panel').or(page.locator('[data-test="copilot-panel"]'))
    await expect(copilotPanel).toBeVisible()
  })

  test('should successfully send messages and deduct credits (5 → 4 → 3 → 2)', async ({ page }) => {
    await page.goto('http://localhost:9000/app')
    await page.waitForLoadState('networkidle')

    // Open copilot
    const copilotFab = page.locator('[data-test="copilot-fab"]').or(page.locator('.copilot-fab'))
    await copilotFab.click()

    // Send first message
    const input = page.locator('[data-test="copilot-input"]').or(page.locator('input[placeholder*="message"]')).or(page.locator('textarea[placeholder*="message"]'))
    const sendBtn = page.locator('[data-test="copilot-send"]').or(page.locator('button:has-text("Send")')).or(page.locator('button[type="submit"]'))

    await input.fill('Hello, this is test message 1')
    await sendBtn.click()

    // Wait for response
    await page.waitForTimeout(2000)

    // Check credits decreased to 4
    let credits = await page.evaluate(() => {
      const store = (window as any).__PINIA__?.state?.value?.demoCredits
      return store?.creditsRemaining
    })
    expect(credits).toBe(4)

    // Send second message
    await input.fill('Test message 2')
    await sendBtn.click()
    await page.waitForTimeout(2000)

    credits = await page.evaluate(() => {
      const store = (window as any).__PINIA__?.state?.value?.demoCredits
      return store?.creditsRemaining
    })
    expect(credits).toBe(3)

    // Send third message
    await input.fill('Test message 3')
    await sendBtn.click()
    await page.waitForTimeout(2000)

    credits = await page.evaluate(() => {
      const store = (window as any).__PINIA__?.state?.value?.demoCredits
      return store?.creditsRemaining
    })
    expect(credits).toBe(2)
  })

  test('should show low credits banner when 1 credit remaining', async ({ page }) => {
    await page.goto('http://localhost:9000/app')
    await page.waitForLoadState('networkidle')

    // Open copilot
    const copilotFab = page.locator('[data-test="copilot-fab"]').or(page.locator('.copilot-fab'))
    await copilotFab.click()

    const input = page.locator('[data-test="copilot-input"]').or(page.locator('input[placeholder*="message"]')).or(page.locator('textarea[placeholder*="message"]'))
    const sendBtn = page.locator('[data-test="copilot-send"]').or(page.locator('button:has-text("Send")')).or(page.locator('button[type="submit"]'))

    // Send 4 messages to get down to 1 credit
    for (let i = 1; i <= 4; i++) {
      await input.fill(`Test message ${i}`)
      await sendBtn.click()
      await page.waitForTimeout(2000)
    }

    // Check for warning banner
    const banner = page.locator('.credits-banner').or(page.locator('[data-test="credits-banner"]'))
    await expect(banner).toBeVisible({ timeout: 3000 })

    // Verify banner content
    await expect(banner).toContainText('1 AI message remaining')

    // Banner should have upgrade button
    const upgradeBtn = banner.locator('.upgrade-btn').or(banner.locator('button:has-text("Upgrade")'))
    await expect(upgradeBtn).toBeVisible()

    // Banner should have close button
    const closeBtn = banner.locator('.close-btn').or(banner.locator('button[aria-label="Close"]'))
    await expect(closeBtn).toBeVisible()
  })

  test('should allow dismissing the low credits banner', async ({ page }) => {
    await page.goto('http://localhost:9000/app')
    await page.waitForLoadState('networkidle')

    // Open copilot and send 4 messages
    const copilotFab = page.locator('[data-test="copilot-fab"]').or(page.locator('.copilot-fab'))
    await copilotFab.click()

    const input = page.locator('[data-test="copilot-input"]').or(page.locator('input[placeholder*="message"]')).or(page.locator('textarea[placeholder*="message"]'))
    const sendBtn = page.locator('[data-test="copilot-send"]').or(page.locator('button:has-text("Send")')).or(page.locator('button[type="submit"]'))

    for (let i = 1; i <= 4; i++) {
      await input.fill(`Test message ${i}`)
      await sendBtn.click()
      await page.waitForTimeout(2000)
    }

    // Wait for banner to appear
    const banner = page.locator('.credits-banner').or(page.locator('[data-test="credits-banner"]'))
    await expect(banner).toBeVisible({ timeout: 3000 })

    // Click close button
    const closeBtn = banner.locator('.close-btn').or(banner.locator('button[aria-label="Close"]'))
    await closeBtn.click()

    // Banner should disappear
    await expect(banner).not.toBeVisible()

    // Check sessionStorage for dismissed flag
    const dismissed = await page.evaluate(() => sessionStorage.getItem('low_credits_banner_dismissed'))
    expect(dismissed).toBe('true')
  })

  test('should show depleted modal when sending 6th message (0 credits)', async ({ page }) => {
    await page.goto('http://localhost:9000/app')
    await page.waitForLoadState('networkidle')

    // Open copilot
    const copilotFab = page.locator('[data-test="copilot-fab"]').or(page.locator('.copilot-fab'))
    await copilotFab.click()

    const input = page.locator('[data-test="copilot-input"]').or(page.locator('input[placeholder*="message"]')).or(page.locator('textarea[placeholder*="message"]'))
    const sendBtn = page.locator('[data-test="copilot-send"]').or(page.locator('button:has-text("Send")')).or(page.locator('button[type="submit"]'))

    // Send all 5 messages
    for (let i = 1; i <= 5; i++) {
      await input.fill(`Test message ${i}`)
      await sendBtn.click()
      await page.waitForTimeout(2000)
    }

    // Try to send 6th message (should trigger modal)
    await input.fill('This should trigger the depleted modal')
    await sendBtn.click()

    // Check for depleted modal
    const modal = page.locator('.demo-credits-modal').or(page.locator('.q-dialog:has-text("AI Credits Depleted")')).or(page.locator('[role="dialog"]:has-text("depleted")'))
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Verify modal content
    await expect(modal).toContainText('AI Credits Depleted')
    await expect(modal).toContainText('all 5 demo')

    // Modal should have upgrade button
    const upgradeBtn = modal.locator('button:has-text("Upgrade")').or(modal.locator('button:has-text("Premium")'))
    await expect(upgradeBtn).toBeVisible()

    // Modal should have "Maybe Later" or close button
    const laterBtn = modal.locator('button:has-text("Maybe Later")').or(modal.locator('button:has-text("Close")')).or(modal.locator('button[aria-label="Close"]'))
    await expect(laterBtn).toBeVisible()
  })

  test('should allow dismissing the depleted modal', async ({ page }) => {
    await page.goto('http://localhost:9000/app')
    await page.waitForLoadState('networkidle')

    // Open copilot and send 5 messages
    const copilotFab = page.locator('[data-test="copilot-fab"]').or(page.locator('.copilot-fab'))
    await copilotFab.click()

    const input = page.locator('[data-test="copilot-input"]').or(page.locator('input[placeholder*="message"]')).or(page.locator('textarea[placeholder*="message"]'))
    const sendBtn = page.locator('[data-test="copilot-send"]').or(page.locator('button:has-text("Send")')).or(page.locator('button[type="submit"]'))

    for (let i = 1; i <= 5; i++) {
      await input.fill(`Test message ${i}`)
      await sendBtn.click()
      await page.waitForTimeout(2000)
    }

    // Trigger modal
    await input.fill('Trigger modal')
    await sendBtn.click()

    // Wait for modal
    const modal = page.locator('.demo-credits-modal').or(page.locator('.q-dialog:has-text("AI Credits Depleted")'))
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Click "Maybe Later" or close
    const laterBtn = modal.locator('button:has-text("Maybe Later")').or(modal.locator('button:has-text("Close")'))
    await laterBtn.click()

    // Modal should close
    await expect(modal).not.toBeVisible()
  })

  test('should block subsequent messages after depletion', async ({ page }) => {
    await page.goto('http://localhost:9000/app')
    await page.waitForLoadState('networkidle')

    // Open copilot and deplete credits
    const copilotFab = page.locator('[data-test="copilot-fab"]').or(page.locator('.copilot-fab'))
    await copilotFab.click()

    const input = page.locator('[data-test="copilot-input"]').or(page.locator('input[placeholder*="message"]')).or(page.locator('textarea[placeholder*="message"]'))
    const sendBtn = page.locator('[data-test="copilot-send"]').or(page.locator('button:has-text("Send")')).or(page.locator('button[type="submit"]'))

    // Send 5 messages
    for (let i = 1; i <= 5; i++) {
      await input.fill(`Test message ${i}`)
      await sendBtn.click()
      await page.waitForTimeout(2000)
    }

    // Try to send 6th message
    await input.fill('Blocked message 1')
    await sendBtn.click()

    // Dismiss modal
    const modal = page.locator('.demo-credits-modal').or(page.locator('.q-dialog'))
    await modal.locator('button:has-text("Maybe Later")').or(modal.locator('button:has-text("Close")')).click()

    // Try to send another message
    await input.fill('Blocked message 2')
    await sendBtn.click()

    // Modal should appear again
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Should show blocked message with time remaining
    await expect(modal).toContainText(/try again|blocked|24 hour/i)
  })

  test('should show upgrade button that navigates to pricing', async ({ page }) => {
    await page.goto('http://localhost:9000/app')
    await page.waitForLoadState('networkidle')

    // Open copilot and deplete credits
    const copilotFab = page.locator('[data-test="copilot-fab"]').or(page.locator('.copilot-fab'))
    await copilotFab.click()

    const input = page.locator('[data-test="copilot-input"]').or(page.locator('input[placeholder*="message"]')).or(page.locator('textarea[placeholder*="message"]'))
    const sendBtn = page.locator('[data-test="copilot-send"]').or(page.locator('button:has-text("Send")')).or(page.locator('button[type="submit"]'))

    // Deplete credits
    for (let i = 1; i <= 5; i++) {
      await input.fill(`Test message ${i}`)
      await sendBtn.click()
      await page.waitForTimeout(2000)
    }

    // Trigger modal
    await input.fill('Trigger upgrade flow')
    await sendBtn.click()

    // Click upgrade button
    const modal = page.locator('.demo-credits-modal').or(page.locator('.q-dialog'))
    await expect(modal).toBeVisible({ timeout: 3000 })

    const upgradeBtn = modal.locator('button:has-text("Upgrade")').or(modal.locator('button:has-text("Premium")'))

    // Set up navigation promise before clicking
    const navigationPromise = page.waitForURL(/\/pricing/, { timeout: 5000 })

    await upgradeBtn.click()

    // Should navigate to pricing page
    await navigationPromise
    expect(page.url()).toContain('/pricing')
  })

  test('should persist session across page refresh', async ({ page }) => {
    await page.goto('http://localhost:9000/app')
    await page.waitForLoadState('networkidle')

    // Open copilot and send 2 messages
    const copilotFab = page.locator('[data-test="copilot-fab"]').or(page.locator('.copilot-fab'))
    await copilotFab.click()

    const input = page.locator('[data-test="copilot-input"]').or(page.locator('input[placeholder*="message"]')).or(page.locator('textarea[placeholder*="message"]'))
    const sendBtn = page.locator('[data-test="copilot-send"]').or(page.locator('button:has-text("Send")')).or(page.locator('button[type="submit"]'))

    await input.fill('Message before refresh')
    await sendBtn.click()
    await page.waitForTimeout(2000)

    // Get session ID
    const sessionIdBefore = await page.evaluate(() => localStorage.getItem('synthstack_copilot_session_id'))

    // Refresh page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Session ID should persist
    const sessionIdAfter = await page.evaluate(() => localStorage.getItem('synthstack_copilot_session_id'))
    expect(sessionIdAfter).toBe(sessionIdBefore)

    // Credits should be restored (4 remaining)
    const creditsAfter = await page.evaluate(() => {
      const store = (window as any).__PINIA__?.state?.value?.demoCredits
      return store?.creditsRemaining
    })
    expect(creditsAfter).toBe(4)
  })

  test('should create new session after localStorage clear', async ({ page }) => {
    await page.goto('http://localhost:9000/app')
    await page.waitForLoadState('networkidle')

    // Get initial session ID
    const sessionId1 = await page.evaluate(() => localStorage.getItem('synthstack_copilot_session_id'))

    // Clear storage
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Refresh to trigger new session
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Should have new session ID
    const sessionId2 = await page.evaluate(() => localStorage.getItem('synthstack_copilot_session_id'))
    expect(sessionId2).toBeTruthy()
    expect(sessionId2).not.toBe(sessionId1)

    // Should have 5 credits again
    const credits = await page.evaluate(() => {
      const store = (window as any).__PINIA__?.state?.value?.demoCredits
      return store?.creditsRemaining
    })
    expect(credits).toBe(5)
  })

  test('complete user journey: 5 credits → banner → modal → blocked', async ({ page }) => {
    await page.goto('http://localhost:9000/app')
    await page.waitForLoadState('networkidle')

    // Step 1: Open copilot
    const copilotFab = page.locator('[data-test="copilot-fab"]').or(page.locator('.copilot-fab'))
    await copilotFab.click()

    const input = page.locator('[data-test="copilot-input"]').or(page.locator('input[placeholder*="message"]')).or(page.locator('textarea[placeholder*="message"]'))
    const sendBtn = page.locator('[data-test="copilot-send"]').or(page.locator('button:has-text("Send")')).or(page.locator('button[type="submit"]'))

    // Step 2: Send 3 messages (no warnings)
    for (let i = 1; i <= 3; i++) {
      await input.fill(`Journey message ${i}`)
      await sendBtn.click()
      await page.waitForTimeout(2000)
    }

    // Should still have 2 credits, no banner
    const bannerNotVisible = page.locator('.credits-banner')
    await expect(bannerNotVisible).not.toBeVisible()

    // Step 3: Send 4th message (should show banner)
    await input.fill('Journey message 4')
    await sendBtn.click()
    await page.waitForTimeout(2000)

    // Banner should appear
    const banner = page.locator('.credits-banner')
    await expect(banner).toBeVisible({ timeout: 3000 })
    await expect(banner).toContainText('1 AI message remaining')

    // Step 4: Send 5th message (should show modal)
    await input.fill('Journey message 5')
    await sendBtn.click()
    await page.waitForTimeout(2000)

    // Modal should appear
    const modal = page.locator('.demo-credits-modal').or(page.locator('.q-dialog:has-text("AI Credits Depleted")'))
    await expect(modal).toBeVisible({ timeout: 3000 })
    await expect(modal).toContainText('AI Credits Depleted')

    // Dismiss modal
    const laterBtn = modal.locator('button:has-text("Maybe Later")').or(modal.locator('button:has-text("Close")'))
    await laterBtn.click()

    // Step 5: Try to send 6th message (should be blocked)
    await input.fill('This should be blocked')
    await sendBtn.click()

    // Modal should appear again with block message
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Verify credits are at 0
    const credits = await page.evaluate(() => {
      const store = (window as any).__PINIA__?.state?.value?.demoCredits
      return store?.creditsRemaining
    })
    expect(credits).toBe(0)

    // Verify isBlocked flag is set
    const isBlocked = await page.evaluate(() => {
      const store = (window as any).__PINIA__?.state?.value?.demoCredits
      return store?.isBlocked
    })
    expect(isBlocked).toBe(true)
  })
})
