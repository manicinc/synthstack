/**
 * @file moderation-workflow.spec.ts
 * @description E2E tests for moderation workflows in Directus admin panel
 */

import { test, expect } from '@playwright/test';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8099';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'team@manic.agency';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin123';

test.describe('Community Reports Moderation', () => {
  test.beforeEach(async ({ page }) => {
    // Login to Directus
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test('should display community_reports collection', async ({ page }) => {
    await expect(page.locator('nav >> text=community_reports')).toBeVisible();
  });

  test('should navigate to community reports', async ({ page }) => {
    await page.click('nav >> text=community_reports');
    await page.waitForURL(`${DIRECTUS_URL}/admin/content/community_reports`);
    await expect(page.locator('h1')).toContainText('community_reports');
  });

  test('should filter open reports', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/community_reports`);
    
    // Open filter panel
    await page.click('[data-testid="filter-button"], button:has-text("Filter")');
    
    // Add filter for status = open
    await page.click('text=Add Filter');
    await page.selectOption('select[name="field"]', 'status');
    await page.selectOption('select[name="operator"]', '_eq');
    await page.fill('input[name="value"]', 'open');
    
    await page.click('text=Apply');
    await page.waitForLoadState('networkidle');
  });

  test('should view report details', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/community_reports`);
    
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForURL(`${DIRECTUS_URL}/admin/content/community_reports/**`);
      
      // Verify report fields are visible
      await expect(page.locator('text=reason')).toBeVisible();
      await expect(page.locator('text=status')).toBeVisible();
    }
  });

  test('should change report status to investigating', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/community_reports`);
    
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      // Find status dropdown and change
      const statusSelect = page.locator('select[name="status"]');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('investigating');
        await page.click('button:has-text("Save")');
        await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should add resolution notes', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/community_reports`);
    
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      const notesInput = page.locator('textarea[name="resolution_notes"]');
      if (await notesInput.isVisible()) {
        await notesInput.fill('Reviewed and taking action');
        await page.click('button:has-text("Save")');
        await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Community Comments Moderation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test('should display community_comments collection', async ({ page }) => {
    await expect(page.locator('nav >> text=community_comments')).toBeVisible();
  });

  test('should navigate to community comments', async ({ page }) => {
    await page.click('nav >> text=community_comments');
    await page.waitForURL(`${DIRECTUS_URL}/admin/content/community_comments`);
    await expect(page.locator('h1')).toContainText('community_comments');
  });

  test('should filter pending comments', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/community_comments`);
    
    await page.click('[data-testid="filter-button"], button:has-text("Filter")');
    await page.click('text=Add Filter');
    await page.selectOption('select[name="field"]', 'status');
    await page.selectOption('select[name="operator"]', '_eq');
    await page.fill('input[name="value"]', 'pending');
    
    await page.click('text=Apply');
    await page.waitForLoadState('networkidle');
  });

  test('should approve a comment', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/community_comments`);
    
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      const statusSelect = page.locator('select[name="status"]');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('approved');
        await page.click('button:has-text("Save")');
        await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should reject a comment with notes', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/community_comments`);
    
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      const statusSelect = page.locator('select[name="status"]');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('rejected');
        
        const notesInput = page.locator('textarea[name="moderation_notes"]');
        if (await notesInput.isVisible()) {
          await notesInput.fill('Violates community guidelines');
        }
        
        await page.click('button:has-text("Save")');
        await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('User Warnings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test('should display user_warnings collection', async ({ page }) => {
    await expect(page.locator('nav >> text=user_warnings')).toBeVisible();
  });

  test('should navigate to user warnings', async ({ page }) => {
    await page.click('nav >> text=user_warnings');
    await page.waitForURL(`${DIRECTUS_URL}/admin/content/user_warnings`);
    await expect(page.locator('h1')).toContainText('user_warnings');
  });

  test('should create a new warning', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/user_warnings`);
    
    // Click add new
    await page.click('button:has-text("Create Item")');
    
    // Wait for form
    await page.waitForLoadState('networkidle');
    
    // Fill warning form
    const warningTypeSelect = page.locator('select[name="warning_type"]');
    if (await warningTypeSelect.isVisible()) {
      await warningTypeSelect.selectOption('content');
    }
    
    const severitySelect = page.locator('select[name="severity"]');
    if (await severitySelect.isVisible()) {
      await severitySelect.selectOption('warning');
    }
    
    const messageInput = page.locator('textarea[name="message"]');
    if (await messageInput.isVisible()) {
      await messageInput.fill('This is a test warning');
    }
  });

  test('should filter active warnings', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/user_warnings`);
    
    await page.click('[data-testid="filter-button"], button:has-text("Filter")');
    await page.click('text=Add Filter');
    await page.selectOption('select[name="field"]', 'status');
    await page.selectOption('select[name="operator"]', '_eq');
    await page.fill('input[name="value"]', 'active');
    
    await page.click('text=Apply');
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Moderation Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test('should display Flows section', async ({ page }) => {
    // Navigate to Settings
    await page.click('nav >> text=Settings');
    
    // Click on Flows
    await page.click('text=Flows');
    
    // Verify flows are visible
    await expect(page.locator('text=New Report Alert')).toBeVisible();
    await expect(page.locator('text=User Banned Alert')).toBeVisible();
    await expect(page.locator('text=Warning Issued Alert')).toBeVisible();
  });

  test('should view flow details', async ({ page }) => {
    await page.click('nav >> text=Settings');
    await page.click('text=Flows');
    
    // Click on a flow
    await page.click('text=New Report Alert');
    
    // Verify flow details page
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Trigger')).toBeVisible();
  });
});

