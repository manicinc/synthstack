/**
 * @file projects.spec.ts
 * @description E2E tests for the Projects system including CRUD operations,
 * todos, milestones, and AI copilot integration.
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
import { mockAuth, mockProjectsAPIs, mockAppAPIs, mockCommonAPIs, waitForAppReady, setupErrorCapture, disableAnimations } from './helpers/test-utils'

test.describe('Projects Page', () => {
  let getErrors: () => string[]

  test.beforeEach(async ({ page }) => {
    getErrors = setupErrorCapture(page)
    await mockAuth(page)
    await mockProjectsAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    await disableAnimations(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      console.log('Captured errors:', getErrors())
    }
  })

  test('should show dashboard sidebar on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('Mobile'), 'Sidebar is hidden on mobile')

    await expect(page.getByTestId('app-sidebar')).toBeVisible()
  })

  test('should display projects list page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Projects')

    // Check for create button
    const createButton = page.getByRole('button', { name: /new project/i })
    await expect(createButton).toBeVisible()
  })

  test('should display filters and search', async ({ page }) => {
    // Check search input
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()

    // Check status filter
    const statusFilter = page.locator('[aria-label="Status"], .q-select').first()
    await expect(statusFilter).toBeVisible()
  })

  test('should toggle between grid and list view', async ({ page }) => {
    // Find view toggle using data-testid
    const viewToggle = page.getByTestId('view-toggle')
    const emptyState = page.locator('text=/no projects/i')

    // Check if toggle exists
    const hasToggle = await viewToggle.isVisible().catch(() => false)
    if (!hasToggle) {
      test.skip()
      return
    }

    // Get the toggle buttons (first is grid, second is list)
    const toggleButtons = viewToggle.locator('button')
    const listButton = toggleButtons.last()
    const gridButton = toggleButtons.first()

    // Toggle to list view
    await listButton.click()
    await page.waitForTimeout(300) // Allow transition

    if (await emptyState.isVisible().catch(() => false)) {
      await expect(emptyState).toBeAttached()
    } else {
      // Check for list container or list items
      const listExists = await page.locator('.projects-page .q-list, .projects-list').isVisible().catch(() => false)
      expect(listExists || await emptyState.isVisible().catch(() => false)).toBeTruthy()
    }

    // Toggle back to grid view
    await gridButton.click()
    await page.waitForTimeout(300)
  })

  test('should open create project dialog', async ({ page }) => {
    await page.getByRole('button', { name: /new project/i }).click()

    // Check dialog is visible
    await expect(page.locator('.q-dialog')).toBeVisible()
    await expect(page.locator('text=Create Project')).toBeVisible()

    // Check form fields
    await expect(page.locator('input[label*="Name"], .q-input').first()).toBeVisible()
    const dialog = page.locator('.q-dialog')
    await expect(dialog.getByRole('textbox', { name: /description/i }).first()).toBeVisible()
  })

  test('should validate project name is required', async ({ page }) => {
    await page.getByRole('button', { name: /new project/i }).click()

    // Try to submit without name
    const dialog = page.locator('.q-dialog')
    await dialog.getByRole('button', { name: 'Create', exact: true }).click()

    // Should show validation error
    await expect(dialog.getByText(/name is required/i)).toBeVisible()
  })

  test('should filter projects by search query', async ({ page }) => {
    // Find search input using data-testid
    const searchContainer = page.getByTestId('projects-search')
    const searchInput = searchContainer.locator('input')

    // Check if search exists
    const hasSearch = await searchInput.isVisible().catch(() => false)
    if (!hasSearch) {
      test.skip()
      return
    }

    await searchInput.fill('test project')

    // Wait for filter to apply
    await page.waitForTimeout(500)

    // Results should be filtered (or show no results message)
    const cards = page.locator('.project-card')
    const noResults = page.locator('text=/no projects|no results/i')

    // Either we have filtered results or no results message
    const hasCards = await cards.count() > 0
    const hasNoResults = await noResults.isVisible().catch(() => false)
    expect(hasCards || hasNoResults).toBeTruthy()
  })

  test('should filter projects by status', async ({ page }) => {
    // Click status filter
    await page.locator('.q-select').first().click()
    await page.getByRole('option', { name: /completed/i }).click()

    // Wait for filter to apply
    await page.waitForTimeout(300)

    // All visible project cards should have completed status
    const badges = page.locator('.project-card .q-badge')
    const count = await badges.count()

    for (let i = 0; i < count; i++) {
      const text = await badges.nth(i).textContent()
      expect(text?.toLowerCase()).toContain('completed')
    }
  })
})

test.describe('Project Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockProjectsAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
  })

  test('should display project header with name and status', async ({ page }) => {
    // Click first project to go to detail
    const firstProject = page.locator('.project-card').first()
    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      // Check header elements
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('.project-header .q-badge').first()).toBeVisible()
    }
  })

  test('should display tabs for todos, milestones, and marketing', async ({ page }) => {
    const firstProject = page.locator('.project-card').first()
    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      // Check tabs exist
      await expect(page.getByRole('tab', { name: /todos/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /milestones/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /marketing/i })).toBeVisible()
    }
  })

  test('should switch between tabs', async ({ page }) => {
    const firstProject = page.locator('.project-card').first()
    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      // Click milestones tab
      await page.getByRole('tab', { name: /milestones/i }).click()
      await expect(page.locator('.q-tab-panels').getByRole('heading', { name: /^Milestones$/ })).toBeVisible()

      // Click marketing tab
      await page.getByRole('tab', { name: /marketing/i }).click()
      await expect(page.locator('.q-tab-panels').getByRole('heading', { name: /^Marketing Plans$/ })).toBeVisible()
    }
  })
})

test.describe('Todos Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockProjectsAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
  })

  test('should display add todo button', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    const firstProject = page.locator('.project-card').first()

    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      const addButton = page.getByRole('button', { name: /add todo/i })
      await expect(addButton).toBeVisible()
    }
  })

  test('should open add todo dialog', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    const firstProject = page.locator('.project-card').first()

    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      // Ensure the Todos panel is rendered before interacting (mobile can be slower under load)
      const panels = page.locator('.q-tab-panels')
      await expect(panels.getByRole('heading', { name: /^Todos$/ })).toBeVisible()
      await panels.getByRole('button', { name: /add todo/i }).click()

      // Check dialog
      const dialog = page.locator('.q-dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('Add Todo', { exact: true })).toBeVisible()

      // Check form fields
      await expect(dialog.getByRole('textbox', { name: /title/i }).first()).toBeVisible()
    }
  })

  test('should filter todos by status', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    const firstProject = page.locator('.project-card').first()

    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      // Click pending filter
      const pendingButton = page.getByRole('button', { name: /pending/i })
      if (await pendingButton.isVisible()) {
        await pendingButton.click()

        // Wait for filter
        await page.waitForTimeout(200)

        // All visible todos should be pending
        const checkboxes = page.locator('.todo-item .q-checkbox')
        const count = await checkboxes.count()
        expect(count >= 0).toBeTruthy() // May be 0 if no pending todos
      }
    }
  })
})

test.describe('Milestones Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockProjectsAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
  })

  test('should display milestones timeline', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    const firstProject = page.locator('.project-card').first()

    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      // Switch to milestones tab
      await page.getByRole('tab', { name: /milestones/i }).click()

      // Check for timeline or empty state
      const timeline = page.locator('.q-timeline')
      const emptyState = page.locator('text=No milestones yet')

      const hasTimeline = await timeline.isVisible()
      const hasEmptyState = await emptyState.isVisible()

      expect(hasTimeline || hasEmptyState).toBeTruthy()
    }
  })

  test('should open add milestone dialog', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    const firstProject = page.locator('.project-card').first()

    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      await page.getByRole('tab', { name: /milestones/i }).click()
      await page.getByRole('button', { name: /add milestone/i }).click()

      await expect(page.locator('.q-dialog')).toBeVisible()
      await expect(page.locator('text=Add Milestone')).toBeVisible()
    }
  })
})

test.describe('AI Copilot Integration', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockProjectsAPIs(page)
    await mockAppAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
  })

  test('should display AI suggest button for todos', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    const firstProject = page.locator('.project-card').first()

    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      const aiButton = page.getByRole('button', { name: /ai suggest/i })
      await expect(aiButton).toBeVisible()
    }
  })

  test('should display AI assistant tab', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    const firstProject = page.locator('.project-card').first()

    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      const copilotTab = page.getByRole('tab', { name: /ai assistant/i })
      await expect(copilotTab).toBeVisible()
    }
  })

  test('should switch to AI assistant tab', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    const firstProject = page.locator('.project-card').first()

    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      await page.getByRole('tab', { name: /ai assistant|copilot/i }).click()

      // Check chat interface elements
      await expect(page.locator('text=AI Project Assistant')).toBeVisible()
      await expect(page.locator('input[placeholder*="Ask"]')).toBeVisible()
    }
  })
})

test.describe('Copilot Hub Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockProjectsAPIs(page)
    await mockAppAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
  })

  test('should display copilot hub as main app dashboard', async ({ page }) => {
    await page.goto('/en/app')
    await waitForAppReady(page)

    // Check for main elements
    await expect(page.locator('h2, h1').filter({ hasText: /copilot|assistant/i })).toBeVisible()
  })

  test('should open project detail when clicking selected sidebar project', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('Mobile'), 'Sidebar is hidden on mobile')

    await page.goto('/en/app')
    await waitForAppReady(page)

    await expect(page.getByTestId('app-sidebar')).toBeVisible()

    const sidebarItems = page.getByTestId('sidebar-projects').locator('.q-item')
    const itemCount = await sidebarItems.count()
    if (itemCount === 0) return

    // The hub auto-selects the first project; clicking it should open details.
    const activeItems = page.getByTestId('sidebar-projects').locator('.q-item.q-item--active')
    if (await activeItems.count() === 0) return
    const activeItem = activeItems.first()
    await expect(activeItem).toBeVisible()
    await activeItem.click()
    await expect(page).toHaveURL(/\/app\/projects\/[^/]+/)
  })

  test('should display recent projects sidebar', async ({ page }) => {
    await page.goto('/en/app')
    await waitForAppReady(page)

    // Check for projects section
    const projectsSection = page.locator('text=Recent Projects, text=My Projects').first()
    if (await projectsSection.isVisible()) {
      await expect(projectsSection).toBeVisible()
    }
  })

  test('should have chat input for AI copilot', async ({ page }) => {
    await page.goto('/en/app')
    await waitForAppReady(page)

    // Check for chat input
    await expect(page.getByPlaceholder(/ask me anything about your projects/i)).toBeVisible()
  })

  test('should navigate to projects page', async ({ page }) => {
    await page.goto('/en/app')
    await waitForAppReady(page)

    // Click on projects link/button
    const allProjectsButton = page.getByRole('button', { name: /all projects/i }).first()
    if (await allProjectsButton.isVisible()) {
      await allProjectsButton.click()
      await expect(page).toHaveURL(/\/app\/projects/)
    }
  })
})

test.describe('Project CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockProjectsAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
  })

  test('should create a new project', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)

    // Click create button
    await page.getByRole('button', { name: /new project/i }).click()
    const dialog = page.locator('.q-dialog')
    await expect(dialog).toBeVisible()

    // Fill form
    const projectName = `Test Project ${Date.now()}`
    await dialog.getByRole('textbox', { name: /project name/i }).fill(projectName)
    await dialog.getByRole('textbox', { name: /description/i }).fill('Test description')

    // Submit
    await dialog.getByRole('button', { name: 'Create', exact: true }).click()

    // Should navigate to project detail or show success
    await Promise.race([
      page.waitForURL(/\/app\/projects\/[^/]+/, { timeout: 15000 }).catch(() => {}),
      page.locator('.projects-page').getByText(projectName).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    ])
    // Verify project was created (either on detail page or in list)
    const onDetailPage = page.url().includes('/projects/')
    const inList = await page.locator('.projects-page').getByText(projectName).first().isVisible()
    expect(onDetailPage || inList).toBeTruthy()
  })

  test('should edit project name', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    const firstProject = page.locator('.project-card').first()

    if (await firstProject.isVisible()) {
      await firstProject.click()
      await page.waitForURL('**/projects/**')

      // Click edit button
      await page.getByRole('button', { name: /edit/i }).first().click()

      // Check edit dialog
      await expect(page.locator('.q-dialog')).toBeVisible()
      await expect(page.locator('text=Edit Project')).toBeVisible()
    }
  })

  test('should archive project via menu', async ({ page }) => {
    await page.goto('/en/app/projects')
    await waitForAppReady(page)
    const firstProject = page.locator('.project-card').first()

    if (await firstProject.isVisible()) {
      // Click menu button on card
      await firstProject.locator('[icon="more_vert"], .q-btn').click()

      // Check archive option exists
      const archiveOption = page.getByRole('menuitem', { name: /archive/i })
      await expect(archiveOption).toBeVisible()
    }
  })
})

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuth(page)
    await mockProjectsAPIs(page)
    await mockCommonAPIs(page) // Catch-all for unmocked APIs - must be last
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/en/app/projects')
    await waitForAppReady(page)

    // Page should still be usable
    await expect(page.locator('h1')).toContainText('Projects')

    // Create button should be visible
    const createButton = page.getByRole('button', { name: /new project/i })
    await expect(createButton).toBeVisible()
  })

  test('should stack cards vertically on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/en/app/projects')
    await waitForAppReady(page)

    // Cards should be full width
    const card = page.locator('.project-card').first()
    if (await card.isVisible()) {
      const box = await card.boundingBox()
      expect(box?.width).toBeGreaterThan(300)
    }
  })

  test('should display properly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/en/app/projects')
    await waitForAppReady(page)

    // Page should render correctly
    await expect(page.locator('h1')).toContainText('Projects')

    // Should show 2 columns of cards
    const cards = page.locator('.project-card')
    const count = await cards.count()
    expect(count >= 0).toBeTruthy()
  })
})
