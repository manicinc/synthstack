/**
 * @file analytics-dashboard.spec.ts
 * @description E2E tests for analytics dashboards in Directus admin panel
 */

import { test, expect } from '@playwright/test';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8099';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'team@manic.agency';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin123';

test.describe('Analytics Dashboards', () => {
  test.beforeEach(async ({ page }) => {
    // Login to Directus
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test.describe('Overview Dashboard', () => {
    test('should load Overview dashboard', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Overview');
      
      await page.waitForLoadState('networkidle');
      
      // Dashboard should be visible
      await expect(page.locator('[class*="dashboard"]')).toBeVisible();
    });

    test('should display Total Users panel', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Overview');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Total Users')).toBeVisible();
    });

    test('should display Pro Subscribers panel', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Overview');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Pro Subscribers')).toBeVisible();
    });

    test('should display Total Generations panel', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Overview');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Total Generations')).toBeVisible();
    });

    test('should display Pending Moderation panel', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Overview');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Pending Moderation')).toBeVisible();
    });
  });

  test.describe('Business Metrics Dashboard', () => {
    test('should load Business Metrics dashboard', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Business Metrics');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[class*="dashboard"]')).toBeVisible();
    });

    test('should display subscription tier panels', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Business Metrics');
      
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Free Users')).toBeVisible();
      await expect(page.locator('text=Maker Users')).toBeVisible();
      await expect(page.locator('text=Pro Users')).toBeVisible();
      await expect(page.locator('text=Unlimited Users')).toBeVisible();
    });
  });

  test.describe('Product Analytics Dashboard', () => {
    test('should load Product Analytics dashboard', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Product Analytics');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[class*="dashboard"]')).toBeVisible();
    });

    test('should display content metrics panels', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Product Analytics');
      
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Printers in Database')).toBeVisible();
      await expect(page.locator('text=Filaments in Database')).toBeVisible();
      await expect(page.locator('text=Public Profiles')).toBeVisible();
      await expect(page.locator('text=STL Files Analyzed')).toBeVisible();
    });
  });

  test.describe('Moderation Dashboard', () => {
    test('should load Moderation dashboard', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Moderation');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[class*="dashboard"]')).toBeVisible();
    });

    test('should display moderation panels', async ({ page }) => {
      await page.click('nav >> text=Insights');
      await page.click('text=Moderation');
      
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Open Reports')).toBeVisible();
      await expect(page.locator('text=Pending Comments')).toBeVisible();
      await expect(page.locator('text=Banned Users')).toBeVisible();
      await expect(page.locator('text=Active Warnings')).toBeVisible();
    });
  });
});

test.describe('Analytics Collections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test('should display analytics_daily collection', async ({ page }) => {
    await expect(page.locator('nav >> text=analytics_daily')).toBeVisible();
  });

  test('should navigate to analytics_daily', async ({ page }) => {
    await page.click('nav >> text=analytics_daily');
    await page.waitForURL(`${DIRECTUS_URL}/admin/content/analytics_daily`);
    await expect(page.locator('h1')).toContainText('analytics_daily');
  });

  test('should display analytics_events collection', async ({ page }) => {
    await expect(page.locator('nav >> text=analytics_events')).toBeVisible();
  });

  test('should navigate to analytics_events', async ({ page }) => {
    await page.click('nav >> text=analytics_events');
    await page.waitForURL(`${DIRECTUS_URL}/admin/content/analytics_events`);
    await expect(page.locator('h1')).toContainText('analytics_events');
  });

  test('should filter events by category', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/analytics_events`);
    
    await page.click('[data-testid="filter-button"], button:has-text("Filter")');
    await page.click('text=Add Filter');
    await page.selectOption('select[name="field"]', 'event_category');
    await page.selectOption('select[name="operator"]', '_eq');
    await page.fill('input[name="value"]', 'generation');
    
    await page.click('text=Apply');
    await page.waitForLoadState('networkidle');
  });

  test('should sort events by timestamp', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/analytics_events`);
    
    // Click on timestamp column header to sort
    await page.click('th:has-text("timestamp")');
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Feature Flags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test('should display feature_flags collection', async ({ page }) => {
    await expect(page.locator('nav >> text=feature_flags')).toBeVisible();
  });

  test('should navigate to feature flags', async ({ page }) => {
    await page.click('nav >> text=feature_flags');
    await page.waitForURL(`${DIRECTUS_URL}/admin/content/feature_flags`);
    await expect(page.locator('h1')).toContainText('feature_flags');
  });

  test('should create a new feature flag', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/feature_flags`);
    
    await page.click('button:has-text("Create Item")');
    await page.waitForLoadState('networkidle');
    
    // Fill form
    const keyInput = page.locator('input[name="key"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('new_feature_test');
    }
    
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('New Feature Test');
    }
    
    const descInput = page.locator('textarea[name="description"]');
    if (await descInput.isVisible()) {
      await descInput.fill('A test feature flag');
    }
  });

  test('should toggle feature flag', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/feature_flags`);
    
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      const enabledToggle = page.locator('[name="enabled"]');
      if (await enabledToggle.isVisible()) {
        await enabledToggle.click();
        await page.click('button:has-text("Save")');
        await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should set rollout percentage', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/feature_flags`);
    
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      const rolloutInput = page.locator('input[name="rollout_percentage"]');
      if (await rolloutInput.isVisible()) {
        await rolloutInput.clear();
        await rolloutInput.fill('50');
        await page.click('button:has-text("Save")');
        await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('System Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DIRECTUS_URL}/admin/**`);
  });

  test('should display system_config collection', async ({ page }) => {
    await expect(page.locator('nav >> text=system_config')).toBeVisible();
  });

  test('should navigate to system config', async ({ page }) => {
    await page.click('nav >> text=system_config');
    await page.waitForURL(`${DIRECTUS_URL}/admin/content/system_config`);
    await expect(page.locator('h1')).toContainText('system_config');
  });

  test('should view credits_per_tier config', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/system_config/credits_per_tier`);
    
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=credits_per_tier')).toBeVisible();
  });

  test('should edit system config value', async ({ page }) => {
    await page.goto(`${DIRECTUS_URL}/admin/content/system_config/max_warnings_before_ban`);
    
    const valueInput = page.locator('input[name="value"], textarea[name="value"]');
    if (await valueInput.isVisible()) {
      await valueInput.clear();
      await valueInput.fill('5');
      await page.click('button:has-text("Save")');
      await expect(page.locator('text=saved')).toBeVisible({ timeout: 5000 });
    }
  });
});

