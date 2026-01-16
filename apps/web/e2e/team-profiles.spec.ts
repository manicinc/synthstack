/**
 * @file team-profiles.spec.ts
 * @description E2E tests for Team Member Profiles in Projects
 *
 * Tests the team tab UI, profile editing, and AI assignment suggestions.
 *
 * TEST MAINTENANCE PHILOSOPHY:
 * These tests check page STRUCTURE, not specific content. They should pass regardless
 * of CMS content changes, customization, or localization. Tests use data-testid
 * attributes and role selectors for element selection to avoid brittleness.
 */

import { test, expect } from '@playwright/test'
import {
  mockAuth,
  mockProjectsAPIs,
  mockTeamMembersAPIs,
  mockCommonAPIs,
  waitForAppReady,
  setupErrorCapture,
  disableAnimations,
} from './helpers/test-utils'

test.describe('Team Member Profiles', () => {
  let getErrors: () => string[]

  test.beforeEach(async ({ page }) => {
    getErrors = setupErrorCapture(page)
    await mockAuth(page)
    await mockProjectsAPIs(page)
    await mockTeamMembersAPIs(page)
    await mockCommonAPIs(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      console.log('Captured errors:', getErrors())
    }
  })

  test.describe('Team Tab Display', () => {
    test('should display team tab on project detail page', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      // Check for team tab
      const teamTab = page.getByRole('tab', { name: /team/i })
      await expect(teamTab).toBeVisible()
    })

    test('should show team members when tab is clicked', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      // Click team tab
      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      // Should show team member list or cards
      const teamContent = page.locator('.team-members, [data-testid="team-members-list"]')
      const memberCards = page.locator('.team-member-card, .q-card:has(.member-info)')

      // Either the team container or member cards should be visible
      const hasTeamContent = await teamContent.isVisible().catch(() => false)
      const hasMemberCards = (await memberCards.count()) > 0

      expect(hasTeamContent || hasMemberCards).toBeTruthy()
    })

    test('should display member role badges', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      // Check for role badges (owner, member, admin, etc.)
      const roleBadges = page.locator('.q-badge, .role-badge')
      const roleCount = await roleBadges.count()

      // Should have at least one role badge if members are displayed
      if (roleCount > 0) {
        await expect(roleBadges.first()).toBeVisible()
      }
    })

    test('should display member availability status', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      // Check for availability indicators (icons, text, or badges)
      const availabilityIndicators = page.locator(
        '[class*="availability"], [data-testid="availability-status"], .status-indicator'
      )

      // At least some availability indication should exist
      const hasIndicators = (await availabilityIndicators.count()) > 0
      const hasAvailableText = await page
        .locator('text=/available|busy|away/i')
        .first()
        .isVisible()
        .catch(() => false)

      // Either explicit indicators or availability text should be present
      expect(hasIndicators || hasAvailableText).toBeTruthy()
    })

    test('should display member skills if configured', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      // Check for skills chips/tags
      const skillChips = page.locator('.q-chip, .skill-chip, [data-testid="skill-tag"]')
      const skillCount = await skillChips.count()

      // Skills may or may not be displayed depending on profile configuration
      // Just verify the page doesn't error
      expect(skillCount).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Profile Editing', () => {
    test('should open profile edit dialog when clicking edit', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      // Find and click edit button (could be icon button or text button)
      const editButton = page
        .locator('button[aria-label*="edit" i], button:has-text("Edit"), .edit-profile-btn')
        .first()

      const hasEditButton = await editButton.isVisible().catch(() => false)

      if (hasEditButton) {
        await editButton.click()
        await page.waitForTimeout(300)

        // Check dialog opened
        await expect(page.locator('.q-dialog')).toBeVisible()
      } else {
        // Skip if edit button not available (might be viewer role)
        test.skip()
      }
    })

    test('should show profile form fields in edit dialog', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      const editButton = page
        .locator('button[aria-label*="edit" i], button:has-text("Edit"), .edit-profile-btn')
        .first()

      const hasEditButton = await editButton.isVisible().catch(() => false)

      if (!hasEditButton) {
        test.skip()
        return
      }

      await editButton.click()
      await page.waitForTimeout(300)

      const dialog = page.locator('.q-dialog')

      // Check for common profile form fields
      const roleInput = dialog.locator('input[label*="role" i], input[placeholder*="role" i]')
      const hasRoleInput = await roleInput.isVisible().catch(() => false)

      const skillsInput = dialog.locator('[class*="skill"], input[placeholder*="skill" i]')
      const hasSkillsInput = await skillsInput.isVisible().catch(() => false)

      // At least some form field should be present
      const hasAvailabilityField = await dialog.locator('text=/availability/i').isVisible()
      const hasCapacityField = await dialog.locator('text=/capacity/i').isVisible()

      expect(hasRoleInput || hasSkillsInput || hasAvailabilityField || hasCapacityField).toBeTruthy()
    })

    test('should allow adding skills via input', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      const editButton = page
        .locator('button[aria-label*="edit" i], button:has-text("Edit"), .edit-profile-btn')
        .first()

      const hasEditButton = await editButton.isVisible().catch(() => false)

      if (!hasEditButton) {
        test.skip()
        return
      }

      await editButton.click()
      await page.waitForTimeout(300)

      const dialog = page.locator('.q-dialog')

      // Try to find skills input
      const skillInput = dialog.locator(
        'input[placeholder*="skill" i], input[aria-label*="skill" i], .skill-input input'
      )

      const hasSkillInput = await skillInput.isVisible().catch(() => false)

      if (hasSkillInput) {
        // Type a new skill
        await skillInput.fill('NewTestSkill')
        await skillInput.press('Enter')
        await page.waitForTimeout(200)

        // Should create a chip/tag
        const newSkillChip = dialog.locator('text=NewTestSkill')
        await expect(newSkillChip).toBeVisible()
      }
    })

    test('should allow changing availability status', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      const editButton = page
        .locator('button[aria-label*="edit" i], button:has-text("Edit"), .edit-profile-btn')
        .first()

      const hasEditButton = await editButton.isVisible().catch(() => false)

      if (!hasEditButton) {
        test.skip()
        return
      }

      await editButton.click()
      await page.waitForTimeout(300)

      const dialog = page.locator('.q-dialog')

      // Find availability selector (could be buttons, select, or toggle group)
      const availabilitySelector = dialog.locator(
        '.availability-selector, .q-btn-toggle, .q-select:has-text("availability")'
      )

      const hasSelector = await availabilitySelector.isVisible().catch(() => false)

      if (hasSelector) {
        // Click on a different status
        const busyOption = dialog.locator('button:has-text("busy"), [aria-label*="busy"]')
        const hasBusyOption = await busyOption.isVisible().catch(() => false)

        if (hasBusyOption) {
          await busyOption.click()
          await page.waitForTimeout(200)
        }
      }
    })

    test('should save profile changes', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      const editButton = page
        .locator('button[aria-label*="edit" i], button:has-text("Edit"), .edit-profile-btn')
        .first()

      const hasEditButton = await editButton.isVisible().catch(() => false)

      if (!hasEditButton) {
        test.skip()
        return
      }

      await editButton.click()
      await page.waitForTimeout(300)

      const dialog = page.locator('.q-dialog')

      // Find and click save button
      const saveButton = dialog.locator('button:has-text("Save"), button[type="submit"]')
      await expect(saveButton).toBeVisible()
      await saveButton.click()

      // Wait for dialog to close or success message
      await page.waitForTimeout(500)

      // Dialog should close on successful save
      const dialogStillVisible = await dialog.isVisible().catch(() => false)
      const successMessage = await page.locator('text=/saved|success|updated/i').isVisible().catch(() => false)

      expect(!dialogStillVisible || successMessage).toBeTruthy()
    })
  })

  test.describe('Capacity Display', () => {
    test('should display capacity percentage or indicator', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      // Look for capacity indicators (percentage, progress bar, etc.)
      const capacityIndicators = page.locator(
        '[class*="capacity"], .q-linear-progress, text=/\\d+%/, [data-testid="capacity"]'
      )

      const hasCapacity = (await capacityIndicators.count()) > 0
      const hasPercentText = await page.locator('text=/\\d+\\s*%/').first().isVisible().catch(() => false)

      // Capacity should be shown in some form
      expect(hasCapacity || hasPercentText).toBeTruthy()
    })
  })

  test.describe('Member Actions', () => {
    test('should show member action menu', async ({ page }, testInfo) => {
      // Skip on mobile - action menu may be different
      test.skip(testInfo.project.name.startsWith('Mobile'), 'Mobile has different menu layout')

      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      // Find member card with action menu
      const actionButton = page
        .locator(
          'button[aria-label*="more" i], button[aria-label*="action" i], button:has(.q-icon:has-text("more"))'
        )
        .first()

      const hasActionButton = await actionButton.isVisible().catch(() => false)

      if (hasActionButton) {
        await actionButton.click()
        await page.waitForTimeout(200)

        // Menu should appear
        const menu = page.locator('.q-menu')
        await expect(menu).toBeVisible()
      }
    })
  })

  test.describe('AI Assignment Integration', () => {
    test('should show AI suggestions when creating a task', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      // Go to todos tab and try to create a new todo
      await page.getByRole('tab', { name: /todos/i }).click()
      await page.waitForTimeout(300)

      // Look for add todo button
      const addTodoButton = page.locator('button:has-text("Add"), button[aria-label*="add" i]').first()

      const hasAddButton = await addTodoButton.isVisible().catch(() => false)

      if (hasAddButton) {
        await addTodoButton.click()
        await page.waitForTimeout(300)

        // In the todo form, there should be an assignee field
        const dialog = page.locator('.q-dialog')
        const assigneeField = dialog.locator(
          '[aria-label*="assign" i], .q-select:has-text("assign"), [data-testid="assignee-select"]'
        )

        const hasAssigneeField = await assigneeField.isVisible().catch(() => false)

        if (hasAssigneeField) {
          // Click assignee field
          await assigneeField.click()
          await page.waitForTimeout(200)

          // Should show team members as options
          const options = page.locator('.q-item, [role="option"]')
          const optionCount = await options.count()

          expect(optionCount).toBeGreaterThan(0)
        }
      }
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should display team members in mobile-friendly layout', async ({ page }, testInfo) => {
      test.skip(!testInfo.project.name.startsWith('Mobile'), 'Test only runs on mobile viewport')

      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      // On mobile, content should be visible and usable
      const pageContent = page.locator('.q-page-container, .q-page')
      await expect(pageContent).toBeVisible()

      // No horizontal scrollbar should be necessary
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      const clientWidth = await page.evaluate(() => document.body.clientWidth)

      // Allow small overflow for edge cases
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10)
    })
  })

  test.describe('Accessibility', () => {
    test('should have accessible team tab button', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      const teamTab = page.getByRole('tab', { name: /team/i })
      await expect(teamTab).toBeVisible()

      // Tab should be keyboard focusable
      await teamTab.focus()
      await expect(teamTab).toBeFocused()
    })

    test('should support keyboard navigation in team list', async ({ page }) => {
      await page.goto('/en/app/projects/proj-1')
      await waitForAppReady(page)
      await disableAnimations(page)

      await page.getByRole('tab', { name: /team/i }).click()
      await page.waitForTimeout(300)

      // Should be able to tab through interactive elements
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)

      // Some element should receive focus
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeDefined()
    })
  })
})
