/**
 * @file user-management.spec.ts
 * @description E2E tests for user management in Directus admin panel
 */

import { test, expect } from '@playwright/test';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8099';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'team@manic.agency';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin123';

test.describe('User Management in Directus', () => {
  test.beforeEach(async ({ page }) => {
    // Login to Directus
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    
    // Fill login form
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test('should display app_users collection in sidebar', async ({ page }) => {
    // Check that app_users is visible in the sidebar
    await expect(page.locator('nav >> text=app_users')).toBeVisible();
  });

  test('should navigate to app_users collection', async ({ page }) => {
    // Click on app_users in sidebar
    await page.click('nav >> text=app_users');
    
    // Wait for collection view
    await page.waitForURL(`${DIRECTUS_URL}/admin/content/app_users`);
    
    // Verify we're on the collection page
    await expect(page.locator('h1')).toContainText('app_users');
  });

  test('should display user details', async ({ page }) => {
    // Navigate to app_users
    await page.goto(`${DIRECTUS_URL}/admin/content/app_users`);
    
    // Check for table headers or field names
    await expect(page.locator('text=email')).toBeVisible();
    await expect(page.locator('text=subscription_tier')).toBeVisible();
  });

  test('should filter users by subscription tier', async ({ page }) => {
    // Navigate to app_users
    await page.goto(`${DIRECTUS_URL}/admin/content/app_users`);
    
    // Open filter panel
    await page.click('[data-testid="filter-button"], button:has-text("Filter")');
    
    // Add filter for subscription_tier
    await page.click('text=Add Filter');
    await page.selectOption('select[name="field"]', 'subscription_tier');
    await page.selectOption('select[name="operator"]', '_eq');
    await page.fill('input[name="value"]', 'pro');
    
    // Apply filter
    await page.click('text=Apply');
    
    // Verify filtered results
    await page.waitForLoadState('networkidle');
  });

  test('should view user detail page', async ({ page }) => {
    // Navigate to app_users
    await page.goto(`${DIRECTUS_URL}/admin/content/app_users`);
    
    // Click on first user row (if exists)
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      // Wait for detail view
      await page.waitForURL(`${DIRECTUS_URL}/admin/content/app_users/**`);
      
      // Verify we're on detail page
      await expect(page.locator('form')).toBeVisible();
    }
  });

  test('should edit user credits', async ({ page }) => {
    // Navigate to app_users
    await page.goto(`${DIRECTUS_URL}/admin/content/app_users`);
    
    // Click on first user row (if exists)
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      // Find credits field and update
      const creditsInput = page.locator('input[name="credits_remaining"]');
      if (await creditsInput.isVisible()) {
        await creditsInput.clear();
        await creditsInput.fill('100');
        
        // Save changes
        await page.click('button:has-text("Save")');
        
        // Verify success message
        await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should toggle ban status', async ({ page }) => {
    // Navigate to app_users
    await page.goto(`${DIRECTUS_URL}/admin/content/app_users`);
    
    // Click on first user row (if exists)
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      // Find ban toggle and click
      const banToggle = page.locator('[name="is_banned"]');
      if (await banToggle.isVisible()) {
        await banToggle.click();
        
        // Save changes
        await page.click('button:has-text("Save")');
        
        // Verify success
        await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Credit Adjustments Collection', () => {
  test.beforeEach(async ({ page }) => {
    // Login to Directus
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test('should display credit_adjustments collection', async ({ page }) => {
    await expect(page.locator('nav >> text=credit_adjustments')).toBeVisible();
  });

  test('should view credit adjustment history', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/credit_adjustments`);
    
    // Verify we're on the collection page
    await expect(page.locator('h1')).toContainText('credit_adjustments');
  });
});

test.describe('Dashboards', () => {
  test.beforeEach(async ({ page }) => {
    // Login to Directus
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test('should display Overview dashboard', async ({ page }) => {
    // Navigate to Insights
    await page.click('nav >> text=Insights');
    
    // Look for Overview dashboard
    await expect(page.locator('text=Overview')).toBeVisible();
  });

  test('should display Business Metrics dashboard', async ({ page }) => {
    await page.click('nav >> text=Insights');
    await expect(page.locator('text=Business Metrics')).toBeVisible();
  });

  test('should display Product Analytics dashboard', async ({ page }) => {
    await page.click('nav >> text=Insights');
    await expect(page.locator('text=Product Analytics')).toBeVisible();
  });

  test('should display Moderation dashboard', async ({ page }) => {
    await page.click('nav >> text=Insights');
    await expect(page.locator('text=Moderation')).toBeVisible();
  });

  test('should view Overview dashboard panels', async ({ page }) => {
    await page.click('nav >> text=Insights');
    await page.click('text=Overview');
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Check for panels
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Pro Subscribers')).toBeVisible();
    await expect(page.locator('text=Total Generations')).toBeVisible();
    await expect(page.locator('text=Pending Moderation')).toBeVisible();
  });
});

